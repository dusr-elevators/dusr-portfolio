from django.urls import path
from rest_framework.routers import DefaultRouter

from .api.views import DesignCTASettingsView, DesignExportSettingsView, DesignLeadSubmissionView
from .api.viewsets import ComponentCategoryViewSet

router = DefaultRouter()
router.register('design/categories', ComponentCategoryViewSet, basename='design-categories')

urlpatterns = router.urls + [
    path('design/cta-settings/', DesignCTASettingsView.as_view(), name='design-cta-settings'),
    path('design/export-settings/', DesignExportSettingsView.as_view(), name='design-export-settings'),
    path('design/lead-submissions/', DesignLeadSubmissionView.as_view(), name='design-lead-submissions'),
]
