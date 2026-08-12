"""Drop the blog's sponsorship tables once `advertising` has the rows.

Ordering is the whole point: this depends on `advertising.0002_import_from_blog`,
so the copy always happens before the originals go away. Running these out of
order would take production's live campaign with them.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0006_seed_aents_sponsorship"),
        ("advertising", "0002_import_from_blog"),
    ]

    operations = [
        migrations.RemoveField(model_name="sponsorslot", name="advertiser"),
        migrations.DeleteModel(name="SponsorSlot"),
        migrations.DeleteModel(name="Advertiser"),
    ]
