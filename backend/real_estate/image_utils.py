import os
from dataclasses import dataclass
from io import BytesIO

from django.conf import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError


@dataclass
class ProcessedImage:
    image: InMemoryUploadedFile
    thumbnail: InMemoryUploadedFile
    original_size: int
    preserved: bool


class ImageOptimizationService:
    """Apply adaptive, quality-first image optimization and thumbnailing."""

    LOSSY_FORMATS = {"JPEG", "WEBP"}
    EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
    CONTENT_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}

    def __init__(
        self,
        max_width=None,
        max_height=None,
        quality=None,
        thumbnail_size=None,
        thumbnail_quality=None,
        preserve_max_bytes=None,
        minimum_savings_ratio=None,
    ):
        config = getattr(settings, "IMAGE_OPTIMIZATION", {})
        self.max_width = max_width if max_width is not None else config.get("MAX_WIDTH", 1920)
        self.max_height = max_height if max_height is not None else config.get("MAX_HEIGHT", 1920)
        self.quality = quality if quality is not None else config.get("QUALITY", 88)
        self.thumbnail_size = (
            thumbnail_size
            if thumbnail_size is not None
            else config.get("THUMBNAIL_SIZE", (640, 640))
        )
        self.thumbnail_quality = (
            thumbnail_quality
            if thumbnail_quality is not None
            else config.get("THUMBNAIL_QUALITY", 82)
        )
        self.preserve_max_bytes = (
            preserve_max_bytes
            if preserve_max_bytes is not None
            else config.get("PRESERVE_MAX_BYTES", 512 * 1024)
        )
        self.minimum_savings_ratio = (
            minimum_savings_ratio
            if minimum_savings_ratio is not None
            else config.get("MINIMUM_SAVINGS_RATIO", 0.12)
        )

    def process(self, image_field):
        """Return a quality-preserving master plus a thumbnail from one decode."""
        original_bytes = self._read(image_field)
        image = self._decode(original_bytes)
        source_format = (image.format or "").upper()
        sensitive_metadata = self._has_sensitive_metadata(image)
        image = ImageOps.exif_transpose(image)
        image.load()
        prefer_lossless = source_format == "PNG"

        within_dimensions = image.width <= self.max_width and image.height <= self.max_height
        preserve = (
            within_dimensions
            and len(original_bytes) <= self.preserve_max_bytes
            and source_format in self.EXTENSIONS
            and not sensitive_metadata
        )

        if preserve:
            master = self._uploaded_file(
                original_bytes,
                self._normalized_name(image_field.name, source_format),
                source_format,
            )
        else:
            master_image = image.copy()
            if not within_dimensions:
                master_image.thumbnail((self.max_width, self.max_height), Image.Resampling.LANCZOS)
            encoded = self._encode(
                master_image,
                "WEBP",
                self.quality,
                image.info,
                lossless=prefer_lossless,
            )
            savings_ratio = 1 - (len(encoded) / len(original_bytes)) if original_bytes else 0
            can_keep_original = (
                within_dimensions and source_format in self.EXTENSIONS and not sensitive_metadata
            )
            if can_keep_original and savings_ratio < self.minimum_savings_ratio:
                preserve = True
                master = self._uploaded_file(
                    original_bytes,
                    self._normalized_name(image_field.name, source_format),
                    source_format,
                )
            else:
                master = self._uploaded_file(
                    encoded,
                    self._replace_extension(image_field.name, ".webp"),
                    "WEBP",
                )

        thumbnail_image = image.copy()
        thumbnail_image.thumbnail(self.thumbnail_size, Image.Resampling.LANCZOS)
        thumbnail_bytes = self._encode(
            thumbnail_image,
            "WEBP",
            self.thumbnail_quality,
            image.info,
            lossless=prefer_lossless,
        )
        thumbnail = self._uploaded_file(
            thumbnail_bytes,
            self._thumbnail_name(image_field.name),
            "WEBP",
        )
        return ProcessedImage(
            image=master,
            thumbnail=thumbnail,
            original_size=len(original_bytes),
            preserved=preserve,
        )

    def optimize(self, image_field):
        return self.process(image_field).image

    def create_thumbnail(self, image_field):
        return self.process(image_field).thumbnail

    @staticmethod
    def _read(image_field):
        image_field.seek(0)
        content = image_field.read()
        image_field.seek(0)
        if not content:
            raise ValueError("The uploaded image is empty.")
        return content

    @staticmethod
    def _decode(content):
        try:
            image = Image.open(BytesIO(content))
            if image.width * image.height > 64_000_000:
                raise ValueError("The image exceeds the 64 megapixel safety limit.")
            return image
        except (UnidentifiedImageError, OSError) as exc:
            raise ValueError("The uploaded file is not a readable image.") from exc

    @staticmethod
    def _prepare_for_webp(image):
        if image.mode in ("RGBA", "LA"):
            return image.convert("RGBA")
        if image.mode == "P":
            return image.convert("RGBA" if "transparency" in image.info else "RGB")
        if image.mode != "RGB":
            return image.convert("RGB")
        return image

    @staticmethod
    def _has_sensitive_metadata(image):
        try:
            exif = image.getexif()
            return bool(exif.get_ifd(0x8825))
        except (AttributeError, KeyError, TypeError):
            return False

    def _encode(self, image, output_format, quality, source_info, lossless=False):
        output = BytesIO()
        prepared = self._prepare_for_webp(image)
        save_kwargs = {
            "format": output_format,
            "quality": quality,
            "method": 6,
            "optimize": True,
            "lossless": lossless,
        }
        icc_profile = source_info.get("icc_profile")
        if icc_profile:
            save_kwargs["icc_profile"] = icc_profile
        prepared.save(output, **save_kwargs)
        return output.getvalue()

    def _uploaded_file(self, content, name, image_format):
        stream = BytesIO(content)
        return InMemoryUploadedFile(
            stream,
            "ImageField",
            name,
            self.CONTENT_TYPES[image_format],
            len(content),
            None,
        )

    def _normalized_name(self, name, image_format):
        return self._replace_extension(name, self.EXTENSIONS[image_format])

    @staticmethod
    def _replace_extension(name, extension):
        stem = os.path.splitext(name or "property-image")[0]
        return f"{stem}{extension}"

    def _thumbnail_name(self, name):
        stem = os.path.splitext(name or "property-image")[0]
        return f"{stem}_thumb.webp"


def optimize_image(image_field, **kwargs):
    """Compatibility wrapper around the adaptive optimizer."""
    kwargs.pop("format", None)
    return ImageOptimizationService(**kwargs).optimize(image_field)


def create_thumbnail(image_field, size=(640, 640), quality=82):
    """Compatibility wrapper around adaptive thumbnail generation."""
    return ImageOptimizationService(
        thumbnail_size=size,
        thumbnail_quality=quality,
    ).create_thumbnail(image_field)


def validate_image_size(image_field, max_size_mb=5):
    try:
        return image_field.size <= max_size_mb * 1024 * 1024
    except (AttributeError, TypeError):
        return False


def get_image_dimensions(image_field):
    try:
        image_field.seek(0)
        image = Image.open(image_field)
        dimensions = image.size
        image_field.seek(0)
        return dimensions
    except (UnidentifiedImageError, OSError, AttributeError):
        return (0, 0)


def calculate_compression_savings(original_size, compressed_size):
    if original_size == 0:
        return 0
    return round(((original_size - compressed_size) / original_size) * 100, 2)
