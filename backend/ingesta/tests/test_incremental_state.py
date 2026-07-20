import pytest
from datetime import timedelta

from ingesta.models import Fuente, ListingRetirada
from ingesta.runner import _load_known_listings
from real_estate.models import Property
from django.utils import timezone


pytestmark = pytest.mark.django_db


def test_removed_listing_is_known_by_the_next_incremental_run():
    source = Fuente.objects.create(
        slug="plusvalia",
        nombre="Plusvalia",
        base_url="https://www.plusvalia.com",
    )
    Property.objects.create(
        source=source,
        external_id="active-1",
        source_url="https://www.plusvalia.com/propiedades/active-1.html",
        is_imported=True,
    )
    ListingRetirada.objects.create(
        fuente=source,
        external_id="gone-1",
        source_url="https://www.plusvalia.com/propiedades/gone-1.html",
        http_status=410,
    )

    known_urls, known_ids, retired_count = _load_known_listings(source)

    assert known_ids == {"active-1", "gone-1"}
    assert known_urls == {
        "https://www.plusvalia.com/propiedades/active-1.html",
        "https://www.plusvalia.com/propiedades/gone-1.html",
    }
    assert retired_count == 1


def test_old_removed_listing_is_rechecked_after_thirty_days():
    source = Fuente.objects.create(
        slug="plusvalia",
        nombre="Plusvalia",
        base_url="https://www.plusvalia.com",
    )
    removed = ListingRetirada.objects.create(
        fuente=source,
        external_id="gone-old",
        source_url="https://www.plusvalia.com/propiedades/gone-old.html",
        http_status=404,
    )
    ListingRetirada.objects.filter(pk=removed.pk).update(
        last_seen_at=timezone.now() - timedelta(days=31)
    )

    known_urls, known_ids, retired_count = _load_known_listings(source)

    assert known_urls == set()
    assert known_ids == set()
    assert retired_count == 0
