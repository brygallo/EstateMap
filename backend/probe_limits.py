"""Which Django limit fires for what, so the error names the right field."""

import io
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "estate_map.settings")
django.setup()

from django.conf import settings  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.core.files.uploadedfile import SimpleUploadedFile  # noqa: E402
from PIL import Image  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402

User = get_user_model()
user, _ = User.objects.get_or_create(username="probe_limits", defaults={"email": "probe_limits@example.com"})
client = APIClient()
client.force_authenticate(user=user)


def jpeg(name, pad_mb=0):
    buffer = io.BytesIO()
    Image.new("RGB", (900, 600), (120, 140, 130)).save(buffer, format="JPEG")
    data = buffer.getvalue() + b"\0" * (pad_mb * 1024 * 1024)
    return SimpleUploadedFile(name, data, content_type="image/jpeg")


print("DATA_UPLOAD_MAX_MEMORY_SIZE:", settings.DATA_UPLOAD_MAX_MEMORY_SIZE)
print("DATA_UPLOAD_MAX_NUMBER_FILES:", settings.DATA_UPLOAD_MAX_NUMBER_FILES)

print("\n--- A) texto larguisimo, SIN ficheros (limite de datos, no de imagenes)")
settings.DATA_UPLOAD_MAX_MEMORY_SIZE = 2048
r = client.post("/api/properties/", {
    "title": "Casa",
    "description": "z" * 20000,
}, format="multipart")
print("   HTTP", r.status_code, "|", r.get("Content-Type", "?"))
try:
    print("   body:", r.json())
except Exception:
    print("   body(raw):", r.content[:200])

print("\n--- B) ficheros grandes, texto corto (¿cuentan al limite de datos?)")
settings.DATA_UPLOAD_MAX_MEMORY_SIZE = 2048
r = client.post("/api/properties/", {
    "title": "Casa con foto pesada",
    "uploaded_images": [jpeg("pesada.jpg", pad_mb=3)],
}, format="multipart")
print("   HTTP", r.status_code, "|", r.get("Content-Type", "?"))
try:
    print("   body:", r.json())
except Exception:
    print("   body(raw):", r.content[:200])

User.objects.filter(username="probe_limits").delete()
