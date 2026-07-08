"""
Helpers de normalización: convierten texto crudo de un anuncio en los valores
canónicos que espera el modelo ``Property``.

Todos son tolerantes a datos incompletos: si algo no se puede parsear devuelven
``None`` en lugar de fallar (política "no descartar anuncios por falta de
precio o área").
"""
import re
import unicodedata

# --- Mapeo de tipo de propiedad ---------------------------------------------
_TYPE_KEYWORDS = [
    ("land", ("terreno", "lote", "solar", "parcela", "quinta", "finca", "hacienda")),
    ("apartment", ("departamento", "apartamento", "suite", "loft", "flat")),
    ("house", ("casa", "villa", "chalet", "adosada")),
    ("commercial", ("oficina", "local", "comercial", "bodega", "galpon", "consultorio")),
]

# --- Mapeo de operación (venta / alquiler) ----------------------------------
_SALE_WORDS = ("sale", "venta", "sell")
_RENT_WORDS = ("rent", "rental", "alquiler", "arriendo", "renta")


def _strip_accents(text):
    return "".join(
        c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c)
    )


def map_property_type(*hints):
    """Deduce el ``property_type`` a partir de título/categoría/URL."""
    blob = _strip_accents(" ".join(h for h in hints if h)).lower()
    for ptype, words in _TYPE_KEYWORDS:
        if any(w in blob for w in words):
            return ptype
    return "other"


def map_status(*hints):
    """Deduce el ``status`` (for_sale / for_rent) a partir de la operación."""
    blob = _strip_accents(" ".join(h for h in hints if h)).lower()
    if any(w in blob for w in _RENT_WORDS):
        return "for_rent"
    if any(w in blob for w in _SALE_WORDS):
        return "for_sale"
    return "for_sale"


def parse_price(raw):
    """
    '$ 25.000' -> 25000.0 ; '1.250,50' -> 1250.5 ; 'Consultar'/'' -> None.

    Ecuador usa '.' como separador de miles y ',' como decimal. Si no hay
    dígitos suficientes se devuelve ``None`` ("Precio a consultar").
    """
    if raw is None:
        return None
    text = str(raw)
    # Quitar todo lo que no sea dígito, punto o coma.
    cleaned = re.sub(r"[^0-9.,]", "", text)
    if not re.search(r"\d", cleaned):
        return None
    has_dot = "." in cleaned
    has_comma = "," in cleaned
    if has_dot and has_comma:
        # El último separador es el decimal.
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif has_comma:
        # Coma sola: tratar como decimal si hay 1-2 dígitos tras ella, si no miles.
        parts = cleaned.split(",")
        if len(parts[-1]) in (1, 2) and len(parts) == 2:
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif has_dot:
        # Punto solo: si parece separador de miles (grupos de 3), quitarlo.
        parts = cleaned.split(".")
        if len(parts) > 2 or (len(parts) == 2 and len(parts[-1]) == 3):
            cleaned = cleaned.replace(".", "")
    try:
        value = float(cleaned)
    except ValueError:
        return None
    return value if value > 0 else None


# Cotas de sanidad para precios (USD, mercado ecuatoriano). Un valor fuera de
# rango casi siempre es un error de scraping (se leyó un área, un id, un teléfono
# o un número mal formateado como si fuera el precio). En ese caso preferimos
# dejar el precio en None ("a consultar") antes que publicar un dato absurdo.
_SALE_PRICE_MIN = 1_000          # una venta por menos de $1.000 es sospechosa
_RENT_PRICE_MIN = 20             # un alquiler por menos de $20/mes es sospechoso
_PRICE_MAX = 50_000_000          # nada realista supera los $50M en el país


def sanitize_price(price, status="for_sale"):
    """
    Devuelve ``(precio_limpio, motivo)``. ``precio_limpio`` es el valor si pasa
    las cotas de sanidad, o ``None`` si es absurdo; ``motivo`` es '' cuando es
    válido o una etiqueta corta cuando se descarta (para poder loguearlo).

    No lanza: los anuncios sin precio son válidos, así que un precio descartado
    simplemente se trata como "a consultar".
    """
    if price is None:
        return None, ""
    try:
        value = float(price)
    except (TypeError, ValueError):
        return None, "precio_no_numerico"
    if value <= 0:
        return None, "precio_no_positivo"
    minimo = _RENT_PRICE_MIN if status == "for_rent" else _SALE_PRICE_MIN
    if value < minimo:
        return None, f"precio_bajo_sospechoso({value:g})"
    if value > _PRICE_MAX:
        return None, f"precio_alto_sospechoso({value:g})"
    return value, ""


def parse_area(raw):
    """'357 m²' -> 357.0 ; '1.200 m2' -> 1200.0 ; '' -> None."""
    if raw is None:
        return None
    text = str(raw).lower().replace("m2", "").replace("m²", "")
    return parse_price(text)  # misma lógica numérica (miles/decimales)


def parse_int(raw):
    """'4' -> 4 ; '' / 'N/A' -> 0. Toma el primer entero que aparezca."""
    if raw is None:
        return 0
    m = re.search(r"\d+", str(raw))
    return int(m.group()) if m else 0


def build_dedup_key(latitude, longitude):
    """
    Huella de rejilla geográfica (~11 m) para acelerar el dedup por cercanía.
    Dos anuncios en la misma celda son candidatos a ser la misma propiedad.
    """
    if latitude is None or longitude is None:
        return ""
    return f"{round(float(latitude), 4)},{round(float(longitude), 4)}"


def fix_mojibake(text):
    """
    Repara una corrupción sistemática de Properati: la "ñ" aparece como "ð"
    (U+00F1 -> U+00F0), p. ej. 'Rumiðahui' -> 'Rumiñahui'. La 'ð' no existe en
    español/Ecuador, así que el reemplazo es seguro.
    """
    return text.replace("ð", "ñ").replace("Ð", "Ñ")


def clean_description(value):
    """
    Limpia una descripción larga PRESERVANDO los saltos de línea (viñetas,
    párrafos). Quita tags HTML, decodifica entidades, repara mojibake y colapsa
    saltos excesivos. Devuelve '' si es None.
    """
    import html as _html

    if not value:
        return ""
    text = _html.unescape(str(value))
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)          # resto de tags
    text = fix_mojibake(text)
    text = re.sub(r"[ \t]+\n", "\n", text)        # espacios al final de línea
    text = re.sub(r"\n{3,}", "\n\n", text)        # colapsar 3+ saltos
    return text.strip()


def clean_text(value, max_len=None):
    """Colapsa espacios, repara mojibake y recorta. Devuelve '' si es None."""
    if not value:
        return ""
    text = fix_mojibake(re.sub(r"\s+", " ", str(value)).strip())
    if max_len and len(text) > max_len:
        text = text[:max_len].rstrip()
    return text
