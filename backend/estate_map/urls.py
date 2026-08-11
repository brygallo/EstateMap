from django.contrib import admin
from django.urls import path, include
from .observability import health
from blog.admin_api import AdminBlogCategoryViewSet, AdminBlogImageViewSet, AdminBlogPostViewSet

urlpatterns = [
    path('api/health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/', include('real_estate.urls')),
    path('api/blog/', include('blog.urls')),
    path('api/admin/blog/posts/', AdminBlogPostViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/admin/blog/posts/schedule-daily/', AdminBlogPostViewSet.as_view({'post': 'schedule_daily'})),
    path('api/admin/blog/posts/<int:pk>/', AdminBlogPostViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})),
    path('api/admin/blog/posts/<int:pk>/publish/', AdminBlogPostViewSet.as_view({'post': 'publish'})),
    path('api/admin/blog/posts/<int:pk>/draft/', AdminBlogPostViewSet.as_view({'post': 'draft'})),
    path('api/admin/blog/categories/', AdminBlogCategoryViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/admin/blog/categories/<int:pk>/', AdminBlogCategoryViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'})),
    path('api/admin/blog/images/', AdminBlogImageViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('api/admin/blog/images/<int:pk>/', AdminBlogImageViewSet.as_view({'delete': 'destroy'})),
]
