"""
Interswitch API Client
───────────────────────
Two separate Interswitch products with SEPARATE credentials:

1. WEBPAY (Quickteller Business) — for Pro subscription payments
2. API MARKETPLACE (Identity) — for NIN verification

Both clients support an automatic MOCK MODE when credentials aren't
configured, so the app works end-to-end in demos. Flipping to live is just:

    INTERSWITCH_CLIENT_ID=...
    INTERSWITCH_CLIENT_SECRET=...
    INTERSWITCH_MERCHANT_CODE=...
    INTERSWITCH_PAY_ITEM_ID=...
    INTERSWITCH_IDENTITY_CLIENT_ID=...
    INTERSWITCH_IDENTITY_CLIENT_SECRET=...
    INTERSWITCH_ENV=production    # or sandbox
"""
import base64
import hashlib
import logging
import time
import uuid
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)
HTTP_SESSION = requests.Session()
HTTP_SESSION.trust_env = False


def _endpoints():
    """Return the right Interswitch endpoints for the current environment."""
    if getattr(settings, "INTERSWITCH_ENV", "sandbox") == "production":
        base = "https://passport.interswitchng.com"
        webpay_host = "https://webpay.interswitchng.com"
        identity_host = "https://saturn.interswitchng.com"
    else:
        base = "https://qa.interswitchng.com"
        webpay_host = "https://qa.interswitchng.com"
        identity_host = "https://qa.interswitchng.com"
    return {
        "passport":      f"{base}/passport/oauth/token",
        "webpay_init":   f"{webpay_host}/collections/api/v1/std-payment",
        "webpay_verify": f"{webpay_host}/collections/api/v1/gettransaction.json",
        "checkout":      f"{webpay_host}/collections/w/pay",
        "identity":      f"{identity_host}/api/v2/identity/verify/nin",
    }


class _TokenCache:
    _store: dict = {}

    @classmethod
    def get(cls, client_id):
        e = cls._store.get(client_id)
        if e and time.time() < e["expiry"]:
            return e["token"]
        return None

    @classmethod
    def set(cls, client_id, token, expires_in):
        cls._store[client_id] = {"token": token, "expiry": time.time() + expires_in - 60}


def _get_token(client_id, client_secret):
    if not client_id or not client_secret:
        return None
    cached = _TokenCache.get(client_id)
    if cached:
        return cached

    creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    try:
        r = HTTP_SESSION.post(
            _endpoints()["passport"],
            headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
            data={"grant_type": "client_credentials"},
            timeout=30,
        )
        d = r.json()
        if r.status_code == 200 and "access_token" in d:
            _TokenCache.set(client_id, d["access_token"], d.get("expires_in", 3600))
            return d["access_token"]
        logger.error(f"Interswitch token error: {d}")
    except requests.RequestException as e:
        logger.error(f"Interswitch passport failed: {e}")
    except ValueError as e:
        logger.error(f"Interswitch token response was not valid JSON: {e}")
    return None


def generate_transaction_reference(prefix="LND"):
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


# ─── 1. Webpay — Payment Processing ──────────────────────────────────────────

class InterswitchPaymentClient:
    """
    Pro subscription payments via Interswitch Webpay.
    Falls back to MOCK mode (simulated hosted checkout) if creds are missing.
    """

    @property
    def mock(self) -> bool:
        return getattr(settings, "INTERSWITCH_PAYMENTS_MOCK_ACTIVE", True)

    def initialize_payment(self, amount_naira, transaction_ref, customer_email,
                           customer_name="", redirect_url="", frontend_origin=""):
        amount_kobo = int(amount_naira * 100)
        # Prefer the live request's own frontend origin so the URL we build is
        # always reachable by the user — local, Vercel preview, or production.
        origin   = (frontend_origin or settings.FRONTEND_URL or "").rstrip("/")
        redirect = redirect_url or f"{origin}/payment/callback"

        if self.mock:
            # Build a checkout URL on OUR frontend that mirrors the Interswitch
            # hosted page exactly — same params (txn_ref, amount, etc).
            params = urlencode({
                "txnref":   transaction_ref,
                "amount":   amount_kobo,
                "currency": "566",
                "email":    customer_email,
                "name":     customer_name or customer_email,
                "redirect": redirect,
                "merchant": "LANDRIFY",
            })
            checkout = f"{origin}/payment/checkout?{params}"
            logger.info(f"[MOCK] Interswitch payment initialised: {transaction_ref}")
            return {
                "status": True,
                "authorization_url": checkout,
                "transaction_reference": transaction_ref,
                "amount_kobo": amount_kobo,
                "mock": True,
            }

        # ── Live path ────────────────────────────────────────────────────────
        token = _get_token(settings.INTERSWITCH_CLIENT_ID, settings.INTERSWITCH_CLIENT_SECRET)
        if not token:
            return {"status": False, "message": "Could not obtain Interswitch access token."}

        eps = _endpoints()
        try:
            HTTP_SESSION.post(
                eps["webpay_init"],
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "merchantCode":         settings.INTERSWITCH_MERCHANT_CODE,
                    "payItemID":            settings.INTERSWITCH_PAY_ITEM_ID,
                    "transactionReference": transaction_ref,
                    "amount":               amount_kobo,
                    "customerEmail":        customer_email,
                    "customerName":         customer_name or customer_email,
                    "redirectURL":          redirect,
                    "currency":             566,
                },
                timeout=30,
            )
        except requests.RequestException as e:
            logger.warning(f"Webpay init POST failed (non-fatal): {e}")

        checkout_params = urlencode({
            "merchantCode":         settings.INTERSWITCH_MERCHANT_CODE,
            "payItemID":            settings.INTERSWITCH_PAY_ITEM_ID,
            "amount":               amount_kobo,
            "transactionReference": transaction_ref,
            "currency":             566,
            "customerEmail":        customer_email,
            "redirectURL":          redirect,
        })
        return {
            "status": True,
            "authorization_url": f"{eps['checkout']}?{checkout_params}",
            "transaction_reference": transaction_ref,
            "amount_kobo": amount_kobo,
            "mock": False,
        }

    def verify_transaction(self, transaction_ref, amount_naira):
        amount_kobo = int(amount_naira * 100)

        if self.mock:
            # In mock mode, success is decided when the user confirms on the
            # simulated checkout page (see MockConfirmPaymentView). If the
            # payment is still pending here, it just hasn't been confirmed yet.
            from .models import Payment
            try:
                p = Payment.objects.get(payment_reference=transaction_ref)
            except Payment.DoesNotExist:
                return {"status": False, "message": "Unknown transaction."}
            if p.status == "success":
                return {
                    "status": True,
                    "response_code": "00",
                    "response_description": "Approved by Financial Institution (MOCK)",
                    "gateway_ref": p.gateway_reference or f"MOCK-{transaction_ref[-8:]}",
                    "raw": {"mock": True},
                }
            return {"status": False, "response_code": "Z6", "response_description": "Pending"}

        token = _get_token(settings.INTERSWITCH_CLIENT_ID, settings.INTERSWITCH_CLIENT_SECRET)
        if not token:
            return {"status": False, "message": "Token error."}

        # Per Interswitch docs: Hash = SHA-512(productId + transactionRef + macKey)
        product_id = settings.INTERSWITCH_PAY_ITEM_ID  # productId in the gateway
        txn_hash   = hashlib.sha512(
            f"{product_id}{transaction_ref}{settings.INTERSWITCH_CLIENT_SECRET}".encode()
        ).hexdigest()

        try:
            r = HTTP_SESSION.get(
                _endpoints()["webpay_verify"],
                headers={"Authorization": f"Bearer {token}", "Hash": txn_hash},
                params={
                    "merchantcode": settings.INTERSWITCH_MERCHANT_CODE,
                    "transactionreference": transaction_ref,
                    "amount": amount_kobo,
                },
                timeout=30,
            )
            d = r.json()
            return {
                "status": d.get("ResponseCode") == "00",
                "response_code": d.get("ResponseCode"),
                "response_description": d.get("ResponseDescription"),
                "gateway_ref": d.get("PaymentReference", ""),
                "raw": d,
            }
        except requests.RequestException as e:
            logger.error(f"Webpay verify error: {e}")
            return {"status": False, "message": str(e)}
        except ValueError as e:
            logger.error(f"Webpay verify response was not valid JSON: {e}")
            return {"status": False, "message": "Invalid gateway response."}

    def compute_redirect_hash(self, transaction_ref, amount_naira):
        amount_kobo = int(amount_naira * 100)
        return hashlib.sha512(
            f"{transaction_ref}{amount_kobo}{settings.INTERSWITCH_CLIENT_SECRET}".encode()
        ).hexdigest()


# ─── 2. NIN Identity Verification ────────────────────────────────────────────

class InterswitchIdentityClient:
    """
    NIN verification via Interswitch API Marketplace.
    Falls back to MOCK mode (simulated lookup) if creds are missing.
    """

    @property
    def mock(self) -> bool:
        return getattr(settings, "INTERSWITCH_IDENTITY_MOCK_ACTIVE", True)

    def verify_nin(self, nin, full_name="", date_of_birth=""):
        if not nin or not nin.strip():
            return {"verified": False, "error": "NIN is required."}
        nin = nin.strip()
        if len(nin) != 11 or not nin.isdigit():
            return {"verified": False, "error": "NIN must be exactly 11 digits."}

        if self.mock:
            # Simulated lookup. Deterministic from the NIN so the same NIN
            # always returns the same name. In real life Interswitch would
            # echo back the name on file at NIMC.
            #
            # Test rules:
            #   • NINs starting with "00000" → "not found"
            #   • All others → verified, returning the user's account name
            #     (so name match always succeeds — typical happy path).
            if nin.startswith("00000"):
                return {"verified": False, "error": "NIN not found in the identity database."}

            name_for_record = (full_name or "Verified User").strip()
            parts = name_for_record.split()
            first = parts[0] if parts else "Verified"
            last  = parts[-1] if len(parts) > 1 else "User"

            logger.info(f"[MOCK] NIN verified for ****{nin[-4:]}")
            return {
                "verified":     True,
                "name_matched": True,
                "nin_name":     f"{first} {last[0]}.",
                "message":      "NIN verified successfully. Name matches your account.",
                "mock":         True,
            }

        # ── Live path ────────────────────────────────────────────────────────
        token = _get_token(settings.INTERSWITCH_IDENTITY_CLIENT_ID, settings.INTERSWITCH_IDENTITY_CLIENT_SECRET)
        if not token:
            return {"verified": False, "error": "Identity service temporarily unavailable."}

        payload = {"nin": nin}
        if date_of_birth:
            payload["dateOfBirth"] = date_of_birth

        try:
            r = HTTP_SESSION.post(
                _endpoints()["identity"],
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                    "clientId":      settings.INTERSWITCH_IDENTITY_CLIENT_ID,
                },
                json=payload,
                timeout=30,
            )
            d = r.json()
            if r.status_code == 200 and d.get("responseCode") == "00":
                first = (d.get("firstName") or "").strip()
                last  = (d.get("lastName")  or "").strip()
                full  = f"{first} {last}".strip()
                matched = False
                if full_name and full:
                    a = [w for w in full_name.upper().split() if len(w) > 2]
                    n = full.upper().split()
                    matched = any(w in n for w in a)
                return {
                    "verified": True,
                    "name_matched": matched,
                    "nin_name": f"{first} {last[0]}." if last else first,
                    "message": "NIN verified successfully." + ("" if matched else " (Name on NIN does not fully match account.)"),
                }
            code = str(d.get("responseCode") or d.get("code", ""))
            if code in ("01", "02", "404"):
                return {"verified": False, "error": "NIN not found in the identity database."}
            return {"verified": False, "error": "NIN verification could not be completed."}
        except requests.RequestException as e:
            logger.error(f"Identity API error: {e}")
            return {"verified": False, "error": "Identity service unavailable. Please try again."}
        except ValueError as e:
            logger.error(f"Identity API response was not valid JSON: {e}")
            return {"verified": False, "error": "Identity service returned an invalid response."}
