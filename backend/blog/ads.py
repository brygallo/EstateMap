"""
Compatibility shim. The sponsorship models moved to `advertising/`.

They started here because the blog was the only place with ad slots. Once the
rest of the portal got them too, leaving them in this app would have meant a
property listing importing from `blog` to paint a banner — the kind of
dependency nobody untangles later (ADR 0004).

Anything importing `blog.ads` keeps working; the definitions live in
`advertising.models` and `advertising.placements`.
"""

from advertising.models import Advertiser, Campaign  # noqa: F401
from advertising.placements import Placement  # noqa: F401

# The old name for `Campaign`. Kept so historical imports and any straggling
# reference resolve, and so `blog.models` can go on re-exporting it.
SponsorSlot = Campaign

__all__ = ["Advertiser", "Campaign", "SponsorSlot", "Placement"]
