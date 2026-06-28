'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ComponentTabs from './ComponentTabs';
import OptionGrid from './OptionGrid';
import ProjectionCanvas from './ProjectionCanvas';
import ExportButton from './ExportButton';
import type { ComponentCategory, ComponentOption, Selections } from './types';
import type { Lang } from '@/lib/lang';

interface DesignStudioProps {
  categories: ComponentCategory[];
  lang: Lang;
}

export default function DesignStudio({ categories, lang }: DesignStudioProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<number>(categories[0]?.id ?? 0);
  const [selections, setSelections] = useState<Selections>(() => {
    // Restore selections from URL params on mount
    const initial: Selections = {};
    for (const cat of categories) {
      const paramId = searchParams.get(`c${cat.id}`);
      if (paramId) {
        const found = cat.options.find(o => o.id === Number(paramId));
        if (found) initial[cat.id] = found;
      }
    }
    return initial;
  });

  // Sync selections → URL
  const syncUrl = useCallback((sel: Selections) => {
    const params = new URLSearchParams();
    for (const [catId, option] of Object.entries(sel)) {
      params.set(`c${catId}`, String(option.id));
    }
    const qs = params.toString();
    router.replace(`?${qs}`, { scroll: false });
  }, [router]);

  const handleSelect = (option: ComponentOption) => {
    setSelections(prev => {
      const next = { ...prev, [activeTab]: option };
      syncUrl(next);
      return next;
    });
  };

  const activeCategory = categories.find(c => c.id === activeTab);
  const completedIds = new Set(Object.keys(selections).map(Number));
  const requiredTotal = categories.filter(c => c.is_required).length;
  const requiredDone = categories.filter(c => c.is_required && selections[c.id]).length;

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {lang === 'ar' ? 'مصمم كبينة المصعد' : 'Elevator Cabin Designer'}
          </h1>
          <p className="mt-2 text-[#888] text-sm">
            {lang === 'ar'
              ? 'اختر مكونات تصميم المصعد وشاهد النتيجة فوراً'
              : 'Choose your elevator components and see the result instantly'}
          </p>
          {requiredTotal > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 w-32 rounded-full bg-[#2a2a2a] overflow-hidden">
                <div
                  className="h-full bg-[#FF5722] transition-all duration-300 rounded-full"
                  style={{ width: `${(requiredDone / requiredTotal) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#888]">
                {requiredDone}/{requiredTotal} {lang === 'ar' ? 'مكونات مطلوبة' : 'required'}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* Left: tabs + options */}
          <div className="flex flex-col gap-6">
            <ComponentTabs
              categories={categories}
              activeId={activeTab}
              onSelect={setActiveTab}
              completedIds={completedIds}
              lang={lang}
            />

            {activeCategory && (
              <div>
                <h2 className="text-base font-semibold mb-4">
                  {lang === 'ar' ? activeCategory.name_ar : activeCategory.name_en}
                  {activeCategory.is_required && (
                    <span className="ml-1 text-xs text-red-400 font-normal">
                      {lang === 'ar' ? '(مطلوب)' : '(required)'}
                    </span>
                  )}
                </h2>
                <OptionGrid
                  options={activeCategory.options}
                  selectedId={selections[activeTab]?.id ?? null}
                  onSelect={handleSelect}
                  lang={lang}
                />
              </div>
            )}
          </div>

          {/* Right: projection + export */}
          <div className="flex flex-col gap-6 items-center lg:items-start">
            <ProjectionCanvas
              categories={categories}
              selections={selections}
              lang={lang}
              canvasRef={canvasRef}
            />
            <ExportButton
              canvasRef={canvasRef}
              categories={categories}
              selections={selections}
              lang={lang}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
