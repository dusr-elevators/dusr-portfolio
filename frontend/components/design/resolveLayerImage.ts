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
