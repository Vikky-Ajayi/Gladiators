from pathlib import Path
from urllib.parse import urlparse
from decouple import Csv, config

try:
    import dj_database_url
except ImportError:  # pragma: no cover - optional local fallback
    dj_database_url = None

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATABASE_URL = f"sqlite:///{(BASE_DIR / 'db.sqlite3').as_posix()}"
DEFAULT_FRONTEND_URL = 'http://localhost:5173'
DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000'
DEFAULT_CORS_ALLOWED_ORIGINS = (
    'http://localhost:3000,http://localhost:5000,http://localhost:5173,'
    'http://127.0.0.1:3000,http://127.0.0.1:5000,http://127.0.0.1:5173'
)

SECRET_KEY = config('DJANGO_SECRET_KEY', default='landrify-local-dev-secret-key-change-before-production-2026')
DEBUG = config('DEBUG', default=False, cast=bool)
APP_VERSION = config('APP_VERSION', default='1.0.0')


def _normalize_allowed_host(raw_host: str) -> str:
    host = (raw_host or '').strip()
    if not host:
        return ''
    if host == '*':
        return '*'
    if '://' in host:
        host = urlparse(host).netloc or urlparse(host).path
    host = host.strip('/').split('/')[0]
    return host


def _build_database_config(database_url: str) -> dict:
    """Parse DATABASE_URL with dj-database-url when available, or via a small fallback."""
    if dj_database_url is not None:
        return dj_database_url.config(
            default=database_url,
            conn_max_age=600,
            ssl_require=False,
        )

    parsed = urlparse(database_url)
    if parsed.scheme == 'sqlite':
        sqlite_path = parsed.path.lstrip('/') or str(BASE_DIR / 'db.sqlite3')
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': sqlite_path,
        }

    if parsed.scheme in {'postgres', 'postgresql'}:
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': parsed.username or '',
            'PASSWORD': parsed.password or '',
            'HOST': parsed.hostname or '',
            'PORT': str(parsed.port or ''),
            'CONN_MAX_AGE': 600,
        }

    raise ValueError(f'Unsupported DATABASE_URL scheme: {parsed.scheme}')


_raw_allowed_hosts = config('ALLOWED_HOSTS', default='*', cast=Csv())
ALLOWED_HOSTS = [h for h in (_normalize_allowed_host(item) for item in _raw_allowed_hosts) if h]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'knox',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # Local apps
    'apps.users',
    'apps.scans',
    'apps.payments',
    'apps.alerts',
    'apps.core',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'landrify.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'landrify.wsgi.application'

# Database — plain PostgreSQL (no PostGIS for hackathon speed)
DATABASES = {
    'default': _build_database_config(config('DATABASE_URL', default=DEFAULT_DATABASE_URL))
}

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Lagos'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = []
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'knox.auth.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/hour',
        'user': '200/hour',
        'geocode': '120/min',
    }
}

# Knox Token Settings
from datetime import timedelta
REST_KNOX = {
    'TOKEN_TTL': timedelta(days=7),
    'AUTO_REFRESH': True,
}

# ── URLs — 100% driven by environment variables, zero hardcoding ───────────────
# FRONTEND_URL  → your React app (local: http://localhost:5173, prod: https://app.vercel.app)
# API_BASE_URL  → this Django server (local: http://127.0.0.1:8000, prod: https://api.railway.app)
FRONTEND_URL = config('FRONTEND_URL', default=DEFAULT_FRONTEND_URL)
API_BASE_URL = config('API_BASE_URL', default=DEFAULT_API_BASE_URL)

# Interswitch environment toggle: 'sandbox' or 'production'
INTERSWITCH_ENV = config('INTERSWITCH_ENV', default='sandbox')

# Mock mode — when no real credentials are configured we simulate the
# Interswitch hosted checkout + NIN verification so the app is fully
# usable in demos and development. Auto-on if creds are missing.
MOCK_INTERSWITCH_PAYMENTS = config('MOCK_INTERSWITCH_PAYMENTS', default='', cast=str).lower() in ('1', 'true', 'yes')
MOCK_INTERSWITCH_IDENTITY = config('MOCK_INTERSWITCH_IDENTITY', default='', cast=str).lower() in ('1', 'true', 'yes')

# CORS — explicit origins from env, plus sensible defaults for local dev
# AND any Vercel / Replit deployment automatically (via regex).
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = [origin for origin in DEFAULT_CORS_ALLOWED_ORIGINS.split(',') if origin]
else:
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173').split(',')
        if origin.strip()
    ]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

# DRF Spectacular (API Docs)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Landrify API',
    'DESCRIPTION': 'Land verification platform for Nigeria. Verify land ownership, flood risk, erosion risk, and environmental hazards before you buy.',
    'VERSION': APP_VERSION,
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {'email': 'api@landrify.ng'},
}

SILENCED_SYSTEM_CHECKS = ['drf_spectacular.W001', 'drf_spectacular.W002']

# External APIs
# Mapbox — satellite imagery (FREE, no card: account.mapbox.com/auth/signup)
MAPBOX_TOKEN = config('MAPBOX_TOKEN', default='')

# Google Identity Services (Sign-In) — get a Web Client ID from
# https://console.cloud.google.com/apis/credentials and add the frontend
# origin (e.g. http://localhost:5000) to the Authorized JavaScript origins.
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')

# ── Test / Development flags ───────────────────────────────────────────────────
# TEST_MODE=True → bypass Pro gate, unlimited scans, full AI report
# MUST be False in production
TEST_MODE = config('TEST_MODE', default=False, cast=bool)

# ── Groq AI (core product — free at console.groq.com) ─────────────────────────
GROQ_API_KEY = config('GROQ_API_KEY', default='')

# Interswitch (official payment partner — Enyata Buildathon x Interswitch Dev Community)
# Get credentials from: https://developer.interswitchgroup.com
# ── Interswitch Webpay (Payments) ────────────────────────────────────────────
# Register at: quickteller.com/business → get Merchant Code + Pay Item ID
# Then go to developer.interswitchgroup.com → get Client ID + Secret for Webpay
INTERSWITCH_CLIENT_ID     = config('INTERSWITCH_CLIENT_ID', default='')
INTERSWITCH_CLIENT_SECRET = config('INTERSWITCH_CLIENT_SECRET', default='')
INTERSWITCH_MERCHANT_CODE = config('INTERSWITCH_MERCHANT_CODE', default='')
INTERSWITCH_PAY_ITEM_ID   = config('INTERSWITCH_PAY_ITEM_ID', default='')
INTERSWITCH_REDIRECT_URL  = config('INTERSWITCH_REDIRECT_URL', default=f'{FRONTEND_URL}/payment/callback')

# ── Interswitch API Marketplace (NIN Identity Verification) ──────────────────
# Separate credentials from payments — register at: developer.interswitchgroup.com
# Create a NEW PROJECT → select "NIN Verification" API → copy these credentials
INTERSWITCH_IDENTITY_CLIENT_ID     = config('INTERSWITCH_IDENTITY_CLIENT_ID', default='')
INTERSWITCH_IDENTITY_CLIENT_SECRET = config('INTERSWITCH_IDENTITY_CLIENT_SECRET', default='')

# Auto-enable mock mode if real credentials aren't configured. When real
# credentials are added later, set INTERSWITCH_ENV=production (or leave as
# sandbox) and the same code paths will hit the live API.
INTERSWITCH_PAYMENTS_MOCK_ACTIVE = MOCK_INTERSWITCH_PAYMENTS or not (
    INTERSWITCH_CLIENT_ID and INTERSWITCH_CLIENT_SECRET
    and INTERSWITCH_MERCHANT_CODE and INTERSWITCH_PAY_ITEM_ID
)
INTERSWITCH_IDENTITY_MOCK_ACTIVE = MOCK_INTERSWITCH_IDENTITY or not (
    INTERSWITCH_IDENTITY_CLIENT_ID and INTERSWITCH_IDENTITY_CLIENT_SECRET
)

# Pricing (in Naira)
# Basic plan: 1 free scan ever — basic risk report, no AI projections
# Pro plan:   ₦5,000/month — unlimited scans + full Groq AI time-projection report
PRO_PRICE_NAIRA = config('PRO_PRICE_NAIRA', default=5000, cast=int)

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
    CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
    SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)
    SECURE_REFERRER_POLICY = config('SECURE_REFERRER_POLICY', default='same-origin')
