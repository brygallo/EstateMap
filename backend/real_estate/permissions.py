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


class IsPropertyOwnerOrStaff(permissions.BasePermission):
    """Only the owner of a listing — or staff — may read its private data.

    Unlike the promotion images, which are public by design because the social
    networks have to fetch them (SOC-009), the report of who a listing's links
    brought back belongs to whoever published it. So this is an actual boundary
    and it lives on the server: the frontend reads `is_staff` out of a JWT it
    never verifies, which makes it useless for deciding anything.
    """

    message = 'Solo el propietario del anuncio puede consultar este dato.'

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_staff:
            return True
        return obj.owner_id is not None and obj.owner_id == user.pk


class IsAdminUser(permissions.BasePermission):
    """
    Permite acceso solo a usuarios con is_staff=True.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff
