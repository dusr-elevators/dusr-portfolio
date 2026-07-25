import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentCategory, ComponentOption } from '../types';

const buildDesignPdfMock = vi.fn();
const downloadPdfBlobMock = vi.fn();

vi.mock('../useDesignPdf', () => ({
  buildDesignPdf: (...args: unknown[]) => buildDesignPdfMock(...args),
  downloadPdfBlob: (...args: unknown[]) => downloadPdfBlobMock(...args),
  blobToBase64: async () => 'JVBERi0=',
}));

import ExportButton, { buildSelectionsSummary } from '../ExportButton';

const oak: ComponentOption = {
  id: 10, name_ar: 'بلوط', name_en: 'Oak',
  thumbnail: null, projection_image: '/oak.png', sound_file: null,
  is_default_selected: false, sort_order: 1,
};

const walls: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', kind: 'visual', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null, options: [oak],
};

function renderButton(deliveryMode: 'form_email_download' | 'form_email_only' | 'free_download') {
  const canvasRef = { current: document.createElement('div') };
  return render(
    <ExportButton
      canvasRef={canvasRef}
      categories={[walls]}
      selections={{ 1: oak }}
      lang="en"
      deliveryMode={deliveryMode}
    />,
  );
}

function fillAndSubmitForm() {
  fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Sara' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'sara@example.com' } });
  fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: '+966501234567' } });
  fireEvent.click(screen.getByRole('button', { name: /send my design/i }));
}

describe('buildSelectionsSummary', () => {
  it('lists each selected category and option', () => {
    expect(buildSelectionsSummary([walls], { 1: oak }, 'en')).toBe('Walls: Oak');
  });

  it('skips categories with nothing selected', () => {
    expect(buildSelectionsSummary([walls], {}, 'en')).toBe('');
  });
});

describe('ExportButton delivery modes', () => {
  beforeEach(() => {
    buildDesignPdfMock.mockReset().mockResolvedValue(new Blob(['%PDF-']));
    downloadPdfBlobMock.mockReset();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ email_sent: true }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('free_download downloads immediately without a form', async () => {
    renderButton('free_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => expect(downloadPdfBlobMock).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('form_email_download posts the lead and also downloads', async () => {
    renderButton('form_email_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fillAndSubmitForm();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/design/lead-submissions/');
    expect(JSON.parse(init.body as string)).toMatchObject({
      full_name: 'Sara',
      email: 'sara@example.com',
      mobile: '+966501234567',
      pdf_base64: 'JVBERi0=',
    });
    await waitFor(() => expect(downloadPdfBlobMock).toHaveBeenCalled());
  });

  it('form_email_only posts but does not download', async () => {
    renderButton('form_email_only');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    fillAndSubmitForm();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(downloadPdfBlobMock).not.toHaveBeenCalled();
  });

  it('form_email_only falls back to downloading when the email fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ email_sent: false }),
    })));

    renderButton('form_email_only');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    fillAndSubmitForm();

    // Without this fallback the user gets neither an email nor a file, having
    // just handed over their contact details.
    await waitFor(() => expect(downloadPdfBlobMock).toHaveBeenCalled());
  });

  it('starts building the PDF as soon as the modal opens', async () => {
    renderButton('form_email_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    // The capture is slow; it runs while the user types rather than after submit.
    await waitFor(() => expect(buildDesignPdfMock).toHaveBeenCalled());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces a server error and keeps the modal open', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 429,
      json: async () => ({ detail: 'Too many requests' }),
    })));

    renderButton('form_email_download');
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    fillAndSubmitForm();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/could not send|too many/i)).toBeInTheDocument(),
    );
  });
});
