"""
Panel de administración de la ingesta. Todo el admin de Django ya exige
``is_staff``; además las acciones que lanzan cargas verifican ``is_staff``
explícitamente.
"""
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import Fuente, IngestaRun, ListingCruda
from .runner import launch_subprocess as _lanzar_subproceso


@admin.register(Fuente)
class FuenteAdmin(admin.ModelAdmin):
    list_display = ("nombre", "slug", "activa", "last_scrape_at", "acciones")
    list_filter = ("activa",)
    search_fields = ("nombre", "slug", "base_url")
    prepopulated_fields = {"slug": ("nombre",)}

    # --- URLs personalizadas para lanzar la ingesta ---
    def get_urls(self):
        urls = super().get_urls()
        extra = [
            path(
                "<int:fuente_id>/lanzar/",
                self.admin_site.admin_view(self.lanzar_view),
                name="ingesta_fuente_lanzar",
            ),
        ]
        return extra + urls

    def acciones(self, obj):
        url = reverse("admin:ingesta_fuente_lanzar", args=[obj.id])
        return format_html(
            '<a class="button" href="{}?limit=500&nuevas=1" '
            'onclick="return confirm(\'¿Cargar las siguientes 500 (sin repetir las ya importadas)?\')">'
            'Cargar 500 más</a>&nbsp;'
            '<a class="button" style="background:#417690;color:#fff" href="{}" '
            'onclick="return confirm(\'¿Lanzar la ingesta de TODO el país? Puede tardar horas.\')">'
            'Ejecutar todo</a>',
            url, url,
        )
    acciones.short_description = "Ingesta"

    def lanzar_view(self, request, fuente_id):
        if not request.user.is_staff:
            raise PermissionDenied
        fuente = Fuente.objects.get(pk=fuente_id)
        limit = request.GET.get("limit")
        try:
            limit = int(limit) if limit else None
        except ValueError:
            limit = None
        solo_nuevas = request.GET.get("nuevas") == "1"

        # Evitar dos corridas simultáneas de la misma fuente.
        activa = fuente.runs.filter(estado__in=["pending", "running"]).first()
        if activa:
            self.message_user(
                request,
                f"Ya hay una ejecución en curso para {fuente.nombre} (run #{activa.id}). "
                "Espera a que termine.",
                level=messages.WARNING,
            )
        else:
            run = IngestaRun.objects.create(
                fuente=fuente, limit=limit, con_imagenes=True,
                solo_nuevas=solo_nuevas, lanzado_por=request.user.get_username(),
            )
            _lanzar_subproceso(run)
            if limit and solo_nuevas:
                detalle = f"siguientes {limit} (sin repetir)"
            elif limit:
                detalle = f"prueba de {limit}"
            else:
                detalle = "todo el país"
            self.message_user(
                request,
                f"Ingesta lanzada para {fuente.nombre} ({detalle}). "
                f"Sigue el progreso en 'Ejecuciones de ingesta' (run #{run.id}).",
                level=messages.SUCCESS,
            )
        from django.shortcuts import redirect
        return redirect("admin:ingesta_ingestarun_changelist")


@admin.register(IngestaRun)
class IngestaRunAdmin(admin.ModelAdmin):
    list_display = ("id", "fuente", "estado_coloreado", "progreso", "errores",
                    "duplicadas", "sin_ubicacion", "duracion", "lanzado_por", "created_at")
    list_filter = ("estado", "fuente")
    readonly_fields = [f.name for f in IngestaRun._meta.fields] + ["progreso", "duracion"]
    ordering = ("-created_at",)
    actions = ["cancelar_runs"]

    def has_add_permission(self, request):
        return False  # se crean al lanzar desde el botón de la fuente

    def estado_coloreado(self, obj):
        colores = {"running": "#e69500", "done": "#2e7d32", "error": "#c62828",
                   "pending": "#666", "cancelled": "#8a6d3b"}
        return format_html('<b style="color:{}">{}</b>',
                           colores.get(obj.estado, "#000"), obj.get_estado_display())
    estado_coloreado.short_description = "Estado"

    @admin.action(description="Cancelar ejecuciones seleccionadas (en curso)")
    def cancelar_runs(self, request, queryset):
        n = queryset.filter(estado__in=["pending", "running"]).update(cancel_requested=True)
        self.message_user(
            request,
            f"Se solicitó cancelar {n} ejecución(es). Se detendrán en su próximo checkpoint.",
            level=messages.SUCCESS if n else messages.WARNING,
        )

    def progreso(self, obj):
        return format_html(
            "<b>{}</b> cargadas (nuevas {} / act. {}) · vistos {}",
            obj.cargadas, obj.creadas, obj.actualizadas, obj.vistos,
        )
    progreso.short_description = "Progreso"

    def duracion(self, obj):
        if not obj.started_at:
            return "—"
        fin = obj.finished_at or timezone.now()
        segs = int((fin - obj.started_at).total_seconds())
        return f"{segs // 60}m {segs % 60}s"
    duracion.short_description = "Duración"


@admin.register(ListingCruda)
class ListingCrudaAdmin(admin.ModelAdmin):
    list_display = ("external_id", "fuente", "scraped_at")
    list_filter = ("fuente",)
    search_fields = ("external_id", "source_url")
    readonly_fields = ("scraped_at",)
