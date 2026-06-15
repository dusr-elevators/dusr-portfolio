from django.contrib import admin
from home.models import ContactSubmission, SEOKeyword


admin.site.site_header = 'Dusr Administration'
admin.site.site_title = 'Dusr Admin'
admin.site.index_title = 'Portfolio Management'


@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = (
        'first_name',
        'last_name',
        'email',
        'phone_number',
        'project_engineering_department',
        'created_at',
    )
    list_filter = ('project_engineering_department', 'created_at')
    search_fields = (
        'first_name',
        'last_name',
        'email',
        'phone_number',
        'project_engineering_department',
        'message',
    )
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'


@admin.register(SEOKeyword)
class SEOKeywordAdmin(admin.ModelAdmin):
    list_display = ('page', 'updated_at')
    search_fields = ('page', 'keywords_en', 'keywords_ar')
    ordering = ('page',)
