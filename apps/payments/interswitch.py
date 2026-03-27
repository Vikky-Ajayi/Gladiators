"""
Interswitch API Client
───────────────────────
Two separate Interswitch products with SEPARATE credentials:

1. WEBPAY (Quickteller Business)
   ─ For processing Pro subscription payments
   ─ Credentials: INTERSWITCH_CLIENT_ID, CLIENT_SECRET, MERCHANT_CODE, PAY_ITEM_ID
   ─ Register at: quickteller.com/business
   ─ Docs: https://docs.interswitchgroup.com/docs/collections

2. API MARKETPLACE (Identity / NIN Verification)
   ─ For optional NIN account verification
   ─ Credentials: INTERSWITCH_IDENTITY_CLIENT_ID, INTERSWITCH_IDENTITY_CLIENT_SECRET
   ─ Register at: developer.interswitchgroup.com → Create Project → Add NIN API
   ─ Docs: https://developer.interswitchgroup.com/docs/identity

Sandbox base URL: https://qa.interswitchng.com
Auth endpoint: POST /passport/oauth/token  (client_credentials grant)
Tokens expire after ~1 hour (we cache and auto-refresh)
"""
import base64
import hashlib
import logging
import time
import uuid

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Sandbox endpoints — swap to production when going live
PASSPORT_URL  = "https://qa.interswitchng.com/passport/oauth/token"
WEBPAY_INIT   = "https://qa.interswitchng.com/collections/api/v1/std-payment"
WEBPAY_VERIFY = "https://qa.interswitchng.com/collections/api/v1/gettransaction.json"
CHECKOUT_URL  = "https://qa.interswitchng.com/collections/w/pay"
IDENTITY_URL  = "https://qa.interswitchng.com/api/v2/identity/verify/nin"


# ─── Token Cache (one per credential set) ─────────────────────────────────────

class _TokenCache:
    """Simple in-memory OAuth2 token cache keyed by client_id."""
    _store: dict = {}

    @classmethod
    def get(cls, client_id: str) -> str | None:
        entry = cls._store.get(client_id)
        if entry and time.time() < entry['expiry']:
            return entry['token']
        return None

    @classmethod
    def set(cls, client_id: str, token: str, expires_in: int):
        cls._store[client_id] = {
            'token':  token,
            'expiry': time.time() + expires_in - 60,  # 60s safety buffer
        }


def _get_token(client_id: str, client_secret: str) -> str | None:
    """
    Obtain OAuth2 Bearer token from Interswitch Passport.
    Uses client_credentials grant — same flow for both Webpay and Marketplace.
    Token expires in ~1 hour; cached until 60s before expiry.
    """
    if not client_id or not client_secret:
        logger.error("Interswitch credentials not set.")
        return None

    cached = _TokenCache.get(client_id)
    if cached:
        return cached

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    try:
        response = requests.post(
            PASSPORT_URL,
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=30,
        )
        data = response.json()
        if response.status_code == 200 and "access_token" in data:
            token = data["access_token"]
            _TokenCache.set(client_id, token, data.get("expires_in", 3600))
            logger.info(f"Interswitch token obtained for client {client_id[:8]}...")
            return token

        logger.error(f"Interswitch token error: {data}")
    except requests.RequestException as e:
        logger.error(f"Interswitch passport request failed: {e}")

    return None


def generate_transaction_reference(prefix: str = "LND") -> str:
    """Generate a unique transaction reference. Format: LND-XXXXXXXXXXXX"""
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


# ─── 1. Webpay — Payment Processing ──────────────────────────────────────────

class InterswitchPaymentClient:
    """
    Processes Pro subscription payments via Interswitch Webpay.

    Setup required (from the hackathon session):
    1. Register as merchant at quickteller.com/business
       → Get your Merchant Code + Pay Item ID (Payable Code)
    2. Register at developer.interswitchgroup.com
       → Get Client ID + Client Secret for API authentication

    Payment flow:
        initialize_payment() → redirect user to authorization_url
        → user pays on Interswitch hosted page
        → Interswitch POSTs to your redirect URL
        → verify_transaction() to confirm
    """

    def _token(self):
        return _get_token(
            settings.INTERSWITCH_CLIENT_ID,
            settings.INTERSWITCH_CLIENT_SECRET,
        )

    def initialize_payment(
        self,
        amount_naira: float,
        transaction_ref: str,
        customer_email: str,
        customer_name: str = "",
        redirect_url: str = "",
    ) -> dict:
        """
        Initialise a payment transaction.
        Amount in Naira — converted to Kobo (×100) internally.
        Returns authorization_url for frontend redirect.
        """
        token = self._token()
        if not token:
            return {"status": False, "message": "Could not obtain Interswitch access token."}

        amount_kobo = int(amount_naira * 100)   # Interswitch requires Kobo
        redirect    = redirect_url or settings.INTERSWITCH_REDIRECT_URL

        # POST to initialise (some merchants skip this and go straight to checkout)
        try:
            requests.post(
                WEBPAY_INIT,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "merchantCode":         settings.INTERSWITCH_MERCHANT_CODE,
                    "payItemID":            settings.INTERSWITCH_PAY_ITEM_ID,
                    "transactionReference": transaction_ref,
                    "amount":               amount_kobo,
                    "customerEmail":        customer_email,
                    "customerName":         customer_name or customer_email,
                    "redirectURL":          redirect,
                    "currency":             566,   # NGN ISO 4217 numeric
                },
                timeout=30,
            )
        except requests.RequestException as e:
            logger.warning(f"Webpay init POST failed (non-fatal): {e}")

        # Build hosted checkout URL
        # Per the hackathon session: redirect checkout = user goes to Interswitch page
        checkout = (
            f"{CHECKOUT_URL}"
            f"?merchantCode={settings.INTERSWITCH_MERCHANT_CODE}"
            f"&payItemID={settings.INTERSWITCH_PAY_ITEM_ID}"
            f"&amount={amount_kobo}"
            f"&transactionReference={transaction_ref}"
            f"&currency=566"
            f"&customerEmail={customer_email}"
            f"&redirectURL={redirect}"
        )

        return {
            "status":                True,
            "authorization_url":     checkout,
            "transaction_reference": transaction_ref,
            "amount_kobo":           amount_kobo,
        }

    def verify_transaction(self, transaction_ref: str, amount_naira: float) -> dict:
        """
        Check transaction status. Requires token (secured endpoint).
        Hash = SHA512(txn_ref + amount_kobo + client_secret)
        """
        token = self._token()
        if not token:
            return {"status": False, "message": "Token error."}

        amount_kobo = int(amount_naira * 100)
        txn_hash    = hashlib.sha512(
            f"{transaction_ref}{amount_kobo}{settings.INTERSWITCH_CLIENT_SECRET}".encode()
        ).hexdigest()

        try:
            r = requests.get(
                WEBPAY_VERIFY,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Hash":          txn_hash,
                },
                params={
                    "merchantcode":         settings.INTERSWITCH_MERCHANT_CODE,
                    "transactionreference": transaction_ref,
                    "amount":               amount_kobo,
                },
                timeout=30,
            )
            data = r.json()
            ok   = data.get("ResponseCode") == "00"
            return {
                "status":               ok,
                "response_code":        data.get("ResponseCode"),
                "response_description": data.get("ResponseDescription"),
                "gateway_ref":          data.get("PaymentReference", ""),
                "raw":                  data,
            }
        except requests.RequestException as e:
            logger.error(f"Webpay verify error: {e}")
            return {"status": False, "message": str(e)}

    def compute_redirect_hash(self, transaction_ref: str, amount_naira: float) -> str:
        """Validate Interswitch redirect POSTback signatures."""
        amount_kobo = int(amount_naira * 100)
        return hashlib.sha512(
            f"{transaction_ref}{amount_kobo}{settings.INTERSWITCH_CLIENT_SECRET}".encode()
        ).hexdigest()


# ─── 2. API Marketplace — NIN Identity Verification ──────────────────────────

class InterswitchIdentityClient:
    """
    NIN verification via Interswitch API Marketplace.

    From the hackathon session:
    - Marketplace = "Jumia for APIs" — separate from Webpay
    - Create a PROJECT in the marketplace → select NIN Verification API
    - Each project has its own Client ID + Client Secret
    - Tokens are JWTs, expire ~1 hour (same OAuth2 flow)

    Setup:
    1. Go to developer.interswitchgroup.com
    2. Sign up / log in
    3. Create a new Project
    4. In the project, add the "NIN Verification" API
    5. Copy the project's Client ID → INTERSWITCH_IDENTITY_CLIENT_ID
    6. Copy the project's Client Secret → INTERSWITCH_IDENTITY_CLIENT_SECRET

    This is completely separate from your Webpay credentials.
    """

    def _token(self):
        return _get_token(
            settings.INTERSWITCH_IDENTITY_CLIENT_ID,
            settings.INTERSWITCH_IDENTITY_CLIENT_SECRET,
        )

    def verify_nin(self, nin: str, full_name: str = "", date_of_birth: str = "") -> dict:
        """
        Verify a user's NIN against the Interswitch Identity database.

        Args:
            nin:           11-digit NIN (National Identification Number)
            full_name:     User's name on their Landrify account (for name matching)
            date_of_birth: Optional DOB string YYYY-MM-DD

        Returns:
            verified:     bool
            name_matched: bool — does NIN name match account name?
            nin_name:     str  — partial name from NIN record
            message:      str
        """
        # Input validation
        if not nin or not nin.strip():
            return {"verified": False, "error": "NIN is required."}
        nin = nin.strip()
        if len(nin) != 11 or not nin.isdigit():
            return {"verified": False, "error": "NIN must be exactly 11 digits."}

        token = self._token()
        if not token:
            return {
                "verified": False,
                "error": "Identity service temporarily unavailable. Please try again later.",
            }

        payload = {"nin": nin}
        if date_of_birth:
            payload["dateOfBirth"] = date_of_birth

        try:
            response = requests.post(
                IDENTITY_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                    "clientId":      settings.INTERSWITCH_IDENTITY_CLIENT_ID,
                },
                json=payload,
                timeout=30,
            )
            data = response.json()

            # Success — Interswitch returns firstName + lastName
            if response.status_code == 200 and data.get("responseCode") == "00":
                nin_first = (data.get("firstName") or "").strip()
                nin_last  = (data.get("lastName")  or "").strip()
                nin_full  = f"{nin_first} {nin_last}".strip()

                # Loose name match — any word in account name appears in NIN name
                name_matched = False
                if full_name and nin_full:
                    account_words = [w for w in full_name.upper().split() if len(w) > 2]
                    nin_words     = nin_full.upper().split()
                    name_matched  = any(w in nin_words for w in account_words)

                return {
                    "verified":     True,
                    "name_matched": name_matched,
                    "nin_name":     f"{nin_first} {nin_last[0]}." if nin_last else nin_first,
                    "message": (
                        "NIN verified successfully. Name matches your account."
                        if name_matched
                        else "NIN verified. Note: name on NIN does not fully match your account name."
                    ),
                }

            # Handle known error codes
            code = str(data.get("responseCode") or data.get("code", ""))
            if code in ("01", "02", "404"):
                return {"verified": False, "error": "NIN not found in the identity database."}
            if code == "400":
                return {"verified": False, "error": "Invalid NIN format rejected by identity service."}

            logger.warning(f"Interswitch NIN unexpected response [{response.status_code}]: {data}")
            return {"verified": False, "error": "NIN verification could not be completed at this time."}

        except requests.RequestException as e:
            logger.error(f"Interswitch identity API error: {e}")
            return {"verified": False, "error": "Identity service unavailable. Please try again."}
