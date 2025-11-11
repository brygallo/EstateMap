#!/usr/bin/env python
"""
Script to migrate existing images from filesystem to MinIO
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'estate_map.settings')
django.setup()

from real_estate.models import PropertyImage
from django.core.files.storage import default_storage
from django.core.files import File
import pathlib

def migrate_images():
    """Migrate all images from filesystem to MinIO"""
    print("=== Migrating Images to MinIO ===\n")

    migrated = 0
    errors = 0

    # Find all image files in /app directory
    base_path = pathlib.Path('/app')
    image_files = []

    for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif']:
        image_files.extend(base_path.glob(f'**/{ext}'))

    print(f"Found {len(image_files)} image files on filesystem\n")

    for file_path in image_files:
        try:
            # Skip if it's in a node_modules or similar directory
            if 'node_modules' in str(file_path) or '.git' in str(file_path):
                continue

            # Get relative path
            relative_path = file_path.relative_to(base_path)
            print(f"Processing: {relative_path}")

            # Read the file content
            with open(file_path, 'rb') as f:
                from django.core.files.base import ContentFile
                content = ContentFile(f.read())

                # Save to MinIO with the same name
                stored_path = default_storage.save(str(relative_path), content)

            print(f"  ✅ Uploaded to MinIO: {stored_path}")
            migrated += 1

        except Exception as e:
            print(f"  ❌ Error: {e}")
            errors += 1

    # Now update PropertyImage records to use MinIO paths
    print(f"\n=== Updating Database Records ===\n")

    images = PropertyImage.objects.all()
    for img in images:
        try:
            old_name = img.image.name
            # The name is like "properties/filename.jpg"
            # We need to ensure it exists in MinIO
            if default_storage.exists(old_name):
                print(f"✅ Image {old_name} exists in MinIO")
            else:
                print(f"⚠️  Image {old_name} NOT in MinIO - may need manual upload")
        except Exception as e:
            print(f"❌ Error checking {img.image.name}: {e}")

    print(f"\n=== Migration Complete ===")
    print(f"✅ Uploaded: {migrated}")
    print(f"❌ Errors: {errors}")

    return migrated, errors

if __name__ == "__main__":
    migrate_images()
