from django.urls import path
from rest_framework.routers import DefaultRouter

from .api.views import DesignCTASettingsView
from .api.viewsets import ComponentCategoryViewSet

router = DefaultRouter()
router.register('design/categories', ComponentCategoryViewSet, basename='design-categories')

urlpatterns = router.urls + [
    path('design/cta-settings/', DesignCTASettingsView.as_view(), name='design-cta-settings'),
]
