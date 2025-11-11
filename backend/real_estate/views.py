from rest_framework import viewsets, generics, status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.settings import api_settings
from django.http import HttpResponse, Http404
from django.views import View
from .models import Property, PropertyImage
from django.contrib.auth import get_user_model
from .serializers import (
    PropertySerializer,
    PropertyImageSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
)
from .permissions import IsOwnerOrReadOnly
import requests

class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_parsers(self):
        # Use default parsers for delete_image action
        if hasattr(self, 'action') and self.action == 'delete_image':
            return [parser() for parser in api_settings.DEFAULT_PARSER_CLASSES]
        return super().get_parsers()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_properties(self, request):
        """Get only the properties owned by the current user"""
        properties = Property.objects.filter(owner=request.user)
        serializer = self.get_serializer(properties, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def delete_image(self, request, pk=None):
        """Delete a specific image from a property"""
        property_instance = self.get_object()
        image_id = request.data.get('image_id')

        if not image_id:
            return Response(
                {'error': 'image_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            image = PropertyImage.objects.get(
                id=image_id,
                property=property_instance
            )
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PropertyImage.DoesNotExist:
            return Response(
                {'error': 'Image not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class ImageProxyView(View):
    """
    Proxy view to serve images from MinIO through Django
    This avoids CORS issues when accessing MinIO directly from the browser
    """
    def get(self, request, image_path):
        # Build MinIO URL
        minio_url = f"http://minio:9000/estatemap/{image_path}"

        try:
            # Fetch image from MinIO
            response = requests.get(minio_url, stream=True, timeout=10)

            if response.status_code == 200:
                # Determine content type
                content_type = response.headers.get('Content-Type', 'image/jpeg')

                # Create Django response with the image
                django_response = HttpResponse(
                    response.content,
                    content_type=content_type
                )

                # Add cache headers
                django_response['Cache-Control'] = 'public, max-age=31536000'

                return django_response
            else:
                raise Http404("Image not found")

        except requests.RequestException:
            raise Http404("Image not found")
