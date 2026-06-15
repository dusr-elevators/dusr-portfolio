from django.db import models
from django.core.validators import FileExtensionValidator


class ReportCategory(models.Model):
    name_en = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True)
    icon = models.ForeignKey(
        'ReportIcon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='categories',
        help_text='Select an icon from the list'
    )
    order = models.IntegerField(default=0, help_text='Order in which the category appears')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name_en']
        verbose_name = 'Report Category'
        verbose_name_plural = 'Report Categories'
        db_table = 'home_reportcategory'

    def __str__(self):
        return self.name_en


class ReportIcon(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Report Icon'
        verbose_name_plural = 'Report Icons'
        db_table = 'home_reporticon'

    def __str__(self):
        return self.name


class Report(models.Model):
    category = models.ForeignKey(
        ReportCategory,
        related_name='reports',
        on_delete=models.CASCADE,
    )
    description_en = models.CharField(max_length=255)
    description_ar = models.CharField(max_length=255, blank=True)
    pdf_file = models.FileField(
        upload_to='reports/',
        validators=[FileExtensionValidator(['pdf'])],
        help_text='Upload a PDF file'
    )
    date = models.DateField(help_text='Report date (used for year filtering)')
    order = models.IntegerField(default=0, help_text='Order within the category and year')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'order', 'description_en']
        verbose_name = 'Report'
        verbose_name_plural = 'Reports'
        db_table = 'home_report'

    def __str__(self):
        return self.description_en


class FinancialSection(models.Model):
    name_en = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200, blank=True)
    order = models.IntegerField(default=0, help_text='Order in which the section appears')
    is_tab = models.BooleanField(default=True, help_text='Show this section as a tab')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name_en']
        verbose_name = 'Financial Section'
        verbose_name_plural = 'Financial Sections'
        db_table = 'home_financialsection'

    def __str__(self):
        return self.name_en


class FinancialCategory(models.Model):
    section = models.ForeignKey(
        FinancialSection,
        related_name='categories',
        on_delete=models.CASCADE,
    )
    label_en = models.CharField(max_length=200)
    label_ar = models.CharField(max_length=200, blank=True)
    order = models.IntegerField(default=0, help_text='Order in which the category appears')
    show_in_summary = models.BooleanField(default=False, help_text='Show this category in the Summary tab')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['section__order', 'order', 'label_en']
        verbose_name = 'Financial Category'
        verbose_name_plural = 'Financial Categories'
        db_table = 'home_financialcategory'

    def __str__(self):
        return f"{self.section.name_en} - {self.label_en}"


class FinancialDataPoint(models.Model):
    QUARTER_CHOICES = [
        (1, 'Q1'),
        (2, 'Q2'),
        (3, 'Q3'),
        (4, 'Q4'),
    ]

    category = models.ForeignKey(
        FinancialCategory,
        related_name='data_points',
        on_delete=models.CASCADE,
    )
    year = models.PositiveIntegerField()
    quarter = models.PositiveSmallIntegerField(choices=QUARTER_CHOICES)
    value = models.DecimalField(max_digits=16, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['year', 'quarter']
        unique_together = ('category', 'year', 'quarter')
        verbose_name = 'Financial Data Point'
        verbose_name_plural = 'Financial Data Points'
        db_table = 'home_financialdatapoint'

    def __str__(self):
        return f"{self.category.label_en} {self.year} Q{self.quarter}"
