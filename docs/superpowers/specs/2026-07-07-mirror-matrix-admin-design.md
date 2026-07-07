# Mirror×Wall Matrix Admin & Radio Mirror Selection — Design

**Date:** 2026-07-07
**Status:** Approved

## Background

The Design Studio supports wall-dependent mirrors: the Mirror category points at Walls
via `ComponentCategory.depends_on_category`, and each (mirror option × wall option)
pair stores its own render in an `OptionVariant` row. Every combination is a unique
render produced by a designer (different reflections/lighting per wall), so
per-combination images are the correct model.

The pain is the admin workflow: variants are edited through a free-form inline on each
**wall** option page — rows added manually, mirror picked from a dropdown, no way to see
which combinations are missing. On the frontend, mirrors render in the same thumbnail
grid as other categories, and unavailable mirrors show as disabled buttons.

## Goals

- Admin sees the **full mirror×wall grid in one place** and can upload/replace/delete
  any combination's image from a single page with a single Save.
- Adding a new wall (or mirror type) automatically adds a column (or row) to the grid.
- Frontend presents mirrors as a **radio-button single choice**: a built-in "None"
  first, then only the mirrors that have an image for the currently selected wall.
- Mirrors without an image for the current wall are **hidden** (not disabled).
- Creating a mirror type requires no dummy image uploads.

## Non-Goals (YAGNI)

- No drag-and-drop or AJAX per-cell saving — one classic multipart form is enough.
- No bulk ZIP import of images.
- No changes to PDF export (it captures the rendered canvas and inherits correctness).
- No per-wall tint/recolor system — every combination is a hand-made render.

## Design Decisions (resolved)

1. **Data model unchanged** for variants: `OptionVariant(option, depends_on_option,
   projection_image)` already stores exactly one image per combination.
2. **Matrix page replaces the inline**: `OptionVariantInline` is removed from
   `ComponentOptionAdmin`; the matrix is the single editing surface for variants.
3. **Hide, don't disable**: the frontend radio list omits mirrors that lack a variant
   for the selected wall.
4. **Built-in "None"**: the frontend synthesizes the None choice; no DB "None" option
   is needed (any existing one has no variants, so it is auto-hidden and can be
   deleted by the admin at leisure).
5. **Variants-only rendering** for dependent categories: the canvas never falls back
   to a dependent option's base `projection_image`.
6. **`thumbnail` and `projection_image` become optional** (`blank=True`) on
   `ComponentOption` so mirror types are just name + sort order.

## Backend

### Model change (small)

`ComponentOption.thumbnail` and `ComponentOption.projection_image` gain `blank=True`
(ImageField stores `''`; no `null=True` needed) with help text updated to say the
fields are unused for options in a dependent category (e.g. mirrors). One migration.

### Matrix admin page

Register `OptionVariant` with its own `ModelAdmin` whose `changelist_view` renders a
custom template — so the page appears as a normal entry on the admin index under
Design ("Option variants") and lives at the standard changelist URL. The default
add/change forms are suppressed (`has_add_permission` returns `False`; row-level
change pages are unreachable from the matrix) so the matrix is the only editing
surface.

**Rendering (GET):**

- For every active `ComponentCategory` with `depends_on_category` set (today:
  Mirror → Walls), render one matrix titled "«Dependent» images per «Parent»"
  (e.g. "Mirror images per Walls").
- Rows = the dependent category's **active** options, ordered by `sort_order`.
- Columns = the parent category's **active** options, ordered by `sort_order`.
- Cell contents:
  - Variant exists → thumbnail preview (`projection_image`, ~60px), a file input to
    replace, and a "delete" checkbox.
  - No variant → a file input to create.
- Input names encode the pair: `image__{option_id}__{parent_option_id}` and
  `delete__{option_id}__{parent_option_id}`.
- A single Save button submits the whole page as one multipart POST.
- Small inline JS shows a local preview when a file is picked (nicety only; the page
  is fully functional without JS).
- Template: `backend/templates/admin/design/optionvariant/change_list.html`
  extending `admin/base_site.html`. The table scrolls horizontally if there are many
  walls.

**Save semantics (POST), per cell:**

| Cell state | Delete checked | File chosen | Result |
|---|---|---|---|
| variant exists | yes | (ignored) | variant deleted |
| variant exists | no | yes | image replaced |
| variant exists | no | no | unchanged |
| no variant | — | yes | variant created |
| no variant | — | no | unchanged |

After processing, redirect back to the matrix with a success message summarizing
counts ("3 added, 1 replaced, 2 deleted"). Replaced/deleted image files are removed
from storage best-effort (orphaned files are acceptable if deletion fails).

**Permissions:** the view (GET and POST) requires `design.change_optionvariant`.

**Removal:** `OptionVariantInline` and the `get_inlines` override in
`ComponentOptionAdmin` are deleted.

### API

No changes. `ComponentOptionSerializer` already exposes `variants` with
`depends_on_option` + `projection_image`. `thumbnail`/`projection_image` may now be
empty strings for mirror options; the frontend must guard.

## Frontend

### Radio list for dependent categories

In `DesignStudio.tsx`, when the active tab's category has `depends_on_category != null`,
render a radio list instead of `OptionGrid` (new component, e.g.
`DependentOptionRadioList.tsx`; `OptionGrid` stays untouched for normal categories):

- First item: **"None"** (localized: en "None", ar "بدون") — always present, checked
  when the category has no selection. Selecting it removes the category's selection.
- Then one radio per option that has a variant for the currently selected parent
  option: `option.variants?.some(v => v.depends_on_option === selectedParentId)`.
- Each radio shows the circle + localized name, plus the option's small thumbnail
  when one exists.
- If the parent category has no selection yet, only "None" is listed with a short
  hint ("Select a wall first" / Arabic equivalent).
- Must render correctly in RTL (Arabic) layout like the rest of the studio.

### Selection reset on parent change

The existing auto-reset in `DesignStudio.tsx` simplifies: when the parent selection
changes and the current dependent selection has no variant for the new parent,
**remove the selection** (which is "None"). The old "find a fallback DB option"
logic is deleted.

### Canvas resolution

`resolveLayerImage.ts`: for a category with `depends_on_category != null`, return the
matching variant's `projection_image`, else `undefined` (nothing painted). Never fall
back to the option's base `projection_image` for dependent categories. Non-dependent
categories keep using `projection_image` as today.

### Types

`types.ts`: `thumbnail` and `projection_image` on `ComponentOption` become optional
(`string | null | ''`-tolerant) to match the relaxed backend fields.

## Data Flow

1. Admin opens Design › Option variants → sees the Mirror×Walls grid with previews
   and gaps.
2. Admin picks files in any cells / ticks deletes → one Save → variants created,
   replaced, deleted in bulk.
3. User opens the studio, selects a wall → mirror tab lists "None" + only the
   mirrors that exist for that wall.
4. User picks a mirror → canvas paints that combination's variant image.
5. User switches wall → if the chosen mirror lacks an image there, selection resets
   to "None"; the radio list re-filters.

## Error / Edge Handling

- Wall or mirror option deleted → variants cascade-delete (existing FK behavior);
  the matrix loses the column/row.
- Option deactivated (`is_active=False`) → hidden from the matrix and from the API;
  its variants are preserved for reactivation.
- `depends_on_category` cleared → the pair disappears from the matrix page; the
  category renders as a normal thumbnail-grid layer again.
- Non-image or oversized upload → standard Django form validation error; the matrix
  re-renders with the error and nothing is saved for that request.
- Concurrent admins: last save wins per cell (acceptable for a small team).
- Empty matrix (no dependent categories) → the page explains how to set
  `depends_on_category` on a category.

## Testing

**Backend (`backend/design/tests.py`):**
- GET matrix requires staff + permission; anonymous → redirected/403.
- GET renders one table per dependency pair with correct rows/columns; inactive
  options excluded.
- POST creates a variant from `image__x__y`; replaces on existing; deletes when
  `delete__x__y` checked; delete wins over a simultaneously chosen file.
- Existing model/serializer tests stay green; new test: option with empty
  `thumbnail`/`projection_image` serializes as empty/None without error.

**Frontend (`frontend/components/design/__tests__/`):**
- Radio list shows None + only available mirrors for the selected wall; unavailable
  mirrors absent from the DOM.
- Selecting None clears the selection; canvas paints no mirror layer.
- Wall change with now-unavailable mirror resets selection to None.
- `resolveLayerImage` returns `undefined` for a dependent category without a
  matching variant (no base-image fallback) — update existing tests that assumed
  the fallback.

**Manual:**
- Upload a few combinations in the matrix, verify previews and gaps.
- Studio: switch walls, watch the radio list re-filter and reset.
- Arabic locale: radio list and matrix labels render correctly (RTL).
- PDF export shows the resolved mirror render.
