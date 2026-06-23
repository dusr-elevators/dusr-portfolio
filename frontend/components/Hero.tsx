/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import { motion } from 'motion/react';
import { ArrowDown } from 'lucide-react';

interface HeroProps {
  onStartClick: () => void;
  lang: 'ar' | 'en';
}

export default function Hero({ onStartClick, lang }: HeroProps) {
  return (
    <section className="relative h-screen flex items-center px-6 md:px-16 overflow-hidden">
      {/* Background Graphic Element & Parallax Image */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="w-full h-full object-cover opacity-40 md:opacity-50 grayscale hover:grayscale-0 transition-all duration-1000 scale-105"
          alt={
            lang === 'ar'
              ? 'صورة داخلية لمصعد زجاجي حديث يصعد في بهو خرساني دقيق التصميم'
              : 'A modern glass elevator ascending through a high-end complex'
          }
          referrerPolicy="no-referrer"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD_C_PhMb3f5gpE9Qz7t0T24KElY75ATI4rqKhQbifvYkEXuluJ9-Rs8o2aXCY-PQgrzKmW1uKRrRZVon8wOolGKQemuEgkQEdM8ftGJnKFjqi2RogN0L4fGwznFv3OhUxr-5p2SSaCH5fpAjIxyc0QzU3apT-ALcWys7e5hWnLCUNUNeJmwbBtDHBgay2n6RT9uLZPA_HkRmIkEOu1ethdwXvrqBaWCfVWJNZ2BDTTGj5y1rKLbhbg0hzeRHnkN7FBwUOhr-eE6gQ"
        />
        {/* Soft linear gradient to blend perfectly into the black backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#131313]/5 to-[#131313] via-[#131313]/80"></div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#131313] to-transparent"></div>
      </div>

      {/* Main Hero Elements */}
      <div className="relative z-10 max-w-4xl mt-12">
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-1 bg-[#FF5722] h-20 md:h-24 mb-8 origin-top rounded-full hidden sm:block"
        ></motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-sans text-xs sm:text-sm uppercase tracking-widest text-[#FF5722] mb-4 font-semibold"
        >
          {lang === 'ar' ? 'الاسم الرائد في أنظمة المصاعد' : 'The Leading Name in Elevator Systems'}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-[64px] font-black tracking-tight leading-tight mb-6 text-[#e5e2e1]"
        >
          {lang === 'ar' ? (
            <>
              هندسة دقيقة.
              <br />
              <span className="text-[#c4c7c7] font-medium text-3xl sm:text-4xl md:text-[54px]">تجارب استثنائية.</span>
            </>
          ) : (
            <>
              Precise Engineering.
              <br />
              <span className="text-[#c4c7c7] font-medium text-3xl sm:text-4xl md:text-[54px]">Exceptional Journeys.</span>
            </>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-sans text-base sm:text-lg md:text-xl text-[#c4c7c7] max-w-xl mb-12 leading-relaxed"
        >
          {lang === 'ar'
            ? 'دسر شركة متخصصة في تركيب وصيانة وإصلاح المصاعد في الرياض وجميع مناطق المملكة العربية السعودية — مصاعد منزلية وتجارية وفاخرة بأعلى معايير الجودة والأمان.'
            : 'Dusr specializes in elevator installation, maintenance, and repair across Riyadh and all of Saudi Arabia — residential, commercial, and luxury elevators built to the highest standards of quality and safety.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center gap-4 sm:gap-6"
        >
          <button
            onClick={onStartClick}
            className="bg-[#FF5722] text-black font-sans font-bold text-sm px-8 md:px-10 py-4.5 md:py-5 uppercase tracking-widest hover:bg-orange-400 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-xl shadow-lg shadow-[#FF5722]/15"
          >
            {lang === 'ar' ? 'ابدأ مشروعك' : 'Begin Your Project'}
          </button>

          <a
            href="#services"
            className="border border-[#444748] text-[#e5e2e1] font-sans font-semibold text-sm px-6 py-4 rounded-xl hover:border-[#FF5722] hover:text-[#FF5722] hover:bg-white/5 transition-all duration-300"
          >
            {lang === 'ar' ? 'استكشف الحلول' : 'Explore Solutions'}
          </a>
        </motion.div>
      </div>

      {/* Decorative vertical elevator shaft indicator in coordinates */}
      <div
        dir="ltr"
        className={`absolute bottom-16 sm:bottom-24 flex flex-col items-center gap-4 hidden sm:flex ${
          lang === 'ar' ? 'left-6 md:left-16' : 'right-6 md:right-16'
        }`}
      >
        <div className="w-[1px] h-24 bg-[#444748] relative overflow-hidden rounded-full">
          <motion.div
            animate={{ y: [0, 96, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-0 left-0 w-full h-8 bg-[#FF5722] rounded-full"
          ></motion.div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#c4c7c7] opacity-60 flex items-center gap-1 mt-1">
          <ArrowDown className="w-3 h-3 text-[#FF5722] animate-bounce" />
          {lang === 'ar' ? 'التمرير للأسفل' : 'SCROLL DOWN'}
        </span>
      </div>
    </section>
  );
}
