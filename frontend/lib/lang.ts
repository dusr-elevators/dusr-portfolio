/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Lang = 'ar' | 'en';

export const SITE_URL = 'https://dusr.sa';

/** Arabic is served at "/" (canonical); English lives under "/en/". */
export function isLang(value: string): value is Lang {
  return value === 'ar' || value === 'en';
}

export function dirForLang(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** Public URL path for a language's home page. */
export function pathForLang(lang: Lang): string {
  return lang === 'en' ? '/en' : '/';
}

/**
 * Absolute, canonical URL for a language's home page. No trailing slash, to
 * match how Next normalizes canonical/hreflang (trailingSlash defaults to false)
 * so the sitemap, canonical, and hreflang tags all reference identical URLs.
 */
export function urlForLang(lang: Lang): string {
  return lang === 'en' ? `${SITE_URL}/en` : SITE_URL;
}
