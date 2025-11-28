from rest_framework import viewsets, generics, status, filters
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.settings import api_settings
from django.http import HttpResponse, Http404
from django.views import View
from django.conf import settings
from .models import Property, PropertyImage, Province, City
from django.contrib.auth import get_user_model
from .serializers import (
    PropertySerializer,
    PropertyImageSerializer,
    ProvinceSerializer,
    CitySerializer,
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
)
from .permissions import IsOwnerOrReadOnly
import requests


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

class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        """
        Filtrar propiedades según el usuario:
        - Todos los usuarios: solo propiedades activas (status != 'inactive')
        - Las propiedades inactivas solo se ven en el endpoint /my_properties/
        """
        queryset = Property.objects.all()

        # Excluir propiedades inactivas del mapa para todos los usuarios
        queryset = queryset.exclude(status='inactive')

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

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


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


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
