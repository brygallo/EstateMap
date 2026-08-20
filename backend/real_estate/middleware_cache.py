"""Nothing leaves this app cacheable by accident.

The public reads declare themselves: `public, max-age, s-maxage,
stale-while-revalidate`, which is what lets a browser and a shared cache reuse
them. Everything else — a session, an owner's inventory, an admin page — said
nothing at all, and «nothing» is not a safe default once a CDN sits in front.

A shared cache decides with the headers it receives. With a cache rule covering
`/api/*` and a response that declares neither `public` nor `private`, the CDN is
free to store one account's answer and hand it to the next visitor. The `Vary`
this app sends lists `Accept` and `origin`, not `Authorization`, so the two
requests look identical to it.

So the default is inverted here: anything that did not explicitly declare
itself public leaves marked `private, no-store`. The rule is one line and it
holds regardless of how the CDN is configured, which is the point — a dashboard
toggle is not where this guarantee should live.
"""

from django.utils.cache import add_never_cache_headers


class PrivateByDefaultCacheMiddleware:
    """Mark every response that did not opt into shared caching as private."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # An explicit Cache-Control means the view already decided. The public
        # reads set theirs through `patch_cache_control(public=True, ...)`.
        if response.has_header("Cache-Control"):
            return response

        add_never_cache_headers(response)
        return response
