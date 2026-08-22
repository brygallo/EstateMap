"""Who counts as a visit to a listing, and where that is decided.

The counter used to move inside the detail endpoint: one visitor, one request,
one increment. That stopped being true when `/propiedad/<id>` became an ISR
page — Next renders it once every five minutes and serves the cached HTML to
everyone else, so the backend saw a render instead of a person and the counter
flattened while the traffic did not.

The browser is the only place that still sees one visit per person, so the
counter follows the beacon that already fires there. Same rule as before: a
crawler executes the beacon too and is excluded by `is_bot`, and the increment
is a SQL `UPDATE` so two people arriving at once cannot overwrite each other.
"""

from __future__ import annotations

from django.db.models import F

from real_estate.models import Property

# The beacon event that means «somebody opened this listing's page». Detail
# events fired from the map modal are interest, not an arrival, and the ficha
# they belong to is already counted when the visitor opens it.
PROPERTY_VIEW_EVENT = "page_view"
PROPERTY_PAGE_TYPE = "property"


class PropertyViewCounter:
    """Moves `views_count` when a person — never a crawler — opens a ficha."""

    def __init__(self, event):
        self.event = event

    def counts(self) -> bool:
        if self.event.is_bot or self.event.property_id is None:
            return False
        if self.event.event_name != PROPERTY_VIEW_EVENT:
            return False
        payload = self.event.payload or {}
        return payload.get("page_type") == PROPERTY_PAGE_TYPE

    def record(self) -> bool:
        """Returns whether the visit moved the counter."""
        if not self.counts():
            return False
        Property.objects.filter(pk=self.event.property_id).update(
            views_count=F("views_count") + 1
        )
        return True
