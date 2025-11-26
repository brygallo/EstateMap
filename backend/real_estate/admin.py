from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Property, PropertyImage, User, Province, City


class CityInline(admin.TabularInline):
    model = City
    extra = 1
    fields = ['name', 'code']


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    inlines = [CityInline]
    list_display = ['name', 'code', 'country', 'get_cities_count', 'created_at']
    list_filter = ['country', 'created_at']
    search_fields = ['name', 'code']
    ordering = ['name']

    def get_cities_count(self, obj):
        return obj.cities.count()
    get_cities_count.short_description = 'Ciudades'


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name', 'province', 'code', 'created_at']
    list_filter = ['province', 'created_at']
    search_fields = ['name', 'code', 'province__name']
    ordering = ['province__name', 'name']
    autocomplete_fields = ['province']


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
