/**
 * Behavior scenarios for resolveLayerImage (documentation — no test runner is
 * wired up in this project; this file is kept type-checked by `npm run typecheck`).
 *
 * Contract:
 * 1. Independent category  -> option's own projection_image (null when empty).
 * 2. Dependent category    -> ONLY variant images are painted:
 *    - variant exists for the selected parent -> variant.projection_image
 *    - no parent selected                     -> null (paint nothing)
 *    - no variant for the selected parent     -> null (paint nothing)
 */

import { resolveLayerImage } from '../resolveLayerImage';
import type { ComponentCategory, ComponentOption, Selections } from '../types';

const wallsCategory: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null, options: [],
};

const mirrorCategory: ComponentCategory = {
  id: 2, name_ar: 'المرايا', name_en: 'Mirrors', layer_order: 2,
  is_required: false, icon: 'Square', depends_on_category: 1, options: [],
};

const marbleWall: ComponentOption = {
  id: 10, name_ar: 'رخام', name_en: 'Marble',
  icon: '',
  thumbnail: '/img/marble-t.png', projection_image: '/img/marble.png', sort_order: 1,
};

const topMirror: ComponentOption = {
  id: 20, name_ar: 'مرآة علوية', name_en: 'Top Mirror',
  icon: 'ArrowUp',
  thumbnail: null, projection_image: null, sort_order: 1,
  variants: [{ depends_on_option: 10, projection_image: '/img/top-on-marble.png' }],
};

const scenarios: { name: string; actual: string | null; expected: string | null }[] = [
  {
    name: 'independent category paints its own image',
    actual: resolveLayerImage(wallsCategory, marbleWall, { 1: marbleWall }),
    expected: '/img/marble.png',
  },
  {
    name: 'dependent category paints the matching variant',
    actual: resolveLayerImage(mirrorCategory, topMirror, { 1: marbleWall, 2: topMirror }),
    expected: '/img/top-on-marble.png',
  },
  {
    name: 'dependent category with no parent selected paints nothing',
    actual: resolveLayerImage(mirrorCategory, topMirror, { 2: topMirror }),
    expected: null,
  },
  {
    name: 'dependent category with no variant for the parent paints nothing',
    actual: resolveLayerImage(
      mirrorCategory,
      { ...topMirror, variants: [] },
      { 1: marbleWall, 2: topMirror },
    ),
    expected: null,
  },
];

export const allScenariosPass = scenarios.every(s => s.actual === s.expected);
