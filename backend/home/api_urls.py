from django.urls import path
from rest_framework.routers import DefaultRouter
from home.api.views import csrf_cookie

from home.api.viewsets import (
    CategoryViewSet,
    PortfolioItemViewSet,
    ProductCategoryViewSet,
    ProductViewSet,
    JobLocationViewSet,
    JobRoleViewSet,
    DepartmentViewSet,
    EmploymentStatusViewSet,
    JobViewSet,
    JobApplicationViewSet,
    CarouselSlideViewSet,
    HomeVideoViewSet,
    NewsItemViewSet,
    GalleryPhotoViewSet,
    GalleryPhotoImageViewSet,
    HeroImageViewSet,
    TermsOfServiceViewSet,
    PrivacyPolicyViewSet,
    NewsletterViewSet,
    SiteConfigViewSet,
    CorporateGovernanceImageViewSet,
    ReportCategoryViewSet,
    FinancialSectionViewSet,
    ContactSubmissionViewSet,
    InvestmentSubmissionViewSet,
    SEOKeywordViewSet,
)


router = DefaultRouter()
router.register('categories', CategoryViewSet)
router.register('portfolio-items', PortfolioItemViewSet)
router.register('product-categories', ProductCategoryViewSet)
router.register('products', ProductViewSet)
router.register('job-locations', JobLocationViewSet)
router.register('job-roles', JobRoleViewSet)
router.register('departments', DepartmentViewSet)
router.register('employment-statuses', EmploymentStatusViewSet)
router.register('jobs', JobViewSet)
router.register('job-applications', JobApplicationViewSet, basename='jobapplication')
router.register('carousel-slides', CarouselSlideViewSet)
router.register('home-videos', HomeVideoViewSet)
router.register('news-items', NewsItemViewSet)
router.register('gallery-photos', GalleryPhotoViewSet)
router.register('gallery-photo-images', GalleryPhotoImageViewSet)
router.register('hero-images', HeroImageViewSet)
router.register('terms-of-service', TermsOfServiceViewSet)
router.register('privacy-policy', PrivacyPolicyViewSet)
router.register('newsletter', NewsletterViewSet, basename='newsletter')
router.register('site-config', SiteConfigViewSet)
router.register('corporate-governance-images', CorporateGovernanceImageViewSet)
router.register('reports', ReportCategoryViewSet)
router.register('financial-sections', FinancialSectionViewSet)
router.register('contact-submissions', ContactSubmissionViewSet, basename='contactsubmission')
router.register('investment-submissions', InvestmentSubmissionViewSet, basename='investmentsubmission')
router.register('seo-keywords', SEOKeywordViewSet)

urlpatterns = [
    path('csrf/', csrf_cookie, name='csrf-cookie'),
]
urlpatterns += router.urls
