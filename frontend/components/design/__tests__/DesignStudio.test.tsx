/**
 * Behavior scenarios for DesignStudio's dependent-category (Mirror -> Walls)
 * selection logic (documentation — no test runner is wired up in this
 * project; this file is kept type-checked by `npm run typecheck`).
 *
 * Contract:
 * 1. isOptionAvailable(option, parentId) — copied verbatim from
 *    DesignStudio.tsx:
 *      - no parentId selected              -> false
 *      - option has no variants            -> false
 *      - a variant matches the parent      -> true
 * 2. Dependent-category UX: options WITHOUT a variant for the selected
 *    parent are HIDDEN from the radio list entirely (never rendered
 *    disabled). A built-in "None" radio — not a DB row — is always the
 *    first item (see DependentOptionRadioList.tsx). Selecting it removes
 *    the category from `selections` (handleDependentSelect(null)).
 * 3. Reset contract: when the parent selection changes and the current
 *    dependent selection has no variant for the new parent, that
 *    selection is REMOVED from `selections` — the same outcome as
 *    picking "None". There is no DB-row fallback hunting.
 */

import type { ComponentCategory, ComponentOption, Selections } from '../types';

/** Copied verbatim from DesignStudio.tsx. */
function isOptionAvailable(
  option: ComponentOption,
  currentParentOptionId: number | undefined
): boolean {
  if (!currentParentOptionId) return false;
  if (!option.variants) return false;
  return option.variants.some(v => v.depends_on_option === currentParentOptionId);
}

/** Mirrors the reset loop inside DesignStudio.handleSelect(). */
function applyParentChangeReset(
  selections: Selections,
  changedCategoryId: number,
  newParentOption: ComponentOption,
  categories: ComponentCategory[]
): Selections {
  let next: Selections = { ...selections, [changedCategoryId]: newParentOption };
  for (const depCategory of categories) {
    if (depCategory.depends_on_category === changedCategoryId && next[depCategory.id]) {
      if (!isOptionAvailable(next[depCategory.id], newParentOption.id)) {
        const { [depCategory.id]: _removed, ...cleaned } = next;
        next = cleaned;
      }
    }
  }
  return next;
}

/** Mirrors DesignStudio.handleDependentSelect(). */
function applyDependentSelect(
  selections: Selections,
  activeTab: number,
  option: ComponentOption | null
): Selections {
  if (option) {
    return { ...selections, [activeTab]: option };
  }
  const { [activeTab]: _removed, ...next } = selections;
  return next;
}

const marbleWall: ComponentOption = {
  id: 10, name_ar: 'رخام', name_en: 'Marble',
  icon: '',
  thumbnail: '/img/marble-t.png', projection_image: '/img/marble.png', sort_order: 1,
};

const woodWall: ComponentOption = {
  id: 11, name_ar: 'خشب', name_en: 'Wood',
  icon: '',
  thumbnail: '/img/wood-t.png', projection_image: '/img/wood.png', sort_order: 2,
};

// Only available for marble (10).
const topMirror: ComponentOption = {
  id: 20, name_ar: 'مرآة علوية', name_en: 'Top Mirror',
  icon: 'ArrowUp',
  thumbnail: '/img/top-mirror.png', projection_image: null, sort_order: 1,
  variants: [{ depends_on_option: 10, projection_image: '/img/top-on-marble.png' }],
};

// Available for both marble (10) and wood (11).
const sideMirror: ComponentOption = {
  id: 21, name_ar: 'مرآة جانبية', name_en: 'Side Mirror',
  icon: '',
  thumbnail: '/img/side-mirror.png', projection_image: null, sort_order: 2,
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

const scenarios: { name: string; actual: boolean; expected: boolean }[] = [
  {
    name: 'isOptionAvailable is true when a variant matches the parent',
    actual: isOptionAvailable(topMirror, 10),
    expected: true,
  },
  {
    name: 'isOptionAvailable is false when no parent is selected',
    actual: isOptionAvailable(topMirror, undefined),
    expected: false,
  },
  {
    name: 'dependent list HIDES (not disables) options with no variant for the selected parent',
    // Same filter DesignStudio.tsx applies before handing options to
    // DependentOptionRadioList: topMirror has no variant for wood (11),
    // so it must be absent from the available list, not present-but-disabled.
    actual: mirrorCategory.options
      .filter(o => isOptionAvailable(o, woodWall.id))
      .map(o => o.id)
      .includes(topMirror.id),
    expected: false,
  },
  {
    name: 'changing the parent removes a dependent selection with no variant for the new parent (no DB fallback)',
    actual: (() => {
      const initial: Selections = { 1: marbleWall, 2: topMirror };
      const result = applyParentChangeReset(initial, 1, woodWall, categories);
      return 2 in result;
    })(),
    expected: false,
  },
  {
    name: 'selecting the built-in "None" removes the category from selections entirely',
    actual: (() => {
      const initial: Selections = { 1: marbleWall, 2: topMirror };
      const result = applyDependentSelect(initial, 2, null);
      return 2 in result;
    })(),
    expected: false,
  },
];

export const allScenariosPass = scenarios.every(s => s.actual === s.expected);
