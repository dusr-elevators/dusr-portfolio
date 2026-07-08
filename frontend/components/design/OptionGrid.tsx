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
  disabledIds?: number[];
}

export default function OptionGrid({ options, selectedId, onSelect, lang, disabledIds = [] }: OptionGridProps) {
  if (options.length === 0) {
    return (
      <p className="text-center text-[#888] py-12 text-sm">
        {lang === 'ar' ? 'لا توجد خيارات متاحة لهذا المكون' : 'No options available for this component'}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {options.map(option => {
        const isSelected = option.id === selectedId;
        const isDisabled = disabledIds.includes(option.id);
        const name = lang === 'ar' ? option.name_ar : option.name_en;
        return (
          <button
            key={option.id}
            onClick={() => !isDisabled && onSelect(option)}
            disabled={isDisabled}
            className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
              isSelected
                ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30'
                : isDisabled
                ? 'border-[#2a2a2a] opacity-50'
                : 'border-[#2a2a2a] hover:border-[#444748]'
            } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
