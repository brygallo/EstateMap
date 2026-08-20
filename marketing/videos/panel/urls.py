"""URL map of the panel."""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.HomeView.as_view(), name="home"),
    path("api/<slug:brand_id>/videos", views.VideoListApi.as_view(), name="api-videos"),
    path("api/<slug:brand_id>/<slug:video_id>", views.VideoDetailApi.as_view(), name="api-video"),
    path(
        "api/<slug:brand_id>/<slug:video_id>/terminal",
        views.TerminalStartApi.as_view(),
        name="api-terminal-start",
    ),
    path(
        "api/<slug:brand_id>/<slug:video_id>/terminal/detach",
        views.TerminalDetachApi.as_view(),
        name="api-terminal-detach",
    ),
    path(
        "api/<slug:brand_id>/<slug:video_id>/terminal/stop",
        views.TerminalStopApi.as_view(),
        name="api-terminal-stop",
    ),
    path(
        "media/<slug:brand_id>/<slug:video_id>/<str:filename>",
        views.ExportFileView.as_view(),
        name="export-file",
    ),
    path("<slug:brand_id>/", views.BrandPageView.as_view(), name="brand"),
]
