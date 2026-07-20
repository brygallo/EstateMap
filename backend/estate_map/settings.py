import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', os.getenv('DJANGO_SECRET_KEY', 'change-me'))
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Parse ALLOWED_HOSTS from comma-separated string.
# Treat unset/empty as wildcard to avoid DisallowedHost in default deployments.
allowed_hosts_str = os.getenv('ALLOWED_HOSTS') or '*'
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',')] if allowed_hosts_str != '*' else ['*']

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
]

SITE_ID = 1

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
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

LANGUAGE_CODE = 'en-us'
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
    # NO se define DEFAULT_PAGINATION_CLASS: los endpoints públicos devuelven
    # arrays planos y la paginación se aplica por viewset admin (AdminPagination).
    # Rate limiting SOLO para los POST públicos (AllowAny). Se aplica mediante
    # ScopedRateThrottle en el create de ActivityEventViewSet y
    # PendingPublicationViewSet; el resto de endpoints no se ve afectado porque
    # solo se limitan las vistas que declaran throttle_scope.
    'DEFAULT_THROTTLE_RATES': {
        'activity_create': '30/min',
        'pending_create': '10/min',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),  # Token de acceso: 1 hora
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),  # Token de refresh: 30 días
    'ROTATE_REFRESH_TOKENS': True,  # Rota el refresh token cada vez que se usa
    'BLACKLIST_AFTER_ROTATION': False,  # No necesitamos blacklist por ahora
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
    CORS_ALLOW_ALL_ORIGINS = True

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
    X_FRAME_OPTIONS = 'SAMEORIGIN'
    # CSRF necesita los orígenes de confianza para el panel de admin sobre HTTPS.
    _csrf_trusted = os.getenv('CSRF_TRUSTED_ORIGINS', '').strip()
    if _csrf_trusted:
        CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_trusted.split(',') if o.strip()]

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
# Tamaño máximo de upload (10MB por archivo)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB

# Tamaño máximo total de request (50MB para múltiples archivos)
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024  # 50MB

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

# Frontend URL for email links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3010')
