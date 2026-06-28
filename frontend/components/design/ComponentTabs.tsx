'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentCategory } from './types';
import type { Lang } from '@/lib/lang';

interface ComponentTabsProps {
  categories: ComponentCategory[];
  activeId: number;
  onSelect: (id: number) => void;
  completedIds: Set<number>;
  lang: Lang;
}

export default function ComponentTabs({ categories, activeId, onSelect, completedIds, lang }: ComponentTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    el?.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el?.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [categories]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center gap-1">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="shrink-0 p-1.5 rounded-full bg-[#1e1e1e] border border-[#444748] hover:border-[#FF5722] text-[#e5e2e1] transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map(cat => {
          const isActive = cat.id === activeId;
          const isDone = completedIds.has(cat.id);
          const name = lang === 'ar' ? cat.name_ar : cat.name_en;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap ${
                isActive
                  ? 'bg-[#FF5722] border-[#FF5722] text-white'
                  : 'bg-[#1e1e1e] border-[#444748] text-[#e5e2e1] hover:border-[#FF5722]'
              }`}
            >
              {isDone && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] shrink-0" />
              )}
              {name}
              {cat.is_required && !isDone && (
                <span className="text-[10px] text-red-400 font-normal">*</span>
              )}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="shrink-0 p-1.5 rounded-full bg-[#1e1e1e] border border-[#444748] hover:border-[#FF5722] text-[#e5e2e1] transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
