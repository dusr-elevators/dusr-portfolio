'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, MessageCircle } from 'lucide-react';
import type { ComponentCategory, DeliveryMode, LeadDetails, Selections } from './types';
import type { Lang } from '@/lib/lang';
import PrintLayout from './PrintLayout';
import LeadCaptureModal from './LeadCaptureModal';
import { blobToBase64, buildDesignPdf, downloadPdfBlob } from './useDesignPdf';

/** One "Category: Option" line per selected category, in category order. */
export function buildSelectionsSummary(
  categories: ComponentCategory[],
  selections: Selections,
  lang: Lang,
): string {
  return categories
    .map(cat => {
      const sel = selections[cat.id];
      if (!sel) return null;
      const catName = lang === 'ar' ? cat.name_ar : cat.name_en;
      const optName = lang === 'ar' ? sel.name_ar : sel.name_en;
      return `${catName}: ${optName}`;
    })
    .filter(Boolean)
    .join('\n');
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    const detail = payload.detail ?? payload.pdf_base64 ?? payload.non_field_errors;
    return Array.isArray(detail) ? detail.join(' ') : String(detail ?? '');
  } catch {
    return '';
  }
}

interface ExportButtonProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  categories: ComponentCategory[];
  selections: Selections;
  lang: Lang;
  deliveryMode: DeliveryMode;
}

export default function ExportButton({
  canvasRef, categories, selections, lang, deliveryMode,
}: ExportButtonProps) {
  const isAr = lang === 'ar';
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [projectionSrc, setProjectionSrc] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  // The capture is kicked off when the modal opens and awaited on submit.
  const pdfPromiseRef = useRef<Promise<Blob> | null>(null);

  const requiredCategories = categories.filter(c => c.is_required);
  const missingRequired = requiredCategories.filter(c => !selections[c.id]);
  const isReady = missingRequired.length === 0 && Object.keys(selections).length > 0;

  const startBuildingPdf = useCallback(() => {
    pdfPromiseRef.current = buildDesignPdf({
      canvasEl: canvasRef.current,
      getPrintEl: () => printRef.current,
      setProjectionSrc,
    });
    return pdfPromiseRef.current;
  }, [canvasRef]);

  useEffect(() => {
    if (!modalOpen || pdfPromiseRef.current) return;
    // Build while the user types, so submitting does not then wait on capture.
    // Skipped when a build is already cached (e.g. reopening after a close, or
    // retrying a failed submit) so we never run two captures against the
    // shared off-screen node at once.
    startBuildingPdf().catch(() => {
      /* surfaced on submit */
    });
  }, [modalOpen, startBuildingPdf]);

  useEffect(() => {
    // The modal covers the editing UI, so selections only change while it is
    // closed - safe to drop any cached build and force a fresh capture.
    pdfPromiseRef.current = null;
    setProjectionSrc('');
  }, [selections]);

  const handleExportClick = async () => {
    if (!isReady) return;

    if (deliveryMode !== 'free_download') {
      setServerError(undefined);
      setNotice(undefined);
      setModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const blob = await startBuildingPdf();
      downloadPdfBlob(blob);
    } finally {
      setLoading(false);
      setProjectionSrc('');
      pdfPromiseRef.current = null;
    }
  };

  const handleLeadSubmit = async (details: LeadDetails) => {
    setSubmitting(true);
    setServerError(undefined);

    try {
      const blob = await (pdfPromiseRef.current ?? startBuildingPdf());

      const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/design/lead-submissions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          design_url: window.location.href,
          selections_summary: buildSelectionsSummary(categories, selections, lang),
          pdf_base64: await blobToBase64(blob),
        }),
      });

      if (!response.ok) {
        const detail = await readErrorDetail(response);
        console.error('Design lead submission rejected', {
          status: response.status,
          detail,
        });
        const isTooLarge = response.status === 413 || /too large/i.test(detail);
        setServerError(
          isTooLarge
            ? isAr ? 'حجم ملف التصميم كبير جداً. يرجى المحاولة مرة أخرى.' : 'The design PDF is too large. Please try again.'
            : response.status === 429
              ? isAr ? 'محاولات كثيرة. يرجى المحاولة لاحقاً.' : 'Too many attempts. Please try again later.'
              : isAr ? 'تعذر إرسال التصميم. يرجى المحاولة مرة أخرى.' : 'We could not send your design. Please try again.',
        );
        return;
      }

      const { email_sent: emailSent } = await response.json();

      // In email-only mode a failed send would otherwise leave the user with
      // nothing, having just handed over their details.
      if (deliveryMode === 'form_email_download' || !emailSent) {
        downloadPdfBlob(blob);
      }

      setModalOpen(false);
      setNotice(
        emailSent
          ? isAr ? 'تم إرسال التصميم إلى بريدك الإلكتروني.' : 'Your design is on its way to your inbox.'
          : isAr ? 'تعذر إرسال البريد، وتم تنزيل التصميم بدلاً من ذلك.' : "We couldn't send the email, so we downloaded your design instead.",
      );
      // Only drop the cached build once it has actually been consumed by a
      // successful submit - a failed submit (below, or a non-OK response)
      // keeps it so a retry reuses the already-built blob instead of paying
      // for another multi-second capture.
      setProjectionSrc('');
      pdfPromiseRef.current = null;
    } catch (error) {
      console.error('Design lead submission failed', error);
      setServerError(
        isAr ? 'تعذر إرسال التصميم. يرجى المحاولة مرة أخرى.' : 'We could not send your design. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuote = () => {
    const intro = isAr
      ? 'مرحباً، أرغب في طلب عرض سعر لتصميم كبينة المصعد التالي:'
      : 'Hello, I would like to request a quotation for the following elevator cabin design:';
    const summary = buildSelectionsSummary(categories, selections, lang)
      .split('\n')
      .map(line => `• ${line}`)
      .join('\n');
    const message = `${intro}\n\n${summary}\n\n${window.location.href}`;
    const url = `https://wa.me/966539705301?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const tooltip = !isReady
    ? missingRequired.length > 0
      ? isAr
        ? `يرجى اختيار: ${missingRequired.map(c => c.name_ar).join('، ')}`
        : `Please select: ${missingRequired.map(c => c.name_en).join(', ')}`
      : isAr ? 'اختر مكوناً على الأقل' : 'Select at least one component'
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

      <LeadCaptureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleLeadSubmit}
        lang={lang}
        submitting={submitting}
        error={serverError}
      />

      {/* Width is pinned to the preview's own max width so the two edges agree.
          max-w-xs happens to be 320px today, but it is rem-based and would drift
          from the canvas if the root font size ever changed. */}
      <div className="flex w-full max-w-[320px] flex-col items-stretch gap-2">
        <button
          onClick={handleExportClick}
          disabled={!isReady || loading}
          title={tooltip}
          className={`flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
            isReady && !loading
              ? 'bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/25 hover:bg-[#e64a19]'
              : 'cursor-not-allowed bg-[#2a2a2a] text-[#666]'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isAr ? 'تنزيل PDF' : 'Download PDF'}
        </button>

        <button
          onClick={handleQuote}
          disabled={!isReady}
          title={tooltip}
          className={`flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-all ${
            isReady
              ? 'border-[#FF5722] text-[#FF5722] hover:bg-[#FF5722]/10'
              : 'cursor-not-allowed border-[#2a2a2a] text-[#666]'
          }`}
        >
          <MessageCircle size={16} />
          {isAr ? 'طلب عرض سعر' : 'Request Quotation'}
        </button>

        {notice && <p className="text-center text-xs text-[#FF5722]">{notice}</p>}
        {tooltip && <p className="text-center text-xs text-[#888]">{tooltip}</p>}
      </div>
    </>
  );
}
