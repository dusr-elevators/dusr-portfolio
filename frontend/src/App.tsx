/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import BentoServices from './components/BentoServices';
import SafetyDiagnostic from './components/SafetyDiagnostic';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import { motion } from 'motion/react';
import { ShieldCheck, Users, Gauge, Zap } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.classList.add('dark');
  }, [lang]);

  const handleScrollToContact = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#131313] min-h-screen text-[#e5e2e1] selection:bg-[#FF5722] selection:text-white custom-scroll transition-colors duration-300">
      
      {/* 1. Complete top navigation block */}
      <Header
        lang={lang}
        setLang={setLang}
        onEstimateClick={handleScrollToContact}
      />

      {/* 2. Stunning immersive landing segment */}
      <Hero
        lang={lang}
        onStartClick={handleScrollToContact}
      />

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
              {lang === 'ar' ? 'رحلة التفوق المعماري والسرعة' : 'SWISS PRECISION IN EVERY UNIT'}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#e5e2e1] mt-2">
              {lang === 'ar' ? 'الاسم الرائد في أنظمة الحركة والتصميم الرقمي' : 'Global Pioneers of Vertical Mobility'}
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#c4c7c7] leading-relaxed">
              {lang === 'ar'
                ? 'تأسست دسر لتغيير المفهوم التقليدي للمصاعد. نحن لا ننظر للمصعد كأداة ميكانيكية فحسب، بل هو تحفة معمارية متكاملة تزيد من فخامة البناء وتوفر تجربة ركوب صامتة تفيض بالسلام واليسر الفائق.'
                : 'Formulate to surpass simplistic gear mechanics, Dusr defines the intersection between strict aerospace grade safety tolerances and architectural luxury finishes.'}
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
