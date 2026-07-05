from django.contrib import admin
from django.utils.html import format_html
from .models import ComponentCategory, ComponentOption, LucideIconChoice, OptionVariant


@admin.register(LucideIconChoice)
class LucideIconChoiceAdmin(admin.ModelAdmin):
    list_display = ('label', 'lucide_name', 'usage_count')
    search_fields = ('label', 'lucide_name')
    ordering = ('label',)

    @admin.display(description='Used by')
    def usage_count(self, obj):
        count = obj.categories.count()
        return f"{count} categor{'y' if count == 1 else 'ies'}"


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
    list_display = ('name_en', 'name_ar', 'icon', 'layer_order', 'is_required', 'is_active', 'option_count')
    list_filter = ('is_required', 'is_active')
    search_fields = ('name_en', 'name_ar')
    ordering = ('layer_order',)
    inlines = [ComponentOptionInline]

    @admin.display(description='Options')
    def option_count(self, obj):
        return obj.options.filter(is_active=True).count()


class OptionVariantInline(admin.TabularInline):
    model = OptionVariant
    fk_name = 'depends_on_option'
    extra = 1
    fields = ('option', 'projection_image', 'projection_preview')
    readonly_fields = ('projection_preview',)

    @admin.display(description='Preview')
    def projection_preview(self, obj):
        if obj.projection_image:
            return format_html('<img src="{}" style="height:50px;border-radius:4px;" />', obj.projection_image.url)
        return '—'

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'option':
            kwargs['queryset'] = ComponentOption.objects.filter(
                category__dependent_categories__isnull=False,
            ).distinct()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


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

    def get_inlines(self, request, obj=None):
        if obj is not None and ComponentCategory.objects.filter(
            depends_on_category=obj.category_id,
        ).exists():
            return [OptionVariantInline]
        return []
