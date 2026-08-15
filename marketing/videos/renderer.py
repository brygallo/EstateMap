#!/usr/bin/env python3
"""Remotion staging and invocation."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

from media import probe_duration


ROOT = Path(__file__).resolve().parent
REMOTION = ROOT / "remotion"
FONT = ROOT / "assets/fonts/PlusJakartaSans-ExtraBold.ttf"
BRAND_TILE = ROOT / "assets/brand/aents-brand-tile-1024.png"
BRAND_SYMBOL = ROOT / "assets/brand/aents-symbol-negative.png"
FPS = 30
ACCENTS = ["#22C55E", "#6B5CF6", "#14B8A6", "#A78BFA"]
URL = "geopropiedadesecuador.com"
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm"}

# Animated recreations drawn in Remotion. They are named as assets so a plan can
# choose one the same way it chooses footage, but they have no file behind them.
SIMULATIONS = {
    "sim:que-compras": "La cámara se abre desde el departamento encendido hasta el edificio entero, con sus reglas, sus vecinos y sus deudas",
    "sim:propiedad-horizontal": "El corte del edificio separa lo privado de lo común y la página siguiente muestra el parqueadero y la bodega marcados EN LA ESCRITURA, frente al cartel de tiza que se borra",
    "sim:alicuota": "Los meses de alícuota pagados, lo que cubre, y el certificado firmado de que el vendedor está al día",
    "sim:edificio": "El acta de asamblea con su cuota extraordinaria aprobada, y después el recorrido por la cisterna, el ascensor, la bomba y las humedades",
    "sim:escrituras": "La escritura y el sello del registro: el propietario inscrito se coteja con quien te vende",
    "sim:gravamenes": "El certificado se lee línea a línea —hipoteca, embargo, demanda— junto al impuesto predial",
    "sim:gravamenes-departamento": "El mismo certificado, dicho sobre el departamento en vez del terreno",
    "sim:uso-suelo": "La ficha del municipio: qué se puede construir en el lote, con pisos y retiros",
    "sim:linderos": "El recorrido del perímetro mojón por mojón, y el lado que no coincide con los papeles",
    "sim:servicios": "Agua, luz y alcantarillado llegando o quedándose cortos, y la vía en seco y con lluvia",
    "sim:alrededor": "El mapa se aleja desde el terreno y aparece el entorno: las vías, lo construido alrededor y por dónde se llega",
    "sim:entorno-mapa": "El mapa muestra las vías y el entorno inmediato de un edificio antes de visitarlo",
    "sim:forma-dibujada": "El contorno del terreno se dibuja esquina por esquina y queda claro que lo trazó quien publica, no un topógrafo",
    "sim:medidas": "Las filas declaradas de la ficha, con Medidas: Referencia aproximada resaltada y su aviso",
    "sim:dividir": "La división que hace quien compra: precio total entre área declarada, y el resultado por metro cuadrado",
    "sim:metros-utiles": "El precio se compara usando metros útiles y separando las áreas comunes",
    "sim:preguntas": "La foto del anuncio y, encima, todo lo que una foto no dice: escrituras, deudas, uso de suelo, linderos y servicios",
    "sim:anuncios": "Anuncios cayendo en pila: cada uno con su foto y su precio, y el lugar de la ubicación vacío",
    "sim:llegada": "Los anuncios se apartan y entra el mapa con la marca: el momento en que aparece la solución",
    "sim:mapa": "Del mapa del país a una zona: las burbujas de ciudad se abren en barrios y en casas con su precio",
    "sim:zona": "Se abre una zona: primero el agrupado de la zona y luego los pines de cada casa con su precio",
    "sim:filtros": "Un filtro de precio se ajusta sobre el mapa y desaparecen las propiedades fuera del rango",
    "sim:ficha": "Una ficha aparece con su foto, su precio y sus características",
    "sim:precio": "El precio por metro cuadrado sube y se sitúa dentro del rango habitual de la zona",
    "sim:publicar": "Los cinco pasos de publicar se van marcando uno a uno",
    "sim:publicar-gratis": "El flujo de publicación aparece junto a costo cero y sin comisión",
    "sim:formulario": "El formulario real avanza entre tipo de propiedad y estado",
    "sim:ubicacion-publicacion": "Se alterna entre un punto y la Forma del terreno sobre el mapa",
    "sim:fotos-publicacion": "El precio y las fotos forman la vista previa de la propiedad",
    "sim:chat-agente": "Fotos enviadas una tras otra por chat: bajo cada una el campo de ubicación está vacío y el cliente pregunta dónde queda",
    "sim:inventario-agente": "La rejilla de Mis propiedades se arma con las tarjetas del mismo anunciante, junto a costo cero y sin comisión",
    "sim:enlace-corto": "La ficha abre el enlace corto y el QR del kit, y el enlace viaja hasta la vista previa que recibe el cliente",
    "sim:revisar-fotos": "Galería pública y características declaradas para revisar antes de contactar",
    "sim:precio-area": "Inteligencia pública: precio por m² y contexto frente a inventario activo comparable",
    "sim:ubicacion-ficha": "Ubicación pública y Forma del terreno cuando quien publica la dibuja",
    "sim:contacto": "El bloque de contacto de la ficha: se revela el teléfono, se toca WhatsApp y sale el mensaje que la ficha deja escrito",
    "sim:vender": "El terreno y la casa que quieres vender o arrendar, con su letrero",
    "sim:cero-comision": "Lo que cuesta publicar: cero por publicar, cero comisión y sin límite de propiedades",
    "sim:ya-estan": "El mapa se llena de propiedades en venta y queda un hueco punteado donde falta la de quien mira",
    "sim:anuncio-en-mapa": "El anuncio viaja del formulario al mapa: se dibuja la Forma del terreno y su precio queda encima",
    "sim:te-contactan": "El teléfono del anunciante: entra la llamada del interesado y después su mensaje",
    "sim:aents-reveal": "Geo Propiedades Ecuador funcionando con una firma explícita de autoría de Aents",
    "sim:aents-proceso": "Las etapas de Aents: estrategia, diseño, desarrollo y lanzamiento",
    "sim:aents-servicios": "Servicios de Aents: webs, apps, sistemas y automatización con integraciones",
    "sim:aents-contacto": "Cierre de Aents con WhatsApp 098 373 8151 y aents.net",
}

# Silence held after the last caption so a scene never cuts on the final
# consonant.
SCENE_TAIL_SECONDS = 0.45

# How the master is encoded. Kept as data, not buried in the command, because
# the finished file cannot answer the question: x264 writes only
# "Lavc61.19.100 libx264" into the encoder tag, with no crf and no preset. Every
# render copies these into production.json so a published piece can prove what
# it was made with.
ENCODER_FLAGS = ["--crf", "16", "--x264-preset", "slow", "--pixel-format", "yuv420p"]


def executable() -> Path:
    path = REMOTION / "node_modules/.bin/remotion"
    if not path.exists():
        raise RuntimeError("Remotion dependencies are missing. Run marketing/videos/setup")
    return path


def frames(seconds: float) -> int:
    return max(1, round(seconds * FPS))


def asset_kind(path: Path) -> str:
    if path.suffix.lower() in IMAGE_SUFFIXES:
        return "image"
    if path.suffix.lower() in VIDEO_SUFFIXES:
        return "video"
    raise RuntimeError(f"Unsupported asset: {path.name}")


def stage_fonts() -> Path:
    """Put the shared font and brand mark where Remotion can serve them."""
    public = REMOTION / "public"
    (public / "fonts").mkdir(parents=True, exist_ok=True)
    shutil.copy2(FONT, public / "fonts" / FONT.name)
    (public / "brand").mkdir(parents=True, exist_ok=True)
    for mark in (BRAND_TILE, BRAND_SYMBOL):
        if mark.exists():
            shutil.copy2(mark, public / "brand" / mark.name)
    return public


def stage(directory: Path) -> Path:
    """Copy everything a render needs into Remotion's public directory."""
    public = stage_fonts()
    job = public / "jobs" / directory.name
    if job.exists():
        shutil.rmtree(job)
    (job / "audio").mkdir(parents=True)
    (job / "assets").mkdir()
    return job


def still_for(directory: Path, job: Path, name: str) -> str | None:
    """A real screenshot the card simulation can use as its photo."""
    for candidate in sorted((directory / "assets/input").glob("*.png")) + sorted((directory / "assets/input").glob("*.jpg")):
        shutil.copy2(candidate, job / "assets" / candidate.name)
        return f"jobs/{name}/assets/{candidate.name}"
    return None


def brand_tile_path() -> str | None:
    return f"brand/{BRAND_TILE.name}" if BRAND_TILE.exists() else None


class AssetTimeline:
    """How far each shared clip has been played, so scenes continue it.

    A capture is one continuous take: tap the city, the map opens, tap a pin,
    the listing appears. Scenes that share a clip have to carry on through it
    instead of each restarting at the first frame.
    """

    def __init__(self, plan: dict[str, Any], timings: list[dict[str, Any]]) -> None:
        # Total time an animation is on screen, so its whole arc can be spread
        # over that time instead of restarting on every scene.
        self.spans: dict[str, int] = {}
        for scene, timing in zip(plan["scenes"], timings):
            animation = scene.get("asset")
            if animation in SIMULATIONS:
                self.spans[animation] = self.spans.get(animation, 0) + frames(timing["render_seconds"])
        self.played: dict[str, int] = {}

    def total(self, key: str | None, fallback: int) -> int:
        return self.spans.get(key or "", fallback)

    def advance(self, key: str, span: int, available: int | None = None) -> int:
        """Reserve the next `span` frames of a clip and say where they start."""
        start = self.played.get(key, 0)
        # A recording shorter than the scene loops back rather than run dry.
        if available is not None and start + span > available:
            start = 0
        self.played[key] = start + span
        return start


def stage_asset(directory: Path, job: Path, name: str, scene: dict[str, Any]) -> tuple[str | None, str | None]:
    """Copy a scene's footage into the job and say what kind it is."""
    asset = scene.get("asset")
    if not asset:
        return None, None
    if asset in SIMULATIONS:
        return asset, "simulation"
    source = directory / "assets/input" / asset
    if not source.is_file():
        raise RuntimeError(f"Scene asset is missing: {asset}")
    shutil.copy2(source, job / "assets" / source.name)
    return f"jobs/{name}/assets/{source.name}", asset_kind(source)


def scene_props(
    index: int,
    scene: dict[str, Any],
    timing: dict[str, Any],
    directory: Path,
    job: Path,
    name: str,
    timeline: AssetTimeline,
) -> dict[str, Any]:
    voice_target = job / "audio" / f"voice-{index + 1:02}.mp3"
    shutil.copy2(Path(timing["voice_file"]), voice_target)
    asset_relative, asset_type = stage_asset(directory, job, name, scene)
    span = frames(timing["render_seconds"])
    start = 0
    if asset_type == "simulation" and asset_relative:
        start = timeline.advance(asset_relative, span)
    elif asset_relative and asset_type == "video":
        available = frames(probe_duration(directory / "assets/input" / scene["asset"]))
        start = timeline.advance(scene["asset"], span, available)
    return {
        "purpose": scene["purpose"],
        "durationInFrames": span,
        "headline": scene["on_screen_text"],
        "captions": timing["captions"],
        "visualDirection": scene["visual_direction"],
        "transition": scene["transition"],
        "asset": asset_relative,
        "assetType": asset_type,
        # Remotion's card simulation can show a real listing photo; nothing
        # populates it yet, so the composition falls back to its drawn card.
        "photo": None,
        "voiceFile": f"jobs/{name}/audio/{voice_target.name}",
        "assetStartInFrames": start,
        "assetTotalInFrames": timeline.total(scene.get("asset"), span),
        "accent": ACCENTS[index % len(ACCENTS)],
    }


def build_props(
    directory: Path,
    plan: dict[str, Any],
    timings: list[dict[str, Any]],
    music: Path | None,
) -> dict[str, Any]:
    job = stage(directory)
    name = directory.name
    timeline = AssetTimeline(plan, timings)
    scenes = [
        scene_props(index, scene, timing, directory, job, name, timeline)
        for index, (scene, timing) in enumerate(zip(plan["scenes"], timings))
    ]
    music_relative = None
    if music:
        shutil.copy2(music, job / "audio/music.mp3")
        music_relative = f"jobs/{name}/audio/music.mp3"
    return {
        "title": plan["title"],
        "coverText": plan["cover_text"],
        "cta": plan["cta"],
        "url": URL,
        "brandTile": brand_tile_path(),
        "kicker": plan.get("kicker"),
        "musicFile": music_relative,
        "showSafeAreas": False,
        "scenes": scenes,
    }

def render_video(props_path: Path, target: Path, composition: str = "EstateMapVideo") -> Path:
    """Export the master at the highest quality the platform can carry.

    TikTok and Reels re-encode whatever they receive, so the master is not what
    the viewer sees: it is the source the platform compresses from. Every bit
    lost here is lost again downstream, and flat brand graphics — large areas of
    solid colour with hard type over them — are exactly what shows banding and
    mosquito noise first.

    `crf 16` is visually transparent and leaves that downstream margin;
    `preset slow` spends encoder time, not quality, and `profile high` with
    `yuv420p` is what both platforms decode without falling back. The master is
    never re-compressed to fit an upload limit: if it does not fit, it is
    uploaded by hand.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        str(executable()), "render", "src/index.ts", composition, str(target),
        "--props", str(props_path), "--codec", "h264", *ENCODER_FLAGS,
    ]
    completed = subprocess.run(command, cwd=REMOTION, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Remotion render failed:\n{completed.stdout[-2000:]}\n{completed.stderr[-2000:]}")
    return target


def render_cover(directory: Path, plan: dict[str, Any], target: Path) -> Path:
    """Export the still cover.

    The asset is staged from the video's own input directory rather than read
    from a previous render's job folder, so `video cover` produces the same
    image whether or not a render ran first.
    """
    job = REMOTION / "public/jobs" / directory.name
    (job / "assets").mkdir(parents=True, exist_ok=True)
    asset = None
    asset_type = None
    for scene in plan["scenes"]:
        name = scene.get("asset")
        source = directory / "assets/input" / name if name else None
        if source and source.is_file() and asset_kind(source) == "image":
            shutil.copy2(source, job / "assets" / source.name)
            asset = f"jobs/{directory.name}/assets/{source.name}"
            asset_type = "image"
            break
    try:
        video_number = int(directory.name.rsplit("-", 1)[-1])
    except ValueError:
        video_number = 1
    props = {
        "coverText": plan["cover_text"],
        # Which illustration the cover shows, named by the plan instead of
        # guessed from a word in the title. A cover that changed its hook used
        # to load the wrong illustration and cover its own headline.
        "coverArt": plan.get("cover_art"),
        "cta": plan["cta"],
        "audience": plan.get("audience") or "",
        "url": URL,
        "brandTile": brand_tile_path(),
        "accent": ACCENTS[(video_number - 1) % len(ACCENTS)],
        "asset": asset,
        "assetType": asset_type,
    }
    props_path = directory / "cover-props.json"
    props_path.write_text(json.dumps(props, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    target.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        [str(executable()), "still", "src/index.ts", "EstateMapCover", str(target), "--props", str(props_path)],
        cwd=REMOTION,
        text=True,
        capture_output=True,
    )
    if completed.returncode:
        raise RuntimeError(f"Remotion cover failed:\n{completed.stdout[-1500:]}\n{completed.stderr[-1500:]}")
    return target
