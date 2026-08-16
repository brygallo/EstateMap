import json
import logging
import math
import hashlib
from rest_framework import viewsets, generics, status, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q, F, Count, Sum, Avg, Min, Max, Value, FloatField, ExpressionWrapper, Prefetch
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
from .cache_utils import versioned_key
from .services.short_codes import normalize_code
from .models import (
    ActivityEvent, Property, PropertyImage, Province, City, Lead,
    PendingPublication, PublicationResumeToken, SystemIncident,
)
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
        data = cache.get(key)
        if data is None:
            data = list(super().list(request, *args, **kwargs).data)
            cache.set(key, data, CACHE_TTL_GEO)
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
        data = cache.get(cache_key)
        if data is None:
            response = super().list(request, *args, **kwargs)
            # Pagination returns a dict; an unpaginated response is a ReturnList.
            data = dict(response.data) if isinstance(response.data, dict) else list(response.data)
            cache.set(cache_key, data, CACHE_TTL_PROPERTY_LIST)
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
            'demand': {'level': demand_level, 'views': instance.views_count, 'contacts': contacts,
                       'city_median_views': demand_median},
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
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=cache_ttl)

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
        # Territorial clusters intentionally receive the full filtered queryset;
        # point mode was already clipped by get_queryset() using the visible bbox.
        payload = build_map_payload(queryset, payload_zoom, max_items)
        if _is_public_read(request):
            cache.set(cache_key, payload, cache_ttl)
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
        return queryset


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

        response = FileResponse(path.open("rb"))
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
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_MARKET_STATS)

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
            'id', 'city', 'address', 'property_type', 'created_at', 'last_seen_at',
            'price_per_m2',
        ))
        market_days = []
        city_periods = defaultdict(lambda: {'recent': [], 'previous': []})
        # Sectors come from free-text addresses, so casing varies ("Puembo" vs
        # "PUEMBO"): group case-insensitively and display the most common form.
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
            # `address` is currently the finest available geographic level.
            sector = (row['address'] or '').split(',')[0].strip()
            if sector and sector.lower() != city.lower():
                entry = sector_stats[(city, sector.casefold())]
                entry['names'][sector] += 1
                entry['values'].append(row['price_per_m2'])

        evolution = []
        for city, periods in city_periods.items():
            if len(periods['recent']) < 2 or len(periods['previous']) < 2:
                continue
            recent = sum(periods['recent']) / len(periods['recent'])
            previous = sum(periods['previous']) / len(periods['previous'])
            evolution.append({'city': city, 'current_price_m2': recent, 'previous_price_m2': previous,
                              'change_pct': round((recent - previous) / previous * 100, 1) if previous else 0})
        evolution.sort(key=lambda row: row['change_pct'], reverse=True)
        by_sector = [
            {
                'city': city,
                'sector': entry['names'].most_common(1)[0][0],
                'count': len(entry['values']),
                'avg_price_m2': sum(entry['values']) / len(entry['values']),
            }
            for (city, _sector_key), entry in sector_stats.items() if len(entry['values']) >= 2
        ]
        by_sector.sort(key=lambda row: (-row['count'], row['city'], row['sector']))

        payload = {
            'overall': overall,
            'by_city': grouped('city', 'province', limit=15),
            'by_property_type': grouped('property_type', limit=8),
            'by_operation': list(
                all_base.values('status').annotate(
                    count=Count('id'),
                    avg_price_m2=Avg('price_per_m2'),
                    avg_price=Avg('price'),
                    avg_area=Avg('area'),
                ).order_by('-count')
            ),
            'by_sector': by_sector[:20],
            'evolution': evolution[:15],
            'growth_zones': [row for row in evolution if row['change_pct'] > 0][:8],
            'estimated_market_days': round(sum(market_days) / len(market_days)) if market_days else 0,
            'outliers_excluded': outliers_excluded,
            'methodology': 'Propiedades en venta activas con precio y área válidos. Los extremos se excluyen con el método IQR; evolución compara altas de los últimos 90 días con los 90 anteriores.',
        }
        if _is_public_read(request):
            cache.set(cache_key, payload, CACHE_TTL_MARKET_STATS)
        return _public_response(payload, request, s_maxage=CACHE_TTL_MARKET_STATS)


class AdminDashboardView(generics.GenericAPIView):
    """Dashboard con estadísticas del sistema."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminDashboardSerializer

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from ingesta.models import Fuente, IngestaRun, ListingRetirada
        from .services.admin_metrics import AdminMetricsService

        properties = Property.objects.all()
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
            'owner': AdminMetricsService(now=now).build(),
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
        }
        return Response(data)


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
        components["images"] = {
            "status": "error" if failed_images else "stale" if old_pending_images else "healthy",
            "label": "Procesamiento de imágenes",
            "failed": failed_images,
            "pending_old": old_pending_images,
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

        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'No puedes eliminar tu propia cuenta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        target_id = user.pk
        user.delete()
        logger.info(
            "admin_audit action=user.delete actor=%s target_user=%s",
            request.user.pk, target_id,
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
        prop = self.get_object()
        target_id = prop.pk
        prop.delete()
        logger.info(
            "admin_audit action=property.delete actor=%s target_property=%s",
            request.user.pk, target_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        return Response({'matched': matched, 'updated': updated, 'status': new_status})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Contadores livianos para el panel de propiedades del admin."""
        base = Property.objects.all()
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
        })
