from modeltranslation.translator import register, TranslationOptions
from news.models import NewsItem
from gallery.models import GalleryPhoto
from jobs.models import Job, JobLocation, JobRole, Department, EmploymentStatus
from pages.models import Product, ProductCategory, TermsOfService, PrivacyPolicy
 
@register(NewsItem)
class NewsItemTranslationOptions(TranslationOptions):
    fields = ('title', 'description') 

@register(GalleryPhoto)
class GalleryPhotoTranslationOptions(TranslationOptions):
    fields = ('title', 'description') 

@register(Job)
class JobTranslationOptions(TranslationOptions):
    fields = ('title', 'description')

@register(JobLocation)
class JobLocationTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(JobRole)
class JobRoleTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(Department)
class DepartmentTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(EmploymentStatus)
class EmploymentStatusTranslationOptions(TranslationOptions):
    fields = ('name',)

@register(Product)
class ProductTranslationOptions(TranslationOptions):
    fields = ('name', 'description')

@register(ProductCategory)
class ProductCategoryTranslationOptions(TranslationOptions):
    fields = ('name',) 

@register(TermsOfService)
class TermsOfServiceTranslationOptions(TranslationOptions):
    fields = ('title', 'content',)

@register(PrivacyPolicy)
class PrivacyPolicyTranslationOptions(TranslationOptions):
    fields = ('title', 'content',) 