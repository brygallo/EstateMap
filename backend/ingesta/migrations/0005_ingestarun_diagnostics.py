from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('ingesta', '0004_ingestarun_errores_ingestarun_log_and_more')]

    operations = [
        migrations.AddField(model_name='ingestarun', name='current_stage', field=models.CharField(blank=True, default='', help_text='Etapa más reciente alcanzada', max_length=80)),
        migrations.AddField(model_name='ingestarun', name='error_detail', field=models.TextField(blank=True, default='', help_text='Detalle técnico persistente del error fatal')),
    ]
