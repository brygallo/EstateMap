from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Property, PropertyImage

User = get_user_model()


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

        # Add owner username
        if instance.owner:
            data['owner_username'] = instance.owner.username

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
        """Convert polygon from simple array format to GeoJSON"""
        import json

        if not value:
            return value

        # If value is a string (from FormData), parse it first
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid polygon format")

        # If it's already a GeoJSON object, return as is
        if isinstance(value, dict) and value.get('type') == 'Polygon':
            return value

        # If it's a simple array [[lat, lng], ...], convert to GeoJSON
        if isinstance(value, list) and len(value) >= 3:
            # Convert [lat, lng] to [lng, lat] for GeoJSON format
            geojson_coords = [[coord[1], coord[0]] for coord in value]
            return {
                'type': 'Polygon',
                'coordinates': [geojson_coords]
            }

        return value

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        property_instance = Property.objects.create(**validated_data)

        for idx, image in enumerate(uploaded_images):
            PropertyImage.objects.create(
                property=property_instance,
                image=image,
                is_main=(idx == 0)
            )

        return property_instance

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])

        # Update property fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

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
            raise serializers.ValidationError({"detail": "No se encontró una cuenta con este correo electrónico"})

        # Replace email with the resolved username for the parent validation
        attrs["username"] = user.username
        del attrs["email"]

        try:
            data = super().validate(attrs)
        except serializers.ValidationError as e:
            # If parent validation fails, it's likely due to incorrect password
            raise serializers.ValidationError({"detail": "Correo electrónico o contraseña incorrectos"})

        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
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
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=validated_data["password"],
        )
        return user

