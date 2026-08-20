#!/usr/bin/env python3
"""Everything the factory asks Claude for: plans, hook variants and lessons."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any

import quality
import brand


ROOT = Path(__file__).resolve().parent

PURPOSES = ["gancho", "problema", "prueba", "resultado", "cta"]

COMMON_CONTEXT_FILES = [
    "CLAUDE.md",
    "AGENTS.md",
    "council.md",
    "production-guide.md",
    "animation-standard.md",
    "system/voice-profiles.json",
]
# Compatibility for callers and tests that inspect the common contract list.
CONTEXT_FILES = COMMON_CONTEXT_FILES

PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "title", "audience", "funnel_stage", "objective", "conversion_event",
        "pillar", "series", "concept", "promise", "cta", "hypothesis",
        "cover_text", "caption", "narration",
        "verification_notes", "scenes",
    ],
    "properties": {
        "title": {"type": "string"},
        "audience": {"type": "string", "enum": ["comprador", "propietario", "profesional"]},
        "funnel_stage": {"type": "string", "enum": ["descubrimiento", "consideración", "conversión"]},
        "objective": {"type": "string"},
        "conversion_event": {"type": "string"},
        "pillar": {"type": "string"},
        "series": {"type": "string"},
        "concept": {"type": "string"},
        "promise": {"type": "string"},
        "cta": {"type": "string", "maxLength": 34},
        "hypothesis": {"type": "string"},
        "cover_text": {"type": "string", "maxLength": 32},
        "caption": {"type": "string"},
        "hashtags": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "items": {"type": "string", "pattern": "^#[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]+$"},
        },
        "narration": {"type": "string"},
        "voice_profile": {"type": ["string", "null"]},
        # Optional instrumental brief. Absent means the piece carries no music,
        # which stays the default: a licensed free bed is used only when selected.
        "music": {"type": ["string", "null"], "maxLength": 300},
        "verification_notes": {"type": "array", "items": {"type": "string"}},
        # The ceiling is the lesson format's; `quality.scene_budget` holds short
        # form to eight and a story to sixteen, so a fifteen-second piece still
        # cannot arrive with forty.
        "scenes": {
            "type": "array",
            "minItems": 3,
            "maxItems": 40,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["purpose", "duration", "voice", "on_screen_text", "asset", "visual_direction", "transition"],
                "properties": {
                    "purpose": {"type": "string", "enum": PURPOSES},
                    "duration": {"type": "number"},
                    "voice": {"type": "string"},
                    "on_screen_text": {"type": "string", "maxLength": 22},
                    "asset": {"type": ["string", "null"]},
                    "visual_direction": {"type": "string"},
                    "transition": {"type": "string", "enum": ["cut", "fade"]},
                },
            },
        },
    },
}

HOOKS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["hooks"],
    "properties": {
        "hooks": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["label", "voice", "on_screen_text", "cover_text", "rationale"],
                "properties": {
                    "label": {"type": "string", "maxLength": 24},
                    "voice": {"type": "string"},
                    "on_screen_text": {"type": "string", "maxLength": 22},
                    "cover_text": {"type": "string", "maxLength": 32},
                    "rationale": {"type": "string"},
                },
            },
        },
    },
}

LESSONS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["lessons", "recommended_gaps"],
    "properties": {
        "lessons": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["scope", "applies_to", "observation", "rule", "evidence_video"],
                "properties": {
                    "scope": {"type": "string", "enum": ["global", "audience", "series"]},
                    "applies_to": {"type": ["string", "null"]},
                    "observation": {"type": "string"},
                    "rule": {"type": "string"},
                    "evidence_video": {"type": "string"},
                },
            },
        },
        "recommended_gaps": {"type": "array", "items": {"type": "string"}},
    },
}


def read_context() -> str:
    parts = []
    profile = brand.current()
    paths = [ROOT / name for name in COMMON_CONTEXT_FILES]
    paths.extend(profile.context_files)
    paths.extend([
        profile.memory / "lessons.md",
        profile.memory / "content-gaps.json",
        profile.memory / "decisions.md",
    ])
    for path in paths:
        if path.exists():
            parts.append(path.read_text(encoding="utf-8"))
    return "\n\n".join(parts)


def error_detail(completed: subprocess.CompletedProcess[str]) -> str:
    """Claude reports failures inside its JSON payload, leaving stderr empty."""
    detail = completed.stderr.strip()
    try:
        payload = json.loads(completed.stdout)
    except (json.JSONDecodeError, ValueError):
        return detail or completed.stdout.strip()[:400] or "no output"
    errors = payload.get("errors") or []
    return "; ".join(filter(None, [detail, payload.get("subtype", ""), *errors])) or "no detail reported"


def ask(prompt: str, schema: dict[str, Any], system: str | None = None) -> dict[str, Any]:
    """Run one closed-book structured request against the authenticated CLI.

    Tools stay disabled on purpose: the system prompt asks for claims to be
    verified against specs/, and with tools available the planner burns its
    turns on permission-denied Bash calls and dies on the turn limit.
    """
    command = [
        "claude", "-p",
        "--output-format", "json",
        "--json-schema", json.dumps(schema),
        "--tools", "",
        "--max-turns", "2",
    ]
    if system:
        command.extend(["--system-prompt", system])
    model = os.environ.get("CLAUDE_MODEL")
    if model:
        command.extend(["--model", model])
    completed = subprocess.run(command, input=prompt, text=True, capture_output=True)
    if completed.returncode:
        raise RuntimeError(f"Claude CLI failed: {error_detail(completed)}")
    response = json.loads(completed.stdout)
    structured = response.get("structured_output")
    if isinstance(structured, dict):
        return structured
    result = response.get("result")
    if isinstance(result, str):
        return json.loads(result)
    raise RuntimeError(f"Claude returned no structured output: {str(response)[:400]}")


SIMULATIONS = {
    "sim:credicasa-hero": "gancho educativo: las tres cifras conocidas quedan detrás de las condiciones que realmente deciden el crédito",
    "sim:credicasa-fact-card": "educación Credicasa: tasas, monto y plazo publicados con fecha y fuente",
    "sim:credicasa-home-gate": "educación Credicasa: condiciones que debe cumplir la vivienda",
    "sim:credicasa-three-numbers": "educación Credicasa: precio, avalúo y crédito no son la misma cifra",
    "sim:credicasa-entry-example": "ejemplo Credicasa: entrada tradicional frente a financiamiento de hasta 100 %",
    "sim:credicasa-capacity": "ejemplo Credicasa: el monto aprobado depende de la capacidad de endeudamiento",
    "sim:credicasa-applicants-a": "educación Credicasa: aportaciones de afiliados dependientes y voluntarios",
    "sim:credicasa-applicants-b": "educación Credicasa: jubilados, discapacidad y límite de ingreso familiar",
    "sim:credicasa-payment-example": "ejemplo Credicasa: cuota aproximada, seguros, gastos y simulación oficial",
    "sim:credicasa-total-envelope": "educación Credicasa: vivienda y gastos dentro del mismo límite de $65.000",
    "sim:credicasa-rate-reset": "educación Credicasa: reajuste publicado cada 180 días y revisión contractual",
    "sim:credicasa-reservation": "educación de compra: condiciones escritas de una reserva dependiente del financiamiento",
    "sim:credicasa-order-a": "proceso Credicasa: requisitos, precalificación, presupuesto y vivienda elegible",
    "sim:credicasa-order-b": "proceso Credicasa: comparar, confirmar, avaluar y leer antes de firmar",
    "sim:que-compras": "animación educativa: comprar un departamento es comprar una parte de un edificio",
    "sim:propiedad-horizontal": "animación educativa: qué consta en la escritura y qué es área común",
    "sim:alicuota": "animación educativa: la alícuota mensual y el certificado de estar al día",
    "sim:edificio": "animación educativa: las actas de asamblea y el estado real del edificio",
    "sim:escrituras": "animación: la escritura, el propietario inscrito y la comprobación de que es quien vende",
    "sim:gravamenes": "animación: el certificado de gravámenes y el predial, leídos uno a uno",
    "sim:gravamenes-departamento": "animación: el mismo certificado de gravámenes, dicho sobre un departamento",
    "sim:uso-suelo": "animación: el uso de suelo del municipio y lo que permite construir",
    "sim:linderos": "animación: caminar los linderos y encontrar la medida que no cuadra",
    "sim:servicios": "animación: los servicios que llegan al terreno y el acceso en invierno",
    "sim:alrededor": "animación: el entorno del terreno en el mapa, las vías y el acceso",
    "sim:entorno-mapa": "animación: las vías y el entorno inmediato de un edificio antes de visitarlo",
    "sim:forma-dibujada": "animación: la Forma del terreno dibujándose, con el aviso de que no es un plano legal",
    "sim:medidas": "animación: el campo Medidas de la ficha marcado como referencia aproximada",
    "sim:dividir": "animación: precio total dividido para el área, el precio por m² y dos terrenos de distinto tamaño comparados",
    "sim:metros-utiles": "animación educativa: comparar el precio usando metros útiles y separar las áreas comunes",
    "sim:preguntas": "animación educativa: lo que una foto de un terreno no puede decirte, fuera de cualquier portal",
    "sim:anuncios": "animación: anuncios cayendo en pila, cada uno con foto y precio y el hueco de la ubicación vacío",
    "sim:llegada": "animación: los anuncios se apartan y entra el mapa con la marca; úsala en la escena donde se nombra Geo Propiedades",
    "sim:mapa": "animación: del mapa del país a una zona, las burbujas de ciudad se abren en barrios y luego en casas con su precio",
    "sim:zona": "animación: se abre una zona, primero el agrupado y después los pines de cada casa con su precio",
    "sim:filtros": "animación: un filtro de precio se ajusta sobre el mapa y desaparecen las propiedades fuera del rango",
    "sim:ficha": "animación: una ficha entra en cuadro con su foto, su precio y sus características",
    "sim:precio": "animación: el precio por metro cuadrado sube y se sitúa dentro del rango habitual de la zona, con el número de comparables",
    "sim:publicar": "animación: los cinco pasos de publicar se marcan uno a uno",
    "sim:publicar-gratis": "animación: el flujo de publicación aparece junto a costo cero y sin comisión",
    "sim:formulario": "animación: el formulario real avanza entre tipo de propiedad y estado",
    "sim:ubicacion-publicacion": "animación: cambia entre un punto y la Forma del terreno sobre el mapa",
    "sim:fotos-publicacion": "animación: el precio y las fotos forman la vista previa de la propiedad",
    "sim:revisar-fotos": "animación de comprador: galería pública y características declaradas",
    "sim:precio-area": "animación de comprador: precio por m² y comparación con inventario activo del mismo tipo, operación y ciudad",
    "sim:ubicacion-ficha": "animación de comprador: ubicación pública y Forma del terreno condicionada a que exista",
    "sim:contacto": "animación de comprador: el bloque de contacto de la ficha, el teléfono que se revela y el mensaje ya escrito para quien publica",
    "sim:vender": "animación de propietario: el terreno y la casa con su letrero de se vende o se arrienda",
    "sim:cero-comision": "animación de propietario: cero por publicar, cero comisión al vender o arrendar y sin límite de propiedades",
    "sim:ya-estan": "animación de propietario: el mapa lleno de propiedades en venta y el hueco de la que falta",
    "sim:anuncio-en-mapa": "animación de propietario: el anuncio publicado aterriza en el mapa con su forma de terreno y su precio",
    "sim:te-contactan": "animación de propietario: la llamada y el mensaje del interesado llegan directo al anunciante",
    "sim:donde-queda": "animación de propietario: el anuncio ya publicado, con la fila de ubicación vacía y los mensajes preguntando dónde queda",
    "sim:ya-lo-saben": "animación de propietario: el mismo anuncio con su ubicación en el mapa y mensajes que ya no preguntan la dirección",
    "sim:geo-ranking-hero": "animación de gancho de comprador: se abre un anuncio tras otro, cada uno se pliega a una pila y los precios que quedan a la vista no se ordenan solos; el hueco de la posición queda vacío",
    "sim:pagina-ordenada": "animación de comprador: una página del blog aterriza ya hecha, con su título y tres anuncios numerados y ordenados por precio",
    "sim:recetas-ranking": "animación de comprador: el título cambia de receta y las mismas filas se reordenan; después la cámara descubre debajo los anuncios publicados subiendo hacia una banda que descarta los valores imposibles",
    "sim:razon-posicion": "animación de comprador: cada fila despliega el motivo de su posición y la primera sale de la lista para aterrizar sobre el mapa como un pin",
    "sim:sin-destacado": "animación de comprador: las etiquetas destacado, publicidad y lo más visto intentan pegarse a la primera posición y son rechazadas; el orden no se mueve",
    "sim:elige-zona": "animación de comprador: el mapa se mueve hasta la zona elegida y los anuncios sueltos aparecen dentro como propiedades ubicadas",
    "sim:verificar": "animación educativa: comprobar propietario, documentos y gravámenes antes de pagar",
    "sim:negociar": "animación educativa: el precio publicado se tacha, entra una oferta y se llega a un acuerdo",
    "sim:promesa": "animación educativa: la reserva o promesa de compraventa firmada por comprador y vendedor",
    "sim:escritura-publica": "animación educativa: la escritura pública de compraventa firmada ante notario",
    "sim:inscripcion": "animación educativa: la transferencia se inscribe y cambia el propietario inscrito",
    "sim:pasos-compra": "animación educativa: los seis pasos de una compraventa, en orden, hasta la inscripción",
    "sim:aents-reveal": "animación de Aents: Geo Propiedades Ecuador aparece como caso real construido por Aents",
    "sim:aents-idea": "animación de Aents: una idea se conecta con app, plataforma web, sistema y automatización",
    "sim:aents-flujo": "animación de Aents: documentos, hojas y mensajes separados convergen en un solo flujo conectado",
    "sim:aents-proceso": "animación de Aents: estrategia, diseño, desarrollo y lanzamiento",
    "sim:aents-servicios": "animación de Aents: webs, apps, sistemas empresariales y automatización con integraciones",
    "sim:aents-contacto": "animación final de Aents: Agenda tu idea, WhatsApp 098 373 8151 y aents.net",
    "sim:aents-web-busqueda": "animación de Aents: alguien busca una empresa, abre su web y decide entre confiar o seguir buscando",
    "sim:aents-web-lenta": "animación de Aents: una web lenta y antigua que no cabe en el teléfono y acaba cerrada",
    "sim:aents-web-nueva": "animación de Aents: la misma página reconstruida, recorrida por secciones y adaptada al móvil",
    "sim:aents-web-conversion": "animación de Aents: una búsqueda se vuelve visita y la visita, una solicitud de información",
    "sim:aents-web-cierre": "animación final de Aents para webs: la página recibe contactos a cualquier hora, WhatsApp y aents.net",
    "sim:aents-crecimiento": "animación de Aents: el contador de clientes de un negocio de ejemplo sube mientras los canales que lo atienden se cruzan",
    "sim:aents-carga": "animación de Aents: clientes, datos y procesos suben, el tiempo baja y la cola que sostiene una sola persona termina en error",
    "sim:aents-giro": "animación de Aents: el ruido se apaga, queda la pregunta de si el sistema puede hacer el trabajo y entra el isotipo",
    "sim:aents-arquitectura": "animación de Aents: clientes, web y app, el sistema a medida, sus módulos y la automatización se conectan de arriba abajo",
    "sim:aents-automatizacion": "animación de Aents: entra un pedido de ejemplo y el sistema confirma pago, inventario, factura, aviso al cliente y reporte",
    "sim:aents-panel": "animación de Aents: un panel de ejemplo responde qué necesita atención hoy y muestra los roles del equipo",
    "sim:aents-escala": "animación de Aents: el número de clientes del ejemplo pasa de diez a diez mil y la interfaz no se mueve",
    "sim:aents-posicionamiento": "animación de Aents: la palabra software se tacha y la reemplaza construimos sistemas que hacen avanzar negocios",
    "sim:aents-cierre": "cierre de marca de Aents: isotipo, nombre, Software para personas, sus servicios y aents.net",
    "sim:aents-busqueda": "animación de Aents: una búsqueda de ejemplo devuelve perfiles sociales y un directorio, y la fila de la página web propia queda vacía",
    "sim:aents-lenta": "animación de Aents: una web de ejemplo tarda en abrir y su contenido se sale de la pantalla al encogerse el marco a un teléfono",
    "sim:aents-rebote": "animación de Aents: el visitante busca, entra y se va, y la etiqueta nuevo cliente se tacha hasta quedar oportunidad perdida",
    "sim:aents-rearmado": "animación de Aents: las piezas de una página de ejemplo se ensamblan en una web clara y alguien pulsa solicitar cotización",
    "sim:aents-prueba-web": "animación de Aents: posicionamiento, móvil, velocidad y conversión se confirman y el cuadro entrega el cierre con aents.net",
    "sim:aents-antes": "animación de Aents: la cámara se aleja de las credenciales de una constructora de ejemplo y descubre la web antigua donde viven, rotulada ANTES",
    "sim:aents-contraste": "animación de Aents: la empresa de ejemplo frente a su presencia digital, en dos columnas, y la pregunta de si se ve el problema",
    "sim:aents-reconstruccion": "animación de Aents: la web antigua se selecciona y se borra, y la página nueva se arma por piezas hasta el título y sus botones",
    "sim:aents-credibilidad": "animación de Aents: un recorrido por la página nueva con las cifras de la empresa de ejemplo y sus proyectos por tipo",
    "sim:aents-cotizacion": "animación de Aents: un proyecto de ejemplo se abre, alguien pulsa solicitar cotización y entra la nueva solicitud",
    "sim:aents-adaptacion": "animación de Aents: la página pasa de escritorio a teléfono reordenándose y un pulgar alcanza el botón",
    "sim:aents-comparacion": "animación de Aents: la web antigua y la nueva comparten cuadro hasta que el divisor deja solo la nueva",
    "sim:aents-problema-software": "animación de Aents: un problema cruza el isotipo y sale convertido en software con el proceso, los datos y el equipo",
    "sim:aents-disperso": "animación de Aents: el mismo proceso repartido en hojas, documentos, mensajes y una tarea que se repite sin resolverse",
    "sim:aents-desconectado": "animación de Aents: las herramientas existen pero aisladas, y los enlaces se completan cuando entra la marca",
    "sim:aents-entender": "animación de Aents: el flujo real del negocio leído paso a paso hasta marcar dónde se traba",
    "sim:aents-soluciones": "animación de Aents: una misma necesidad elige app, plataforma web, sistema o automatización y las cuatro quedan enlazadas",
    "sim:aents-etapas": "animación de Aents: un mismo producto cruza estrategia, diseño, desarrollo y lanzamiento transformándose en cada etapa",
    "sim:aents-medida": "animación de Aents: el bloque genérico no encaja en el proceso de la empresa y el software se construye alrededor de él",
    "sim:aents-seo-encontrar": "animación de Aents: un buscador y una IA que responde entregan resultados y fuentes donde la web del negocio no aparece",
    "sim:aents-seo-entender": "animación de Aents: un lector recorre la página y entiende quién es el negocio, qué hace y cuándo mostrarlo",
    "sim:aents-seo-intencion": "animación de Aents: el anuncio que interrumpe frente a la búsqueda que ya venía con la intención puesta",
    "sim:aents-seo-senales": "animación de Aents: una página bonita que no dice de qué trata, y las señales que la vuelven entendible",
    "sim:aents-seo-red": "animación de Aents: una sola página de servicios se abre en una página por cada búsqueda real",
    "sim:aents-seo-respuesta": "animación de Aents: la lista de resultados se convierte en una respuesta escrita con sus fuentes",
    "sim:aents-seo-sin-truco": "animación de Aents: no hay botón para salir en la IA ni mil páginas generadas que sirvan; queda la información clara y propia",
    "sim:aents-seo-datos": "animación de Aents: la frase vaga se cambia por datos concretos que una respuesta puede citar",
    "sim:aents-seo-entidad": "animación de Aents: la misma identidad repetida en varios lugares confiables",
    "sim:aents-seo-lectores": "animación de Aents: lo que recibe un lector de IA, el contenido servido en el código y el despliegue que se bloquea si falta",
    "sim:aents-encoge": "animación de Aents: la misma página pasa de monitor a teléfono encogiéndose sin reordenarse, hasta que el texto no se lee y el botón no se toca",
    "sim:aents-sintomas": "animación de Aents: cinco fallos móviles demostrados dentro de un mismo teléfono, cada uno con su equis",
    "sim:aents-dos-caminos": "animación de Aents: a un lado una página de escritorio que se reduce, al otro un teléfono que se llena por orden de importancia",
    "sim:aents-cabe": "animación de Aents: una interfaz de escritorio se construye entera y después se comprime en un teléfono hasta que cabe, y la pregunta de si es cómoda",
    "sim:aents-pregunta": "animación de Aents: las acciones posibles se ordenan alrededor de una persona hasta que dos ocupan la pantalla del teléfono",
    "sim:aents-portal-escritorio": "animación de Aents: la plataforma de propiedades en escritorio, con mapa, buscador, filtros y listado, se estrecha sin reordenarse y choca",
    "sim:aents-portal-movil": "animación de Aents: la misma plataforma en el teléfono, con mapa a pantalla completa, ficha que sube desde abajo y filtros detrás de un botón",
    "sim:aents-dedo": "animación de Aents: el mismo botón alcanzado por un cursor y por un dedo, y el tamaño que hace falta para que el dedo acierte",
    "sim:aents-tarjetas": "animación de Aents: una tabla se pliega en tarjetas, una ventana se convierte en hoja inferior y un menú superior en navegación inferior",
    "sim:aents-gestos": "animación de Aents: tocar, deslizar, mantener, arrastrar y ampliar, cada gesto con su consecuencia dentro del mismo teléfono",
    "sim:aents-peso": "animación de Aents: la misma página abre al instante con fibra y se atasca con datos móviles, hasta que se recorta lo que se descarga",
    "sim:aents-hacia-arriba": "animación de Aents: el marco crece de teléfono a monitor y aparecen columnas y paneles nuevos sin agrandar la columna original",
    "sim:aents-usala": "animación de Aents: la prueba de usar la web desde el teléfono paso a paso y el arco que alcanza el pulgar",
    "sim:aents-ia-funciona": "animación de Aents: un pedido genera una aplicación que abre y funciona, y al alejarse aparecen las capas que nadie decidió",
    "sim:aents-ia-contexto": "animación de Aents: un pedido vago devuelve algo genérico que se descarta, y con el contexto puesto la estructura se rehace con nombres y jerarquía",
    "sim:aents-ia-partes": "animación de Aents: un pedido enorme dispara cientos de archivos donde el error no se encuentra, frente a cinco bloques construidos y probados en orden",
    "sim:aents-ia-reglas": "animación de Aents: dos citas de ejemplo chocan en el mismo horario y las preguntas sin responder se convierten en reglas que resuelven el conflicto",
    "sim:aents-ia-camino-feliz": "animación de Aents: el recorrido perfecto se confirma y después falla sin conexión, con doble toque y sin permiso",
    "sim:aents-ia-revision": "animación de Aents: en vez de aceptar todo se revisa, se pregunta por cada decisión y el código sobrante y duplicado desaparece",
    "sim:aents-ia-dependencias": "animación de Aents: los paquetes entierran una aplicación pequeña hasta que tres preguntas dejan solo los necesarios",
    "sim:aents-ia-seguridad": "animación de Aents: esconder el botón no impide que una petición llegue al servidor, hasta que las capas de acceso, permisos y validación la rechazan",
    "sim:aents-ia-secretos": "animación de Aents: contraseñas, claves y datos de clientes se detienen antes de entrar en una herramienta de inteligencia artificial",
    "sim:aents-ia-pruebas": "animación de Aents: la misma pieza cambia de papel y prueba su propio trabajo hasta encontrar y corregir la causa del fallo",
    "sim:aents-ia-git": "animación de Aents: decenas de archivos modificados rompen la aplicación y el proyecto vuelve a su último punto estable",
    "sim:aents-ia-orden": "animación de Aents: el proyecto se llena de archivos casi iguales hasta que se funden los duplicados y queda una estructura legible",
    "sim:aents-ia-criterio": "animación de Aents: el software está construido pero el centro del negocio está vacío hasta que una persona pone reglas, roles, proceso y objetivo",
    "sim:aents-ia-cierre": "cierre de Aents para la clase de inteligencia artificial: el camino de contexto a producto y la invitación a contar qué estás construyendo",
}


def describe_assets(assets: list[dict[str, Any]]) -> str:
    profile = brand.current()
    allowed = set(profile.simulations) if profile.simulations else set(SIMULATIONS)
    animated = "\n".join(
        f"- {name}: {description}" for name, description in SIMULATIONS.items() if name in allowed
    )
    preamble = (
        "Animated recreations you can use in any scene. They are drawn illustrations of the "
        "product, never screenshots, so describe what they show without claiming the viewer is "
        "watching a recording:\n" + animated + "\n\n"
    )
    if not assets:
        return preamble + (
            "There is no screen footage. Use the animated recreations above, or asset: null for a "
            "branded typographic scene. Do not describe screens that will not be shown."
        )
    lines = []
    for asset in assets:
        warning = " — REQUIERE AUTORIZACIÓN DEL ANUNCIANTE" if asset.get("requires_authorization") else ""
        lines.append(f"- {asset['file']}: {asset['description']} ({asset.get('proves', 'sin nota')}){warning}")
    return preamble + (
        "Approved screen captures. Use these exact filenames, an animation above, or null:\n"
        + "\n".join(lines)
        + "\nIf you use a clip marked as requiring authorisation, add a verification note that "
        "names the clip file without its extension and states whose permission must be on file "
        "before publishing. The gate looks for the clip name and the word autorización in the "
        "same note."
    )


def create_plan(brief: str, duration: int, assets: list[dict[str, Any]], catalog: str) -> dict[str, Any]:
    profile = brand.current()
    scenes = quality.scene_budget(duration)
    reveal = quality.product_reveal_deadline(duration)
    if quality.is_lesson(duration):
        shape = (
            "This is a lesson: the viewer stays because they are learning something they "
            "came for, so every scene has to teach a step they did not know before it. "
            "Order the steps so each one earns the next; never restate a point for length."
        )
    elif quality.is_story(duration):
        shape = (
            "This is a story: it may set the scene before it demonstrates, and it has to "
            "hold attention with narrative, not with filler. Every beat moves the story on."
        )
    else:
        shape = "This is short form: one promise and its demonstration, nothing else."
    prompt = f"""Create one production-ready Spanish social video for {profile.name}.

The selected brand is {profile.id}. Its canonical domain is {profile.domain}.
The audience must be one of: {', '.join(profile.audiences)}.

Target duration: {duration} seconds, and scene durations must total approximately that.
The renderer measures the real speech, so keep narration tight: roughly 15 spoken
characters per second. A {duration} second video holds about {duration * 14} characters
of narration in total.

{shape}

The first scene must hook in two seconds. Use at most {scenes} scenes, one audience,
one promise and one CTA. Follow the selected brand's product-reveal rule; do not
spend consecutive scenes repeating the problem. Use only the CTA families and
audience rules in the selected brand context.
Every voice field is the exact narration spoken during that scene, written for a
text-to-speech voice: no emoji, no hashtags, no stage directions, no abbreviations
the voice cannot read. Write numbers and URLs the way they are pronounced.
Each on_screen_text is a rótulo of at most four words and 22 characters: it has to fit on a single row.
The narration field joins every voice field in order.
Add 3 to 5 relevant hashtags in the hashtags field. Each one starts with #,
contains no spaces, and must not introduce a claim that the approved copy does
not make. These hashtags are publishing metadata and are never spoken.
Every animated visual direction must describe a complete causal arc: initial state,
action, visible response and resolved proof. Follow animation-standard.md. Do not
request a generic entrance, decorative particles, a placeholder or an unfinished
sketch as the scene's demonstration.
Choose one video-level voice_profile only when the brief requests a known profile;
otherwise leave it null so the render stage uses its configured default. Every
scene uses that same narrator. Never invent a profile id or change voices inside
one video.

The music field is a short instrumental brief in Spanish describing the bed that
sits under the voice: genre, instruments, tempo and mood. It is never sung and
never competes with the narration, so do not ask for vocals, lyrics or a chorus.
Leave it null when the piece is stronger with no music at all.

{describe_assets(assets)}

PREVIOUS VIDEO CATALOG:
{catalog}

Study the catalog before planning. Complement missing audiences, funnel stages,
pillars or objections. Do not repeat a previous hook or concept unless the brief
explicitly asks for a variant.

USER BRIEF:
{brief}
"""
    schema = json.loads(json.dumps(PLAN_SCHEMA))
    schema["properties"]["audience"]["enum"] = list(profile.audiences)
    return ask(prompt, schema, read_context())


def create_hooks(plan: dict[str, Any], count: int) -> list[dict[str, Any]]:
    prompt = f"""Write {count} alternative opening hooks for this approved Spanish social video.

Keep the same audience, promise, body and CTA. Change only the first scene: its
spoken line, its rótulo and the cover text. Each hook must use a different
mechanism (for example a question, a common mistake, a result first, a direct
contradiction) so the experiment isolates one variable.

The spoken line must be sayable in about two seconds, which is roughly 30 characters.

APPROVED PLAN:
{json.dumps(plan, ensure_ascii=False)}
"""
    return ask(prompt, HOOKS_SCHEMA, read_context())["hooks"]


def create_lessons(evidence: list[dict[str, Any]], coverage: dict[str, Any]) -> dict[str, Any]:
    profile = brand.current()
    prompt = (
        f"Analyze these social video results for {profile.name}. Produce cautious, "
        "actionable Spanish lessons. Do not infer causality without a controlled comparison; "
        "label limited evidence in the observation. Recommend content gaps that complement "
        "the catalog.\n\n"
        + json.dumps({"evidence": evidence, "coverage": coverage}, ensure_ascii=False)
    )
    return ask(prompt, LESSONS_SCHEMA)
