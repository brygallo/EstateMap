import json
import logging
import re

from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.urls import reverse
from django.conf import settings
from .bot_detection import is_bot_request
from .email_utils import build_resume_link
from .geo import polygon_center_lat_lng
from .models import ActivityEvent, Property, PropertyImage, Province, City, Lead, PendingPublication, PendingPublicationImage
from .validators import validate_image_dimensions, validate_image_format, validate_image_size

logger = logging.getLogger(__name__)

User = get_user_model()


# `polygon_center_lat_lng` now lives in `.geo` so that `models.py` can enforce
# the centre on save without importing this module — serializers already imports
# models, so the dependency only runs one way.
def ensure_polygon_center(data):
    if data.get('polygon') and (data.get('latitude') is None or data.get('longitude') is None):
        center = polygon_center_lat_lng(data.get('polygon'))
        if center:
            if data.get('latitude') is None:
                data['latitude'] = center[0]
            if data.get('longitude') is None:
                data['longitude'] = center[1]


def reopen_on_reactivation(validated_data):
    """Putting a listing back on the market clears why it was closed.

    `Property.save()` treats `closed_reason` as the authority: while it is set,
    the row is forced back to `inactive`. Someone switching the status selector
    from "Inactivo" to "En venta" means the listing is available again, so
    without this the change would look accepted and silently undo itself.
    """
    new_status = validated_data.get('status')
    if new_status and new_status != 'inactive' and 'closed_reason' not in validated_data:
        validated_data['closed_reason'] = ''
    return validated_data


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


def stage_property_image(property_instance, uploaded_file, idx, is_main):
    """
    Persist an upload as a pending row and hand the work to the worker.

    The row is created before the bytes reach MinIO, so the API can answer
    immediately and the client already has an id to track.

    Returns None when the file could not be staged. It does NOT raise: this runs
    inside the atomic block that created the Property, so an exception here would
    roll the whole listing back and the user would lose everything they typed
    over one unwritable file. A missing photo can be re-uploaded in seconds; a
    lost publication cannot.
    """
    from .tasks import enqueue_optimization
    from .uploads import stash_upload

    try:
        path, size = stash_upload(uploaded_file)
    except OSError:
        logger.exception(
            "Could not stage image %s for property %s; saving the listing without it",
            idx + 1,
            property_instance.pk,
        )
        return None

    image = PropertyImage.objects.create(
        property=property_instance,
        is_main=is_main,
        original_filename=uploaded_file.name or '',
        file_size=size,
        status=PropertyImage.Status.PENDING,
        pending_path=path,
    )
    enqueue_optimization(image.pk)
    return image


def validate_image_batch(images):
    """Per-image and whole-batch upload checks (PROP-026), shared by every
    entry point that stores photos — including the anonymous draft flow, which
    writes straight to storage and must enforce exactly what the authenticated
    flow enforces."""
    max_total_mb = getattr(settings, 'MAX_PROPERTY_UPLOAD_MB', 50)
    total_bytes = sum(image.size for image in images)
    if total_bytes > max_total_mb * 1024 * 1024:
        raise serializers.ValidationError(
            f"El conjunto de imágenes supera {max_total_mb}MB."
        )

    for idx, image in enumerate(images):
        max_size_mb = getattr(settings, 'MAX_IMAGE_SIZE_MB', 10)
        if image.size > max_size_mb * 1024 * 1024:
            size_mb = round(image.size / (1024 * 1024), 2)
            raise serializers.ValidationError(
                f"La imagen {idx + 1} es demasiado grande ({size_mb}MB). "
                f"El tamaño máximo permitido es {max_size_mb}MB"
            )

        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if hasattr(image, 'content_type') and image.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Formato de imagen {idx + 1} no permitido. "
                f"Use JPEG, PNG o WebP"
            )

        try:
            validate_image_size(image)
            validate_image_dimensions(image)
            validate_image_format(image)
            image.seek(0)
        except DjangoValidationError as exc:
            message = exc.messages[0] if exc.messages else str(exc)
            raise serializers.ValidationError(f"Imagen {idx + 1}: {message}")

    return images


class PropertyImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    file_size_kb = serializers.SerializerMethodField()

    class Meta:
        model = PropertyImage
        fields = [
            'id', 'image', 'thumbnail', 'is_main', 'uploaded_at',
            'file_size', 'file_size_kb', 'original_filename', 'status',
        ]
        read_only_fields = ['uploaded_at', 'file_size', 'original_filename', 'status']

    def get_image(self, obj):
        if obj.image:
            # Direct MinIO URL: the optimized master is already published.
            return obj.image.url if hasattr(obj.image, 'url') else None
        # Still queued. Serve it from local staging so the client shows the photo
        # right after upload instead of a broken image for a few seconds.
        return self._pending_url(obj)

    def get_thumbnail(self, obj):
        if obj.thumbnail:
            return obj.thumbnail.url if hasattr(obj.thumbnail, 'url') else None
        # No thumbnail exists until the worker runs; the full staged file stands
        # in for it, which is acceptable because it is short-lived.
        return self._pending_url(obj)

    def _pending_url(self, obj):
        if obj.status != PropertyImage.Status.PENDING:
            return None
        path = reverse('pending_image', kwargs={'image_id': obj.pk})
        request = self.context.get('request')
        return request.build_absolute_uri(path) if request else path

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
    # The two facts the promotion kit needs to offer a "price drop" image, and
    # nothing more: the price this listing used to ask and when it changed. Both
    # were public prices while they were current, and the whole timeline is
    # already served by the (AllowAny) `intelligence` endpoint, so this exposes
    # no fact the catalogue did not publish first — which is what SOC-001 and
    # VIS-001 actually require.
    previous_price = serializers.SerializerMethodField()
    price_changed_at = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = '__all__'
        # Aggregation, moderation and analytics fields are controlled only by
        # their dedicated admin/ingestion services, never by the public CRUD.
        read_only_fields = [
            'created_at', 'updated_at', 'owner', 'views_count',
            # The short code is printed onto promotion images and resolves a
            # public URL. Leaving it writable under fields='__all__' would let a
            # client pick its own — and squat the codes of listings it does not
            # own, since the column is unique.
            'short_code',
            # When a listing closed is sealed by the server, like the code. The
            # reason stays writable — that is the owner saying "it sold" — but
            # the date of it is not theirs to backdate.
            'closed_at',
            'source', 'source_agency', 'source_url', 'external_id',
            'is_imported', 'image_hash', 'is_duplicate',
            'imported_at', 'source_published_at',
            'source_updated_at', 'last_seen_at',
        ]

    def _price_change(self, obj):
        """The price this listing asked before the current one, and when it changed.

        `PropertyPriceHistory` is written by a post_save signal only when the
        price actually moves, so consecutive rows are consecutive asking prices.
        Reads `.all()` so a prefetch is used when the caller set one up.
        """
        history = list(obj.price_history.all())
        if len(history) < 2 or obj.price is None:
            return None, None
        latest = history[-1]
        # The newest row should be the price being asked right now. When it is
        # not — a price written straight to the column without going through
        # save() — there is no trustworthy "before", so say nothing rather than
        # print a figure onto an image that outlives the correction.
        if latest.price != obj.price:
            return None, None
        return history[-2].price, latest.recorded_at

    def get_previous_price(self, obj):
        price, _ = self._price_change(obj)
        # str(): `price` itself is rendered as a string by DRF's decimal
        # handling, and two price fields of different types in the same payload
        # is a trap for whoever compares them.
        return None if price is None else str(price)

    def get_price_changed_at(self, obj):
        _, changed_at = self._price_change(obj)
        return changed_at

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
        max_images = getattr(settings, 'MAX_IMAGES_PER_PROPERTY', 10)
        existing_count = self.instance.images.count() if self.instance else 0
        if self.instance:
            raw_deletions = self.initial_data.get('images_to_delete')
            try:
                deletion_ids = json.loads(raw_deletions) if isinstance(raw_deletions, str) else raw_deletions
            except (TypeError, ValueError, json.JSONDecodeError):
                deletion_ids = []
            if isinstance(deletion_ids, list):
                existing_count -= self.instance.images.filter(id__in=deletion_ids).count()
        if existing_count + len(value) > max_images:
            raise serializers.ValidationError(
                f"La propiedad no puede tener más de {max_images} imágenes. "
                f"Actualmente tiene {existing_count} y se intentan agregar {len(value)}."
            )

        return validate_image_batch(value)

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

    @transaction.atomic
    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        ensure_polygon_center(validated_data)
        property_instance = Property.objects.create(**validated_data)

        for idx, image in enumerate(uploaded_images):
            stage_property_image(property_instance, image, idx, is_main=(idx == 0))

        return property_instance

    @transaction.atomic
    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        images_to_delete_str = validated_data.pop('images_to_delete', None)
        reopen_on_reactivation(validated_data)
        if 'polygon' in validated_data and ('latitude' not in validated_data or 'longitude' not in validated_data):
            validated_data['latitude'] = None
            validated_data['longitude'] = None
        ensure_polygon_center(validated_data)

        # Update property fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        try:
            images_to_delete = json.loads(images_to_delete_str) if images_to_delete_str else []
        except (json.JSONDecodeError, TypeError, ValueError):
            raise serializers.ValidationError({'images_to_delete': ['La lista de imágenes a eliminar no es válida.']})
        if not isinstance(images_to_delete, list):
            raise serializers.ValidationError({'images_to_delete': ['La lista de imágenes a eliminar no es válida.']})
        deleting = list(PropertyImage.objects.filter(id__in=images_to_delete, property=instance))
        deleting_ids = {image.id for image in deleting}

        # Add new images if provided
        if uploaded_images:
            # If there are no existing images, make the first one main
            has_main = instance.images.filter(is_main=True).exclude(id__in=deleting_ids).exists()
            for idx, image in enumerate(uploaded_images):
                stage_property_image(
                    instance, image, idx, is_main=(idx == 0 and not has_main)
                )

        # Delete only after every replacement image was processed successfully.
        # Physical objects are removed after the database commit so a rollback
        # never leaves restored rows pointing at files that were already erased.
        for old_image in deleting:
            files = [
                (old_image.image.storage, old_image.image.name) if old_image.image else None,
                (old_image.thumbnail.storage, old_image.thumbnail.name) if old_image.thumbnail else None,
            ]
            old_image.delete()
            transaction.on_commit(
                lambda files=files: [storage.delete(name) for item in files if item for storage, name in [item]]
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
    resume_link = serializers.SerializerMethodField()
    draft_key = serializers.UUIDField(required=False, write_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False,
        max_length=10,
    )

    class Meta:
        model = PendingPublication
        fields = [
            'id', 'title', 'contact_phone', 'contact_email', 'city', 'province',
            'property_type', 'operation', 'price', 'draft_key', 'draft', 'uploaded_images', 'source', 'status',
            'property', 'resume_link', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'property', 'resume_link', 'created_at']
        extra_kwargs = {'draft_key': {'write_only': True}}

    def validate_source(self, value):
        valid_sources = {choice[0] for choice in PendingPublication.SOURCE_CHOICES}
        return value if value in valid_sources else "other"

    def validate_uploaded_images(self, value):
        return validate_image_batch(value)

    def get_resume_link(self, obj):
        """The live link for this request, so the tray shows what was sent."""
        token = next(
            (t for t in obj.resume_tokens.all() if t.is_valid()),
            None,
        )
        if token is None:
            return None
        return {
            'url': build_resume_link(token.token),
            'expires_at': token.expires_at,
        }

    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop('uploaded_images', [])
        draft_key = validated_data.get('draft_key')
        pending = None
        created = True
        if draft_key:
            pending = PendingPublication.objects.filter(
                draft_key=draft_key,
            ).exclude(status='converted').first()
        if pending is None:
            pending = PendingPublication.objects.create(**validated_data)
        else:
            created = False
            for field, value in validated_data.items():
                setattr(pending, field, value)
            pending.save()

        if images:
            old_images = list(pending.temporary_images.all())
            for position, image in enumerate(images):
                PendingPublicationImage.objects.create(
                    pending=pending,
                    image=image,
                    position=position,
                    original_filename=image.name,
                )
            PendingPublicationImage.objects.filter(pk__in=[image.pk for image in old_images]).delete()
            old_files = [(image.image.storage, image.image.name) for image in old_images]
            transaction.on_commit(
                lambda files=old_files: [storage.delete(name) for storage, name in files]
            )
        self.created_new = created
        return pending


class PendingPublicationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingPublication
        fields = ['id', 'status']
        read_only_fields = ['id']


class PublicationDraftSerializer(serializers.ModelSerializer):
    """
    What a resume token opens, and nothing else.

    The field list is explicit rather than ``__all__`` on purpose: this payload
    is served to an anonymous request holding a link that gets forwarded through
    chats, so its scope has to stay exactly the work that person already typed.
    """
    temporary_images = serializers.SerializerMethodField()

    class Meta:
        model = PendingPublication
        fields = [
            'title', 'contact_phone', 'contact_email', 'city', 'province',
            'property_type', 'operation', 'price', 'draft', 'temporary_images',
        ]
        read_only_fields = fields

    def get_temporary_images(self, obj):
        request = self.context.get('request')
        return [
            {
                'id': image.pk,
                'url': request.build_absolute_uri(image.image.url) if request else image.image.url,
                'name': image.original_filename,
            }
            for image in obj.temporary_images.all()
        ]


class OwnerTransferSerializer(serializers.Serializer):
    """Target of an ownership transfer: an existing account, or an address."""

    user_id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)

    def validate(self, attrs):
        if not attrs.get('user_id') and not attrs.get('email'):
            raise serializers.ValidationError(
                'Indica user_id o email de la cuenta que recibe la propiedad.'
            )
        return attrs


# The ficha URL, which is where a shared link lands after /p/<code> redirects.
PROPERTY_PATH_RE = re.compile(r'^/propiedad/(\d+)(?:[/?#]|$)')


def _coerce_id(value):
    """A primary key, or None. Never an exception: this runs on public input."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _property_id_from_path(path):
    match = PROPERTY_PATH_RE.match(str(path))
    return int(match.group(1)) if match else None


class ActivityEventSerializer(serializers.ModelSerializer):
    user_label = serializers.SerializerMethodField()
    property_title = serializers.CharField(source='property.title', read_only=True)

    class Meta:
        model = ActivityEvent
        fields = [
            'id', 'user', 'user_label', 'session_id', 'event_name', 'path',
            'property', 'property_title', 'payload', 'is_bot', 'created_at',
        ]
        # `is_bot` is read-only on purpose: it is decided server-side from the
        # User-Agent, so a client can never declare itself human.
        read_only_fields = ['id', 'user', 'property', 'property_title', 'is_bot', 'created_at']

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
        validated_data['user'] = request.user if request and request.user.is_authenticated else None
        # Flag crawlers from the User-Agent, ignoring anything the client sent.
        # The event is still stored so bot traffic can be graphed on its own.
        validated_data['is_bot'] = is_bot_request(request)

        property_id = _coerce_id(payload.get('property_id'))
        if property_id is None:
            # A page view of a ficha carries no property_id — it is fired by the
            # generic page-view beacon, which only knows the URL. Reading the id
            # off the path is what lets an arrival be attributed to the listing
            # it arrived at, and an arrival is precisely what the promotion
            # report of SOC-101 counts.
            property_id = _property_id_from_path(validated_data.get('path') or '')
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
        return obj.activity_events.filter(is_bot=False).count()

    def get_contact_clicks_count(self, obj):
        annotated = getattr(obj, 'contact_clicks_count_annotated', None)
        if annotated is not None:
            return annotated
        return obj.activity_events.filter(
            event_name='property_contact_clicked', is_bot=False
        ).count()


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
        return obj.activity_events.filter(is_bot=False).count()

    def get_contact_clicks_count(self, obj):
        return obj.activity_events.filter(
            event_name='property_contact_clicked', is_bot=False
        ).count()

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

    def update(self, instance, validated_data):
        return super().update(instance, reopen_on_reactivation(validated_data))

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
