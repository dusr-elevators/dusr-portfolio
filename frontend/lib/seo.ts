/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from 'next';
import { SITE_URL, urlForLang, type Lang } from './lang';

const HREFLANG = {
  ar: SITE_URL,
  en: `${SITE_URL}/en`,
  'x-default': SITE_URL,
};

const TEXT: Record<Lang, { title: string; description: string; ogDescription: string; siteName: string; ogLocale: string }> = {
  ar: {
    title: 'شركة دسر للمصاعد | تركيب وصيانة المصاعد في السعودية',
    description:
      'دسر شركة مصاعد في السعودية متخصصة في تركيب وصيانة وإصلاح المصاعد — مصاعد منزلية وتجارية وفاخرة في الرياض وجميع المناطق، بأعلى معايير الجودة والأمان ودعم فني على مدار الساعة.',
    ogDescription:
      'شركة دسر لتركيب وصيانة وإصلاح المصاعد في الرياض والسعودية — مصاعد منزلية وفاخرة بأعلى معايير الأمان.',
    siteName: 'دسر',
    ogLocale: 'ar_SA',
  },
  en: {
    title: 'Dusr Elevators | Elevator Installation & Maintenance, Saudi Arabia',
    description:
      'Dusr is an elevator company in Saudi Arabia specializing in elevator installation, maintenance, and repair — residential, commercial, and luxury elevators in Riyadh and nationwide, built to the highest safety standards with 24/7 support.',
    ogDescription:
      'Dusr — elevator installation, maintenance & repair in Riyadh and across Saudi Arabia. Residential and luxury elevators, safety first.',
    siteName: 'Dusr',
    ogLocale: 'en_US',
  },
};

/** Server-side base for talking to Django (internal Docker network in prod). */
const apiBase = process.env.API_INTERNAL_URL || SITE_URL;

/**
 * Admin-managed keywords for the home page. Best-effort: returns undefined if
 * the API is unreachable so metadata generation never fails the build/render.
 * (Note: <meta keywords> is ignored by Google for ranking; kept for parity.)
 */
async function fetchHomeKeywords(lang: Lang): Promise<string | undefined> {
  try {
    const res = await fetch(`${apiBase}/api/seo-keywords/`, { next: { revalidate: 3600 } });
    if (!res.ok) return undefined;
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.results ?? []);
    const home = list.find((k: { page?: string }) => k.page === 'home');
    if (!home) return undefined;
    return lang === 'ar' ? home.keywords_ar : home.keywords_en;
  } catch {
    return undefined;
  }
}

export async function homeMetadata(lang: Lang): Promise<Metadata> {
  const t = TEXT[lang];
  const url = urlForLang(lang);
  const keywords = await fetchHomeKeywords(lang);

  return {
    metadataBase: new URL(SITE_URL),
    title: t.title,
    description: t.description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: url,
      languages: HREFLANG,
    },
    openGraph: {
      type: 'website',
      siteName: t.siteName,
      title: t.title,
      description: t.ogDescription,
      url,
      locale: t.ogLocale,
    },
    twitter: {
      card: 'summary_large_image',
      title: t.title,
      description: t.ogDescription,
    },
  };
}

/** LocalBusiness structured data, localized per language. */
export function jsonLdFor(lang: Lang) {
  const t = TEXT[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#organization`,
    name: lang === 'ar' ? 'دسر لأنظمة المصاعد' : 'Dusr Elevators',
    alternateName: lang === 'ar' ? 'Dusr Elevators' : 'دسر لأنظمة المصاعد',
    url: urlForLang(lang),
    logo: `${SITE_URL}/Asset-1-square-removed-background.png`,
    image: `${SITE_URL}/Asset-1-square-removed-background.png`,
    description: t.description,
    telephone: '+966539705301',
    address: {
      '@type': 'PostalAddress',
      streetAddress: lang === 'ar' ? 'طريق خريص' : 'Khurais Road',
      addressLocality: lang === 'ar' ? 'الرياض' : 'Riyadh',
      addressCountry: 'SA',
    },
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+966539705301',
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'English'],
    },
  };
}
