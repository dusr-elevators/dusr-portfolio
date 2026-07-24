/**
 * Contract:
 * 1. Independent category  -> option's own projection_image (null when empty).
 * 2. Dependent category    -> ONLY variant images are painted:
 *    - variant exists for the selected parent -> variant.projection_image
 *    - no parent selected                     -> null (paint nothing)
 *    - no variant for the selected parent     -> null (paint nothing)
 */

import { describe, expect, it } from 'vitest';
import { resolveLayerImage } from '../resolveLayerImage';
import type { ComponentCategory, ComponentOption } from '../types';

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
  thumbnail: '/img/marble-t.png', projection_image: '/img/marble.png',
  is_default_selected: true, sort_order: 1,
};

const topMirror: ComponentOption = {
  id: 20, name_ar: 'مرآة علوية', name_en: 'Top Mirror',
  thumbnail: null, projection_image: null,
  is_default_selected: false, sort_order: 1,
  variants: [{ depends_on_option: 10, projection_image: '/img/top-on-marble.png' }],
};

describe('resolveLayerImage', () => {
  it('paints an independent category\'s own image', () => {
    expect(resolveLayerImage(wallsCategory, marbleWall, { 1: marbleWall }))
      .toBe('/img/marble.png');
  });

  it('paints nothing for an independent option with no projection image', () => {
    const noImage: ComponentOption = { ...marbleWall, projection_image: null };
    expect(resolveLayerImage(wallsCategory, noImage, { 1: noImage })).toBeNull();
  });

  it('paints the variant matching the selected parent', () => {
    expect(resolveLayerImage(mirrorCategory, topMirror, { 1: marbleWall, 2: topMirror }))
      .toBe('/img/top-on-marble.png');
  });

  it('paints nothing when no parent is selected', () => {
    expect(resolveLayerImage(mirrorCategory, topMirror, { 2: topMirror })).toBeNull();
  });

  it('paints nothing when no variant exists for the selected parent', () => {
    const noVariants: ComponentOption = { ...topMirror, variants: [] };
    expect(resolveLayerImage(mirrorCategory, noVariants, { 1: marbleWall, 2: topMirror }))
      .toBeNull();
  });
});
