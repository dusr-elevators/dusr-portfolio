export interface OptionVariant {
  depends_on_option: number;
  projection_image: string;
}

export interface ComponentOption {
  id: number;
  name_ar: string;
  name_en: string;
  thumbnail: string;
  projection_image: string;
  sort_order: number;
  variants?: OptionVariant[];
}

export interface ComponentCategory {
  id: number;
  name_ar: string;
  name_en: string;
  layer_order: number;
  is_required: boolean;
  icon: string;
  depends_on_category?: number | null;
  options: ComponentOption[];
}

export type Selections = Record<number, ComponentOption>;
