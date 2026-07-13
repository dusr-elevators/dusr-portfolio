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

    def test_option_exposes_default_selected_flag(self):
        self.top.is_default_selected = True
        self.top.save(update_fields=["is_default_selected"])
        data = ComponentCategorySerializer(self.mirror).data
        top = next(o for o in data["options"] if o["name_en"] == "Top")
        self.assertIs(top["is_default_selected"], True)


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
        self.assertIs(data["is_default_selected"], False)
        self.assertIsNone(data["thumbnail"])
        self.assertIsNone(data["projection_image"])


import tempfile

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse

MATRIX_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MATRIX_MEDIA_ROOT)
class MatrixAdminGetTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin_user = User.objects.create_superuser("matrixadmin", "m@x.com", "pass")
        self.client.force_login(self.admin_user)
        self.walls = ComponentCategory.objects.create(name_en="Walls", name_ar="Walls", layer_order=1)
        self.mirror = ComponentCategory.objects.create(
            name_en="Mirror", name_ar="Mirror", layer_order=2, depends_on_category=self.walls,
        )
        self.marble = make_option(self.walls, "Marble")
        self.top = make_option(self.mirror, "Top")
        self.url = reverse("admin:design_optionvariant_changelist")

    def test_anonymous_is_redirected_to_login(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)

    def test_staff_without_permission_gets_403(self):
        User = get_user_model()
        staff = User.objects.create_user("plainstaff", "s@x.com", "pass", is_staff=True)
        self.client.force_login(staff)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_matrix_renders_cell_inputs(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, f'name="image__{self.top.id}__{self.marble.id}"')
        self.assertContains(response, "Mirror images per Walls")

    def test_existing_variant_shows_preview_and_delete(self):
        OptionVariant.objects.create(
            option=self.top, depends_on_option=self.marble,
            projection_image=SimpleUploadedFile("v.png", b"img", content_type="image/png"),
        )
        response = self.client.get(self.url)
        self.assertContains(response, f'name="delete__{self.top.id}__{self.marble.id}"')

    def test_inactive_options_excluded(self):
        hidden = ComponentOption.objects.create(
            category=self.mirror, name_en="Hidden", name_ar="Hidden", is_active=False,
        )
        response = self.client.get(self.url)
        self.assertNotContains(response, f'image__{hidden.id}__')

    def test_empty_state_without_dependent_categories(self):
        ComponentCategory.objects.all().delete()
        response = self.client.get(self.url)
        self.assertContains(response, "Depends on category")


import base64

TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


@override_settings(MEDIA_ROOT=MATRIX_MEDIA_ROOT)
class MatrixAdminPostTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin_user = User.objects.create_superuser("matrixpost", "p@x.com", "pass")
        self.client.force_login(self.admin_user)
        self.walls = ComponentCategory.objects.create(name_en="Walls", name_ar="Walls", layer_order=1)
        self.mirror = ComponentCategory.objects.create(
            name_en="Mirror", name_ar="Mirror", layer_order=2, depends_on_category=self.walls,
        )
        self.marble = make_option(self.walls, "Marble")
        self.top = make_option(self.mirror, "Top")
        self.url = reverse("admin:design_optionvariant_changelist")

    def _key(self):
        return f"{self.top.id}__{self.marble.id}"

    def _make_variant(self):
        return OptionVariant.objects.create(
            option=self.top, depends_on_option=self.marble,
            projection_image=SimpleUploadedFile("old.png", TINY_PNG, content_type="image/png"),
        )

    def test_post_creates_variant(self):
        response = self.client.post(self.url, {
            f"image__{self._key()}": SimpleUploadedFile("new.png", TINY_PNG, content_type="image/png"),
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(OptionVariant.objects.count(), 1)
        variant = OptionVariant.objects.get()
        self.assertEqual(variant.option, self.top)
        self.assertEqual(variant.depends_on_option, self.marble)

    def test_post_replaces_existing_variant(self):
        variant = self._make_variant()
        old_name = variant.projection_image.name
        self.client.post(self.url, {
            f"image__{self._key()}": SimpleUploadedFile("newer.png", TINY_PNG, content_type="image/png"),
        })
        variant.refresh_from_db()
        self.assertEqual(OptionVariant.objects.count(), 1)
        self.assertNotEqual(variant.projection_image.name, old_name)

    def test_post_deletes_variant(self):
        self._make_variant()
        response = self.client.post(self.url, {f"delete__{self._key()}": "on"})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(OptionVariant.objects.count(), 0)

    def test_delete_wins_over_simultaneous_file(self):
        self._make_variant()
        self.client.post(self.url, {
            f"delete__{self._key()}": "on",
            f"image__{self._key()}": SimpleUploadedFile("x.png", TINY_PNG, content_type="image/png"),
        })
        self.assertEqual(OptionVariant.objects.count(), 0)

    def test_empty_post_changes_nothing(self):
        self._make_variant()
        self.client.post(self.url, {})
        self.assertEqual(OptionVariant.objects.count(), 1)

    def test_invalid_image_aborts_entire_save(self):
        granite = make_option(self.walls, "Granite")
        response = self.client.post(self.url, {
            f"image__{self._key()}": SimpleUploadedFile("good.png", TINY_PNG, content_type="image/png"),
            f"image__{self.top.id}__{granite.id}": SimpleUploadedFile(
                "bad.txt", b"not an image", content_type="text/plain",
            ),
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(OptionVariant.objects.count(), 0)  # nothing saved


from django.contrib.admin.sites import site as admin_site

from .models import DesignCTASettings


class DesignCTASettingsModelTest(TestCase):
    def test_default_is_visible_true(self):
        obj = DesignCTASettings.objects.create()
        self.assertTrue(obj.is_visible)

    def test_str(self):
        obj = DesignCTASettings.objects.create()
        self.assertEqual(str(obj), 'Design CTA Button Setting')


class DesignCTASettingsAdminTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin_user = User.objects.create_superuser("ctaadmin", "c@x.com", "pass")
        self.client.force_login(self.admin_user)
        self.url = reverse("admin:design_designctasettings_changelist")

    def test_changelist_lazily_creates_singleton_row(self):
        self.assertEqual(DesignCTASettings.objects.count(), 0)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(DesignCTASettings.objects.count(), 1)

    def test_is_visible_is_list_editable(self):
        response = self.client.get(self.url)
        self.assertContains(response, 'name="form-0-is_visible"')

    def test_toggle_off_via_list_editable_post(self):
        DesignCTASettings.objects.create(pk=1, is_visible=True)
        response = self.client.post(self.url, {
            'form-TOTAL_FORMS': '1',
            'form-INITIAL_FORMS': '1',
            'form-MIN_NUM_FORMS': '0',
            'form-MAX_NUM_FORMS': '1',
            'form-0-id': '1',
            '_save': 'Save',
        })
        self.assertEqual(response.status_code, 302)
        obj = DesignCTASettings.objects.get(pk=1)
        self.assertFalse(obj.is_visible)

    def test_cannot_add_second_row(self):
        DesignCTASettings.objects.create(pk=1)
        model_admin = admin_site._registry[DesignCTASettings]
        request = type('R', (), {'user': self.admin_user})()
        self.assertFalse(model_admin.has_add_permission(request))

    def test_cannot_delete(self):
        DesignCTASettings.objects.create(pk=1)
        model_admin = admin_site._registry[DesignCTASettings]
        self.assertFalse(model_admin.has_delete_permission(None))


class DesignCTASettingsAPITest(TestCase):
    def test_get_lazily_creates_and_defaults_true(self):
        self.assertEqual(DesignCTASettings.objects.count(), 0)
        response = self.client.get('/api/design/cta-settings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'is_visible': True})
        self.assertEqual(DesignCTASettings.objects.count(), 1)

    def test_get_reflects_toggled_flag(self):
        DesignCTASettings.objects.create(pk=1, is_visible=False)
        response = self.client.get('/api/design/cta-settings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'is_visible': False})
