import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Verifica integridad y legibilidad de un respaldo PostgreSQL y deja una evidencia para healthchecks."

    def add_arguments(self, parser):
        parser.add_argument("backup", help="Ruta explícita al archivo .dump/.backup")
        parser.add_argument("--evidence", default=os.getenv("BACKUP_VERIFICATION_FILE", "/tmp/estate-backup-verified.json"))

    def handle(self, *args, **options):
        backup = Path(options["backup"]).resolve()
        if not backup.is_file() or backup.stat().st_size == 0:
            raise CommandError(f"Respaldo inexistente o vacío: {backup}")
        result = subprocess.run(
            ["pg_restore", "--list", str(backup)], capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0 or not result.stdout.strip():
            raise CommandError(f"pg_restore no pudo leer el respaldo: {result.stderr.strip()}")
        digest = hashlib.sha256()
        with backup.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        evidence = {
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "backup": backup.name,
            "size_bytes": backup.stat().st_size,
            "sha256": digest.hexdigest(),
            "objects": sum(1 for line in result.stdout.splitlines() if line and not line.startswith(";")),
        }
        evidence_path = Path(options["evidence"]).resolve()
        evidence_path.parent.mkdir(parents=True, exist_ok=True)
        evidence_path.write_text(json.dumps(evidence, indent=2), encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(json.dumps(evidence)))
