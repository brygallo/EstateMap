"""
Utilidades para optimización y compresión de imágenes
Reduce el tamaño de las imágenes sin perder calidad significativa
"""
from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys


def optimize_image(image_field, max_width=1920, max_height=1920, quality=85, format='WEBP'):
    """
    Optimiza una imagen redimensionándola y comprimiéndola

    Args:
        image_field: Django ImageField o archivo de imagen
        max_width: Ancho máximo en píxeles (default: 1920px)
        max_height: Alto máximo en píxeles (default: 1920px)
        quality: Calidad de compresión 1-100 (default: 85 - excelente balance)
        format: Formato de salida (default: WEBP - mejor compresión)

    Returns:
        InMemoryUploadedFile optimizado
    """
    try:
        # Abrir la imagen
        img = Image.open(image_field)

        # Convertir RGBA a RGB si es necesario (para JPEG/WEBP)
        if img.mode in ('RGBA', 'LA', 'P'):
            # Crear fondo blanco
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Obtener dimensiones originales
        original_width, original_height = img.size

        # Calcular nuevas dimensiones manteniendo aspect ratio
        if original_width > max_width or original_height > max_height:
            # Calcular ratio
            ratio = min(max_width / original_width, max_height / original_height)
            new_width = int(original_width * ratio)
            new_height = int(original_height * ratio)

            # Redimensionar con alta calidad (LANCZOS es el mejor filtro)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Optimizar la imagen
        output = BytesIO()

        # Configuración según formato
        save_kwargs = {
            'format': format,
            'quality': quality,
            'optimize': True,
        }

        if format == 'WEBP':
            save_kwargs['method'] = 6  # Mejor compresión para WebP
        elif format == 'JPEG':
            save_kwargs['progressive'] = True  # JPEG progresivo
            save_kwargs['subsampling'] = 0  # Mejor calidad de color

        # Guardar imagen optimizada
        img.save(output, **save_kwargs)
        output.seek(0)

        # Determinar extensión del archivo
        original_name = image_field.name
        name_without_ext = '.'.join(original_name.split('.')[:-1])
        extension = format.lower()
        new_name = f"{name_without_ext}.{extension}"

        # Crear nuevo archivo
        optimized_image = InMemoryUploadedFile(
            output,
            'ImageField',
            new_name,
            f'image/{extension}',
            sys.getsizeof(output),
            None
        )

        return optimized_image

    except Exception as e:
        print(f"Error optimizando imagen: {str(e)}")
        # Si hay error, devolver la imagen original
        return image_field


def create_thumbnail(image_field, size=(400, 400), quality=80):
    """
    Crea un thumbnail de la imagen

    Args:
        image_field: Django ImageField o archivo de imagen
        size: Tupla (width, height) para el thumbnail
        quality: Calidad de compresión

    Returns:
        InMemoryUploadedFile del thumbnail
    """
    try:
        img = Image.open(image_field)

        # Convertir a RGB si es necesario
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Crear thumbnail manteniendo aspect ratio
        img.thumbnail(size, Image.Resampling.LANCZOS)

        # Guardar thumbnail
        output = BytesIO()
        img.save(output, format='WEBP', quality=quality, optimize=True, method=6)
        output.seek(0)

        # Crear nombre del archivo
        original_name = image_field.name
        name_without_ext = '.'.join(original_name.split('.')[:-1])
        new_name = f"{name_without_ext}_thumb.webp"

        thumbnail = InMemoryUploadedFile(
            output,
            'ImageField',
            new_name,
            'image/webp',
            sys.getsizeof(output),
            None
        )

        return thumbnail

    except Exception as e:
        print(f"Error creando thumbnail: {str(e)}")
        return None


def validate_image_size(image_field, max_size_mb=5):
    """
    Valida que el tamaño de la imagen no exceda el límite

    Args:
        image_field: Archivo de imagen
        max_size_mb: Tamaño máximo en MB

    Returns:
        Boolean indicando si es válido
    """
    try:
        # Obtener tamaño en MB
        size_mb = image_field.size / (1024 * 1024)
        return size_mb <= max_size_mb
    except:
        return False


def get_image_dimensions(image_field):
    """
    Obtiene las dimensiones de una imagen

    Returns:
        Tupla (width, height)
    """
    try:
        img = Image.open(image_field)
        return img.size
    except:
        return (0, 0)


def calculate_compression_savings(original_size, compressed_size):
    """
    Calcula el porcentaje de ahorro de espacio

    Returns:
        Float con el porcentaje ahorrado
    """
    if original_size == 0:
        return 0

    savings = ((original_size - compressed_size) / original_size) * 100
    return round(savings, 2)
