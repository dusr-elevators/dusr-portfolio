from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.conf.urls.i18n import i18n_patterns
from django.utils.translation import gettext_lazy as _
from django.contrib.sitemaps.views import sitemap
from home.sitemaps import StaticViewSitemap
from django.http import HttpResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

# URLs that don't need to be translated
urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),  # Language switching URL - fixed path
    path('sitemap.xml', sitemap, {'sitemaps': {'static': StaticViewSitemap()}}, name='sitemap'),
    path('robots.txt', lambda request: HttpResponse(
        "User-agent: *\nAllow: /\nSitemap: https://dusr.sa/sitemap.xml",
        content_type="text/plain"
    )),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/', include('home.api_urls')),
    path('ckeditor5/', include('django_ckeditor_5.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# URLs that should be translated
urlpatterns += i18n_patterns(
    path('', include('home.urls')),
    prefix_default_language=True,  # Enable prefix for all languages
)
