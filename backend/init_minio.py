#!/usr/bin/env python3
"""
Script to initialize MinIO bucket for EstateMap
Run this after starting the containers
"""
import os
import time
from minio import Minio
from minio.error import S3Error

def init_bucket():
    # Wait a bit for MinIO to be ready
    print("Waiting for MinIO to be ready...")
    time.sleep(5)

    # MinIO configuration
    endpoint = os.getenv('MINIO_ENDPOINT', 'minio:9000')
    access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    bucket_name = os.getenv('MINIO_BUCKET_NAME', 'estatemap')
    use_ssl = os.getenv('MINIO_USE_SSL', 'False') == 'True'

    # Create MinIO client
    client = Minio(
        endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=use_ssl
    )

    try:
        # Check if bucket exists
        if not client.bucket_exists(bucket_name):
            # Create bucket
            client.make_bucket(bucket_name)
            print(f"✓ Bucket '{bucket_name}' created successfully!")
        else:
            print(f"✓ Bucket '{bucket_name}' already exists")

        # Set/Update bucket policy to public read (always apply policy)
        policy = f"""{{
            "Version": "2012-10-17",
            "Statement": [
                {{
                    "Effect": "Allow",
                    "Principal": {{"AWS": ["*"]}},
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::{bucket_name}/*"]
                }}
            ]
        }}"""

        client.set_bucket_policy(bucket_name, policy)
        print(f"✓ Bucket '{bucket_name}' policy set to public read")

    except S3Error as e:
        print(f"✗ Error: {e}")
        return False

    return True

if __name__ == "__main__":
    success = init_bucket()
    exit(0 if success else 1)
