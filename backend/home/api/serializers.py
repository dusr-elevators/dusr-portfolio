from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator

from home.models import ContactSubmission, InvestmentSubmission, SEOKeyword
from pages.models import (
    Category,
    PortfolioItem,
    ProductCategory,
    Product,
    HeroImage,
    TermsOfService,
    PrivacyPolicy,
    Newsletter,
    SiteConfig,
    CorporateGovernanceImage,
)
from financial.models import (
    ReportCategory,
    Report,
    ReportIcon,
    FinancialSection,
    FinancialCategory,
    FinancialDataPoint,
)
from jobs.models import (
    JobLocation,
    JobRole,
    Department,
    EmploymentStatus,
    Job,
    JobApplication,
)
from media_app.models import CarouselSlide, HomeVideo
from news.models import NewsItem
from gallery.models import GalleryPhoto, GalleryPhotoImage


class CategorySerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Category
        fields = '__all__'


class PortfolioItemSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(read_only=True)
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = PortfolioItem
        fields = '__all__'


class ProductCategorySerializer(serializers.ModelSerializer):
    parents = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    icon = serializers.FileField(read_only=True)
    main_category_types = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = [
            'id',
            'name',
            'icon',
            'filter_class',
            'parents',
            'level',
            'order',
            'is_active',
            'main_category_type',
            'main_category_types',
        ]

    def get_main_category_types(self, obj):
        return obj.get_main_category_types()


class ProductSerializer(serializers.ModelSerializer):
    categories = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    image = serializers.ImageField(read_only=True)
    filter_classes = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'shop_link',
            'image',
            'order',
            'is_active',
            'created_at',
            'updated_at',
            'categories',
            'filter_classes',
        ]

    def get_filter_classes(self, obj):
        return obj.get_filter_classes()


class JobLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobLocation
        fields = '__all__'


class JobRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRole
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class EmploymentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentStatus
        fields = '__all__'


class JobSerializer(serializers.ModelSerializer):
    location = JobLocationSerializer(read_only=True)
    role = JobRoleSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    employment_status = EmploymentStatusSerializer(read_only=True)

    class Meta:
        model = Job
        fields = '__all__'


class JobApplicationSerializer(serializers.ModelSerializer):
    portfolio_link = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=500,
    )
    job = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = JobApplication
        fields = ['id', 'job', 'full_name', 'email', 'phone_number', 'portfolio_link', 'cv_file', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_cv_file(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('File size must be less than 5MB.')
        ext = value.name.lower().split('.')[-1]
        if ext not in ['pdf', 'doc', 'docx']:
            raise serializers.ValidationError('Only PDF, DOC, and DOCX files are allowed.')
        return value

    def validate_portfolio_link(self, value):
        if value is None:
            return None

        cleaned = value.strip()
        if not cleaned:
            return None

        if '://' not in cleaned:
            cleaned = f'https://{cleaned}'

        validator = URLValidator(schemes=['http', 'https'])
        try:
            validator(cleaned)
        except DjangoValidationError:
            raise serializers.ValidationError('Please enter a valid URL.')

        return cleaned


class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class InvestmentSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvestmentSubmission
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def validate_business_plan(self, value):
        if value and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('File size must be less than 10MB.')
        if value:
            ext = value.name.lower().split('.')[-1]
            if ext != 'pdf':
                raise serializers.ValidationError('Only PDF files are allowed.')
        return value


class SEOKeywordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SEOKeyword
        fields = '__all__'


class CarouselSlideSerializer(serializers.ModelSerializer):
    desktop_image = serializers.ImageField(read_only=True)
    mobile_image = serializers.ImageField(read_only=True)
    ar_desktop_image = serializers.ImageField(read_only=True)
    ar_mobile_image = serializers.ImageField(read_only=True)

    class Meta:
        model = CarouselSlide
        fields = '__all__'


class HomeVideoSerializer(serializers.ModelSerializer):
    video_file = serializers.FileField(read_only=True)

    class Meta:
        model = HomeVideo
        fields = '__all__'


class NewsItemSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = NewsItem
        fields = '__all__'


class GalleryPhotoImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = GalleryPhotoImage
        fields = '__all__'


class GalleryPhotoSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)
    related_images = GalleryPhotoImageSerializer(many=True, read_only=True)

    class Meta:
        model = GalleryPhoto
        fields = [
            'id',
            'title',
            'description',
            'date',
            'image',
            'order',
            'is_active',
            'created_at',
            'updated_at',
            'related_images',
        ]


class HeroImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)
    desktop_image = serializers.ImageField(read_only=True)
    mobile_image = serializers.ImageField(read_only=True)

    class Meta:
        model = HeroImage
        fields = '__all__'


class TermsOfServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TermsOfService
        fields = '__all__'


class PrivacyPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivacyPolicy
        fields = '__all__'


class NewsletterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Newsletter
        fields = ['id', 'email', 'subscribed_at', 'is_active']
        read_only_fields = ['id', 'subscribed_at']

    def create(self, validated_data):
        obj, _ = Newsletter.objects.get_or_create(
            email=validated_data['email'],
            defaults=validated_data,
        )
        if not obj.is_active:
            obj.is_active = True
            obj.save(update_fields=['is_active'])
        return obj


class SiteConfigSerializer(serializers.ModelSerializer):
    catalogue_pdf = serializers.FileField(read_only=True)

    class Meta:
        model = SiteConfig
        fields = '__all__'


class CorporateGovernanceImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)
    ar_image = serializers.ImageField(read_only=True)

    class Meta:
        model = CorporateGovernanceImage
        fields = '__all__'


class ReportSerializer(serializers.ModelSerializer):
    pdf_file = serializers.FileField(read_only=True)
    year = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id',
            'description_en',
            'description_ar',
            'pdf_file',
            'date',
            'year',
        ]

    def get_year(self, obj):
        return obj.date.year


class ReportCategorySerializer(serializers.ModelSerializer):
    icon = serializers.CharField(source='icon.name', read_only=True)
    reports = ReportSerializer(many=True, read_only=True)

    class Meta:
        model = ReportCategory
        fields = [
            'id',
            'name_en',
            'name_ar',
            'icon',
            'reports',
        ]


class FinancialDataPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialDataPoint
        fields = [
            'year',
            'quarter',
            'value',
        ]


class FinancialCategorySerializer(serializers.ModelSerializer):
    data_points = FinancialDataPointSerializer(many=True, read_only=True)

    class Meta:
        model = FinancialCategory
        fields = [
            'id',
            'section',
            'label_en',
            'label_ar',
            'order',
            'show_in_summary',
            'data_points',
        ]


class FinancialSectionSerializer(serializers.ModelSerializer):
    categories = FinancialCategorySerializer(many=True, read_only=True)

    class Meta:
        model = FinancialSection
        fields = [
            'id',
            'name_en',
            'name_ar',
            'order',
            'is_tab',
            'categories',
        ]
