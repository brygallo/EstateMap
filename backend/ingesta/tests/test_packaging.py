import json

import pytest

from ingesta.packaging import PaqueteInvalido, PaqueteReader


def _package(tmp_path, listings, total=None):
    (tmp_path / "listings.jsonl").write_text(
        "".join(json.dumps(item) + "\n" for item in listings), encoding="utf-8"
    )
    manifest = {
        "formato": 1,
        "total": len(listings) if total is None else total,
        "fuente": {
            "slug": "plusvalia",
            "nombre": "Plusvalía Ecuador",
            "base_url": "https://www.plusvalia.com",
        },
    }
    (tmp_path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return PaqueteReader(str(tmp_path))


def test_validate_accepts_complete_package(tmp_path):
    reader = _package(tmp_path, [{"external_id": "1"}, {"external_id": "2"}])
    assert reader.validate()["total"] == 2


def test_validate_rejects_partial_package(tmp_path):
    reader = _package(tmp_path, [{"external_id": "1"}], total=2)
    with pytest.raises(PaqueteInvalido, match="declara 2 anuncios"):
        reader.validate()


def test_validate_reports_invalid_json_line(tmp_path):
    reader = _package(tmp_path, [{"external_id": "1"}])
    (tmp_path / "listings.jsonl").write_text('{"external_id": "1"}\n{roto}\n')
    with pytest.raises(PaqueteInvalido, match="línea 2"):
        reader.validate()


def test_validate_rejects_duplicate_external_id(tmp_path):
    reader = _package(tmp_path, [{"external_id": "1"}, {"external_id": "1"}])
    with pytest.raises(PaqueteInvalido, match="external_id duplicado"):
        reader.validate()
