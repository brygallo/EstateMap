import os
from pathlib import Path
from datetime import timedelta
from corsheaders.defaults import default_headers
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

INSECURE_DEVELOPMENT_SECRET = 'change-me-development-only-not-for-production-2026'
SECRET_KEY = os.getenv('SECRET_KEY', os.getenv('DJANGO_SECRET_KEY', INSECURE_DEVELOPMENT_SECRET))
DEBUG = os.getenv('DEBUG', 'True') == 'True'

if not DEBUG and (SECRET_KEY == INSECURE_DEVELOPMENT_SECRET or len(SECRET_KEY) < 50):
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY/SECRET_KEY must be a random value of at least 50 characters in production.'
    )

# Parse ALLOWED_HOSTS from comma-separated string.
# Treat unset/empty as wildcard to avoid DisallowedHost in default deployments.
allowed_hosts_str = os.getenv('ALLOWED_HOSTS') or '*'
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')] if allowed_hosts_str != '*' else ['*']
if not DEBUG and ALLOWED_HOSTS == ['*']:
    raise ImproperlyConfigured('ALLOWED_HOSTS must be an explicit allowlist in production.')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'storages',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'real_estate',
    'ingesta',
    'blog',
    'advertising',
]

SITE_ID = 1

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'estate_map.crawlers.NoIndexMiddleware',
    # Outermost of the app's own middleware, so it sees the final response of
    # every view: what did not declare itself publicly cacheable leaves marked
    # private. Required before a CDN can sit in front of the API.
    'real_estate.middleware_cache.PrivateByDefaultCacheMiddleware',
    'estate_map.upload_errors.UploadErrorMiddleware',
    'estate_map.observability.ObservabilityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

RELEASE_SHA = os.getenv('RELEASE_SHA', 'development')
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'plain': {'format': '%(asctime)s %(levelname)s %(name)s %(message)s'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'plain'}},
    'loggers': {
        'observability': {'handlers': ['console'], 'level': os.getenv('OBSERVABILITY_LOG_LEVEL', 'INFO'), 'propagate': False},
        'django.request': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}

ROOT_URLCONF = 'estate_map.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'estate_map.wsgi.application'

# Database configuration
# Support both DATABASE_URL (production) and individual vars (development)
database_url = os.getenv('DATABASE_URL')
if database_url:
    # Production: use DATABASE_URL
    try:
        import dj_database_url
        DATABASES = {
            'default': dj_database_url.parse(database_url)
        }
    except ImportError:
        # Fallback if dj_database_url not installed
        # Parse manually
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': parsed.path[1:],
                'USER': parsed.username,
                'PASSWORD': parsed.password,
                'HOST': parsed.hostname,
                'PORT': parsed.port or '5432',
            }
        }
else:
    # Development: use individual variables
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'estatedb'),
            'USER': os.getenv('DB_USER', 'estateuser'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'estatepass'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }

# Keep the connection between requests instead of opening one per view.
#
# Django's default is to connect and disconnect on every request. Postgres runs
# natively on the same host, so a handshake is cheap — but at fifteen requests a
# second it is fifteen handshakes a second bought for nothing. Sixty seconds is
# short enough that a restarted database does not leave workers holding dead
# handles for long, and the health check catches the ones that die inside the
# window rather than failing the request that inherits them.
#
# The ceiling this implies is bounded: three gunicorn workers of four threads
# plus the Celery worker, so at most thirteen connections held at once.
for _alias in DATABASES:
    DATABASES[_alias].setdefault('CONN_MAX_AGE', int(os.getenv('DB_CONN_MAX_AGE', '60')))
    DATABASES[_alias].setdefault('CONN_HEALTH_CHECKS', True)

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Every validation message DRF and Django generate reaches an Ecuadorian owner
# publishing a listing, so they have to be in Spanish. Both ship the catalogue;
# leaving this at 'en-us' surfaced strings like "Ensure this field has no more
# than 150 characters." in the publication form's error toast.
LANGUAGE_CODE = 'es'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = "real_estate.User"

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # Exactly one trusted proxy (the host nginx) sits in front of the app, and
    # it appends the client address it observed to X-Forwarded-For. Without
    # this, DRF keys anonymous throttles on the whole header — which the client
    # controls, so rotating a fake entry per request would defeat every rate
    # limit above. Internal SSR traffic carries no XFF header and keeps being
    # identified by REMOTE_ADDR.
    'NUM_PROXIES': 1,
    # Django answers a body that breaks DATA_UPLOAD_MAX_NUMBER_FILES or
    # DATA_UPLOAD_MAX_MEMORY_SIZE with an HTML 400, which no API client can
    # read. This handler restores the {"campo": ["mensaje"]} contract for those
    # two cases and delegates everything else to DRF untouched.
    'EXCEPTION_HANDLER': 'real_estate.exception_handlers.api_exception_handler',
    # NO se define DEFAULT_PAGINATION_CLASS: los endpoints públicos devuelven
    # arrays planos y la paginación se aplica por viewset admin (AdminPagination).
    # Rate limiting for public POST endpoints is applied explicitly with
    # ScopedRateThrottle. Other endpoints are unaffected unless they opt into a scope.
    'DEFAULT_THROTTLE_RATES': {
        'activity_create': '30/min',
        'pending_create': '10/min',
        'lead_create': '10/min',
        # Resume links are unauthenticated by design, so the token itself is the
        # only thing standing between the endpoint and a guessing loop. Reading
        # is cheap and a person retries; redeeming creates a listing.
        'resume_read': '20/min',
        'resume_redeem': '5/hour',
        # Anti-scraper ceilings for the hottest public reads. They sit far above
        # real browsing (panning the map fires a handful of requests per minute,
        # not two per second) and far above what a polite crawler does, so only
        # bulk scrapers hitting the catalogue in a loop ever reach them. These
        # limit REQUESTS, not indexing: Googlebot and friends stay well under.
        'map_points': '120/min',
        'property_list': '60/min',
        'property_write': '30/hour',
    },
}

# Extra client IPs that are never throttled (private and loopback addresses are
# already exempt, which covers the Next.js server rendering our own pages).
THROTTLE_EXEMPT_IPS = tuple(
    ip.strip() for ip in os.getenv('THROTTLE_EXEMPT_IPS', '').split(',') if ip.strip()
)

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # Token de acceso: 1 hora
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # Token de refresh: 30 días
    'ROTATE_REFRESH_TOKENS': True,  # Rota el refresh token cada vez que se usa
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS: si se define CORS_ALLOWED_ORIGINS (lista separada por comas) se usa esa
# allowlist explícita; si no, se mantiene el comportamiento previo (abierto) para
# no romper despliegues existentes. Recomendado en producción:
#   CORS_ALLOWED_ORIGINS=https://geopropiedadesecuador.com,https://www.geopropiedadesecuador.com
_cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', '').strip()
if _cors_origins:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = DEBUG
    if not DEBUG:
        raise ImproperlyConfigured('CORS_ALLOWED_ORIGINS is required in production.')

# Allow the frontend to show a support reference without exposing request or
# authentication headers. These values contain no user data.
CORS_EXPOSE_HEADERS = ['X-Request-ID', 'X-Response-Time-Ms', 'X-Release']

# The publishing form sends `Idempotency-Key` on create, and the frontend is a
# different origin from the API. Anything outside this allowlist makes the
# browser reject the preflight and drop the request before it is sent: no
# server log, and the form can only report a generic network failure. The
# header is not in django-cors-headers' defaults, so it has to be added here.
CORS_ALLOW_HEADERS = (*default_headers, 'idempotency-key')

# Endurecimiento de seguridad activo solo fuera de DEBUG (producción). No se
# habilita SECURE_SSL_REDIRECT para evitar bucles detrás de proxys/healthchecks;
# la terminación TLS/redirección la hace el proxy. SECURE_PROXY_SSL_HEADER deja
# que Django reconozca el esquema reenviado por nginx.
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 63072000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True') == 'True'
    X_FRAME_OPTIONS = 'DENY'
    # CSRF necesita los orígenes de confianza para el panel de admin sobre HTTPS.
    _csrf_trusted = os.getenv('CSRF_TRUSTED_ORIGINS', '').strip()
    if _csrf_trusted:
        CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_trusted.split(',') if o.strip()]
    else:
        raise ImproperlyConfigured('CSRF_TRUSTED_ORIGINS is required in production.')

# ============================
# DJANGO-ALLAUTH CONFIGURATION
# ============================

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

ACCOUNT_EMAIL_VERIFICATION = 'optional'
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_UNIQUE_EMAIL = True

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': os.getenv('GOOGLE_CLIENT_ID', ''),
            'secret': os.getenv('GOOGLE_CLIENT_SECRET', ''),
            'key': ''
        }
    }
}

SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_QUERY_EMAIL = True

# Configuración adicional para Google OAuth
SOCIALACCOUNT_ADAPTER = 'real_estate.adapters.CustomSocialAccountAdapter'

# ============================
# MINIO STORAGE CONFIGURATION
# ============================

# ============================
# MINIO STORAGE CONFIGURATION
# ============================

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio.geopropiedadesecuador.com")
MINIO_PUBLIC_ENDPOINT = os.getenv("MINIO_PUBLIC_ENDPOINT", MINIO_ENDPOINT)
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "True") == "True"

AWS_ACCESS_KEY_ID = os.getenv("MINIO_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("MINIO_SECRET_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "estatemap")

# Endpoint interno para boto3 (backend)
AWS_S3_ENDPOINT_URL = (
    f"https://{MINIO_ENDPOINT}"
    if MINIO_USE_SSL
    else f"http://{MINIO_ENDPOINT}"
)

AWS_S3_REGION_NAME = "us-east-1"
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "path"

AWS_S3_USE_SSL = MINIO_USE_SSL
AWS_QUERYSTRING_AUTH = False
AWS_DEFAULT_ACL = None
# No sobrescribir archivos con el mismo nombre: si dos imágenes se llaman igual
# (p. ej. '0.webp'), django-storages genera un nombre único en vez de pisar la
# anterior. Sin esto, todas las imágenes importadas colisionaban en 5 archivos.
AWS_S3_FILE_OVERWRITE = False


AWS_S3_CUSTOM_DOMAIN = f"{MINIO_PUBLIC_ENDPOINT}/{AWS_STORAGE_BUCKET_NAME}"
# Esquema de las URLs públicas de las imágenes. Sin esto, django-storages usa
# 'https:' por defecto aunque MinIO esté en HTTP -> las imágenes no cargan.
AWS_S3_URL_PROTOCOL = "https:" if MINIO_USE_SSL else "http:"

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}


# ========================================
# FILE UPLOAD SETTINGS
# ========================================
# Límite del cuerpo no-archivo. Los archivos se validan individualmente en el
# serializador; este margen evita rechazar multipart válidos antes de llegar a él.
DATA_UPLOAD_MAX_MEMORY_SIZE = 60 * 1024 * 1024
# Umbral para pasar archivos de memoria a disco temporal (no es un límite total).
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FILES = 10

# Formatos de imagen permitidos
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

# Configuración de optimización de imágenes
IMAGE_OPTIMIZATION = {
    'MAX_WIDTH': 1920,
    'MAX_HEIGHT': 1920,
    'QUALITY': 88,
    'FORMAT': 'WEBP',
    'THUMBNAIL_SIZE': (640, 640),
    'THUMBNAIL_QUALITY': 82,
    'PRESERVE_MAX_BYTES': 512 * 1024,
    'MINIMUM_SAVINGS_RATIO': 0.12,
}

# User-specific limits can be introduced here when subscription plans are implemented.
MAX_IMAGES_PER_PROPERTY = 10
MAX_IMAGE_SIZE_MB = 10
MAX_PROPERTY_UPLOAD_MB = 50
# Ceiling for the listing description. Chosen from the catalogue: the longest
# description on record is ~6.400 characters (an imported listing) and the
# longest a person has written is under 900, so this bounds abuse without
# making any existing listing impossible to edit.
MAX_DESCRIPTION_LENGTH = 8000

# ========================================
# CELERY / SHARED AENTS BROKER
# ========================================
# One Redis serves every Aents system on the host; each project owns a database
# index so a FLUSHDB in one never wipes another's queue. Registry:
#
#   0      geoPropiedades  (Celery broker)      <- this project
#   1      geoPropiedades  (Django cache)        <- this project
#   2 / 3  aents           (broker / results)
#   4+     free for the next system
#
# DB 1 was originally reserved for a Celery result backend, but that was never
# enabled (see CELERY_RESULT_BACKEND below), so it is repurposed here for the
# Django cache instead of leaving it idle.
#
# Workers are not shared. A worker imports its own project's tasks, so each
# system runs its own worker against its own index.
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")

# No result backend on purpose. Nothing reads the return value of an image
# optimization, so storing one would write a Redis key per task that is never
# looked at — and it would burn a second database index per system.
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or None
CELERY_TASK_IGNORE_RESULT = True

# Ack after the task finishes, not when it is delivered: if a worker is killed
# mid-optimization the image is re-queued instead of silently lost.
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_REJECT_ON_WORKER_LOST = True
# Fail fast when publishing. By default kombu retries a failed publish for
# ~20 seconds, which would turn a broker outage into hung uploads; the caller
# falls back to optimizing inline instead, so it needs the error quickly.
CELERY_TASK_PUBLISH_RETRY = False
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "socket_connect_timeout": 2,
    "socket_timeout": 2,
}
# This queue is deliberately secondary: one task at a time, taking as long as it
# takes, so it can never compete with web traffic on a host shared with the
# other Aents systems and the mail stack.
CELERY_WORKER_CONCURRENCY = 1
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
# Recycle a child that grows past 300 MB. Pillow holds a decoded bitmap per
# image (~256 MB for a 64 MP source), and this returns that memory to the host
# instead of letting it accumulate across tasks.
CELERY_WORKER_MAX_MEMORY_PER_CHILD = 300_000  # KB
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE
# Generous, because latency does not matter here. The limit exists only so a
# corrupt file cannot pin the single worker process forever and stall the queue.
CELERY_TASK_SOFT_TIME_LIMIT = 600
CELERY_TASK_TIME_LIMIT = 900

# Hourly safety net: re-queue images whose message was lost and delete temp
# files nobody claims. Embedded beat (-B) is fine because there is exactly one
# worker per system; with several, each would fire its own copy.
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Weekly is the right cadence for an editorial review list: the figures
    # inside an article move with the market, not with the hour.
    "flag-stale-blog-figures": {
        "task": "blog.tasks.flag_stale_figures",
        "schedule": 60 * 60 * 24 * 7,
    },
    "system-worker-heartbeat": {
        "task": "real_estate.tasks.system_worker_heartbeat",
        "schedule": 60,
    },
    "sweep-pending-images": {
        "task": "real_estate.tasks.sweep_pending_images",
        "schedule": 60 * 60,
    },
    # Anonymous draft photos have no owner to clean them up; without this they
    # accumulate in the object store forever. Daily is enough — the cutoff is
    # measured in days.
    "sweep-stale-draft-images": {
        "task": "real_estate.tasks.sweep_stale_draft_images",
        "schedule": 60 * 60 * 24,
    },
    # Editorial calendar: hourly is enough because posts are scheduled by the
    # hour. A post is public from its date regardless (see blog/models.py); this
    # only fires the IndexNow ping and the Next.js revalidation.
    "publish-scheduled-posts": {
        "task": "blog.tasks.publish_scheduled_posts",
        "schedule": 60 * 60,
    },
    # Once a day, and only once: the row is keyed by the day, so a second run
    # overwrites rather than duplicates. Nightly because the reading has to be
    # taken at a comparable hour to be worth comparing, and because it walks the
    # whole active catalogue.
    "capture-market-snapshot": {
        "task": "real_estate.tasks.capture_market_snapshot",
        "schedule": crontab(hour=4, minute=30),
    },
}

# ========================================
# CACHE (shared Redis, DB 1 - see registry above)
# ========================================
# Same physical Redis as the Celery broker, but a different DB index so a
# cache flush can never touch queued tasks (or vice versa). IGNORE_EXCEPTIONS
# is on purpose: if Redis is unreachable the site must keep serving requests
# with cache misses instead of raising 500s. Once this becomes the default
# cache, DRF throttling (DEFAULT_THROTTLE_RATES above) automatically becomes
# shared across processes instead of per-process LocMemCache.
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("REDIS_CACHE_URL", "redis://127.0.0.1:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": True,
            "SOCKET_CONNECT_TIMEOUT": 2,
            "SOCKET_TIMEOUT": 2,
        },
        "KEY_PREFIX": "estatemap",
        "TIMEOUT": 300,
    }
}
# Log ignored Redis errors (from IGNORE_EXCEPTIONS above) instead of failing
# silently, so a down cache is still visible in the logs.
DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True

# Uploads land here first so the request only pays a local disk write, and the
# worker picks them up afterwards. It must be a real path shared between the web
# process and the worker (a Docker volume when they are separate containers).
IMAGE_UPLOAD_TEMP_DIR = os.getenv(
    "IMAGE_UPLOAD_TEMP_DIR",
    str(BASE_DIR / "tmp" / "pending-images"),
)
# Safety net for temp files whose task never ran (worker down during the upload).
IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS = int(os.getenv("IMAGE_UPLOAD_TEMP_MAX_AGE_HOURS", "48"))


# ========================================
# ========================================
# EMAIL CONFIGURATION
# ========================================


EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp-relay.brevo.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'notificaciones@geopropiedadesecuador.com')

# Email verification settings
EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES = 30
PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 24

# A resume link is a bearer credential that travels through WhatsApp and gets
# forwarded without control. Two weeks covers the pace of a real commercial
# conversation and bounds how long a forwarded message keeps working.
PUBLICATION_RESUME_TOKEN_EXPIRY_DAYS = 14

# Frontend URL for email links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3010')

# On-demand revalidation of the Next.js cache. The backend POSTs the tags of
# whatever it just changed to this route handler; leaving either value empty
# turns the call into a no-op, which is what dev and CI want.
NEXT_REVALIDATE_URL = os.getenv('NEXT_REVALIDATE_URL', '')
REVALIDATE_SECRET = os.getenv('REVALIDATE_SECRET', '')
