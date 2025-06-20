from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PropertyViewSet, CustomTokenObtainPairView, RegisterView, UserListView

router = DefaultRouter()
router.register('properties', PropertyViewSet)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='register'),
    path('users/', UserListView.as_view(), name='user_list'),
]

urlpatterns += router.urls
