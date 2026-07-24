/**
 * Pure selection rules for the design studio, extracted from DesignStudio.tsx so
 * they can be tested without pulling a 'use client' component (and next/navigation)
 * into the test environment. Same split as resolveLayerImage.ts.
 */

import type { ComponentCategory, ComponentOption, Selections } from './types';

/**
 * Checks if a component option is available for the currently selected parent option.
 * Returns true if the option has a variant matching the current parent, false otherwise.
 */
export function isOptionAvailable(
  option: ComponentOption,
  currentParentOptionId: number | undefined
): boolean {
  if (!currentParentOptionId) return false;
  if (!option.variants) return false;
  return option.variants.some(v => v.depends_on_option === currentParentOptionId);
}

/**
 * Fills in `is_default_selected` options for any category the user hasn't chosen yet.
 * Walks categories in layer order so a parent is resolved before its dependents.
 */
export function applyDefaultSelections(
  categories: ComponentCategory[],
  initial: Selections
): Selections {
  const next = { ...initial };

  for (const cat of [...categories].sort((a, b) => a.layer_order - b.layer_order)) {
    if (next[cat.id]) continue;

    const defaultOption = cat.options.find(option => option.is_default_selected);
    if (!defaultOption) continue;

    if (cat.depends_on_category != null) {
      const parent = next[cat.depends_on_category];
      if (!parent || !isOptionAvailable(defaultOption, parent.id)) continue;
    }

    next[cat.id] = defaultOption;
  }

  return next;
}

/**
 * Drops dependent selections whose variant doesn't exist for the currently selected
 * parent. Used on mount, where selections restored from the URL may be inconsistent.
 */
export function pruneOrphanedDependents(
  categories: ComponentCategory[],
  selections: Selections
): Selections {
  const next = { ...selections };

  for (const cat of categories) {
    if (cat.depends_on_category != null && next[cat.id]) {
      const parent = next[cat.depends_on_category];
      if (!parent || !isOptionAvailable(next[cat.id], parent.id)) {
        delete next[cat.id];
      }
    }
  }

  return next;
}

/**
 * Applies a user's click on `option` within `activeCategoryId`.
 *
 * Selecting the already-selected option removes it, which is the implicit "None"
 * state. Any direct dependent of the changed category whose variant no longer
 * exists for the new parent is removed too — there is no DB-row fallback hunting.
 */
export function applySelection(
  categories: ComponentCategory[],
  selections: Selections,
  activeCategoryId: number,
  option: ComponentOption
): Selections {
  const next = { ...selections };

  if (next[activeCategoryId]?.id === option.id) {
    delete next[activeCategoryId];
  } else {
    next[activeCategoryId] = option;
  }

  for (const depCategory of categories) {
    if (depCategory.depends_on_category === activeCategoryId && next[depCategory.id]) {
      const parent = next[activeCategoryId];
      if (!parent || !isOptionAvailable(next[depCategory.id], parent.id)) {
        delete next[depCategory.id];
      }
    }
  }

  return next;
}
