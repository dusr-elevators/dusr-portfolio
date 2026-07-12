import os
from uuid import uuid4
from django.db import models
from django.utils.translation import gettext_lazy as _


def design_thumbnail_path(instance, filename):
    ext = filename.split('.')[-1]
    return os.path.join('design', 'thumbnails', f"{uuid4().hex}.{ext}")


def design_projection_path(instance, filename):
    ext = filename.split('.')[-1]
    return os.path.join('design', 'projections', f"{uuid4().hex}.{ext}")


class LucideIconChoice(models.Model):
    label = models.CharField(
        _('Label'),
        max_length=100,
        help_text=_('Friendly name shown in the dropdown, e.g. "Ceiling".'),
    )
    lucide_name = models.CharField(
        _('Lucide icon name'),
        max_length=50,
        unique=True,
        help_text=_('Exact PascalCase name from lucide.dev, e.g. "PanelTop".'),
    )

    class Meta:
        db_table = 'design_lucideiconchoise'
        ordering = ['label']
        verbose_name = _('Lucide Icon')
        verbose_name_plural = _('Lucide Icons')

    def __str__(self):
        return f"{self.label} ({self.lucide_name})"


class ComponentCategory(models.Model):
    name_ar = models.CharField(_('Name (Arabic)'), max_length=100)
    name_en = models.CharField(_('Name (English)'), max_length=100)
    layer_order = models.PositiveIntegerField(
        _('Layer order (z-index)'),
        default=0,
        help_text=_('Higher value = renders on top in the projection canvas.'),
    )
    is_required = models.BooleanField(
        _('Required'),
        default=False,
        help_text=_('User must select an option before exporting PDF.'),
    )
    icon = models.ForeignKey(
        LucideIconChoice,
        verbose_name=_('Icon'),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='categories',
        help_text=_('Icon shown in the component tab. Add new icons under Lucide Icons.'),
    )
    depends_on_category = models.ForeignKey(
        'self',
        verbose_name=_('Depends on category'),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dependent_categories',
        help_text=_(
            "If set, this category's layer image is resolved against the selected "
            "option of the target category (e.g. Mirror depends on Walls)."
        ),
    )
    is_active = models.BooleanField(_('Active'), default=True)

    class Meta:
        db_table = 'design_componentcategory'
        ordering = ['layer_order']
        verbose_name = _('Component Category')
        verbose_name_plural = _('Component Categories')

    def __str__(self):
        return self.name_en


class ComponentOption(models.Model):
    category = models.ForeignKey(
        ComponentCategory,
        on_delete=models.CASCADE,
        related_name='options',
        verbose_name=_('Category'),
    )
    name_ar = models.CharField(_('Name (Arabic)'), max_length=100)
    name_en = models.CharField(_('Name (English)'), max_length=100)
    thumbnail = models.ImageField(
        _('Thumbnail'),
        upload_to=design_thumbnail_path,
        blank=True,
        help_text=_(
            'Small preview image shown in the selection grid. '
            'Optional for options in a dependent category (e.g. mirrors).'
        ),
    )
    projection_image = models.ImageField(
        _('Projection image'),
        upload_to=design_projection_path,
        blank=True,
        help_text=_(
            'Transparent PNG placed on the 2D canvas. '
            'All projection images must share the same canvas dimensions. '
            'Leave empty for options in a dependent category (e.g. mirrors) — '
            'their images are managed per wall in the Option variants matrix.'
        ),
    )
    is_default_selected = models.BooleanField(
        _('Selected by default'),
        default=False,
        help_text=_('Auto-select this option in the Studio when the user has not chosen another option.'),
    )
    sort_order = models.PositiveIntegerField(_('Sort order'), default=0)
    is_active = models.BooleanField(_('Active'), default=True)

    class Meta:
        db_table = 'design_componentoption'
        ordering = ['sort_order']
        verbose_name = _('Component Option')
        verbose_name_plural = _('Component Options')

    def __str__(self):
        return f"{self.category.name_en} — {self.name_en}"


class OptionVariant(models.Model):
    option = models.ForeignKey(
        ComponentOption,
        on_delete=models.CASCADE,
        related_name='variants',
        verbose_name=_('Option'),
        help_text=_('The dependent-category option, e.g. a mirror position.'),
    )
    depends_on_option = models.ForeignKey(
        ComponentOption,
        on_delete=models.CASCADE,
        related_name='variant_uses',
        verbose_name=_('For option'),
        help_text=_('The option this variant image is painted on, e.g. a wall finish.'),
    )
    projection_image = models.ImageField(
        _('Projection image'),
        upload_to=design_projection_path,
        help_text=_('Transparent PNG for this option-on-option combination.'),
    )

    class Meta:
        db_table = 'design_optionvariant'
        unique_together = ('option', 'depends_on_option')
        verbose_name = _('Option Variant')
        verbose_name_plural = _('Option Variants')

    def __str__(self):
        return f"{self.option.name_en} on {self.depends_on_option.name_en}"
