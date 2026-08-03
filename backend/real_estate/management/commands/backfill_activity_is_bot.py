"""
Re-evaluate the `is_bot` flag on ActivityEvent rows recorded before the field
existed.

Important limitation: ActivityEvent does NOT store the User-Agent. The beacon
only ever sent event_name, session_id, path and payload, so for historical rows
there is usually no evidence at all about the client. This command therefore
does not guess:

* It re-evaluates rows whose payload happens to carry a user agent (keys
  `user_agent`, `userAgent` or `ua`, at the top level or inside `attribution`).
  Current events do not carry one, so this normally matches nothing.
* With `--flag-sessionless` it also flags rows that have no session_id and no
  user. That is evidence, not a guess: the browser beacon always generates and
  stores a session UUID, so an event without one did not come from a normal
  browser. It stays opt-in because it is a weaker signal than a User-Agent.

Everything else is left untouched (is_bot stays False, i.e. "unknown, assumed
human"). Going forward the flag is set server-side at ingestion time.
"""

from django.core.management.base import BaseCommand
from django.db.models import Q

from real_estate.bot_detection import is_bot_user_agent
from real_estate.models import ActivityEvent


UA_KEYS = ("user_agent", "userAgent", "ua")


def _payload_user_agent(payload):
    """Return a stored user agent from the payload, if the row happens to have one."""
    if not isinstance(payload, dict):
        return None
    for key in UA_KEYS:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    attribution = payload.get("attribution")
    if isinstance(attribution, dict):
        for key in UA_KEYS:
            value = attribution.get(key)
            if isinstance(value, str) and value.strip():
                return value
    return None


class Command(BaseCommand):
    help = "Re-evaluate ActivityEvent.is_bot for rows created before the field existed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )
        parser.add_argument(
            "--flag-sessionless",
            action="store_true",
            help=(
                "Also flag anonymous events with an empty session_id: the browser "
                "beacon always sets one, so those did not come from a real browser."
            ),
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=2000,
            help="Rows updated per bulk_update batch (default: 2000).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        total = ActivityEvent.objects.count()

        scanned = 0
        with_ua = 0
        flagged_by_ua = 0
        cleared_by_ua = 0
        pending = []

        queryset = ActivityEvent.objects.only("id", "payload", "is_bot").order_by("pk")
        for event in queryset.iterator(chunk_size=batch_size):
            scanned += 1
            user_agent = _payload_user_agent(event.payload)
            if user_agent is None:
                continue
            with_ua += 1
            verdict = is_bot_user_agent(user_agent)
            if verdict == event.is_bot:
                continue
            event.is_bot = verdict
            if verdict:
                flagged_by_ua += 1
            else:
                cleared_by_ua += 1
            pending.append(event)
            if not dry_run and len(pending) >= batch_size:
                ActivityEvent.objects.bulk_update(pending, ["is_bot"])
                pending = []

        if pending and not dry_run:
            ActivityEvent.objects.bulk_update(pending, ["is_bot"])

        sessionless_qs = ActivityEvent.objects.filter(
            Q(session_id="") | Q(session_id__isnull=True), user__isnull=True, is_bot=False
        )
        sessionless = sessionless_qs.count()
        flagged_sessionless = 0
        if options["flag_sessionless"] and not dry_run:
            flagged_sessionless = sessionless_qs.update(is_bot=True)

        self.stdout.write(f"Rows scanned: {scanned} of {total}")
        self.stdout.write(f"Rows with a stored user agent: {with_ua}")
        self.stdout.write(f"Flagged as bot from user agent: {flagged_by_ua}")
        self.stdout.write(f"Cleared to human from user agent: {cleared_by_ua}")
        self.stdout.write(f"Anonymous rows without session_id: {sessionless}")
        if options["flag_sessionless"]:
            self.stdout.write(f"Flagged as bot for having no session: {flagged_sessionless}")
        else:
            self.stdout.write(
                "Sessionless rows left untouched (pass --flag-sessionless to flag them)."
            )
        if with_ua == 0:
            self.stdout.write(
                self.style.WARNING(
                    "ActivityEvent does not store the User-Agent, so historical rows "
                    "cannot be re-evaluated. Metrics become accurate from the moment "
                    "ingestion started flagging bots; older rows keep is_bot=False."
                )
            )
        if dry_run:
            self.stdout.write(self.style.NOTICE("Dry run: no rows were written."))
        else:
            self.stdout.write(self.style.SUCCESS("Backfill finished."))
