"""
Short, human-transcribable codes for a listing.

A listing already has a numeric id and a URL, and neither survives the trip a
promotion image takes: someone photographs the screen, WhatsApp recompresses the
picture until the QR stops scanning, and what is left is whatever a person can
read and type. That is what this code is for, so the only property that matters
is that it cannot be transcribed wrong.

The alphabet drops every glyph that has a twin in a rendered font: 0/O, 1/I/L.
Five characters over the remaining 31 give ~28.6 million codes, which is several
orders of magnitude above the number of listings this portal will ever hold, so
collisions stay rare enough that a retry loop is the whole conflict strategy.
"""

import secrets

# Crockford-style: no 0, O, 1, I or L. See the module docstring.
ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

CODE_LENGTH = 5

# Separators a person may add to break up the code while typing it.
_IGNORED = str.maketrans("", "", " -_.")


def generate_code(length: int = CODE_LENGTH) -> str:
    """One random code. Says nothing about whether it is already taken."""
    return "".join(secrets.choice(ALPHABET) for _ in range(length))


def normalize_code(raw: str) -> str:
    """
    Turn what someone typed into what they meant.

    Deliberately shallow: it upper-cases and drops separators, and does not try
    to map ``0`` onto ``O`` the way a Crockford decoder would. It cannot, and it
    should not — *both* glyphs of every confusable pair are missing from
    ALPHABET, so a code can contain neither, and a reader is never shown one to
    mistype in the first place. Someone who types an ``O`` did not misread an
    ambiguous character; they misread an unambiguous one, and a 404 is the
    honest answer.
    """
    return raw.strip().translate(_IGNORED).upper()


def unique_code(model, field: str = "short_code", attempts: int = 10) -> str:
    """
    A code no row of ``model`` is using yet.

    The unique index on the column is the real guarantee; this loop only keeps
    the common case from ever reaching it.
    """
    for _ in range(attempts):
        code = generate_code()
        if not model.objects.filter(**{field: code}).exists():
            return code
    # Exhausting ten draws over a 28-million space means the table is far bigger
    # than this scheme was sized for, and silently returning a duplicate would
    # surface as an IntegrityError somewhere far from here.
    raise RuntimeError(
        f"Could not find a free {field} for {model.__name__} in {attempts} attempts"
    )
