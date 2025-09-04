from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Property, User

admin.site.register(Property)
admin.site.register(User, UserAdmin)
