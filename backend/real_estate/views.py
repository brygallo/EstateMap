import logging
from rest_framework import viewsets, generics, status, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q, F, Count, Sum, Avg, Min, Max, FloatField, ExpressionWrapper, Prefetch
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.settings import api_settings
from django.http import HttpResponse, Http404
from django.views import View
from django.conf import settings
from .models import ActivityEvent, Property, PropertyImage, Province, City, Lead, PendingPublication
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
from .permissions import IsOwnerOrReadOnly, IsAdminUser
from .services.map_payload import build_map_payload
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

logger = logging.getLogger(__name__)


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

    @action(detail=True, methods=['get'])
    def cities(self, request, pk=None):
        """Obtener todas las ciudades de una provincia"""
        province = self.get_object()
        cities = province.cities.all()
        serializer = CitySerializer(cities, many=True)
        return Response(serializer.data)


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

class PropertyPagination(PageNumberPagination):
    """
    Paginación para el listado de propiedades del mapa. El cliente puede pedir
    ``?page_size=N`` (por ejemplo el sitemap/SEO pide un tamaño grande para
    recuperar todo de una vez).
    """
    page_size = 300
    page_size_query_param = 'page_size'
    max_page_size = 2000


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


class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = PropertyPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return MapPropertySerializer
        return super().get_serializer_class()

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

        bbox = params.get('bbox')
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
                        ),
                    )
                )

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        """Devuelve el detalle e incrementa el contador de vistas de forma atómica."""
        instance = self.get_object()
        Property.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        instance.views_count = (instance.views_count or 0) + 1
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def intelligence(self, request, pk=None):
        """Contexto comercial de un anuncio frente a inventario comparable real."""
        from django.utils import timezone

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
        contacts = instance.activity_events.filter(event_name='property_contact_clicked').count()
        history = list(instance.price_history.values('price', 'recorded_at'))
        if not history and instance.price is not None:
            history = [{'price': instance.price, 'recorded_at': instance.created_at}]

        publication_start = instance.source_published_at or instance.imported_at or instance.created_at
        publication_basis = 'source' if instance.source_published_at else ('detected' if instance.is_imported else 'platform')
        return Response({
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
        })

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
        # En cualquier zoom de agrupación (zoom < 11.5) el clustering se calcula
        # sobre TODO el dataset filtrado, ignorando el bbox del viewport. Así los
        # centroides son estables y los agrupadores no "caminan" al panear. El
        # bbox sólo se usa para recortar la salida de la grilla (ver viewport).
        cluster_zoom = zoom < 11.5
        self._ignore_map_bbox = cluster_zoom
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
        max_items = int(request.query_params.get('limit') or 1000)
        viewport = _parse_bbox(request.query_params.get('bbox')) if cluster_zoom else None
        return Response(build_map_payload(queryset, zoom, max_items, viewport=viewport))

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
        rows = (
            Property.objects.exclude(status='inactive')
            .values('province', 'city')
            .distinct()
        )
        provinces = {}
        for row in rows:
            prov = (row['province'] or '').strip()
            city = (row['city'] or '').strip()
            if not prov:
                continue
            bucket = provinces.setdefault(prov, set())
            if city:
                bucket.add(city)
        result = [
            {'province': prov, 'cities': sorted(cities)}
            for prov, cities in sorted(provinces.items(), key=lambda kv: kv[0].lower())
        ]
        return Response(result)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_properties(self, request):
        """Get only the properties owned by the current user (including inactive)"""
        properties = Property.objects.filter(owner=request.user)
        serializer = self.get_serializer(properties, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_image(self, request, pk=None):
        """Delete a specific image from a property"""
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
        try:
            from .email_utils import send_lead_notification
            send_lead_notification(lead)
        except Exception as exc:
            print(f"Error notifying lead: {exc}")


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
        queryset = PendingPublication.objects.all().order_by('-created_at')
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
        try:
            from .email_utils import send_pending_publication_notification
            send_pending_publication_notification(pending)
        except Exception as exc:
            print(f"Error notifying pending publication: {exc}")


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
        if user_id and str(user_id).isdigit():
            queryset = queryset.filter(user_id=user_id)
        if property_id and str(property_id).isdigit():
            queryset = queryset.filter(property_id=property_id)
        if event_name:
            queryset = queryset.filter(event_name=event_name)
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

            # Obtener datos del usuario desde Google
            email = idinfo.get('email')
            google_id = idinfo.get('sub')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')
            picture = idinfo.get('picture', '')

            if not email:
                return Response(
                    {'error': 'Email no proporcionado por Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            User = get_user_model()

            # Buscar usuario por oauth_id o email
            user = None
            try:
                user = User.objects.get(oauth_id=google_id)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(email=email)
                    # Conectar cuenta OAuth a usuario existente
                    user.oauth_provider = 'google'
                    user.oauth_id = google_id
                    user.avatar_url = picture
                    user.is_email_verified = True
                    user.save()
                except User.DoesNotExist:
                    # Crear nuevo usuario
                    username = email.split('@')[0]
                    counter = 1
                    original_username = username
                    while User.objects.filter(username=username).exists():
                        username = f"{original_username}{counter}"
                        counter += 1

                    user = User.objects.create(
                        username=username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        oauth_provider='google',
                        oauth_id=google_id,
                        avatar_url=picture,
                        is_email_verified=True,
                    )
                    # No se requiere contraseña para usuarios OAuth
                    user.set_unusable_password()
                    user.save()

            # Generar JWT tokens
            refresh = RefreshToken.for_user(user)
            refresh["username"] = user.username
            refresh["email"] = user.email
            refresh["is_staff"] = user.is_staff

            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
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

        except ValueError as e:
            return Response(
                {'error': f'Token de Google inválido: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error al procesar login con Google: {str(e)}'},
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
        return Response({'message': 'Contraseña actualizada correctamente'}, status=status.HTTP_200_OK)


# ===== Admin Views =====

User = get_user_model()


class MarketStatsView(generics.GenericAPIView):
    """Indicadores públicos calculados únicamente con inventario activo real."""

    permission_classes = [AllowAny]

    def get(self, request):
        from collections import defaultdict
        from datetime import timedelta
        from django.utils import timezone

        all_base = Property.objects.exclude(status='inactive').filter(
            area__gt=0,
            price__gt=0,
            is_duplicate=False,
        ).annotate(
            price_per_m2=ExpressionWrapper(F('price') / F('area'), output_field=FloatField())
        ).filter(price_per_m2__gt=1, price_per_m2__lt=10000)
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
            'views_count', 'price_per_m2',
        ))
        market_days = []
        demand = defaultdict(lambda: {'supply': 0, 'views': 0})
        city_periods = defaultdict(lambda: {'recent': [], 'previous': []})
        sector_stats = defaultdict(list)
        for row in active_rows:
            # El catálogo aquí es activo: su permanencia continúa hasta hoy.
            market_days.append(max(0, (now - row['created_at']).days))
            city = (row['city'] or 'Sin ciudad').strip()
            demand[city]['supply'] += 1
            demand[city]['views'] += row['views_count'] or 0
            age = now - row['created_at']
            if age <= timedelta(days=90):
                city_periods[city]['recent'].append(row['price_per_m2'])
            elif age <= timedelta(days=180):
                city_periods[city]['previous'].append(row['price_per_m2'])
            # `address` es el nivel geográfico más fino disponible actualmente.
            sector = (row['address'] or '').split(',')[0].strip()
            if sector and sector.lower() != city.lower():
                sector_stats[(city, sector)].append(row['price_per_m2'])

        evolution = []
        for city, periods in city_periods.items():
            if len(periods['recent']) < 2 or len(periods['previous']) < 2:
                continue
            recent = sum(periods['recent']) / len(periods['recent'])
            previous = sum(periods['previous']) / len(periods['previous'])
            evolution.append({'city': city, 'current_price_m2': recent, 'previous_price_m2': previous,
                              'change_pct': round((recent - previous) / previous * 100, 1) if previous else 0})
        evolution.sort(key=lambda row: row['change_pct'], reverse=True)
        supply_demand = [
            {'city': city, **values, 'demand_per_listing': round(values['views'] / values['supply'], 1)}
            for city, values in demand.items() if values['supply'] >= 3
        ]
        supply_demand.sort(key=lambda row: row['demand_per_listing'], reverse=True)
        by_sector = [
            {'city': city, 'sector': sector, 'count': len(values), 'avg_price_m2': sum(values) / len(values)}
            for (city, sector), values in sector_stats.items() if len(values) >= 2
        ]
        by_sector.sort(key=lambda row: (-row['count'], row['city'], row['sector']))

        return Response({
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
            'supply_demand': supply_demand[:15],
            'estimated_market_days': round(sum(market_days) / len(market_days)) if market_days else 0,
            'outliers_excluded': outliers_excluded,
            'methodology': 'Propiedades en venta activas con precio y área válidos. Los extremos se excluyen con el método IQR; evolución compara altas de los últimos 90 días con los 90 anteriores y demanda usa visualizaciones por anuncio.',
        })


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
            activity_count_annotated=Count('activity_events', distinct=True),
            contact_clicks_count_annotated=Count(
                'activity_events',
                filter=Q(activity_events__event_name='property_contact_clicked'),
                distinct=True,
            ),
        ).order_by('-date_joined')

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
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']
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

    def destroy(self, request, *args, **kwargs):
        prop = self.get_object()
        target_id = prop.pk
        prop.delete()
        logger.info(
            "admin_audit action=property.delete actor=%s target_property=%s",
            request.user.pk, target_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Contadores livianos para el panel de propiedades del admin."""
        base = Property.objects.all()
        without_images = (
            base.annotate(num_images=Count('images')).filter(num_images=0).count()
        )
        return Response({
            'total': base.count(),
            'for_sale': base.filter(status='for_sale').count(),
            'for_rent': base.filter(status='for_rent').count(),
            'inactive': base.filter(status='inactive').count(),
            'active': base.exclude(status='inactive').count(),
            'without_images': without_images,
            'imported': base.filter(is_imported=True).count(),
            'users': base.filter(is_imported=False, owner__isnull=False).count(),
        })
