/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Lang = 'ar' | 'en';

/**
 * Arabic is served at "/" (canonical); English lives under "/en/".
 * The active language is derived from the URL path so each language has
 * its own indexable URL and the prerendered markup matches on hydration.
 */
export function getLangFromPath(pathname: string): Lang {
  return pathname.replace(/^\/+/, '').toLowerCase().startsWith('en') ? 'en' : 'ar';
}

/** Absolute path for a given language's home page. */
export function pathForLang(lang: Lang): string {
  return lang === 'en' ? '/en/' : '/';
}
