'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ComponentTabs from './ComponentTabs';
import OptionGrid from './OptionGrid';
import DependentOptionRadioList from './DependentOptionRadioList';
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

function applyDefaultSelections(categories: ComponentCategory[], initial: Selections): Selections {
  const next = { ...initial };

  for (const cat of [...categories].sort((a, b) => a.layer_order - b.layer_order)) {
    if (next[cat.id]) continue;

    const defaultOption = cat.options.find(option => option.is_default_selected);
    if (!defaultOption) continue;

    if (cat.depends_on_category != null) {
      const parent = next[cat.depends_on_category];
      if (!parent || !isOptionAvailable(defaultOption, parent.id)) continue;
    }

    next[cat.id] = defaultOption;
  }

  return next;
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
    const withDefaults = applyDefaultSelections(categories, initial);

    // Drop dependent selections whose variant no longer exists for the restored parent
    for (const cat of categories) {
      if (cat.depends_on_category != null && withDefaults[cat.id]) {
        const parent = withDefaults[cat.depends_on_category];
        if (!parent || !isOptionAvailable(withDefaults[cat.id], parent.id)) {
          delete withDefaults[cat.id];
        }
      }
    }
    return withDefaults;
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
    const next = { ...selections };

    if (next[activeTab]?.id === option.id) {
      delete next[activeTab];
    } else {
      next[activeTab] = option;
    }

    // A dependent selection that has no variant for the new parent resets to "None"
    for (const depCategory of categories) {
      if (depCategory.depends_on_category === activeTab && next[depCategory.id]) {
        const parent = next[activeTab];
        if (!parent || !isOptionAvailable(next[depCategory.id], parent.id)) {
          delete next[depCategory.id];
        }
      }
    }

    setSelections(next);
    syncUrl(next);
  };

  const handleDependentSelect = (option: ComponentOption) => {
    handleSelect(option);
  };

  const activeCategory = categories.find(c => c.id === activeTab);
  const completedIds = new Set(Object.keys(selections).map(Number));
  const requiredTotal = categories.filter(c => c.is_required).length;
  const requiredDone = categories.filter(c => c.is_required && selections[c.id]).length;

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-clip bg-[#131313] text-[#e5e2e1]">
      <div className="mx-auto w-full max-w-7xl overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

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

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">

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
                {activeCategory.depends_on_category != null ? (
                  (() => {
                    const parentCat = categories.find(c => c.id === activeCategory.depends_on_category);
                    const parentSelection = selections[activeCategory.depends_on_category];
                    const available = parentSelection
                      ? activeCategory.options.filter(o => isOptionAvailable(o, parentSelection.id))
                      : [];
                    return (
                      <DependentOptionRadioList
                        options={available}
                        selectedId={selections[activeTab]?.id ?? null}
                        onSelect={handleDependentSelect}
                        lang={lang}
                        parentName={parentCat ? (lang === 'ar' ? parentCat.name_ar : parentCat.name_en) : ''}
                        parentSelected={!!parentSelection}
                        label={lang === 'ar' ? activeCategory.name_ar : activeCategory.name_en}
                      />
                    );
                  })()
                ) : (
                  <OptionGrid
                    options={activeCategory.options}
                    selectedId={selections[activeTab]?.id ?? null}
                    onSelect={handleSelect}
                    lang={lang}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right: projection + export */}
          <div className="flex min-w-0 flex-col gap-6 items-center lg:items-start">
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
