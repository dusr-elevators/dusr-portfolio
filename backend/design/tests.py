from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import TestCase

from .models import ComponentCategory, ComponentOption, OptionVariant


def make_option(category, name):
    return ComponentOption.objects.create(
        category=category,
        name_en=name,
        name_ar=name,
        thumbnail=SimpleUploadedFile(f"{name}-t.png", b"img", content_type="image/png"),
        projection_image=SimpleUploadedFile(f"{name}-p.png", b"img", content_type="image/png"),
    )


class OptionVariantModelTest(TestCase):
    def setUp(self):
        self.walls = ComponentCategory.objects.create(name_en="Walls", name_ar="Walls", layer_order=1)
        self.mirror = ComponentCategory.objects.create(
            name_en="Mirror", name_ar="Mirror", layer_order=2, depends_on_category=self.walls,
        )
        self.marble = make_option(self.walls, "Marble")
        self.top = make_option(self.mirror, "Top")

    def test_depends_on_category_links_mirror_to_walls(self):
        self.assertEqual(self.mirror.depends_on_category, self.walls)
        self.assertIn(self.mirror, self.walls.dependent_categories.all())

    def test_variant_creation_and_related_names(self):
        variant = OptionVariant.objects.create(
            option=self.top,
            depends_on_option=self.marble,
            projection_image=SimpleUploadedFile("v.png", b"img", content_type="image/png"),
        )
        self.assertIn(variant, self.top.variants.all())
        self.assertIn(variant, self.marble.variant_uses.all())

    def test_variant_unique_per_option_and_wall(self):
        OptionVariant.objects.create(
            option=self.top, depends_on_option=self.marble,
            projection_image=SimpleUploadedFile("a.png", b"img", content_type="image/png"),
        )
        with self.assertRaises(IntegrityError):
            OptionVariant.objects.create(
                option=self.top, depends_on_option=self.marble,
                projection_image=SimpleUploadedFile("b.png", b"img", content_type="image/png"),
            )
