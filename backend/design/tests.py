from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import TestCase

from .models import ComponentCategory, ComponentOption, OptionVariant
from .api.serializers import ComponentOptionSerializer


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


from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory

from .api.serializers import ComponentCategorySerializer
from .api.viewsets import ComponentCategoryViewSet


class PrefetchQueryCountTest(TestCase):
    """Regression test: ensure no N+1 queries when serializing categories via viewset queryset."""

    def _make_category(self, name, layer_order, depends_on=None):
        return ComponentCategory.objects.create(
            name_en=name, name_ar=name, layer_order=layer_order,
            is_active=True, depends_on_category=depends_on,
        )

    def _make_active_option_with_variant(self, category, name, depends_on_option=None):
        opt = ComponentOption.objects.create(
            category=category, name_en=name, name_ar=name, is_active=True,
            thumbnail=SimpleUploadedFile(f"{name}-t.png", b"img", content_type="image/png"),
            projection_image=SimpleUploadedFile(f"{name}-p.png", b"img", content_type="image/png"),
        )
        if depends_on_option:
            OptionVariant.objects.create(
                option=opt, depends_on_option=depends_on_option,
                projection_image=SimpleUploadedFile(f"{name}-v.png", b"img", content_type="image/png"),
            )
        return opt

    def _count_queries_for_qs(self, n_cats):
        """Build n_cats categories each with 2 active options + 1 variant, return query count."""
        # Reset DB state via transaction savepoints isn't needed; each TestCase wraps in transaction.
        cats = []
        wall_opts = []
        for i in range(n_cats):
            cat = self._make_category(f"Cat{i}", layer_order=i + 1)
            cats.append(cat)
            opt1 = self._make_active_option_with_variant(cat, f"Opt{i}a")
            opt2 = self._make_active_option_with_variant(cat, f"Opt{i}b")
            wall_opts.extend([opt1, opt2])

        qs = ComponentCategoryViewSet().get_queryset()
        request = APIRequestFactory().get('/')
        with CaptureQueriesContext(connection) as ctx:
            data = ComponentCategorySerializer(qs, many=True, context={'request': request}).data
            _ = [c['options'] for c in data]  # force evaluation
        return len(ctx)

    def test_no_n_plus_one_when_serializing_categories(self):
        # Build 2 categories, each with 2 active options (no variants needed for count test)
        walls = self._make_category("Walls", layer_order=1)
        mirror = self._make_category("Mirror", layer_order=2)
        w1 = self._make_active_option_with_variant(walls, "Marble")
        w2 = self._make_active_option_with_variant(walls, "Granite")
        self._make_active_option_with_variant(mirror, "MirTop", depends_on_option=w1)
        self._make_active_option_with_variant(mirror, "MirBot", depends_on_option=w2)

        qs = ComponentCategoryViewSet().get_queryset()
        request = APIRequestFactory().get('/')
        with CaptureQueriesContext(connection) as ctx:
            data = ComponentCategorySerializer(qs, many=True, context={'request': request}).data
            _ = [c['options'] for c in data]  # force evaluation

        # With proper prefetching: 1 query for categories + 1 for active options + 1 for variants = 3 total.
        # Constant regardless of number of categories/options (no N+1).
        query_count_2cats = len(ctx)
        self.assertEqual(query_count_2cats, 3, f"Expected 3 queries (categories+options+variants), got {query_count_2cats}")

    def test_query_count_is_constant_not_linear(self):
        """Confirm query count doesn't grow when adding more categories and options."""
        count_small = self._count_queries_for_qs(2)
        count_large = self._count_queries_for_qs(5)
        self.assertEqual(
            count_small, count_large,
            f"Query count grew from {count_small} (2 cats) to {count_large} (5 cats) — N+1 detected",
        )


class SerializerTest(TestCase):
    def setUp(self):
        self.walls = ComponentCategory.objects.create(name_en="Walls", name_ar="Walls", layer_order=1)
        self.mirror = ComponentCategory.objects.create(
            name_en="Mirror", name_ar="Mirror", layer_order=2, depends_on_category=self.walls,
        )
        self.marble = make_option(self.walls, "Marble")
        self.top = make_option(self.mirror, "Top")
        OptionVariant.objects.create(
            option=self.top, depends_on_option=self.marble,
            projection_image=SimpleUploadedFile("v.png", b"img", content_type="image/png"),
        )

    def test_category_exposes_depends_on_category(self):
        data = ComponentCategorySerializer(self.mirror).data
        self.assertEqual(data["depends_on_category"], self.walls.id)

    def test_walls_category_depends_on_category_is_null(self):
        data = ComponentCategorySerializer(self.walls).data
        self.assertIsNone(data["depends_on_category"])

    def test_option_exposes_variants(self):
        data = ComponentCategorySerializer(self.mirror).data
        top = next(o for o in data["options"] if o["name_en"] == "Top")
        self.assertEqual(len(top["variants"]), 1)
        self.assertEqual(top["variants"][0]["depends_on_option"], self.marble.id)
        self.assertIn("projection_image", top["variants"][0])

    def test_option_without_variants_serializes_empty_list(self):
        data = ComponentCategorySerializer(self.walls).data
        marble = next(o for o in data["options"] if o["name_en"] == "Marble")
        self.assertEqual(marble["variants"], [])


from django.contrib.admin.sites import AdminSite
from .admin import ComponentOptionAdmin


class AdminInlineGatingTest(TestCase):
    def setUp(self):
        self.walls = ComponentCategory.objects.create(name_en="Walls", name_ar="Walls", layer_order=1)
        self.ceiling = ComponentCategory.objects.create(name_en="Ceiling", name_ar="Ceiling", layer_order=0)
        ComponentCategory.objects.create(
            name_en="Mirror", name_ar="Mirror", layer_order=2, depends_on_category=self.walls,
        )
        self.marble = make_option(self.walls, "Marble")
        self.panel = make_option(self.ceiling, "Panel")
        self.admin = ComponentOptionAdmin(ComponentOption, AdminSite())

    def test_inline_shown_for_wall_option(self):
        inlines = self.admin.get_inlines(request=None, obj=self.marble)
        self.assertEqual(len(inlines), 1)

    def test_inline_hidden_for_non_dependency_option(self):
        self.assertEqual(self.admin.get_inlines(request=None, obj=self.panel), [])

    def test_inline_hidden_when_adding_new_option(self):
        self.assertEqual(self.admin.get_inlines(request=None, obj=None), [])


class OptionalImagesTest(TestCase):
    def setUp(self):
        self.walls = ComponentCategory.objects.create(name_en="Walls", name_ar="Walls", layer_order=1)
        self.mirror = ComponentCategory.objects.create(
            name_en="Mirror", name_ar="Mirror", layer_order=2, depends_on_category=self.walls,
        )

    def test_option_images_are_optional(self):
        opt = ComponentOption(category=self.mirror, name_en="Top", name_ar="Top")
        opt.full_clean()  # must not raise once thumbnail/projection_image are blank=True

    def test_option_without_images_serializes_none(self):
        opt = ComponentOption.objects.create(category=self.mirror, name_en="Bare", name_ar="Bare")
        data = ComponentOptionSerializer(opt).data
        self.assertIsNone(data["thumbnail"])
        self.assertIsNone(data["projection_image"])
