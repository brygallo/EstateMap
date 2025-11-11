from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Property, PropertyImage, User


class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    inlines = [PropertyImageInline]
    list_display = ['title', 'property_type', 'status', 'price', 'owner', 'created_at']
    list_filter = ['property_type', 'status']
    search_fields = ['title', 'description', 'city']


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ['property', 'is_main', 'uploaded_at']
    list_filter = ['is_main', 'uploaded_at']


admin.site.register(User, UserAdmin)
