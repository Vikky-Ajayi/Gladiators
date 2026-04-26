# Landrify - Land Intelligence Platform

A land verification platform for Nigeria. Users can scan plots of land before purchase, checking for flood risk, erosion risk, proximity to dams, and government acquisition status. AI (Groq Llama 3.3) generates environmental time-projection reports.

## Architecture

- **Backend**: Django 5.1 + Django REST Framework (Knox token auth), running on port 8000
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS 4, running on port 5000
- **Database**: PostgreSQL (Replit built-in)
- **AI**: Groq (Llama 3.3 70B) for risk reports
- **Payments**: Interswitch Webpay
- **Maps**: Mapbox GL JS

## Project Structure

```
landrify/           - Django project config (settings.py, urls.py)
apps/               - Django apps
  users/            - User auth & profiles
  scans/            - Land scanning engine
  payments/         - Interswitch payment integration
  alerts/           - User notifications
  core/             - Health checks, seeding commands
landrify_frontend/  - React + Vite frontend
  src/
    api/            - Axios API client
    pages/          - App pages (Home, Dashboard, NewScan, etc.)
    components/     - UI components
    hooks/          - Custom React hooks
    types/          - TypeScript definitions
templates/          - Django HTML templates
```

## Workflows

- **Start application**: `cd landrify_frontend && npm run dev` on port 5000 (webview)
- **Backend API**: `python manage.py runserver 0.0.0.0:8000` on port 8000 (console)

## Key Configuration

- Frontend proxies `/api` and `/admin` routes to the Django backend (port 8000) via Vite's proxy
- `VITE_API_BASE_URL` is empty (uses proxy); API calls use full paths like `/api/v1/auth/login/`
- Backend CORS is configured to allow requests from frontend origin
- Django uses Replit's built-in PostgreSQL (no SSL in dev)

## Environment Variables

- `DATABASE_URL` - Replit-managed PostgreSQL connection string
- `DJANGO_SECRET_KEY` - Django secret key
- `DEBUG` - Enable Django debug mode
- `GROQ_API_KEY` - For AI report generation (optional for dev with TEST_MODE=true)
- `MAPBOX_TOKEN` - For satellite map imagery (also exposed to the frontend via `/api/v1/config/`)
- `INTERSWITCH_CLIENT_ID/SECRET` - Payment gateway credentials
- `GOOGLE_CLIENT_ID` - Google OAuth client ID for Sign in with Google (optional)
- `VITE_GOOGLE_CLIENT_ID` - Same value, required at frontend build time for the Google Identity script
- `TEST_MODE` - Set to `true` to bypass payment/Pro gates in development

## Notable Endpoints

- `GET  /api/v1/config/` — public client config (mapbox token, google client id, test mode)
- `POST /api/v1/auth/google/` — exchange a Google ID token for a Knox token
- `GET  /api/v1/scans/geocode/?q=...` — Nominatim forward geocoder, Nigeria-bounded
- `GET  /api/v1/scans/reverse-geocode/?lat=&lng=` — reverse geocoder

## Scan UX

The `NewScan` page (`landrify_frontend/src/pages/NewScan.tsx`) offers five input
methods (address search, GPS, map pin, quick picks, manual coordinates) with a
live Mapbox satellite preview and a circular overlay sized by Nigerian land
units (half-plot, plot, acre, hectare, etc.). The selected unit is converted
into an equivalent disc radius via `r = √(area / π)` so the visible green
circle on the map honestly reflects the actual parcel size. Mobile preview is
square (`aspect-square`) and switches to 16:10 on `sm:` breakpoints.

Scan latitude/longitude accept up to 8 decimal places (≈1 mm precision) via
`FloatField` + server-side rounding — DB columns remain `Decimal(11,8)`.

## Weather & climate pipeline

Every scan also pulls and stores three weather/climate panels (no API key
required — Open-Meteo is free public data):

- `weather_current` — current conditions + 7-day forecast (`/v1/forecast`).
- `weather_historical` — 1995-2024 ERA5 daily reanalysis aggregated into
  first-decade vs last-decade temperature / rainfall comparisons
  (`/v1/archive`).
- `weather_projection` — CMIP6 7-model ensemble at 2030 and 2050 horizons
  via the `/v1/climate` endpoint (which caps end dates at 2050). One
  combined call avoids per-second rate limits.
- `weather_summary` — generated plain-English paragraph injected into the
  Groq AI report prompt and the `Weather & Climate` UI panel on
  `ScanResult`.

## Seed data

`python manage.py seed_data` seeds **185 flood-risk zones**, **85 dams** and
**49 acquisition zones**, sourced from NIHSA AFO 2024 (33 high-risk states +
FCT), NEMA situation reports, the Federal Ministry of Water Resources
National Dam Database (12 RBDAs), NEWMAP project sites and state
gazettes. Loaded from three modules: `seed_data.py`, `_seed_extra.py`
and `_seed_massive.py`.

## Vercel deploy

`landrify_frontend/vercel.json` provides SPA rewrites that route all
non-asset paths to `/index.html`, fixing 404s on direct route loads
(`/scan/result/<id>`, `/dashboard`, etc.). The frontend talks to the
backend via `VITE_API_BASE_URL`, configured in Vercel project settings.

## Setup Commands

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed sample Nigerian land risk data
python manage.py seed_data

# Install frontend dependencies
cd landrify_frontend && npm install
```
