from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PropertyViewSet, CustomTokenObtainPairView

router = DefaultRouter()
router.register('properties', PropertyViewSet)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
]

urlpatterns += router.urls
