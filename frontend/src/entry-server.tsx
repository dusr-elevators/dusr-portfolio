/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderToString } from 'react-dom/server';
import App from './App';

/**
 * Renders the app to an HTML string at build time so crawlers receive
 * fully-populated markup instead of an empty <div id="root">.
 */
export function render(): string {
  return renderToString(<App />);
}
