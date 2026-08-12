"""Public routes for the advertising slots."""

from rest_framework.routers import DefaultRouter

from .views import AdSlotViewSet

router = DefaultRouter()
router.register("", AdSlotViewSet, basename="ad-slot")

urlpatterns = router.urls
