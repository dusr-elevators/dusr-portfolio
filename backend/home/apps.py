from django.apps import AppConfig


class HomeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'home'

    def ready(self):
        from django.db.models.signals import post_migrate

        from .signals import seed_default_seo_keywords

        post_migrate.connect(
            seed_default_seo_keywords,
            sender=self,
            dispatch_uid='home.seed_default_seo_keywords',
        )
