"""
Core utility endpoints.

GET  /api/v1/health/       — Health check (public, for Railway/uptime monitoring)
GET  /api/v1/stats/        — Platform statistics (public, great for demo day)
POST /api/v1/demo-scan/    — Demo scan with preset Lagos coordinates (no auth needed)
"""
import logging
from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    GET /api/v1/health/
    Public health check endpoint.
    Returns 200 when the app and database are reachable.
    Used by Railway and uptime monitors.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        # Quick DB connectivity check
        db_ok = True
        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False

        payload = {
            'status': 'ok' if db_ok else 'degraded',
            'service': 'landrify-api',
            'version': '1.0.0',
            'database': 'connected' if db_ok else 'unavailable',
            'built_for': 'Enyata Buildathon × Interswitch Developer Community',
        }
        http_status = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(payload, status=http_status)


class PlatformStatsView(APIView):
    """
    GET /api/v1/stats/
    Public endpoint showing platform statistics.
    Great for the demo — shows real numbers to judges.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from apps.scans.models import LandScan, FloodRiskZone, AcquisitionArea, Dam
        from apps.users.models import User

        try:
            stats = {
                'platform': 'Landrify',
                'tagline': 'Land verification for Nigeria — know before you buy.',
                'data_coverage': {
                    'flood_risk_zones': FloodRiskZone.objects.count(),
                    'government_acquisition_areas': AcquisitionArea.objects.count(),
                    'dams_tracked': Dam.objects.count(),
                    'states_covered': list(
                        FloodRiskZone.objects.values_list('state', flat=True).distinct()
                    ),
                },
                'platform_activity': {
                    'registered_users': User.objects.count(),
                    'total_scans': LandScan.objects.count(),
                    'completed_scans': LandScan.objects.filter(status='completed').count(),
                    'premium_scans': LandScan.objects.filter(scan_type='premium').count(),
                },
                'risk_engine': {
                    'factors': ['legal_status', 'flood_risk', 'erosion_risk', 'dam_proximity'],
                    'score_range': '0 – 100',
                    'levels': ['low (0-24)', 'medium (25-49)', 'high (50-74)', 'critical (75-100)'],
                    'score_weights': {
                        'legal_acquisition': '40%',
                        'flood_risk': '30%',
                        'erosion_risk': '15%',
                        'dam_proximity': '15%',
                    },
                },
                'payment_provider': 'Interswitch Webpay',
                'built_with': ['Django 5', 'PostgreSQL', 'Interswitch API', 'Google Maps API'],
            }
        except Exception as e:
            logger.error(f"Stats error: {e}")
            return Response({'error': 'Stats unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(stats)


# ── Pre-set demo locations for judge testing ──────────────────────────────────
DEMO_LOCATIONS = {
    'lekki_high_flood': {
        'label': 'Lekki Phase 1 (High flood risk area)',
        'latitude': 6.4698,
        'longitude': 3.5852,
        'description': 'Demonstrates high flood risk detection in the Lekki Peninsula flood zone.',
    },
    'ibeju_acquisition': {
        'label': 'Ibeju-Lekki (Government acquisition zone)',
        'latitude': 6.4100,
        'longitude': 3.9100,
        'description': 'Demonstrates government acquisition area detection near Lekki Free Trade Zone.',
    },
    'abuja_safe': {
        'label': 'Maitama, Abuja (Low risk area)',
        'latitude': 9.0820,
        'longitude': 7.4920,
        'description': 'Demonstrates a low-risk result in an established Abuja district.',
    },
    'onitsha_critical': {
        'label': 'Onitsha Waterfront (Critical flood + erosion)',
        'latitude': 6.1422,
        'longitude': 6.7864,
        'description': 'Demonstrates critical risk — River Niger floodplain + high erosion belt.',
    },
    'port_harcourt': {
        'label': 'Port Harcourt (High flood, Niger Delta)',
        'latitude': 4.8156,
        'longitude': 7.0498,
        'description': 'Niger Delta terrain — tidal influence and high flood frequency.',
    },
}


class DemoScanView(APIView):
    """
    POST /api/v1/demo-scan/
    Run a full land scan on a preset demo location. No authentication required.
    Purpose: allow hackathon judges to test the risk engine instantly without
    needing a real device, GPS, or a registered account.

    Request body:
        { "location": "lekki_high_flood" }   — pick from available demo locations
        OR
        { "latitude": 6.5244, "longitude": 3.3792 }  — custom coordinates (Nigeria only)

    Available locations:
        lekki_high_flood, ibeju_acquisition, abuja_safe, onitsha_critical, port_harcourt
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        """List available demo locations."""
        return Response({
            'message': 'POST to this endpoint with a location key to run a demo scan.',
            'available_locations': DEMO_LOCATIONS,
            'example_request': {'location': 'lekki_high_flood'},
            'custom_example': {
                'latitude': 6.5244,
                'longitude': 3.3792,
                'note': 'Custom coordinates must be within Nigeria.'
            }
        })

    def post(self, request):
        from apps.scans.models import LandScan
        from apps.scans.services import run_land_scan
        from apps.scans.serializers import LandScanDetailSerializer

        location_key = request.data.get('location')
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')

        # Resolve coordinates
        if location_key:
            demo = DEMO_LOCATIONS.get(location_key)
            if not demo:
                return Response({
                    'error': f'Unknown location key: "{location_key}".',
                    'available': list(DEMO_LOCATIONS.keys()),
                }, status=status.HTTP_400_BAD_REQUEST)
            lat = demo['latitude']
            lng = demo['longitude']
            location_label = demo['label']
            location_desc  = demo['description']
        elif lat and lng:
            try:
                lat = float(lat)
                lng = float(lng)
            except (TypeError, ValueError):
                return Response({'error': 'latitude and longitude must be numbers.'}, status=status.HTTP_400_BAD_REQUEST)

            # Validate Nigeria bounding box
            if not (4.0 <= lat <= 14.0 and 2.5 <= lng <= 15.0):
                return Response({
                    'error': 'Coordinates must be within Nigeria (lat: 4–14, lng: 2.5–15).',
                }, status=status.HTTP_400_BAD_REQUEST)
            location_label = f"Custom ({lat}, {lng})"
            location_desc  = "Custom coordinates provided by user."
        else:
            return Response({
                'error': 'Provide either "location" (demo key) or "latitude" + "longitude".',
                'available_locations': list(DEMO_LOCATIONS.keys()),
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create and run scan (no user attached — demo mode)
        scan = LandScan.objects.create(
            user=None,
            latitude=lat,
            longitude=lng,
            radius_km=request.data.get('radius_km', 1.0),
            scan_type='basic',
            payment_status='not_required',
            status='processing',
        )

        try:
            run_land_scan(scan)
        except Exception as e:
            logger.error(f"Demo scan error: {e}")
            scan.status = 'failed'
            scan.save(update_fields=['status'])
            return Response({'error': 'Scan processing failed.', 'detail': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response_data = LandScanDetailSerializer(scan).data
        response_data['_demo'] = {
            'note': 'This is a demo scan. No authentication required. Data is real.',
            'location_label': location_label,
            'location_description': location_desc,
            'available_demo_locations': list(DEMO_LOCATIONS.keys()),
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class PublicConfigView(APIView):
    """
    GET /api/v1/config/

    Returns the small set of public, client-safe configuration values the
    Landrify frontend needs (Mapbox public token, whether Google sign-in is
    available, etc). Public — no auth required. Never returns secrets.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({
            'mapbox_token': getattr(settings, 'MAPBOX_TOKEN', '') or '',
            'google_client_id': getattr(settings, 'GOOGLE_CLIENT_ID', '') or '',
            'test_mode': bool(getattr(settings, 'TEST_MODE', False)),
        })
