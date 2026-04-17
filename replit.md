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
- `MAPBOX_TOKEN` - For satellite map imagery
- `INTERSWITCH_CLIENT_ID/SECRET` - Payment gateway credentials
- `TEST_MODE` - Set to `true` to bypass payment/Pro gates in development

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
