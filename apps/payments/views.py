import logging
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Payment
from .interswitch import (
    InterswitchPaymentClient,
    InterswitchIdentityClient,
    generate_transaction_reference,
)

logger = logging.getLogger(__name__)

PRO_PRICE_NAIRA = 5000  # ₦5,000/month for Pro


def _resolve_frontend_origin(request) -> str:
    """
    Return the scheme://host that the frontend is running on, derived from the
    actual incoming request — so the URLs we hand back are always reachable by
    the caller. Falls back to FRONTEND_URL setting only when no headers help.

    Order of preference:
      1. Origin header                (set by browsers on CORS requests)
      2. Referer header               (set on top-level navigations)
      3. settings.FRONTEND_URL        (last-resort default)
    """
    from urllib.parse import urlparse

    origin = (request.META.get("HTTP_ORIGIN") or "").strip()
    if origin and origin.lower() not in ("null",):
        return origin.rstrip("/")

    referer = (request.META.get("HTTP_REFERER") or "").strip()
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"

    return (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")


# ─── Payment: Initialize ─────────────────────────────────────────────────────

class PaymentConfigView(APIView):
    """GET /api/v1/payments/config/ — let the frontend know if we're in mock mode."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "mock_mode":    bool(getattr(settings, "INTERSWITCH_PAYMENTS_MOCK_ACTIVE", True)),
            "environment":  getattr(settings, "INTERSWITCH_ENV", "sandbox"),
            "currency":     "NGN",
            "pro_price":    settings.PRO_PRICE_NAIRA,
        })


class InitializePaymentView(APIView):
    """
    POST /api/v1/payments/initialize/
    Start a Pro subscription payment via Interswitch Webpay.
    Returns authorization_url — frontend redirects user there.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.is_pro:
            return Response(
                {"error": "You already have an active Pro subscription."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount    = float(settings.PRO_PRICE_NAIRA)
        reference = generate_transaction_reference("PRO")

        payment = Payment.objects.create(
            user=user,
            amount=amount,
            payment_type="pro_subscription",
            payment_reference=reference,
            status="pending",
            metadata={"description": "Landrify Pro — unlimited scans + AI time-projection reports"},
        )

        # Auto-detect the actual frontend origin from this request so the
        # checkout URL we build is always reachable by the caller, regardless
        # of where the frontend is deployed (localhost, Vercel, custom domain).
        frontend_origin = _resolve_frontend_origin(request)

        isw    = InterswitchPaymentClient()
        result = isw.initialize_payment(
            amount_naira=amount,
            transaction_ref=reference,
            customer_email=user.email,
            customer_name=user.full_name or user.email,
            frontend_origin=frontend_origin,
        )

        if not result.get("status"):
            payment.status = "failed"
            payment.save(update_fields=["status"])
            return Response(
                {"error": "Could not initialise payment.", "detail": result.get("message")},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.authorization_url = result["authorization_url"]
        payment.save(update_fields=["authorization_url"])

        return Response({
            "transaction_reference": reference,
            "authorization_url":     result["authorization_url"],
            "amount":                amount,
            "currency":              "NGN",
            "plan":                  "pro",
            "description":           "Landrify Pro — unlimited scans + AI 50-year projections",
            "provider":              "interswitch",
        })


# ─── Payment: Verify ─────────────────────────────────────────────────────────

class VerifyPaymentView(APIView):
    """
    GET /api/v1/payments/verify/?reference=PRO-XXXX
    Called by frontend after Interswitch redirect to confirm payment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reference = request.query_params.get("reference")
        if not reference:
            return Response({"error": "reference is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(payment_reference=reference, user=request.user)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == "success":
            return Response({"status": "success", "plan": request.user.plan, "message": "Pro is active."})

        isw    = InterswitchPaymentClient()
        result = isw.verify_transaction(reference, float(payment.amount))

        if result.get("status"):
            _activate_pro(payment, result)
            return Response({
                "status":    "success",
                "plan":      "pro",
                "message":   "Payment confirmed. Pro subscription is now active.",
                "expires_at": request.user.pro_expires_at,
            })

        return Response({"status": "pending", "response_code": result.get("response_code")})


# ─── Payment: Mock Confirm (simulated checkout submission) ────────────────────

class MockConfirmPaymentView(APIView):
    """
    POST /api/v1/payments/mock-confirm/

    Called by the simulated Interswitch checkout page (frontend) when the user
    submits the demo card form. This endpoint is ONLY available when the app
    is running in mock mode — when real Interswitch credentials are provided
    the live gateway calls VerifyPaymentView/InterswitchRedirectView instead.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not getattr(settings, "INTERSWITCH_PAYMENTS_MOCK_ACTIVE", False):
            return Response({"error": "Mock mode is disabled."}, status=status.HTTP_400_BAD_REQUEST)

        reference = request.data.get("reference")
        outcome   = (request.data.get("outcome") or "success").lower()
        if not reference:
            return Response({"error": "reference is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(payment_reference=reference, user=request.user)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == "success":
            return Response({"status": "success", "already_paid": True})

        if outcome == "decline":
            payment.status = "failed"
            payment.save(update_fields=["status"])
            return Response({"status": "failed", "response_code": "51",
                             "message": "Card declined by issuer (simulated)."})

        gateway_ref = f"MOCK-{reference[-8:]}"
        _activate_pro(payment, {"gateway_ref": gateway_ref})
        return Response({
            "status":        "success",
            "response_code": "00",
            "gateway_ref":   gateway_ref,
            "message":       "Approved by Financial Institution (simulated).",
        })


# ─── Payment: Interswitch Redirect Callback ───────────────────────────────────

@method_decorator(csrf_exempt, name="dispatch")
class InterswitchRedirectView(APIView):
    """
    POST /api/v1/payments/redirect/
    Interswitch POSTs payment result here after the user pays.
    Public — no auth. Signature verified via hash.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        txn_ref   = request.data.get("txnref") or request.data.get("TransactionReference", "")
        resp_code = request.data.get("resp")    or request.data.get("ResponseCode", "")
        mac       = request.data.get("mac", "")

        if not txn_ref:
            return Response({"error": "Missing reference."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(payment_reference=txn_ref)
        except Payment.DoesNotExist:
            logger.warning(f"Redirect received for unknown ref: {txn_ref}")
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        isw      = InterswitchPaymentClient()
        expected = isw.compute_redirect_hash(txn_ref, float(payment.amount))
        if mac and mac.lower() != expected.lower():
            logger.warning(f"Invalid hash for ref: {txn_ref}")
            return Response({"error": "Invalid signature."}, status=status.HTTP_401_UNAUTHORIZED)

        if resp_code == "00" and payment.status != "success":
            _activate_pro(payment, {"gateway_ref": request.data.get("paymentReference", "")})
            logger.info(f"Pro activated via redirect for payment {txn_ref}")
        elif resp_code not in ("00", "") and payment.status == "pending":
            payment.status = "failed"
            payment.save(update_fields=["status"])

        return Response({"status": "received"})


# ─── Payment: History ─────────────────────────────────────────────────────────

class PaymentHistoryView(APIView):
    """GET /api/v1/payments/history/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).values(
            "id", "payment_reference", "amount", "currency",
            "payment_type", "status", "paid_at", "created_at",
        )
        return Response(list(payments))


# ─── Identity: NIN Verification ───────────────────────────────────────────────

class NINVerifyView(APIView):
    """
    POST /api/v1/identity/verify-nin/

    Optional account security feature — verify NIN via Interswitch Identity API.
    Available to all users (basic and pro) at any time after registration.
    Grants a 'NIN Verified' badge on the account.

    Request body:
        {
            "nin": "12345678901",          // 11-digit NIN
            "date_of_birth": "1990-05-15" // Optional, improves matching
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        nin  = request.data.get("nin", "").strip()
        dob  = request.data.get("date_of_birth", "").strip()

        if not nin:
            return Response({"error": "nin is required."}, status=status.HTTP_400_BAD_REQUEST)

        if user.nin_verified:
            return Response({
                "message":         "Your account is already NIN-verified.",
                "nin_verified":    True,
                "nin_verified_at": user.nin_verified_at,
                "nin_last_four":   user.nin_last_four,
            })

        isw    = InterswitchIdentityClient()
        result = isw.verify_nin(nin=nin, full_name=user.full_name, date_of_birth=dob)

        if result.get("verified"):
            user.nin_verified          = True
            user.nin_verified_at       = timezone.now()
            user.nin_last_four         = nin[-4:]   # Store only last 4 digits
            user.nin_full_name_matched = result.get("name_matched", False)
            user.save(update_fields=[
                "nin_verified", "nin_verified_at",
                "nin_last_four", "nin_full_name_matched",
            ])

            return Response({
                "success":         True,
                "message":         result["message"],
                "nin_verified":    True,
                "nin_verified_at": user.nin_verified_at,
                "nin_last_four":   user.nin_last_four,
                "name_matched":    result.get("name_matched"),
                "nin_name":        result.get("nin_name"),
            })

        return Response({
            "success":      False,
            "nin_verified": False,
            "error":        result.get("error", "NIN verification failed."),
        }, status=status.HTTP_400_BAD_REQUEST)


class NINStatusView(APIView):
    """GET /api/v1/identity/nin-status/ — Check current NIN verification status."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "nin_verified":    user.nin_verified,
            "nin_verified_at": user.nin_verified_at,
            "nin_last_four":   user.nin_last_four if user.nin_verified else None,
            "name_matched":    user.nin_full_name_matched,
            "message": (
                "Your account is NIN-verified."
                if user.nin_verified
                else "Your NIN has not been verified yet. POST to /api/v1/identity/verify-nin/ to verify."
            ),
        })


# ─── Shared helper ────────────────────────────────────────────────────────────

def _activate_pro(payment: Payment, isw_data: dict) -> None:
    """Mark payment successful and upgrade user to Pro."""
    payment.status            = "success"
    payment.paid_at           = timezone.now()
    payment.gateway_reference = str(isw_data.get("gateway_ref", ""))
    payment.save(update_fields=["status", "paid_at", "gateway_reference"])

    user = payment.user
    user.plan            = "pro"
    user.pro_activated_at = timezone.now()
    user.pro_expires_at  = timezone.now() + timezone.timedelta(days=30)
    user.save(update_fields=["plan", "pro_activated_at", "pro_expires_at"])
    logger.info(f"User {user.email} upgraded to Pro via payment {payment.payment_reference}")
