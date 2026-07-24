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
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage = addImageMock;
    output = outputMock;
  },
}));

import { buildDesignPdf } from '../useDesignPdf';

function fakeCanvas(width: number, height: number) {
  return { width, height, toDataURL: () => 'data:image/png;base64,AAA' };
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
    expect(setProjectionSrc).toHaveBeenCalledWith('data:image/png;base64,AAA');
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
});
