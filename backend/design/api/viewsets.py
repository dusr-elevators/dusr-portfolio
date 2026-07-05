from rest_framework import viewsets
from django.db.models import Prefetch
from ..models import ComponentCategory, ComponentOption
from .serializers import ComponentCategorySerializer


class ComponentCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ComponentCategory.objects.filter(is_active=True).prefetch_related(
        Prefetch(
            'options',
            queryset=ComponentOption.objects.filter(is_active=True).prefetch_related('variants'),
            to_attr='active_options',
        ),
    )
    serializer_class = ComponentCategorySerializer
