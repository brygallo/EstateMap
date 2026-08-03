from django.core.exceptions import RequestDataTooBig, SuspiciousOperation, TooManyFilesSent
from django.http import JsonResponse


class UploadErrorMiddleware:
    """Turn multipart parser failures into stable, user-facing JSON errors."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except RequestDataTooBig:
            return JsonResponse(
                {"detail": "La carga completa supera el tamaño máximo permitido de 50MB."},
                status=413,
            )
        except TooManyFilesSent:
            return JsonResponse(
                {"detail": "No se pueden enviar más de 10 archivos por solicitud."},
                status=400,
            )
        except SuspiciousOperation:
            return JsonResponse(
                {"detail": "La solicitud contiene datos o archivos no válidos."},
                status=400,
            )
