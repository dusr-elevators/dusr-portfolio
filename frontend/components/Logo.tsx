/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface LogoProps {
  className?: string;
  showText?: boolean;
  lang?: 'ar' | 'en';
}

export default function Logo({ className = '', showText = true, lang = 'ar' }: LogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={lang === 'ar' ? 'شعار دسر' : 'Dusr logo'}
        className={`h-14 w-auto object-contain ${showText ? 'max-w-[180px]' : 'max-w-[64px]'}`}
      />
    </div>
  );
}
