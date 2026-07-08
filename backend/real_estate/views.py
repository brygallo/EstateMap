from rest_framework import viewsets, generics, status, filters
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, F, Count, Sum, Prefetch
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
from .models import Property, PropertyImage, Province, City, Lead, PendingPublication
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
    AdminDashboardSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsAdminUser
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


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
            if params.get('page_size') != '1':
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

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        user = self.request.user
        if user and user.is_authenticated and user.is_staff:
            return PendingPublication.objects.all()
        return PendingPublication.objects.none()

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


class AdminDashboardView(generics.GenericAPIView):
    """Dashboard con estadísticas del sistema."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminDashboardSerializer

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

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
            'recent_users': AdminUserSerializer(
                User.objects.order_by('-date_joined')[:5], many=True
            ).data,
            'recent_properties': AdminPropertySerializer(
                Property.objects.order_by('-created_at')[:5], many=True
            ).data,
            'recent_leads': LeadSerializer(
                Lead.objects.select_related('property')[:5], many=True
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

        serializer = self.get_serializer(user)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'No puedes eliminar tu propia cuenta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.delete()
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
    http_method_names = ['get', 'delete', 'head', 'options']

    def destroy(self, request, *args, **kwargs):
        prop = self.get_object()
        prop.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
