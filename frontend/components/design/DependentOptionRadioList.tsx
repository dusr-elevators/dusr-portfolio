'use client';

import Image from 'next/image';
import type { ComponentOption } from './types';
import type { Lang } from '@/lib/lang';

interface DependentOptionRadioListProps {
  /** Only the options available for the currently selected parent option. */
  options: ComponentOption[];
  selectedId: number | null;
  /** null = the built-in "None" choice. */
  onSelect: (option: ComponentOption | null) => void;
  lang: Lang;
  parentName: string;
  parentSelected: boolean;
  /** Accessible name for the radiogroup, e.g. the active category's localized name. */
  label?: string;
}

export default function DependentOptionRadioList({
  options,
  selectedId,
  onSelect,
  lang,
  parentName,
  parentSelected,
  label,
}: DependentOptionRadioListProps) {
  const itemClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
      active
        ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30'
        : 'border-[#2a2a2a] hover:border-[#444748]'
    }`;

  return (
    <div
      className="flex flex-col gap-2"
      role="radiogroup"
      aria-label={label}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <label className={itemClass(selectedId == null)}>
        <input
          type="radio"
          name="dependent-option"
          checked={selectedId == null}
          onChange={() => onSelect(null)}
          className="accent-[#FF5722]"
        />
        <span className="text-sm text-[#e5e2e1]">{lang === 'ar' ? 'بدون' : 'None'}</span>
      </label>

      {!parentSelected && parentName && (
        <p className="text-[#888] text-sm py-2">
          {lang === 'ar' ? `اختر ${parentName} أولاً` : `Select ${parentName} first`}
        </p>
      )}

      {options.map(option => {
        const name = lang === 'ar' ? option.name_ar : option.name_en;
        return (
          <label key={option.id} className={itemClass(option.id === selectedId)}>
            <input
              type="radio"
              name="dependent-option"
              checked={option.id === selectedId}
              onChange={() => onSelect(option)}
              className="accent-[#FF5722]"
            />
            {option.thumbnail && (
              <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                <Image src={option.thumbnail} alt={name} fill className="object-cover" sizes="40px" />
              </span>
            )}
            <span className="text-sm text-[#e5e2e1]">{name}</span>
          </label>
        );
      })}
    </div>
  );
}
