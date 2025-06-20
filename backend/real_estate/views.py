from rest_framework import viewsets
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from .models import Property
from .serializers import PropertySerializer, CustomTokenObtainPairSerializer

class PropertyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Property.objects.all()
    serializer_class = PropertySerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
