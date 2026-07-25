import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SoundOptionList from '../SoundOptionList';
import type { ComponentOption } from '../types';

const chime: ComponentOption = {
  id: 20, name_ar: 'جرس كلاسيكي', name_en: 'Classic chime',
  thumbnail: null, projection_image: null, sound_file: '/chime.mp3',
  is_default_selected: false, sort_order: 1,
};

const bell: ComponentOption = {
  id: 21, name_ar: 'جرس ناعم', name_en: 'Soft bell',
  thumbnail: null, projection_image: null, sound_file: '/bell.mp3',
  is_default_selected: false, sort_order: 2,
};

const playMock = vi.fn();
const pauseMock = vi.fn();

beforeEach(() => {
  playMock.mockReset().mockResolvedValue(undefined);
  pauseMock.mockReset();
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(playMock);
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(pauseMock);
});

describe('SoundOptionList', () => {
  it('lists every sound plus a None entry', () => {
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={vi.fn()} lang="en" />,
    );
    expect(screen.getByText('Classic chime')).toBeInTheDocument();
    expect(screen.getByText('Soft bell')).toBeInTheDocument();
    expect(screen.getByText(/none/i)).toBeInTheDocument();
  });

  it('selects a sound without auditioning it', () => {
    const onSelect = vi.fn();
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={onSelect} lang="en" />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /classic chime/i }));

    expect(onSelect).toHaveBeenCalledWith(chime);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('auditions a sound without selecting it', () => {
    const onSelect = vi.fn();
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={onSelect} lang="en" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));

    expect(playMock).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('stops the previous sound when another is played', () => {
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={vi.fn()} lang="en" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));
    fireEvent.click(screen.getByRole('button', { name: /play soft bell/i }));

    expect(pauseMock).toHaveBeenCalled();
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('deselects when None is chosen', () => {
    const onSelect = vi.fn();
    render(
      <SoundOptionList options={[chime, bell]} selectedId={chime.id} onSelect={onSelect} lang="en" />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /none/i }));

    expect(onSelect).toHaveBeenCalledWith(chime);
  });

  it('stops playback when unmounted', () => {
    const { unmount } = render(
      <SoundOptionList options={[chime]} selectedId={null} onSelect={vi.fn()} lang="en" />,
    );

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));
    unmount();

    // Audio must not follow the user off the page.
    expect(pauseMock).toHaveBeenCalled();
  });

  // DesignStudio keys SoundOptionList by `activeCategory.id` so that switching
  // between two sound categories forces a remount (and thus this component's
  // mount-only cleanup effect) instead of reusing the instance. This wrapper
  // reproduces that exact contract — a category switch that changes `key` —
  // without pulling in DesignStudio's next/navigation dependencies.
  function CategorySwitcher() {
    const [categoryId, setCategoryId] = useState(1);
    return (
      <div>
        <button type="button" onClick={() => setCategoryId(2)}>
          switch category
        </button>
        <SoundOptionList
          key={categoryId}
          options={[chime]}
          selectedId={null}
          onSelect={vi.fn()}
          lang="en"
        />
      </div>
    );
  }

  it('stops audio from the old category when switching sound categories', () => {
    render(<CategorySwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /play classic chime/i }));
    expect(playMock).toHaveBeenCalledTimes(1);
    pauseMock.mockClear();

    // Switching the active sound category changes `key`, which must remount
    // SoundOptionList and run its cleanup effect, pausing the old audio.
    fireEvent.click(screen.getByRole('button', { name: /switch category/i }));

    expect(pauseMock).toHaveBeenCalled();
  });

  it('renders Arabic labels when lang is ar', () => {
    render(
      <SoundOptionList options={[chime, bell]} selectedId={null} onSelect={vi.fn()} lang="ar" />,
    );

    expect(screen.getByRole('radio', { name: 'بدون صوت' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تشغيل جرس كلاسيكي' })).toBeInTheDocument();
  });
});
