from io import StringIO

from django.apps import apps
from django.core.management import call_command
from django.db.models.signals import post_migrate
from django.test import TestCase

from home.models import SEOKeyword


class SeedSEOKeywordsCommandTests(TestCase):
    def test_post_migrate_signal_creates_missing_rows(self):
        SEOKeyword.objects.all().delete()

        app_config = apps.get_app_config('home')
        post_migrate.send(
            sender=app_config,
            app_config=app_config,
            verbosity=0,
            interactive=False,
            using='default',
            plan=[],
        )

        self.assertEqual(SEOKeyword.objects.count(), len(SEOKeyword.PAGE_CHOICES))

    def test_command_creates_missing_rows_for_all_pages(self):
        SEOKeyword.objects.all().delete()

        stdout = StringIO()
        call_command('seed_seo_keywords', stdout=stdout)

        self.assertEqual(SEOKeyword.objects.count(), len(SEOKeyword.PAGE_CHOICES))
        self.assertEqual(
            set(SEOKeyword.objects.values_list('page', flat=True)),
            {page for page, _label in SEOKeyword.PAGE_CHOICES},
        )
        self.assertIn('Created', stdout.getvalue())

    def test_command_is_idempotent_and_preserves_existing_keywords(self):
        SEOKeyword.objects.all().delete()
        existing = SEOKeyword.objects.create(
            page='home',
            keywords_en='dusr home',
            keywords_ar='دسر الرئيسية',
        )

        call_command('seed_seo_keywords')

        existing.refresh_from_db()
        self.assertEqual(existing.keywords_en, 'dusr home')
        self.assertEqual(existing.keywords_ar, 'دسر الرئيسية')
        self.assertEqual(SEOKeyword.objects.count(), len(SEOKeyword.PAGE_CHOICES))

        stdout = StringIO()
        call_command('seed_seo_keywords', stdout=stdout)

        self.assertEqual(SEOKeyword.objects.count(), len(SEOKeyword.PAGE_CHOICES))
        self.assertIn('already exist', stdout.getvalue())
