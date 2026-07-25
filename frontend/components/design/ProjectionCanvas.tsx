'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';
import { resolveLayerImage } from './resolveLayerImage';
import FullscreenPreview from './FullscreenPreview';

interface ProjectionCanvasProps {
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export default function ProjectionCanvas({ categories, selections, lang, canvasRef }: ProjectionCanvasProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const hasAny = Object.keys(selections).length > 0;
  const isAr = lang === 'ar';

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3">
      <p className="text-xs uppercase tracking-widest text-[#888]">
        {isAr ? 'معاينة التصميم' : 'Design Preview'}
      </p>

      <div className="relative w-full max-w-[320px]">
        {/* The exported area — white background for PDF clarity. */}
        <div
          ref={canvasRef}
          className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          {!hasAny && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="px-6 text-center text-sm text-[#bbb]">
                {isAr
                  ? 'اختر مكونات المصعد لرؤية التصميم'
                  : 'Select elevator components to preview your design'}
              </p>
            </div>
          )}

          {/* Layers sorted by layer_order (ascending = bottom first). Sound
              categories carry no image and must never paint. */}
          {[...categories]
            .filter(cat => cat.kind !== 'sound')
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
                  alt={isAr ? selected.name_ar : selected.name_en}
                  fill
                  className="object-contain"
                  style={{ zIndex: cat.layer_order }}
                  sizes="320px"
                />
              );
            })}
        </div>

        {hasAny && (
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label={isAr ? 'تكبير' : 'Enlarge'}
            className={`absolute bottom-3 rounded-full bg-[#131313]/70 p-2 text-white backdrop-blur transition-colors hover:bg-[#131313] ${
              isAr ? 'left-3' : 'right-3'
            }`}
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>

      <FullscreenPreview
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        categories={categories}
        selections={selections}
        lang={lang}
      />
    </div>
  );
}
