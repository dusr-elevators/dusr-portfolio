import type { ComponentCategory, ComponentOption, Selections } from './types';

// 1x1 transparent PNG: returned when a dependent category (e.g. mirror) has no
// variant for the currently selected parent option (e.g. wall). This ensures
// no unexpected fallback images break the design composition.
// Using a static asset instead of data: URL for Next.js Image compatibility.
const TRANSPARENT_PNG = '/transparent.png';

/**
 * Resolves the projection image for a layer.
 *
 * For categories that depend on another category (e.g. Mirror -> Walls):
 * - If a wall is selected: returns the variant image if found, otherwise TRANSPARENT_PNG
 * - If no wall is selected: returns the generic projection_image (fallback)
 *
 * For independent categories:
 * - Always returns the generic projection_image
 */
export function resolveLayerImage(
  cat: ComponentCategory,
  selected: ComponentOption,
  selections: Selections,
): string {
  // Independent category: always use generic image
  if (cat.depends_on_category == null) {
    return selected.projection_image;
  }

  // Dependent category: resolve based on parent selection
  const parentOption = selections[cat.depends_on_category];

  // No parent selected: use generic fallback
  if (!parentOption) {
    return selected.projection_image;
  }

  // Parent selected: find matching variant
  const variant = selected.variants?.find(v => v.depends_on_option === parentOption.id);
  if (variant) {
    return variant.projection_image;
  }

  // Variant expected but missing: return transparent instead of generic fallback
  return TRANSPARENT_PNG;
}
