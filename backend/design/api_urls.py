from rest_framework.routers import DefaultRouter
from .api.viewsets import ComponentCategoryViewSet

router = DefaultRouter()
router.register('design/categories', ComponentCategoryViewSet, basename='design-categories')

urlpatterns = router.urls
