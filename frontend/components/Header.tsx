/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Globe } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  onEstimateClick: () => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
}

export default function Header({ onEstimateClick, lang, setLang }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-16 h-20 md:h-24 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-[#131313]/90 backdrop-blur-md border-[#444748]/50 shadow-lg'
          : 'bg-transparent border-transparent'
      }`}
    >
      {/* Right/Left Side: Logo with Brand name */}
      <Logo lang={lang} />

      {/* Left/Right Side: CTAs */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="p-2 border border-[#444748] rounded-xl hover:border-[#FF5722] text-[#c4c7c7] hover:text-[#e5e2e1] transition-all flex items-center gap-1.5 text-xs font-mono select-none"
          title={lang === 'ar' ? 'Switch to English' : 'تحويل للغة العربية'}
        >
          <Globe className="w-3.5 h-3.5 text-[#FF5722]" />
          <span>{lang === 'ar' ? 'EN' : 'AR'}</span>
        </button>

        {/* Action Button: Dynamic calculation overlay */}
        <button
          onClick={onEstimateClick}
          className="bg-[#FF5722] text-black font-sans font-semibold text-xs md:text-sm px-4 md:px-6 py-2.5 md:py-3 tracking-widest active:scale-95 hover:bg-orange-400 hover:shadow-lg hover:shadow-[#FF5722]/25 transition-all duration-300 rounded-xl uppercase flex items-center gap-1.5 select-none"
        >
          <span>{lang === 'ar' ? 'طلب عرض سعر' : 'Get Quote'}</span>
          {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
