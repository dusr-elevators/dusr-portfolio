/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Share2, Globe, ArrowUp, Shield } from 'lucide-react';
import Logo from './Logo';

interface FooterProps {
  lang: 'ar' | 'en';
}

export default function Footer({ lang }: FooterProps) {
  const [copied, setCopied] = useState(false);

  const handleScrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <footer className="w-full px-6 md:px-16 py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-12 bg-[#0e0e0e] border-t border-[#444748]/30">
      
      {/* 1. Brand statement block */}
      <div className="md:col-span-6 space-y-6">
        <Logo lang={lang} />
        <p className="font-sans text-sm text-[#c4c7c7] max-w-sm leading-relaxed">
          {lang === 'ar'
            ? 'الدقة المطلقة في كل حركة ميكانيكية. نبني معاً وبخطى واثقة مستقبل الاتصال العمودي والحركة الفارهة من خلال التفوق الهندسي والصراحة المعمارية.'
            : 'Absolute precision in every mechanical movement. Together, we confidently build the future of vertical connectivity and luxurious movement through engineering excellence and architectural integrity.'}
        </p>
      </div>

      {/* 2. Social connection and top action block */}
      <div className="md:col-span-6 flex flex-col justify-between items-start md:items-end text-left h-full">
        {/* Buttons */}
        <div className="flex gap-4 mb-8 items-center">
          {copied && (
            <span className="text-xs text-[#FF5722] font-mono animate-pulse">
              {lang === 'ar' ? 'تم النسخ!' : 'Copied!'}
            </span>
          )}
          <button
            onClick={handleScrollTop}
            title={lang === 'ar' ? 'العودة للأعلى' : 'Return to top'}
            className="w-10 h-10 flex items-center justify-center border border-[#444748] hover:border-[#FF5722] rounded-full text-[#c4c7c7] hover:text-[#FF5722] transition-all bg-transparent"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          
          <button
            title={lang === 'ar' ? 'نسخ رابط الموقع ومشاركته' : 'Share current portal link'}
            onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center border border-[#444748] hover:border-[#FF5722] rounded-full text-[#c4c7c7] hover:text-[#FF5722] transition-all bg-transparent"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Copyright labels with neat text */}
        <p className="font-sans text-xs text-[#c4c7c7] leading-relaxed md:text-right">
          {lang === 'ar' ? (
            <>
              © 2026 دسر لأنظمة المصاعد. جميع الحقوق محفوظة
            </>
          ) : (
            <>
              © {new Date().getFullYear()} Dusr Elevators. All Rights Reserved.
            </>
          )}
        </p>
      </div>

    </footer>
  );
}
