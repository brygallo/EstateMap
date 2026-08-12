"""Keep every API failure answerable in JSON.

Django rejects an oversized multipart body while *parsing the request*, before
any serializer runs, by raising a ``SuspiciousOperation``. Django's own handler
turns that into an HTML 400 page — which is correct for a browser form and wrong
for this API, because the client cannot read it:

- ``res.json()`` throws, so the publication form loses the error body. Without a
  body it cannot tell which step failed, so it neither jumps to the photos step
  nor names the problem; the person sees a generic "check the data" toast, has
  nothing to correct, and retries the exact same upload.
- The failure reaches ``ActivityEvent`` carrying only a status code. A bare 400
  in the activity log cannot be told apart from a rejected price or an expired
  session, which is precisely how three identical failures went undiagnosed.

Mapping these to a normal field error costs nothing and puts both the person and
the log back in business: the response becomes the same
``{"campo": ["mensaje"]}`` shape as every other validation error (see
``specs/errors/catalog.yaml``, VALIDATION_ERROR), so the existing client code
routes it without changes.
"""

from django.conf import settings
from django.core.exceptions import RequestDataTooBig, TooManyFilesSent
from rest_framework import serializers, status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


class RequestBodyTooLarge(APIException):
    """413 for a body over Django's non-file ceiling, matching ERR-005."""

    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    default_code = "request_data_too_big"

# Only the file-count limit is about photos. DATA_UPLOAD_MAX_MEMORY_SIZE, which
# raises RequestDataTooBig, measures the *non-file* part of the body: uploaded
# files are streamed and never counted against it. Blaming the photos for a body
# that is too big would send someone to the gallery step to fix a description.
UPLOAD_FIELD = "uploaded_images"


def _too_many_files_message() -> str:
    limit = getattr(settings, "MAX_IMAGES_PER_PROPERTY", 10)
    return (
        f"Puedes subir como máximo {limit} imágenes por propiedad. "
        "Quita algunas e inténtalo de nuevo."
    )


def _body_too_big_message() -> str:
    megabytes = getattr(settings, "DATA_UPLOAD_MAX_MEMORY_SIZE", 60 * 1024 * 1024)
    return (
        f"El formulario supera el máximo de {megabytes // (1024 * 1024)}MB de texto. "
        "Acorta la descripción e inténtalo de nuevo."
    )


def api_exception_handler(exc, context):
    """DRF exception handler that speaks JSON for request-parsing failures too.

    The file-count failure becomes a field error on the photos, so the form can
    open the right step. The body-size failure keeps the 413 the error catalogue
    already documents (ERR-005): it is about the text of the form, not the
    photos, and nginx answers the same class of failure with the same status.
    """
    if isinstance(exc, TooManyFilesSent):
        exc = serializers.ValidationError({UPLOAD_FIELD: [_too_many_files_message()]})
    elif isinstance(exc, RequestDataTooBig):
        exc = RequestBodyTooLarge(_body_too_big_message())

    return drf_exception_handler(exc, context)
