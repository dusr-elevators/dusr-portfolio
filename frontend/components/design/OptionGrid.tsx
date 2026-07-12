'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import type { ComponentOption } from './types';
import type { Lang } from '@/lib/lang';

interface OptionGridProps {
  options: ComponentOption[];
  selectedId: number | null;
  onSelect: (option: ComponentOption) => void;
  lang: Lang;
}

export default function OptionGrid({ options, selectedId, onSelect, lang }: OptionGridProps) {
  if (options.length === 0) {
    return (
      <p className="text-center text-[#888] py-12 text-sm">
        {lang === 'ar' ? 'لا توجد خيارات متاحة لهذا المكون' : 'No options available for this component'}
      </p>
    );
  }

  return (
    <div
      className="flex w-full max-w-full flex-nowrap gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 md:grid-cols-4"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {options.map(option => {
        const isSelected = option.id === selectedId;
        const name = lang === 'ar' ? option.name_ar : option.name_en;
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            className={`relative w-[42vw] max-w-[164px] shrink-0 rounded-xl overflow-hidden border-2 transition-all group cursor-pointer sm:w-auto sm:max-w-none ${
              isSelected
                ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30'
                : 'border-[#2a2a2a] hover:border-[#444748]'
            }`}
          >
            <div className="aspect-square bg-[#1a1a1a] relative">
              {option.thumbnail && (
                <Image
                  src={option.thumbnail}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              )}
            </div>
            <div className="px-2 py-1.5 bg-[#1a1a1a] text-xs text-center text-[#e5e2e1] truncate">
              {name}
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FF5722] flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
