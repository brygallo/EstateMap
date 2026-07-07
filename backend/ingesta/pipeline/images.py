"""
Ciclo de vida de imágenes.

- ``download_images`` (LOCAL, durante scrape): baja las imágenes del anuncio al
  paquete. No optimiza aquí; la optimización a WEBP + thumbnail la hace el
  pipeline existente de ``PropertyImage`` al importar.
- ``sync_property_images`` (PRODUCCIÓN, durante import): sincroniza las imágenes
  del paquete con la ``Property``, reutilizando ``PropertyImage.save`` (WEBP +
  thumbnail en MinIO). Borra las imágenes que ya no vienen en el paquete.
- ``delete_property_images``: borra todas las imágenes de una Property (y sus
  objetos en MinIO) cuando el anuncio caduca, para liberar espacio.

Límite prudente por anuncio para controlar el almacenamiento.
"""
import os

MAX_IMAGES = 5
_TIMEOUT = 20.0


def download_images(urls, dest_dir, max_images=MAX_IMAGES):
    """
    Descarga hasta ``max_images`` imágenes a ``dest_dir``. Devuelve la lista de
    nombres de archivo guardados (ej. ['0.jpg', '1.jpg']). Solo se usa en LOCAL;
    importa httpx de forma diferida para no exigirlo en producción.
    """
    import httpx

    saved = []
    headers = {"User-Agent": "GeoPropiedadesBot/1.0 (+agregador; contacto en el sitio)"}
    with httpx.Client(timeout=_TIMEOUT, headers=headers, follow_redirects=True) as client:
        for i, url in enumerate(urls[:max_images]):
            try:
                resp = client.get(url)
                resp.raise_for_status()
                ext = _ext_from(resp.headers.get("content-type", ""), url)
                name = f"{i}{ext}"
                with open(os.path.join(dest_dir, name), "wb") as fh:
                    fh.write(resp.content)
                saved.append(name)
            except Exception:
                continue
    return saved


def image_dhash_from_url(url, size=8):
    """
    Descarga una imagen y calcula su **dHash** (perceptual hash) como hex de 16
    caracteres. Robusto a reescalados/recompresión: la misma foto en dos portales
    da (casi) el mismo hash. Devuelve '' si falla. Usa Pillow (ya instalado).
    """
    import io

    import httpx
    from PIL import Image

    headers = {"User-Agent": "GeoPropiedadesBot/1.0 (+agregador)"}
    try:
        resp = httpx.get(url, timeout=_TIMEOUT, headers=headers, follow_redirects=True)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("L").resize(
            (size + 1, size), Image.LANCZOS
        )
        px = list(img.getdata())
        bits = 0
        for row in range(size):
            for col in range(size):
                left = px[row * (size + 1) + col]
                right = px[row * (size + 1) + col + 1]
                bits = (bits << 1) | (1 if left > right else 0)
        return f"{bits:016x}"
    except Exception:
        return ""


def attach_images_from_urls(prop, urls, max_images=MAX_IMAGES):
    """
    Flujo de UN SOLO PASO (scrape directo, sin paquete): por cada URL descarga
    la imagen a un buffer **temporal en memoria**, la entrega a ``PropertyImage``
    (que la optimiza a WEBP + thumbnail y la **sube a MinIO**) y libera el
    temporal. No queda ningún archivo en disco.

    Idempotente: si la propiedad ya tiene la misma cantidad de imágenes, no
    vuelve a descargar. Devuelve cuántas imágenes quedaron adjuntas.
    """
    import httpx
    from django.core.files.base import ContentFile
    from real_estate.models import PropertyImage

    urls = urls[:max_images]
    existing = prop.images.count()
    if existing and existing == len(urls):
        return existing  # ya sincronizado

    # Reemplazo total (borra de MinIO lo anterior).
    delete_property_images(prop)

    headers = {"User-Agent": "GeoPropiedadesBot/1.0 (+agregador)"}
    saved = 0
    with httpx.Client(timeout=_TIMEOUT, headers=headers, follow_redirects=True) as client:
        for idx, url in enumerate(urls):
            try:
                resp = client.get(url)
                resp.raise_for_status()
                content = resp.content  # temporal en memoria
                ext = _ext_from(resp.headers.get("content-type", ""), url)
                pi = PropertyImage(property=prop, is_main=(idx == 0))
                # Nombre único por propiedad para no colisionar con otras.
                pi.image.save(f"p{prop.id}_{idx}{ext}", ContentFile(content), save=False)
                pi.save()   # optimiza (WEBP) y sube a MinIO
                saved += 1
                # 'content' queda libre para el GC al terminar la iteración.
            except Exception:
                continue
    return saved


def sync_property_images(prop, image_paths):
    """
    Deja la Property con exactamente las imágenes de ``image_paths``.
    Estrategia simple e idempotente: si la cantidad cambió, se reemplazan todas
    (borrando las anteriores de MinIO). Reutiliza ``PropertyImage.save`` para
    optimizar (WEBP) y generar thumbnail.
    """
    from django.core.files import File
    from real_estate.models import PropertyImage

    existing = list(prop.images.all())
    if len(existing) == len(image_paths) and image_paths:
        return  # ya sincronizado, no rehacemos trabajo

    # Reemplazo total: borrar (con limpieza de MinIO) y volver a crear.
    for img in existing:
        _delete_image_file(img)
        img.delete()

    for idx, path in enumerate(image_paths):
        if not os.path.isfile(path):
            continue
        ext = os.path.splitext(path)[1] or ".jpg"
        with open(path, "rb") as fh:
            pi = PropertyImage(property=prop, is_main=(idx == 0))
            pi.image.save(f"p{prop.id}_{idx}{ext}", File(fh), save=False)
            pi.save()


def delete_property_images(prop):
    """Borra todas las imágenes de la Property y sus objetos en MinIO."""
    for img in prop.images.all():
        _delete_image_file(img)
        img.delete()


def _delete_image_file(img):
    """Borra los ficheros (imagen + thumbnail) del storage sin borrar la fila."""
    for field in (img.image, img.thumbnail):
        try:
            if field and field.name:
                field.storage.delete(field.name)
        except Exception:
            pass


def _ext_from(content_type, url):
    content_type = (content_type or "").lower()
    if "webp" in content_type:
        return ".webp"
    if "png" in content_type:
        return ".png"
    if "jpeg" in content_type or "jpg" in content_type:
        return ".jpg"
    # fallback por extensión de la URL
    lower = url.lower()
    for ext in (".webp", ".png", ".jpg", ".jpeg"):
        if ext in lower:
            return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"
