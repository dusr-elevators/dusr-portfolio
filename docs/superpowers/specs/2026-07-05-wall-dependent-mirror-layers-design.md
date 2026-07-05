# Wall-Dependent Mirror Layers — Design

**Date:** 2026-07-05
**Status:** Approved (pending spec review)

## Background

The elevator cabin designer (`DesignStudio`) renders a preview by stacking
transparent PNG layers, one per `ComponentCategory`, ordered by `layer_order`
(z-index). Each category exposes a set of `ComponentOption`s; the user picks one
per category and the selected option's `projection_image` paints as that layer.

We want to add a **Mirror** feature. Reference implementation
(atlaslifts-sa.com/design-your-own-cabin) uses no reflection math or CSS
flipping — it pre-renders a matrix of mirror PNGs keyed by `(mirror position ×
wall material)` and toggles the matching one into the layer stack. The mirror
graphic changes with the selected wall so it appears to reflect that finish.

This spec adopts the same "matrix of pre-rendered PNGs" approach (Option B /
full fidelity), built as a **generic wall-dependency mechanism** rather than a
mirror-specific hack.

## Goals

- Add a Mirror category whose options are positions: Top, Mid, Bottom,
  Wide-cut, None.
- The painted mirror image depends on the currently selected wall option.
- Robust when data is incomplete: fall back to a generic per-position image
  when no wall is selected or no variant exists for the selected wall.
- Manage the per-wall images in Django admin from the wall option's edit page.

## Non-Goals (YAGNI)

- No CSS flipping / `scaleX(-1)` / canvas reflection math.
- No per-wall thumbnails in the option grid (positions show one generic thumb).
- No special-casing of "None" — it is a normal option with a
  transparent/empty projection image.
- No unrelated refactoring of the existing design app.

## Design Decisions (resolved)

1. **Fidelity:** Option B — mirror reflects the selected wall (per-wall matrix).
2. **Dependency strictness:** *Generic fallback.* Mirror always works; if no
   variant matches the selected wall (or no wall is selected), show the
   position's generic image.
3. **Admin workflow:** *Inline under wall.* Each wall option's edit page lists
   the mirror-position images for that wall.

## Data Model

### a) `ComponentCategory.depends_on_category`

Add a nullable self-referential FK:

```python
depends_on_category = models.ForeignKey(
    'self', null=True, blank=True, on_delete=models.SET_NULL,
    related_name='dependent_categories',
    help_text='If set, this category\'s layer image is resolved against the '
              'selected option of the target category (e.g. Mirror depends on Walls).',
)
```

On the Mirror category this points to the Walls/Sides category. Its presence is
the sole signal that a category is "wall-dependent." The mechanism is generic
and not named after mirrors.

### b) New model `OptionVariant`

```python
class OptionVariant(models.Model):
    option = models.ForeignKey(
        ComponentOption, on_delete=models.CASCADE, related_name='variants',
    )  # the dependent-category option, e.g. "Top mirror"
    depends_on_option = models.ForeignKey(
        ComponentOption, on_delete=models.CASCADE, related_name='variant_uses',
    )  # the wall option this image is for, e.g. "Marble"
    projection_image = models.ImageField(upload_to=design_projection_path)

    class Meta:
        unique_together = ('option', 'depends_on_option')
```

One row = "position X painted on wall Y." All `projection_image`s must share the
same canvas dimensions as the rest of the design assets.

### c) Mirror positions are normal `ComponentOption`s

Mirror positions live in the Mirror category as ordinary options:
- `thumbnail` — feeds the option grid (one generic thumb per position).
- `projection_image` — repurposed as the **generic fallback** image, painted
  when no wall is selected or no matching `OptionVariant` exists.

## Admin

`OptionVariant` is registered as a `TabularInline` whose parent is the **wall
option** (via `depends_on_option`). Fields per row: mirror-position option
(dropdown, limited to options of dependent categories) + `projection_image` +
preview.

The inline is gated so it only appears when editing an option whose category is
targeted by some `depends_on_category` — i.e.
`ComponentCategory.objects.filter(depends_on_category=obj.category).exists()`.
This keeps it off ceilings/floors/etc. Implemented via
`get_inline_instances`/`get_inlines` on `ComponentOptionAdmin`.

## API

`backend/design/api/serializers.py`:

- `ComponentCategorySerializer.fields` += `depends_on_category` (id or null).
- `ComponentOptionSerializer` gains a nested `variants` field:
  ```python
  class OptionVariantSerializer(serializers.ModelSerializer):
      class Meta:
          model = OptionVariant
          fields = ['depends_on_option', 'projection_image']
  ```
  Serialized as `variants: [{ depends_on_option, projection_image }]`. Empty for
  non-dependent options; no separate endpoint needed.

## Frontend

### types.ts

```ts
export interface OptionVariant {
  depends_on_option: number;
  projection_image: string;
}
export interface ComponentOption {
  // ...existing
  variants?: OptionVariant[];
}
export interface ComponentCategory {
  // ...existing
  depends_on_category?: number | null;
}
```

### ProjectionCanvas.tsx (only logic change)

When rendering a category that has `depends_on_category`, resolve the layer's
`src`:

```ts
let src = selected.projection_image; // generic fallback
if (cat.depends_on_category != null) {
  const wall = selections[cat.depends_on_category];
  const variant = selected.variants?.find(v => v.depends_on_option === wall?.id);
  if (variant) src = variant.projection_image;
}
```

Everything else is unchanged: z-index via `layer_order`, single-select per tab,
URL sync in `DesignStudio` (stores position option id), and `ExportButton`
(html2canvas → jsPDF) all work automatically because export captures the same
`ProjectionCanvas` DOM.

## Data Flow

1. User selects a wall option → `selections[wallsCatId]` updates.
2. User selects a mirror position → `selections[mirrorCatId]` updates.
3. `ProjectionCanvas` renders the mirror layer: reads the selected wall,
   finds the matching `OptionVariant`, paints its image; otherwise paints the
   position's generic `projection_image`.
4. Changing the wall re-renders and swaps the mirror image automatically
   (React re-render replaces Atlas's imperative `switching_mirrors()`).

## Error / Edge Handling

- No wall selected → generic fallback image.
- Wall selected but no variant for it → generic fallback image.
- "None" position selected → transparent/empty projection → effectively no
  mirror layer.
- `depends_on_category` deleted → `SET_NULL`; category degrades to a plain
  layered category using `projection_image`.

## Footprint Summary

1 new model, 1 new field, 1 migration, ~2 serializer additions, 1 admin inline
(+ gating), ~6 lines in `ProjectionCanvas`, small `types.ts` additions.

## Testing

- **Backend:** model creation + `unique_together`; serializer emits
  `variants` and `depends_on_category`; admin inline visibility gating (shown
  for wall options, hidden for others).
- **Frontend:** `ProjectionCanvas` image resolution — variant match, no-wall
  fallback, no-variant fallback, non-dependent category unaffected.
- **Manual:** create Mirror category → depends_on Walls; add variants under a
  wall; verify preview swaps mirror image on wall change and PDF export
  captures the resolved image.
