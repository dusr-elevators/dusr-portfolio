'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ComponentTabs from './ComponentTabs';
import OptionGrid from './OptionGrid';
import ProjectionCanvas from './ProjectionCanvas';
import ExportButton from './ExportButton';
import type { ComponentCategory, ComponentOption, Selections } from './types';
import type { Lang } from '@/lib/lang';

/**
 * Checks if a component option is available for the currently selected parent option.
 * Returns true if the option has a variant matching the current parent, false otherwise.
 */
function isOptionAvailable(
  option: ComponentOption,
  currentParentOptionId: number | undefined
): boolean {
  if (!currentParentOptionId) return false;
  if (!option.variants) return false;
  return option.variants.some(v => v.depends_on_option === currentParentOptionId);
}

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
      let next = { ...prev, [activeTab]: option };

      // Auto-reset dependent category selections if they're no longer available
      // When a category changes, check all categories that depend on it
      const changedCategory = categories.find(c => c.id === activeTab);
      if (changedCategory) {
        for (const depCategory of categories) {
          if (depCategory.depends_on_category === activeTab && next[depCategory.id]) {
            // Check if the current selection is still available for this new parent option
            const currentSelection = next[depCategory.id];
            if (!isOptionAvailable(currentSelection, option.id)) {
              // Find the "None" option (a fallback option that works with all parents)
              // Search for "None" option first by name, then fall back to any available option
              const noneOption = depCategory.options.find(o => o.name_en === 'None' || o.name_ar === 'لا شيء')
                ?? depCategory.options.find(o => {
                  if (!o.variants) return false;
                  return o.variants.some(v => v.depends_on_option === option.id);
                });

              if (noneOption) {
                next = { ...next, [depCategory.id]: noneOption };
              } else {
                // If no fallback found, just remove the selection
                const { [depCategory.id]: _, ...cleaned } = next;
                next = cleaned;
              }
            }
          }
        }
      }

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
        <div className="mb-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-[#FF5722]" aria-hidden="true" />
            <span className={`text-[#FF5722] text-xs font-semibold uppercase ${lang === 'ar' ? '' : 'tracking-[0.2em]'}`}>
              {lang === 'ar' ? 'استوديو التصميم' : 'Design Studio'}
            </span>
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            {lang === 'ar' ? (
              <><span className="text-[#FF5722]">مصمم</span> كبينة المصعد</>
            ) : (
              <>Elevator Cabin <span className="text-[#FF5722]">Designer</span></>
            )}
          </h1>
          <p className="mt-3 text-[#9a9a9a] text-base max-w-md leading-relaxed">
            {lang === 'ar'
              ? 'اختر مكونات مصعدك وشاهد التصميم يتشكّل أمامك لحظة بلحظة'
              : 'Pick your components and watch the cabin take shape in real time.'}
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

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8">

          {/* Left: tabs + options */}
          <div className="flex flex-col gap-6 min-w-0">
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
                {(() => {
                  // Compute disabled options for categories that depend on another category
                  let disabledIds: number[] = [];
                  if (activeCategory.depends_on_category != null) {
                    const parentCatId = activeCategory.depends_on_category;
                    const currentParentSelection = selections[parentCatId];
                    if (currentParentSelection) {
                      // Disable options that don't have a variant for the current parent selection
                      disabledIds = activeCategory.options
                        .filter(option => !isOptionAvailable(option, currentParentSelection.id))
                        .map(option => option.id);
                    } else {
                      // If parent category is not selected, disable all options
                      disabledIds = activeCategory.options.map(option => option.id);
                    }
                  }
                  return (
                    <OptionGrid
                      options={activeCategory.options}
                      selectedId={selections[activeTab]?.id ?? null}
                      onSelect={handleSelect}
                      lang={lang}
                      disabledIds={disabledIds}
                    />
                  );
                })()}
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
