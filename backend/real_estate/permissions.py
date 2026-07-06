from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a property to edit or delete it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the property
        return obj.owner == request.user


class IsAdminUser(permissions.BasePermission):
    """
    Permite acceso solo a usuarios con is_staff=True.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff
