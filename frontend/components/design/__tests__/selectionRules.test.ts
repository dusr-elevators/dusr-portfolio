/**
 * Selection rules for dependent categories (Mirror -> Walls), as used by
 * DesignStudio.tsx. These import the real implementation from selectionRules.ts;
 * an earlier version of this file re-declared the logic locally, which meant it
 * could pass while the component itself was broken.
 *
 * Contract:
 * 1. isOptionAvailable(option, parentId):
 *      - no parentId selected         -> false
 *      - option has no variants       -> false
 *      - a variant matches the parent -> true
 * 2. Dependent-category UX: options WITHOUT a variant for the selected parent are
 *    HIDDEN from the option list entirely (never rendered disabled). Selecting the
 *    currently selected option again removes the category from `selections`, which
 *    is the implicit "None" state.
 * 3. Reset contract: when the parent selection changes and the current dependent
 *    selection has no variant for the new parent, that selection is REMOVED. There
 *    is no DB-row fallback hunting.
 */

import { describe, expect, it } from 'vitest';
import {
  applyDefaultSelections,
  applySelection,
  isOptionAvailable,
  pruneOrphanedDependents,
} from '../selectionRules';
import type { ComponentCategory, ComponentOption, Selections } from '../types';

const marbleWall: ComponentOption = {
  id: 10, name_ar: 'رخام', name_en: 'Marble',
  thumbnail: '/img/marble-t.png', projection_image: '/img/marble.png',
  is_default_selected: true, sort_order: 1,
};

const woodWall: ComponentOption = {
  id: 11, name_ar: 'خشب', name_en: 'Wood',
  thumbnail: '/img/wood-t.png', projection_image: '/img/wood.png',
  is_default_selected: false, sort_order: 2,
};

// Only available for marble (10).
const topMirror: ComponentOption = {
  id: 20, name_ar: 'مرآة علوية', name_en: 'Top Mirror',
  thumbnail: '/img/top-mirror.png', projection_image: null,
  is_default_selected: false, sort_order: 1,
  variants: [{ depends_on_option: 10, projection_image: '/img/top-on-marble.png' }],
};

// Available for both marble (10) and wood (11).
const sideMirror: ComponentOption = {
  id: 21, name_ar: 'مرآة جانبية', name_en: 'Side Mirror',
  thumbnail: '/img/side-mirror.png', projection_image: null,
  is_default_selected: false, sort_order: 2,
  variants: [
    { depends_on_option: 10, projection_image: '/img/side-on-marble.png' },
    { depends_on_option: 11, projection_image: '/img/side-on-wood.png' },
  ],
};

const wallsCategory: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null,
  options: [marbleWall, woodWall],
};

const mirrorCategory: ComponentCategory = {
  id: 2, name_ar: 'المرايا', name_en: 'Mirrors', layer_order: 2,
  is_required: false, icon: 'Square', depends_on_category: 1,
  options: [topMirror, sideMirror],
};

const categories: ComponentCategory[] = [wallsCategory, mirrorCategory];

describe('isOptionAvailable', () => {
  it('is true when a variant matches the parent', () => {
    expect(isOptionAvailable(topMirror, 10)).toBe(true);
  });

  it('is false when no parent is selected', () => {
    expect(isOptionAvailable(topMirror, undefined)).toBe(false);
  });

  it('is false when the option has no variants at all', () => {
    expect(isOptionAvailable(marbleWall, 10)).toBe(false);
  });

  it('is false when no variant matches the given parent', () => {
    expect(isOptionAvailable(topMirror, 11)).toBe(false);
  });
});

describe('dependent option list', () => {
  it('hides (does not disable) options with no variant for the selected parent', () => {
    const available = mirrorCategory.options
      .filter(o => isOptionAvailable(o, woodWall.id))
      .map(o => o.id);

    expect(available).not.toContain(topMirror.id);
    expect(available).toContain(sideMirror.id);
  });
});

describe('applySelection', () => {
  it('removes a dependent selection with no variant for the new parent', () => {
    const initial: Selections = { 1: marbleWall, 2: topMirror };
    const result = applySelection(categories, initial, 1, woodWall);

    expect(result[1]).toBe(woodWall);
    expect(result).not.toHaveProperty('2');
  });

  it('keeps a dependent selection that still has a variant for the new parent', () => {
    const initial: Selections = { 1: marbleWall, 2: sideMirror };
    const result = applySelection(categories, initial, 1, woodWall);

    expect(result[1]).toBe(woodWall);
    expect(result[2]).toBe(sideMirror);
  });

  it('removes the option when the already-selected one is chosen again ("None")', () => {
    const initial: Selections = { 1: marbleWall, 2: topMirror };
    const result = applySelection(categories, initial, 2, topMirror);

    expect(result).not.toHaveProperty('2');
    expect(result[1]).toBe(marbleWall);
  });

  it('drops dependents when the parent itself is deselected', () => {
    const initial: Selections = { 1: marbleWall, 2: sideMirror };
    const result = applySelection(categories, initial, 1, marbleWall);

    expect(result).not.toHaveProperty('1');
    expect(result).not.toHaveProperty('2');
  });

  it('does not mutate the selections it was given', () => {
    const initial: Selections = { 1: marbleWall, 2: topMirror };
    applySelection(categories, initial, 1, woodWall);

    expect(initial[1]).toBe(marbleWall);
    expect(initial[2]).toBe(topMirror);
  });
});

describe('applyDefaultSelections', () => {
  it('selects a default option for a category the user has not chosen', () => {
    expect(applyDefaultSelections(categories, {})[1]).toBe(marbleWall);
  });

  it('leaves an existing user choice alone', () => {
    expect(applyDefaultSelections(categories, { 1: woodWall })[1]).toBe(woodWall);
  });

  it('skips a dependent default that has no variant for the resolved parent', () => {
    const defaultTopMirror: ComponentOption = { ...topMirror, is_default_selected: true };
    const cats: ComponentCategory[] = [
      wallsCategory,
      { ...mirrorCategory, options: [defaultTopMirror, sideMirror] },
    ];

    // Walls resolves to wood, for which topMirror has no variant.
    expect(applyDefaultSelections(cats, { 1: woodWall })).not.toHaveProperty('2');
  });
});

describe('pruneOrphanedDependents', () => {
  it('drops a dependent selection inconsistent with its parent', () => {
    const restored: Selections = { 1: woodWall, 2: topMirror };
    expect(pruneOrphanedDependents(categories, restored)).not.toHaveProperty('2');
  });

  it('drops a dependent selection when its parent is missing entirely', () => {
    const restored: Selections = { 2: topMirror };
    expect(pruneOrphanedDependents(categories, restored)).not.toHaveProperty('2');
  });

  it('keeps a consistent pair', () => {
    const restored: Selections = { 1: marbleWall, 2: topMirror };
    const result = pruneOrphanedDependents(categories, restored);

    expect(result[1]).toBe(marbleWall);
    expect(result[2]).toBe(topMirror);
  });
});
