"""
Prove that a set of MinIO settings can actually write to its bucket.

Reads an env file (KEY=VALUE per line) and does one put/delete round trip with
the credential inside it. Nothing in a request path touches the object store,
so no health check notices a rejected key: the portal answers `ok` while every
photo uploaded stays in staging, whole but unpublished. That is how the deploy
of 2026-08-20 shipped a MINIO_SECRET_KEY that had never matched the server's
root password and nobody saw it for five hours.

Runs inside the backend container, which already has boto3. Takes the env file
as an argument rather than the values, so no secret reaches a command line.

    python check_minio_credential.py /tmp/env-candidate
"""

import sys

import boto3
from botocore.config import Config

PROBE_KEY = "deploy-probe/.credential-check"


def read_env(path):
    values = {}
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.rstrip("\n")
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key] = value
    return values


def main(argv):
    if len(argv) != 2:
        sys.exit("usage: check_minio_credential.py <env-file>")

    values = read_env(argv[1])
    missing = [
        key
        for key in (
            "MINIO_ENDPOINT",
            "MINIO_ACCESS_KEY",
            "MINIO_SECRET_KEY",
            "MINIO_BUCKET_NAME",
        )
        if not values.get(key)
    ]
    if missing:
        sys.exit("missing or empty in the env file: %s" % ", ".join(missing))

    scheme = "https" if values.get("MINIO_USE_SSL", "").lower() == "true" else "http"
    client = boto3.client(
        "s3",
        endpoint_url="%s://%s" % (scheme, values["MINIO_ENDPOINT"]),
        aws_access_key_id=values["MINIO_ACCESS_KEY"],
        aws_secret_access_key=values["MINIO_SECRET_KEY"],
        config=Config(signature_version="s3v4"),
    )

    bucket = values["MINIO_BUCKET_NAME"]
    client.put_object(Bucket=bucket, Key=PROBE_KEY, Body=b"ok")
    client.delete_object(Bucket=bucket, Key=PROBE_KEY)
    print("the credential can write to %s" % bucket)


if __name__ == "__main__":
    main(sys.argv)
