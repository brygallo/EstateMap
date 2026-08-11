"""
Public read-only API for the blog.

Writing happens in the Django admin only — the frontend is not a security
boundary in this repo, so there is no reason to expose a write surface for
content that a handful of staff members edit a few times a week.

The payloads are cached the same way as the rest of the public reads: a version
counter in the key (``blog:ver``) that a save bumps, instead of enumerating keys
to delete. `s-maxage` lets nginx and the Next.js data cache hold them too, which
matters because a crawler hitting 60 posts in a burst is the normal traffic
pattern here, not the exception.
"""

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from real_estate.cache_utils import versioned_key
from real_estate.views import _is_public_read, _public_response

from django.core.cache import cache

from .models import Category, Post
from .serializers import CategorySerializer, PostDetailSerializer, PostListSerializer

# Posts change a few times a day at most, and a stale list costs nothing worse
# than a new article showing up minutes late — the publish task revalidates
# on the spot anyway.
CACHE_TTL_BLOG_LIST = 60 * 15
CACHE_TTL_BLOG_DETAIL = 60 * 30

# Guard rail for `?limit=`: the list endpoint is public and unauthenticated, so
# a caller cannot ask for the whole archive in one request.
MAX_LIMIT = 60
DEFAULT_LIMIT = 24


class BlogPostViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/blog/posts/` — every post whose publication date has arrived."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = Post.objects.none()  # real queryset lives in get_queryset()

    def get_queryset(self):
        return Post.objects.public().select_related("category", "author")

    def get_serializer_class(self):
        return PostDetailSerializer if self.action == "retrieve" else PostListSerializer

    def list(self, request, *args, **kwargs):
        category = (request.query_params.get("category") or "").strip()
        tag = (request.query_params.get("tag") or "").strip()
        author = (request.query_params.get("author") or "").strip()
        exclude = (request.query_params.get("exclude") or "").strip()
        try:
            limit = int(request.query_params.get("limit") or DEFAULT_LIMIT)
        except ValueError:
            limit = DEFAULT_LIMIT
        limit = max(1, min(limit, MAX_LIMIT))
        try:
            offset = max(0, int(request.query_params.get("offset") or 0))
        except ValueError:
            offset = 0

        cache_key = versioned_key(
            "blog_posts", category, tag, author, exclude, limit, offset, scope="blog"
        )
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_BLOG_LIST)

        queryset = self.get_queryset()
        if category:
            queryset = queryset.filter(category__slug=category)
        if tag:
            # `tags` is a JSON array of short strings; `icontains` over the
            # serialized JSON is enough at this volume and avoids a GIN index
            # for a filter used by a couple of links.
            queryset = queryset.filter(tags__icontains=tag)
        if author:
            # `author_slug` is derived on save, so the author page and the
            # byline can never drift apart.
            queryset = queryset.filter(author_slug=author)
        if exclude:
            queryset = queryset.exclude(slug=exclude)

        total = queryset.count()
        page = queryset[offset : offset + limit]
        data = {
            "count": total,
            "results": PostListSerializer(page, many=True).data,
        }
        if _is_public_read(request):
            cache.set(cache_key, data, CACHE_TTL_BLOG_LIST)
        return _public_response(data, request, s_maxage=CACHE_TTL_BLOG_LIST)

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get("slug", "")
        cache_key = versioned_key("blog_post", slug, scope="blog")
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_BLOG_DETAIL)

        post = self.get_queryset().filter(slug=slug).first()
        if post is None:
            return Response({"detail": "No encontrado."}, status=status.HTTP_404_NOT_FOUND)

        data = PostDetailSerializer(post).data
        if _is_public_read(request):
            cache.set(cache_key, data, CACHE_TTL_BLOG_DETAIL)
        return _public_response(data, request, s_maxage=CACHE_TTL_BLOG_DETAIL)


class BlogCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """`/api/blog/categories/` — only categories that have something to show."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    serializer_class = CategorySerializer
    queryset = Category.objects.none()

    def get_queryset(self):
        now = timezone.now()
        published = Q(
            posts__status__in=(Post.Status.SCHEDULED, Post.Status.PUBLISHED),
            posts__published_at__isnull=False,
            posts__published_at__lte=now,
        )
        return (
            Category.objects.annotate(post_count=Count("posts", filter=published))
            .filter(post_count__gt=0)
            .order_by("order", "name")
        )

    def list(self, request, *args, **kwargs):
        cache_key = versioned_key("blog_categories", scope="blog")
        if _is_public_read(request):
            cached = cache.get(cache_key)
            if cached is not None:
                return _public_response(cached, request, s_maxage=CACHE_TTL_BLOG_LIST)

        data = CategorySerializer(self.get_queryset(), many=True).data
        if _is_public_read(request):
            cache.set(cache_key, data, CACHE_TTL_BLOG_LIST)
        return _public_response(data, request, s_maxage=CACHE_TTL_BLOG_LIST)
