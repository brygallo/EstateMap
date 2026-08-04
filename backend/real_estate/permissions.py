from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners -- or staff -- to edit or delete a
    property.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Staff moderate the whole catalogue from the same inventory screen they
        # use for their own listings, so the object check lets them through.
        user = request.user
        if user and user.is_authenticated and user.is_staff:
            return True

        # Write permissions are only allowed to the owner of the property
        return obj.owner == request.user


class IsAdminUser(permissions.BasePermission):
    """
    Permite acceso solo a usuarios con is_staff=True.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff
