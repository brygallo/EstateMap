import time
from io import BytesIO
from pathlib import Path
from PIL import Image
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from real_estate.models import Property, PropertyImage
from real_estate.serializers import stage_property_image

buf = BytesIO()
Image.new("RGB", (3000, 2000), (200, 90, 60)).save(buf, format="JPEG", quality=98)
raw = buf.getvalue()
print(f"original: {len(raw)/1024:.0f} KB, 3000x2000")

U = get_user_model()
user, _ = U.objects.get_or_create(username="e2e_tester")
prop = Property.objects.create(title="E2E", owner=user, price=1)

up = SimpleUploadedFile("e2e.jpg", raw, content_type="image/jpeg")
t0 = time.monotonic()
img = stage_property_image(prop, up, 0, is_main=True)
elapsed = time.monotonic() - t0
print(f"POST devolvio en {elapsed*1000:.0f} ms  status={img.status}  staged={Path(img.pending_path).is_file()}")

for i in range(60):
    img.refresh_from_db()
    if img.status != PropertyImage.Status.PENDING:
        break
    time.sleep(1)

print(f"tras worker: status={img.status}")
if img.status == PropertyImage.Status.READY:
    print(f"  master    : {img.image.name}  {img.file_size/1024:.0f} KB")
    print(f"  thumbnail : {img.thumbnail.name}")
    print(f"  url       : {img.image.url}")
    with img.image.open() as h:
        print(f"  dimensiones: {Image.open(h).size}")
    print(f"  temporal borrado: {not Path('/app/tmp/pending-images').joinpath(Path(img.pending_path or 'x').name).exists()}")
    print(f"  ahorro: {(1 - img.file_size/len(raw))*100:.1f}%")
else:
    print(f"  ERROR: {img.optimization_error}")
prop.delete()
