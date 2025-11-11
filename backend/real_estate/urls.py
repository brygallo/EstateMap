from rest_framework.routers import DefaultRouter
from django.urls import path, re_path
from .views import PropertyViewSet, CustomTokenObtainPairView, RegisterView, ImageProxyView

router = DefaultRouter()
router.register('properties', PropertyViewSet)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='register'),
    # Image proxy to serve images from MinIO without CORS issues
    re_path(r'^media/(?P<image_path>.+)$', ImageProxyView.as_view(), name='image_proxy'),
]

urlpatterns += router.urls
