from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('real_estate', '0013_property_views_count'),
    ]

    operations = [
        migrations.CreateModel(
            name='PendingPublication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(blank=True, default='', max_length=150)),
                ('contact_phone', models.CharField(blank=True, default='', max_length=30)),
                ('contact_email', models.EmailField(blank=True, default='', max_length=254)),
                ('city', models.CharField(blank=True, default='', max_length=100)),
                ('province', models.CharField(blank=True, default='', max_length=100)),
                ('property_type', models.CharField(blank=True, default='', max_length=30)),
                ('operation', models.CharField(blank=True, default='', max_length=30)),
                ('price', models.CharField(blank=True, default='', max_length=50)),
                ('draft', models.JSONField(blank=True, default=dict)),
                ('source', models.CharField(choices=[('account_required', 'Intento de publicar sin cuenta'), ('whatsapp_help', 'Ayuda por WhatsApp'), ('exit_prompt', 'Abandono del formulario'), ('other', 'Otro')], default='account_required', max_length=30)),
                ('status', models.CharField(choices=[('new', 'Nuevo'), ('contacted', 'Contactado'), ('converted', 'Convertido'), ('discarded', 'Descartado')], default='new', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
