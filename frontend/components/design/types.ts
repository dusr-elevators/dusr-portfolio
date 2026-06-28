export interface ComponentOption {
  id: number;
  name_ar: string;
  name_en: string;
  thumbnail: string;
  projection_image: string;
  sort_order: number;
}

export interface ComponentCategory {
  id: number;
  name_ar: string;
  name_en: string;
  layer_order: number;
  is_required: boolean;
  icon: string;
  options: ComponentOption[];
}

export type Selections = Record<number, ComponentOption>;
