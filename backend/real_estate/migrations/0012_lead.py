import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('real_estate', '0011_property_show_measurements'),
    ]

    operations = [
        migrations.CreateModel(
            name='Lead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('phone', models.CharField(max_length=30)),
                ('email', models.EmailField(blank=True, default='', max_length=254)),
                ('message', models.TextField(blank=True, default='')),
                ('source', models.CharField(choices=[('property_modal', 'Modal del mapa'), ('property_page', 'Página de propiedad'), ('whatsapp', 'WhatsApp'), ('phone', 'Teléfono'), ('other', 'Otro')], default='property_modal', max_length=30)),
                ('status', models.CharField(choices=[('new', 'Nuevo'), ('contacted', 'Contactado'), ('closed', 'Cerrado')], default='new', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('property', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leads', to='real_estate.property')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
