from rest_framework.routers import DefaultRouter

from .views import BlogCategoryViewSet, BlogPostViewSet
from .views_ads import SponsorSlotViewSet

router = DefaultRouter()
router.register("posts", BlogPostViewSet, basename="blog-post")
router.register("categories", BlogCategoryViewSet, basename="blog-category")
router.register("sponsors", SponsorSlotViewSet, basename="blog-sponsor")

urlpatterns = router.urls
