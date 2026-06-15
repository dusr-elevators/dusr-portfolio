from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class StaticViewSitemap(Sitemap):
    i18n = True
    changefreq = "weekly"
    priority = 0.7

    def items(self):
        # List view names you want indexed
        return [
            "home",
            "about",
            "heritage",
            "corporate-governance",
            "vision-mission-values",
            "photos-videos",
            "news-insights",
            "sustainability",
            "saudi-vision",
            "meats",
            "dairy",
            "vegitable-fruits",
            "oils",
            "others",
            "sales",
            "contact-info",
            "careers",
            "jobs",
            "branches",
            "vendor",
            "terms-of-service",
            "privacy-policy",
        ]

    def location(self, item):
        return reverse(item)


