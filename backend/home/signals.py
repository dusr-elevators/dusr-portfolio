from home.models import ensure_default_seo_keywords


def seed_default_seo_keywords(sender, using, **kwargs):
    ensure_default_seo_keywords(using=using)
