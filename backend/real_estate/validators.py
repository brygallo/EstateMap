"""
Validadores personalizados para el modelo de propiedades
"""
from django.core.exceptions import ValidationError
from django.core.files.images import get_image_dimensions


def validate_image_size(image):
    """
    Valida que el tamaño de la imagen no exceda 10MB
    """
    max_size_mb = 10
    if image.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f'El tamaño de la imagen no puede exceder {max_size_mb}MB. Tamaño actual: {round(image.size / (1024 * 1024), 2)}MB')


def validate_image_dimensions(image):
    """
    Valida que las dimensiones de la imagen sean razonables
    Mínimo: 200x200px
    Máximo: 8000x8000px
    """
    try:
        width, height = get_image_dimensions(image)

        if width < 200 or height < 200:
            raise ValidationError(f'La imagen debe tener al menos 200x200 píxeles. Dimensiones actuales: {width}x{height}px')

        if width > 8000 or height > 8000:
            raise ValidationError(f'La imagen no puede exceder 8000x8000 píxeles. Dimensiones actuales: {width}x{height}px')

    except Exception as e:
        raise ValidationError(f'Error validando dimensiones de imagen: {str(e)}')


def validate_image_format(image):
    """
    Valida que el formato de la imagen sea permitido
    """
    allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
    ext = image.name.split('.')[-1].lower()

    if ext not in allowed_extensions:
        raise ValidationError(f'Formato de imagen no permitido. Use: {", ".join(allowed_extensions)}. Formato actual: {ext}')
