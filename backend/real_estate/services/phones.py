"""Phone numbers, in the one shape the database compares them in.

The same number reaches this system as `0987654321`, `+593 98 765 4321`,
`593987654321` or `(09) 8765-4321`, and a claim decided by string equality
would miss every spelling but one. Normalising on write — into a column of its
own, indexed — is what makes «which listings belong to this number» a lookup
instead of a scan over fifteen thousand rows.
"""

import re

#: Ecuador. The claim flow only matches national numbers, so a foreign one
#: normalises to its digits and simply never matches anything.
COUNTRY_CODE = "593"


def normalize_ec_phone(value) -> str:
    """Digits only, with the Ecuadorian country code, or '' when unusable.

    Mirrors `frontend/lib/phone.ts::normalizeEcuadorPhone`. The frontend copy
    exists for `tel:` and `wa.me` links; this one decides ownership, so it is
    the authority — the frontend is not a security boundary in this repo.
    """
    digits = re.sub(r"\D", "", str(value or ""))
    if digits.startswith("00"):
        digits = digits[2:]
    if not digits:
        return ""
    if digits.startswith(COUNTRY_CODE):
        rest = digits[len(COUNTRY_CODE):]
        # A number that is nothing but the country code is not a number.
        return digits if rest else ""
    if digits.startswith("0"):
        return f"{COUNTRY_CODE}{digits[1:]}"
    if len(digits) == 9:
        return f"{COUNTRY_CODE}{digits}"
    return digits


def is_plausible_ec_mobile(value) -> bool:
    """True for a normalised Ecuadorian mobile: 593 + 9 + eight digits.

    Claiming is a WhatsApp conversation, so a landline cannot complete it. The
    check is deliberately shallow — it rejects typos, not people.
    """
    normalized = normalize_ec_phone(value)
    return bool(re.fullmatch(rf"{COUNTRY_CODE}9\d{{8}}", normalized))
