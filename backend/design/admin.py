from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.utils.html import format_html

from .models import ComponentCategory, ComponentOption, DesignCTASettings, LucideIconChoice, OptionVariant


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
    fields = ('name_en', 'name_ar', 'thumbnail', 'thumbnail_preview', 'projection_image', 'is_default_selected', 'sort_order', 'is_active')
    readonly_fields = ('thumbnail_preview',)
    ordering = ('sort_order',)

    @admin.display(description='Thumbnail')
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html('<img src="{}" style="height:60px;border-radius:4px;" />', obj.thumbnail.url)
        if obj.pk and obj.category_id and obj.category.depends_on_category_id:
            return dependent_option_icon(obj)
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


@admin.register(ComponentOption)
class ComponentOptionAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'name_ar', 'category', 'sort_order', 'thumbnail_preview', 'is_default_selected', 'is_active')
    list_filter = ('category', 'is_default_selected', 'is_active')
    search_fields = ('name_en', 'name_ar')
    ordering = ('category__layer_order', 'sort_order')

    @admin.display(description='Thumbnail')
    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html('<img src="{}" style="height:50px;border-radius:4px;" />', obj.thumbnail.url)
        if obj.category_id and obj.category.depends_on_category_id:
            return dependent_option_icon(obj)
        return '—'


def dependent_option_icon(obj):
    label = obj.category.icon.lucide_name if obj.category.icon_id else obj.category.name_en
    return format_html(
        '<span title="{}" style="display:inline-flex;height:44px;width:44px;align-items:center;'
        'justify-content:center;border:1px solid #d0d0d0;border-radius:6px;background:#f8f8f8;color:#555;">'
        '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" '
        'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        '<rect x="6" y="3" width="12" height="18" rx="2"></rect>'
        '<path d="M9 7h6"></path><path d="M9 11h6"></path><path d="M9 15h4"></path>'
        '</svg>'
        '</span>',
        label,
    )


@admin.register(OptionVariant)
class OptionVariantAdmin(admin.ModelAdmin):
    """Matrix editor: one table per dependency pair (e.g. Mirror -> Walls);
    rows are dependent options, columns are parent options, one image per cell."""

    change_list_template = 'admin/design/optionvariant/change_list.html'

    def has_add_permission(self, request):
        return False  # the matrix is the only editing surface

    def _dependency_pairs(self):
        return ComponentCategory.objects.filter(
            depends_on_category__isnull=False, is_active=True,
        ).select_related('depends_on_category')

    def _build_matrices(self):
        matrices = []
        for dep_cat in self._dependency_pairs():
            rows = list(dep_cat.options.filter(is_active=True))
            cols = list(dep_cat.depends_on_category.options.filter(is_active=True))
            variants = {
                (v.option_id, v.depends_on_option_id): v
                for v in OptionVariant.objects.filter(option__in=rows, depends_on_option__in=cols)
            }
            matrices.append({
                'dependent': dep_cat,
                'parent': dep_cat.depends_on_category,
                'columns': cols,
                'rows': [
                    {
                        'option': row,
                        'cells': [
                            {'parent': col, 'variant': variants.get((row.id, col.id))}
                            for col in cols
                        ],
                    }
                    for row in rows
                ],
            })
        return matrices

    def _save_matrix(self, request):
        image_field = forms.ImageField()
        changes = []  # (row_option, col_option, upload, delete_flag)
        errors = []
        for dep_cat in self._dependency_pairs():
            rows = dep_cat.options.filter(is_active=True)
            cols = dep_cat.depends_on_category.options.filter(is_active=True)
            for row in rows:
                for col in cols:
                    key = f"{row.id}__{col.id}"
                    delete = bool(request.POST.get(f"delete__{key}"))
                    upload = request.FILES.get(f"image__{key}")
                    if not delete and upload:
                        try:
                            image_field.clean(upload)
                        except ValidationError:
                            errors.append(f"{row.name_en} × {col.name_en}: not a valid image.")
                            continue
                    if delete or upload:
                        changes.append((row, col, upload, delete))
        if errors:
            for error in errors:
                messages.error(request, error)
            messages.error(request, "Nothing was saved. Fix the files above and try again.")
            return HttpResponseRedirect(request.path)

        created = replaced = deleted = 0
        old_files = []  # storage files to remove only after the transaction actually commits
        with transaction.atomic():
            for row, col, upload, delete in changes:
                variant = OptionVariant.objects.filter(option=row, depends_on_option=col).first()
                if delete:
                    if variant:
                        old_files.append(variant.projection_image)  # capture before the row is deleted
                        variant.delete()
                        deleted += 1
                elif variant:
                    old_files.append(variant.projection_image)  # capture before the field is reassigned
                    variant.projection_image = upload
                    variant.save()
                    replaced += 1
                else:
                    OptionVariant.objects.create(option=row, depends_on_option=col, projection_image=upload)
                    created += 1
            if old_files:
                transaction.on_commit(lambda files=old_files: [f.delete(save=False) for f in files])
        if changes:
            messages.success(request, f"{created} added, {replaced} replaced, {deleted} deleted.")
        else:
            messages.info(request, "No changes to save.")
        return HttpResponseRedirect(request.path)

    def changelist_view(self, request, extra_context=None):
        if not self.has_change_permission(request):
            raise PermissionDenied
        if request.method == 'POST':
            return self._save_matrix(request)
        context = {
            **self.admin_site.each_context(request),
            'title': 'Variant images',
            'opts': self.model._meta,
            'matrices': self._build_matrices(),
        }
        return TemplateResponse(request, self.change_list_template, context)


@admin.register(DesignCTASettings)
class DesignCTASettingsAdmin(admin.ModelAdmin):
    list_display = ('is_visible',)
    list_editable = ('is_visible',)
    list_display_links = None

    def get_queryset(self, request):
        DesignCTASettings.objects.get_or_create(pk=1)
        return super().get_queryset(request)

    def has_add_permission(self, request):
        return not DesignCTASettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
