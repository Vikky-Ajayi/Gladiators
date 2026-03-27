# Landrify API

> Land verification platform for Nigeria — know before you buy.
> Built for the **Enyata Buildathon × Interswitch Developer Community** hackathon.

**Payment provider:** Interswitch Webpay  
**Live docs:** `https://your-app.up.railway.app/api/docs/`  
**Health check:** `https://your-app.up.railway.app/api/v1/health/`  
**Demo scan (no login):** `https://your-app.up.railway.app/api/v1/demo-scan/`

---

## Quick Demo (For Judges)

No account needed. Hit the demo endpoint to see the risk engine live:

```bash
# See available demo locations
GET /api/v1/demo-scan/

# Run a scan on Lekki (high flood risk)
POST /api/v1/demo-scan/
{ "location": "lekki_high_flood" }

# Run a scan on Ibeju-Lekki (government acquisition zone)
POST /api/v1/demo-scan/
{ "location": "ibeju_acquisition" }

# Run a scan on Maitama, Abuja (low risk — shows contrast)
POST /api/v1/demo-scan/
{ "location": "abuja_safe" }

# Custom coordinates
POST /api/v1/demo-scan/
{ "latitude": 6.5244, "longitude": 3.3792 }
```

Available demo keys: `lekki_high_flood`, `ibeju_acquisition`, `abuja_safe`, `onitsha_critical`, `port_harcourt`

---

## Local Setup

### 1. Install
```bash
git clone https://github.com/your-username/landrify-backend.git
cd landrify-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 2. Create database
```bash
psql -U postgres -c "CREATE DATABASE landrify;"
psql -U postgres -c "CREATE USER landrify WITH PASSWORD 'password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE landrify TO landrify;"
```

### 3. Configure
```bash
cp .env.example .env
# Fill in your credentials (see .env.example for all keys)
```

### 4. Migrate & seed
```bash
python manage.py migrate
python manage.py seed_data   # Loads Nigerian flood zones, dams, acquisition areas
```

### 5. Run
```bash
python manage.py runserver
# API:   http://localhost:8000
# Docs:  http://localhost:8000/api/docs/
# Admin: http://localhost:8000/admin/
```

---

## Interswitch Setup

This project uses **Interswitch Webpay** as the payment gateway.

1. Register at [developer.interswitchgroup.com](https://developer.interswitchgroup.com)
2. Create a new application
3. Copy your test credentials:
   - **Client ID** → `INTERSWITCH_CLIENT_ID`
   - **Client Secret** → `INTERSWITCH_CLIENT_SECRET`
   - **Merchant Code** → `INTERSWITCH_MERCHANT_CODE`
   - **Pay Item ID** → `INTERSWITCH_PAY_ITEM_ID`
4. Set `INTERSWITCH_REDIRECT_URL` to your frontend payment callback URL

The client is in `apps/payments/interswitch.py` and handles OAuth2 token acquisition, payment initialization, and transaction verification automatically.

---

## Deploy to Railway

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "Landrify backend"
git remote add origin https://github.com/YOUR/landrify-backend.git
git push -u origin main
```

### 2. Railway setup
1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Add **PostgreSQL** plugin
3. Set environment variables (Variables tab):

| Variable | Value |
|---|---|
| `DJANGO_SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `your-app.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` |
| `GOOGLE_MAPS_API_KEY` | Your key |
| `INTERSWITCH_CLIENT_ID` | From Interswitch dashboard |
| `INTERSWITCH_CLIENT_SECRET` | From Interswitch dashboard |
| `INTERSWITCH_MERCHANT_CODE` | From Interswitch dashboard |
| `INTERSWITCH_PAY_ITEM_ID` | From Interswitch dashboard |
| `INTERSWITCH_REDIRECT_URL` | `https://your-frontend.vercel.app/payment/callback` |
| `DB_NAME` | `${{Postgres.PGDATABASE}}` |
| `DB_USER` | `${{Postgres.PGUSER}}` |
| `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
| `DB_HOST` | `${{Postgres.PGHOST}}` |
| `DB_PORT` | `${{Postgres.PGPORT}}` |

Railway auto-runs `migrate` + `seed_data` on every deploy (via `Procfile`).

---

## API Reference

### Public Endpoints (no auth needed)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health/` | Health check |
| GET | `/api/v1/stats/` | Platform statistics |
| GET/POST | `/api/v1/demo-scan/` | Demo scan for testing |
| GET | `/api/docs/` | Swagger UI |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register/` | Create account, returns token |
| POST | `/api/v1/auth/login/` | Login, returns token |
| POST | `/api/v1/auth/logout/` | Invalidate token |

**Header for all authenticated requests:**
```
Authorization: Token <token>
```

### Land Scanning

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/scans/` | Create scan (results instant) |
| GET | `/api/v1/scans/:id/` | Get scan details |
| GET | `/api/v1/scans/:id/report/` | Full report (premium after payment) |
| GET | `/api/v1/users/me/scans/` | User scan history |

**Create Scan body:**
```json
{
  "latitude": 6.5244,
  "longitude": 3.3792,
  "accuracy": 5.2,
  "scan_type": "basic"
}
```

**Scan types:** `basic` (free, 3/month) · `premium` (₦5,000, full report)

### Payments (Interswitch Webpay)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/payments/initialize/` | Get Interswitch checkout URL |
| GET | `/api/v1/payments/verify/?reference=LND-XXX` | Verify after redirect |
| POST | `/api/v1/payments/redirect/` | Interswitch posts result here |
| GET | `/api/v1/payments/history/` | Payment history |

**Payment flow:**
1. `POST /initialize/` → get `authorization_url`
2. Redirect user to `authorization_url` (Interswitch hosted page)
3. Interswitch posts to `/redirect/` after payment
4. `GET /verify/?reference=XXX` → confirm success
5. `GET /scans/:id/report/` → full report now accessible

### Saved Lands & Alerts

| Method | Endpoint | Description |
|---|---|---|
| POST/GET | `/api/v1/saved-lands/` | Save land / list saved |
| PUT/DELETE | `/api/v1/saved-lands/:id/` | Update or remove |
| GET | `/api/v1/alerts/` | Alerts with unread count |
| PUT | `/api/v1/alerts/read-all/` | Mark all read |

---

## Risk Score System

| Score | Level | Meaning |
|---|---|---|
| 0–24 | 🟢 Low | Safe — standard due diligence applies |
| 25–49 | 🟡 Medium | Moderate risk — verify thoroughly |
| 50–74 | 🟠 High | High risk — seek professional advice |
| 75–100 | 🔴 Critical | Do not purchase without expert legal review |

**Weights:** Legal/acquisition 40% · Flood 30% · Erosion 15% · Dam proximity 15%
