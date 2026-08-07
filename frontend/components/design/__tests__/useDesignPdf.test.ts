/**
 * buildPdf captures the projection canvas, injects it into the hidden print
 * layout, captures that, and returns an A4 PDF blob. html2canvas and jsPDF are
 * mocked because jsdom has no real layout or canvas.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const html2canvasMock = vi.fn();
const addImageMock = vi.fn();
const outputMock = vi.fn(() => new Blob(['%PDF-'], { type: 'application/pdf' }));

vi.mock('html2canvas', () => ({
  default: (...args: unknown[]) => html2canvasMock(...args),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    constructor(public options?: unknown) {}
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = addImageMock;
    output = outputMock;
  },
}));

import { buildDesignPdf } from '../useDesignPdf';

function fakeCanvas(width: number, height: number) {
  return { width, height, toDataURL: (type?: string) => `data:${type ?? 'image/png'};base64,AAA` };
}

describe('buildDesignPdf', () => {
  beforeEach(() => {
    html2canvasMock.mockReset().mockResolvedValue(fakeCanvas(800, 1200));
    addImageMock.mockReset();
    outputMock.mockClear();
  });

  it('captures the projection canvas and then the print layout', async () => {
    const canvasEl = document.createElement('div');
    const printEl = document.createElement('div');
    const setProjectionSrc = vi.fn();

    await buildDesignPdf({
      canvasEl,
      getPrintEl: () => printEl,
      setProjectionSrc,
      settleMs: 0,
    });

    expect(html2canvasMock).toHaveBeenCalledTimes(2);
    expect(html2canvasMock.mock.calls[0][0]).toBe(canvasEl);
    expect(html2canvasMock.mock.calls[1][0]).toBe(printEl);
    expect(setProjectionSrc).toHaveBeenCalledWith('data:image/jpeg;base64,AAA');
  });

  it('captures both canvases with email-safe PDF options', async () => {
    await buildDesignPdf({
      canvasEl: document.createElement('div'),
      getPrintEl: () => document.createElement('div'),
      setProjectionSrc: vi.fn(),
      settleMs: 0,
    });

    const expectedOptions = { useCORS: true, backgroundColor: '#ffffff', scale: 1.4 };
    expect(html2canvasMock.mock.calls[0][1]).toEqual(expectedOptions);
    expect(html2canvasMock.mock.calls[1][1]).toEqual(expectedOptions);
  });

  it('fits a portrait print canvas to the full A4 height', async () => {
    // ratio 1200/800 = 1.5 → 210*1.5 = 315, clamped to the 297mm page height.
    html2canvasMock.mockReset().mockResolvedValue(fakeCanvas(800, 1200));

    await buildDesignPdf({
      canvasEl: document.createElement('div'),
      getPrintEl: () => document.createElement('div'),
      setProjectionSrc: vi.fn(),
      settleMs: 0,
    });

    expect(addImageMock).toHaveBeenCalledWith(
      'data:image/jpeg;base64,AAA', 'JPEG', 0, 0, 210, 297,
    );
  });

  it('scales a short print canvas to its natural height, below the page', async () => {
    // ratio 500/1000 = 0.5 → 210*0.5 = 105, under 297 so it stays 105.
    html2canvasMock.mockReset().mockResolvedValue(fakeCanvas(1000, 500));

    await buildDesignPdf({
      canvasEl: document.createElement('div'),
      getPrintEl: () => document.createElement('div'),
      setProjectionSrc: vi.fn(),
      settleMs: 0,
    });

    expect(addImageMock).toHaveBeenCalledWith(
      'data:image/jpeg;base64,AAA', 'JPEG', 0, 0, 210, 105,
    );
  });

  it('returns a PDF blob', async () => {
    const result = await buildDesignPdf({
      canvasEl: document.createElement('div'),
      getPrintEl: () => document.createElement('div'),
      setProjectionSrc: vi.fn(),
      settleMs: 0,
    });

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/pdf');
  });

  it('throws when the projection canvas is missing', async () => {
    await expect(
      buildDesignPdf({
        canvasEl: null,
        getPrintEl: () => document.createElement('div'),
        setProjectionSrc: vi.fn(),
        settleMs: 0,
      }),
    ).rejects.toThrow('projection canvas');
  });

  it('throws when the print layout is missing', async () => {
    // The projection capture runs first, then this guard fires.
    await expect(
      buildDesignPdf({
        canvasEl: document.createElement('div'),
        getPrintEl: () => null,
        setProjectionSrc: vi.fn(),
        settleMs: 0,
      }),
    ).rejects.toThrow('print layout');
  });
});
