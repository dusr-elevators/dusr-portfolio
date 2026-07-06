# Admin-Flexible Mirror Options — Design

**Date:** 2026-07-06
**Status:** Approved

## Background

The elevator cabin designer currently supports wall-dependent mirrors: a Mirror category with wall-specific variant images. The Mirror category is pre-defined with 4 fixed positions (Top, Mid, Bottom, Wide-cut, None).

This spec extends the feature to allow **admin-defined unlimited mirror options** per wall, with strict availability — users see only mirrors that exist for the selected wall.

## Goals

- Admin can create unlimited mirror options (not locked to 4 fixed positions)
- Admin uploads mirror images selectively per wall — only for mirrors they want on that wall
- User interface shows all mirrors but disables those unavailable for the current wall
- No fallback images: if a mirror lacks a variant for the current wall, paint nothing
- If user's selected mirror becomes unavailable (wall changed), auto-reset selection to "None"

## Non-Goals (YAGNI)

- No UI for reordering mirror options (use Django admin's `display_order` field)
- No bulk upload tools (admin adds variants one-by-one via inline form)
- No mirror "presets" or templates for walls

## Design Decisions (resolved)

1. **Admin flexibility:** Unlimited mirror options, not fixed to 4
2. **Availability filtering:** Show all mirrors, disable unavailable ones
3. **No fallback:** Missing variant = transparent layer, not generic image
4. **Auto-reset:** Selection resets to "None" if mirror becomes unavailable on wall change

## Data Model

**No changes to existing models.** The current implementation already supports this:

- `ComponentCategory.depends_on_category` — Mirror category points to Walls category
- `OptionVariant` — one row per (mirror option × wall option) pair
- Mirror category has unlimited `ComponentOption`s (Top, Mid, Bottom, Wide-cut, custom, None, etc.)

Admin controls availability by adding/removing `OptionVariant` rows in the wall option's inline form.

## Admin Workflow

When editing a wall option (e.g., "Marble"):

1. Django admin displays `OptionVariantInline` (tabular form)
2. Rows are one per Mirror category option, ordered by `display_order`
3. Fields per row: Mirror option (label) + `projection_image` upload + preview
4. Admin uploads images for mirrors they want on this wall
5. Empty rows are skipped (no variant created)
6. Save the wall option — variants are created/updated/deleted as needed

The inline is gated to only appear for options whose category is targeted by `depends_on_category` (walls, not ceilings/floors/etc).

## Frontend

### types.ts

No changes — types already support unlimited options:

```ts
export interface OptionVariant {
  depends_on_option: number;
  projection_image: string;
}
export interface ComponentOption {
  variants?: OptionVariant[];
}
export interface ComponentCategory {
  depends_on_category?: number | null;
}
```

### DesignStudio Tab Rendering

When rendering mirror options in the selection tab:

```ts
const mirrorCategory = categories.find(c => c.id === mirrorCatId);
const currentWallId = selections[wallsCatId]?.id;

mirrorCategory.options.map(option => {
  const isAvailable = option.variants?.some(v => v.depends_on_option === currentWallId);
  return (
    <button
      key={option.id}
      onClick={() => selectMirror(option.id)}
      disabled={!isAvailable}
      className={isAvailable ? 'enabled' : 'disabled'}
    >
      {option.name}
    </button>
  );
});
```

### Selection Reset on Wall Change

When user changes wall:

```ts
const handleWallChange = (newWallId: number) => {
  selections[wallsCatId] = newWallId;
  
  // Check if current mirror selection is available for this wall
  const currentMirror = selections[mirrorCatId];
  if (currentMirror) {
    const mirrorOption = getMirrorOption(currentMirror);
    const isAvailable = mirrorOption.variants?.some(v => v.depends_on_option === newWallId);
    if (!isAvailable) {
      selections[mirrorCatId] = getNoneOption().id; // reset to None
    }
  }
  
  rerenderCanvas();
};
```

### ProjectionCanvas Resolution

Existing resolver logic, unchanged:

```ts
let src = selected.projection_image; // generic fallback
if (cat.depends_on_category != null) {
  const wall = selections[cat.depends_on_category];
  const variant = selected.variants?.find(v => v.depends_on_option === wall?.id);
  if (variant) src = variant.projection_image;
}
```

**But now:** if `variant` is not found and the mirror should have one (i.e., a variant was expected but missing), paint transparent instead of falling back to `selected.projection_image`.

**Implementation detail:** Mark `OptionVariant` lookups: if mirror depends on wall AND no variant found for current wall, render empty/transparent layer.

```ts
let src = selected.projection_image;
if (cat.depends_on_category != null) {
  const wall = selections[cat.depends_on_category];
  const variant = selected.variants?.find(v => v.depends_on_option === wall?.id);
  if (variant) {
    src = variant.projection_image;
  } else if (wall) {
    // Variant expected but missing — render transparent instead of fallback
    src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // transparent 1x1 PNG
  }
}
```

## Data Flow

1. Admin edits wall option → uploads images for selected mirrors via inline form
2. `OptionVariant` rows are created/updated for each uploaded image
3. User selects wall → UI disables mirrors unavailable for that wall; if selected mirror becomes unavailable, reset to "None"
4. User selects mirror → `ProjectionCanvas` resolves image: variant found → paint it; variant missing → paint transparent
5. Changing wall re-renders, disables/enables options, auto-resets selection if needed

## Error / Edge Handling

- Admin uploads image for mirror X on wall Y → variant created
- Admin removes image (empty row) → variant deleted
- User picks mirror X, switches to wall without mirror X variant → selection resets to "None"
- Mirror selected but no variant for current wall → transparent layer rendered
- "None" option always exists with transparent image
- `depends_on_category` deleted → category degrades to plain layered, no filtering
- Wall option deleted → variants cascade-delete

## Footprint Summary

**Backend:** No new models or fields. `OptionVariantInline` already exists.

**Frontend:**
- ~10 lines in tab rendering (disable unavailable options)
- ~8 lines in wall-change handler (reset selection if needed)
- ~4 lines in canvas resolver (transparent instead of fallback)

## Testing

**Backend:**
- Existing tests remain valid (variants work for any options)
- Verify cascade deletion when wall option deleted
- Verify admin inline displays correct options

**Frontend:**
- Verify option is disabled when no variant for current wall
- Verify selection resets to "None" when wall changes and mirror unavailable
- Verify transparent layer renders when variant missing
- Verify resolver falls back to generic only for non-dependent categories
- Verify PDF export captures resolved image (transparent or variant)

**Manual:**
- Create wall without certain mirrors
- Verify those mirrors are disabled in UI
- Pick an enabled mirror, switch walls
- Verify selection resets appropriately
- Verify preview shows correct mirror image or transparent
