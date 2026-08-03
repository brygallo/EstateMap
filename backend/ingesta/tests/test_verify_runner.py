from datetime import timedelta

import pytest
from django.utils import timezone

from ingesta import runner
from ingesta.models import Fuente, IngestaRun, ListingRetirada
from ingesta.scrapers.base import ScraperBlocked
from real_estate.models import Property


pytestmark = pytest.mark.django_db


class FakeScraper:
    """check_many stub: answers from a url->bool map, optionally blocking once."""

    key = "plusvalia"

    def __init__(self, answers, block_on=None):
        self.answers = answers
        self.block_on = block_on
        self.blocks_raised = 0
        self.resets = 0

    def check_many(self, urls):
        for url in urls:
            if url == self.block_on:
                self.block_on = None
                self.blocks_raised += 1
                raise ScraperBlocked("bloqueo simulado")
            yield self.answers[url]

    def reset_blocks(self):
        self.resets += 1


@pytest.fixture
def fuente():
    return Fuente.objects.create(
        slug="plusvalia", nombre="Plusvalía", base_url="https://www.plusvalia.com"
    )


@pytest.fixture(autouse=True)
def no_media(monkeypatch):
    monkeypatch.setattr(
        "ingesta.pipeline.retirement.delete_property_images", lambda prop: None
    )


def make_prop(fuente, ext, last_seen=None):
    return Property.objects.create(
        title=f"Anuncio {ext}",
        source=fuente,
        external_id=ext,
        source_url=f"https://www.plusvalia.com/propiedades/{ext}.html",
        is_imported=True,
        last_seen_at=last_seen,
    )


def make_run(fuente, **kwargs):
    return IngestaRun.objects.create(fuente=fuente, modo="verify", **kwargs)


def install(monkeypatch, scraper):
    monkeypatch.setattr(runner, "get_scraper", lambda key: scraper)
    monkeypatch.setattr(runner, "_cooldown", lambda run, seconds: True)


def test_verify_deletes_gone_and_stamps_survivors(monkeypatch, fuente):
    alive = make_prop(fuente, "alive-1")
    gone = make_prop(fuente, "gone-1")
    scraper = FakeScraper({alive.source_url: True, gone.source_url: False})
    install(monkeypatch, scraper)

    run = runner.run_verify(make_run(fuente))

    assert run.estado == "done"
    assert run.caducadas == 1
    assert not Property.objects.filter(pk=gone.pk).exists()
    assert ListingRetirada.objects.filter(fuente=fuente, external_id="gone-1").exists()
    alive.refresh_from_db()
    assert alive.last_seen_at is not None


def test_verify_visits_stalest_first_and_honors_limit(monkeypatch, fuente):
    now = timezone.now()
    fresh = make_prop(fuente, "fresh", last_seen=now)
    stale = make_prop(fuente, "stale", last_seen=now - timedelta(days=20))
    never = make_prop(fuente, "never", last_seen=None)
    scraper = FakeScraper({p.source_url: True for p in (fresh, stale, never)})
    install(monkeypatch, scraper)

    run = runner.run_verify(make_run(fuente, limit=2))

    assert run.estado == "done"
    assert run.vistos == 2
    fresh.refresh_from_db()
    assert fresh.last_seen_at == now  # untouched: only never/stale were checked
    never.refresh_from_db()
    stale.refresh_from_db()
    assert never.last_seen_at > now
    assert stale.last_seen_at > now


def test_verify_cools_down_and_resumes_after_block(monkeypatch, fuente):
    props = [make_prop(fuente, f"p{i}") for i in range(3)]
    answers = {p.source_url: True for p in props}
    answers[props[2].source_url] = False
    scraper = FakeScraper(answers, block_on=props[1].source_url)
    install(monkeypatch, scraper)

    run = runner.run_verify(make_run(fuente))

    assert run.estado == "done"
    assert run.vistos == 3
    assert run.caducadas == 1
    assert scraper.blocks_raised == 1
    assert scraper.resets == 1
    assert not Property.objects.filter(pk=props[2].pk).exists()


def test_verify_gives_up_after_max_cooldowns_but_keeps_progress(monkeypatch, fuente):
    checked = make_prop(fuente, "checked")
    stuck = make_prop(fuente, "stuck")

    class AlwaysBlocked(FakeScraper):
        def check_many(self, urls):
            for url in urls:
                if url == stuck.source_url:
                    raise ScraperBlocked("bloqueo persistente")
                yield self.answers[url]

    scraper = AlwaysBlocked({checked.source_url: True})
    install(monkeypatch, scraper)

    run = runner.run_verify(make_run(fuente))

    assert run.estado == "error"
    assert "continúa donde quedó" in run.mensaje
    checked.refresh_from_db()
    assert checked.last_seen_at is not None  # resume cursor already advanced
    stuck.refresh_from_db()
    assert stuck.last_seen_at is None
