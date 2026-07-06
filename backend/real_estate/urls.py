from rest_framework.routers import DefaultRouter
from django.urls import path, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    PropertyViewSet,
    ProvinceViewSet,
    CityViewSet,
    LeadViewSet,
    PendingPublicationViewSet,
    CustomTokenObtainPairView,
    RegisterView,
    GoogleLoginView,
    ImageProxyView,
    VerifyEmailView,
    ResendVerificationView,
    RequestPasswordResetView,
    ResetPasswordView,
    RequestEmailChangeView,
    VerifyEmailChangeView,
    MeView,
    ChangePasswordView,
    AdminDashboardView,
    AdminUserViewSet,
    AdminPropertyViewSet,
)

router = DefaultRouter()
router.register('properties', PropertyViewSet)
router.register('provinces', ProvinceViewSet)
router.register('cities', CityViewSet)
router.register('leads', LeadViewSet, basename='lead')
router.register('pending-publications', PendingPublicationViewSet, basename='pending-publication')

urlpatterns = [
    # Authentication
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),

    # Email verification
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),

    # Password reset
    path('request-password-reset/', RequestPasswordResetView.as_view(), name='request_password_reset'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),

    # Email change (requires authentication)
    path('request-email-change/', RequestEmailChangeView.as_view(), name='request_email_change'),
    path('verify-email-change/', VerifyEmailChangeView.as_view(), name='verify_email_change'),

    # User profile
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Image proxy to serve images from MinIO without CORS issues
    re_path(r'^media/(?P<image_path>.+)$', ImageProxyView.as_view(), name='image_proxy'),

    # Admin panel
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('admin/users/', AdminUserViewSet.as_view({'get': 'list'}), name='admin_users_list'),
    path('admin/users/<int:pk>/', AdminUserViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin_users_detail'),
    path('admin/properties/', AdminPropertyViewSet.as_view({'get': 'list'}), name='admin_properties_list'),
    path('admin/properties/<int:pk>/', AdminPropertyViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'}), name='admin_properties_detail'),
]

urlpatterns += router.urls
