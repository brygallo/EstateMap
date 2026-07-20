from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import ActivityEvent, Property, PropertyImage, Province, City, Lead, PendingPublication

User = get_user_model()


def polygon_center_lat_lng(polygon):
    """
    Return an approximate center for a normalized GeoJSON polygon or a
    ``[[lat, lng], ...]`` ring. Used so map bbox filtering can include polygon
    properties without requiring a separate point click.
    """
    if not polygon:
        return None

    ring = None
    if isinstance(polygon, dict):
        coordinates = polygon.get('coordinates') or []
        ring = coordinates[0] if coordinates else None
        points = [
            (float(lat), float(lng))
            for lng, lat in (ring or [])
            if lat is not None and lng is not None
        ]
    elif isinstance(polygon, list):
        ring = polygon
        points = [
            (float(lat), float(lng))
            for lat, lng in ring
            if lat is not None and lng is not None
        ]
    else:
        return None

    if len(points) >= 2 and points[0] == points[-1]:
        points = points[:-1]
    if not points:
        return None

    lat = sum(point[0] for point in points) / len(points)
    lng = sum(point[1] for point in points) / len(points)
    return lat, lng


def ensure_polygon_center(data):
    if data.get('polygon') and (data.get('latitude') is None or data.get('longitude') is None):
        center = polygon_center_lat_lng(data.get('polygon'))
        if center:
            if data.get('latitude') is None:
                data['latitude'] = center[0]
            if data.get('longitude') is None:
                data['longitude'] = center[1]


class CitySerializer(serializers.ModelSerializer):
    """Serializer para ciudades"""
    province_name = serializers.CharField(source='province.name', read_only=True)

    class Meta:
        model = City
        fields = ['id', 'name', 'code', 'province', 'province_name']
        read_only_fields = ['id']


class ProvinceSerializer(serializers.ModelSerializer):
    """Serializer para provincias"""
    cities = CitySerializer(many=True, read_only=True)
    cities_count = serializers.SerializerMethodField()

    class Meta:
        model = Province
        fields = ['id', 'name', 'code', 'country', 'cities', 'cities_count']
        read_only_fields = ['id']

    def get_cities_count(self, obj):
        return obj.cities.count()


class PropertyImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    file_size_kb = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'thumbnail', 'is_main', 'uploaded_at', 'file_size', 'file_size_kb', 'original_filename']
        read_only_fields = ['uploaded_at', 'file_size', 'original_filename']

    def get_image(self, obj):
        if obj.image:
            # Option 1: Direct MinIO URL (for development)
            # Return the direct URL from MinIO storage
            return obj.image.url if hasattr(obj.image, 'url') else None
        return None

    def get_thumbnail(self, obj):
        if obj.thumbnail:
            # Return the direct URL from MinIO storage
            return obj.thumbnail.url if hasattr(obj.thumbnail, 'url') else None
        return None

    def get_file_size_kb(self, obj):
        """Return file size in KB for better readability"""
        return round(obj.file_size / 1024, 2) if obj.file_size > 0 else 0


class PropertySerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    images = PropertyImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(
            max_length=100,
            allow_empty_file=False,
            use_url=False
        ),
        write_only=True,
        required=False,
        max_length=10,  # Máximo 10 imágenes por propiedad
        help_text="Máximo 10 imágenes, cada una de máximo 10MB"
    )
    images_to_delete = serializers.CharField(
        write_only=True,
        required=False,
        help_text="JSON array con IDs de imágenes a eliminar"
    )

    class Meta:
        model = Property
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'owner']

    def to_representation(self, instance):
        """Convert polygon from GeoJSON to simple array format for frontend"""
        data = super().to_representation(instance)

        # Convert polygon from GeoJSON to [[lat, lng], ...] format
        if data.get('polygon') and isinstance(data['polygon'], dict):
            if data['polygon'].get('coordinates'):
                # GeoJSON uses [lng, lat], convert to [lat, lng]
                coords = data['polygon']['coordinates'][0]
                data['polygon'] = [[coord[1], coord[0]] for coord in coords]

        # Add owner information
        if instance.owner:
            # Usar el nombre completo si está disponible, sino usar username
            full_name = f"{instance.owner.first_name} {instance.owner.last_name}".strip()
            data['owner_username'] = full_name if full_name else instance.owner.username

        return data

    def validate_uploaded_images(self, value):
        """Validate uploaded images"""
        if not value:
            return value

        # Validar número máximo de imágenes
        if len(value) > 10:
            raise serializers.ValidationError("No se pueden subir más de 10 imágenes por propiedad")

        # Validar cada imagen
        for idx, image in enumerate(value):
            # Validar tamaño (10MB máximo)
            max_size_mb = 10
            if image.size > max_size_mb * 1024 * 1024:
                size_mb = round(image.size / (1024 * 1024), 2)
                raise serializers.ValidationError(
                    f"La imagen {idx + 1} es demasiado grande ({size_mb}MB). "
                    f"El tamaño máximo permitido es {max_size_mb}MB"
                )

            # Validar formato
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if hasattr(image, 'content_type') and image.content_type not in allowed_types:
                raise serializers.ValidationError(
                    f"Formato de imagen {idx + 1} no permitido. "
                    f"Use JPEG, PNG o WebP"
                )

        return value

    def validate_polygon(self, value):
        """
        Validate and normalize the polygon to a canonical, closed GeoJSON
        ``Polygon``. Accepts a GeoJSON object or a simple ``[[lat, lng], ...]``
        ring (optionally JSON-encoded when sent via FormData). Enforces Ecuador
        bounds, ring closure and a sane area (see ``real_estate.geo``).
        """
        import json
        from .geo import validate_and_normalize_polygon, PolygonValidationError

        if not value:
            return value

        # If value is a string (from FormData), parse it first
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Formato de polígono inválido")

        try:
            return validate_and_normalize_polygon(value)
        except PolygonValidationError as exc:
            raise serializers.ValidationError(str(exc))

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        ensure_polygon_center(validated_data)
        property_instance = Property.objects.create(**validated_data)

        for idx, image in enumerate(uploaded_images):
            PropertyImage.objects.create(
                property=property_instance,
                image=image,
                is_main=(idx == 0)
            )

        return property_instance

    def update(self, instance, validated_data):
        import json

        uploaded_images = validated_data.pop('uploaded_images', [])
        images_to_delete_str = validated_data.pop('images_to_delete', None)
        if 'polygon' in validated_data and ('latitude' not in validated_data or 'longitude' not in validated_data):
            validated_data['latitude'] = None
            validated_data['longitude'] = None
        ensure_polygon_center(validated_data)

        # Update property fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Delete images if requested
        if images_to_delete_str:
            try:
                images_to_delete = json.loads(images_to_delete_str)
                if isinstance(images_to_delete, list):
                    # Delete images and their files from storage
                    images = PropertyImage.objects.filter(
                        id__in=images_to_delete,
                        property=instance
                    )
                    for img in images:
                        # Delete the actual file from storage
                        if img.image:
                            img.image.delete(save=False)
                        if img.thumbnail:
                            img.thumbnail.delete(save=False)
                        img.delete()
            except (json.JSONDecodeError, ValueError):
                pass  # Ignore invalid JSON

        # Add new images if provided
        if uploaded_images:
            # If there are no existing images, make the first one main
            has_main = instance.images.filter(is_main=True).exists()
            for idx, image in enumerate(uploaded_images):
                PropertyImage.objects.create(
                    property=instance,
                    image=image,
                    is_main=(idx == 0 and not has_main)
                )

        return instance


class MapPointPropertySerializer(serializers.ModelSerializer):
    """Payload minimo para pintar puntos/precios en el mapa."""

    class Meta:
        model = Property
        fields = [
            'id',
            'property_type',
            'status',
            'latitude',
            'longitude',
            'polygon',
            'show_measurements',
            'price',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('polygon') and isinstance(data['polygon'], dict):
            if data['polygon'].get('coordinates'):
                coords = data['polygon']['coordinates'][0]
                data['polygon'] = [[coord[1], coord[0]] for coord in coords]
        return data


class MapPropertySerializer(serializers.ModelSerializer):
    """
    Payload liviano para el mapa/listado lateral. Evita enviar descripcion,
    imagenes completas y campos de detalle por cada item del viewport.
    """
    images = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
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
            'images',
        ]

    def get_images(self, obj):
        request = self.context.get('request')
        if request and request.query_params.get('include_images') in ('0', 'false', 'False', 'no'):
            return []

        images = list(obj.images.all())
        image = next((img for img in images if img.is_main), images[0] if images else None)
        if image is None:
            return []
        return [PropertyImageSerializer(image).data]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('polygon') and isinstance(data['polygon'], dict):
            if data['polygon'].get('coordinates'):
                coords = data['polygon']['coordinates'][0]
                data['polygon'] = [[coord[1], coord[0]] for coord in coords]
        return data


class LeadSerializer(serializers.ModelSerializer):
    """
    Serializer de leads. La creación es pública (formulario de contacto); el
    ``status`` solo lo controla el dueño/admin al gestionar la bandeja.
    """
    property_title = serializers.CharField(source='property.title', read_only=True)
    property_owner = serializers.IntegerField(source='property.owner_id', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'property', 'property_title', 'property_owner',
            'name', 'phone', 'email', 'message', 'source',
            'status', 'created_at',
        ]
        read_only_fields = ['id', 'property_title', 'property_owner', 'status', 'created_at']

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value.strip()

    def validate_phone(self, value):
        if not value.strip():
            raise serializers.ValidationError("El teléfono es obligatorio.")
        return value.strip()


class LeadStatusSerializer(serializers.ModelSerializer):
    """Serializer restringido para que el dueño actualice solo el estado."""

    class Meta:
        model = Lead
        fields = ['id', 'status']
        read_only_fields = ['id']


class PendingPublicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingPublication
        fields = [
            'id', 'title', 'contact_phone', 'contact_email', 'city', 'province',
            'property_type', 'operation', 'price', 'draft', 'source', 'status',
            'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate_source(self, value):
        valid_sources = {choice[0] for choice in PendingPublication.SOURCE_CHOICES}
        return value if value in valid_sources else "other"


class PendingPublicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingPublication
        fields = ['id', 'status']
        read_only_fields = ['id']


class ActivityEventSerializer(serializers.ModelSerializer):
    user_label = serializers.SerializerMethodField()
    property_title = serializers.CharField(source='property.title', read_only=True)

    class Meta:
        model = ActivityEvent
        fields = [
            'id', 'user', 'user_label', 'session_id', 'event_name', 'path',
            'property', 'property_title', 'payload', 'created_at',
        ]
        read_only_fields = ['id', 'user', 'property', 'property_title', 'created_at']

    def get_user_label(self, obj):
        if not obj.user:
            return 'Anónimo'
        return obj.user.get_full_name().strip() or obj.user.username

    def validate_event_name(self, value):
        value = str(value).strip()[:100]
        if not value or not all(char.isalnum() or char in '_-.' for char in value):
            raise serializers.ValidationError('Nombre de evento inválido')
        return value

    def validate_payload(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('El payload debe ser un objeto')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        payload = validated_data.get('payload') or {}
        property_id = payload.get('property_id')
        validated_data['user'] = request.user if request and request.user.is_authenticated else None
        if property_id is not None:
            validated_data['property'] = Property.objects.filter(pk=property_id).first()
        return super().create(validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Return token along with basic user information."""

    # Accept an email field instead of the default username
    email = serializers.EmailField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove the username field provided by the parent serializer
        self.fields.pop('username', None)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["email"] = user.email
        token["is_staff"] = user.is_staff
        return token

    def validate(self, attrs):
        # Allow login using email instead of username
        email = attrs.get("email")
        password = attrs.get("password")

        if not email:
            raise serializers.ValidationError({"email": "Este campo es requerido"})
        if not password:
            raise serializers.ValidationError({"password": "Este campo es requerido"})

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "Correo electrónico o contraseña incorrectos"})

        # Verificar si el usuario tiene el email sin verificar
        if not user.is_active and not user.is_email_verified:
            raise serializers.ValidationError({
                "detail": "Tu cuenta no ha sido verificada. Por favor verifica tu correo electrónico.",
                "code": "email_not_verified",
                "email": email
            })

        # Replace email with the resolved username for the parent validation
        attrs["username"] = user.username
        del attrs["email"]

        try:
            data = super().validate(attrs)
        except serializers.ValidationError as e:
            # Translate any error messages to Spanish
            error_detail = str(e.detail.get('detail', '')) if hasattr(e.detail, 'get') else str(e.detail)
            if 'No active account' in error_detail or 'credentials' in error_detail:
                raise serializers.ValidationError({"detail": "Correo electrónico o contraseña incorrectos"})
            raise serializers.ValidationError({"detail": "Correo electrónico o contraseña incorrectos"})

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "avatar_url": self.user.avatar_url,
            "is_staff": self.user.is_staff,
        }
        return data


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Ya existe un usuario con este correo",
            )
        ],
    )
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
        )

    def create(self, validated_data):
        from .email_utils import create_verification_token, send_verification_email

        # Crear usuario sin activar
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=validated_data["password"],
            is_active=False,  # Usuario no activo hasta verificar email
        )

        # Crear token de verificación y enviar correo
        token = create_verification_token(user)
        send_verification_email(user, token.code)

        return user


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, max_length=6, min_length=6)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class RequestPasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )


class RequestEmailChangeSerializer(serializers.Serializer):
    new_email = serializers.EmailField(required=True)

    def validate_new_email(self, value):
        # Verificar que el nuevo email no esté en uso
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya está en uso por otra cuenta")

        # Verificar que no sea el mismo email actual
        request = self.context.get('request')
        if request and request.user.email == value:
            raise serializers.ValidationError("Este es tu correo actual. Usa uno diferente")

        return value


class VerifyEmailChangeSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, max_length=6, min_length=6)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para ver/actualizar datos básicos del usuario."""

    email = serializers.EmailField(read_only=True)
    is_email_verified = serializers.BooleanField(read_only=True)
    avatar_url = serializers.URLField(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_email_verified",
            "avatar_url",
            "is_staff",
        ]
        read_only_fields = ["id", "email", "is_email_verified", "avatar_url", "is_staff"]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña autenticado."""

    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual no es correcta")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save()
        return user


# ===== Admin Serializers =====

class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer para listar usuarios en el panel admin."""
    properties_count = serializers.SerializerMethodField()
    activity_count = serializers.SerializerMethodField()
    contact_clicks_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_email_verified', 'date_joined', 'last_login',
            'avatar_url', 'properties_count', 'activity_count', 'contact_clicks_count',
        ]
        read_only_fields = ['id', 'date_joined', 'email', 'username']

    def get_properties_count(self, obj):
        annotated = getattr(obj, 'properties_count_annotated', None)
        if annotated is not None:
            return annotated
        return obj.properties.count()

    def get_activity_count(self, obj):
        annotated = getattr(obj, 'activity_count_annotated', None)
        if annotated is not None:
            return annotated
        return obj.activity_events.count()

    def get_contact_clicks_count(self, obj):
        annotated = getattr(obj, 'contact_clicks_count_annotated', None)
        if annotated is not None:
            return annotated
        return obj.activity_events.filter(event_name='property_contact_clicked').count()


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle de usuario en el panel admin."""
    properties = PropertySerializer(many=True, read_only=True)
    properties_count = serializers.SerializerMethodField()
    activity_count = serializers.SerializerMethodField()
    contact_clicks_count = serializers.SerializerMethodField()
    recent_activity = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_email_verified', 'date_joined', 'last_login',
            'avatar_url', 'oauth_provider', 'properties_count', 'activity_count',
            'contact_clicks_count', 'recent_activity', 'properties',
        ]
        read_only_fields = ['id', 'date_joined', 'email', 'username']

    def get_properties_count(self, obj):
        return obj.properties.count()

    def get_activity_count(self, obj):
        return obj.activity_events.count()

    def get_contact_clicks_count(self, obj):
        return obj.activity_events.filter(event_name='property_contact_clicked').count()

    def get_recent_activity(self, obj):
        events = obj.activity_events.select_related('property')[:50]
        return ActivityEventSerializer(events, many=True, context=self.context).data


class AdminPropertySerializer(serializers.ModelSerializer):
    """Serializer para propiedades en el panel admin con info del owner."""
    images = PropertyImageSerializer(many=True, read_only=True)
    owner_username = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_owner_username(self, obj):
        if obj.owner:
            full_name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
            return full_name if full_name else obj.owner.username
        return None

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('polygon') and isinstance(data['polygon'], dict):
            if data['polygon'].get('coordinates'):
                coords = data['polygon']['coordinates'][0]
                data['polygon'] = [[coord[1], coord[0]] for coord in coords]
        return data


class AdminPropertyListSerializer(serializers.ModelSerializer):
    """Serializer liviano para el listado de propiedades del panel admin.

    No embebe el array completo de imágenes ni el polígono: solo un contador de
    imágenes (anotado o del prefetch) y la URL de la primera imagen.
    """
    owner_username = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            'id', 'title', 'property_type', 'status', 'price', 'city', 'address',
            'area', 'views_count', 'owner_username', 'owner_email', 'created_at',
            'image_count', 'thumbnail_url', 'is_imported', 'source_name',
        ]

    def get_owner_username(self, obj):
        if obj.owner:
            full_name = f"{obj.owner.first_name} {obj.owner.last_name}".strip()
            return full_name if full_name else obj.owner.username
        return None

    def get_owner_email(self, obj):
        return obj.owner.email if obj.owner else None

    def get_image_count(self, obj):
        annotated = getattr(obj, 'image_count_annotated', None)
        if annotated is not None:
            return annotated
        return len(obj.images.all())

    def get_thumbnail_url(self, obj):
        images = list(obj.images.all())
        if not images:
            return None
        main = next((img for img in images if img.is_main), images[0])
        source = main.thumbnail or main.image
        if source and hasattr(source, 'url'):
            return source.url
        return None

    def get_source_name(self, obj):
        return obj.source.nombre if obj.source else None


class AdminDashboardSerializer(serializers.Serializer):
    """Serializer para estadísticas del dashboard admin."""
    total_users = serializers.IntegerField()
    total_properties = serializers.IntegerField()
    properties_for_sale = serializers.IntegerField()
    properties_for_rent = serializers.IntegerField()
    properties_inactive = serializers.IntegerField()
    # --- Métricas comerciales ---
    properties_active = serializers.IntegerField()
    total_views = serializers.IntegerField()
    total_leads = serializers.IntegerField()
    leads_new = serializers.IntegerField()
    pending_publications = serializers.IntegerField()
    pending_publications_new = serializers.IntegerField()
    new_users_30d = serializers.IntegerField()
    properties_without_images = serializers.IntegerField()
    properties_incomplete = serializers.IntegerField()
    quality = serializers.JSONField()
    ingestion = serializers.JSONField()
    owner = serializers.JSONField()
    generated_at = serializers.DateTimeField()
    recent_users = AdminUserSerializer(many=True)
    recent_properties = AdminPropertyListSerializer(many=True)
    recent_leads = LeadSerializer(many=True)
