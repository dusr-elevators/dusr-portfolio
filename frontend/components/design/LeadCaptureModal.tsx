'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { LeadDetails } from './types';
import type { Lang } from '@/lib/lang';

type FieldErrors = Partial<Record<keyof LeadDetails, string>>;

// Permissive on purpose: the site is bilingual and draws Gulf-wide enquiries, so
// this is not restricted to Saudi 05XXXXXXXX / +9665XXXXXXXX.
const MOBILE_PATTERN = /^\+?[\d\s]{8,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLead(details: LeadDetails, lang: Lang): FieldErrors {
  const isAr = lang === 'ar';
  const errors: FieldErrors = {};

  const name = details.full_name.trim();
  if (!name) errors.full_name = isAr ? 'الاسم مطلوب' : 'Please enter your name';
  else if (name.length > 100) errors.full_name = isAr ? 'الاسم طويل جداً' : 'That name is too long';

  const email = details.email.trim();
  if (!email) errors.email = isAr ? 'البريد الإلكتروني مطلوب' : 'Please enter your email';
  else if (!EMAIL_PATTERN.test(email)) {
    errors.email = isAr ? 'صيغة البريد الإلكتروني غير صحيحة' : 'That email address looks incorrect';
  }

  const mobile = details.mobile.trim();
  if (!mobile) errors.mobile = isAr ? 'رقم الجوال مطلوب' : 'Please enter your mobile number';
  else if (!MOBILE_PATTERN.test(mobile)) {
    errors.mobile = isAr ? 'رقم الجوال غير صحيح' : 'That mobile number looks incorrect';
  }

  return errors;
}

interface LeadCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (details: LeadDetails) => void;
  lang: Lang;
  submitting?: boolean;
  error?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function LeadCaptureModal({
  open, onClose, onSubmit, lang, submitting = false, error,
}: LeadCaptureModalProps) {
  const isAr = lang === 'ar';
  const [details, setDetails] = useState<LeadDetails>({ full_name: '', email: '', mobile: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed: LeadDetails = {
      full_name: details.full_name.trim(),
      email: details.email.trim(),
      mobile: details.mobile.trim(),
    };
    const found = validateLead(trimmed, lang);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(trimmed);
  };

  const field = (
    key: keyof LeadDetails,
    label: string,
    type: string,
    autoComplete: string,
    ref?: React.RefObject<HTMLInputElement | null>,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`lead-${key}`} className="text-xs text-[#9a9a9a]">
        {label}
      </label>
      <input
        id={`lead-${key}`}
        ref={ref}
        type={type}
        autoComplete={autoComplete}
        dir={key === 'mobile' || key === 'email' ? 'ltr' : undefined}
        value={details[key]}
        onChange={e => setDetails({ ...details, [key]: e.target.value })}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `lead-${key}-error` : undefined}
        className={`rounded-xl border-2 bg-[#1a1a1a] px-4 py-3 text-sm text-[#e5e2e1] outline-none transition-colors ${
          errors[key] ? 'border-red-500' : 'border-[#2a2a2a] focus:border-[#FF5722]'
        }`}
      />
      {errors[key] && (
        <p id={`lead-${key}-error`} role="alert" className="text-xs text-red-400">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? 'استلام التصميم' : 'Receive your elevator design'}
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#131313] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? 'إغلاق' : 'Close'}
          className={`absolute top-4 text-[#888] hover:text-[#e5e2e1] ${isAr ? 'left-4' : 'right-4'}`}
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-[#e5e2e1]">
          {isAr ? 'استلم تصميمك بالبريد' : 'Get your design by email'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#9a9a9a]">
          {isAr
            ? 'أدخل بياناتك وسنرسل لك تصميم المصعد بصيغة PDF.'
            : 'Enter your details and we will email you the elevator design as a PDF.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mt-5 flex flex-col gap-4">
            {field('full_name', isAr ? 'الاسم' : 'Full name', 'text', 'name', firstFieldRef)}
            {field('email', isAr ? 'البريد الإلكتروني' : 'Email', 'email', 'email')}
            {field('mobile', isAr ? 'رقم الجوال' : 'Mobile number', 'tel', 'tel')}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
              submitting
                ? 'cursor-not-allowed bg-[#2a2a2a] text-[#666]'
                : 'bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/25 hover:bg-[#e64a19]'
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isAr ? 'إرسال' : 'Send my design'}
          </button>
        </form>

        {/*
          No `/privacy-policy` route exists anywhere in this project (verified: not
          under app/[lang], not a public backend URL, not linked from the footer).
          Rendered as plain text rather than a dead <a> link.
        */}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-[#666]">
          {isAr
            ? 'بإرسالك البيانات فإنك توافق على سياسة الخصوصية.'
            : 'By submitting you agree to our Privacy Policy.'}
        </p>
      </div>
    </div>
  );
}
