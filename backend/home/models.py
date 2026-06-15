from django.db import models
from django.utils.translation import gettext_lazy as _
import os
from uuid import uuid4


def cv_file_path(instance, filename):
    ext = filename.split('.')[-1]
    name = '.'.join(filename.split('.')[:-1])
    new_filename = f"{name}_{uuid4().hex[:8]}.{ext}"
    return os.path.join('cvs', new_filename)


def submission_file_path(instance, filename):
    ext = filename.split('.')[-1]
    name = '.'.join(filename.split('.')[:-1])
    new_filename = f"{name}_{uuid4().hex[:8]}.{ext}"
    return os.path.join('uploads', 'submissions', new_filename)


class ContactSubmission(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    project_engineering_department = models.CharField(max_length=100, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'home_contactsubmission'
        verbose_name = 'Contact Submission'
        verbose_name_plural = 'Contact Submissions'

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.email}"


class InvestmentSubmission(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    project_type = models.CharField(max_length=100)
    business_plan = models.FileField(upload_to=submission_file_path, null=True, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'home_investmentsubmission'
        verbose_name = 'Investment Submission'
        verbose_name_plural = 'Investment Submissions'

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.project_type}"


class SEOKeyword(models.Model):
    PAGE_CHOICES = [
        ('home', 'Home'),
        ('about', 'About'),
        ('invest', 'Invest'),
        ('sectors', 'Sectors'),
        ('sector-detail', 'Sector Detail'),
        ('media', 'Media'),
        ('careers', 'Careers'),
        ('job-detail', 'Job Detail'),
        ('contact', 'Contact'),
    ]

    page = models.CharField(max_length=32, choices=PAGE_CHOICES, unique=True)
    keywords_en = models.TextField(
        blank=True,
        help_text='Comma-separated English SEO phrases for this page.'
    )
    keywords_ar = models.TextField(
        blank=True,
        help_text='Comma-separated Arabic SEO phrases for this page.'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'home_seokeyword'
        verbose_name = 'SEO Keyword'
        verbose_name_plural = 'SEO Keywords'
        ordering = ['page']

    def __str__(self):
        return f"SEO keywords: {self.page}"


def ensure_default_seo_keywords(*, using='default'):
    created_pages = []

    for page, _label in SEOKeyword.PAGE_CHOICES:
        _, created = SEOKeyword.objects.using(using).get_or_create(
            page=page,
            defaults={
                'keywords_en': '',
                'keywords_ar': '',
            },
        )
        if created:
            created_pages.append(page)

    return created_pages
