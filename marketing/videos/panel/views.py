"""HTTP surface of the panel, as class-based views.

The page is rendered once; everything that changes — pipeline state, the steps
an agent is taking, whether a terminal is alive — is polled as JSON.
"""

from __future__ import annotations

import json
import mimetypes
from pathlib import Path
from typing import Any

from django.http import FileResponse, Http404, HttpRequest, JsonResponse
from django.views import View
from django.views.generic import RedirectView, TemplateView

from . import factory, sessions, terminals


class HomeView(RedirectView):
    """Land on the default brand, so a bare URL always shows something."""

    permanent = False

    def get_redirect_url(self, *args: Any, **kwargs: Any) -> str:
        return f"/{factory.default_brand_id()}/"


class BrandPageView(TemplateView):
    """The panel itself, rendered once per brand."""

    template_name = "panel/index.html"

    def get_context_data(self, **kwargs: Any) -> dict[str, Any]:
        brand_id = str(kwargs.get("brand_id"))
        active = factory.brand(brand_id)
        if active is None:
            raise Http404("Marca desconocida")
        context = super().get_context_data(**kwargs)
        context.update(
            {
                "brands": factory.brands(),
                "active_brand": active,
                "videos": factory.videos(brand_id),
                "states": factory.STATES,
                "requirements": terminals.requirements(),
                "factory_root": str(factory.FACTORY_ROOT),
            }
        )
        return context


class JsonView(View):
    """Shared plumbing for the polling endpoints."""

    def payload(self, request: HttpRequest, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError

    def get(self, request: HttpRequest, **kwargs: Any) -> JsonResponse:
        return JsonResponse(self.payload(request, **kwargs))

    @staticmethod
    def body_of(request: HttpRequest) -> dict[str, Any]:
        try:
            parsed = json.loads(request.body or b"{}")
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def terminal_payload(brand_id: str, video_id: str) -> dict[str, Any] | None:
        terminal = terminals.get(brand_id, video_id)
        if terminal is None:
            return None
        described = terminal.describe()
        described["process"] = sessions.timeline(terminal)
        return described


class VideoListApi(JsonView):
    """Every piece of a brand, with its state and whether it has a terminal."""

    def payload(self, request: HttpRequest, **kwargs: Any) -> dict[str, Any]:
        brand_id = str(kwargs["brand_id"])
        listed = factory.videos(brand_id)
        open_terminals = terminals.snapshot()
        for item in listed:
            item.pop("raw", None)
            item["terminal"] = open_terminals.get(f"{brand_id}/{item['id']}")
        return {"videos": listed}


class VideoDetailApi(JsonView):
    """Everything known about one piece, plus what its agent is doing."""

    def payload(self, request: HttpRequest, **kwargs: Any) -> dict[str, Any]:
        brand_id = str(kwargs["brand_id"])
        video_id = str(kwargs["video_id"])
        detail = factory.video(brand_id, video_id)
        if detail is None:
            raise Http404("Video desconocido")
        detail.pop("raw", None)
        detail["terminal"] = self.terminal_payload(brand_id, video_id)
        return detail


class TerminalStartApi(JsonView):
    """Open the one terminal a video is allowed, or hand back the open one."""

    def post(self, request: HttpRequest, **kwargs: Any) -> JsonResponse:
        brand_id = str(kwargs["brand_id"])
        video_id = str(kwargs["video_id"])
        cli = str(self.body_of(request).get("cli") or "claude")
        try:
            terminal = terminals.start(brand_id, video_id, cli)
        except (ValueError, RuntimeError) as error:
            return JsonResponse({"error": str(error)}, status=400)
        return JsonResponse(terminal.describe())


class TerminalDetachApi(JsonView):
    """Close the view and leave the agent working in the background."""

    def post(self, request: HttpRequest, **kwargs: Any) -> JsonResponse:
        detached = terminals.detach(str(kwargs["brand_id"]), str(kwargs["video_id"]))
        return JsonResponse({"detached": detached})


class TerminalStopApi(JsonView):
    """End the agent for good."""

    def post(self, request: HttpRequest, **kwargs: Any) -> JsonResponse:
        stopped = terminals.stop(str(kwargs["brand_id"]), str(kwargs["video_id"]))
        return JsonResponse({"stopped": stopped})


class ExportFileView(View):
    """Serve a rendered file so the panel can show the piece itself."""

    def get(self, request: HttpRequest, **kwargs: Any) -> FileResponse:
        detail = factory.video(str(kwargs["brand_id"]), str(kwargs["video_id"]))
        if detail is None:
            raise Http404("Video desconocido")
        directory = (Path(detail["directory"]) / "exports").resolve()
        path = (directory / str(kwargs["filename"])).resolve()
        if not path.is_file() or not path.is_relative_to(directory):
            raise Http404("Archivo desconocido")
        content_type, _ = mimetypes.guess_type(path.name)
        return FileResponse(path.open("rb"), content_type=content_type or "application/octet-stream")
