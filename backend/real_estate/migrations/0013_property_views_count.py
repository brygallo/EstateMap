from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('real_estate', '0012_lead'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='views_count',
            field=models.PositiveIntegerField(default=0, help_text='Número de veces que se ha visto el detalle'),
        ),
    ]
