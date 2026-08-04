from rest_framework.routers import DefaultRouter
from django.urls import path, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from ingesta import api as ingesta_api
from .views import (
    PropertyViewSet,
    ProvinceViewSet,
    CityViewSet,
    LeadViewSet,
    PendingPublicationViewSet,
    ActivityEventViewSet,
    CustomTokenObtainPairView,
    RegisterView,
    GoogleLoginView,
    ImageProxyView,
    PendingImageView,
    VerifyEmailView,
    ResendVerificationView,
    RequestPasswordResetView,
    ResetPasswordView,
    RequestEmailChangeView,
    VerifyEmailChangeView,
    MeView,
    ChangePasswordView,
    AdminDashboardView,
    AdminSystemStatusView,
    AdminUserViewSet,
    AdminPropertyViewSet,
    MarketStatsView,
    PublicationDraftView,
    PublicationDraftRedeemView,
)

router = DefaultRouter()
router.register('properties', PropertyViewSet)
router.register('provinces', ProvinceViewSet)
router.register('cities', CityViewSet)
router.register('leads', LeadViewSet, basename='lead')
router.register('pending-publications', PendingPublicationViewSet, basename='pending-publication')
router.register('activity-events', ActivityEventViewSet, basename='activity-event')

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
    path('market-stats/', MarketStatsView.as_view(), name='market_stats'),

    # Resume links: public because the whole point is that there is no account yet.
    path('publication-drafts/<str:token>/', PublicationDraftView.as_view(), name='publication_draft'),
    path('publication-drafts/<str:token>/redeem/', PublicationDraftRedeemView.as_view(), name='publication_draft_redeem'),

    # Image proxy to serve images from MinIO without CORS issues
    path('pending-image/<int:image_id>/', PendingImageView.as_view(), name='pending_image'),
    re_path(r'^media/(?P<image_path>.+)$', ImageProxyView.as_view(), name='image_proxy'),

    # Admin panel
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('admin/system-status/', AdminSystemStatusView.as_view(), name='admin_system_status'),
    path('admin/users/', AdminUserViewSet.as_view({'get': 'list'}), name='admin_users_list'),
    path('admin/users/<int:pk>/', AdminUserViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin_users_detail'),
    path('admin/properties/', AdminPropertyViewSet.as_view({'get': 'list'}), name='admin_properties_list'),
    path('admin/properties/stats/', AdminPropertyViewSet.as_view({'get': 'stats'}), name='admin_properties_stats'),
    path('admin/properties/bulk-status/', AdminPropertyViewSet.as_view({'post': 'bulk_status'}), name='admin_properties_bulk_status'),
    path('admin/properties/<int:pk>/', AdminPropertyViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin_properties_detail'),
    path('admin/properties/<int:pk>/transfer-owner/', AdminPropertyViewSet.as_view({'post': 'transfer_owner'}), name='admin_properties_transfer_owner'),

    # Ingesta (agregador) - panel del frontend
    path('admin/ingesta/sources/', ingesta_api.sources, name='admin_ingesta_sources'),
    path('admin/ingesta/runs/', ingesta_api.runs, name='admin_ingesta_runs'),
    path('admin/ingesta/runs/<int:run_id>/', ingesta_api.run_detail, name='admin_ingesta_run_detail'),
    path('admin/ingesta/launch/', ingesta_api.launch, name='admin_ingesta_launch'),
    path('admin/ingesta/cancel/', ingesta_api.cancel, name='admin_ingesta_cancel'),
    path('admin/ingesta/properties/', ingesta_api.properties, name='admin_ingesta_properties'),
    path('admin/ingesta/refresh-property/', ingesta_api.refresh_property, name='admin_ingesta_refresh_property'),
    path('admin/ingesta/maintenance/', ingesta_api.maintenance_preview, name='admin_ingesta_maintenance_preview'),
    path('admin/ingesta/maintenance/cleanup/', ingesta_api.maintenance_cleanup, name='admin_ingesta_maintenance_cleanup'),
]

urlpatterns += router.urls
