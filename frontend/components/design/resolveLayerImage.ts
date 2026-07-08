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
