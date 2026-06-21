/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderToString } from 'react-dom/server';
import App from './App';
import type { Lang } from './lib/lang';

/**
 * Renders the app to an HTML string at build time so crawlers receive
 * fully-populated markup instead of an empty <div id="root">.
 * Called once per language (see prerender.js).
 */
export function render(lang: Lang): string {
  return renderToString(<App initialLang={lang} />);
}
