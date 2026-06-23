/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Factory, Zap, ShieldCheck, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

interface BentoServicesProps {
  lang: 'ar' | 'en';
}

export default function BentoServices({ lang }: BentoServicesProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const sectorsInfo = [
    {
      id: 'commercial',
      titleAr: 'أنظمة الحركة الكثيفة',
      titleEn: 'Heavy Traffic Systems',
      num: '01',
      tagAr: 'تجاري',
      tagEn: 'Commercial',
      descAr: 'مصممة لتلبية متطلبات ناطحات السحاب المزدحمة، تجمع مصاعدنا التجارية بين التحليل التنبئي للحركة والتحكم المتطور المتزامن.',
      descEn: 'Engineered for demanding skyscraper volume, our systems combine predictive traffic distribution algorithms with hyper-smooth motion control.',
      metricsAr: ['سرعة تصل إلى 10م/ث', 'تحكم استشرافي بالذكاء الاصطناعي', 'كفاءة طاقة قصوى'],
      metricsEn: ['Up to 10 m/s travel', 'Anticipatory dispatch AI', 'Ultra energy performance'],
    },
    {
      id: 'residential',
      titleAr: 'فخامة خاصة للفلل والقصور',
      titleEn: 'Private Residences & Villas',
      num: '02',
      tagAr: 'سكني',
      tagEn: 'Residential',
      descAr: 'مصاعد منزلية مصممة خصيصاً بمقاسات ومواد فارهة لتندمج بسلاسة داخل الديكور، مع محركات مغناطيسية صامتة تماماً توفر ركوباً فخماً.',
      descEn: 'Bespoke residential lifts built to custom space parameters, blending layout designs with silent gearless engines.',
      metricsAr: ['محرك مغناطيسي صامت', 'مواد فاخرة مخصصة', 'بلا حفرة عميقة'],
      metricsEn: ['Magnet silent drive', 'Luxury custom finishes', 'No pit required'],
    },
    {
      id: 'industrial',
      titleAr: 'شحن ثقيل وحركة عملاقة',
      titleEn: 'Heavy Cargo & Industrial',
      num: '03',
      tagAr: 'صناعي',
      tagEn: 'Industrial',
      descAr: 'حلول قوية مصممة لتحمل ظروف الضغط والأوزان الضخمة في المصانع الكبرى، الموانئ الجافة، ومراكز الشحن الإقليمية.',
      descEn: 'Rugged cargo units built to withstand brutal load factors in manufacturing plants, dry docks, and dry storage hubs.',
      metricsAr: ['حمولات تصل إلى 20 طن', 'حماية ممتصة للصدمات', 'فولاذ صناعي مكثف'],
      metricsEn: ['Up to 20 Tons capacity', 'Shock absorption tech', 'Heavy-gauge steel cladding'],
    }
  ];

  return (
    <section className="py-24 md:py-32 px-6 md:px-16 bg-[#131313]" id="services">
      {/* Section Header */}
      <div
        className={`mb-20 border-[#FF5722] pr-8 ${lang === 'ar' ? 'border-r-4 text-right' : 'border-l-4 text-left border-r-0 pl-8 pr-0'}`}
      >
        <span className="font-mono text-xs uppercase tracking-widest text-[#FF5722] font-semibold">
          {lang === 'ar' ? 'خدمات المصاعد المتكاملة' : 'OUR ELEVATOR SERVICES'}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold mt-2 text-[#e5e2e1]">
          {lang === 'ar' ? 'حلول تركيب وصيانة المصاعد من دسر' : 'Dusr Elevator Installation & Maintenance'}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

        {/* Commercial - Large Bento 8-column layout */}
        <div className="md:col-span-8 group relative overflow-hidden bg-[#202020] border border-[#444748]/50 min-h-[400px] rounded-2xl flex flex-col justify-end p-8 md:p-12 hover:border-[#FF5722]/50 transition-all duration-300">
          <div className="absolute inset-0 grayscale group-hover:grayscale-0 transition-all duration-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-500"
              alt="High density commercial workspace elevator glass view"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9v20uAIm_WaQpscZMrBKz2vDiXRR52w7ed2rpGBDvwdaomFKw5CbNLZN9DVFJ7YFh5ZKQKiryqqjWQe4Xd_kSk8Vt8NvJgsQX7kGehWlSVu4mFX2Owwkc1JrAazpEHjSEWnCIIxbAbR03R6WxNSM8h2KbrTU6JaOuowaHeOF7lursHcAlw7xdVmZRfdHoTDQYQdrpzLSqD9h1WAklrO6gDyDBJjd4p3WHjSLPQcokuItXsBbwRgyQsKqAjossRgqeK1CF7jSpqlxp"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-[#131313]/50 to-transparent"></div>
          </div>
          <div className="relative z-10 flex flex-col justify-end h-full">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[11px] font-bold text-[#FF5722] bg-[#FF5722]/10 px-2.5 py-1 rounded">
                {lang === 'ar' ? '01 / تجاري' : '01 / Commercial'}
              </span>
            </div>
            <h3 className="font-display text-2xl md:text-3xl font-bold mb-4 text-[#e5e2e1]">
              {lang === 'ar' ? 'مصاعد تجارية وأنظمة حركة كثيفة' : 'Commercial Elevators & High-Traffic Systems'}
            </h3>
            <p className="font-sans text-sm sm:text-base text-[#c4c7c7] max-w-xl mb-4 leading-relaxed">
              {lang === 'ar'
                ? 'نركّب مصاعد تجارية ومصاعد أبراج عالية الأداء مصممة لتلبية متطلبات الحركة الكثيفة، مع توزيع ذكي تنبّئي وتحكم سلس وسريع.'
                : 'We install commercial and high-rise tower elevators engineered for heavy passenger volumes, with predictive dispatch, smooth regenerative drives, and zero structural vibration.'}
            </p>
          </div>
        </div>

        {/* Private Luxury - Small Bento Card */}
        <div className="md:col-span-4 group relative overflow-hidden bg-[#202020] border border-[#444748]/50 min-h-[400px] rounded-2xl p-8 flex flex-col justify-between hover:border-[#FF5722]/50 transition-all duration-300">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[11px] font-bold text-[#FF5722] bg-[#FF5722]/10 px-2.5 py-1 rounded">
                  {lang === 'ar' ? '02 / سكني' : '02 / Residential'}
                </span>
                <span className="font-display font-black text-xl text-neutral-600">DUSR</span>
              </div>
              <h3 className="font-display text-2xl font-extrabold mb-4 text-[#e5e2e1]">
                {lang === 'ar' ? 'مصاعد منزلية فاخرة للفلل' : 'Luxury Home Elevators for Villas'}
              </h3>
              <p className="font-sans text-sm text-[#c4c7c7] leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'مصاعد منزلية فاخرة للفلل والقصور في السعودية، صُممت بدقة لتلائم المساحات المختلفة بحركة صامتة تماماً ولمسات فاخرة لراحة عائلتك.'
                  : 'Luxury home elevators for villas and palaces, precisely designed to fit any space with silent gearless motion and premium marble, timber, or panoramic glass finishes.'}
              </p>
            </div>

            <button
              onClick={() => setSelectedSector(selectedSector === 'residential' ? null : 'residential')}
              className="text-xs text-[#FF5722] font-semibold hover:underline flex items-center gap-1 self-start active:scale-95 transition-all pb-1 border-b border-[#FF5722]/20"
            >
              <span>{lang === 'ar' ? 'مواصفات الفخامة والقياسات' : 'Luxury Materials & Load Factors'}</span>
              {lang === 'ar' ? <ArrowLeft className="w-3.5 h-3.5 text-[#FF5722]" /> : <ArrowRight className="w-3.5 h-3.5 text-[#FF5722]" />}
            </button>
          </div>

          <AnimatePresence>
            {selectedSector === 'residential' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-x-4 bottom-4 p-5 bg-[#131313] border border-[#FF5722]/30 rounded-xl flex flex-col gap-2 z-20 shadow-2xl"
              >
                <div className="flex justify-between items-center pb-2 border-b border-[#202020]">
                  <span className="text-xs font-bold text-[#e5e2e1]">
                    {lang === 'ar' ? 'ملمس وأناقة متكاملة' : 'Elegance & Finishes'}
                  </span>
                  <button onClick={() => setSelectedSector(null)} className="text-[10px] text-neutral-400 hover:text-white">✕</button>
                </div>
                <ul className="space-y-1.5 text-xs text-[#c4c7c7] list-none p-0 pr-0">
                  {sectorsInfo[1].metricsAr.map((m, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></span>
                      <span>{lang === 'ar' ? m : sectorsInfo[1].metricsEn[i]}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Industrial - Small Bento Card */}
        <div className="md:col-span-4 group relative overflow-hidden bg-[#202020] border border-[#444748]/50 min-h-[400px] rounded-2xl p-8 flex flex-col justify-between hover:border-[#FF5722]/50 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 flex items-center justify-center border border-[#444748] rounded-xl text-[#FF5722] bg-[#FF5722]/5">
              <Factory className="w-6 h-6" />
            </div>
            <span className="font-mono text-[11px] font-bold text-[#FF5722] bg-[#FF5722]/10 px-2.5 py-1 rounded">
              {lang === 'ar' ? '03 / صناعي' : '03 / Industrial'}
            </span>
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold mb-4 text-[#e5e2e1]">
              {lang === 'ar' ? 'مصاعد صناعية وشحن ثقيل' : 'Industrial & Heavy Cargo Elevators'}
            </h3>
            <p className="font-sans text-sm text-[#c4c7c7] leading-relaxed mb-4">
              {lang === 'ar'
                ? 'مصاعد صناعية متينة لتركيب الأحمال الثقيلة في المصانع ومراكز اللوجستيات، مصممة لتحمّل الضغوط والأوزان الضخمة.'
                : 'Heavy-duty, shockproof industrial elevators for factories and logistics hubs, engineered for forklift operations and aggressive cargo loading up to 20 tons.'}
            </p>
          </div>
        </div>

        {/* Modernization and Energetic savings - 8 Column Layout with Sliders */}
        <div className="md:col-span-8 bg-[#2a2a2a] border border-[#444748]/50 min-h-[400px] rounded-2xl p-8 md:p-12 flex flex-col justify-between hover:border-[#FF5722]/50 transition-all duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">

            {/* Left Column Description */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[11px] font-bold text-[#FF5722] bg-[#FF5722]/10 px-2.5 py-1 rounded">
                  {lang === 'ar' ? '04 / تحديث وتطوير' : '04 / Modernization'}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#FF5722] animate-ping"></span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-black mb-4 text-[#e5e2e1]">
                {lang === 'ar' ? 'تحديث وإصلاح المصاعد القديمة' : 'Elevator Modernization & Repair'}
              </h3>
              <p className="font-sans text-sm text-[#c4c7c7] leading-relaxed mb-6">
                {lang === 'ar'
                  ? 'نتولّى إصلاح وصيانة وتحديث المصاعد القديمة، بدمج أنظمة ذكية ومحركات حديثة لرفع كفاءة التشغيل والأمان بنسبة تفوق 40%.'
                  : 'We repair, maintain, and modernize ageing elevators — fitting smart controls and efficient drives to boost performance and safety dramatically.'}
              </p>
            </div>

            {/* Right Column Metrics Display */}
            <div className="space-y-6 bg-[#131313] p-6 rounded-2xl border border-[#444748]/50 shadow-inner">
              <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest border-b border-[#202020] pb-2.5">
                {lang === 'ar' ? 'مؤشرات الأداء بعد التطوير' : 'PEAK UPGRADE STANDARDS'}
              </h4>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[#202020] pb-2">
                  <span className="font-sans text-xs text-neutral-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-[#FF5722]" />
                    {lang === 'ar' ? 'توفير الطاقة والكهرباء' : 'Power Generation Saved'}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#FF5722]">35%+</span>
                </div>

                <div className="flex justify-between items-center border-b border-[#202020] pb-2">
                  <span className="font-sans text-xs text-neutral-300 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#FF5722]" />
                    {lang === 'ar' ? 'زيادة زمن وتوفر الخدمة' : 'Increased Uptime Factor'}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#FF5722]">22%+</span>
                </div>

                <div className="flex justify-between items-center pb-1">
                  <span className="font-sans text-xs text-neutral-300 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FF5722]" />
                    {lang === 'ar' ? 'انخفاض وقت استجابة الانتظار' : 'Response Wait reduction'}
                  </span>
                  <span className="font-mono text-sm font-bold text-[#FF5722]">-15%</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
