/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShieldCheck } from 'lucide-react';

interface SafetyDiagnosticProps {
  lang: 'ar' | 'en';
}

export default function SafetyDiagnostic({ lang }: SafetyDiagnosticProps) {
  return (
    <section className="py-24 md:py-32 px-6 md:px-16 bg-[#0e0e0e] border-t border-b border-[#444748]/30" id="maintenance">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

        {/* Right side / Left side description depending on RTL */}
        <div className="space-y-8">
          <span className="font-mono text-xs text-[#FF5722] font-semibold uppercase tracking-widest bg-[#FF5722]/5 border border-[#FF5722]/20 px-3.5 py-1 rounded-full inline-block">
            {lang === 'ar' ? 'الأمان الهندسي والجاهزية المتكاملة' : 'ABSOLUTE STRUCTURAL RIGOR'}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-[#e5e2e1] leading-tight">
            {lang === 'ar' ? 'هندسة للأمان المطلق' : 'Engineered for Absolute Safety'}
          </h2>
          <p className="font-sans text-base sm:text-lg text-[#c4c7c7] leading-relaxed">
            {lang === 'ar'
              ? 'الأمان في دسر ليس مجرد ميزة ملحقة — بل هو الأساس لفلسفتنا الهندسية المعمارية بالكامل. يتجاوز كل مصعد نقوم بتركيبه المعايير الدولية الصارمة EN81 لسلامة الركاب في الاتحاد الأوروبي و ASME A17.1 الأمريكية.'
              : 'Our zero-accident benchmark dictates every design choice. We engineer to triple redundancy configurations that vastly exceed typical building fire and structural code guidelines.'}
          </p>

          <div className="space-y-8 pt-4">
            {/* Multiple Brake Feature */}
            <div className="flex gap-4">
              <div className="w-12 h-12 flex items-center justify-center border border-[#FF5722] shrink-0 rounded-xl bg-[#FF5722]/5">
                <ShieldCheck className="w-6 h-6 text-[#FF5722]" />
              </div>
              <div>
                <h4 className="font-sans text-sm font-bold text-[#e5e2e1] mb-2 uppercase tracking-wide">
                  {lang === 'ar' ? 'أنظمة كبح متعددة المسارات' : 'Triple-Redundant Mechanical Braking'}
                </h4>
                <p className="font-sans text-xs sm:text-sm text-[#c4c7c7] leading-relaxed">
                  {lang === 'ar'
                    ? 'تضمن الفرامل الكهرومغناطيسية والفرامل الميكانيكية الابتكارية التوقف التام والآمن للمصعد في غضون 0.2 ثانية فقط عند استشعار أدنى تسارع أو انحراف في توازن الحبال.'
                    : 'A combined electro-mechanical safety gear stops the cabin instantly within 0.2 seconds should any steel rope strain disparity exceed 5%.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Log Card - Fully Interactive IoT Panel */}
        <div className="bg-[#202020] p-6 sm:p-10 border border-[#444748]/50 rounded-2xl relative overflow-hidden shadow-2xl">

          <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#444748]/30">
            <div>
              <h3 className="font-display text-sm font-bold text-[#e5e2e1] uppercase tracking-wider">
                {lang === 'ar' ? 'سجل الصيانة والجاهزية الفنية للشبكة' : 'LIVE TECHNICAL MAINTENANCE LOG'}
              </h3>
            </div>
          </div>

          {/* Dotted parameters listings */}
          <div className="space-y-6">

            {/* 1. Tension */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-sans font-medium text-neutral-300">
                {lang === 'ar' ? 'فحص التوتر المغناطيسي الأساسي' : 'Primary Wire Tension Strain'}
              </span>
              <div className="dotted-leader"></div>
              <span className="font-mono font-bold text-[#FF5722]">
                {lang === 'ar' ? 'طبيعي' : 'Nominal'}
              </span>
            </div>

            {/* 2. Hydraulics */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-sans font-medium text-neutral-300">
                {lang === 'ar' ? 'سلامة الختم والضغط الهيدروليكي' : 'Hydraulic Gasket Fluid Pressure'}
              </span>
              <div className="dotted-leader"></div>
              <span className="font-mono font-bold text-[#e5e2e1]">
                {lang === 'ar' ? 'مثالي' : 'Optimal'}
              </span>
            </div>

            {/* 3. Heat sink temps */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-sans font-medium text-neutral-300">
                {lang === 'ar' ? 'مشتت حرارة وحدة المعالجة المركزية' : 'Controller Processor Temperature'}
              </span>
              <div className="dotted-leader"></div>
              <span className="font-mono font-bold text-amber-400">
                {lang === 'ar' ? '42° م' : '42°C'}
              </span>
            </div>

            {/* 4. Door cycles */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-sans font-medium text-neutral-300">
                {lang === 'ar' ? 'دورة فحص قفل الباب الهوائي' : 'Cabin Pneumatic Door Lock Switch'}
              </span>
              <div className="dotted-leader"></div>
              <span className="font-mono font-bold text-emerald-400">
                {lang === 'ar' ? 'ناجح' : 'Passed'}
              </span>
            </div>

            {/* 5. Emergency power */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-sans font-medium text-neutral-300">
                {lang === 'ar' ? 'حمل بطارية الطوارئ وعاكس الطاقة' : 'Emergency Backup Power Pack'}
              </span>
              <div className="dotted-leader"></div>
              <span className="font-mono font-bold text-[#FF5722]">
                {lang === 'ar' ? 'جاهز كلياً' : 'Ready'}
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
