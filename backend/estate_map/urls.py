from django.contrib import admin
from django.urls import path, include
from .observability import health

urlpatterns = [
    path('api/health/', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/', include('real_estate.urls')),
]
