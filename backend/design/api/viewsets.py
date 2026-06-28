from rest_framework import viewsets
from ..models import ComponentCategory
from .serializers import ComponentCategorySerializer


class ComponentCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ComponentCategory.objects.filter(is_active=True).prefetch_related('options')
    serializer_class = ComponentCategorySerializer
