from django.contrib import admin
from django.utils.html import format_html
from .models import ComponentCategory, ComponentOption


class ComponentOptionInline(admin.TabularInline):
    model = ComponentOption
    extra = 1
    fields = ('name_en', 'name_ar', 'thumbnail', 'thumbnail_preview', 'projection_image', 'sort_order', 'is_active')
    readonly_fields = ('thumbnail_preview',)
    ordering = ('sort_order',)

    @admin.display(description='Thumbnail')
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html('<img src="{}" style="height:60px;border-radius:4px;" />', obj.thumbnail.url)
        return '—'


@admin.register(ComponentCategory)
class ComponentCategoryAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'name_ar', 'layer_order', 'is_required', 'is_active', 'option_count')
    list_filter = ('is_required', 'is_active')
    search_fields = ('name_en', 'name_ar')
    ordering = ('layer_order',)
    inlines = [ComponentOptionInline]

    @admin.display(description='Options')
    def option_count(self, obj):
        return obj.options.filter(is_active=True).count()


@admin.register(ComponentOption)
class ComponentOptionAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'name_ar', 'category', 'sort_order', 'thumbnail_preview', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name_en', 'name_ar')
    ordering = ('category__layer_order', 'sort_order')

    @admin.display(description='Thumbnail')
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html('<img src="{}" style="height:50px;border-radius:4px;" />', obj.thumbnail.url)
        return '—'
