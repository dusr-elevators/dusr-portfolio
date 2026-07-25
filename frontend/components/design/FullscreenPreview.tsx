'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';
import { resolveLayerImage } from './resolveLayerImage';

interface FullscreenPreviewProps {
  open: boolean;
  onClose: () => void;
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
}

/**
 * A view-only enlargement of the cabin.
 *
 * This renders its OWN copy of the layer stack. It must never move or reparent
 * ProjectionCanvas's canvasRef node — ExportButton captures that exact element
 * with html2canvas, and detaching it silently corrupts the PDF.
 *
 * A CSS overlay rather than the native Fullscreen API, which iOS Safari does not
 * honour on arbitrary elements.
 */
export default function FullscreenPreview({
  open, onClose, categories, selections, lang,
}: FullscreenPreviewProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const isAr = lang === 'ar';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'معاينة التصميم بملء الشاشة' : 'Fullscreen design preview'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#131313]/95 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={isAr ? 'إغلاق' : 'Close'}
        className={`absolute top-5 rounded-full bg-[#2a2a2a]/80 p-2 text-[#e5e2e1] transition-colors hover:bg-[#2a2a2a] ${
          isAr ? 'left-5' : 'right-5'
        }`}
      >
        <X size={20} />
      </button>

      <div
        onClick={e => e.stopPropagation()}
        className="relative max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ aspectRatio: '2 / 3', height: '90dvh' }}
      >
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
                sizes="90vh"
              />
            );
          })}
      </div>
    </div>,
    document.body,
  );
}
