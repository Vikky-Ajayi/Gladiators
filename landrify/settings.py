import os
from pathlib import Path
from decouple import config, Csv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-change-this-in-production-now')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*', cast=Csv())

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
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True
    )
}
# This ensures Django uses the correct PostgreSQL engine
DATABASES['default']['ENGINE'] = 'django.db.backends.postgresql'

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
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')
API_BASE_URL  = config('API_BASE_URL', default='http://127.0.0.1:8000')

# CORS — allow all in debug, use env var in production
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173',
    cast=Csv()
)
CORS_ALLOW_CREDENTIALS = True

# DRF Spectacular (API Docs)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Landrify API',
    'DESCRIPTION': 'Land verification platform for Nigeria. Verify land ownership, flood risk, erosion risk, and environmental hazards before you buy.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'CONTACT': {'email': 'api@landrify.ng'},
}

# External APIs
# Mapbox — satellite imagery (FREE, no card: account.mapbox.com/auth/signup)
MAPBOX_TOKEN = config('MAPBOX_TOKEN', default='')

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

# Pricing (in Naira)
# Basic plan: 1 free scan ever — basic risk report, no AI projections
# Pro plan:   ₦5,000/month — unlimited scans + full Groq AI time-projection report
PRO_PRICE_NAIRA = 5000

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
