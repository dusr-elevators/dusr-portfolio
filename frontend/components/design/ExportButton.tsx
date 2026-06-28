'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { ComponentCategory, Selections } from './types';
import type { Lang } from '@/lib/lang';

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
}

export default function ExportButton({ canvasRef, categories, selections, lang }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

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

      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Header background
      pdf.setFillColor(19, 19, 19);
      pdf.rect(0, 0, pageW, 35, 'F');

      // Company name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DUSR Elevators', 14, 15);

      // Tagline
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(200, 200, 200);
      pdf.text('Elevator Installation & Maintenance — Saudi Arabia', 14, 22);

      // Contact
      pdf.setFontSize(8);
      pdf.setTextColor(180, 180, 180);
      pdf.text('+966 53 970 5301  |  dusr.sa', 14, 29);

      // Section label
      pdf.setTextColor(255, 87, 34);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      const label = lang === 'ar' ? 'تصميم كبينة المصعد' : 'Elevator Cabin Design';
      pdf.text(label, 14, 46);

      // Divider
      pdf.setDrawColor(255, 87, 34);
      pdf.setLineWidth(0.5);
      pdf.line(14, 49, pageW - 14, 49);

      // Projection image centred
      const imgData = canvas.toDataURL('image/png');
      const imgW = 90;
      const imgH = (canvas.height / canvas.width) * imgW;
      const imgX = (pageW - imgW) / 2;
      pdf.addImage(imgData, 'PNG', imgX, 54, imgW, imgH);

      // Component summary table
      let y = 54 + imgH + 12;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(50, 50, 50);
      const summaryLabel = lang === 'ar' ? 'ملخص المكونات' : 'Component Summary';
      pdf.text(summaryLabel, 14, y);
      y += 5;

      pdf.setLineWidth(0.3);
      pdf.setDrawColor(220, 220, 220);
      pdf.line(14, y, pageW - 14, y);
      y += 5;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      for (const cat of categories) {
        const sel = selections[cat.id];
        const catName = lang === 'ar' ? cat.name_ar : cat.name_en;
        const optName = sel ? (lang === 'ar' ? sel.name_ar : sel.name_en) : '—';
        pdf.setTextColor(100, 100, 100);
        pdf.text(catName, 14, y);
        pdf.setTextColor(30, 30, 30);
        pdf.text(optName, 70, y);
        y += 6;
        if (y > pageH - 20) break;
      }

      // Footer
      pdf.setFillColor(19, 19, 19);
      pdf.rect(0, pageH - 12, pageW, 12, 'F');
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(7);
      pdf.text('dusr.sa  |  © 2025 Dusr Elevators. All rights reserved.', pageW / 2, pageH - 5, { align: 'center' });

      pdf.save('dusr-elevator-design.pdf');
    } finally {
      setLoading(false);
    }
  };

  const tooltip = !isReady
    ? missingRequired.length > 0
      ? lang === 'ar'
        ? `يرجى اختيار: ${missingRequired.map(c => c.name_ar).join('، ')}`
        : `Please select: ${missingRequired.map(c => c.name_en).join(', ')}`
      : lang === 'ar' ? 'اختر مكوناً على الأقل' : 'Select at least one component'
    : undefined;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleExport}
        disabled={!isReady || loading}
        title={tooltip}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all ${
          isReady && !loading
            ? 'bg-[#FF5722] hover:bg-[#e64a19] text-white shadow-lg shadow-[#FF5722]/25'
            : 'bg-[#2a2a2a] text-[#666] cursor-not-allowed'
        }`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {lang === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
      </button>
      {tooltip && (
        <p className="text-xs text-[#888] text-center max-w-xs">{tooltip}</p>
      )}
    </div>
  );
}
