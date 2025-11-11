from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Property, PropertyImage

User = get_user_model()


class PropertyImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'is_main', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_image(self, obj):
        if obj.image:
            # Use Django proxy to serve images (avoids CORS issues)
            # The proxy will fetch from MinIO internally
            request = self.context.get('request')
            if request:
                # Build full URL with the request's host
                return request.build_absolute_uri(f"/api/media/{obj.image.name}")
            # Fallback for cases without request context
            return f"http://localhost:8000/api/media/{obj.image.name}"
        return None


class PropertySerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    images = PropertyImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
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

