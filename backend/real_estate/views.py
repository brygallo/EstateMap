import json
import logging
import math
import unicodedata
import hashlib
from datetime import date as date_type, datetime, time, timedelta
from rest_framework import viewsets, generics, status, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q, F, Count, Sum, Avg, Min, Max, Value, FloatField, ExpressionWrapper, Prefetch
from django.db.models.functions import TruncDate
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.settings import api_settings
from pathlib import Path
from django.http import HttpResponse, Http404, FileResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.views import View
from django.conf import settings
from django.core.cache import cache
from django.core.files import File
from django.db import transaction
from django.utils import timezone
from django.utils.cache import patch_cache_control
from .bot_detection import is_bot_request
from .throttling import AntiScraperScopedThrottle
from .cache_utils import cached_or_stale, versioned_key
from .services.short_codes import normalize_code
from .models import (
    ActivityEvent, AdminAuditLog, Property, PropertyImage, Province, City, Lead,
    PendingPublication, PublicationResumeToken, SystemIncident,
)
from .services.audit import AdminAuditService
from .services.trash import PropertyTrashService, TRASH_RETENTION_DAYS
from django.contrib.auth import get_user_model
from .serializers import (
    MapPropertySerializer,
    PropertySerializer,
    PropertyImageSerializer,
    ProvinceSerializer,
    CitySerializer,
    LeadSerializer,
    LeadStatusSerializer,
    PendingPublicationSerializer,
    PendingPublicationStatusSerializer,
    PublicationDraftSerializer,
    OwnerTransferSerializer,
    ActivityEventSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    RequestPasswordResetSerializer,
    ResetPasswordSerializer,
    RequestEmailChangeSerializer,
    VerifyEmailChangeSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    AdminAuditLogSerializer,
    AdminUserSerializer,
    AdminUserDetailSerializer,
    AdminPropertySerializer,
    AdminPropertyListSerializer,
    AdminDashboardSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsAdminUser, IsPropertyOwnerOrStaff
from .services.promotion_stats import promotion_stats
from .email_utils import (
    build_resume_link,
    create_password_reset_token,
    create_publication_resume_token,
)
from .services.map_payload import MAX_CLUSTER_ZOOM, build_map_payload, canonical_cluster_zoom
from .models import sector_key as sector_key_for
from .services.sectors import absorptions as sector_absorptions
from .services.sectors import MIN_SECTOR_LISTINGS, list_sectors
from .services.rankings import (
    CRITERIA as RANKING_CRITERIA,
    DEFAULT_LIMIT as DEFAULT_RANKING_LIMIT,
    available_scopes,
    build_ranking,
)
from .services.accounts import InactiveAccountError, InvitedAccountService
from .services.authentication import GoogleAuthenticationService, GoogleIdentityError
from .services.notifications import (
    AccountClaimNotificationService,
    LeadNotificationService,
    OwnershipTransferNotificationService,
    PendingPublicationNotificationService,
)
from .services.publication_redeem import PublicationRedeemSideEffectsService
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

logger = logging.getLogger(__name__)


# ===== Public read cache =====
#
# The endpoints cached below are all `AllowAny` aggregates that never read
# `request.user`: two anonymous visitors get byte-identical payloads. Caching is
# still restricted to anonymous requests so an authenticated response can never
# be served from — or written into — a shared entry, and so `Cache-Control:
# public` never travels next to an Authorization header.
#
# Keys carry the inventory version (see `cache_utils`), so a Property save
# invalidates every entry at once instead of us deleting keys we cannot
# enumerate (bbox and filter combinations are effectively unbounded).

CACHE_TTL_CATALOG = 60 * 60 * 24
CACHE_TTL_LOCATIONS = 60 * 60
CACHE_TTL_SUMMARY = 60 * 10
CACHE_TTL_INTELLIGENCE = 60 * 10
CACHE_TTL_MAP_POINTS = 120
CACHE_TTL_MAP_CLUSTERS = 60 * 60
CACHE_TTL_MARKET_STATS = 60 * 30
CACHE_TTL_GEO = 60 * 60 * 24
CACHE_TTL_PROPERTY_LIST = 120
# Rankings only change when inventory does, and the key carries the inventory
# version, so this can sit as long as the territorial map payloads.
CACHE_TTL_RANKINGS = 60 * 30

# Browsers revalidate quickly; the shared caches (CDN / reverse proxy) are the
# ones allowed to hold a payload for as long as the server-side entry lives.
BROWSER_MAX_AGE = 60
STALE_WHILE_REVALIDATE = 60 * 60


def _is_public_read(request):
    """True when a request may be served from, and stored in, the shared cache."""
    return request.method in ('GET', 'HEAD') and not request.user.is_authenticated


def _public_response(data, request, s_maxage):
    """Wrap a cached payload, tagging it for browser and CDN reuse when public."""
    response = Response(data)
    if _is_public_read(request):
        patch_cache_control(
            response,
            public=True,
            max_age=BROWSER_MAX_AGE,
            s_maxage=s_maxage,
            stale_while_revalidate=STALE_WHILE_REVALIDATE,
        )
    return response


def _query_signature(params):
    """Order-independent representation of a querystring, for use in cache keys."""
    return '&'.join(f'{key}={value}' for key, value in sorted(params.items()))


# Query params that change what `PropertyViewSet.get_queryset` returns. Listing
# them explicitly keeps unrelated params (cache busters, analytics tags) from
# fragmenting the cache.
_FILTER_PARAMS = (
    'search', 'type', 'property_type', 'status', 'city', 'province',
    'min_price', 'minPrice', 'max_price', 'maxPrice',
    'min_area', 'minArea', 'max_area', 'maxArea',
    'rooms', 'bathrooms', 'owner', 'user',
)


def _filter_signature(params, extra=()):
    """Stable string describing the inventory filters a request applies."""
    parts = []
    for name in (*_FILTER_PARAMS, *extra):
        value = params.get(name)
        if value not in (None, ''):
            parts.append(f'{name}={value}')
    return '&'.join(parts)


class AdminPagination(PageNumberPagination):
    """Paginación compartida por los viewsets del panel admin.

    Respuesta: ``{count, next, previous, results}``. El cliente puede pedir
    ``?page_size=N``. NO se registra como paginación global por defecto para no
    romper los endpoints públicos que devuelven arrays planos.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200



def _parse_range_date(raw):
    """`YYYY-MM-DD` to a date, or None if it is absent or unparseable."""
    if not raw:
        return None
    try:
        return date_type.fromisoformat(str(raw)[:10])
    except ValueError:
        return None


def _start_of_local_day(day):
    """Midnight of `day` in the active timezone, as an aware datetime."""
    return timezone.make_aware(datetime.combine(day, time.min))

class ActivityEventPagination(AdminPagination):
    """Paginación admin con página más grande para el feed de actividad."""
    page_size = 50
    max_page_size = 500


class ProvinceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar provincias (solo lectura para usuarios)
    El CRUD completo solo está disponible en el admin de Django
    """
    queryset = Province.objects.all()
    serializer_class = ProvinceSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def list(self, request, *args, **kwargs):
        """Cached listing: the province table changes once every few years."""
        if not _is_public_read(request):
            return super().list(request, *args, **kwargs)
        key = versioned_key('provinces:list', _query_signature(request.query_params), scope='geo')
        data = cache.get(key)
        if data is None:
            # `list()` on a plain list drops the serializer reference DRF hangs
            # off ReturnList, which would otherwise be pickled into Redis.
            data = list(super().list(request, *args, **kwargs).data)
            cache.set(key, data, CACHE_TTL_GEO)
        return _public_response(data, request, s_maxage=CACHE_TTL_GEO)

    @action(detail=True, methods=['get'])
    def cities(self, request, pk=None):
        """Obtener todas las ciudades de una provincia"""
        if not _is_public_read(request):
            province = self.get_object()
            return Response(list(CitySerializer(province.cities.all(), many=True).data))
        key = versioned_key('province:cities', pk, scope='geo')
        data = cache.get(key)
        if data is None:
            province = self.get_object()
            cities = province.cities.all()
            data = list(CitySerializer(cities, many=True).data)
            cache.set(key, data, CACHE_TTL_GEO)
        return _public_response(data, request, s_maxage=CACHE_TTL_GEO)


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar ciudades (solo lectura para usuarios)
    El CRUD completo solo está disponible en el admin de Django
    """
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'province__name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        """Filtrar ciudades por provincia si se proporciona el parámetro"""
        queryset = City.objects.all()
        province_id = self.request.query_params.get('province', None)
        if province_id is not None:
            queryset = queryset.filter(province_id=province_id)
        return queryset

    def list(self, request, *args, **kwargs):
        """Cached listing: the canton table is stable, and every filter that can
        narrow it (province, search, ordering) travels in the querystring."""
        if not _is_public_read(request):
            return super().list(request, *args, **kwargs)
        key = versioned_key('cities:list', _query_signature(request.query_params), scope='geo')

        def compute():
            return list(super(CityViewSet, self).list(request, *args, **kwargs).data)

        # La tabla de cantones es pequeña y estable, pero serializarla entera
        # cuesta lo justo para que quince procesos haciéndolo a la vez tarden
        # 4,4 s en vez de 0,4. El cerrojo lo deja en uno.
        data = cached_or_stale(key, CACHE_TTL_GEO, compute)
        return _public_response(data, request, s_maxage=CACHE_TTL_GEO)

class PropertyPagination(PageNumberPagination):
    """
    Paginación para el listado de propiedades del mapa. El cliente puede pedir
    ``?page_size=N`` (por ejemplo el sitemap/SEO pide un tamaño grande para
    recuperar todo de una vez).
    """
    page_size = 300
    page_size_query_param = 'page_size'
    max_page_size = 2000


class InventoryPagination(PageNumberPagination):
    """
    Paginación del panel "Mis propiedades". Un administrador ve ahí el catálogo
    entero, que son decenas de miles de filas con sus imágenes: descargarlo de
    una vez tumbaba la página.
    """
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


def _fold(text: str) -> str:
    """Key for grouping free-text place names.

    Case and accents both vary in the same field — «CUMBAYÁ», «Cumbaya»,
    «Cumbayá» are one place — so the key drops diacritics as well as case.
    Without this the inventory of a sector splits in two and each half gets its
    own average, which is worse than not publishing the sector at all.
    """
    normalized = unicodedata.normalize('NFD', (text or '').strip())
    without_marks = ''.join(ch for ch in normalized if unicodedata.category(ch) != 'Mn')
    return ' '.join(without_marks.casefold().split())


def _display_name(spellings) -> str:
    """The spelling to show for a group of variants.

    The most frequent one wins, except that an accented variant beats an
    unaccented one whenever it is at least half as common: people drop accents
    when typing, not when naming a place, so «Cumbayá» is the name and
    «Cumbaya» is how it gets typed.
    """
    ranked = spellings.most_common()
    if not ranked:
        return ''
    top_name, top_count = ranked[0]
    for name, count in ranked:
        has_marks = any(unicodedata.category(ch) == 'Mn' for ch in unicodedata.normalize('NFD', name))
        if has_marks and count >= top_count / 2:
            return name
    return top_name


def _parse_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_bbox(value):
    """Parsea ``"oeste,sur,este,norte"`` a una tupla de floats, o None."""
    if not value:
        return None
    parts = [_parse_float(part) for part in value.split(',')]
    if len(parts) != 4 or any(part is None for part in parts):
        return None
    return tuple(parts)


def _snap_bbox(value):
    """
    Round a bbox *outward* to 3 decimals (~110 m) so that panning by a few
    pixels lands on the same cache entry instead of recomputing the payload.

    Rounding outward rather than to nearest is what makes this safe to cache:
    the snapped box always contains the requested one, so the answer is a
    superset of the viewport and nothing that belongs on screen goes missing.
    """
    parsed = _parse_bbox(value)
    if parsed is None:
        return None
    west, south, east, north = parsed
    return (
        math.floor(west * 1000) / 1000,
        math.floor(south * 1000) / 1000,
        math.ceil(east * 1000) / 1000,
        math.ceil(north * 1000) / 1000,
    )


class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = PropertyPagination

    def list(self, request, *args, **kwargs):
        """Cache anonymous listings by their complete, normalized querystring."""
        if not _is_public_read(request):
            return super().list(request, *args, **kwargs)

        cache_key = versioned_key(
            'properties:list',
            _query_signature(request.query_params),
            scope='properties',
        )

        def compute():
            response = super(PropertyViewSet, self).list(request, *args, **kwargs)
            # Pagination returns a dict; an unpaginated response is a ReturnList.
            return dict(response.data) if isinstance(response.data, dict) else list(response.data)

        # `cached_or_stale` y no un get/set: esta es la lectura más cara del
        # portal y la que piden todas las páginas prerenderizadas a la vez. Con
        # el patrón simple, un despliegue que vacía la caché hacía que quince
        # renderizadores serializaran el catálogo entero cada uno por su lado y
        # la respuesta pasara de nueve segundos a setenta y cuatro.
        data = cached_or_stale(cache_key, CACHE_TTL_PROPERTY_LIST, compute)
        return _public_response(data, request, s_maxage=CACHE_TTL_PROPERTY_LIST)

    def get_serializer_class(self):
        if self.action == 'list':
            return MapPropertySerializer
        return super().get_serializer_class()

    def get_throttles(self):
        # Only the two hottest public reads are rate limited, and only against
        # scraping: the rates are far above human browsing and above what a
        # well-behaved crawler does. Every other action stays unthrottled
        # because only views declaring throttle_scope are limited.
        if self.action == 'map_points':
            self.throttle_scope = 'map_points'
            return [AntiScraperScopedThrottle()]
        if self.action == 'list':
            self.throttle_scope = 'property_list'
            return [AntiScraperScopedThrottle()]
        if self.action in {'create', 'update', 'partial_update'}:
            self.throttle_scope = 'property_write'
            return [ScopedRateThrottle()]
        return []

    def get_queryset(self):
        """
        Propiedades activas (status != 'inactive'), con filtrado server-side por
        parámetros de query para no descargar todo el catálogo en cada carga:

        - ``search``: texto libre en título/dirección/ciudad/descripción
        - ``type`` / ``property_type``: tipo de propiedad
        - ``status``: estado (for_sale / for_rent)
        - ``city`` / ``province``: ubicación (coincidencia exacta, sin mayúsculas)
        - ``min_price`` / ``max_price``: rango de precio
        - ``min_area`` / ``max_area``: rango de área
        - ``rooms`` / ``bathrooms``: mínimo de habitaciones / baños
        - ``owner`` / ``user``: ID del propietario
        - ``bbox``: "oeste,sur,este,norte" (lng,lat,lng,lat) del mapa visible

        Las propiedades inactivas solo se ven en /my_properties/.
        Los duplicados de otras fuentes (is_duplicate=True) se ocultan del mapa:
        solo se muestra la versión canónica (la que ganó la preferencia, p. ej.
        la que tiene WhatsApp).
        """
        user = self.request.user
        # Actions that address one listing by its id. They resolve it from the
        # row itself instead of from the public catalogue query, so who may see
        # what is decided once, here, rather than by whichever filters happened
        # to be in the querystring.
        if self.action in (
            'retrieve', 'update', 'partial_update', 'destroy', 'delete_image',
        ):
            # Staff moderate from the inventory panel, which lists the inactive
            # and duplicated rows the public queryset hides. Without this, the
            # listing they just clicked would 404 when opened or edited.
            if user.is_authenticated and user.is_staff:
                return Property.objects.all()

            # A single listing is resolved by its id, never by the search
            # filters in the querystring: whoever opens one has that listing in
            # mind, and a stray parameter turning it into a 404 is impossible to
            # diagnose from the other end. Same argument as `by_code`.
            visible = Q(is_duplicate=False) & ~Q(status='inactive')
            # A closed listing keeps an individually resolvable ficha even
            # though it left the catalogue — any closure, withdrawn included.
            # For a sale the reason is SOC-002: the "vendido" image exists to be
            # forwarded and promises its printed code and QR resolve, so a 404
            # would make the portal look like it invented the listing.
            # A withdrawal has no image, and is kept for the other half of the
            # same argument: someone opening an old link is better served by
            # "this is no longer available" than by a bare 404, and so is the
            # crawler reading it. What decides it is the closure, not its kind.
            visible |= Q(is_duplicate=False) & ~Q(closed_reason='')
            if user.is_authenticated:
                # An owner reaches their own listing whatever its state.
                # Otherwise marking one sold — or simply deactivating it — locks
                # them out of reopening, editing or promoting it.
                visible |= Q(owner=user)
            return Property.objects.filter(visible)

        queryset = Property.objects.exclude(status='inactive').exclude(is_duplicate=True)
        params = self.request.query_params

        search = params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(address__icontains=search)
                | Q(city__icontains=search)
                | Q(description__icontains=search)
            )

        property_type = params.get('type') or params.get('property_type')
        if property_type and property_type != 'all':
            queryset = queryset.filter(property_type=property_type)

        status_param = params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)

        city = params.get('city')
        if city and city != 'all':
            queryset = queryset.filter(city__iexact=city)

        province = params.get('province')
        if province and province != 'all':
            queryset = queryset.filter(province__iexact=province)

        min_price = _parse_float(params.get('min_price') or params.get('minPrice'))
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        max_price = _parse_float(params.get('max_price') or params.get('maxPrice'))
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        min_area = _parse_float(params.get('min_area') or params.get('minArea'))
        if min_area is not None:
            queryset = queryset.filter(area__gte=min_area)
        max_area = _parse_float(params.get('max_area') or params.get('maxArea'))
        if max_area is not None:
            queryset = queryset.filter(area__lte=max_area)

        rooms = params.get('rooms')
        if rooms and rooms != 'all' and rooms.isdigit():
            queryset = queryset.filter(rooms__gte=int(rooms))

        bathrooms = params.get('bathrooms')
        if bathrooms and bathrooms != 'all' and bathrooms.isdigit():
            queryset = queryset.filter(bathrooms__gte=int(bathrooms))

        # Zone filter: the key is already normalized on the row, so this is an
        # index lookup rather than a scan over free text (PRC-009).
        sector = (params.get('sector') or '').strip()
        if sector:
            queryset = queryset.filter(sector_key=sector_key_for(sector))

        owner = params.get('owner') or params.get('user')
        if owner and owner != 'all' and str(owner).isdigit():
            queryset = queryset.filter(owner_id=int(owner))

        # The card feed is independent from the map viewport. When it supplies
        # an origin, paginate the complete filtered catalogue from nearest to
        # farthest so scrolling can continue after the visible area runs out.
        # Ecuador sits close to the equator, so weighting longitude by
        # cos(latitude) gives a stable local-distance ordering without PostGIS.
        origin_lat = _parse_float(params.get('origin_lat'))
        origin_lng = _parse_float(params.get('origin_lng'))
        if (
            getattr(self, 'action', None) == 'list'
            and origin_lat is not None
            and origin_lng is not None
            and -90 <= origin_lat <= 90
            and -180 <= origin_lng <= 180
        ):
            longitude_weight = math.cos(math.radians(origin_lat)) ** 2
            latitude_delta = F('latitude') - Value(origin_lat)
            longitude_delta = F('longitude') - Value(origin_lng)
            queryset = queryset.annotate(
                distance_score=ExpressionWrapper(
                    latitude_delta * latitude_delta
                    + longitude_delta * longitude_delta * Value(longitude_weight),
                    output_field=FloatField(),
                )
            ).order_by(F('distance_score').asc(nulls_last=True), '-id')

        # `map_points` snaps the viewport to a coarse grid before querying so its
        # cache key describes exactly the payload that was computed.
        bbox = getattr(self, '_bbox_override', None) or params.get('bbox')
        if bbox:
            if not getattr(self, '_ignore_map_bbox', False):
                parts = [_parse_float(p) for p in bbox.split(',')]
                if len(parts) == 4 and all(p is not None for p in parts):
                    west, south, east, north = parts
                    queryset = queryset.filter(
                        Q(
                            latitude__gte=south, latitude__lte=north,
                            longitude__gte=west, longitude__lte=east,
                        )
                        # Compatibilidad con anuncios antiguos que solo tienen
                        # polígono. El frontend vuelve a filtrar por bounds y el
                        # serializer ya calcula centro para nuevos anuncios.
                        | Q(latitude__isnull=True, longitude__isnull=True, polygon__isnull=False)
                    )

        if getattr(self, 'action', None) == 'list':
            queryset = queryset.only(
                'id',
                'title',
                'property_type',
                'status',
                'city',
                'province',
                'latitude',
                'longitude',
                'polygon',
                'show_measurements',
                'area',
                'rooms',
                'bathrooms',
                'parking_spaces',
                'price',
                'is_imported',
                'source',
                'source_agency',
                'source_url',
                'external_id',
                'created_at',
            )
            include_images = params.get('include_images') not in ('0', 'false', 'False', 'no')
            if params.get('page_size') != '1' and include_images:
                queryset = queryset.prefetch_related(
                    Prefetch(
                        'images',
                        queryset=PropertyImage.objects.only(
                            'id',
                            'property_id',
                            'image',
                            'thumbnail',
                            'is_main',
                            'uploaded_at',
                            'file_size',
                            'original_filename',
                            # The serializer reads `status` on every image; leaving
                            # it deferred turns each row into one extra SELECT.
                            'status',
                        ),
                    )
                )

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create once for a client idempotency key, including upload retries."""
        idempotency_key = (request.headers.get('Idempotency-Key') or '').strip()[:128]
        if not idempotency_key:
            return super().create(request, *args, **kwargs)

        digest = hashlib.sha256(
            f"{request.user.pk}:{idempotency_key}".encode('utf-8')
        ).hexdigest()
        result_key = f"property:create:result:{digest}"
        lock_key = f"property:create:lock:{digest}"
        existing_id = cache.get(result_key)
        if existing_id:
            existing = Property.objects.filter(pk=existing_id, owner=request.user).first()
            if existing is not None:
                response = Response(self.get_serializer(existing).data, status=status.HTTP_200_OK)
                response['X-Idempotent-Replay'] = 'true'
                return response

        lock_acquired = cache.add(lock_key, '1', 60)
        if lock_acquired is False:
            return Response(
                {'detail': 'Esta publicación ya se está procesando. Espera un momento.'},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code == status.HTTP_201_CREATED and response.data.get('id'):
                cache.set(result_key, response.data['id'], 60 * 60 * 24)
            return response
        finally:
            # django-redis returns None when failures are intentionally ignored.
            # Publishing must remain available even if the cache is unavailable.
            if lock_acquired:
                cache.delete(lock_key)

    def retrieve(self, request, *args, **kwargs):
        """Devuelve el detalle e incrementa el contador de vistas de forma atómica."""
        instance = self.get_object()
        # Crawlers get the full detail, they just do not move the view counter:
        # it feeds the demand signal shown to owners, which must be human-only.
        if not is_bot_request(request):
            Property.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
            instance.views_count = (instance.views_count or 0) + 1
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def intelligence(self, request, pk=None):
        """Build commercial context against genuinely comparable inventory."""
        from django.utils import timezone

        # The comparables scan walks every active listing in the city, so this is
        # the most expensive detail endpoint on the site and the one crawlers hit
        # right after the property page itself.
        cache_key = versioned_key('intelligence', pk)
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_INTELLIGENCE)

        instance = self.get_object()
        comparable = Property.objects.exclude(status='inactive').filter(
            is_duplicate=False,
            city__iexact=instance.city,
            property_type=instance.property_type,
            status=instance.status,
            price__gt=0,
            area__gt=0,
        ).exclude(pk=instance.pk).annotate(
            price_per_m2=ExpressionWrapper(F('price') / F('area'), output_field=FloatField())
        ).filter(price_per_m2__gt=1, price_per_m2__lt=10000)

        values = sorted(float(value) for value in comparable.values_list('price_per_m2', flat=True))
        def pct(ratio):
            if not values:
                return None
            pos = (len(values) - 1) * ratio
            low, high = int(pos), min(int(pos) + 1, len(values) - 1)
            return round(values[low] + (values[high] - values[low]) * (pos - low), 2)

        q1, median, q3 = pct(.25), pct(.5), pct(.75)
        own_price_m2 = (
            round(float(instance.price) / float(instance.area), 2)
            if instance.price and instance.area and instance.area > 0 else None
        )
        deviation = round((own_price_m2 - median) / median * 100, 1) if own_price_m2 and median else None
        alert = None
        if deviation is not None and len(values) >= 4:
            if own_price_m2 < q1 - 1.5 * (q3 - q1):
                alert = 'below_range'
            elif own_price_m2 > q3 + 1.5 * (q3 - q1):
                alert = 'above_range'

        sector = (instance.address or '').split(',')[0].strip()
        sector_supply = Property.objects.exclude(status='inactive').filter(
            is_duplicate=False, city__iexact=instance.city,
        )
        if sector:
            sector_supply = sector_supply.filter(address__icontains=sector)
        city_views = list(Property.objects.exclude(status='inactive').filter(
            is_duplicate=False, city__iexact=instance.city,
        ).values_list('views_count', flat=True))
        demand_median = sorted(city_views)[len(city_views) // 2] if city_views else 0
        demand_level = 'high' if instance.views_count > demand_median * 1.5 else ('low' if instance.views_count < demand_median * .5 else 'medium')
        contacts = instance.activity_events.filter(
            event_name='property_contact_clicked', is_bot=False
        ).count()
        history = list(instance.price_history.values('price', 'recorded_at'))
        if not history and instance.price is not None:
            history = [{'price': instance.price, 'recorded_at': instance.created_at}]

        publication_start = instance.source_published_at or instance.imported_at or instance.created_at
        publication_basis = 'source' if instance.source_published_at else ('detected' if instance.is_imported else 'platform')
        demand = {'level': demand_level}
        user = request.user
        if user.is_authenticated and (user.is_staff or instance.owner_id == user.id):
            demand.update({
                'views': instance.views_count,
                'contacts': contacts,
                'city_median_views': demand_median,
            })

        payload = {
            'property_id': instance.pk,
            'price_per_m2': own_price_m2,
            'zone': sector or instance.city,
            'zone_range': {'low': q1, 'median': median, 'high': q3},
            'comparison': {'sample_size': len(values), 'difference_pct': deviation},
            'price_alert': alert,
            'price_history': history,
            'available_supply': sector_supply.count(),
            'published_days': max(0, (timezone.now() - publication_start).days),
            'publication_basis': publication_basis,
            'source_published_at': instance.source_published_at,
            'source_updated_at': instance.source_updated_at,
            'detected_at': instance.imported_at or instance.created_at,
            'last_seen_at': instance.last_seen_at,
            'demand': demand,
            'methodology': 'Comparables activos del mismo tipo, operación y ciudad; rango habitual P25–P75 y alerta atípica mediante IQR.',
        }
        if _is_public_read(request):
            cache.set(cache_key, payload, CACHE_TTL_INTELLIGENCE)
        return _public_response(payload, request, s_maxage=CACHE_TTL_INTELLIGENCE)

    @action(
        detail=True,
        methods=['get'],
        url_path='promotion-stats',
        permission_classes=[IsAuthenticated, IsPropertyOwnerOrStaff],
    )
    def promotion_stats(self, request, pk=None):
        """How many real visitors each network brought back from the kit links.

        This is the half of SOC-008 that was missing, and the reason the kit
        gets opened a second time: "your posts brought 34 real visitors" is the
        only sentence that convinces anyone to share again.

        Private on purpose, and enforced here rather than in the client. The
        promotion images are public because Facebook has to download them, but
        who arrived and from where belongs to whoever published the listing.

        The listing is fetched by primary key instead of through the public
        queryset: a sold listing is exactly the one whose owner most wants this
        report, and it no longer appears in the catalogue.
        """
        instance = get_object_or_404(Property, pk=pk)
        self.check_object_permissions(request, instance)
        return Response(promotion_stats(instance.pk))

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def rankings(self, request):
        """
        One resolved ranking of live inventory, with its sample and comparison.

        The living pages of the blog («los terrenos más baratos de Quito») are
        server-rendered from this, so it answers cold crawls too. The order is
        resolved here rather than through a generic `ordering` parameter on the
        listing: the plausibility guard, the threshold and the comparison
        average are part of the answer, and a scraper handed a sortable
        catalogue would take the catalogue.
        """
        criterion = (request.query_params.get('criterion') or '').strip()
        if criterion not in RANKING_CRITERIA:
            return Response(
                {'detail': f'criterio desconocido: {criterion or "(vacío)"}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scope_args = {
            'property_type': (request.query_params.get('type') or '').strip() or None,
            'status': (request.query_params.get('status') or '').strip() or None,
            'city': (request.query_params.get('city') or '').strip() or None,
            'province': (request.query_params.get('province') or '').strip() or None,
        }
        limit = _parse_float(request.query_params.get('limit'))

        cache_key = versioned_key(
            'rankings',
            _query_signature(request.query_params),
            scope='rankings',
        )
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_RANKINGS)

        payload = build_ranking(
            criterion,
            limit=int(limit) if limit else DEFAULT_RANKING_LIMIT,
            **scope_args,
        )
        if _is_public_read(request):
            cache.set(cache_key, payload, CACHE_TTL_RANKINGS)
        return _public_response(payload, request, s_maxage=CACHE_TTL_RANKINGS)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def sectors(self, request):
        """Named zones with enough inventory to hold a page of their own.

        The catalogue's finest geography, and the one people actually type:
        «urbanización Gardenia», «edificio Vista Linda». Optional `city` narrows
        it; `min` lowers the bar for callers that render a zone below the
        indexing threshold.
        """
        city = (request.query_params.get('city') or '').strip() or None
        minimum = _parse_float(request.query_params.get('min'))
        minimum = int(minimum) if minimum else MIN_SECTOR_LISTINGS

        cache_key = versioned_key(
            'sectors',
            _query_signature(request.query_params),
            scope='sectors',
        )
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_MARKET_STATS)

        payload = {'minimum': minimum, 'sectors': list_sectors(city=city, minimum=minimum)}
        if _is_public_read(request):
            cache.set(cache_key, payload, CACHE_TTL_MARKET_STATS)
        return _public_response(payload, request, s_maxage=CACHE_TTL_MARKET_STATS)

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[AllowAny],
        url_path='ranking-scopes',
    )
    def ranking_scopes(self, request):
        """Which places hold enough inventory for a living page to exist.

        The blog needs this to know which of its thousands of possible rankings
        are real, and the sitemap needs the same answer so it never advertises
        a page the threshold keeps empty. Asking the ranking endpoint once per
        candidate would be thousands of requests to learn that most have
        nothing.
        """
        cache_key = versioned_key('ranking_scopes', scope='rankings')
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_RANKINGS)

        payload = available_scopes()
        if _is_public_read(request):
            cache.set(cache_key, payload, CACHE_TTL_RANKINGS)
        return _public_response(payload, request, s_maxage=CACHE_TTL_RANKINGS)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def map_points(self, request):
        """
        Payload ultraliviano para el mapa, calculado por vista.

        El cliente manda ``bbox`` + ``zoom`` + filtros. A zoom bajo el backend
        devuelve agrupadores con conteo; a zoom alto devuelve puntos
        individuales. Así el frontend no descarga miles de propiedades ni
        calcula clusters.
        """
        zoom = _parse_float(request.query_params.get('zoom'))
        zoom = 7 if zoom is None else zoom
        # Country, province, and city groups use the complete filtered dataset,
        # ignoring the bbox. This keeps territorial centroids stable and avoids
        # introducing a fourth grouping layer as the camera moves closer.
        cluster_zoom = zoom <= MAX_CLUSTER_ZOOM
        self._ignore_map_bbox = cluster_zoom
        snapped = _snap_bbox(request.query_params.get('bbox'))
        self._bbox_override = ','.join(f'{coord:.3f}' for coord in snapped) if snapped else None
        payload_zoom = canonical_cluster_zoom(zoom) if cluster_zoom else zoom
        cache_bbox = 'all' if cluster_zoom else (self._bbox_override or 'all')
        cache_ttl = CACHE_TTL_MAP_CLUSTERS if cluster_zoom else CACHE_TTL_MAP_POINTS

        max_items = int(request.query_params.get('limit') or 1000)
        cache_key = versioned_key(
            'map_points',
            f'z{payload_zoom}',
            f'n{max_items}',
            cache_bbox,
            _filter_signature(request.query_params),
            scope='map',
        )
        def compute():
            queryset = self.filter_queryset(self.get_queryset()).only(
                'id',
                'property_type',
                'status',
                'latitude',
                'longitude',
                'polygon',
                'show_measurements',
                'price',
                'city',
                'province',
            )
            # Territorial clusters intentionally receive the full filtered
            # queryset; point mode was already clipped by get_queryset() using
            # the visible bbox.
            return build_map_payload(queryset, payload_zoom, max_items)

        if not _is_public_read(request):
            return _public_response(compute(), request, s_maxage=cache_ttl)

        # Con cerrojo, como el catálogo. Este es el endpoint del mapa: todo el
        # mundo que abre la portada pide el mismo recuadro con el mismo zoom, y
        # tras un despliegue lo piden todos con la caché vacía. Medido con
        # quince peticiones simultáneas en frío, calcularlo cada uno por su
        # cuenta costaba 5 s cuando calcularlo una vez cuesta 0,7.
        payload = cached_or_stale(cache_key, cache_ttl, compute)
        return _public_response(payload, request, s_maxage=cache_ttl)

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[AllowAny],
        url_path='code/(?P<code>[^/]+)',
    )
    def by_code(self, request, code=None):
        """
        Resolve the printed short code of a listing back to its id.

        This is what the QR and the human-typed code on a promotion image land
        on, so it answers to anyone: the person scanning has no session, and
        very often no account.

        It deliberately does NOT reuse get_queryset(), which layers every search
        filter in the querystring on top. Someone arriving from a printed code
        has a listing in mind, not a search, and a stray parameter turning that
        into a 404 would be impossible to diagnose from the other end. The only
        filter kept is the one that decides whether a listing is public at all.

        A closed listing still resolves, whatever the reason. For a sale that is
        SOC-002: the "vendido" image is meant to be forwarded and carries this
        very code, so answering 404 would break the one promise it makes. A
        withdrawal carries no image, and resolves for the other half of the same
        argument: an old printed code is better answered with "no longer
        available" than with a 404. A listing merely deactivated, with no
        closure recorded at all, still does not resolve.
        """
        normalized = normalize_code(code or '')
        prop = (
            Property.objects.filter(short_code=normalized)
            .exclude(status='inactive', closed_reason='')
            .values('id', 'short_code')
            .first()
        )
        if prop is None:
            raise Http404('No property matches that code')
        return _public_response(prop, request, s_maxage=CACHE_TTL_PROPERTY_LIST)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def owners(self, request):
        """
        Lista de propietarios con al menos una propiedad activa. Alimenta el
        filtro por usuario del mapa sin depender de qué propiedades estén
        cargadas en el bbox actual.
        """
        owners = (
            Property.objects.exclude(status='inactive')
            .exclude(owner__isnull=True)
            .values('owner_id', 'owner__username', 'owner__first_name', 'owner__last_name')
            .distinct()
        )
        seen = {}
        for row in owners:
            oid = row['owner_id']
            if oid in seen:
                continue
            full_name = f"{row['owner__first_name']} {row['owner__last_name']}".strip()
            seen[oid] = {
                'id': oid,
                'username': full_name if full_name else row['owner__username'],
            }
        return Response(sorted(seen.values(), key=lambda u: u['username'].lower()))

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def locations(self, request):
        """
        Provincias y ciudades distintas presentes en las propiedades activas.
        Alimenta el filtro por ubicación del mapa: los valores coinciden
        exactamente con los guardados en cada propiedad (para el filtro iexact),
        independientemente de qué esté cargado en el bbox actual.
        """
        cache_key = versioned_key('locations', scope='locations')
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_LOCATIONS)

        rows = (
            Property.objects.exclude(status='inactive')
            .values('province', 'city')
            .annotate(latitude=Avg('latitude'), longitude=Avg('longitude'))
        )
        provinces = {}
        centers = {}
        for row in rows:
            prov = (row['province'] or '').strip()
            city = (row['city'] or '').strip()
            if not prov:
                continue
            bucket = provinces.setdefault(prov, set())
            if city:
                bucket.add(city)
                latitude = row['latitude']
                longitude = row['longitude']
                if latitude is not None and longitude is not None:
                    centers.setdefault(prov, {})[city] = {
                        'latitude': float(latitude),
                        'longitude': float(longitude),
                    }
        result = [
            {
                'province': prov,
                'cities': sorted(cities),
                'centers': centers.get(prov, {}),
            }
            for prov, cities in sorted(provinces.items(), key=lambda kv: kv[0].lower())
        ]
        if _is_public_read(request):
            cache.set(cache_key, result, CACHE_TTL_LOCATIONS)
        return _public_response(result, request, s_maxage=CACHE_TTL_LOCATIONS)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def catalog(self, request):
        """
        Stable catalogue of the country's provinces and cantons, read from the
        `Province`/`City` tables and NOT from the inventory.

        `locations` derives its values from the active properties, so a city
        whose listings all expire disappears from the list. SEO landing pages
        need the opposite: knowing the canton exists even with no listings
        today, so they can answer 200 with an empty state instead of a 404 that
        drops an already ranked URL from the index.
        """
        # The `catalog` version only moves on property create/delete (see
        # signals.py), which is what lets CACHE_TTL_CATALOG actually run its
        # 24 h: routine saves and image churn no longer recycle this entry. A
        # city rename on an existing row waits for the TTL, which this payload
        # tolerates by design (it keeps historic spellings anyway).
        cache_key = versioned_key('catalog', scope='catalog')
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_CATALOG)

        provinces = {}

        # Official cantons, so a location keeps resolving even with no listings.
        rows = (
            City.objects.select_related('province')
            .values('name', 'province__name')
            .order_by('province__name', 'name')
        )
        for row in rows:
            provinces.setdefault(row['province__name'], set()).add(row['name'])

        # Plus every city name a property has ever carried, including inactive
        # and duplicate ones. The scraper stores colloquial names that do not
        # always match the official canton ("Los Bancos" vs "San Miguel de los
        # Bancos"), and those are the spellings already indexed as URLs.
        historic = Property.objects.values('province', 'city').distinct()
        for row in historic:
            prov = (row['province'] or '').strip()
            city = (row['city'] or '').strip()
            if prov and city:
                provinces.setdefault(prov, set()).add(city)

        result = [
            {'province': prov, 'cities': sorted(cities)}
            for prov, cities in sorted(provinces.items(), key=lambda kv: kv[0].lower())
        ]
        if _is_public_read(request):
            cache.set(cache_key, result, CACHE_TTL_CATALOG)
        return _public_response(result, request, s_maxage=CACHE_TTL_CATALOG)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def summary(self, request):
        """
        Aggregate counts over the whole active inventory, computed in SQL.

        Counters used to be derived from the length of a fetched page, but the
        list endpoint caps ``page_size`` at 2000, so every total froze at 2000
        once the catalogue grew past that cap. This endpoint accepts the same
        query filters as the list and always counts the full match.
        """
        cache_key = versioned_key(
            'properties:summary',
            _filter_signature(request.query_params, extra=('bbox',)),
            scope='summary',
        )
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_SUMMARY)

        # One GROUP BY feeds every breakdown. `order_by()` clears the model's
        # default ordering, which Django would otherwise add to the GROUP BY
        # and split the aggregates row by row.
        groups = [
            {
                'city': (row['city'] or '').strip(),
                'province': (row['province'] or '').strip(),
                'property_type': row['property_type'] or '',
                'status': row['status'] or '',
                'count': row['count'],
            }
            for row in self.get_queryset()
            .order_by()
            .values('city', 'province', 'property_type', 'status')
            .annotate(count=Count('id'))
        ]

        def totals_by(key):
            totals = {}
            for row in groups:
                value = row[key]
                if not value:
                    continue
                totals[value] = totals.get(value, 0) + row['count']
            return totals

        cities = {}
        for row in groups:
            if not row['city']:
                continue
            entry = cities.setdefault(
                (row['city'], row['province']),
                {'name': row['city'], 'province': row['province'], 'count': 0},
            )
            entry['count'] += row['count']

        payload = {
            'total': sum(row['count'] for row in groups),
            'by_status': totals_by('status'),
            'by_property_type': totals_by('property_type'),
            'by_city': sorted(cities.values(), key=lambda row: -row['count']),
            'by_province': [
                {'name': name, 'count': count}
                for name, count in sorted(totals_by('province').items(), key=lambda kv: -kv[1])
            ],
            # Raw cross-tab so the SEO landings can count type x operation x
            # location combinations without downloading the catalogue.
            'groups': groups,
        }
        if _is_public_read(request):
            cache.set(cache_key, payload, CACHE_TTL_SUMMARY)
        return _public_response(payload, request, s_maxage=CACHE_TTL_SUMMARY)

    # Sort modes the inventory panel offers, mapped to a deterministic ordering.
    # Prices are optional, so a NULL must not win the "highest price" sort.
    INVENTORY_ORDERING = {
        'recent': ('-created_at',),
        'views': ('-views_count',),
        'price_desc': (F('price').desc(nulls_last=True),),
        'price_asc': (F('price').asc(nulls_last=True),),
    }

    @action(detail=False, methods=['post'], url_path='dismiss-claim',
            permission_classes=[IsAuthenticated])
    def dismiss_claim(self, request):
        """«Esta no es mía»: sácala de mi lista de reclamables.

        A personal dismissal, not a statement about the listing: nothing about
        it changes for anybody else. Without it a number that appears on
        listings that were never this person's — a reassigned line, an agent
        who left — clutters the list forever and hides the ones worth taking.
        """
        from .services.claims import PropertyClaimService

        wanted = request.data.get('property_ids') or []
        if not isinstance(wanted, list):
            return Response(
                {'error': 'property_ids debe ser una lista de identificadores.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dismissed = PropertyClaimService(request.user).dismiss(wanted)
        return Response({'dismissed': dismissed})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def claimable(self, request):
        """Imported listings this account can take over, and why it should.

        Lives beside `my_properties` because it answers the same question from
        the other side: that one lists what you own, this one what is already
        yours here and you have not taken yet.
        """
        from .services.claims import PropertyClaimService

        service = PropertyClaimService(request.user)
        payload = service.summary()
        rows = service.claimable()[:100] if payload["claimable_count"] else []
        payload["results"] = PropertySerializer(
            rows, many=True, context=self.get_serializer_context()
        ).data
        return Response(payload)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def claim(self, request):
        """Take over the listings named in `property_ids`.

        Returns what was actually handed over rather than what was asked for:
        the caller's page can be seconds stale, and a listing somebody else
        claimed in between is a race, not an error.
        """
        from .services.claims import PropertyClaimService

        service = PropertyClaimService(request.user)
        if not service.may_claim():
            return Response(
                {'error': 'Necesitas un teléfono en tu cuenta para reclamar propiedades.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wanted = request.data.get('property_ids') or []
        if not isinstance(wanted, list):
            return Response(
                {'error': 'property_ids debe ser una lista de identificadores.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        claimed = service.claim(wanted)
        # A claim is a change of title deed made without staff review, so it
        # goes in the same book staff transfers do — that is what makes the
        # decision to trust an unverified number reversible instead of final.
        for prop in claimed:
            AdminAuditService().record(
                request, "property.claim",
                target_type="property", target_id=prop.pk, target_label=prop.title,
                changes={"phone": service.phone(),
                         "verified": request.user.phone_verified_at is not None},
            )
        return Response({
            'claimed': len(claimed),
            'results': PropertySerializer(
                claimed, many=True, context=self.get_serializer_context()
            ).data,
        })

    @action(
        detail=False,
        methods=['get'],
        permission_classes=[IsAuthenticated],
        pagination_class=InventoryPagination,
    )
    def my_properties(self, request):
        """
        Inventory panel of the signed-in account.

        Staff get the whole catalogue -- inactive, duplicated and imported rows
        included -- because moderation happens from this same screen. Everyone
        else gets strictly what they own, which is the only read that does not
        apply the public status filter.

        Search, status and ordering are resolved here rather than in the client:
        with the catalogue paginated, filtering the page that happens to be
        loaded would answer a different question than the one asked.
        """
        is_staff = bool(request.user.is_staff)
        queryset = Property.objects.all() if is_staff else Property.objects.filter(owner=request.user)

        status_param = request.query_params.get('status')
        if status_param in ('for_sale', 'for_rent', 'inactive'):
            queryset = queryset.filter(status=status_param)

        origin = request.query_params.get('origin')
        if origin == 'imported':
            queryset = queryset.filter(is_imported=True)
        elif origin == 'users':
            queryset = queryset.filter(is_imported=False)

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(address__icontains=search)
                | Q(city__icontains=search)
                | Q(province__icontains=search)
                | Q(source_agency__icontains=search)
            )

        # Counters describe the whole filtered inventory, not the page: read off
        # the page they would say "3 propiedades" to someone who has 9.000.
        stats = queryset.aggregate(
            total=Count('id'),
            for_sale=Count('id', filter=Q(status='for_sale')),
            for_rent=Count('id', filter=Q(status='for_rent')),
            inactive=Count('id', filter=Q(status='inactive')),
            views=Sum('views_count'),
        )
        stats['views'] = stats['views'] or 0
        stats['active'] = stats['total'] - stats['inactive']

        ordering = self.INVENTORY_ORDERING.get(
            request.query_params.get('ordering'), self.INVENTORY_ORDERING['recent']
        )
        queryset = (
            queryset.select_related('owner')
            # `price_history` feeds previous_price on the serializer, which the
            # kit needs to offer a "price drop" image. Without the prefetch that
            # is one extra query per row of the page.
            .prefetch_related('images', 'price_history')
            .order_by(*ordering, '-id')
        )

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        response = self.get_paginated_response(serializer.data)
        response.data['stats'] = stats
        response.data['scope'] = 'catalog' if is_staff else 'own'
        return response

    @action(
        detail=True,
        methods=['delete'],
        permission_classes=[IsAuthenticated, IsOwnerOrReadOnly],
    )
    def delete_image(self, request, pk=None):
        """Delete a specific image from a property"""
        # get_object() runs the object permission check, so a non-owner gets a
        # 403 here before any input validation can turn it into a 400.
        property_instance = self.get_object()
        image_id = request.data.get('image_id')

        if not image_id:
            return Response(
                {'error': 'image_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            image = PropertyImage.objects.get(
                id=image_id,
                property=property_instance
            )
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PropertyImage.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class LeadViewSet(viewsets.ModelViewSet):
    """
    Leads/contactos por propiedad.

    - ``create``: público (formulario de contacto en el modal / página).
    - ``list`` / ``retrieve`` / ``update`` / ``destroy``: autenticado; cada
      usuario ve y gestiona solo los leads de sus propias propiedades (los
      admins ven todos).
    """
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_throttles(self):
        if self.action == 'create':
            self.throttle_scope = 'lead_create'
            return [ScopedRateThrottle()]
        return []

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return LeadStatusSerializer
        return LeadSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Lead.objects.none()
        qs = Lead.objects.select_related('property', 'property__owner')
        if user.is_staff:
            return qs
        return qs.filter(property__owner=user)

    def perform_create(self, serializer):
        lead = serializer.save()
        LeadNotificationService().notify_created(lead)


class PendingPublicationViewSet(viewsets.ModelViewSet):
    """
    Solicitudes de publicación capturadas antes de completar cuenta/verificación.
    La creación es pública; la bandeja completa queda para administradores.
    """
    queryset = PendingPublication.objects.all()
    serializer_class = PendingPublicationSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    pagination_class = AdminPagination

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_throttles(self):
        # Solo el POST público (create) se limita por tasa; el resto es admin.
        if self.action == 'create':
            self.throttle_scope = 'pending_create'
            return [ScopedRateThrottle()]
        return []

    def get_queryset(self):
        user = self.request.user
        if not (user and user.is_authenticated and user.is_staff):
            return PendingPublication.objects.none()
        queryset = (
            PendingPublication.objects
            .prefetch_related('resume_tokens')
            .order_by('-created_at')
        )
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        search = (self.request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(city__icontains=search)
                | Q(contact_phone__icontains=search)
                | Q(contact_email__icontains=search)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'partial_update':
            return PendingPublicationStatusSerializer
        return PendingPublicationSerializer

    def perform_create(self, serializer):
        pending = serializer.save()
        if serializer.created_new:
            PendingPublicationNotificationService().notify_created(pending)

    @action(detail=True, methods=['post'], url_path='resume-link')
    def resume_link(self, request, pk=None):
        """
        Issue the single-use link that hands this draft back to its author.

        Emission is manual because sending it is manual: somebody reads the
        request, decides it is worth chasing and writes over WhatsApp. A link
        minted without anyone sending it would just be a live credential with no
        reason to exist. Moving the request to `contacted` in the same act keeps
        the tray from lying about what has already been handled.
        """
        pending = self.get_object()
        if pending.status == 'converted':
            return Response(
                {'error': 'Esta solicitud ya se convirtió en un anuncio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token = create_publication_resume_token(pending, created_by=request.user)
        if pending.status == 'new':
            pending.status = 'contacted'
            pending.save(update_fields=['status', 'updated_at'])

        logger.info(
            "admin_audit action=pending.resume_link_issued actor=%s pending=%s",
            request.user.pk, pending.pk,
        )
        return Response(
            {'url': build_resume_link(token.token), 'expires_at': token.expires_at},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='resume-link/revoke')
    def revoke_resume_link(self, request, pk=None):
        """Kill every live link for this request, without waiting for expiry."""
        pending = self.get_object()
        revoked = PublicationResumeToken.objects.filter(
            pending=pending,
            revoked_at__isnull=True,
            redeemed_at__isnull=True,
        ).update(revoked_at=timezone.now())

        logger.info(
            "admin_audit action=pending.resume_link_revoked actor=%s pending=%s revoked=%s",
            request.user.pk, pending.pk, revoked,
        )
        return Response({'revoked': revoked})


class PublicationDraftView(generics.GenericAPIView):
    """
    Hand a draft back to whoever holds a valid resume token.

    Public by necessity: the whole point is that the person has no account yet.
    The token is therefore the only credential, and it is treated as one — the
    response carries the draft and nothing else, never a session.
    """

    permission_classes = [AllowAny]
    serializer_class = PublicationDraftSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'resume_read'

    def get(self, request, token):
        resume_token = resolve_resume_token(token)
        if resume_token is None:
            return invalid_resume_token_response()

        serializer = self.get_serializer(resume_token.pending)
        return Response({**serializer.data, 'expires_at': resume_token.expires_at})


class PublicationDraftRedeemView(generics.GenericAPIView):
    """
    Publish from a resume link, creating the account afterwards.

    The `account_required` origin says literally that the account was the wall.
    A link that walks somebody back into the same wall reproduces the abandonment
    it is meant to fix, so the order is inverted: publish first, register after.
    """

    permission_classes = [AllowAny]
    serializer_class = PropertySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'resume_redeem'

    def post(self, request, token):
        resume_token = resolve_resume_token(token)
        if resume_token is None:
            return invalid_resume_token_response()

        pending = resume_token.pending
        email = (pending.contact_email or '').strip()
        if not email:
            return Response(
                {'error': 'Esta solicitud no tiene un correo al que asignar el anuncio.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        property_data = request.data.copy()
        retained_ids = request.data.get('pending_image_ids')
        try:
            retained_ids = json.loads(retained_ids) if retained_ids else None
        except (TypeError, ValueError, json.JSONDecodeError):
            retained_ids = None
        property_data.pop('pending_image_ids', None)
        stored_queryset = pending.temporary_images.all()
        if isinstance(retained_ids, list):
            stored_queryset = stored_queryset.filter(pk__in=retained_ids)
        stored_rows = list(stored_queryset)
        stored_images = []
        for image in stored_rows:
            image.image.open('rb')
            stored_images.append(File(image.image, name=image.original_filename or image.image.name))
        uploaded_images = request.FILES.getlist('uploaded_images')
        if stored_images or uploaded_images:
            property_data.setlist('uploaded_images', [*stored_images, *uploaded_images])
        serializer = self.get_serializer(data=property_data)
        serializer.is_valid(raise_exception=True)

        try:
            owner, created = InvitedAccountService().get_or_create_by_email(email)
        except InactiveAccountError as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Burn the token in the same transaction that creates the listing:
            # the forwarded message must not be able to publish twice, and a
            # failed save must not leave the link spent.
            burnt = PublicationResumeToken.objects.filter(
                pk=resume_token.pk, redeemed_at__isnull=True, revoked_at__isnull=True
            ).update(redeemed_at=timezone.now())
            if not burnt:
                return invalid_resume_token_response()

            prop = serializer.save(owner=owner)
            pending.status = 'converted'
            pending.property = prop
            pending.save(update_fields=['status', 'property', 'updated_at'])

        PublicationRedeemSideEffectsService().schedule(
            pending_id=pending.pk,
            owner_id=owner.pk,
            property_id=prop.pk,
            account_created=created,
        )

        logger.info(
            "resume_redeemed pending=%s property=%s owner=%s new_account=%s",
            pending.pk, prop.pk, owner.pk, created,
        )
        return Response(
            {
                'property': serializer.data,
                'account_created': created,
                'email': owner.email,
            },
            status=status.HTTP_201_CREATED,
        )


def resolve_resume_token(token_string):
    """The live token behind this string, or None if it cannot be used."""
    resume_token = (
        PublicationResumeToken.objects
        .select_related('pending')
        .filter(token=token_string)
        .first()
    )
    if resume_token is None or not resume_token.is_valid():
        return None
    return resume_token


def invalid_resume_token_response():
    """
    One answer for missing, expired, revoked and already-redeemed tokens.

    Telling them apart would turn the endpoint into an oracle for which links
    ever existed, and none of the four cases has a different remedy: ask for a
    new link.
    """
    # `detail` first so a client that reads the first message of an error body
    # shows the sentence, not the machine-readable code.
    return Response(
        {
            'detail': 'Este enlace ya no es válido. Pide uno nuevo.',
            'code': 'resume_token_invalid',
        },
        status=status.HTTP_410_GONE,
    )


class ActivityEventViewSet(viewsets.ModelViewSet):
    """Captura pública de eventos; consulta completa reservada a administradores."""

    serializer_class = ActivityEventSerializer
    queryset = ActivityEvent.objects.select_related('user', 'property').all()
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['event_name', 'user__username', 'user__email', 'property__title']
    ordering_fields = ['created_at', 'event_name']
    ordering = ['-created_at']
    pagination_class = ActivityEventPagination

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_throttles(self):
        # Solo el POST público (create) se limita por tasa; el resto es admin.
        if self.action == 'create':
            self.throttle_scope = 'activity_create'
            return [ScopedRateThrottle()]
        return []

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user')
        property_id = self.request.query_params.get('property')
        event_name = self.request.query_params.get('event_name')
        event_group = self.request.query_params.get('event_group')
        if user_id and str(user_id).isdigit():
            queryset = queryset.filter(user_id=user_id)
        if property_id and str(property_id).isdigit():
            queryset = queryset.filter(property_id=property_id)
        if event_name:
            queryset = queryset.filter(event_name=event_name)
        elif event_group == 'publication_errors':
            queryset = queryset.filter(event_name__in=[
                'publication_create_failed',
                'publication_update_failed',
                'publication_validation_failed',
                'publication_blocked',
                'publication_pending_save_failed',
                'publication_login_failed',
                'publication_account_create_failed',
            ])
        # Optional `is_bot` filter so the admin log can be narrowed to humans or
        # to crawlers. Without the parameter the listing keeps showing both.
        is_bot = self.request.query_params.get('is_bot')
        if is_bot is not None:
            if str(is_bot).lower() in ('true', '1'):
                queryset = queryset.filter(is_bot=True)
            elif str(is_bot).lower() in ('false', '0'):
                queryset = queryset.filter(is_bot=False)
        return self._apply_date_range(queryset)

    def _apply_date_range(self, queryset):
        """Narrow the log to a date range, inclusive on both ends.

        Dates arrive as plain `YYYY-MM-DD` because that is what a date input
        sends, and they mean days in the portal's own timezone — the admin
        reading them is in Ecuador, not in UTC. Each bound is turned into an
        aware instant before it touches the query, so "21 de agosto" is that
        day here and not five hours of it borrowed from the next.

        The upper bound becomes the start of the following day, so asking for
        a single date returns that day instead of nothing.
        """
        after = _parse_range_date(self.request.query_params.get('created_after'))
        before = _parse_range_date(self.request.query_params.get('created_before'))
        if after:
            queryset = queryset.filter(created_at__gte=_start_of_local_day(after))
        if before:
            queryset = queryset.filter(
                created_at__lt=_start_of_local_day(before + timedelta(days=1))
            )
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """What the filtered range adds up to, so the log stops being a list.

        A page of fifty rows cannot answer "did traffic grow", "which events
        moved" or "how much of this was crawlers". The same filters that build
        the listing build these totals, so the summary always describes exactly
        what is on screen.
        """
        queryset = self.filter_queryset(self.get_queryset())
        by_event = list(
            queryset.values('event_name')
            .annotate(count=Count('id'))
            .order_by('-count', 'event_name')[:15]
        )
        by_day = [
            {'date': row['day'].isoformat(), 'count': row['count']}
            for row in (
                queryset.annotate(day=TruncDate('created_at'))
                .values('day')
                .annotate(count=Count('id'))
                .order_by('day')
            )
            if row['day']
        ]
        # The bot split is computed without the caller's own `is_bot` filter:
        # asking "how much of this range was crawlers" while looking at humans
        # only would otherwise always answer zero.
        unfiltered = self._apply_date_range(super().get_queryset())
        return Response({
            'total': queryset.count(),
            'sessions': queryset.exclude(session_id='').values('session_id').distinct().count(),
            'by_event': by_event,
            'by_day': by_day,
            'traffic_split': {
                'human': unfiltered.filter(is_bot=False).count(),
                'bot': unfiltered.filter(is_bot=True).count(),
            },
        })


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class GoogleLoginView(generics.GenericAPIView):
    """
    Vista para manejar el login/registro con Google OAuth.
    Recibe el token de Google, lo valida y retorna JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')

        if not token:
            return Response(
                {'error': 'Token de Google requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verificar el token de Google
            google_client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                google_client_id
            )

            user, tokens = GoogleAuthenticationService().authenticate(idinfo)

            return Response({
                **tokens,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'avatar_url': user.avatar_url,
                    'is_staff': user.is_staff,
                }
            })

        except (ValueError, GoogleIdentityError):
            return Response(
                {'error': 'Token de Google inválido o correo no verificado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception:
            logger.exception('google_login_failed')
            return Response(
                {'error': 'No se pudo procesar el inicio de sesión.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ImageProxyView(View):
    """
    Proxy view to serve images from MinIO through Django
    This avoids CORS issues when accessing MinIO directly from the browser
    """
    def get(self, request, image_path):
        # Get MinIO configuration from Django settings
        minio_endpoint = settings.AWS_S3_ENDPOINT_URL
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME

        # Build MinIO URL using configured values
        minio_url = f"{minio_endpoint}/{bucket_name}/{image_path}"

        try:
            # Fetch image from MinIO
            response = requests.get(minio_url, stream=True, timeout=10)

            if response.status_code == 200:
                # Determine content type
                content_type = response.headers.get('Content-Type', 'image/jpeg')

                # Create Django response with the image
                django_response = HttpResponse(
                    response.content,
                    content_type=content_type
                )

                # Add cache headers
                django_response['Cache-Control'] = 'public, max-age=31536000'

                return django_response
            else:
                raise Http404("Image not found")

        except requests.RequestException as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching image from MinIO: {minio_url} - {str(e)}")
            raise Http404("Image not found")


MAGIC_IMAGE_TYPES = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF8", "image/gif"),
)


def _sniff_image_type(path):
    """
    Derive the content type from the bytes, never from the file name.

    The staged file keeps the suffix of an attacker-controlled upload name, so
    `mimetypes` can answer `application/octet-stream` for a perfectly good WebP
    -- and the API host sends `X-Content-Type-Options: nosniff`, which turns
    that answer into an image the browser refuses to paint.
    """
    with path.open("rb") as handle:
        head = handle.read(16)

    for magic, content_type in MAGIC_IMAGE_TYPES:
        if head.startswith(magic):
            return content_type
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return "application/octet-stream"


class PendingImageView(View):
    """
    Serve a freshly uploaded image from local staging while the worker is still
    optimizing it.

    Without this there is a window where the row exists but nothing in MinIO
    does, and the client would render a broken image. Lookup is by row id, never
    by path, so a crafted URL cannot walk out of the staging directory.
    """

    def get(self, request, image_id):
        from .models import PropertyImage

        image = get_object_or_404(PropertyImage, pk=image_id)

        # Once optimized the file belongs in MinIO; do not keep proxying it.
        if image.status != PropertyImage.Status.PENDING or not image.pending_path:
            if image.image:
                return HttpResponseRedirect(image.image.url)
            raise Http404("Image not available")

        path = Path(image.pending_path)
        if not path.is_file() or path.parent != Path(settings.IMAGE_UPLOAD_TEMP_DIR):
            raise Http404("Image not available")

        response = FileResponse(path.open("rb"), content_type=_sniff_image_type(path))
        # Deliberately not cached: this URL stops being valid the moment the
        # worker finishes, which is usually seconds away.
        response["Cache-Control"] = "no-store"
        return response


class VerifyEmailView(generics.GenericAPIView):
    """Vista para verificar el correo electrónico con código"""
    serializer_class = VerifyEmailSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import EmailVerificationToken

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        code = serializer.validated_data['code']

        try:
            user = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar si ya está verificado
        if user.is_email_verified:
            return Response(
                {'message': 'El correo ya ha sido verificado anteriormente'},
                status=status.HTTP_200_OK
            )

        # Buscar token válido
        try:
            token = EmailVerificationToken.objects.filter(
                user=user,
                code=code,
                is_used=False
            ).latest('created_at')

            if not token.is_valid():
                return Response(
                    {'error': 'El código ha expirado. Solicita uno nuevo.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Marcar token como usado
            token.is_used = True
            token.save()

            # Activar usuario y marcar email como verificado
            user.is_active = True
            user.is_email_verified = True
            user.save()

            # Enviar email de bienvenida
            try:
                from .email_utils import send_welcome_email
                send_welcome_email(user)
            except Exception as e:
                # Log error pero no fallar la verificación
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error enviando email de bienvenida: {str(e)}")

            return Response(
                {'message': 'Correo verificado exitosamente. Ya puedes iniciar sesión.'},
                status=status.HTTP_200_OK
            )

        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'error': 'Código de verificación inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ResendVerificationView(generics.GenericAPIView):
    """Vista para reenviar código de verificación"""
    serializer_class = ResendVerificationSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        from .email_utils import create_verification_token, send_verification_email

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = get_user_model().objects.get(email=email)
        except get_user_model().DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verificar si ya está verificado
        if user.is_email_verified:
            return Response(
                {'message': 'El correo ya ha sido verificado'},
                status=status.HTTP_200_OK
            )

        # Crear nuevo token y enviar correo
        token = create_verification_token(user)
        send_verification_email(user, token.code)

        return Response(
            {'message': 'Se ha enviado un nuevo código de verificación a tu correo'},
            status=status.HTTP_200_OK
        )


class RequestPasswordResetView(generics.GenericAPIView):
    """Vista para solicitar reset de contraseña"""
    serializer_class = RequestPasswordResetSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        from .email_utils import create_password_reset_token, send_password_reset_email

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = get_user_model().objects.get(email=email)

            # Crear token y enviar correo
            token = create_password_reset_token(user)
            send_password_reset_email(user, token.token)

            return Response(
                {'message': 'Se ha enviado un enlace de recuperación a tu correo'},
                status=status.HTTP_200_OK
            )
        except get_user_model().DoesNotExist:
            # Por seguridad, no revelar si el email existe o no
            return Response(
                {'message': 'Se ha enviado un enlace de recuperación a tu correo'},
                status=status.HTTP_200_OK
            )


def _revoke_refresh_tokens(user):
    """Blacklist every outstanding refresh token of `user`.

    Changing credentials must expel whoever else holds a session: refresh
    tokens live 30 days in localStorage, so rotation alone would leave a stolen
    token a month of access that its rightful owner has no way to cut short.
    """
    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)


class ResetPasswordView(generics.GenericAPIView):
    """Vista para resetear contraseña con token"""
    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import PasswordResetToken

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_string = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            token = PasswordResetToken.objects.get(
                token=token_string,
                is_used=False
            )

            if not token.is_valid():
                return Response(
                    {'error': 'El enlace ha expirado. Solicita uno nuevo.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Marcar token como usado
            token.is_used = True
            token.save()

            # Cambiar contraseña
            user = token.user
            user.set_password(new_password)
            user.save()
            _revoke_refresh_tokens(user)

            return Response(
                {'message': 'Contraseña actualizada exitosamente'},
                status=status.HTTP_200_OK
            )

        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Token inválido o expirado'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RequestEmailChangeView(generics.GenericAPIView):
    """Vista para solicitar cambio de correo electrónico"""
    serializer_class = RequestEmailChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import EmailChangeToken
        from .email_utils import send_email_change_verification, generate_verification_code
        from django.utils import timezone
        from datetime import timedelta

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        new_email = serializer.validated_data['new_email']
        user = request.user

        # Invalidar tokens anteriores de cambio de email
        EmailChangeToken.objects.filter(user=user, is_used=False).update(is_used=True)

        # Crear nuevo token de cambio de email
        code = generate_verification_code()
        expires_at = timezone.now() + timedelta(minutes=settings.EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES)

        token = EmailChangeToken.objects.create(
            user=user,
            new_email=new_email,
            code=code,
            expires_at=expires_at
        )

        # Enviar correo de verificación al nuevo email
        try:
            send_email_change_verification(user, new_email, code)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error enviando email de verificación de cambio: {str(e)}")
            return Response(
                {'error': 'Error al enviar el correo de verificación'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                'message': f'Se ha enviado un código de verificación a {new_email}',
                'new_email': new_email
            },
            status=status.HTTP_200_OK
        )


class VerifyEmailChangeView(generics.GenericAPIView):
    """Vista para verificar el cambio de correo electrónico con código"""
    serializer_class = VerifyEmailChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import EmailChangeToken
        from .email_utils import send_email_changed_notification

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        user = request.user

        # Buscar token válido
        try:
            token = EmailChangeToken.objects.filter(
                user=user,
                code=code,
                is_used=False
            ).latest('created_at')

            if not token.is_valid():
                return Response(
                    {'error': 'El código ha expirado. Solicita uno nuevo.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar que el nuevo email no esté en uso
            if get_user_model().objects.filter(email=token.new_email).exclude(pk=user.pk).exists():
                return Response(
                    {'error': 'Este correo ya está en uso por otra cuenta'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Marcar token como usado
            token.is_used = True
            token.save()

            # Guardar el email antiguo antes de cambiarlo
            old_email = user.email

            # Cambiar el email del usuario
            user.email = token.new_email
            user.save()
            # The address is a credential (it receives the reset links), so
            # changing it ends every other session the account had open.
            _revoke_refresh_tokens(user)

            # Enviar notificación al email antiguo
            try:
                send_email_changed_notification(user, old_email, token.new_email)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error enviando notificación de cambio de email: {str(e)}")
                # No fallar si no se puede enviar la notificación

            return Response(
                {
                    'message': 'Correo electrónico actualizado exitosamente',
                    'new_email': user.email
                },
                status=status.HTTP_200_OK
            )

        except EmailChangeToken.DoesNotExist:
            return Response(
                {'error': 'Código de verificación inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )


class MeView(generics.RetrieveUpdateAPIView):
    """Obtener/actualizar datos básicos del usuario autenticado."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    """Permite al usuario cambiar su contraseña actual."""

    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        _revoke_refresh_tokens(request.user)
        return Response({'message': 'Contraseña actualizada correctamente'}, status=status.HTTP_200_OK)


# ===== Admin Views =====

User = get_user_model()


class MarketStatsView(generics.GenericAPIView):
    """Indicadores públicos calculados únicamente con inventario activo real."""

    permission_classes = [AllowAny]

    def get(self, request):
        from collections import Counter, defaultdict
        from datetime import timedelta
        from django.utils import timezone

        # This one pulls every active listing into Python to build the sector,
        # evolution and demand tables; the SEO stats pages are server-rendered
        # from it, so it runs on cold crawls too.
        cache_key = versioned_key(
            'market_stats',
            _query_signature(request.query_params),
            scope='market_stats',
        )
        # Stale-while-revalidate: past its freshness the payload is still
        # served while exactly one worker recomputes it. Without that, the
        # first request after the TTL waits for fourteen thousand rows to
        # travel into Python, and every request arriving meanwhile repeats
        # the same work on a box with four cores.
        def compute():
            all_base = Property.objects.exclude(status='inactive').filter(
                area__gt=0,
                price__gt=0,
                is_duplicate=False,
            ).annotate(
                price_per_m2=ExpressionWrapper(F('price') / F('area'), output_field=FloatField())
            ).filter(price_per_m2__gt=1, price_per_m2__lt=10000)
            # Optional city scope so the frontend can server-render one stats page
            # per city; every metric below narrows naturally through this filter.
            city_scope = (request.query_params.get('city') or '').strip()
            if city_scope:
                all_base = all_base.filter(city__iexact=city_scope)
            # Venta y alquiler usan escalas distintas (precio total vs. mensual).
            # Las métricas principales se limitan a venta para que $/m² sea comparable.
            base = all_base.filter(status='for_sale')

            raw_values = sorted(float(value) for value in base.values_list('price_per_m2', flat=True))
            def percentile(values, ratio):
                if not values:
                    return 0
                position = (len(values) - 1) * ratio
                low = int(position)
                high = min(low + 1, len(values) - 1)
                return values[low] + (values[high] - values[low]) * (position - low)
            q1, q3 = percentile(raw_values, .25), percentile(raw_values, .75)
            iqr = q3 - q1
            lower, upper = max(1, q1 - 1.5 * iqr), min(10000, q3 + 1.5 * iqr)
            outliers_excluded = base.exclude(price_per_m2__gte=lower, price_per_m2__lte=upper).count()
            base = base.filter(price_per_m2__gte=lower, price_per_m2__lte=upper)

            overall = base.aggregate(
                count=Count('id'),
                avg_price_m2=Avg('price_per_m2'),
                avg_price=Avg('price'),
                avg_area=Avg('area'),
                min_price_m2=Min('price_per_m2'),
                max_price_m2=Max('price_per_m2'),
                updated_at=Max('updated_at'),
            )

            def grouped(*fields, limit=12):
                rows = (
                    base.values(*fields)
                    .annotate(
                        count=Count('id'),
                        avg_price_m2=Avg('price_per_m2'),
                        avg_price=Avg('price'),
                        avg_area=Avg('area'),
                    )
                    .filter(count__gte=3)
                    .order_by('-count')[:limit]
                )
                return list(rows)

            now = timezone.now()
            active_rows = list(base.values(
                'id', 'city', 'address', 'property_type', 'status', 'created_at',
                'last_seen_at', 'price_per_m2', 'price', 'area',
                'sector_key', 'sector_label',
            ))
            market_days = []
            city_periods = defaultdict(lambda: {'recent': [], 'previous': []})
            # Sectors come from free-text addresses, so the same place arrives
            # written several ways: "PUEMBO", "Puembo", "Cumbaya", "Cumbayá".
            # Grouping by casefold alone split the accented spellings into separate
            # sectors — Cumbayá held 42 listings and Cumbaya another 47, each with
            # its own average — so the key drops diacritics too.
            sector_stats = defaultdict(lambda: {'names': Counter(), 'values': []})
            for row in active_rows:
                # Active catalog entries remain available through the current day.
                market_days.append(max(0, (now - row['created_at']).days))
                city = (row['city'] or 'Sin ciudad').strip()
                age = now - row['created_at']
                if age <= timedelta(days=90):
                    city_periods[city]['recent'].append(row['price_per_m2'])
                elif age <= timedelta(days=180):
                    city_periods[city]['previous'].append(row['price_per_m2'])
                # The zone is read from the column, not parsed again here. This
                # block used to re-derive it from `address` with its own folding,
                # so the stats table and the zone pages were two sources of truth
                # for the same question: «Casa en Venta» was rejected as a place
                # by one and published as a neighbourhood with a price per square
                # metre by the other.
                if row['sector_key']:
                    entry = sector_stats[(city, row['sector_key'])]
                    entry['names'][row['sector_label'] or row['sector_key']] += 1
                    entry['values'].append(row['price_per_m2'])

            # A median needs a sample to be a reading rather than an anecdote.
            # Below this the field comes back null and the page shows nothing,
            # which is the honest answer: an invented figure is worse than a gap.
            MIN_MEDIAN_SAMPLE = 5

            def _median(values):
                ordered = sorted(values)
                if len(ordered) < MIN_MEDIAN_SAMPLE:
                    return None
                middle = len(ordered) // 2
                if len(ordered) % 2:
                    return float(ordered[middle])
                return (float(ordered[middle - 1]) + float(ordered[middle])) / 2

            def _summary(rows, *, with_ratio=True):
                """What a group of listings can honestly say about itself.

                The average alone was misleading on every page that mixed
                markets: Guayaquil published an average area of 4.571 m²
                because farmland and flats were pooled. The median resists that,
                and the minimum and maximum say where the range really starts.
                """
                prices = [float(row['price']) for row in rows if row['price']]
                areas = [float(row['area']) for row in rows if row['area']]
                ratios = [float(row['price_per_m2']) for row in rows if row['price_per_m2']]
                return {
                    'count': len(rows),
                    'median_price': _median(prices),
                    'median_area': _median(areas),
                    'median_price_m2': _median(ratios) if with_ratio else None,
                    'min_price': min(prices) if prices else None,
                    'max_price': max(prices) if prices else None,
                }

            # `active_rows` is sale-only, because the headline metrics are.
            # Renting is a different market on a different scale, so it is pulled
            # apart and never given a price per square metre: dividing a monthly
            # rent by an area produced the $6,89/m² that this endpoint used to
            # publish next to sale figures of $1.200/m².
            rent_rows = list(
                all_base.filter(status='for_rent').values(
                    'property_type', 'status', 'price', 'area', 'price_per_m2',
                )
            )
            by_type_rows = defaultdict(list)
            by_type_operation_rows = defaultdict(list)
            for row in active_rows:
                by_type_rows[row['property_type']].append(row)
                by_type_operation_rows[(row['property_type'], 'for_sale')].append(row)
            for row in rent_rows:
                by_type_operation_rows[(row['property_type'], 'for_rent')].append(row)

            evolution = []
            for city, periods in city_periods.items():
                if len(periods['recent']) < 2 or len(periods['previous']) < 2:
                    continue
                recent = sum(periods['recent']) / len(periods['recent'])
                previous = sum(periods['previous']) / len(periods['previous'])
                evolution.append({'city': city, 'current_price_m2': recent, 'previous_price_m2': previous,
                                  'change_pct': round((recent - previous) / previous * 100, 1) if previous else 0})
            evolution.sort(key=lambda row: row['change_pct'], reverse=True)
            # The same absorption the zone pages apply, so a corner of Cumbayá
            # is not listed here as a rival of Cumbayá with its own average.
            _absorbed = sector_absorptions([
                {'city': city, 'sector_key': key, 'count': len(entry['values'])}
                for (city, key), entry in sector_stats.items()
            ])
            for origin, target in _absorbed.items():
                if origin in sector_stats and target in sector_stats:
                    sector_stats[target]['values'].extend(sector_stats[origin]['values'])
                    sector_stats.pop(origin)

            by_sector = [
                {
                    'city': city,
                    'sector': _display_name(entry['names']),
                    # The key the zone page is addressed by, so the table can link
                    # to it without folding the name a second time.
                    'sector_key': _sector_key,
                    'count': len(entry['values']),
                    'avg_price_m2': sum(entry['values']) / len(entry['values']),
                }
                for (city, _sector_key), entry in sector_stats.items() if len(entry['values']) >= 2
            ]
            by_sector.sort(key=lambda row: (-row['count'], row['city'], row['sector']))

            overall.update(
                {key: value for key, value in _summary(active_rows).items() if key != 'count'}
            )

            by_property_type = grouped('property_type', limit=8)
            for row in by_property_type:
                row.update(
                    {
                        key: value
                        for key, value in _summary(by_type_rows[row['property_type']]).items()
                        if key != 'count'
                    }
                )

            by_type_operation = []
            for (property_type, status), rows in by_type_operation_rows.items():
                if len(rows) < 3:
                    continue
                summary = _summary(rows, with_ratio=status == 'for_sale')
                by_type_operation.append(
                    {'property_type': property_type, 'status': status, **summary}
                )
            by_type_operation.sort(key=lambda row: (-row['count'], row['property_type']))

            by_operation = []
            for row in all_base.values('status').annotate(
                count=Count('id'),
                avg_price_m2=Avg('price_per_m2'),
                avg_price=Avg('price'),
                avg_area=Avg('area'),
            ).order_by('-count'):
                if row['status'] != 'for_sale':
                    row['avg_price_m2'] = None
                by_operation.append(row)

            payload = {
                'overall': overall,
                'by_city': grouped('city', 'province', limit=15),
                'by_property_type': by_property_type,
                'by_type_operation': by_type_operation,
                'by_operation': by_operation,
                'by_sector': by_sector[:20],
                'evolution': evolution[:15],
                'growth_zones': [row for row in evolution if row['change_pct'] > 0][:8],
                'estimated_market_days': round(sum(market_days) / len(market_days)) if market_days else 0,
                'outliers_excluded': outliers_excluded,
                'methodology': (
                    'Muestra: propiedades en venta activas con precio y área válidos, '
                    'publicadas en Geo Propiedades Ecuador. La mayor parte del inventario '
                    'procede de anuncios importados del portal Plusvalía, no de operaciones '
                    'cerradas: son precios pedidos por quien vende, no precios de venta. '
                    'Los extremos se excluyen con el método IQR. La evolución compara las '
                    'altas de los últimos 90 días con las de los 90 anteriores, así que '
                    'contrasta cohortes distintas de anuncios y no la variación de precio de '
                    'un mismo inmueble. La antigüedad media del anuncio cuenta los días desde '
                    'que el anuncio entró en esta base de datos y solo sobre los que siguen '
                    'activos: no mide cuánto tarda en venderse una propiedad.'
                ),
            }
            return payload

        if not _is_public_read(request):
            return _public_response(compute(), request, s_maxage=CACHE_TTL_MARKET_STATS)

        payload = cached_or_stale(cache_key, CACHE_TTL_MARKET_STATS, compute)
        return _public_response(payload, request, s_maxage=CACHE_TTL_MARKET_STATS)


class AdminDashboardView(generics.GenericAPIView):
    """Dashboard con estadísticas del sistema."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminDashboardSerializer

    # El dashboard dispara decenas de agregaciones sobre el catálogo entero y
    # recorre en Python los contactos de treinta días. Cinco minutos de caché
    # bastan para que abrirlo (o dejarlo abierto en una pestaña) deje de
    # competir por la CPU con el portal, y la clave lleva la versión del
    # inventario: cualquier escritura la invalida sin esperar al TTL.
    CACHE_TTL = 300

    def get(self, request):
        from .services.admin_metrics import resolve_window

        # The window the owner picked travels into the cache key: two windows
        # are two different answers, and serving one for the other is worse
        # than recomputing.
        window_days = resolve_window(request.query_params.get('days'))
        if request.query_params.get('refresh') in ('1', 'true'):
            data = self._build(window_days=window_days)
        else:
            key = versioned_key(f'admin:dashboard:{window_days}')
            data = cache.get(key)
            if data is None:
                data = self._build(window_days=window_days)
                cache.set(key, data, self.CACHE_TTL)
            else:
                data['cached'] = True
        return Response(data)

    def _build(self, window_days=None):
        from django.utils import timezone
        from datetime import timedelta
        from ingesta.models import Fuente, IngestaRun, ListingRetirada
        from .services.admin_metrics import AdminMetricsService, DEFAULT_WINDOW_DAYS

        if window_days is None:
            window_days = DEFAULT_WINDOW_DAYS

        # La papelera no es catálogo: se excluye de todos los recuentos, igual
        # que en `stats`.
        properties = Property.objects.filter(deleted_at__isnull=True)
        # Inmuebles sin imágenes e incompletos (sin descripción, sin título,
        # sin imágenes o sin área válida): candidatos a mejorar para captar más
        # interés comercial.
        with_image_counts = properties.annotate(num_images=Count('images'))
        without_images = with_image_counts.filter(num_images=0).count()
        incomplete = with_image_counts.filter(
            Q(num_images=0) | Q(description='') | Q(title='')
            | Q(area__isnull=True) | Q(area__lte=0)
        ).count()

        thirty_days_ago = timezone.now() - timedelta(days=30)
        now = timezone.now()
        one_day_ago = now - timedelta(days=1)
        stale_cutoff = now - timedelta(days=2)
        active_catalog = properties.exclude(status='inactive').filter(is_duplicate=False)
        without_location = active_catalog.filter(
            Q(latitude__isnull=True) | Q(longitude__isnull=True)
        ).count()
        without_price = active_catalog.filter(
            Q(price__isnull=True) | Q(price__lte=0)
        ).count()

        source_health = []
        for source in Fuente.objects.all():
            latest_run = source.runs.order_by('-created_at').first()
            active_run = source.runs.filter(estado__in=['pending', 'running']).first()
            if active_run:
                health = 'running'
            elif latest_run and latest_run.estado == 'error' and latest_run.created_at >= one_day_ago:
                health = 'error'
            elif source.last_import_at is None:
                health = 'never'
            elif source.last_import_at < stale_cutoff:
                health = 'stale'
            else:
                health = 'healthy'
            source_health.append({
                'slug': source.slug,
                'nombre': source.nombre,
                'status': health,
                'last_import_at': source.last_import_at,
                'latest_run_id': latest_run.id if latest_run else None,
                'latest_run_status': latest_run.estado if latest_run else None,
                'imported': properties.filter(source=source, is_imported=True).count(),
                'retired': source.retiradas.count(),
            })

        data = {
            'total_users': User.objects.count(),
            'total_properties': properties.count(),
            'properties_for_sale': properties.filter(status='for_sale').count(),
            'properties_for_rent': properties.filter(status='for_rent').count(),
            'properties_inactive': properties.filter(status='inactive').count(),
            # --- Métricas comerciales ---
            'properties_active': properties.exclude(status='inactive').count(),
            'total_views': properties.aggregate(total=Sum('views_count'))['total'] or 0,
            'total_leads': Lead.objects.count(),
            'leads_new': Lead.objects.filter(status='new').count(),
            'pending_publications': PendingPublication.objects.count(),
            'pending_publications_new': PendingPublication.objects.filter(status='new').count(),
            'new_users_30d': User.objects.filter(date_joined__gte=thirty_days_ago).count(),
            'properties_without_images': without_images,
            'properties_incomplete': incomplete,
            'quality': {
                'without_images': without_images,
                'without_location': without_location,
                'without_price': without_price,
                'duplicates': properties.filter(is_duplicate=True).count(),
                'inactive': properties.filter(status='inactive').count(),
            },
            'ingestion': {
                'active_runs': IngestaRun.objects.filter(estado__in=['pending', 'running']).count(),
                'failed_24h': IngestaRun.objects.filter(estado='error', created_at__gte=one_day_ago).count(),
                'retired_total': ListingRetirada.objects.count(),
                'imported_total': properties.filter(is_imported=True).count(),
                'sources': source_health,
            },
            'owner': AdminMetricsService(now=now, window_days=window_days).build(),
            'generated_at': now,
            'recent_users': AdminUserSerializer(
                User.objects.order_by('-date_joined')[:5], many=True
            ).data,
            'recent_properties': AdminPropertyListSerializer(
                Property.objects.select_related('owner')
                .prefetch_related('images')
                .order_by('-created_at')[:5],
                many=True,
            ).data,
            'recent_leads': LeadSerializer(
                Lead.objects.select_related('property').order_by('-created_at')[:5],
                many=True,
            ).data,
            'trashed': Property.objects.filter(deleted_at__isnull=False).count(),
            'cached': False,
        }
        return data


class AdminAdvertiserReachView(generics.GenericAPIView):
    """Advertisers this portal has already sent people to.

    The imported catalogue is an invitation: every listing carries its
    advertiser's phone, and when a visitor writes from here WhatsApp opens
    saying «vi este anuncio en Geo Propiedades». That advertiser now knows the
    portal exists and is sending them buyers — but until this view existed
    nobody on this side could tell who they were.

    Ordered by contacts received rather than by inventory size on purpose: a
    number that got three enquiries in a fortnight has seen the portal's name
    three times, and the invitation writes itself. Volume without proof is a
    cold call.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from .services.admin_metrics import resolve_window
        from .services.claims import AdvertiserReachService

        days = resolve_window(request.query_params.get('days'))
        since = timezone.now() - timedelta(days=days)
        rows = AdvertiserReachService().top(since, limit=100)
        return Response({
            'window_days': days,
            'advertisers': rows,
            'reached': len(rows),
            'with_account': sum(1 for row in rows if row['has_account']),
        })


class AdminSystemStatusView(generics.GenericAPIView):
    """Operational status and aggregated incidents for staff users."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        import time
        from datetime import timedelta
        from django.db import connection
        from django.utils import timezone
        from ingesta.models import IngestaRun

        now = timezone.now()
        components = {}
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            components["database"] = {"status": "healthy", "label": "Base de datos"}
        except Exception:
            components["database"] = {"status": "error", "label": "Base de datos"}

        try:
            cache_key = "system:admin:probe"
            cache.set(cache_key, "ok", 10)
            cache_ok = cache.get(cache_key) == "ok"
            components["cache"] = {
                "status": "healthy" if cache_ok else "error",
                "label": "Redis y caché",
            }
            heartbeat = cache.get("system:worker:heartbeat")
            worker_age = int(time.time() - heartbeat) if heartbeat else None
            components["worker"] = {
                "status": "healthy" if worker_age is not None and worker_age < 180 else "stale",
                "label": "Worker de tareas",
                "age_seconds": worker_age,
            }
        except Exception:
            components["cache"] = {"status": "error", "label": "Redis y caché"}
            components["worker"] = {"status": "unknown", "label": "Worker de tareas", "age_seconds": None}

        failed_images = PropertyImage.objects.filter(status=PropertyImage.Status.FAILED).count()
        old_pending_images = PropertyImage.objects.filter(
            status=PropertyImage.Status.PENDING,
            uploaded_at__lt=now - timedelta(hours=2),
        ).count()
        # A pending row that already carries an error is not a photo uploaded a
        # second ago: the worker reached the object store and was turned away.
        # Waiting the two hours the age threshold needs would hide an outage
        # that is already known.
        rejected_images = (
            PropertyImage.objects.filter(status=PropertyImage.Status.PENDING)
            .exclude(optimization_error="")
            .count()
        )
        components["images"] = {
            "status": "error"
            if failed_images or rejected_images
            else "stale"
            if old_pending_images
            else "healthy",
            "label": "Procesamiento de imágenes",
            "failed": failed_images,
            "pending_old": old_pending_images,
            "pending_rejected": rejected_images,
        }

        stalled_runs = IngestaRun.objects.filter(
            estado__in=["pending", "running"],
            created_at__lt=now - timedelta(hours=6),
        ).count()
        failed_runs = IngestaRun.objects.filter(
            estado="error",
            created_at__gte=now - timedelta(hours=24),
        ).count()
        components["ingestion"] = {
            "status": "error" if stalled_runs else "stale" if failed_runs else "healthy",
            "label": "Importaciones",
            "stalled": stalled_runs,
            "failed_24h": failed_runs,
        }

        open_incidents = SystemIncident.objects.filter(resolved=False)
        incident_rows = list(open_incidents.values(
            "id", "kind", "severity", "status_code", "method", "path", "message",
            "request_id", "occurrences", "first_seen_at", "last_seen_at",
        )[:50])
        alerts = []
        for key, component in components.items():
            if component["status"] != "healthy":
                alerts.append({
                    "component": key,
                    "severity": "critical" if component["status"] == "error" else "warning",
                    "title": f"{component['label']}: requiere revisión",
                })
        if incident_rows:
            alerts.append({
                "component": "incidents",
                "severity": "critical",
                "title": f"{len(incident_rows)} errores del sistema sin resolver",
            })

        overall = "healthy"
        statuses = {component["status"] for component in components.values()}
        if "error" in statuses:
            overall = "error"
        elif statuses - {"healthy"}:
            overall = "degraded"
        return Response({
            "status": overall,
            "components": components,
            "alerts": alerts,
            "incidents": incident_rows,
            "generated_at": now,
        })

    def post(self, request):
        incident_id = request.data.get("incident_id")
        incident = SystemIncident.objects.filter(pk=incident_id).first()
        if incident is None:
            return Response({"error": "Incidencia no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        incident.resolved = bool(request.data.get("resolved", True))
        incident.save(update_fields=["resolved", "last_seen_at"])
        logger.info(
            "admin_audit action=incident.resolve actor=%s incident=%s resolved=%s",
            request.user.pk, incident.pk, incident.resolved,
        )
        AdminAuditService().record(
            request, "incident.resolve",
            target_type="incident", target_id=incident.pk,
            target_label=f"{incident.status_code} {incident.method} {incident.path}",
            changes={"resolved": incident.resolved},
        )
        return Response({"id": incident.pk, "resolved": incident.resolved})


class AdminUserViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios para admins."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().order_by('-date_joined')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username', 'email']
    ordering = ['-date_joined']
    pagination_class = AdminPagination

    def get_queryset(self):
        # Anota los contadores para evitar N+1 en el listado (el serializer lee
        # los atributos anotados y solo cae al .count() por fila si faltan).
        queryset = User.objects.all().annotate(
            properties_count_annotated=Count('properties', distinct=True),
            # Crawler events never count as user activity.
            activity_count_annotated=Count(
                'activity_events',
                filter=Q(activity_events__is_bot=False),
                distinct=True,
            ),
            contact_clicks_count_annotated=Count(
                'activity_events',
                filter=Q(
                    activity_events__event_name='property_contact_clicked',
                    activity_events__is_bot=False,
                ),
                distinct=True,
            ),
        ).order_by('-date_joined')

        if self.action == 'retrieve':
            # The detail embeds every property of the account with the full
            # PropertySerializer, which now reads price_history for
            # previous_price. Without the prefetch that is one query per row.
            queryset = queryset.prefetch_related('properties__price_history')

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ('true', '1'):
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ('false', '0'):
                queryset = queryset.filter(is_active=False)

        is_staff = self.request.query_params.get('is_staff')
        if is_staff is not None:
            if is_staff.lower() in ('true', '1'):
                queryset = queryset.filter(is_staff=True)
            elif is_staff.lower() in ('false', '0'):
                queryset = queryset.filter(is_staff=False)

        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminUserDetailSerializer
        return AdminUserSerializer

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        allowed_fields = {'is_active', 'is_staff'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}

        if not data:
            return Response(
                {'error': 'Solo se permite modificar is_active e is_staff'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevenir que un admin se desactive a sí mismo
        if user == request.user and data.get('is_staff') is False:
            return Response(
                {'error': 'No puedes removerte el rol de administrador a ti mismo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if user == request.user and data.get('is_active') is False:
            return Response(
                {'error': 'No puedes desactivar tu propia cuenta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        for field, value in data.items():
            setattr(user, field, value)
        user.save()

        logger.info(
            "admin_audit action=user.update actor=%s target_user=%s changes=%s",
            request.user.pk, user.pk, data,
        )
        AdminAuditService().record(
            request, "user.update",
            target_type="user", target_id=user.pk, target_label=user.email,
            changes=data,
        )

        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'No puedes eliminar tu propia cuenta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        target_id, target_email = user.pk, user.email
        user.delete()
        logger.info(
            "admin_audit action=user.delete actor=%s target_user=%s",
            request.user.pk, target_id,
        )
        AdminAuditService().record(
            request, "user.delete",
            target_type="user", target_id=target_id, target_label=target_email,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminPropertyViewSet(viewsets.ModelViewSet):
    """Gestión de propiedades para admins (incluye inactivas)."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminPropertySerializer
    queryset = Property.objects.all().order_by('-created_at')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'owner__username', 'owner__first_name', 'owner__last_name', 'city']
    ordering_fields = ['created_at', 'price', 'title']
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    pagination_class = AdminPagination

    # Campos editables vía PATCH admin.
    PATCH_ALLOWED_FIELDS = {'status', 'title', 'price', 'city', 'description'}

    def get_queryset(self):
        queryset = (
            Property.objects.select_related('owner', 'source')
            .prefetch_related('images')
            .annotate(image_count_annotated=Count('images', distinct=True))
            .order_by('-created_at')
        )
        status_param = self.request.query_params.get('status')
        if status_param in ('for_sale', 'for_rent', 'inactive'):
            queryset = queryset.filter(status=status_param)
        origin = self.request.query_params.get('origin')
        if origin == 'imported':
            queryset = queryset.filter(is_imported=True)
        elif origin == 'users':
            queryset = queryset.filter(is_imported=False, owner__isnull=False)

        # La papelera es una vista aparte, no un filtro más: sin `?trash=1` el
        # listado no la enseña, y con él no enseña otra cosa.
        if self.request.query_params.get('trash') in ('1', 'true'):
            queryset = queryset.filter(deleted_at__isnull=False).order_by('-deleted_at')
        elif self.action == 'list':
            queryset = queryset.filter(deleted_at__isnull=True)

        quality = self.request.query_params.get('quality')
        if quality == 'without_images':
            queryset = queryset.filter(image_count_annotated=0)
        elif quality == 'without_location':
            queryset = queryset.filter(
                Q(latitude__isnull=True) | Q(longitude__isnull=True)
            )
        elif quality == 'without_price':
            queryset = queryset.filter(Q(price__isnull=True) | Q(price__lte=0))
        elif quality == 'duplicates':
            queryset = queryset.filter(is_duplicate=True)
        elif quality == 'incomplete':
            queryset = queryset.filter(
                Q(image_count_annotated=0) | Q(description='') | Q(title='')
                | Q(area__isnull=True) | Q(area__lte=0)
            )
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminPropertyListSerializer
        return AdminPropertySerializer

    def partial_update(self, request, *args, **kwargs):
        prop = self.get_object()
        data = {k: v for k, v in request.data.items() if k in self.PATCH_ALLOWED_FIELDS}

        if not data:
            return Response(
                {'error': 'Solo se permite modificar: status, title, price, city, description'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AdminPropertySerializer(prop, data=data, partial=True, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(
            "admin_audit action=property.update actor=%s target_property=%s changes=%s",
            request.user.pk, prop.pk, list(data.keys()),
        )
        AdminAuditService().record(
            request, "property.update",
            target_type="property", target_id=prop.pk, target_label=prop.title,
            changes={"fields": sorted(data.keys())},
        )

        return Response(serializer.data)

    def transfer_owner(self, request, pk=None):
        """
        Move a property to another account.

        Deliberately its own verb instead of another entry in
        `PATCH_ALLOWED_FIELDS`: a change of title deed deserves target
        validation, a notification and an audit line saying from whom to whom,
        none of which a generic field edit would carry.
        """
        prop = self.get_object()
        serializer = OwnerTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target, created = self._resolve_transfer_target(serializer.validated_data)
        if isinstance(target, Response):
            return target

        if prop.owner_id == target.pk:
            return Response(
                {'error': 'Esa cuenta ya es la propietaria de esta propiedad.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        previous_owner_id = prop.owner_id
        prop.owner = target
        updated_fields = ['owner']
        if prop.is_imported:
            # Retirement selects by `is_imported` and deletes whatever stopped
            # showing up in the source portal. A claimed listing left as imported
            # would delete itself the day the external portal drops it, taking
            # its leads with it. Unlinking is what makes the claim stick.
            prop.is_imported = False
            updated_fields.append('is_imported')
        prop.save(update_fields=updated_fields)

        if created:
            reset_token = create_password_reset_token(target)
            AccountClaimNotificationService().notify_claim(
                target, reset_token.token, prop
            )
        else:
            OwnershipTransferNotificationService().notify_transferred(target, prop)

        logger.info(
            "admin_audit action=property.transfer_owner actor=%s target_property=%s from=%s to=%s new_account=%s",
            request.user.pk, prop.pk, previous_owner_id, target.pk, created,
        )
        AdminAuditService().record(
            request, "property.transfer_owner",
            target_type="property", target_id=prop.pk, target_label=prop.title,
            changes={"from": previous_owner_id, "to": target.pk, "new_account": created},
        )

        return Response(
            AdminPropertySerializer(prop, context=self.get_serializer_context()).data
        )

    def _resolve_transfer_target(self, data):
        """Return `(user, created)`, or a `Response` when the target is unusable."""
        User = get_user_model()
        user_id = data.get('user_id')
        if user_id:
            target = User.objects.filter(pk=user_id).first()
            if target is None:
                return Response(
                    {'error': 'No existe esa cuenta.'},
                    status=status.HTTP_400_BAD_REQUEST,
                ), False
            if not target.is_active:
                return Response(
                    {'error': 'Esa cuenta está desactivada; actívala antes de asignarle una propiedad.'},
                    status=status.HTTP_400_BAD_REQUEST,
                ), False
            return target, False

        try:
            return InvitedAccountService().get_or_create_by_email(data['email'])
        except (InactiveAccountError, ValueError) as error:
            return Response(
                {'error': str(error)}, status=status.HTTP_400_BAD_REQUEST
            ), False

    def destroy(self, request, *args, **kwargs):
        """Envía el anuncio a la papelera; no lo borra.

        El borrado real solo existe en `purge`, y solo se alcanza desde la
        papelera. Un `DELETE` desde el listado ya no puede llevarse por delante
        las fotos, el historial de precios y los leads de un anuncio ajeno.
        """
        prop = self.get_object()
        if prop.deleted_at is not None:
            return Response(
                {'error': 'Esta propiedad ya está en la papelera.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        PropertyTrashService().soft_delete(prop, actor=request.user)
        logger.info(
            "admin_audit action=property.delete actor=%s target_property=%s",
            request.user.pk, prop.pk,
        )
        AdminAuditService().record(
            request, "property.delete",
            target_type="property", target_id=prop.pk, target_label=prop.title,
            changes={"previous_status": prop.deleted_previous_status,
                     "purge_in_days": TRASH_RETENTION_DAYS},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """Devuelve el anuncio al estado que ofrecía antes del borrado."""
        prop = self.get_object()
        if prop.deleted_at is None:
            return Response(
                {'error': 'Esta propiedad no está en la papelera.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        previous = prop.deleted_previous_status
        PropertyTrashService().restore(prop)
        AdminAuditService().record(
            request, "property.restore",
            target_type="property", target_id=prop.pk, target_label=prop.title,
            changes={"restored_to": prop.status, "was": previous},
        )
        return Response(
            AdminPropertySerializer(prop, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=['post'], url_path='purge')
    def purge(self, request, pk=None):
        """Borrado definitivo. Solo desde la papelera y sin vuelta atrás."""
        prop = self.get_object()
        if prop.deleted_at is None:
            return Response(
                {'error': 'Solo se puede borrar definitivamente lo que ya está en la papelera.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target_id, target_title = prop.pk, prop.title
        PropertyTrashService().purge(prop)
        AdminAuditService().record(
            request, "property.purge",
            target_type="property", target_id=target_id, target_label=target_title,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='diagnostics')
    def diagnostics(self, request, pk=None):
        """Por qué se ve —o no se ve— esta propiedad, con todo lo que lo decide."""
        from .services.diagnostics import PropertyDiagnosticsService

        prop = self.get_object()
        return Response(PropertyDiagnosticsService().build(prop))

    @action(detail=False, methods=['post'], url_path='bulk-status')
    def bulk_status(self, request):
        """Cambia el estado de un conjunto acotado de propiedades."""
        raw_ids = request.data.get('ids')
        new_status = request.data.get('status')
        valid_statuses = {'for_sale', 'for_rent', 'inactive'}

        if not isinstance(raw_ids, list) or not raw_ids:
            return Response(
                {'error': 'Selecciona al menos una propiedad'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(raw_ids) > 200:
            return Response(
                {'error': 'Solo puedes actualizar hasta 200 propiedades por operación'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status not in valid_statuses:
            return Response(
                {'error': 'Estado no válido'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            property_ids = list(dict.fromkeys(int(value) for value in raw_ids))
        except (TypeError, ValueError):
            return Response(
                {'error': 'Todos los identificadores deben ser números enteros'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone
        queryset = Property.objects.filter(pk__in=property_ids)
        matched = queryset.count()
        changes = {'status': new_status, 'updated_at': timezone.now()}
        if new_status != 'inactive':
            # Putting a listing back on the market reopens it. This path uses
            # .update(), which never reaches Property.save(), so a leftover
            # closed_reason would survive and drag the row back to `inactive` on
            # the next ordinary save.
            changes['closed_reason'] = ''
            changes['closed_at'] = None
        updated = queryset.exclude(status=new_status).update(**changes)
        logger.info(
            "admin_audit action=property.bulk_status actor=%s targets=%s status=%s matched=%s updated=%s",
            request.user.pk, property_ids, new_status, matched, updated,
        )
        AdminAuditService().record(
            request, "property.bulk_status",
            target_type="property", target_label=f"{updated} propiedades",
            changes={"status": new_status, "matched": matched, "updated": updated,
                     "ids": property_ids[:50]},
        )
        return Response({'matched': matched, 'updated': updated, 'status': new_status})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Contadores livianos para el panel de propiedades del admin.

        Lo que está en la papelera no cuenta en ninguno de estos números salvo
        en el suyo propio: un inventario que suma anuncios borrados describe un
        catálogo que no existe.
        """
        base = Property.objects.filter(deleted_at__isnull=True)
        with_image_counts = base.annotate(num_images=Count('images'))
        without_images = with_image_counts.filter(num_images=0).count()
        incomplete = with_image_counts.filter(
            Q(num_images=0) | Q(description='') | Q(title='')
            | Q(area__isnull=True) | Q(area__lte=0)
        ).count()
        return Response({
            'total': base.count(),
            'for_sale': base.filter(status='for_sale').count(),
            'for_rent': base.filter(status='for_rent').count(),
            'inactive': base.filter(status='inactive').count(),
            'active': base.exclude(status='inactive').count(),
            'without_images': without_images,
            'without_location': base.filter(
                Q(latitude__isnull=True) | Q(longitude__isnull=True)
            ).count(),
            'without_price': base.filter(Q(price__isnull=True) | Q(price__lte=0)).count(),
            'duplicates': base.filter(is_duplicate=True).count(),
            'incomplete': incomplete,
            'imported': base.filter(is_imported=True).count(),
            'users': base.filter(is_imported=False, owner__isnull=False).count(),
            'trashed': Property.objects.filter(deleted_at__isnull=False).count(),
        })


class AdminAuditLogView(generics.ListAPIView):
    """La bitácora del panel: quién hizo qué, cuándo y sobre qué.

    Existía repartida en líneas de log dentro de un contenedor que se recrea en
    cada despliegue. Aquí se consulta, se filtra y se puede citar.
    """

    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminAuditLogSerializer
    pagination_class = AdminPagination

    def get_queryset(self):
        queryset = AdminAuditLog.objects.select_related('actor').order_by('-created_at')
        params = self.request.query_params

        action_filter = params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)

        target_type = params.get('target_type')
        if target_type:
            queryset = queryset.filter(target_type=target_type)

        target_id = params.get('target_id')
        if target_id:
            queryset = queryset.filter(target_id=str(target_id))

        actor = params.get('actor')
        if actor and str(actor).isdigit():
            queryset = queryset.filter(actor_id=int(actor))

        days = params.get('days')
        if days and str(days).isdigit():
            from datetime import timedelta
            queryset = queryset.filter(
                created_at__gte=timezone.now() - timedelta(days=int(days))
            )

        search = params.get('q')
        if search:
            queryset = queryset.filter(
                Q(actor_label__icontains=search)
                | Q(target_label__icontains=search)
                | Q(action__icontains=search)
            )
        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # Las acciones disponibles se sacan de lo que hay escrito, no del
        # catálogo de constantes: una acción que nunca ocurrió no merece una
        # opción en el filtro.
        response.data['actions'] = sorted(
            AdminAuditLog.objects.values_list('action', flat=True).distinct()
        )
        return response


class AdminSearchView(generics.GenericAPIView):
    """Un solo buscador para todo el panel."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        from .services.admin_search import AdminSearchService

        return Response(AdminSearchService().search(request.query_params.get('q', '')))


class AdminSeoHealthView(generics.GenericAPIView):
    """Qué páginas tiene el portal y cuáles se abren con dos anuncios más."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    # Recorre el catálogo entero varias veces y su respuesta cambia con el
    # inventario, no con el minuto. La versión en la clave la invalida en cuanto
    # se publica algo.
    CACHE_TTL = 900

    def get(self, request):
        from .services.seo_health import SeoHealthService

        if request.query_params.get('refresh') in ('1', 'true'):
            return Response(SeoHealthService().build())
        key = versioned_key('admin:seo-health')
        data = cache.get(key)
        if data is None:
            data = SeoHealthService().build()
            cache.set(key, data, self.CACHE_TTL)
        return Response(data)


class AdminExportView(generics.GenericAPIView):
    """Descarga de un conjunto del panel en CSV, transmitido fila a fila.

    Es una vista de DRF aunque lo que devuelva sea un archivo y no una
    representación negociada: así el permiso lo decide el mismo par
    `IsAuthenticated, IsAdminUser` que protege el resto del panel, en vez de una
    comprobación escrita a mano que puede divergir de él. DRF deja pasar sin
    tocarla cualquier respuesta que no sea un `Response`, que es justo lo que
    necesita `StreamingHttpResponse`.

    Autenticar por cabecera es también deliberado. Lo cómodo para una descarga
    sería un enlace con `?token=…`, porque una navegación no lleva cabeceras; y
    esa URL entera acabaría escrita en el log de acceso de nginx, donde un JWT
    válido durante horas es una credencial en claro. El cliente pide el archivo
    con fetch y lo arma en el navegador (`frontend/lib/admin-export.ts`).
    """

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, dataset):
        from django.http import StreamingHttpResponse
        from .services.exports import CsvExportService

        if dataset not in CsvExportService.DATASETS:
            raise Http404

        filename, rows = CsvExportService().rows(dataset)
        # Sacar datos personales del sistema es una acción, no una lectura:
        # queda escrita como cualquier otra.
        AdminAuditService().record(
            request, 'export.download', target_type='export', target_label=dataset,
        )
        response = StreamingHttpResponse(rows, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        # Un CSV con correos y teléfonos no se guarda en ninguna caché
        # intermedia, y menos en la del CDN.
        response['Cache-Control'] = 'no-store, private'
        return response
