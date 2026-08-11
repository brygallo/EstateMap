"""Staff-only API used by the integrated editorial desk."""

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from real_estate.permissions import IsAdminUser
from real_estate.views import AdminPagination

from .admin import PUBLISH_HOUR_UTC
from .models import Category, Post, PostImage
from .serializers import (
    AdminBlogCategorySerializer,
    AdminBlogImageSerializer,
    AdminBlogPostSerializer,
)


class AdminBlogPostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminBlogPostSerializer
    pagination_class = AdminPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "slug", "excerpt", "body", "author_name"]
    ordering_fields = ["created_at", "updated_at", "published_at", "title"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = Post.objects.select_related("category", "author").all()
        requested_status = self.request.query_params.get("status")
        if requested_status in Post.Status.values:
            queryset = queryset.filter(status=requested_status)
        category = self.request.query_params.get("category")
        if category and category.isdigit():
            queryset = queryset.filter(category_id=category)
        return queryset.order_by("-updated_at")

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = Post.Status.PUBLISHED
        if post.published_at is None or post.published_at > timezone.now():
            post.published_at = timezone.now()
        post.save(update_fields=["status", "published_at"])
        return Response(self.get_serializer(post).data)

    @action(detail=True, methods=["post"])
    def draft(self, request, pk=None):
        post = self.get_object()
        post.status = Post.Status.DRAFT
        post.save(update_fields=["status"])
        return Response(self.get_serializer(post).data)

    @action(detail=False, methods=["post"], url_path="schedule-daily")
    def schedule_daily(self, request):
        raw_ids = request.data.get("ids")
        if not isinstance(raw_ids, list) or not raw_ids or len(raw_ids) > 100:
            return Response({"error": "Selecciona entre 1 y 100 artículos."}, status=status.HTTP_400_BAD_REQUEST)
        posts = list(Post.objects.filter(pk__in=raw_ids).order_by("created_at", "id"))
        if len(posts) != len(set(raw_ids)):
            return Response({"error": "Uno o más artículos no existen."}, status=status.HTTP_400_BAD_REQUEST)
        start = timezone.now().replace(hour=PUBLISH_HOUR_UTC, minute=0, second=0, microsecond=0) + timedelta(days=1)
        last = Post.objects.filter(status=Post.Status.SCHEDULED).exclude(pk__in=raw_ids).order_by("-published_at").values_list("published_at", flat=True).first()
        if last and last >= start:
            start = last.replace(hour=PUBLISH_HOUR_UTC, minute=0, second=0, microsecond=0) + timedelta(days=1)
        for offset, post in enumerate(posts):
            post.status = Post.Status.SCHEDULED
            post.published_at = start + timedelta(days=offset)
            post.save(update_fields=["status", "published_at"])
        return Response({"scheduled": len(posts), "starts_at": start, "ends_at": start + timedelta(days=len(posts) - 1)})


class AdminBlogCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminBlogCategorySerializer
    pagination_class = None
    queryset = Category.objects.annotate(post_count=Count("posts")).order_by("order", "name")

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.posts.exists():
            return Response({"error": "Mueve primero los artículos de esta categoría."}, status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)


class AdminBlogImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminBlogImageSerializer
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = AdminPagination

    def get_queryset(self):
        queryset = PostImage.objects.select_related("post").all()
        post_id = self.request.query_params.get("post")
        if post_id and post_id.isdigit():
            queryset = queryset.filter(Q(post_id=post_id) | Q(post__isnull=True))
        return queryset
