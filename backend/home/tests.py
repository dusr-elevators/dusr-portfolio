from io import StringIO
from unittest.mock import patch

from django.apps import apps
from django.core import mail
from django.core.management import call_command
from django.db.models.signals import post_migrate
from django.test import TestCase, override_settings

from home.models import ContactSubmission, SEOKeyword


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


def contact_payload(**overrides):
    payload = {
        'first_name': 'Ahmad',
        'last_name': 'Kahil',
        'email': 'ahmad@example.com',
        'phone_number': '+966539705301',
        'project_engineering_department': 'Commercial Development',
        'message': 'Company: Dusr\n\nNeed elevator maintenance.',
    }
    payload.update(overrides)
    return payload


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='Dusr <info@dusr.sa>',
    CONTACT_EMAIL='info@dusr.sa',
)
class ContactSubmissionAPITest(TestCase):
    url = '/api/contact-submissions/'

    def setUp(self):
        mail.outbox = []

    def test_valid_submission_saves_and_emails_contact_inbox(self):
        response = self.client.post(self.url, contact_payload(), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['email_sent'])
        self.assertEqual(ContactSubmission.objects.count(), 1)

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['info@dusr.sa'])
        self.assertEqual(message.reply_to, ['ahmad@example.com'])
        self.assertIn('New contact request', message.subject)
        self.assertIn('Need elevator maintenance.', message.body)

    def test_arabic_submission_sends_arabic_notification(self):
        response = self.client.post(
            self.url,
            contact_payload(
                language='ar',
                project_engineering_department='تطوير تجاري',
                message='الشركة: دسر\n\nنحتاج صيانة للمصعد.',
            ),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201)
        message = mail.outbox[0]
        self.assertIn('طلب تواصل جديد', message.subject)
        self.assertIn('تم استلام طلب تواصل جديد', message.body)
        self.assertIn('نحتاج صيانة للمصعد.', message.body)

    def test_email_failure_still_saves_submission(self):
        with patch('home.api.emails.EmailMessage.send', side_effect=OSError('smtp down')):
            response = self.client.post(self.url, contact_payload(), content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()['email_sent'])
        self.assertEqual(ContactSubmission.objects.count(), 1)
