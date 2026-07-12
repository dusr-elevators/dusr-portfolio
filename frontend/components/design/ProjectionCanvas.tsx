'use client';

import Image from 'next/image';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';
import { resolveLayerImage } from './resolveLayerImage';

interface ProjectionCanvasProps {
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export default function ProjectionCanvas({ categories, selections, lang, canvasRef }: ProjectionCanvasProps) {
  const hasAny = Object.keys(selections).length > 0;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <p className="text-xs text-[#888] uppercase tracking-widest">
        {lang === 'ar' ? 'معاينة التصميم' : 'Design Preview'}
      </p>

      {/* The exported area — white background for PDF clarity */}
      <div
        ref={canvasRef}
        className="relative aspect-[2/3] w-full max-w-[320px] bg-white rounded-2xl overflow-hidden shadow-2xl"
      >
        {!hasAny && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[#bbb] text-sm text-center px-6">
              {lang === 'ar'
                ? 'اختر مكونات المصعد لرؤية التصميم'
                : 'Select elevator components to preview your design'}
            </p>
          </div>
        )}

        {/* Render layers sorted by layer_order (ascending = bottom first) */}
        {[...categories]
          .sort((a, b) => a.layer_order - b.layer_order)
          .map(cat => {
            const selected = selections[cat.id];
            if (!selected) return null;
            const src = resolveLayerImage(cat, selected, selections);
            if (!src) return null;
            return (
              <Image
                key={cat.id}
                src={src}
                alt={lang === 'ar' ? selected.name_ar : selected.name_en}
                fill
                className="object-contain"
                style={{ zIndex: cat.layer_order }}
                sizes="320px"
              />
            );
          })}
      </div>
    </div>
  );
}
