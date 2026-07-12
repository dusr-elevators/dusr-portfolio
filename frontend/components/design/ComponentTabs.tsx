'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentCategory } from './types';
import type { Lang } from '@/lib/lang';
import DynamicIcon from './DynamicIcon';

type RtlScrollType = 'default' | 'negative' | 'reverse';

interface ComponentTabsProps {
  categories: ComponentCategory[];
  activeId: number;
  onSelect: (id: number) => void;
  completedIds: Set<number>;
  lang: Lang;
}

let cachedRtlScrollType: RtlScrollType | null = null;

function getRtlScrollType(): RtlScrollType {
  if (cachedRtlScrollType) return cachedRtlScrollType;

  const outer = document.createElement('div');
  const inner = document.createElement('div');

  outer.dir = 'rtl';
  outer.style.cssText = 'position:absolute;top:-9999px;width:4px;height:1px;overflow:scroll;';
  inner.style.cssText = 'width:8px;height:1px;';
  outer.appendChild(inner);
  document.body.appendChild(outer);

  if (outer.scrollLeft > 0) {
    cachedRtlScrollType = 'default';
  } else {
    outer.scrollLeft = 1;
    cachedRtlScrollType = outer.scrollLeft === 0 ? 'negative' : 'reverse';
  }

  document.body.removeChild(outer);
  return cachedRtlScrollType;
}

export default function ComponentTabs({ categories, activeId, onSelect, completedIds, lang }: ComponentTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isRtl = lang === 'ar';

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const threshold = 4;

    if (maxScroll <= threshold) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    if (!isRtl) {
      setCanScrollLeft(el.scrollLeft > threshold);
      setCanScrollRight(el.scrollLeft < maxScroll - threshold);
      return;
    }

    const rtlScrollType = getRtlScrollType();
    if (rtlScrollType === 'negative') {
      setCanScrollLeft(el.scrollLeft > -maxScroll + threshold);
      setCanScrollRight(el.scrollLeft < -threshold);
    } else if (rtlScrollType === 'reverse') {
      setCanScrollLeft(el.scrollLeft < maxScroll - threshold);
      setCanScrollRight(el.scrollLeft > threshold);
    } else {
      setCanScrollLeft(el.scrollLeft > threshold);
      setCanScrollRight(el.scrollLeft < maxScroll - threshold);
    }
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
  }, [categories, isRtl]);

  const scroll = (dir: 'left' | 'right') => {
    const rtlScrollType = isRtl ? getRtlScrollType() : null;
    const visualLeftDelta = rtlScrollType === 'reverse' ? 200 : -200;
    const left = dir === 'left' ? visualLeftDelta : -visualLeftDelta;
    scrollRef.current?.scrollBy({ left, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full max-w-full min-w-0 overflow-hidden">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 p-1.5 rounded-full bg-[#1e1e1e] border border-[#444748] hover:border-[#FF5722] text-[#e5e2e1] transition-colors shadow-lg"
          aria-label={isRtl ? 'التمرير لليسار' : 'Scroll left'}
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        ref={scrollRef}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
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
              {cat.icon && <DynamicIcon name={cat.icon} size={14} className="shrink-0" />}
              {name}
              {isDone && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722] shrink-0" />
              )}
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
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 p-1.5 rounded-full bg-[#1e1e1e] border border-[#444748] hover:border-[#FF5722] text-[#e5e2e1] transition-colors shadow-lg"
          aria-label={isRtl ? 'التمرير لليمين' : 'Scroll right'}
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
