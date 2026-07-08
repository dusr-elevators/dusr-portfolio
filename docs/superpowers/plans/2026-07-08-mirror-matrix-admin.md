# Mirror×Wall Matrix Admin & Radio Mirror Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-wall inline variant editor with a single admin matrix page (mirror types × walls, one upload per cell), and switch the frontend mirror tab to a radio list that shows only mirrors available for the selected wall.

**Architecture:** The data model is unchanged except two fields becoming optional — `OptionVariant` already stores one image per (mirror × wall). A new `OptionVariantAdmin` renders/saves the full grid as one multipart form. On the frontend, dependent categories (those with `depends_on_category`) render a `DependentOptionRadioList` instead of `OptionGrid`, and the canvas resolver paints variants only (no base-image fallback).

**Tech Stack:** Django 5.1 + DRF (backend, tested via `manage.py test`), Next.js 15 / React 19 / Tailwind 4 (frontend, **no test runner exists** — verification is `npm run typecheck` + browser).

**Spec:** `docs/superpowers/specs/2026-07-07-mirror-matrix-admin-design.md`

## Global Constraints

- Dev environment is Docker Compose; containers are already running. Backend at http://localhost:8001, frontend at http://localhost:3001.
- Backend test command: `docker compose exec backend python manage.py test design`
- Frontend check command: `docker compose exec frontend npm run typecheck`
- All user-facing strings are bilingual: Arabic (`name_ar` / `lang === 'ar'`) and English. The "None" radio label is en `None`, ar `بدون`.
- Frontend style tokens (match existing components exactly): background `#131313`, panel `#1a1a1a`, border `#2a2a2a`, hover border `#444748`, text `#e5e2e1`, muted `#888`/`#9a9a9a`, accent `#FF5722`.
- No new dependencies (backend or frontend).
- Admin matrix page requires `design.change_optionvariant`; delete wins over a simultaneously chosen file; an invalid image anywhere aborts the whole save.
- New backend test classes must use `override_settings(MEDIA_ROOT=<tempdir>)` so test uploads don't pollute `backend/media/`.

---

### Task 1: Optional images on ComponentOption

`thumbnail` and `projection_image` become optional (`blank=True`) so mirror types need no dummy uploads. DRF serializes an empty ImageField as `None`.

**Files:**
- Modify: `backend/design/models.py:95-107`
- Create: `backend/design/migrations/0005_*.py` (generated)
- Test: `backend/design/tests.py`

**Interfaces:**
- Produces: `ComponentOption.thumbnail` / `ComponentOption.projection_image` may be empty (`''` in ORM, `null` in API JSON). Task 5 relies on the API returning `null`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/design/tests.py` (note: `ComponentOptionSerializer` is already imported indirectly; add the direct import shown):

```python
from .api.serializers import ComponentOptionSerializer


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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test design.tests.OptionalImagesTest -v 2`
Expected: `test_option_images_are_optional` FAILS with `ValidationError: {'thumbnail': ['This field cannot be blank.'], ...}` (the serializer test may already pass — that's fine, it documents the API contract).

- [ ] **Step 3: Make the fields optional**

In `backend/design/models.py`, replace the two fields of `ComponentOption`:

```python
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
```

- [ ] **Step 4: Generate and apply the migration**

Run: `docker compose exec backend python manage.py makemigrations design`
Expected: creates `design/migrations/0005_alter_componentoption_projection_image_and_more.py` (name may vary slightly).

Run: `docker compose exec backend python manage.py migrate design`
Expected: `Applying design.0005_... OK`

- [ ] **Step 5: Run tests to verify they pass**

Run: `docker compose exec backend python manage.py test design -v 1`
Expected: ALL PASS (existing 12 + 2 new).

- [ ] **Step 6: Commit**

```bash
git add backend/design/models.py backend/design/migrations/ backend/design/tests.py
git commit -m "feat(design): make option thumbnail and projection image optional"
```

---

### Task 2: Matrix admin page — GET rendering

Register `OptionVariant` in the admin with a custom changelist that renders one matrix per dependency pair (rows = dependent options, columns = parent options, cell = existing variant preview or empty upload slot).

**Files:**
- Modify: `backend/design/admin.py`
- Create: `backend/templates/admin/design/optionvariant/change_list.html`
- Test: `backend/design/tests.py`

**Interfaces:**
- Consumes: models from Task 1 (unchanged names).
- Produces: admin URL `admin:design_optionvariant_changelist`; form field names `image__{option_id}__{parent_option_id}` and `delete__{option_id}__{parent_option_id}` (Task 3's POST handler reads exactly these); `OptionVariantAdmin._dependency_pairs()` and `OptionVariantAdmin._build_matrices()` (Task 3 reuses `_dependency_pairs`).

- [ ] **Step 1: Write the failing tests**

Append to `backend/design/tests.py`:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test design.tests.MatrixAdminGetTest -v 2`
Expected: FAIL with `NoReverseMatch: Reverse for 'design_optionvariant_changelist' not found` (the model isn't registered yet).

- [ ] **Step 3: Register OptionVariantAdmin**

In `backend/design/admin.py`, replace the import block at the top with:

```python
from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.utils.html import format_html

from .models import ComponentCategory, ComponentOption, LucideIconChoice, OptionVariant
```

Then append at the end of the file:

```python
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

    def changelist_view(self, request, extra_context=None):
        if not self.has_change_permission(request):
            raise PermissionDenied
        context = {
            **self.admin_site.each_context(request),
            'title': 'Variant images',
            'opts': self.model._meta,
            'matrices': self._build_matrices(),
        }
        return TemplateResponse(request, self.change_list_template, context)
```

(POST handling is Task 3 — GET-only for now.)

- [ ] **Step 4: Create the template**

Create `backend/templates/admin/design/optionvariant/change_list.html`:

```html
{% extends "admin/base_site.html" %}
{% load i18n %}

{% block content %}
<div id="content-main">
  {% if not matrices %}
    <p>
      {% trans "No dependent categories are configured." %}
      {% trans 'Set "Depends on category" on a component category (e.g. Mirror depends on Walls) to manage its per-option images here.' %}
    </p>
  {% else %}
    <form method="post" enctype="multipart/form-data">
      {% csrf_token %}
      {% for matrix in matrices %}
        <h2 style="margin-top:1.5em;">{{ matrix.dependent.name_en }} images per {{ matrix.parent.name_en }}</h2>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr>
                <th>{{ matrix.dependent.name_en }}</th>
                {% for col in matrix.columns %}
                  <th>{{ col.name_en }}<br><small>{{ col.name_ar }}</small></th>
                {% endfor %}
              </tr>
            </thead>
            <tbody>
              {% for row in matrix.rows %}
                <tr>
                  <th>{{ row.option.name_en }}<br><small>{{ row.option.name_ar }}</small></th>
                  {% for cell in row.cells %}
                    <td style="vertical-align:top; min-width:140px;">
                      {% if cell.variant %}
                        <img src="{{ cell.variant.projection_image.url }}" alt=""
                             style="height:60px; display:block; margin-bottom:4px; border-radius:4px;">
                      {% endif %}
                      <input type="file" accept="image/*"
                             name="image__{{ row.option.id }}__{{ cell.parent.id }}">
                      {% if cell.variant %}
                        <label style="display:block; margin-top:4px;">
                          <input type="checkbox" name="delete__{{ row.option.id }}__{{ cell.parent.id }}">
                          {% trans "Delete" %}
                        </label>
                      {% endif %}
                    </td>
                  {% endfor %}
                </tr>
              {% endfor %}
            </tbody>
          </table>
        </div>
      {% endfor %}
      <div class="submit-row" style="margin-top:1.5em;">
        <input type="submit" class="default" value="{% trans 'Save all changes' %}">
      </div>
    </form>
    <script>
      // Local preview when a file is picked (nicety only; the form works without JS).
      document.addEventListener('change', function (e) {
        if (e.target.type === 'file' && e.target.files && e.target.files[0]) {
          var cell = e.target.parentElement;
          var img = cell.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.style.height = '60px';
            img.style.display = 'block';
            img.style.marginBottom = '4px';
            img.style.borderRadius = '4px';
            cell.insertBefore(img, e.target);
          }
          img.src = URL.createObjectURL(e.target.files[0]);
        }
      });
    </script>
  {% endif %}
</div>
{% endblock %}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `docker compose exec backend python manage.py test design.tests.MatrixAdminGetTest -v 2`
Expected: 6/6 PASS.

- [ ] **Step 6: Eyeball the page**

Open http://localhost:8001/admin/design/optionvariant/ — the Mirror×Walls table renders with previews for existing variants and file inputs in empty cells. (Save doesn't work yet — that's Task 3.)

- [ ] **Step 7: Commit**

```bash
git add backend/design/admin.py backend/templates/admin/design/optionvariant/change_list.html backend/design/tests.py
git commit -m "feat(design): variant image matrix admin page (read-only grid)"
```

---

### Task 3: Matrix admin page — POST save semantics

One multipart POST saves the whole grid: create on new upload, replace on upload over existing, delete on checkbox (delete wins over a simultaneous file), and any invalid image aborts the entire save.

**Files:**
- Modify: `backend/design/admin.py` (the `OptionVariantAdmin` from Task 2)
- Test: `backend/design/tests.py`

**Interfaces:**
- Consumes: form field names `image__{option_id}__{parent_option_id}` / `delete__{option_id}__{parent_option_id}` and `_dependency_pairs()` from Task 2.
- Produces: nothing new for later tasks (frontend consumes variants via the existing API).

- [ ] **Step 1: Write the failing tests**

Append to `backend/design/tests.py`. Note `TINY_PNG` is a **real** 1×1 PNG — the save path validates uploads with `forms.ImageField`, which rejects the fake `b"img"` bytes used by model-level helpers:

```python
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose exec backend python manage.py test design.tests.MatrixAdminPostTest -v 2`
Expected: FAIL — POSTs currently just re-render the page (no variants created), so `test_post_creates_variant` etc. fail on count assertions.

- [ ] **Step 3: Implement the save handler**

In `backend/design/admin.py`, inside `OptionVariantAdmin`, add `_save_matrix` and route POSTs to it from `changelist_view`:

```python
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
        for row, col, upload, delete in changes:
            variant = OptionVariant.objects.filter(option=row, depends_on_option=col).first()
            if delete:
                if variant:
                    variant.projection_image.delete(save=False)
                    variant.delete()
                    deleted += 1
            elif variant:
                variant.projection_image.delete(save=False)
                variant.projection_image = upload
                variant.save()
                replaced += 1
            else:
                OptionVariant.objects.create(option=row, depends_on_option=col, projection_image=upload)
                created += 1
        messages.success(request, f"{created} added, {replaced} replaced, {deleted} deleted.")
        return HttpResponseRedirect(request.path)
```

And change the top of `changelist_view` to:

```python
    def changelist_view(self, request, extra_context=None):
        if not self.has_change_permission(request):
            raise PermissionDenied
        if request.method == 'POST':
            return self._save_matrix(request)
        context = {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `docker compose exec backend python manage.py test design.tests.MatrixAdminPostTest -v 2`
Expected: 7/7 PASS.

- [ ] **Step 5: Run the full design suite**

Run: `docker compose exec backend python manage.py test design -v 1`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/design/admin.py backend/design/tests.py
git commit -m "feat(design): bulk save (create/replace/delete) in variant matrix admin"
```

---

### Task 4: Remove the old per-wall inline

The matrix is now the single editing surface; the free-form `OptionVariantInline` on wall option pages goes away, along with its tests.

**Files:**
- Modify: `backend/design/admin.py` (delete `OptionVariantInline` class and `ComponentOptionAdmin.get_inlines`)
- Modify: `backend/design/tests.py` (delete `AdminInlineGatingTest` class and its `from .admin import ComponentOptionAdmin` / `AdminSite` imports)

**Interfaces:**
- Consumes: nothing.
- Produces: `ComponentOptionAdmin` without inlines — nothing else references the removed code.

- [ ] **Step 1: Delete the inline from the admin**

In `backend/design/admin.py` remove the entire `OptionVariantInline` class (the block starting `class OptionVariantInline(admin.TabularInline):`) and the `get_inlines` method of `ComponentOptionAdmin` (the block starting `def get_inlines(self, request, obj=None):`). Keep everything else in `ComponentOptionAdmin`.

- [ ] **Step 2: Delete its tests**

In `backend/design/tests.py` remove the `AdminInlineGatingTest` class and the two import lines directly above it:

```python
from django.contrib.admin.sites import AdminSite
from .admin import ComponentOptionAdmin
```

- [ ] **Step 3: Run the full backend suite**

Run: `docker compose exec backend python manage.py test design -v 1`
Expected: ALL PASS (three fewer tests than Task 3's run; no failures, no import errors).

- [ ] **Step 4: Sanity-check the admin in the browser**

Open http://localhost:8001/admin/design/componentoption/ and edit a wall option — the variants inline is gone. The matrix at http://localhost:8001/admin/design/optionvariant/ still works.

- [ ] **Step 5: Commit**

```bash
git add backend/design/admin.py backend/design/tests.py
git commit -m "refactor(design): remove per-wall variant inline in favor of matrix page"
```

---

### Task 5: Frontend — nullable image types and variants-only resolver

The API can now return `null` thumbnails/projection images, and dependent categories must paint **only** variant images (never the base image, never a transparent placeholder file).

**Files:**
- Modify: `frontend/components/design/types.ts`
- Modify: `frontend/components/design/resolveLayerImage.ts`
- Modify: `frontend/components/design/ProjectionCanvas.tsx`
- Modify: `frontend/components/design/OptionGrid.tsx` (guard against null thumbnail)
- Modify: `frontend/components/design/__tests__/resolveLayerImage.test.ts` (documentation-style scenarios; no runner exists — keep it type-correct and truthful)

**Interfaces:**
- Consumes: API shape from Task 1 (`thumbnail` / `projection_image` may be `null`).
- Produces: `resolveLayerImage(cat: ComponentCategory, selected: ComponentOption, selections: Selections): string | null` — Task 6's UI relies on `null` meaning "paint nothing". `ComponentOption.thumbnail: string | null`, `ComponentOption.projection_image: string | null`.

- [ ] **Step 1: Update the types**

In `frontend/components/design/types.ts` change the two fields on `ComponentOption`:

```ts
export interface ComponentOption {
  id: number;
  name_ar: string;
  name_en: string;
  thumbnail: string | null;
  projection_image: string | null;
  sort_order: number;
  variants?: OptionVariant[];
}
```

- [ ] **Step 2: Rewrite the resolver**

Replace the entire contents of `frontend/components/design/resolveLayerImage.ts` with:

```ts
import type { ComponentCategory, ComponentOption, Selections } from './types';

/**
 * Resolves the projection image for a layer.
 *
 * Independent categories always paint their own projection_image.
 *
 * Dependent categories (e.g. Mirror -> Walls) paint ONLY variant images:
 * no parent selected, or no variant for the selected parent, means nothing
 * is painted (null). There is no fallback to the option's base image.
 */
export function resolveLayerImage(
  cat: ComponentCategory,
  selected: ComponentOption,
  selections: Selections,
): string | null {
  if (cat.depends_on_category == null) {
    return selected.projection_image || null;
  }
  const parentOption = selections[cat.depends_on_category];
  if (!parentOption) return null;
  const variant = selected.variants?.find(v => v.depends_on_option === parentOption.id);
  return variant ? variant.projection_image : null;
}
```

- [ ] **Step 3: Skip null layers in the canvas**

In `frontend/components/design/ProjectionCanvas.tsx`, inside the `.map(cat => { ... })`, change:

```ts
            const selected = selections[cat.id];
            if (!selected) return null;
            const src = resolveLayerImage(cat, selected, selections);
```

to:

```ts
            const selected = selections[cat.id];
            if (!selected) return null;
            const src = resolveLayerImage(cat, selected, selections);
            if (!src) return null;
```

- [ ] **Step 4: Guard the thumbnail in OptionGrid**

In `frontend/components/design/OptionGrid.tsx`, replace the `<div className="aspect-square bg-[#1a1a1a] relative">...</div>` block with:

```tsx
            <div className="aspect-square bg-[#1a1a1a] relative">
              {option.thumbnail && (
                <Image
                  src={option.thumbnail}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              )}
            </div>
```

- [ ] **Step 5: Update the scenario documentation file**

Replace the entire contents of `frontend/components/design/__tests__/resolveLayerImage.test.ts` with:

```ts
/**
 * Behavior scenarios for resolveLayerImage (documentation — no test runner is
 * wired up in this project; this file is kept type-checked by `npm run typecheck`).
 *
 * Contract:
 * 1. Independent category  -> option's own projection_image (null when empty).
 * 2. Dependent category    -> ONLY variant images are painted:
 *    - variant exists for the selected parent -> variant.projection_image
 *    - no parent selected                     -> null (paint nothing)
 *    - no variant for the selected parent     -> null (paint nothing)
 */

import { resolveLayerImage } from '../resolveLayerImage';
import type { ComponentCategory, ComponentOption, Selections } from '../types';

const wallsCategory: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null, options: [],
};

const mirrorCategory: ComponentCategory = {
  id: 2, name_ar: 'المرايا', name_en: 'Mirrors', layer_order: 2,
  is_required: false, icon: 'Square', depends_on_category: 1, options: [],
};

const marbleWall: ComponentOption = {
  id: 10, name_ar: 'رخام', name_en: 'Marble',
  thumbnail: '/img/marble-t.png', projection_image: '/img/marble.png', sort_order: 1,
};

const topMirror: ComponentOption = {
  id: 20, name_ar: 'مرآة علوية', name_en: 'Top Mirror',
  thumbnail: null, projection_image: null, sort_order: 1,
  variants: [{ depends_on_option: 10, projection_image: '/img/top-on-marble.png' }],
};

const scenarios: { name: string; actual: string | null; expected: string | null }[] = [
  {
    name: 'independent category paints its own image',
    actual: resolveLayerImage(wallsCategory, marbleWall, { 1: marbleWall }),
    expected: '/img/marble.png',
  },
  {
    name: 'dependent category paints the matching variant',
    actual: resolveLayerImage(mirrorCategory, topMirror, { 1: marbleWall, 2: topMirror }),
    expected: '/img/top-on-marble.png',
  },
  {
    name: 'dependent category with no parent selected paints nothing',
    actual: resolveLayerImage(mirrorCategory, topMirror, { 2: topMirror }),
    expected: null,
  },
  {
    name: 'dependent category with no variant for the parent paints nothing',
    actual: resolveLayerImage(
      mirrorCategory,
      { ...topMirror, variants: [] },
      { 1: marbleWall, 2: topMirror },
    ),
    expected: null,
  },
];

export const allScenariosPass = scenarios.every(s => s.actual === s.expected);
```

- [ ] **Step 6: Typecheck**

Run: `docker compose exec frontend npm run typecheck`
Expected: exits 0, no errors. (If it reports errors in `DesignStudio.tsx` about `resolveLayerImage` — there are none today; `DesignStudio.tsx` doesn't call it. Any error means a missed `null` guard; fix before committing.)

- [ ] **Step 7: Commit**

```bash
git add frontend/components/design/types.ts frontend/components/design/resolveLayerImage.ts frontend/components/design/ProjectionCanvas.tsx frontend/components/design/OptionGrid.tsx frontend/components/design/__tests__/resolveLayerImage.test.ts
git commit -m "feat(design): variants-only rendering for dependent categories, nullable image fields"
```

---

### Task 6: Frontend — radio list for dependent categories

Dependent categories (Mirror) get a radio list: built-in "None" first, then only mirrors that have an image for the selected wall. Wall changes reset unavailable selections to None. `OptionGrid` drops its now-unused `disabledIds` machinery.

**Files:**
- Create: `frontend/components/design/DependentOptionRadioList.tsx`
- Modify: `frontend/components/design/DesignStudio.tsx`
- Modify: `frontend/components/design/OptionGrid.tsx` (remove `disabledIds`)

**Interfaces:**
- Consumes: `resolveLayerImage` semantics and nullable types from Task 5; existing `isOptionAvailable` in `DesignStudio.tsx`.
- Produces: `DependentOptionRadioList` with props `{ options: ComponentOption[]; selectedId: number | null; onSelect: (option: ComponentOption | null) => void; lang: Lang; parentName: string; parentSelected: boolean }` — `onSelect(null)` means "None".

- [ ] **Step 1: Create the radio list component**

Create `frontend/components/design/DependentOptionRadioList.tsx`:

```tsx
'use client';

import Image from 'next/image';
import type { ComponentOption } from './types';
import type { Lang } from '@/lib/lang';

interface DependentOptionRadioListProps {
  /** Only the options available for the currently selected parent option. */
  options: ComponentOption[];
  selectedId: number | null;
  /** null = the built-in "None" choice. */
  onSelect: (option: ComponentOption | null) => void;
  lang: Lang;
  parentName: string;
  parentSelected: boolean;
}

export default function DependentOptionRadioList({
  options,
  selectedId,
  onSelect,
  lang,
  parentName,
  parentSelected,
}: DependentOptionRadioListProps) {
  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
      active
        ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30'
        : 'border-[#2a2a2a] hover:border-[#444748]'
    }`;

  return (
    <div className="flex flex-col gap-2" role="radiogroup" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <label className={itemClass(selectedId == null)}>
        <input
          type="radio"
          name="dependent-option"
          checked={selectedId == null}
          onChange={() => onSelect(null)}
          className="accent-[#FF5722]"
        />
        <span className="text-sm text-[#e5e2e1]">{lang === 'ar' ? 'بدون' : 'None'}</span>
      </label>

      {!parentSelected && (
        <p className="text-[#888] text-sm py-2">
          {lang === 'ar' ? `اختر ${parentName} أولاً` : `Select ${parentName} first`}
        </p>
      )}

      {options.map(option => {
        const name = lang === 'ar' ? option.name_ar : option.name_en;
        return (
          <label key={option.id} className={itemClass(option.id === selectedId)}>
            <input
              type="radio"
              name="dependent-option"
              checked={option.id === selectedId}
              onChange={() => onSelect(option)}
              className="accent-[#FF5722]"
            />
            {option.thumbnail && (
              <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                <Image src={option.thumbnail} alt={name} fill className="object-cover" sizes="40px" />
              </span>
            )}
            <span className="text-sm text-[#e5e2e1]">{name}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Integrate into DesignStudio**

In `frontend/components/design/DesignStudio.tsx`:

**(a)** Add the import next to the other component imports:

```ts
import DependentOptionRadioList from './DependentOptionRadioList';
```

**(b)** In the `useState<Selections>` initializer, drop restored dependent selections that are no longer available — after the `for (const cat of categories)` restore loop, before `return initial;`, add:

```ts
    // Drop dependent selections whose variant no longer exists for the restored parent
    for (const cat of categories) {
      if (cat.depends_on_category != null && initial[cat.id]) {
        const parent = initial[cat.depends_on_category];
        if (!parent || !isOptionAvailable(initial[cat.id], parent.id)) {
          delete initial[cat.id];
        }
      }
    }
```

**(c)** Replace the whole auto-reset block inside `handleSelect` (everything from `// Auto-reset dependent category selections...` through the closing brace of `if (changedCategory) { ... }`) so unavailable dependent selections are simply removed (removed = the built-in "None"):

```ts
      // A dependent selection that has no variant for the new parent resets to "None"
      for (const depCategory of categories) {
        if (depCategory.depends_on_category === activeTab && next[depCategory.id]) {
          if (!isOptionAvailable(next[depCategory.id], option.id)) {
            const { [depCategory.id]: _removed, ...cleaned } = next;
            next = cleaned;
          }
        }
      }
```

**(d)** Add a handler for the radio list below `handleSelect`:

```ts
  const handleDependentSelect = (option: ComponentOption | null) => {
    if (option) {
      handleSelect(option);
      return;
    }
    // "None": clear this category's selection
    setSelections(prev => {
      const { [activeTab]: _removed, ...next } = prev;
      syncUrl(next);
      return next;
    });
  };
```

**(e)** Replace the entire `{(() => { ... disabledIds ... })()}` IIFE in the JSX (the block computing `disabledIds` and returning `<OptionGrid ... disabledIds={disabledIds} />`) with:

```tsx
                {activeCategory.depends_on_category != null ? (
                  (() => {
                    const parentCat = categories.find(c => c.id === activeCategory.depends_on_category);
                    const parentSelection = selections[activeCategory.depends_on_category];
                    const available = parentSelection
                      ? activeCategory.options.filter(o => isOptionAvailable(o, parentSelection.id))
                      : [];
                    return (
                      <DependentOptionRadioList
                        options={available}
                        selectedId={selections[activeTab]?.id ?? null}
                        onSelect={handleDependentSelect}
                        lang={lang}
                        parentName={parentCat ? (lang === 'ar' ? parentCat.name_ar : parentCat.name_en) : ''}
                        parentSelected={!!parentSelection}
                      />
                    );
                  })()
                ) : (
                  <OptionGrid
                    options={activeCategory.options}
                    selectedId={selections[activeTab]?.id ?? null}
                    onSelect={handleSelect}
                    lang={lang}
                  />
                )}
```

- [ ] **Step 3: Remove disabledIds from OptionGrid**

In `frontend/components/design/OptionGrid.tsx` (dependent categories no longer use the grid):

- Remove `disabledIds?: number[];` from `OptionGridProps` and `disabledIds = []` from the destructuring.
- Remove `const isDisabled = disabledIds.includes(option.id);`.
- Simplify the button: `onClick={() => onSelect(option)}`, remove the `disabled` attribute, and reduce the className ternary to:

```tsx
            className={`relative rounded-xl overflow-hidden border-2 transition-all group cursor-pointer ${
              isSelected
                ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30'
                : 'border-[#2a2a2a] hover:border-[#444748]'
            }`}
```

- [ ] **Step 4: Typecheck**

Run: `docker compose exec frontend npm run typecheck`
Expected: exits 0. (A leftover `disabledIds` usage anywhere will fail here.)

- [ ] **Step 5: Quick browser sanity check**

Open http://localhost:3001/en/design — the mirror tab shows a radio list ("None" + available mirrors for the selected wall); picking a wall without variants leaves only "None".

- [ ] **Step 6: Commit**

```bash
git add frontend/components/design/DependentOptionRadioList.tsx frontend/components/design/DesignStudio.tsx frontend/components/design/OptionGrid.tsx
git commit -m "feat(design): radio-button mirror selection with built-in None"
```

---

### Task 7: End-to-end manual verification

Exercise the whole flow in the browser against the running Docker containers — this is the project's substitute for frontend integration tests.

**Files:**
- Create: `docs/testing/2026-07-08-mirror-matrix-test-results.md` (record what you observed)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Admin matrix round-trip**

At http://localhost:8001/admin/design/optionvariant/:
1. Confirm the Mirror×Walls grid shows every active mirror row and wall column.
2. Upload an image into an empty cell → Save → success message, preview appears.
3. Replace an existing cell's image → Save → preview changes.
4. Tick Delete on a cell → Save → cell returns to an empty upload slot.
5. Confirm the wall option edit page (componentoption) no longer shows a variants inline.

- [ ] **Step 2: Studio behavior (English)**

At http://localhost:3001/en/design:
1. Select a wall that has mirror variants → mirror tab lists "None" + those mirrors only.
2. Pick a mirror → canvas shows the wall-specific render.
3. Switch to a wall without that mirror → selection resets to "None", canvas drops the mirror layer, radio list re-filters.
4. Select "None" explicitly → mirror layer disappears.
5. Export PDF → the mirror in the PDF matches the canvas.

- [ ] **Step 3: Studio behavior (Arabic / RTL)**

At http://localhost:3001/ar/design: repeat step 2's checks 1–3; confirm the radio list reads right-to-left with "بدون" first and Arabic option names.

- [ ] **Step 4: Record results and commit**

Write pass/fail per check (with any issues found) into `docs/testing/2026-07-08-mirror-matrix-test-results.md`, then:

```bash
git add docs/testing/2026-07-08-mirror-matrix-test-results.md
git commit -m "docs: manual test results for mirror matrix admin and radio selection"
```
