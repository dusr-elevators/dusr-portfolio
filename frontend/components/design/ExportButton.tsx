'use client';

import { useState, useRef } from 'react';
import { Download, Loader2, MessageCircle } from 'lucide-react';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';
import PrintLayout from './PrintLayout';

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
}

export default function ExportButton({ canvasRef, categories, selections, lang }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [projectionSrc, setProjectionSrc] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const requiredCategories = categories.filter(c => c.is_required);
  const missingRequired = requiredCategories.filter(c => !selections[c.id]);
  const isReady = missingRequired.length === 0 && Object.keys(selections).length > 0;

  const handleExport = async () => {
    if (!canvasRef.current || !isReady) return;
    setLoading(true);

    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ]);

      // Step 1: capture the projection canvas → base64
      const projCanvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const src = projCanvas.toDataURL('image/png');

      // Step 2: inject into print layout and wait for re-render
      setProjectionSrc(src);
      await new Promise(r => setTimeout(r, 200));

      // Step 3: capture the full print layout
      if (!printRef.current) return;
      const printCanvas = await html2canvas(printRef.current, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
      });

      // Step 4: insert into PDF (A4)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = printCanvas.height / printCanvas.width;
      const imgH = Math.min(pageW * ratio, pageH);
      pdf.addImage(printCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);

      pdf.save('dusr-elevator-design.pdf');
    } finally {
      setLoading(false);
      setProjectionSrc('');
    }
  };

  const handleQuote = () => {
    const lines = categories
      .map(cat => {
        const sel = selections[cat.id];
        if (!sel) return null;
        const catName = lang === 'ar' ? cat.name_ar : cat.name_en;
        const optName = lang === 'ar' ? sel.name_ar : sel.name_en;
        return `• ${catName}: ${optName}`;
      })
      .filter(Boolean);

    const intro = lang === 'ar'
      ? 'مرحباً، أرغب في طلب عرض سعر لتصميم كبينة المصعد التالي:'
      : 'Hello, I would like to request a quotation for the following elevator cabin design:';
    const message = `${intro}\n\n${lines.join('\n')}\n\n${window.location.href}`;
    const url = `https://wa.me/966539705301?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const tooltip = !isReady
    ? missingRequired.length > 0
      ? lang === 'ar'
        ? `يرجى اختيار: ${missingRequired.map(c => c.name_ar).join('، ')}`
        : `Please select: ${missingRequired.map(c => c.name_en).join(', ')}`
      : lang === 'ar' ? 'اختر مكوناً على الأقل' : 'Select at least one component'
    : undefined;

  return (
    <>
      <PrintLayout
        categories={categories}
        selections={selections}
        lang={lang}
        projectionSrc={projectionSrc}
        printRef={printRef}
      />

      <div className="flex flex-col items-stretch gap-2 w-full max-w-xs">
        <button
          onClick={handleExport}
          disabled={!isReady || loading}
          title={tooltip}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all ${
            isReady && !loading
              ? 'bg-[#FF5722] hover:bg-[#e64a19] text-white shadow-lg shadow-[#FF5722]/25'
              : 'bg-[#2a2a2a] text-[#666] cursor-not-allowed'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {lang === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
        </button>
        <button
          onClick={handleQuote}
          disabled={!isReady}
          title={tooltip}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all border ${
            isReady
              ? 'border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722]/10'
              : 'border-[#2a2a2a] text-[#666] cursor-not-allowed'
          }`}
        >
          <MessageCircle size={16} />
          {lang === 'ar' ? 'طلب عرض سعر' : 'Request Quotation'}
        </button>
        {tooltip && (
          <p className="text-xs text-[#888] text-center">{tooltip}</p>
        )}
      </div>
    </>
  );
}
