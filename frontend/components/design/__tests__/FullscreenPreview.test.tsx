import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FullscreenPreview from '../FullscreenPreview';
import ProjectionCanvas from '../ProjectionCanvas';
import type { ComponentCategory, ComponentOption } from '../types';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />,
}));

const oak: ComponentOption = {
  id: 10, name_ar: 'بلوط', name_en: 'Oak',
  thumbnail: null, projection_image: '/oak.png', sound_file: null,
  is_default_selected: false, sort_order: 1,
};

const chime: ComponentOption = {
  id: 20, name_ar: 'جرس', name_en: 'Chime',
  thumbnail: null, projection_image: null, sound_file: '/chime.mp3',
  is_default_selected: false, sort_order: 1,
};

const walls: ComponentCategory = {
  id: 1, name_ar: 'الجدران', name_en: 'Walls', kind: 'visual', layer_order: 1,
  is_required: true, icon: 'PanelTop', depends_on_category: null, options: [oak],
};

const sound: ComponentCategory = {
  id: 2, name_ar: 'الصوت', name_en: 'Sound', kind: 'sound', layer_order: 99,
  is_required: false, icon: 'Volume2', depends_on_category: null, options: [chime],
};

describe('FullscreenPreview', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <FullscreenPreview
        open={false} onClose={vi.fn()} categories={[walls]} selections={{ 1: oak }} lang="en"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('paints the selected visual layers when open', () => {
    render(
      <FullscreenPreview
        open onClose={vi.fn()} categories={[walls]} selections={{ 1: oak }} lang="en"
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('Oak')).toBeInTheDocument();
  });

  it('never paints a sound category as a layer', () => {
    render(
      <FullscreenPreview
        open onClose={vi.fn()} categories={[walls, sound]}
        selections={{ 1: oak, 2: chime }} lang="en"
      />,
    );
    expect(screen.queryByAltText('Chime')).not.toBeInTheDocument();
  });

  it('closes on Escape and on the close button', () => {
    const onClose = vi.fn();
    render(
      <FullscreenPreview open onClose={onClose} categories={[walls]} selections={{ 1: oak }} lang="en" />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /close|إغلاق/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <FullscreenPreview open onClose={onClose} categories={[walls]} selections={{ 1: oak }} lang="en" />,
    );

    // Clicking the dialog backdrop itself closes; the inner panel stops propagation.
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the cabin panel itself is clicked', () => {
    const onClose = vi.fn();
    render(
      <FullscreenPreview open onClose={onClose} categories={[walls]} selections={{ 1: oak }} lang="en" />,
    );

    // The layer image lives inside the panel, which stops propagation to the backdrop.
    fireEvent.click(screen.getByAltText('Oak'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ProjectionCanvas fullscreen trigger', () => {
  it('hides the enlarge button when nothing is selected', () => {
    render(
      <ProjectionCanvas
        categories={[walls]} selections={{}} lang="en" canvasRef={{ current: null }}
      />,
    );
    expect(screen.queryByRole('button', { name: /enlarge|تكبير/i })).not.toBeInTheDocument();
  });

  it('shows the enlarge button once something is selected', () => {
    render(
      <ProjectionCanvas
        categories={[walls]} selections={{ 1: oak }} lang="en" canvasRef={{ current: null }}
      />,
    );
    expect(screen.getByRole('button', { name: /enlarge|تكبير/i })).toBeInTheDocument();
  });

  it('never paints a sound category in its own preview', () => {
    render(
      <ProjectionCanvas
        categories={[walls, sound]} selections={{ 1: oak, 2: chime }} lang="en"
        canvasRef={{ current: null }}
      />,
    );
    expect(screen.getByAltText('Oak')).toBeInTheDocument();
    expect(screen.queryByAltText('Chime')).not.toBeInTheDocument();
  });

  it('keeps the export capture target mounted after opening and closing fullscreen', () => {
    const canvasRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <ProjectionCanvas
        categories={[walls]} selections={{ 1: oak }} lang="en" canvasRef={canvasRef}
      />,
    );
    const captureTarget = canvasRef.current;
    expect(captureTarget).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /enlarge|تكبير/i }));
    fireEvent.keyDown(document, { key: 'Escape' });

    // If the overlay ever reparents this node instead of rendering its own copy,
    // html2canvas silently captures the wrong thing and the PDF breaks.
    expect(canvasRef.current).toBe(captureTarget);
    expect(document.body.contains(canvasRef.current)).toBe(true);
  });
});
