export type CategoryKind = 'visual' | 'sound';

export type DeliveryMode = 'form_email_download' | 'form_email_only' | 'free_download';

export interface LeadDetails {
  full_name: string;
  email: string;
  mobile: string;
}

export interface OptionVariant {
  depends_on_option: number;
  projection_image: string;
}

export interface ComponentOption {
  id: number;
  name_ar: string;
  name_en: string;
  thumbnail: string | null;
  projection_image: string | null;
  sound_file: string | null;
  is_default_selected: boolean;
  sort_order: number;
  variants?: OptionVariant[];
}

export interface ComponentCategory {
  id: number;
  name_ar: string;
  name_en: string;
  kind: CategoryKind;
  layer_order: number;
  is_required: boolean;
  icon: string;
  depends_on_category?: number | null;
  options: ComponentOption[];
}

export type Selections = Record<number, ComponentOption>;
