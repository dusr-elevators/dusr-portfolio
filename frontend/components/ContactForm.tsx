/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { PhoneCall, MapPin, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContactFormProps {
  lang: 'ar' | 'en';
}

export default function ContactForm({ lang }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    projectEngineeringDepartment: 'تطوير تجاري',
    details: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const sectorsOptions = [
    { labelAr: 'تطوير تجاري', labelEn: 'Commercial Development' },
    { labelAr: 'سكني خاص (فلل وقصور)', labelEn: 'Private Residential (Villas & Palace)' },
    { labelAr: 'منشأة صناعية ثقيلة', labelEn: 'Heavy Industrial Facility' },
    { labelAr: 'طلب تحديث ميكانيكي', labelEn: 'Mechanical Modernization Request' },
  ];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const splitName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ') || '-';

    return { firstName, lastName };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const { firstName, lastName } = splitName(formData.name);
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

    try {
      const response = await fetch(`${apiBaseUrl}/api/contact-submissions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: formData.email,
          phone_number: formData.phone,
          project_engineering_department: formData.projectEngineeringDepartment,
          message: [
            `Company: ${formData.company}`,
            `Project Engineering Department: ${formData.projectEngineeringDepartment}`,
            '',
            formData.details,
          ].join('\n'),
        }),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      const data = await response.json();
      setReference(`DUSR-REQ-${String(data.id ?? Math.floor(Math.random() * 900000 + 100000)).padStart(6, '0')}`);
      setIsSubmitting(false);
      setSubmitted(true);
    } catch {
      setIsSubmitting(false);
      setError(
        lang === 'ar'
          ? 'تعذر إرسال الطلب حالياً. يرجى المحاولة مرة أخرى.'
          : 'We could not send the request right now. Please try again.',
      );
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      projectEngineeringDepartment: 'تطوير تجاري',
      details: '',
    });
    setError('');
  };

  return (
    <section className="py-24 md:py-32 px-6 md:px-16 bg-[#131111]" id="contact">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">

        {/* Info Column (takes 5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <span className="font-mono text-xs text-[#FF5722] font-semibold uppercase tracking-widest block mb-4">
              {lang === 'ar' ? 'تواصل مع مكتب الاستشارات الهندسي' : 'COMMUNICATE WITH MAIN OFFICE'}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-[#e5e2e1] leading-tight mb-8">
              {lang === 'ar' ? 'ابدأ تحول الحركة العمودية' : 'Begin the Transformation'}
            </h2>
            <p className="font-sans text-base text-[#c4c7c7] leading-relaxed mb-12">
              {lang === 'ar'
                ? 'مستشارونا الهندسيون متواجدون ومستعدون بالكامل لتصميم وتحديد المواصفات الميكانيكية للمصاعد الخاصة بمشاريعكم العقارية الفخمة. من الفكرة الإنشائية الأولى وحتى الصيانة والتشغيل الدائم، نحن شريكك الموثوق للمدى الطويل.'
                : 'Our engineering advisors are fully prepared to design and specify mechanical parameters for your luxury real estate developments. From the first structural draft to ongoing maintenance and long-term operations, we are your reliable partner for the long haul.'}
            </p>

            {/* Structured Contact Details */}
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 border border-[#444748] rounded-xl flex items-center justify-center text-[#FF5722] bg-[#FF5722]/5 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sans text-sm font-bold text-[#e5e2e1] mb-1">
                    {lang === 'ar' ? 'المقر الرئيسي' : 'Headquarters'}
                  </h4>
                  <p className="font-sans text-xs sm:text-sm text-[#c4c7c7] leading-relaxed">
                    {lang === 'ar'
                      ? 'الرياض - طريق خريص'
                      : 'Riyadh, Khurais Road'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 border border-[#444748] rounded-xl flex items-center justify-center text-[#FF5722] bg-[#FF5722]/5 shrink-0">
                  <PhoneCall className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-sans text-sm font-bold text-[#e5e2e1] mb-1">
                    {lang === 'ar' ? 'مكتب الاستجابة والدعم الفني السريع' : 'High Performance Support Lines'}
                  </h4>
                  <p className="font-sans text-xs sm:text-sm text-[#c4c7c7] leading-relaxed">
                    {lang === 'ar' ? (
                      <>
                        استجابة هندسية على مدار الساعة طوال أيام الأسبوع:{' '}
                        <span dir="ltr" className="inline-block unicode-bidi-isolate">
                          +966 53 970 5301
                        </span>
                      </>
                    ) : (
                      'Immediate Technical Dispatch 24/7 hotline: +966 53 970 5301'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Form Column (takes 7 cols) */}
        <div className="lg:col-span-7 bg-[#202020] p-6 sm:p-12 border border-[#444748]/50 rounded-2xl relative overflow-hidden shadow-2xl">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Name field */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs uppercase tracking-wider text-neutral-400">
                      {lang === 'ar' ? 'الاسم الكامل للعميل / المندوب' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={lang === 'ar' ? 'أحمد عبدالله' : 'e.g. Eric Larsson'}
                      className="w-full bg-[#131313] border border-[#444748]/70 focus:border-[#FF5722] outline-none p-4 font-sans text-sm text-[#e5e2e1] transition-all rounded-xl"
                    />
                  </div>

                  {/* Company field */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs uppercase tracking-wider text-neutral-400">
                      {lang === 'ar' ? 'مؤسسة التطوير العقاري أو الشركة' : 'Organization Name'}
                    </label>
                    <input
                      type="text"
                      name="company"
                      required
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder={lang === 'ar' ? 'شركة التطوير العقاري' : 'e.g. Premium Architecture Corp'}
                      className="w-full bg-[#131313] border border-[#444748]/70 focus:border-[#FF5722] outline-none p-4 font-sans text-sm text-[#e5e2e1] transition-all rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block font-mono text-xs uppercase tracking-wider text-neutral-400">
                      {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder={lang === 'ar' ? 'name@example.com' : 'name@example.com'}
                      className="w-full bg-[#131313] border border-[#444748]/70 focus:border-[#FF5722] outline-none p-4 font-sans text-sm text-[#e5e2e1] transition-all rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block font-mono text-xs uppercase tracking-wider text-neutral-400">
                      {lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder={lang === 'ar' ? '+966 5X XXX XXXX' : '+966 5X XXX XXXX'}
                      className="w-full bg-[#131313] border border-[#444748]/70 focus:border-[#FF5722] outline-none p-4 font-sans text-sm text-[#e5e2e1] transition-all rounded-xl"
                    />
                  </div>
                </div>

                {/* Sector option selection */}
                <div className="space-y-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-neutral-400">
                    {lang === 'ar' ? 'القطاع الهندسي للمشروع المطلوب' : 'Project Engineering Department'}
                  </label>
                  <div className="relative">
                    <select
                      name="projectEngineeringDepartment"
                      value={formData.projectEngineeringDepartment}
                      onChange={handleInputChange}
                      className="w-full bg-[#131111] border border-[#444748]/70 focus:border-[#FF5722] outline-none p-4 font-sans text-sm text-[#e5e2e1] transition-all appearance-none rounded-xl"
                    >
                      {sectorsOptions.map((opt, i) => (
                        <option key={i} value={opt.labelAr} className="bg-[#131111]">
                          {lang === 'ar' ? opt.labelAr : opt.labelEn}
                        </option>
                      ))}
                    </select>
                    {/* Decorative drop caret */}
                    <div className={`absolute top-[48%] translate-y-[-50%] pointer-events-none text-neutral-400 ${
                      lang === 'ar' ? 'left-4' : 'right-4'
                    }`}>
                      ▼
                    </div>
                  </div>
                </div>

                {/* Details text area */}
                <div className="space-y-2">
                  <label className="block font-mono text-xs uppercase tracking-wider text-neutral-400">
                    {lang === 'ar' ? 'تفاصيل الاستفسار ومواصفات المبنى المطلوبة' : 'Enquiry Description & Special Parameters'}
                  </label>
                  <textarea
                    name="details"
                    required
                    rows={4}
                    value={formData.details}
                    onChange={handleInputChange}
                    placeholder={lang === 'ar' ? 'مواصفات المشروع الإنشائي وطول البئر المقدر ومقاسات المقصورة...' : 'Add information about shaft specs, glass panoramics or speed metrics...'}
                    className="w-full bg-[#131313] border border-[#444748]/70 focus:border-[#FF5722] outline-none p-4 font-sans text-sm text-[#e5e2e1] transition-all rounded-xl resize-none"
                  ></textarea>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </p>
                )}

                {/* Secure submission button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#FF5722] text-black font-sans font-bold py-5 tracking-widest uppercase hover:bg-orange-400 hover:shadow-lg hover:shadow-[#FF5722]/15 active:scale-95 disabled:opacity-50 transition-all duration-300 rounded-xl flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري تأمين وإرسال الطلب...' : 'Transmitting to main registers...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'إرسال طلب هندسي متكامل' : 'TRANSIT ENGINEERING REQUEST'}</span>
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500/25 border border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-black text-emerald-400">
                    {lang === 'ar' ? 'تم استلام كشف الاستفسار وتأمين الاتصال' : 'Technical Submission Safe'}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#c4c7c7] leading-relaxed max-w-md mx-auto">
                    {lang === 'ar'
                      ? `أهلاً بك، تم بنجاح إدراج مواصفات مشروع ${formData.company} بقسم ${formData.projectEngineeringDepartment} في لوحة تخطيط دسر.`
                      : `Your technical files have been received safely. Team of Dusr technicians will audit components metrics shortly.`}
                  </p>
                </div>

                <div className="bg-[#131313] p-4 rounded-xl border border-[#444748]/50 inline-block">
                  <span className="block text-[10px] text-neutral-400 font-mono tracking-widest uppercase mb-1">
                    {lang === 'ar' ? 'رقم التتبع المرجعي للمعاينة' : 'ESTIMATE TRANSACTION REF'}
                  </span>
                  <span className="font-mono text-sm text-[#FF5722] font-bold">{reference}</span>
                </div>

                <button
                  onClick={handleReset}
                  className="block bg-transparent hover:bg-white/5 border border-[#444748] text-[#e5e2e1] px-6 py-3 rounded-xl mx-auto text-xs font-bold transition-all"
                >
                  {lang === 'ar' ? 'إرسال استفسار إضافي' : 'Send another inquiry'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
