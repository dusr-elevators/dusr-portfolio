from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from ckeditor.fields import RichTextField


class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories'
    )
    image = models.ImageField(upload_to='category_images/', null=True, blank=True)

    class Meta:
        db_table = 'home_category'

    def __str__(self):
        return self.name


class PortfolioItem(models.Model):
    category = models.ForeignKey(Category, related_name='items', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='portfolio_images/')
    link = models.URLField()

    class Meta:
        db_table = 'home_portfolioitem'

    def __str__(self):
        return self.title


class ProductCategory(models.Model):
    MAIN_CATEGORY_CHOICES = [
        ('meat', _('Meat')),
        ('dairy', _('Dairy')),
        ('oils', _('Oils')),
        ('others', _('Others')),
    ]

    name = models.CharField(max_length=100)
    icon = models.FileField(
        upload_to='category_icons/',
        validators=[FileExtensionValidator(['svg'])],
        help_text='Upload SVG icon file'
    )
    filter_class = models.CharField(max_length=50, help_text='CSS class used for filtering (e.g., filter-beef)')
    parents = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='children')
    level = models.IntegerField(default=0, help_text='0 for main category, 1 for subcategory, 2 for sub-subcategory')
    order = models.IntegerField(default=0, help_text='Order in which the category appears')
    is_active = models.BooleanField(default=True)
    main_category_type = models.CharField(
        max_length=20,
        choices=MAIN_CATEGORY_CHOICES,
        null=True,
        blank=True,
        help_text='Main category type (only for level 0 categories)'
    )

    class Meta:
        verbose_name_plural = 'Product Categories'
        ordering = ['level', 'order', 'name']
        db_table = 'home_productcategory'

    def __str__(self):
        parent_names = [parent.name for parent in self.parents.all()]
        if parent_names:
            return f"{' & '.join(parent_names)} > {self.name}"
        return self.name

    def save(self, *args, **kwargs):
        if self.level != 0:
            self.main_category_type = None
        super().save(*args, **kwargs)

    def get_main_category_types(self):
        types = set()
        if self.main_category_type:
            types.add(self.main_category_type)
        for parent in self.parents.all():
            types.update(parent.get_main_category_types())
        return list(types)

    def get_hierarchies(self):
        if not self.parents.exists():
            return [[self]]

        hierarchies = []
        for parent in self.parents.all():
            parent_hierarchies = parent.get_hierarchies()
            for hierarchy in parent_hierarchies:
                hierarchies.append(hierarchy + [self])
        return hierarchies


class Product(models.Model):
    categories = models.ManyToManyField(ProductCategory, related_name='products')
    name = models.CharField(max_length=200)
    description = models.TextField()
    shop_link = models.URLField(max_length=500)
    image = models.ImageField(upload_to='products/')
    order = models.IntegerField(default=0, help_text='Order in which the product appears')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        db_table = 'home_product'

    def __str__(self):
        category_names = [cat.name for cat in self.categories.all()]
        return f"{self.name} - {' & '.join(category_names)}"

    def get_filter_classes(self):
        classes = set()
        for category in self.categories.all():
            classes.add(category.filter_class)
            for parent in category.parents.all():
                classes.add(parent.filter_class)
        return ' '.join(classes)


class HeroImage(models.Model):
    PAGE_CHOICES = [
        ('photos_videos', 'Photos & Videos Page'),
        ('about', 'About Us Page'),
        ('news', 'News Page'),
        ('careers', 'Careers Page'),
        ('contact', 'Contact Page'),
        ('heritage', 'Heritage Page'),
        ('team', 'Team Page'),
        ('corporate_governance', 'Corporate Governance Page'),
        ('vision_mission_values', 'Vision, Mission & Values Page'),
        ('sustainability', 'Sustainability Page'),
        ('saudi_vision', 'Saudi Vision Page'),
    ]

    page = models.CharField(max_length=50, choices=PAGE_CHOICES, unique=True)
    title = models.CharField(max_length=200, help_text="For admin reference only")
    image = models.ImageField(upload_to='hero/', help_text="Legacy field - use desktop_image instead", null=True, blank=True)
    desktop_image = models.ImageField(upload_to='hero/desktop/', help_text="Desktop version (1920x1080px recommended)", null=True, blank=True)
    mobile_image = models.ImageField(upload_to='hero/mobile/', help_text="Mobile version (768x1024px recommended)", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hero Image'
        verbose_name_plural = 'Hero Images'
        db_table = 'home_heroimage'

    def __str__(self):
        return f"{self.get_page_display()} - {self.title}"

    def save(self, *args, **kwargs):
        if self.is_active:
            HeroImage.objects.filter(page=self.page).exclude(pk=self.pk).update(is_active=False)

        if self.image and not self.desktop_image:
            self.desktop_image = self.image
        if self.image and not self.mobile_image:
            self.mobile_image = self.image

        super().save(*args, **kwargs)


class TermsOfService(models.Model):
    title = models.CharField(_('Title'), max_length=200)
    content = RichTextField(_('Content'))
    last_updated = models.DateTimeField(_('Last Updated'), auto_now=True)

    class Meta:
        verbose_name = _('Terms of Service')
        verbose_name_plural = _('Terms of Service')
        db_table = 'home_termsofservice'

    def __str__(self):
        return self.title


class PrivacyPolicy(models.Model):
    title = models.CharField(_('Title'), max_length=200)
    content = RichTextField(_('Content'))
    last_updated = models.DateTimeField(_('Last Updated'), auto_now=True)

    class Meta:
        verbose_name = _('Privacy Policy')
        verbose_name_plural = _('Privacy Policy')
        db_table = 'home_privacypolicy'

    def __str__(self):
        return self.title


class Newsletter(models.Model):
    email = models.EmailField(_('Email'), unique=True)
    subscribed_at = models.DateTimeField(_('Subscribed At'), auto_now_add=True)
    is_active = models.BooleanField(_('Is Active'), default=True)

    class Meta:
        verbose_name = _('Newsletter Subscription')
        verbose_name_plural = _('Newsletter Subscriptions')
        ordering = ['-subscribed_at']
        db_table = 'home_newsletter'

    def __str__(self):
        return self.email


class SiteConfig(models.Model):
    catalogue_pdf = models.FileField(upload_to='catalogues/', blank=True, null=True, help_text='Upload the catalogue PDF shown in product pages')

    class Meta:
        verbose_name = 'Site Configuration'
        verbose_name_plural = 'Site Configuration'
        db_table = 'home_siteconfig'

    def __str__(self):
        return 'Site Configuration'


class CorporateGovernanceImage(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to='corporate_governance/')
    ar_image = models.ImageField(upload_to='corporate_governance/ar/', null=True, blank=True, help_text="Arabic version of the image")
    order = models.IntegerField(default=0, help_text="Display order on the corporate governance page")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Corporate Governance Image'
        verbose_name_plural = 'Corporate Governance Images'
        db_table = 'home_corporategovernanceimage'

    def __str__(self):
        return self.title

# Create your models here.
