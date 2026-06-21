/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Post-build step: render <App /> to static HTML once per language and write a
 * fully-populated, per-language indexable page:
 *   dist/index.html      -> Arabic   (canonical "/")
 *   dist/en/index.html   -> English  ("/en/")
 *
 * Each page gets its own <html lang/dir>, title, description, Open Graph,
 * canonical + hreflang alternates, and JSON-LD. The client bundle hydrates
 * whichever page is served (language is derived from the URL path).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');
const serverDir = path.resolve(__dirname, 'dist/server');

const SITE = 'https://dusr.sa';
// Where to read admin-managed SEO keywords from at build time. Best-effort:
// if the API is unreachable the build still succeeds, just without keywords.
const apiBase = process.env.SEO_API_URL || SITE;

const ALT_LINKS = [
  `<link rel="canonical" href="__CANONICAL__" />`,
  `<link rel="alternate" hreflang="ar" href="${SITE}/" />`,
  `<link rel="alternate" hreflang="en" href="${SITE}/en/" />`,
  `<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
].join('\n    ');

const PAGES = {
  ar: {
    out: 'index.html',
    dir: 'rtl',
    url: `${SITE}/`,
    title: 'دسر | أنظمة مصاعد دقيقة',
    description:
      'دسر لأنظمة المصاعد — هندسة دقيقة وتصميم معماري فاخر. نصمم ونركّب أكثر أنظمة المصاعد موثوقية وأماناً في المملكة العربية السعودية، مع دعم فني ومراقبة على مدار الساعة.',
    ogDescription:
      'هندسة دقيقة وتصميم معماري فاخر. نصمم ونركّب أكثر أنظمة المصاعد موثوقية وأماناً مع دعم على مدار الساعة.',
    ogLocale: 'ar_SA',
    schemaName: 'دسر لأنظمة المصاعد',
  },
  en: {
    out: 'en/index.html',
    dir: 'ltr',
    url: `${SITE}/en/`,
    title: 'Dusr | Precision Elevator Systems',
    description:
      'Dusr Elevators — precise engineering and luxury architectural design. We engineer and install the most reliable, safest elevator systems in Saudi Arabia, with 24/7 technical support and monitoring.',
    ogDescription:
      'Precise engineering and luxury architectural design. The most reliable and safest elevator systems with 24/7 support.',
    ogLocale: 'en_US',
    schemaName: 'Dusr Elevators',
  },
};

async function fetchKeywords() {
  try {
    const res = await fetch(`${apiBase}/api/seo-keywords/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.results ?? [];
    return list.find((k) => k.page === 'home') ?? {};
  } catch {
    return {};
  }
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildHead(lang, page, keywords) {
  const kw = lang === 'ar' ? keywords.keywords_ar : keywords.keywords_en;
  const keywordsTag = kw ? `\n    <meta name="keywords" content="${escapeAttr(kw)}" />` : '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE}/#organization`,
    name: page.schemaName,
    alternateName: lang === 'ar' ? 'Dusr Elevators' : 'دسر لأنظمة المصاعد',
    url: page.url,
    logo: `${SITE}/logo.png`,
    image: `${SITE}/logo.png`,
    description: page.description,
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

  return `
    <title>${page.title}</title>
    <meta name="description" content="${escapeAttr(page.description)}" />${keywordsTag}
    ${ALT_LINKS.replace('__CANONICAL__', page.url)}

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${lang === 'ar' ? 'دسر' : 'Dusr'}" />
    <meta property="og:title" content="${escapeAttr(page.title)}" />
    <meta property="og:description" content="${escapeAttr(page.ogDescription)}" />
    <meta property="og:url" content="${page.url}" />
    <meta property="og:locale" content="${page.ogLocale}" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(page.title)}" />
    <meta name="twitter:description" content="${escapeAttr(page.ogDescription)}" />

    <!-- Structured data: helps Google show name, logo, and contact info -->
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
  `;
}

const { render } = await import('./dist/server/entry-server.js');

const indexPath = path.join(distDir, 'index.html');
const template = fs.readFileSync(indexPath, 'utf-8');

const SEO_RE = /<!-- @seo-head -->[\s\S]*?<!-- \/@seo-head -->/;
if (!SEO_RE.test(template)) {
  throw new Error('prerender: could not find <!-- @seo-head --> markers in dist/index.html');
}
if (!template.includes('<div id="root"></div>')) {
  throw new Error('prerender: could not find empty <div id="root"></div> in dist/index.html');
}

const keywords = await fetchKeywords();
if (keywords.keywords_ar || keywords.keywords_en) {
  console.log('✓ Loaded SEO keywords from admin API');
} else {
  console.log('• No SEO keywords loaded (API unreachable or empty) — continuing');
}

for (const [lang, page] of Object.entries(PAGES)) {
  const appHtml = render(lang);
  const html = template
    .replace(/<html[^>]*>/, `<html class="dark" dir="${page.dir}" lang="${lang}">`)
    .replace(SEO_RE, buildHead(lang, page, keywords))
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  const outPath = path.join(distDir, page.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(`✓ Prerendered ${page.out} (${lang})`);
}

// The SSR bundle is only needed during this build step.
fs.rmSync(serverDir, { recursive: true, force: true });
