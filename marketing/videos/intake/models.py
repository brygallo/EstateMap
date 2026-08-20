"""The factory's memory across brands.

Everything here is derived: brand files and catalogues remain the truth, and the
database can be dropped and rebuilt from them. What the files cannot do is
answer across brands — which components exist, which ones a brand already uses,
what a doctrine has actually produced, what a person accepted or rejected — and
that is what these models are for.

The one thing that is *not* derived is `Lesson`: a person's «esto sí» or «esto
no» exists nowhere else, so it is the only state the factory would truly lose.
"""

from __future__ import annotations

import hashlib

from django.db import models
from django.utils import timezone

# A claim needs this many pieces behind it before the factory repeats it as
# advice. Below that it is an anecdote, and the model says so.
MINIMUM_SAMPLE = 4


class Brand(models.Model):
    """A company the factory makes videos for."""

    id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=200)
    domain = models.CharField(max_length=200, blank=True)
    tagline = models.CharField(max_length=300, blank=True)
    doctrine = models.SlugField(max_length=64, blank=True)
    repository = models.CharField(max_length=500, blank=True)
    onboarded_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.name or self.id


class Component(models.Model):
    """A reusable piece: a simulation, an asset, a capture flow, a doctrine.

    `generic` is the field that decides whether a new company can reach for it.
    A component that names one company's product is not generic, however
    beautifully it is built.
    """

    KINDS = [
        ("simulation", "Simulación"),
        ("asset", "Recurso"),
        ("flow", "Recorrido de captura"),
        ("doctrine", "Tipo de pensamiento"),
        ("voice", "Perfil de voz"),
    ]

    id = models.CharField(primary_key=True, max_length=128)
    kind = models.CharField(max_length=32, choices=KINDS)
    label = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    owner = models.CharField(max_length=64, blank=True)
    generic = models.BooleanField(default=False)
    brands = models.ManyToManyField(Brand, related_name="components", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["kind", "id"]
        indexes = [models.Index(fields=["kind"])]

    def __str__(self) -> str:
        return self.id


class Video(models.Model):
    """A mirror of one catalogue entry, so pieces can be compared across brands."""

    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name="videos")
    video_id = models.CharField(max_length=64)
    title = models.CharField(max_length=300, blank=True)
    state = models.CharField(max_length=32, blank=True)
    audience = models.CharField(max_length=64, blank=True)
    funnel_stage = models.CharField(max_length=64, blank=True)
    pillar = models.CharField(max_length=120, blank=True)
    doctrine = models.SlugField(max_length=64, blank=True)
    hook = models.TextField(blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    components = models.ManyToManyField(Component, related_name="videos", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["brand", "-video_id"]
        constraints = [
            models.UniqueConstraint(fields=["brand", "video_id"], name="unique_video_per_brand")
        ]
        indexes = [models.Index(fields=["state"])]

    def __str__(self) -> str:
        return f"{self.brand_id}/{self.video_id}"


class Finding(models.Model):
    """One fact about a brand, and where it came from.

    `confidence` is the whole point: `hecho` was read from a file, `derivado`
    was inferred from something read, and `propuesto` is a suggestion nobody
    has confirmed. Only the first two may be written into a brand unattended.
    """

    CONFIDENCE = [
        ("hecho", "Hecho"),
        ("derivado", "Derivado"),
        ("propuesto", "Propuesto"),
    ]

    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name="findings")
    field = models.CharField(max_length=120)
    value = models.TextField(blank=True)
    source = models.CharField(max_length=300)
    confidence = models.CharField(max_length=16, choices=CONFIDENCE, default="hecho")
    recorded_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["brand", "field"]
        constraints = [
            models.UniqueConstraint(fields=["brand", "field"], name="unique_finding_per_brand")
        ]

    def __str__(self) -> str:
        return f"{self.brand_id}.{self.field}"


class LessonQuerySet(models.QuerySet):
    def pending(self) -> "LessonQuerySet":
        return self.filter(status=Lesson.PROPOSED)

    def accepted(self) -> "LessonQuerySet":
        return self.filter(status=Lesson.ACCEPTED)

    def for_brand(self, brand_id: str | None) -> "LessonQuerySet":
        if not brand_id:
            return self
        return self.filter(models.Q(brand_id=brand_id) | models.Q(brand__isnull=True))


class Lesson(models.Model):
    """Something the factory believes it learned, waiting on a person.

    Nothing is learned silently. A lesson is proposed, a person answers, and
    both answers are kept: an accepted lesson becomes configuration the factory
    applies, and a rejected one is remembered so the same proposal is never
    made twice. A rejection is not a discarded idea — it is the record that
    this factory does not work that way.
    """

    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    STATUSES = [
        (PROPOSED, "Propuesta"),
        (ACCEPTED, "Aceptada"),
        (REJECTED, "Rechazada"),
    ]

    brand = models.ForeignKey(
        Brand, on_delete=models.CASCADE, related_name="lessons", null=True, blank=True
    )
    video_id = models.CharField(max_length=64, blank=True)
    scope = models.CharField(max_length=32)
    subject = models.CharField(max_length=200)
    claim = models.TextField()
    evidence = models.TextField()
    proposal = models.TextField(blank=True)
    sample = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=16, choices=STATUSES, default=PROPOSED)
    decision_note = models.TextField(blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    applied_as = models.CharField(max_length=300, blank=True)
    fingerprint = models.CharField(max_length=32, unique=True)
    created_at = models.DateTimeField(default=timezone.now)

    objects = LessonQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status"])]

    def __str__(self) -> str:
        return f"[{self.status}] {self.subject}"

    @property
    def confidence(self) -> str:
        return "sostenida" if self.sample >= MINIMUM_SAMPLE else "anecdótica"

    @staticmethod
    def mark_for(brand_id: str | None, scope: str, subject: str, claim: str) -> str:
        """Identity of a lesson, so the same one is never proposed twice."""
        raw = "|".join([brand_id or "*", scope, subject, " ".join(claim.lower().split())])
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def decide(self, accepted: bool, note: str = "", applied_as: str = "") -> bool:
        if self.status != self.PROPOSED:
            return False
        self.status = self.ACCEPTED if accepted else self.REJECTED
        self.decision_note = note
        self.applied_as = applied_as
        self.decided_at = timezone.now()
        self.save(update_fields=["status", "decision_note", "applied_as", "decided_at"])
        return True


class Usage(models.Model):
    """What a piece of work cost, in tokens.

    Console sessions report real token counts — both CLIs write them to their
    own session logs — but those run on a subscription, so the money column is
    a list-price estimate, never a bill. API backends fill the same row from
    the provider's own usage response.
    """

    CONSOLE = "console"
    API = "api"
    BACKENDS = [(CONSOLE, "Consola"), (API, "API")]

    brand = models.ForeignKey(
        Brand, on_delete=models.CASCADE, related_name="usage", null=True, blank=True
    )
    video_id = models.CharField(max_length=64, blank=True)
    backend = models.CharField(max_length=16, choices=BACKENDS, default=CONSOLE)
    tool = models.CharField(max_length=32)
    model = models.CharField(max_length=64, blank=True)
    input_tokens = models.BigIntegerField(default=0)
    output_tokens = models.BigIntegerField(default=0)
    cache_read_tokens = models.BigIntegerField(default=0)
    cache_write_tokens = models.BigIntegerField(default=0)
    session_ref = models.CharField(max_length=500, blank=True)
    recorded_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-recorded_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["session_ref"], name="unique_usage_per_session",
                condition=models.Q(session_ref__gt=""),
            )
        ]

    def __str__(self) -> str:
        return f"{self.tool} {self.input_tokens}/{self.output_tokens}"

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens
