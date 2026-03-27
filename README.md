#  Landrify — Land Verification for Nigeria

> **Know before you buy.**

Landrify is a land intelligence platform that lets anyone verify a plot of land in Nigeria before purchasing — checking flood risk, erosion risk, dam proximity, government acquisition status, and delivering an AI-powered 5–50 year environmental time-projection report.

Built for the **Enyata Buildathon × Interswitch Developer Community Hackathon**.

---

## 🏆 The Problem We're Solving

Millions of Nigerians lose life savings to land fraud, government acquisition disputes, and unverified environmental hazards every year. There is no simple, accessible way for a buyer to verify a plot of land before committing. Landrify changes that — scan any location in Nigeria in seconds and get a comprehensive risk report powered by real data.

---

## 👥 Team Members & Contributions

### Ajayi Victoria — Team Leader & Backend Developer

**Role:** Led the overall project vision, architecture, and backend engineering.

**Technical contributions:**
- Designed the entire system architecture — Django REST Framework backend, Knox token auth, PostgreSQL schema, and Interswitch payment + NIN identity integration
- Built the complete risk engine (`apps/scans/services.py`) — geocoding via Nominatim (OpenStreetMap), elevation via Open-Elevation API, satellite imagery via Mapbox, and Haversine-based dam proximity calculation
- Integrated **Interswitch Webpay** for Pro subscription payments — full OAuth2 flow, payment initialization, redirect callback verification, and hash-based signature validation
- Integrated **Interswitch Identity API** for optional NIN verification — post-registration security feature that verifies NIN against national identity database and matches against account name
- Integrated **Groq AI** (llama-3.3-70b-versatile) for the 5/10/15/20/30/40/50-year time-projection report — Pro-only feature that generates environmental risk analysis across multiple time horizons
- Built the Basic/Pro plan gate — Basic users get 1 free scan with a summary report; Pro users get unlimited scans with the full AI report
- Compiled the comprehensive Nigerian land risk dataset used in the database — 50+ flood risk zones (all 36 states + FCT) sourced from NIHSA Annual Flood Outlooks 2021–2024, 25 dams including Lagdo Dam (Cameroon), and 17 government acquisition areas sourced from LASURA, FCDA/AGIS, and published legal records
- Built the live interactive API tester (`/tester/`) served directly from Django, enabling real-time scan testing with GPS location
- Configured deployment to Railway with PostgreSQL, WhiteNoise static files, and full environment variable management
- Wrote all technical documentation including the frontend architecture specification

**Non-technical contributions:**
- Defined the product scope, user journey, and plan structure (Basic vs Pro)
- Led all API key procurement and third-party service setup (Interswitch, Mapbox, Groq)
- Managed project timeline and task coordination across the team

---

### Oyesunle Lekan — Co-Backend Developer

**Role:** Backend co-development, data research, and API endpoint implementation.

**Technical contributions:**
- Implemented the alerts system (`apps/alerts/`) — alert model, list/read/delete endpoints, and mark-all-read functionality
- Implemented the saved lands feature (`apps/scans/saved_views.py`) — users can bookmark scanned plots for later reference and monitoring
- Built user profile management endpoints — profile update, change password, and scan history views
- Contributed to the scan serializers and the full scan result data structure (`apps/scans/serializers.py`)
- Assisted with database schema design — models for `LandScan`, `FloodRiskZone`, `AcquisitionArea`, `Dam`, `SavedLand`, `Payment`, `Alert`
- Researched and contributed Nigerian flood risk data for the seed dataset — sourced NIHSA flood outlooks, NEMA situation reports, OCHA Nigeria reports, and UNDP flood impact assessments for all 36 states
- Ran backend integration tests and helped debug the Interswitch payment redirect flow

**Non-technical contributions:**
- Conducted research into Nigerian land ownership law, government acquisition processes (LSDPC, FCDA/AGIS, gazette references), and petroleum zone restrictions used in the acquisition area dataset
- Reviewed the live tester against the API spec to verify endpoint accuracy

---

### Akinfenwa Obaseyi — Frontend Developer

**Role:** Frontend architecture, React + TypeScript application, and UI/UX design.

**Technical contributions:**
- Architected the complete React 18 + TypeScript + Vite frontend application
- Built the interactive map interface using **Mapbox GL JS** — satellite layer, draggable pin placement, and animated radius circle showing the scan area
- Implemented the full authentication flow — register, login, Knox token management, protected routes, and auto-redirect on 401
- Built the scan results display — animated risk score ring, environmental risk cards (flood / erosion / dam / government land), satellite image preview, and AI report markdown renderer
- Implemented the **Interswitch payment callback flow** — `/payment/callback` route reads the `?reference=` parameter, calls the verify endpoint, invalidates the user cache, and redirects with plan update
- Built the Pro upgrade page with Interswitch payment initiation and redirect
- Built the dashboard — saved lands list, recent scan history, account status, plan badge, and Pro expiry
- Built the optional NIN verification UI — form, submission, response handling, and verified badge display on profile
- Set up `@tanstack/react-query` for all API state management — caching, loading states, background refetch
- Configured environment variables (all API URLs via `VITE_API_BASE_URL` — zero hardcoding)
- Deployed the frontend to Vercel with production environment configuration

**Non-technical contributions:**
- Designed the overall UI/UX — colour language (green for safe, amber for medium, red for critical), information hierarchy, and mobile-responsive layout
- Created the visual design system — risk score rings, card components, upgrade banners, and plan badges

---
# Disclaimer due to the issues with the interswitch api all registered users are instantly bumped to Pro users


## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework |
| Auth | Knox Token Authentication |
| Database | PostgreSQL |
| AI Reports | Groq (llama-3.3-70b-versatile) |
| Payments | Interswitch Webpay |
| Identity | Interswitch Identity API (NIN verification) |
| Geocoding | Nominatim / OpenStreetMap (free, no key) |
| Elevation | Open-Elevation API (free, no key) |
| Satellite Imagery | Mapbox Static Maps API |
| Frontend | React 18 + TypeScript + Vite |
| Map | Mapbox GL JS |
| Deployment | Railway (backend) + Vercel (frontend) |

---

## 🔌 Interswitch Integration

This project uses two Interswitch APIs:

### 1. Webpay — Pro Subscription Payments
Users pay ₦5,000/month to upgrade to Pro. The flow:
1. `POST /api/v1/payments/initialize/` → returns `authorization_url`
2. Frontend redirects user to Interswitch hosted checkout
3. Interswitch POSTs to `/api/v1/payments/redirect/` (signature verified via SHA-512 hash)
4. `GET /api/v1/payments/verify/?reference=XXX` confirms payment and upgrades user to Pro

### 2. Identity API — NIN Verification
Optional post-registration security feature. Users can verify their NIN at any time to get a verified badge on their account. Not required to use the app — purely for additional identity assurance.

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
