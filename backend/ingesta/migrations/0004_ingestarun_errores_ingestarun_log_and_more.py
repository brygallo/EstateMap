# Robustez Fase 0: heartbeat, log persistido, contador de errores, cancelación
# y estado "cancelled" para IngestaRun.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ingesta', '0003_fuente_disponibles_fuente_disponibles_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ingestarun',
            name='errores',
            field=models.PositiveIntegerField(default=0, help_text='Anuncios que fallaron individualmente (no abortan el run)'),
        ),
        migrations.AddField(
            model_name='ingestarun',
            name='log',
            field=models.TextField(blank=True, default='', help_text='Últimas líneas de log de la ejecución'),
        ),
        migrations.AddField(
            model_name='ingestarun',
            name='cancel_requested',
            field=models.BooleanField(default=False, help_text='Marca puesta desde el panel para detener el run de forma ordenada'),
        ),
        migrations.AddField(
            model_name='ingestarun',
            name='heartbeat_at',
            field=models.DateTimeField(blank=True, help_text='Última señal de vida; sirve para detectar runs caídos', null=True),
        ),
        migrations.AlterField(
            model_name='ingestarun',
            name='estado',
            field=models.CharField(choices=[('pending', 'Pendiente'), ('running', 'En ejecución'), ('done', 'Terminado'), ('error', 'Error'), ('cancelled', 'Cancelado')], default='pending', max_length=12),
        ),
    ]
