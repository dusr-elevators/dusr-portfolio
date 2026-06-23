/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import { useRouter } from 'next/navigation';
import { Users, Gauge } from 'lucide-react';
import { pathForLang, type Lang } from '@/lib/lang';
import Header from './Header';
import Hero from './Hero';
import BentoServices from './BentoServices';
import SafetyDiagnostic from './SafetyDiagnostic';
import ContactForm from './ContactForm';
import Footer from './Footer';

export default function Home({ lang }: { lang: Lang }) {
  const router = useRouter();

  // Switching language navigates to the other language's URL (its own page).
  const setLang = (next: Lang) => {
    if (next !== lang) router.push(pathForLang(next));
  };

  const handleScrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] selection:bg-[#FF5722] selection:text-white custom-scroll transition-colors duration-300">

      {/* 1. Complete top navigation block */}
      <Header lang={lang} setLang={setLang} onEstimateClick={handleScrollToContact} />

      {/* 2. Stunning immersive landing segment */}
      <Hero lang={lang} onStartClick={handleScrollToContact} />

      {/* 3. Bento grid of services & active calculators */}
      <BentoServices lang={lang} />

      {/* 4. Deep safety standards & interactive IoT diagnostic test dashboard */}
      <SafetyDiagnostic lang={lang} />

      {/* 5. About Section / "عن دسر" - Interactive statistics showcase */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-[#18181a] border-b border-[#444748]/20" id="about">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Text column (takes 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <span className="font-mono text-xs text-[#FF5722] font-semibold uppercase tracking-widest block">
              {lang === 'ar' ? 'عن شركة دسر للمصاعد' : 'ABOUT DUSR ELEVATORS'}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#e5e2e1] mt-2">
              {lang === 'ar' ? 'دسر — من أفضل شركات المصاعد في السعودية' : 'Dusr — A Leading Elevator Company in Saudi Arabia'}
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#c4c7c7] leading-relaxed">
              {lang === 'ar'
                ? 'دسر شركة سعودية متخصصة في تركيب وصيانة وإصلاح المصاعد في الرياض وجميع مناطق المملكة. نقدّم مصاعد منزلية وتجارية وفاخرة بأعلى معايير الجودة، مع فريق دعم وصيانة على مدار الساعة.'
                : 'Dusr is a Saudi company specializing in elevator installation, maintenance, and repair in Riyadh and across the Kingdom. We deliver residential, commercial, and luxury elevators to the highest quality standards, backed by 24/7 service and support.'}
            </p>

            {/* List of features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FF5722]/15 flex items-center justify-center text-[#FF5722]">
                  ✓
                </div>
                <span className="text-xs sm:text-sm text-[#e5e2e1] font-semibold">
                  {lang === 'ar' ? 'محركات صامتة خالية من التروس' : 'Silent Gearless Magnetics'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FF5722]/15 flex items-center justify-center text-[#FF5722]">
                  ✓
                </div>
                <span className="text-xs sm:text-sm text-[#e5e2e1] font-semibold">
                  {lang === 'ar' ? 'أنظمة كبح متعددة Redundancy' : 'Triple Safety Redundancy Gears'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#FF5722]/15 flex items-center justify-center text-[#FF5722]">
                  ✓
                </div>
                <span className="text-xs sm:text-sm text-[#e5e2e1] font-semibold">
                  {lang === 'ar' ? 'دعم فني واستجابة طوارئ ف فورية' : '24/7 Continuous Remote IoT Scan'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats column (takes 5 cols) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Stat 2 */}
            <div className="p-6 bg-[#202020] border border-[#444748]/50 rounded-2xl flex flex-col justify-between">
              <Gauge className="w-8 h-8 text-[#FF5722] mb-4" />
              <div>
                <span className="font-mono text-3xl font-black text-white block mb-1">99.89%</span>
                <span className="text-xs text-neutral-400">
                  {lang === 'ar' ? 'معدل الجاهزية والتشغيل الفعلي' : 'Average Uptime availability'}
                </span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-6 bg-[#202020] border border-[#444748]/50 rounded-2xl flex flex-col justify-between">
              <Users className="w-8 h-8 text-[#FF5722] mb-4" />
              <div>
                <span className="font-mono text-3xl font-black text-white block mb-1">24/7/365</span>
                <span className="text-xs text-neutral-400">
                  {lang === 'ar' ? 'فريق الدعم الفني وخدمات الإنقاذ والتدخل' : 'Continuous Engineering Support'}
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Dynamic Contact Section with feedback states */}
      <ContactForm lang={lang} />

      {/* 7. Beautifully aligned footer with return-top capabilities */}
      <Footer lang={lang} />

    </div>
  );
}
