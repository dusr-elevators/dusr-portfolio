from django.core.management.base import BaseCommand

from home.models import SEOKeyword, ensure_default_seo_keywords


class Command(BaseCommand):
    help = 'Create missing SEO keyword rows for all configured pages.'

    def handle(self, *args, **options):
        created_pages = ensure_default_seo_keywords()
        total_pages = len(SEOKeyword.PAGE_CHOICES)

        if created_pages:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {len(created_pages)} SEO keyword rows "
                    f"for {total_pages} pages: {', '.join(created_pages)}"
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"SEO keyword rows already exist for all {total_pages} pages."
            )
        )
