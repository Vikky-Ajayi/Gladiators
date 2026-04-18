import logging
import datetime
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import LandScan, SavedLand
from .serializers import (
    LandScanCreateSerializer, LandScanDetailSerializer,
    LandScanListSerializer,
)
from .services import run_land_scan

logger = logging.getLogger(__name__)


class LandScanCreateView(APIView):
    """
    POST /api/v1/scans/
    Create a new land scan.

    BASIC users:
      - 1 scan ever, free
      - Returns basic risk data (score, legal status, environmental risks)
      - ai_report is a short summary only

    PRO users:
      - Unlimited scans
      - Returns everything + full Groq AI time-projection report (5–50 years)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # ── Gate: can this user scan? ────────────────────────────────
        from django.conf import settings as django_settings
        test_mode = getattr(django_settings, 'TEST_MODE', False)

        if not user.can_scan and not test_mode:
            return Response({
                "error":   "Scan limit reached.",
                "detail":  "Basic accounts get 1 free scan. Upgrade to Pro for unlimited scans and full AI reports.",
                "plan":    "basic",
                "upgrade": "/api/v1/payments/initialize/",
            }, status=status.HTTP_402_PAYMENT_REQUIRED)

        serializer = LandScanCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # ── Create scan record ────────────────────────────────────────
        scan = LandScan.objects.create(
            user=user,
            latitude=data["latitude"],
            longitude=data["longitude"],
            radius_km=data.get("radius_km", 0.5),
            accuracy_meters=data.get("accuracy"),
            address=data.get("address_hint", ""),
            scan_type="pro" if user.is_pro else "basic",
            payment_status="not_required",
            status="processing",
        )

        # ── Run the scan (synchronous) ────────────────────────────────
        # AI report (Groq) is generated for EVERY scan — it's the core product.
        # The Pro/Basic distinction is enforced elsewhere (scan quota,
        # premium PDF features) but the on-screen AI report is always shown.
        try:
            run_land_scan(scan, full_report=True)
        except Exception as e:
            logger.error(f"Scan failed for {scan.scan_reference}: {e}")
            scan.status = "failed"
            scan.save(update_fields=["status"])
            return Response(
                {"error": "Scan processing failed.", "scan_reference": scan.scan_reference},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ── Mark basic scan used ──────────────────────────────────────
        from django.conf import settings as django_settings
        test_mode = getattr(django_settings, 'TEST_MODE', False)
        if not user.is_pro and not test_mode:
            user.basic_scan_used = True
            user.save(update_fields=["basic_scan_used"])

        response_data = LandScanDetailSerializer(scan).data
        return Response(response_data, status=status.HTTP_201_CREATED)


class LandScanDetailView(APIView):
    """GET /api/v1/scans/:id/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, scan_id):
        try:
            scan = LandScan.objects.get(id=scan_id, user=request.user)
        except LandScan.DoesNotExist:
            return Response({"error": "Scan not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(LandScanDetailSerializer(scan).data)


class LandScanReportView(APIView):
    """
    GET /api/v1/scans/:id/report/
    Returns the full structured report for a scan.
    Pro users get the full AI time-projection report.
    Basic users get the basic report only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, scan_id):
        try:
            scan = LandScan.objects.get(id=scan_id, user=request.user)
        except LandScan.DoesNotExist:
            return Response({"error": "Scan not found."}, status=status.HTTP_404_NOT_FOUND)

        user        = request.user
        report_data = _build_report(scan)

        if not user.is_pro:
            # Strip AI projection — basic users get current state only
            report_data.pop("ai_time_projection", None)
            report_data["upgrade_prompt"] = {
                "message": "The full AI 5–50 year time-projection report is available for Pro users.",
                "price":   "₦5,000/month",
                "upgrade": "/api/v1/payments/initialize/",
            }

        return Response(report_data)


def _build_report(scan: LandScan) -> dict:
    recommendations = []
    if scan.is_government_land:
        recommendations.append("⚠️ CRITICAL: This land is in a government acquisition area. Do NOT purchase without legal clearance.")
    else:
        recommendations.append("Conduct title verification with a licensed Nigerian lawyer.")
        recommendations.append("Request a current survey plan and confirm beacons are in place.")
    if scan.flood_risk_level in ("high", "very_high"):
        recommendations.append("Consider flood insurance. Elevate foundation by at least 1 metre.")
    if scan.erosion_risk_level == "high":
        recommendations.append("Commission a soil survey. Implement erosion-resistant foundation design.")
    if scan.dam_risk_level in ("high", "critical"):
        recommendations.append(f"Land is within {scan.nearest_dam_distance_km}km of {scan.nearest_dam_name}. Consult NIHSA on dam release risk.")
    recommendations.append("This report is advisory only. Always verify independently.")

    report = {
        "scan_reference":  scan.scan_reference,
        "generated_at":    timezone.now().isoformat(),
        "location": {
            "address":     scan.address,
            "coordinates": {"latitude": str(scan.latitude), "longitude": str(scan.longitude)},
            "state":       scan.state, "lga": scan.lga,
            "radius_km":   str(scan.radius_km),
        },
        "risk_assessment": {
            "overall_score": scan.risk_score,
            "risk_level":    scan.risk_level,
            "interpretation": _interpret(scan.risk_score),
        },
        "legal_status": {
            "is_government_land":   scan.is_government_land,
            "is_under_acquisition": scan.is_under_acquisition,
            "authority":            scan.acquisition_authority,
            "gazette_reference":    scan.gazette_reference,
            "notes":                scan.legal_notes,
        },
        "environmental_risks": {
            "flood":   {
                "risk_level": scan.flood_risk_level,
                "zone": scan.flood_zone_name,
                "flood_type": scan.flood_type,
                "peak_months": scan.flood_peak_months,
                "last_major_flood_year": scan.flood_last_major_year,
                "notes": scan.flood_notes,
            },
            "erosion": {"risk_level": scan.erosion_risk_level},
            "dam_proximity": {
                "nearest_dam": scan.nearest_dam_name,
                "distance_km": str(scan.nearest_dam_distance_km) if scan.nearest_dam_distance_km else None,
                "risk_level":  scan.dam_risk_level,
                "river_basin": scan.dam_river_basin,
                "capacity_mcm": str(scan.dam_capacity_mcm) if scan.dam_capacity_mcm else None,
                "height_m": str(scan.dam_height_m) if scan.dam_height_m else None,
                "year_completed": scan.dam_year_completed,
                "purpose": scan.dam_purpose,
                "downstream_states": scan.dam_downstream_states,
                "notes": scan.dam_notes,
            },
        },
        "elevation_meters":   str(scan.elevation_meters) if scan.elevation_meters else None,
        "recommendations":    recommendations,
        "disclaimer": "This report is generated from available data and should not replace professional legal, survey, and engineering advice.",
    }

    # Attach AI projection only if it was generated (Pro scans)
    if scan.ai_report:
        report["ai_time_projection"] = {
            "report":       scan.ai_report,
            "model":        scan.ai_report_model,
            "tokens_used":  scan.ai_report_tokens,
            "generated_at": scan.report_generated_at.isoformat() if scan.report_generated_at else None,
        }

    return report


def _interpret(score):
    if score is None: return "Insufficient data."
    if score < 25:    return "Land appears low risk. Standard due diligence applies."
    if score < 50:    return "Moderate risk. Proceed with thorough verification."
    if score < 75:    return "High risk. Seek professional advice before proceeding."
    return "Critical risk. Do not purchase without expert legal review."
