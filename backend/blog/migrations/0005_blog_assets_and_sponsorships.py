import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("blog", "0004_seed_guide_cities"),
    ]

    operations = [
        migrations.CreateModel(
            name="Advertiser",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=120, unique=True, verbose_name="Nombre")),
                ("slug", models.SlugField(max_length=140, unique=True)),
                ("website", models.URLField(verbose_name="Sitio web")),
                (
                    "tagline",
                    models.CharField(
                        blank=True,
                        help_text="Una línea sobre qué hace. Aparece bajo el nombre.",
                        max_length=200,
                        verbose_name="Descriptor",
                    ),
                ),
                (
                    "logo",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="blog/advertisers/",
                        verbose_name="Logotipo",
                    ),
                ),
                (
                    "logo_alt",
                    models.CharField(
                        blank=True,
                        max_length=200,
                        verbose_name="Texto alternativo del logotipo",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="Activo")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "Anunciante",
                "verbose_name_plural": "Anunciantes",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="PostImage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("image", models.ImageField(upload_to="blog/body/", verbose_name="Imagen")),
                (
                    "alt",
                    models.CharField(
                        help_text="Qué se ve en la imagen. Lo lee un lector de pantalla y lo indexa Google.",
                        max_length=200,
                        verbose_name="Texto alternativo",
                    ),
                ),
                (
                    "caption",
                    models.CharField(
                        blank=True,
                        help_text="Opcional. Se muestra bajo la imagen, en gris pequeño.",
                        max_length=240,
                        verbose_name="Pie de foto",
                    ),
                ),
                (
                    "credit",
                    models.CharField(
                        blank=True,
                        help_text="Autor o fuente, si la imagen no es propia.",
                        max_length=160,
                        verbose_name="Crédito",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "post",
                    models.ForeignKey(
                        blank=True,
                        help_text="Vacío = imagen de la biblioteca, reutilizable en cualquier artículo.",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="blog.post",
                        verbose_name="Artículo",
                    ),
                ),
            ],
            options={
                "verbose_name": "Imagen del blog",
                "verbose_name_plural": "Imágenes del blog",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="SponsorSlot",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "placement",
                    models.CharField(
                        choices=[
                            ("index_top", "Blog — bajo la cabecera"),
                            ("index_feed", "Blog — dentro de la rejilla de artículos"),
                            ("post_inline", "Artículo — a mitad del texto"),
                            ("post_footer", "Artículo — bajo el contenido"),
                            ("category_top", "Categoría — bajo la cabecera"),
                        ],
                        db_index=True,
                        max_length=20,
                        verbose_name="Ubicación",
                    ),
                ),
                ("headline", models.CharField(max_length=120, verbose_name="Titular")),
                (
                    "body",
                    models.TextField(
                        help_text="Dos o tres líneas. Texto plano, sin Markdown.",
                        max_length=400,
                        verbose_name="Texto",
                    ),
                ),
                (
                    "cta_label",
                    models.CharField(default="Saber más", max_length=60, verbose_name="Texto del botón"),
                ),
                (
                    "target_url",
                    models.URLField(
                        help_text='El enlace sale siempre con rel="sponsored nofollow".',
                        verbose_name="URL de destino",
                    ),
                ),
                (
                    "image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="blog/sponsors/",
                        verbose_name="Imagen",
                    ),
                ),
                (
                    "image_alt",
                    models.CharField(
                        blank=True,
                        max_length=200,
                        verbose_name="Texto alternativo de la imagen",
                    ),
                ),
                (
                    "starts_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Vacío = activa desde ya. Hora en UTC (Ecuador = UTC-5).",
                        null=True,
                        verbose_name="Inicio de campaña",
                    ),
                ),
                (
                    "ends_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Vacío = sin fecha de fin.",
                        null=True,
                        verbose_name="Fin de campaña",
                    ),
                ),
                (
                    "weight",
                    models.PositiveSmallIntegerField(
                        default=10,
                        help_text="A mayor peso, más veces se muestra frente a otras campañas de la misma ubicación.",
                        verbose_name="Peso",
                    ),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="Activa")),
                ("click_count", models.PositiveIntegerField(default=0, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "advertiser",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="slots",
                        to="blog.advertiser",
                        verbose_name="Anunciante",
                    ),
                ),
            ],
            options={
                "verbose_name": "Espacio patrocinado",
                "verbose_name_plural": "Espacios patrocinados",
                "ordering": ["placement", "-weight", "-created_at"],
                "indexes": [
                    models.Index(
                        fields=["placement", "is_active"],
                        name="blog_sponso_placeme_ae4625_idx",
                    )
                ],
            },
        ),
    ]
