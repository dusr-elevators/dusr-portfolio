from rest_framework import mixins, viewsets, serializers
from django.db.models import Prefetch
from rest_framework.parsers import FormParser, MultiPartParser

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
from .serializers import (
    CategorySerializer,
    PortfolioItemSerializer,
    ProductCategorySerializer,
    ProductSerializer,
    JobLocationSerializer,
    JobRoleSerializer,
    DepartmentSerializer,
    EmploymentStatusSerializer,
    JobSerializer,
    JobApplicationSerializer,
    CarouselSlideSerializer,
    HomeVideoSerializer,
    NewsItemSerializer,
    GalleryPhotoSerializer,
    GalleryPhotoImageSerializer,
    HeroImageSerializer,
    TermsOfServiceSerializer,
    PrivacyPolicySerializer,
    NewsletterSerializer,
    SiteConfigSerializer,
    CorporateGovernanceImageSerializer,
    ReportCategorySerializer,
    FinancialCategorySerializer,
    FinancialSectionSerializer,
    ContactSubmissionSerializer,
    InvestmentSubmissionSerializer,
    SEOKeywordSerializer,
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class PortfolioItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PortfolioItem.objects.select_related('category').all()
    serializer_class = PortfolioItemSerializer


class ProductCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ProductCategory.objects.filter(is_active=True).prefetch_related('parents')
    serializer_class = ProductCategorySerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(
        is_active=True,
        categories__is_active=True,
    ).prefetch_related(
        'categories',
        'categories__parents',
    ).distinct()
    serializer_class = ProductSerializer


class JobLocationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JobLocation.objects.all()
    serializer_class = JobLocationSerializer


class JobRoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JobRole.objects.all()
    serializer_class = JobRoleSerializer


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class EmploymentStatusViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EmploymentStatus.objects.all()
    serializer_class = EmploymentStatusSerializer


class JobViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Job.objects.select_related(
        'location',
        'role',
        'department',
        'employment_status',
    ).all()
    serializer_class = JobSerializer


class JobApplicationViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = JobApplication.objects.all()
    serializer_class = JobApplicationSerializer
    parser_classes = (MultiPartParser, FormParser)
    http_method_names = ['post', 'head', 'options']

    def perform_create(self, serializer):
        try:
            serializer.save()
        except (PermissionError, OSError) as exc:
            raise serializers.ValidationError(
                {"detail": f"Could not save uploaded CV file. {exc}"}
            ) from exc


class ContactSubmissionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = ContactSubmission.objects.all()
    serializer_class = ContactSubmissionSerializer
    http_method_names = ['post', 'head', 'options']


class InvestmentSubmissionViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = InvestmentSubmission.objects.all()
    serializer_class = InvestmentSubmissionSerializer
    parser_classes = (MultiPartParser, FormParser)
    http_method_names = ['post', 'head', 'options']

    def perform_create(self, serializer):
        try:
            serializer.save()
        except (PermissionError, OSError) as exc:
            raise serializers.ValidationError(
                {"detail": f"Could not save uploaded business plan file. {exc}"}
            ) from exc


class CarouselSlideViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CarouselSlide.objects.filter(is_active=True).order_by('order', '-created_at')
    serializer_class = CarouselSlideSerializer


class HomeVideoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HomeVideo.objects.filter(is_active=True)
    serializer_class = HomeVideoSerializer


class NewsItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NewsItem.objects.filter(is_active=True).order_by('order', '-created_at')
    serializer_class = NewsItemSerializer


class GalleryPhotoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GalleryPhoto.objects.filter(is_active=True).prefetch_related('related_images')
    serializer_class = GalleryPhotoSerializer


class GalleryPhotoImageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GalleryPhotoImage.objects.filter(gallery_photo__is_active=True)
    serializer_class = GalleryPhotoImageSerializer


class HeroImageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HeroImage.objects.filter(is_active=True)
    serializer_class = HeroImageSerializer


class TermsOfServiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TermsOfService.objects.all()
    serializer_class = TermsOfServiceSerializer


class PrivacyPolicyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PrivacyPolicy.objects.all()
    serializer_class = PrivacyPolicySerializer


class NewsletterViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = Newsletter.objects.all()
    serializer_class = NewsletterSerializer
    http_method_names = ['post', 'head', 'options']


class SiteConfigViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SiteConfig.objects.all()
    serializer_class = SiteConfigSerializer


class CorporateGovernanceImageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CorporateGovernanceImage.objects.filter(is_active=True).order_by('order', '-created_at')
    serializer_class = CorporateGovernanceImageSerializer


class ReportCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportCategory.objects.filter(is_active=True).prefetch_related(
        Prefetch('reports', queryset=Report.objects.filter(is_active=True).order_by('-date', 'order'))
    ).order_by('order', 'name_en')
    serializer_class = ReportCategorySerializer


class FinancialSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FinancialSection.objects.filter(is_active=True).prefetch_related(
        Prefetch(
            'categories',
            queryset=FinancialCategory.objects.filter(is_active=True).prefetch_related(
                Prefetch('data_points', queryset=FinancialDataPoint.objects.filter(is_active=True).order_by('year', 'quarter'))
            ).order_by('order', 'label_en')
        )
    ).order_by('order', 'name_en')
    serializer_class = FinancialSectionSerializer


class SEOKeywordViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SEOKeyword.objects.all()
    serializer_class = SEOKeywordSerializer
