"""What search engines are told about the API host.

`api.geopropiedadesecuador.com` answered 404 to `/robots.txt`, which means
"crawl everything". And DRF, asked for `text/html` — which is exactly what a
crawler sends — renders the browsable API: a full HTML page per endpoint, with
the JSON of the portal's own listings inside it.

That is the portal's content served a second time under a second hostname, and
it competes with the pages built to rank for it. The redirect that counts ad
clicks already carried `X-Robots-Tag` for the same reason (see
`advertising.views.go`); this generalises it to the whole host.

Two layers, because they fail differently. `robots.txt` stops the crawl, but a
URL someone links to can still end up indexed without ever being fetched; the
header is what makes an indexed URL drop out. Neither is a security measure —
the API is public and stays public — they only decide what gets indexed.
"""

from django.http import HttpResponse

# Nothing under this host belongs in an index: it is all either the portal's
# content in another shape or staff-only endpoints answering 401.
ROBOTS_TXT = "User-agent: *\nDisallow: /\n"


def robots(request):
    """`robots.txt` for the API host."""
    response = HttpResponse(ROBOTS_TXT, content_type="text/plain")
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response


class NoIndexMiddleware:
    """Stamp every API response as `noindex, nofollow`.

    The portal is served by Next on the other hostname and never passes through
    Django, so there is no page here that should be indexed. A view that sets
    the header itself is left alone.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("X-Robots-Tag", "noindex, nofollow")
        return response
