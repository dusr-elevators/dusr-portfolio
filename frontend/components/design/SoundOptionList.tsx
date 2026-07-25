'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import type { ComponentOption } from './types';
import type { Lang } from '@/lib/lang';

interface SoundOptionListProps {
  options: ComponentOption[];
  selectedId: number | null;
  /** Called with the option to toggle; selecting the current one clears it. */
  onSelect: (option: ComponentOption) => void;
  lang: Lang;
  label?: string;
}

/**
 * Sound rows carry two independent controls: a radio that makes the sound part
 * of the design, and a play button that only auditions it. Keeping them separate
 * is the point of the feature — the user experiments, then chooses.
 */
export default function SoundOptionList({
  options, selectedId, onSelect, lang, label,
}: SoundOptionListProps) {
  const isAr = lang === 'ar';
  const [playingId, setPlayingId] = useState<number | null>(null);
  // One shared element: starting a sound necessarily stops the previous one.
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = () => {
    audioRef.current?.pause();
    setPlayingId(null);
  };

  const toggleAudition = (option: ComponentOption) => {
    if (playingId === option.id) {
      stop();
      return;
    }
    if (!option.sound_file) return;

    audioRef.current?.pause();
    const audio = new Audio(option.sound_file);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(option.id);
    void audio.play().catch(() => setPlayingId(null));
  };

  const selectedOption = options.find(o => o.id === selectedId) ?? null;

  const rowClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
      active ? 'border-[#FF5722] ring-2 ring-[#FF5722]/30' : 'border-[#2a2a2a] hover:border-[#444748]'
    }`;

  return (
    <div
      className="flex flex-col gap-2"
      role="radiogroup"
      aria-label={label}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className={rowClass(selectedId === null)}>
        <button
          type="button"
          role="radio"
          aria-checked={selectedId === null}
          aria-label={isAr ? 'بدون صوت' : 'None'}
          onClick={() => {
            if (selectedOption) onSelect(selectedOption);
            stop();
          }}
          className="flex flex-1 items-center gap-3 text-start"
        >
          <span
            className={`h-4 w-4 shrink-0 rounded-full border-2 ${
              selectedId === null ? 'border-[#FF5722] bg-[#FF5722]' : 'border-[#555]'
            }`}
          />
          <span className="text-sm text-[#9a9a9a]">{isAr ? 'بدون صوت' : 'None'}</span>
        </button>
      </div>

      {options.map(option => {
        const name = isAr ? option.name_ar : option.name_en;
        const isSelected = option.id === selectedId;
        const isPlaying = option.id === playingId;

        return (
          <div key={option.id} className={rowClass(isSelected)}>
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={name}
              onClick={() => onSelect(option)}
              className="flex flex-1 items-center gap-3 text-start"
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  isSelected ? 'border-[#FF5722] bg-[#FF5722]' : 'border-[#555]'
                }`}
              />
              <Volume2 size={16} className="shrink-0 text-[#888]" />
              <span className="text-sm text-[#e5e2e1]">{name}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleAudition(option)}
              aria-label={
                isPlaying
                  ? isAr ? `إيقاف ${name}` : `Pause ${name}`
                  : isAr ? `تشغيل ${name}` : `Play ${name}`
              }
              className="shrink-0 rounded-full border border-[#2a2a2a] p-2 text-[#FF5722] transition-colors hover:bg-[#FF5722]/10"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
