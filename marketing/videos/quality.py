#!/usr/bin/env python3
"""Plan-level quality gate.

Everything here runs on plan.json, before a single second of speech is
synthesised or a frame is rendered. Catching a cross-audience CTA or an
unverifiable claim costs nothing at this point and costs a full render later.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import tts
import voice
import workflow
import brand


ROOT = Path(__file__).resolve().parent

# From creative-system.md: a CTA belongs to its audience and is not swapped for
# variety.
CTA_FAMILIES = {
    "comprador": ["explora el mapa", "encuentra tu futuro hogar"],
    "propietario": ["publica", "sube", "comparte"],
    "profesional": ["prueba", "escríbenos", "contáctanos", "solicita"],
}


def configure(profile: brand.BrandProfile) -> None:
    global CTA_FAMILIES, ACTIVE_AUDIENCES, ACTIVE_SIMULATIONS, REVEAL_AUDIENCES
    CTA_FAMILIES = {key: list(values) for key, values in profile.cta_families.items()}
    ACTIVE_AUDIENCES = set(profile.audiences)
    ACTIVE_SIMULATIONS = set(profile.simulations) if profile.simulations else set()
    REVEAL_AUDIENCES = set(profile.product_reveal_audiences)


ACTIVE_AUDIENCES = set(CTA_FAMILIES)
ACTIVE_SIMULATIONS: set[str] = set()
REVEAL_AUDIENCES = {"comprador"}

# What this catches is a piece that changes who it is talking to, and that only
# happens in the second person. A buyer video that says "escribes a quien
# publica el anuncio" is describing the advertiser, not asking the viewer to
# become one — matching the bare verb flagged the honest sentence and let the
# real crossover through in any other wording.
AUDIENCE_CROSS_TALK = {
    "comprador": [
        "publica tu", "publicar tu", "publica una propiedad", "publica gratis",
        "sube tu propiedad", "comparte tu anuncio", "sin comisión",
    ],
    "propietario": ["busca dónde vivir", "explora el mapa para buscar"],
}

# A piece is short form — a promise and its demonstration —, a story, which
# earns room to explain where something came from before it shows it, or a
# lesson, which teaches a subject the viewer came to learn. The limits below are
# not one number because these fail in opposite directions: the demo fails by
# spending its runtime on pain, the story fails by cutting nine beats into five
# and holding each animation for eighteen seconds, and the lesson fails by
# compressing a subject until it teaches nothing.
# A piece under this pillar teaches first and shows the product last.
EDUCATION_PILLAR = "Educación inmobiliaria"

# The two thresholds between the three formats, and the ceiling of the longest.
SHORT_FORM_SECONDS = 45
STORY_SECONDS = 120
MAX_DURATION_SECONDS = 240

# A scene is a beat, not a chapter. These ceilings were half of what they are
# now, and the result was a 48-second story cut into nine takes of five seconds
# each: the piece felt like it was not going anywhere because, for most of every
# take, nothing was. An animation carries on across a cut — `renderer.AssetTimeline`
# continues its arc — so more scenes buy rhythm without inventing content.
MAX_SCENES = 8
MAX_STORY_SCENES = 20
# A lesson is not a longer story: it is a subject cut into steps, and each step
# needs its own animation.
#
# The ceiling has to let `MAX_SCENE_SECONDS` be reachable, or the two rules
# contradict each other: at twenty-four scenes a four-minute lesson cannot hold
# a shot under ten seconds, and every plan arrives warned for a pace the budget
# forbids. Forty is 240 divided by 6. It is not permission for sixty cards —
# the pace rule is what keeps the beats honest now, and a scene still has to
# earn its own animation.
MAX_LESSON_SCENES = 40

# Nobody watches a shot longer than this without deciding the piece is slow.
# Above it the scene is two scenes: cut it where the voice changes subject.
MAX_SCENE_SECONDS = 6.0

PRODUCT_REVEAL_DEADLINE_SECONDS = 3.0
STORY_PRODUCT_REVEAL_DEADLINE_SECONDS = 10.0
LESSON_PRODUCT_REVEAL_DEADLINE_SECONDS = 25.0


def is_story(target: int) -> bool:
    return SHORT_FORM_SECONDS < target <= STORY_SECONDS


def is_lesson(target: int) -> bool:
    return target > STORY_SECONDS


def scene_budget(target: int) -> int:
    if is_lesson(target):
        return MAX_LESSON_SCENES
    return MAX_STORY_SCENES if is_story(target) else MAX_SCENES


def product_reveal_deadline(target: int) -> float:
    """How long a piece may run before the product has to be on screen.

    Three seconds in short form: there is no budget for anything else. A story
    may set its scene first, but ten seconds is the whole allowance — the brand
    block is on screen from frame one either way, so this is about showing the
    product, not about naming it. A lesson teaches before it arrives anywhere,
    so it gets twenty-five: still a deadline, because a piece that reaches the
    product in its last ten seconds taught for free and sold nothing.
    """
    if is_lesson(target):
        return LESSON_PRODUCT_REVEAL_DEADLINE_SECONDS
    return STORY_PRODUCT_REVEAL_DEADLINE_SECONDS if is_story(target) else PRODUCT_REVEAL_DEADLINE_SECONDS


PRODUCT_ASSETS = {
    "sim:geo-location-hero", "sim:geo-nearby-context",
    "sim:alrededor", "sim:entorno-mapa", "sim:forma-dibujada", "sim:medidas", "sim:metros-utiles",
    "sim:mapa", "sim:llegada", "sim:zona", "sim:filtros", "sim:ficha",
    "sim:publicar-gratis", "sim:formulario", "sim:ubicacion-publicacion",
    "sim:fotos-publicacion", "sim:inventario-agente", "sim:enlace-corto",
    "sim:revisar-fotos", "sim:precio-area", "sim:ubicacion-ficha",
    "sim:contacto", "sim:vender", "sim:cero-comision",
    "sim:ya-estan", "sim:anuncio-en-mapa", "sim:te-contactan",
    "sim:donde-queda", "sim:ya-lo-saben", "sim:elige-zona", "sim:aents-reveal", "sim:aents-proceso", "sim:aents-servicios", "sim:aents-contacto",
    "sim:aents-arquitectura", "sim:aents-automatizacion", "sim:aents-panel", "sim:aents-escala", "sim:aents-cierre",
    # The living ranking pages. Each of these draws the portal's own interface
    # rather than a symbol of it: the hook opens the listing card with its
    # price and its characteristics, the three page scenes draw the ranking as
    # `LiveRankingPage.tsx` lays it out — numbered badge, thumbnail, measure in
    # tabular figures, reason underneath — and `sim:razon-posicion` ends with
    # the row landing on the map as a priced pin.
    "sim:geo-ranking-hero", "sim:pagina-ordenada", "sim:recetas-ranking",
    "sim:razon-posicion", "sim:sin-destacado",
}

# From creative-system.md and the "No prometer" section of product-context.md.
FORBIDDEN = {
    "revolucionari": "superlativo no demostrable",
    "líder": "posición de mercado sin fuente",
    "garantiz": "promesa de resultado",
    "vende rápido": "promesa de plazo de venta",
    "el mejor": "superlativo no demostrable",
    "plusvalía": "afirmación de valorización de zona",
    "zona segura": "afirmación de seguridad de zona",
    "rentable": "afirmación de retorno",
    "publica automáticamente": "publicación automática en redes no existe",
    "publicación automática": "publicación automática en redes no existe",
    "video automático": "el video automático del anuncio es una propuesta, no una función",
    "última oportunidad": "escasez fabricada",
    "solo por hoy": "escasez fabricada",
}

EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]",
    flags=re.UNICODE,
)
# The trailing word boundary only applies to the spelled-out units: a "%" is
# already a non-word character, so requiring \b after it made "3,4 %" — the
# most dangerous invented figure of all — impossible to match.
NUMBER_CLAIM = re.compile(
    r"\b\d[\d.,]*\s*(?:%|(?:por ciento|mil|millones|usuarios|visitas|propiedades|anuncios)\b)",
    re.IGNORECASE,
)


def finding(level: str, rule: str, detail: str) -> dict[str, str]:
    return {"level": level, "rule": rule, "detail": detail}


def text_of(source: dict[str, Any], key: str) -> str:
    """Plans get edited by hand between lint runs, so a missing or null
    field has to become a finding rather than a traceback."""
    value = source.get(key)
    return value if isinstance(value, str) else ""


def check_structure(plan: dict[str, Any], target: int) -> list[dict[str, str]]:
    findings = []
    scenes = plan.get("scenes") or []
    if not scenes:
        return [finding("error", "scenes", "El plan no tiene escenas")]
    audience = text_of(plan, "audience")
    if audience not in ACTIVE_AUDIENCES:
        findings.append(finding("error", "audience", f"La audiencia «{audience}» no pertenece a la marca activa: {sorted(ACTIVE_AUDIENCES)}"))
    if scenes[0].get("purpose") != "gancho":
        findings.append(finding("error", "hook_first", f"La primera escena es '{scenes[0].get('purpose')}', debe ser 'gancho'"))
    if scenes[-1].get("purpose") != "cta":
        findings.append(finding("error", "cta_last", f"La última escena es '{scenes[-1].get('purpose')}', debe ser 'cta'"))
    ctas = [scene for scene in scenes if scene.get("purpose") == "cta"]
    if len(ctas) > 1:
        findings.append(finding("error", "single_cta", f"Hay {len(ctas)} escenas de CTA; solo se permite una"))
    budget = scene_budget(target)
    if len(scenes) > budget:
        findings.append(finding("error", "scene_count", f"Hay {len(scenes)} escenas; máximo {budget} para un video de {target} s"))
    for index, scene in enumerate(scenes, 1):
        duration = float(scene.get("duration") or 0)
        if duration > MAX_SCENE_SECONDS:
            findings.append(finding(
                "error",
                "scene_pace",
                f"Escena {index}: {duration:.0f} s en una sola toma; por encima de {MAX_SCENE_SECONDS:.0f} s "
                f"córtala donde la voz cambia de idea. Una animación continúa entre escenas, así que dividirla no la interrumpe",
            ))
    return findings


def check_final_voice_pace(plan: dict[str, Any]) -> list[dict[str, str]]:
    """A plan that fits the draft voice may not fit the one that ships.

    The linter runs against drafts, and drafts are read by the free local voice.
    The paid narrators read slower — measured, not assumed — so a script written
    to the draft grows when the master is finally bought. `aents-001` was planned
    at 64.5 seconds, came out at 83.2, put six of its fourteen scenes past the
    six-second ceiling and diluted its own opening below the density gate. The
    voice was already paid for by then, and a paid voice cannot be changed.

    So the plan is measured twice, and the second measurement is the one that
    matters: it describes the piece a person will actually watch.
    """
    scenes = plan.get("scenes") or []
    if not scenes:
        return []
    final = tts.build(tts.profile_catalog()["defaults"]["final"])
    findings = []
    long_scenes = [
        index
        for index, scene in enumerate(scenes, 1)
        if voice.estimate_seconds(text_of(scene, "voice"), final) + 0.45 > MAX_SCENE_SECONDS
    ]
    if long_scenes:
        findings.append(finding(
            "error",
            "final_voice_pace",
            f"Con la voz final, las escenas {long_scenes} pasan de {MAX_SCENE_SECONDS:.0f} s. "
            f"La voz de pago lee más lento que el borrador y no se puede cambiar una vez comprada: "
            f"acorta el texto ahora, no después",
        ))
    spoken = sum(voice.estimate_seconds(text_of(scene, "voice"), final) for scene in scenes)
    total = round(spoken + len(scenes) * 0.45, 1)
    findings.append(finding(
        "info",
        "final_voice_duration",
        f"Con la voz final la pieza duraría unos {total} s (borrador: "
        f"{round(sum(voice.estimate_seconds(text_of(scene, 'voice')) for scene in scenes) + len(scenes) * 0.45, 1)} s)",
    ))
    return findings


def check_product_reveal(plan: dict[str, Any], target: int) -> list[dict[str, str]]:
    """A social demo cannot spend half its runtime explaining pain.

    Buyer videos promise the map, so a map/product simulation must begin inside
    the piece's reveal deadline. This is deliberately based on scene durations:
    it runs before voice synthesis spends any render time.

    A teaching piece is the deliberate exception. It gives away something useful
    that has nothing to do with the product — what to check before buying a plot
    of land — and lands the product at the end as the payoff. Holding it back is
    the format, not a mistake, so only the deadline is lifted: the piece must
    still arrive at the product before it ends.
    """
    if text_of(plan, "audience") not in REVEAL_AUDIENCES:
        return []
    teaching = text_of(plan, "pillar") == EDUCATION_PILLAR
    deadline = float("inf") if teaching else product_reveal_deadline(target)
    cursor = 0.0
    for scene in plan.get("scenes") or []:
        asset = text_of(scene, "asset")
        if asset in PRODUCT_ASSETS:
            if cursor > deadline:
                return [finding("error", "product_reveal", f"El mapa aparece en {cursor:.1f} s; debe aparecer antes de {deadline:.0f} s")]
            return []
        cursor += float(scene.get("duration") or 0)
    return [finding("error", "product_reveal", "El video para compradores no muestra el mapa ni una simulación del producto")]


def check_headlines(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        text = text_of(scene, "on_screen_text")
        words = len(text.split())
        if words > 4:
            findings.append(finding("error", "headline_length", f"Escena {index}: el rótulo tiene {words} palabras ({text!r}); máximo 4, y en una sola línea"))
        if len(text) > 22:
            findings.append(finding("error", "headline_width", f"Escena {index}: el rótulo tiene {len(text)} caracteres; máximo 22 para que quepa en una fila"))
    cover = text_of(plan, "cover_text")
    if not 2 <= len(cover.split()) <= 6:
        findings.append(finding("warning", "cover_words", f"La portada tiene {len(cover.split())} palabras; conviene entre 2 y 6"))
    return findings


def check_voice(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        spoken = text_of(scene, "voice")
        if EMOJI.search(spoken):
            findings.append(finding("error", "voice_readable", f"Escena {index}: la locución contiene emoji"))
        if "#" in spoken:
            findings.append(finding("error", "voice_readable", f"Escena {index}: la locución contiene un hashtag"))
        if "http" in spoken or "www." in spoken:
            findings.append(finding("error", "voice_readable", f"Escena {index}: la locución contiene una URL sin escribir como se pronuncia"))
        if not spoken.strip():
            findings.append(finding("error", "voice_empty", f"Escena {index}: no tiene locución; el render no puede medir su duración"))
    joined = " ".join(text_of(scene, "voice") for scene in plan.get("scenes") or [])
    if text_of(plan, "narration").split() != joined.split():
        findings.append(finding("warning", "narration_matches", "El campo narration no coincide con la suma de las locuciones por escena"))
    return findings


def check_voice_profile(plan: dict[str, Any]) -> list[dict[str, str]]:
    """A narrator the catalog does not know must not survive until render time.

    An invented profile id builds no provider, so it fails after a human has
    already approved the plan. This gate exists precisely so that nothing gets
    approved and then dies on its way to the speakers.
    """
    name = plan.get("voice_profile")
    if not name:
        return []
    catalog = tts.profile_catalog()
    profile = catalog["profiles"].get(name)
    if profile is None:
        known = ", ".join(sorted(catalog["profiles"])) or "ninguno"
        return [finding(
            "error",
            "voice_profile_unknown",
            f"El plan pide la voz «{name}», que no está en system/voice-profiles.json. Perfiles disponibles: {known}",
        )]
    provider = tts.PROVIDERS.get(str(profile.get("provider")))
    if provider is None:
        return [finding(
            "error",
            "voice_profile_provider",
            f"La voz «{name}» declara el proveedor «{profile.get('provider')}», que no existe en tts.py",
        )]
    if provider.paid:
        return [finding(
            "warning",
            "voice_profile_paid",
            f"La voz «{name}» es de pago: los borradores la rechazan y solo un máster final puede usarla",
        )]
    return []


def check_claims(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    haystack = " ".join([
        text_of(plan, "narration"),
        text_of(plan, "caption"),
        text_of(plan, "promise"),
        " ".join(text_of(scene, "on_screen_text") for scene in plan.get("scenes") or []),
    ]).lower()
    for term, reason in FORBIDDEN.items():
        if term in haystack and not workflow.ForbiddenClaimPolicy.is_explicitly_negated(haystack, term):
            findings.append(finding("error", "forbidden_claim", f"Aparece «{term}»: {reason}"))
    notes = " ".join(plan.get("verification_notes") or [])
    for match in NUMBER_CLAIM.finditer(haystack):
        if match.group(0) not in notes.lower():
            findings.append(finding("warning", "unsourced_number", f"Cifra «{match.group(0)}» sin nota de verificación"))
    return findings


def check_cta(plan: dict[str, Any]) -> list[dict[str, str]]:
    audience = text_of(plan, "audience")
    cta = text_of(plan, "cta").lower()
    if not cta:
        return [finding("error", "cta", "El plan no tiene CTA")]
    family = CTA_FAMILIES.get(audience)
    if family and not any(verb in cta for verb in family):
        findings = [finding("error", "cta_family", f"El CTA «{plan['cta']}» no pertenece a la familia de {audience}: {family}")]
    else:
        findings = []
    audience_text = " ".join([
        text_of(plan, "narration"),
        text_of(plan, "caption"),
        text_of(plan, "cta"),
    ]).lower()
    for phrase in AUDIENCE_CROSS_TALK.get(audience, []):
        if phrase in audience_text:
            findings.append(finding("error", "audience_focus", f"La pieza para {audience} mezcla otra audiencia con «{phrase}»"))
    return findings


def check_message_duplication(plan: dict[str, Any]) -> list[dict[str, str]]:
    findings = []
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        headline = re.sub(r"[^\wáéíóúüñ ]", "", text_of(scene, "on_screen_text").lower())
        spoken = re.sub(r"[^\wáéíóúüñ ]", "", text_of(scene, "voice").lower())
        if len(headline.split()) >= 3 and shared_ratio(headline, spoken) >= 0.75:
            findings.append(finding("warning", "message_duplication", f"Escena {index}: rótulo y voz repiten casi el mismo mensaje"))
    return findings


def cover_art_branches() -> set[str]:
    """The illustrations `cover.tsx` actually implements, read from the source."""
    source = ROOT / "remotion/src/cover.tsx"
    if not source.exists():
        return set()
    return set(re.findall(r"coverArt === '([^']+)'", source.read_text(encoding="utf-8")))


def check_cover_art(plan: dict[str, Any]) -> list[dict[str, str]]:
    """A cover_art nobody implemented is worse than none at all.

    Video-010 asked for "terreno", which has no branch, so the cover fell back
    to the generic house card: a piece about flats shipped with a house, a
    price and a lot area on its thumbnail. The fallback is silent by design,
    so nothing downstream can catch this — only the plan can.
    """
    named = text_of(plan, "cover_art")
    if not named:
        return []
    branches = cover_art_branches()
    if branches and named not in branches:
        return [finding(
            "error",
            "cover_art_missing",
            f"El plan pide la portada «{named}», que no existe en cover.tsx: {sorted(branches)}",
        )]
    return []


def restricted_clips() -> set[str]:
    manifest = ROOT / "assets/screens/manifest.json"
    if not manifest.exists():
        return set()
    data = json.loads(manifest.read_text(encoding="utf-8"))
    return {clip["file"] for clip in data.get("clips", []) if clip.get("requires_authorization")}


def authorized(clip: str, notes: list[str]) -> bool:
    """A blanket sentence about authorisation is not enough.

    The note has to name the clip, because a plan that says "no requiere
    autorización porque no usa la ficha" would otherwise clear a different clip
    that does show identifiable listings.
    """
    stem = Path(clip).stem.lower()
    return any("autoriz" in note.lower() and stem in note.lower() for note in notes)


def check_assets(plan: dict[str, Any], directory: Path) -> list[dict[str, str]]:
    findings = []
    restricted = restricted_clips()
    notes = [note for note in (plan.get("verification_notes") or []) if isinstance(note, str)]
    for index, scene in enumerate(plan.get("scenes") or [], 1):
        name = scene.get("asset")
        if not name:
            continue
        if name.startswith("sim:"):
            import renderer
            if name not in renderer.SIMULATIONS:
                findings.append(finding(
                    "error",
                    "animation_missing",
                    f"Escena {index}: la animación {name} fue propuesta pero todavía no está implementada y registrada",
                ))
            elif ACTIVE_SIMULATIONS and name not in ACTIVE_SIMULATIONS:
                findings.append(finding(
                    "error",
                    "animation_brand",
                    f"Escena {index}: la animación {name} no pertenece a la marca activa",
                ))
            continue
        if not (directory / "assets/input" / name).is_file():
            findings.append(finding("error", "asset_missing", f"Escena {index}: el recurso {name} no existe en assets/input"))
        elif name in restricted and not authorized(name, notes):
            findings.append(finding(
                "error",
                "asset_authorization",
                f"Escena {index}: {name} muestra anuncios identificables; hace falta una nota de verificación "
                f"que nombre «{Path(name).stem}» y deje constancia de la autorización del anunciante",
            ))
    return findings


# Pieces planned before the hook rule existed. Their masters are frozen or their
# plans predate `renderer.HERO_STAGINGS`, so the gate below would fail work that
# is already done instead of the work it was written for. Nothing gets added to
# this list: a piece that needs an opening builds one.
HERO_EXEMPT = frozenset(
    [f"geo-{number:03}" for number in range(1, 15)]
    + [f"aents-{number:03}" for number in range(2, 9)]
)


def check_hero_scene(plan: dict[str, Any], catalog: dict[str, Any], identifier: str) -> list[dict[str, str]]:
    """The opening scene is held to a standard the others are not.

    Every viewer sees it, the feed freezes on it, and in a piece that sells the
    building of software it is the sample of work: a hook that reads as a slide
    has answered the only question the viewer was asking. So it is built on the
    hero stage — camera, depth planes, light, interface rules — and the plan may
    not name anything else in its first scene.

    The second half of this check exists because of what a shared kit does when
    nobody is watching. It raises the floor and then flattens every piece into
    the same shot, which is its own kind of cheap. The staging is therefore part
    of what a hook declares, and it may not repeat the one before it.
    """
    if identifier in HERO_EXEMPT:
        return []
    current = next((item for item in catalog.get("videos", []) if item.get("id") == identifier), {})
    if current.get("experiment") == "voice":
        return []
    scenes = plan.get("scenes") or []
    if not scenes:
        return []
    import renderer

    asset = text_of(scenes[0], "asset")
    staging = renderer.HERO_STAGINGS.get(asset)
    if staging is None:
        return [finding(
            "error",
            "hero_missing",
            f"La escena 1 usa «{asset or 'ninguna animación'}», que no es una animación de gancho. "
            f"Una apertura se construye sobre hero-stage.tsx y se registra en renderer.HERO_STAGINGS: "
            f"{sorted(renderer.HERO_STAGINGS)}",
        )]
    previous = [
        item for item in catalog.get("videos", [])
        if item.get("id") != identifier and item.get("hero_staging")
    ]
    if previous and previous[-1]["hero_staging"] == staging:
        return [finding(
            "error",
            "hero_staging_repeats",
            f"El gancho se rueda «{staging}», igual que {previous[-1]['id']}. "
            f"Dos aperturas seguidas con la misma puesta en escena convierten el kit en una plantilla; "
            f"elige otro movimiento de HERO_MOVES y regístralo",
        )]
    return []


def check_repetition(plan: dict[str, Any], catalog: dict[str, Any], identifier: str) -> list[dict[str, str]]:
    scenes = plan.get("scenes") or []
    if not scenes:
        return []
    current = next((item for item in catalog.get("videos", []) if item.get("id") == identifier), {})
    if current.get("experiment") == "voice":
        return []
    hook = " ".join(text_of(scenes[0], "voice").lower().split())
    findings = []
    for item in catalog.get("videos", []):
        if item.get("id") == identifier or item.get("experiment") == "hook":
            continue
        previous = " ".join((item.get("hook") or "").lower().split())
        if previous and previous == hook:
            findings.append(finding("error", "repeated_hook", f"El gancho es idéntico al de {item['id']}"))
        elif previous and hook and shared_ratio(previous, hook) > 0.8:
            findings.append(finding("warning", "similar_hook", f"El gancho se parece mucho al de {item['id']}"))
    return findings


def shared_ratio(first: str, second: str) -> float:
    left, right = set(first.split()), set(second.split())
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def lint(plan: dict[str, Any], directory: Path, target: int, catalog: dict[str, Any], identifier: str) -> dict[str, Any]:
    findings: list[dict[str, str]] = []
    findings += check_structure(plan, target)
    findings += check_product_reveal(plan, target)
    findings += check_final_voice_pace(plan)
    findings += check_headlines(plan)
    findings += check_voice(plan)
    findings += check_voice_profile(plan)
    findings += check_claims(plan)
    findings += check_cta(plan)
    findings += check_message_duplication(plan)
    findings += check_assets(plan, directory)
    findings += check_cover_art(plan)
    findings += check_hero_scene(plan, catalog, identifier)
    findings += check_repetition(plan, catalog, identifier)
    errors = [item for item in findings if item["level"] == "error"]
    warnings = [item for item in findings if item["level"] == "warning"]
    return {
        "passed": not errors,
        "errors": len(errors),
        "warnings": len(warnings),
        "findings": findings,
        "estimated_seconds": round(sum(voice.estimate_seconds(text_of(scene, "voice")) for scene in plan.get("scenes") or []), 1),
        "target_seconds": target,
    }
