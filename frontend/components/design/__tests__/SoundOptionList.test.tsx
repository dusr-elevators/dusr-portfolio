import { describe, expect, it, vi, beforeEach } from 'vitest';
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
});
