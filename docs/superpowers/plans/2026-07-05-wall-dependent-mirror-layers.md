# Wall-Dependent Mirror Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Mirror category to the cabin designer whose painted image depends on the selected wall option, via a per-wall variant matrix with a generic fallback.

**Architecture:** A generic self-FK `depends_on_category` on `ComponentCategory` marks a category as "resolved against another category's selection." A new `OptionVariant` model holds one projection image per `(dependent option × wall option)` pair. The DRF API exposes both; `ProjectionCanvas` resolves each dependent layer's image from the selected wall, falling back to the option's own `projection_image`.

**Tech Stack:** Django 3.x + DRF (backend, sqlite in dev), Django `TestCase` runner; Next.js 14 App Router + TypeScript + Tailwind (frontend, no JS test runner).

## Global Constraints

- Backend Django settings module: `goldenMeatPortfolio.settings.dev` (default in `manage.py`).
- Run backend tests from `backend/` with: `.venv/bin/python manage.py test design`.
- All `projection_image` assets must share the same canvas dimensions (existing rule from spec/model help text).
- Frontend has **no** automated test runner — verify frontend tasks with `npm run typecheck` (`tsc --noEmit`) from `frontend/` plus manual check. Do NOT add a test runner (out of scope).
- Follow existing code style: Django `gettext_lazy as _` for verbose names/help text; DRF `ModelSerializer`s; frontend uses `next/image` and the existing dark palette.
- Reuse the existing `design_projection_path` upload helper in `backend/design/models.py` for variant images.
- Commit after each task. Branch already in use: `feature/wall-dependent-mirror-layers`.

---

### Task 1: Model — `OptionVariant` + `depends_on_category`

**Files:**
- Modify: `backend/design/models.py` (add field to `ComponentCategory`, add `OptionVariant` model)
- Create: `backend/design/migrations/0004_optionvariant_depends_on_category.py` (generated)
- Create/Modify: `backend/design/tests.py` (replace the empty stub)

**Interfaces:**
- Produces:
  - `ComponentCategory.depends_on_category` → nullable self-FK, `related_name='dependent_categories'`.
  - `OptionVariant(option: FK ComponentOption [related_name='variants'], depends_on_option: FK ComponentOption [related_name='variant_uses'], projection_image: ImageField)`, `unique_together = ('option', 'depends_on_option')`.

- [ ] **Step 1: Write the failing test**

Replace the contents of `backend/design/tests.py` with:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python manage.py test design -v 2` (from `backend/`)
Expected: FAIL — `ImportError: cannot import name 'OptionVariant'` (model does not exist yet).

- [ ] **Step 3: Add the field and model**

In `backend/design/models.py`, add the field inside `ComponentCategory` (place it right after the `icon` FK, before `is_active`):

```python
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
```

Then append a new model at the end of the file:

```python
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
```

- [ ] **Step 4: Generate the migration**

Run: `.venv/bin/python manage.py makemigrations design` (from `backend/`)
Expected: creates `backend/design/migrations/0004_...py` adding the field and model.

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/bin/python manage.py test design -v 2` (from `backend/`)
Expected: PASS (3 tests in `OptionVariantModelTest`).

- [ ] **Step 6: Commit**

```bash
git add backend/design/models.py backend/design/migrations/0004_*.py backend/design/tests.py
git commit -m "feat(design): add OptionVariant model and depends_on_category field

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: API — expose `variants` and `depends_on_category`

**Files:**
- Modify: `backend/design/api/serializers.py`
- Modify: `backend/design/api/viewsets.py` (add prefetch to avoid N+1)
- Modify: `backend/design/tests.py` (append serializer test)

**Interfaces:**
- Consumes: `OptionVariant`, `ComponentCategory.depends_on_category` from Task 1.
- Produces JSON shape:
  - Category: `{... , "depends_on_category": <int|null>, "options": [...] }`
  - Option: `{... , "variants": [ {"depends_on_option": <int>, "projection_image": <url>} ] }`

- [ ] **Step 1: Write the failing test**

Append to `backend/design/tests.py`:

```python
from .api.serializers import ComponentCategorySerializer


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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python manage.py test design.tests.SerializerTest -v 2` (from `backend/`)
Expected: FAIL — `KeyError: 'depends_on_category'` (field not serialized yet).

- [ ] **Step 3: Update the serializers**

Replace the contents of `backend/design/api/serializers.py` with:

```python
from rest_framework import serializers
from ..models import ComponentCategory, ComponentOption, OptionVariant


class OptionVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = OptionVariant
        fields = ['depends_on_option', 'projection_image']


class ComponentOptionSerializer(serializers.ModelSerializer):
    variants = OptionVariantSerializer(many=True, read_only=True)

    class Meta:
        model = ComponentOption
        fields = ['id', 'name_ar', 'name_en', 'thumbnail', 'projection_image', 'sort_order', 'variants']


class ComponentCategorySerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    icon = serializers.SerializerMethodField()

    class Meta:
        model = ComponentCategory
        fields = ['id', 'name_ar', 'name_en', 'layer_order', 'is_required', 'icon',
                  'depends_on_category', 'options']

    def get_icon(self, obj):
        return obj.icon.lucide_name if obj.icon_id else ''

    def get_options(self, obj):
        active_options = obj.options.filter(is_active=True)
        return ComponentOptionSerializer(active_options, many=True, context=self.context).data
```

- [ ] **Step 4: Add prefetch in the viewset**

In `backend/design/api/viewsets.py`, replace the `queryset` line so variants are prefetched:

```python
from rest_framework import viewsets
from django.db.models import Prefetch
from ..models import ComponentCategory, ComponentOption
from .serializers import ComponentCategorySerializer


class ComponentCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ComponentCategory.objects.filter(is_active=True).prefetch_related(
        Prefetch('options', queryset=ComponentOption.objects.prefetch_related('variants')),
    )
    serializer_class = ComponentCategorySerializer
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/bin/python manage.py test design -v 2` (from `backend/`)
Expected: PASS (all model + serializer tests).

- [ ] **Step 6: Commit**

```bash
git add backend/design/api/serializers.py backend/design/api/viewsets.py backend/design/tests.py
git commit -m "feat(design): serialize variants and depends_on_category

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Admin — gated variant inline under wall options

**Files:**
- Modify: `backend/design/admin.py`
- Modify: `backend/design/tests.py` (append admin gating test)

**Interfaces:**
- Consumes: `OptionVariant` (Task 1), `depends_on_category` (Task 1).
- Produces: `ComponentOptionAdmin.get_inlines(request, obj)` returns `[OptionVariantInline]` only when some category's `depends_on_category` equals `obj.category`; otherwise `[]`.

- [ ] **Step 1: Write the failing test**

Append to `backend/design/tests.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python manage.py test design.tests.AdminInlineGatingTest -v 2` (from `backend/`)
Expected: FAIL — `AttributeError`/assertion: `get_inlines` not overridden yet (default returns configured inlines, here `[]` for all, so `test_inline_shown_for_wall_option` fails on `len == 1`).

- [ ] **Step 3: Implement the inline + gating**

In `backend/design/admin.py`, update the import line:

```python
from .models import ComponentCategory, ComponentOption, LucideIconChoice, OptionVariant
```

Add this inline class above `ComponentOptionAdmin` (it uses `depends_on_option` as the parent FK because `OptionVariant` has two FKs to `ComponentOption`):

```python
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
```

Then, inside the existing `@admin.register(ComponentOption)` `ComponentOptionAdmin` class, add:

```python
    def get_inlines(self, request, obj=None):
        if obj is not None and ComponentCategory.objects.filter(
            depends_on_category=obj.category_id,
        ).exists():
            return [OptionVariantInline]
        return []
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python manage.py test design -v 2` (from `backend/`)
Expected: PASS (all tests including `AdminInlineGatingTest`).

- [ ] **Step 5: Commit**

```bash
git add backend/design/admin.py backend/design/tests.py
git commit -m "feat(design): admin variant inline gated to dependency-target options

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — types, image resolution, and URL rewrite

**Files:**
- Modify: `frontend/components/design/types.ts`
- Create: `frontend/components/design/resolveLayerImage.ts`
- Modify: `frontend/components/design/ProjectionCanvas.tsx`
- Modify: `frontend/app/[lang]/design/page.tsx` (rewrite variant image URLs too)

**Interfaces:**
- Consumes API shape from Task 2: category `depends_on_category`, option `variants: [{depends_on_option, projection_image}]`.
- Produces: `resolveLayerImage(cat, selected, selections): string`.

> No JS test runner exists (Global Constraints). The resolution logic is extracted into a pure module so it is trivially reviewable; verify with `npm run typecheck` and manual browser check.

- [ ] **Step 1: Extend the types**

In `frontend/components/design/types.ts`, add the `OptionVariant` interface and the two new fields:

```ts
export interface OptionVariant {
  depends_on_option: number;
  projection_image: string;
}

export interface ComponentOption {
  id: number;
  name_ar: string;
  name_en: string;
  thumbnail: string;
  projection_image: string;
  sort_order: number;
  variants?: OptionVariant[];
}

export interface ComponentCategory {
  id: number;
  name_ar: string;
  name_en: string;
  layer_order: number;
  is_required: boolean;
  icon: string;
  depends_on_category?: number | null;
  options: ComponentOption[];
}
```

(Keep the existing `export type Selections = Record<number, ComponentOption>;`.)

- [ ] **Step 2: Add the pure resolver**

Create `frontend/components/design/resolveLayerImage.ts`:

```ts
import type { ComponentCategory, ComponentOption, Selections } from './types';

// Resolves the projection image for a layer. For categories that depend on
// another category (e.g. Mirror -> Walls), pick the variant matching the
// currently selected wall option; otherwise fall back to the option's own
// generic projection image.
export function resolveLayerImage(
  cat: ComponentCategory,
  selected: ComponentOption,
  selections: Selections,
): string {
  if (cat.depends_on_category != null) {
    const wall = selections[cat.depends_on_category];
    const variant = selected.variants?.find(v => v.depends_on_option === wall?.id);
    if (variant) return variant.projection_image;
  }
  return selected.projection_image;
}
```

- [ ] **Step 3: Use the resolver in ProjectionCanvas**

In `frontend/components/design/ProjectionCanvas.tsx`, add the import near the top:

```ts
import { resolveLayerImage } from './resolveLayerImage';
```

Then, in the `.map(cat => { ... })` block, replace the `<Image ... src={selected.projection_image} ... />` usage so `src` comes from the resolver. The block becomes:

```tsx
          .map(cat => {
            const selected = selections[cat.id];
            if (!selected) return null;
            const src = resolveLayerImage(cat, selected, selections);
            return (
              <Image
                key={cat.id}
                src={src}
                alt={lang === 'ar' ? selected.name_ar : selected.name_en}
                fill
                className="object-contain"
                style={{ zIndex: cat.layer_order }}
                sizes="320px"
              />
            );
          })}
```

- [ ] **Step 4: Rewrite variant image URLs in the page loader**

In `frontend/app/[lang]/design/page.tsx`, the `fetchCategories` map currently rewrites `thumbnail` and `projection_image`. Extend the inner option map so `variants` image URLs are rewritten too:

```ts
    return list.map(cat => ({
      ...cat,
      options: cat.options.map(opt => ({
        ...opt,
        thumbnail: fixUrl(opt.thumbnail),
        projection_image: fixUrl(opt.projection_image),
        variants: opt.variants?.map(v => ({
          ...v,
          projection_image: fixUrl(v.projection_image),
        })),
      })),
    }));
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` (from `frontend/`)
Expected: PASS, no type errors.

- [ ] **Step 6: Manual verification**

From `frontend/`, run `npm run build` (expect success). Then, with backend running and a Mirror category configured (`depends_on_category` = Walls) plus at least one `OptionVariant`, load `/en/design`: selecting a wall then a mirror position paints the variant image; changing the wall swaps the mirror image; a wall with no variant shows the position's generic image; the exported PDF matches the preview.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/design/types.ts frontend/components/design/resolveLayerImage.ts frontend/components/design/ProjectionCanvas.tsx "frontend/app/[lang]/design/page.tsx"
git commit -m "feat(design): resolve mirror layer image from selected wall variant

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- `depends_on_category` field → Task 1. ✓
- `OptionVariant` model + `unique_together` → Task 1. ✓
- Mirror positions stay normal options with `projection_image` fallback → used in Task 4 resolver. ✓
- Admin inline under wall, gated → Task 3. ✓
- API `depends_on_category` + nested `variants` → Task 2. ✓
- Frontend types + ProjectionCanvas resolution + generic fallback → Task 4. ✓
- URL rewrite for variant images (found during exploration, not in original spec) → Task 4 Step 4. ✓
- Export via html2canvas unchanged (captures same DOM) → verified in Task 4 Step 6. ✓
- Edge cases (no wall / no variant / None) → covered by resolver fallback + manual check. ✓

**Placeholder scan:** No TBD/TODO; all code shown in full. ✓

**Type consistency:** `OptionVariant.{option, depends_on_option, projection_image}` and related names (`variants`, `variant_uses`, `dependent_categories`) are identical across Tasks 1–4. `resolveLayerImage` signature matches its call site. Serializer field names (`depends_on_option`, `projection_image`, `depends_on_category`) match the frontend interfaces. ✓
