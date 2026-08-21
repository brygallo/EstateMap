"""
Editorial desk for the blog.

The one thing this admin does beyond CRUD is the `schedule_daily` action: pick
N drafts, and they come out one per day. Writing thirty articles in one sitting
and drip-feeding them is the whole point of the blog as an SEO asset — a batch
that all lands the same morning looks exactly like what it is.
"""

from datetime import timedelta

from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from real_estate.cache_utils import bump_props_version

from .models import Category, Post, PostImage

# Posts go out mid-morning Ecuador time (UTC-5), when the audience is awake and
# a fresh URL has the whole day to be crawled.
PUBLISH_HOUR_UTC = 13


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "order", "post_count"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order", "name"]
    search_fields = ["name"]

    @admin.display(description="Posts públicos")
    def post_count(self, obj):
        return obj.posts.public().count()


class PostImageInline(admin.TabularInline):
    """Upload here, then paste the snippet the last column prints."""

    model = PostImage
    extra = 1
    fields = ["image", "alt", "caption", "credit", "markdown_snippet"]
    readonly_fields = ["markdown_snippet"]

    @admin.display(description="Pegar en el cuerpo")
    def markdown_snippet(self, obj):
        if not obj.pk or not obj.image:
            return "Guarda para obtener el código."
        # A read-only input instead of plain text: the point is to select it in
        # one click and paste it into the body field right above.
        return format_html(
            '<input type="text" readonly onclick="this.select()" value="{}" '
            'style="width:100%;font-family:monospace;font-size:11px" />',
            obj.markdown,
        )


@admin.register(PostImage)
class PostImageAdmin(admin.ModelAdmin):
    list_display = ["preview", "alt", "post", "created_at"]
    list_filter = ["post"]
    search_fields = ["alt", "caption", "credit"]
    readonly_fields = ["markdown_snippet"]

    @admin.display(description="Imagen")
    def preview(self, obj):
        if not obj.image:
            return "—"
        return format_html(
            '<img src="{}" style="height:44px;border-radius:4px" alt="" />', obj.image.url
        )

    @admin.display(description="Markdown")
    def markdown_snippet(self, obj):
        if not obj.pk or not obj.image:
            return "—"
        return format_html(
            '<input type="text" readonly onclick="this.select()" value="{}" '
            'style="width:100%;font-family:monospace" />',
            obj.markdown,
        )


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    inlines = [PostImageInline]
    list_display = [
        "title",
        "state_badge",
        "published_at",
        "category",
        "author_name",
        "reading_minutes",
        "is_featured",
        "sponsor_badge",
    ]
    # `sponsor` first: "which of these did somebody pay for" is the question an
    # editor needs answered fastest, and the one a reader is entitled to have
    # answered on the page itself.
    list_filter = ["sponsor", "status", "category", "city", "is_featured", "published_at"]
    search_fields = ["title", "excerpt", "body", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"
    ordering = ["-published_at", "-created_at"]
    autocomplete_fields = ["category", "sponsor"]
    readonly_fields = ["reading_minutes", "created_at", "updated_at", "public_url"]
    actions = ["schedule_daily", "publish_now", "move_to_draft"]

    fieldsets = (
        (
            None,
            {
                "fields": ("title", "slug", "excerpt", "body"),
                "description": (
                    "<strong>Formato del cuerpo</strong> (Markdown): "
                    "<code>## Título</code> y <code>### Subtítulo</code> · "
                    "<code>- lista</code> y <code>1. lista</code> · "
                    "<code>**negrita**</code>, <code>*cursiva*</code> · "
                    "<code>[texto](/ruta)</code> · <code>&gt; cita</code> · "
                    "<code>---</code> separador · tabla con "
                    "<code>| a | b |</code> y fila <code>| --- | --- |</code> · "
                    "recuadro con <code>:::consejo</code> … <code>:::</code> "
                    "(tonos: nota, consejo, aviso, dato) · imagen con "
                    "<code>![alt](url \"pie de foto\")</code>, que sale de la sección "
                    "de imágenes al final de esta página."
                ),
            },
        ),
        ("Publicación", {"fields": ("status", "published_at", "is_featured", "public_url")}),
        (
            "Publicidad",
            {
                "fields": ("sponsor", "sponsor_kind"),
                "description": (
                    "Dejar vacío para contenido editorial. Con anunciante, el artículo se "
                    "publica con la etiqueta «Contenido publicitario» visible y sus enlaces "
                    "salientes llevan rel=\"sponsored nofollow\"."
                ),
            },
        ),
        ("Clasificación", {"fields": ("category", "tags", "city")}),
        ("Autoría (E-E-A-T)", {"fields": ("author", "author_name", "author_role")}),
        ("Portada", {"fields": ("cover_image", "cover_image_alt")}),
        ("Extras SEO", {"fields": ("faqs", "related_links", "meta_title", "meta_description")}),
        ("Metadatos", {"fields": ("reading_minutes", "created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Estado")
    def state_badge(self, obj):
        if obj.is_public:
            return format_html('<span style="color:#15803d;font-weight:600">● En línea</span>')
        if obj.status == Post.Status.SCHEDULED and obj.published_at:
            return format_html(
                '<span style="color:#b45309;font-weight:600">◷ Programado</span> {}',
                obj.published_at.strftime("%d/%m %H:%M"),
            )
        return format_html('<span style="color:#6b7280">{}</span>', obj.get_status_display())

    @admin.display(description="Publicidad", ordering="sponsor")
    def sponsor_badge(self, obj):
        if not obj.sponsor_id:
            return format_html('<span style="color:#6b7280">Editorial</span>')
        paid = obj.sponsor_kind == SponsorKind.PAID
        return format_html(
            '<span style="color:{};font-weight:600">◆ {}</span> {}',
            "#b45309" if paid else "#6d28d9",
            "Pagada" if paid else "Del grupo",
            obj.sponsor.name,
        )

    @admin.display(description="URL pública")
    def public_url(self, obj):
        if not obj.pk:
            return "—"
        return format_html(
            '<a href="https://geopropiedadesecuador.com{0}" target="_blank" rel="noopener">{0}</a>',
            obj.absolute_path,
        )

    @admin.action(description="Programar: uno por día a partir de mañana")
    def schedule_daily(self, request, queryset):
        """Spread the selection one post per day, oldest selection first.

        Starts from tomorrow, and from the day after the last post already on
        the calendar if that is later — so running the action twice on two
        batches queues them back to back instead of stacking both on the same
        days.
        """
        posts = list(queryset.order_by("created_at", "id"))
        if not posts:
            return

        today = timezone.now().replace(
            hour=PUBLISH_HOUR_UTC, minute=0, second=0, microsecond=0
        )
        start = today + timedelta(days=1)
        last_scheduled = (
            Post.objects.filter(status=Post.Status.SCHEDULED)
            .exclude(id__in=[post.id for post in posts])
            .order_by("-published_at")
            .values_list("published_at", flat=True)
            .first()
        )
        if last_scheduled and last_scheduled >= start:
            start = last_scheduled.replace(
                hour=PUBLISH_HOUR_UTC, minute=0, second=0, microsecond=0
            ) + timedelta(days=1)

        for offset, post in enumerate(posts):
            post.published_at = start + timedelta(days=offset)
            post.status = Post.Status.SCHEDULED
            post.save(update_fields=["published_at", "status"])

        last = start + timedelta(days=len(posts) - 1)
        self.message_user(
            request,
            f"{len(posts)} posts programados, uno por día, "
            f"del {start.strftime('%d/%m/%Y')} al {last.strftime('%d/%m/%Y')} "
            f"({PUBLISH_HOUR_UTC:02d}:00 UTC).",
            messages.SUCCESS,
        )

    @admin.action(description="Publicar ahora")
    def publish_now(self, request, queryset):
        now = timezone.now()
        count = 0
        for post in queryset:
            post.status = Post.Status.PUBLISHED
            if post.published_at is None or post.published_at > now:
                post.published_at = now
            post.save(update_fields=["status", "published_at"])
            count += 1
        self.message_user(request, f"{count} posts publicados.", messages.SUCCESS)

    @admin.action(description="Pasar a borrador (los retira del sitio)")
    def move_to_draft(self, request, queryset):
        count = 0
        for post in queryset:
            post.status = Post.Status.DRAFT
            post.save(update_fields=["status"])
            count += 1
        self.message_user(
            request,
            f"{count} posts pasados a borrador. Dejan de ser visibles en el sitio.",
            messages.WARNING,
        )

    def save_model(self, request, obj, form, change):
        # Whoever writes it signs it, unless the editor chose another author.
        if obj.author is None:
            obj.author = request.user
        if not obj.author_name:
            obj.author_name = request.user.get_full_name() or ""
        super().save_model(request, obj, form, change)


# Advertisers and campaigns moved to `advertising/`, and so did their admin.
# Registering them here too would raise AlreadyRegistered: `blog.ads` now
# re-exports the very same model classes.
