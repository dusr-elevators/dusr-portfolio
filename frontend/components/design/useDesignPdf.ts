/**
 * Builds the branded A4 PDF from the on-screen projection canvas and the hidden
 * print layout. Extracted from ExportButton so the capture pipeline can be
 * tested and so ExportButton is only about orchestration.
 */

export interface BuildDesignPdfArgs {
  /** The live projection canvas element (ExportButton's canvasRef.current). */
  canvasEl: HTMLElement | null;
  /** Read lazily: the print layout only renders once projectionSrc is set. */
  getPrintEl: () => HTMLElement | null;
  setProjectionSrc: (src: string) => void;
  /** Time allowed for the print layout to re-render with the injected image. */
  settleMs?: number;
}

export async function buildDesignPdf({
  canvasEl,
  getPrintEl,
  setProjectionSrc,
  settleMs = 200,
}: BuildDesignPdfArgs): Promise<Blob> {
  if (!canvasEl) throw new Error('Cannot export: the projection canvas is not mounted.');

  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas').then(m => m.default),
    import('jspdf'),
  ]);

  // Step 1: capture the projection canvas → base64
  const projCanvas = await html2canvas(canvasEl, {
    useCORS: true,
    backgroundColor: '#ffffff',
    scale: 2,
  });
  setProjectionSrc(projCanvas.toDataURL('image/png'));

  // Step 2: let the print layout re-render with the injected image
  await new Promise(r => setTimeout(r, settleMs));

  // Step 3: capture the full print layout
  const printEl = getPrintEl();
  if (!printEl) throw new Error('Cannot export: the print layout is not mounted.');
  const printCanvas = await html2canvas(printEl, {
    useCORS: true,
    backgroundColor: '#ffffff',
    scale: 2,
  });

  // Step 4: insert into an A4 PDF
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = printCanvas.height / printCanvas.width;
  const imgH = Math.min(pageW * ratio, pageH);
  pdf.addImage(printCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);

  return pdf.output('blob');
}

/** Triggers a browser download of an already-built PDF blob. */
export function downloadPdfBlob(blob: Blob, filename = 'dusr-elevator-design.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
