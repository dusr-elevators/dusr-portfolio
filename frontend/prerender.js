/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Post-build step: render <App /> to static HTML and inject it into the built
 * dist/index.html so search engines and link previews get real content without
 * waiting for JavaScript. The client bundle then hydrates this markup.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, 'dist');
const serverDir = path.resolve(__dirname, 'dist/server');

const { render } = await import('./dist/server/entry-server.js');
const appHtml = render();

const indexPath = path.join(distDir, 'index.html');
const template = fs.readFileSync(indexPath, 'utf-8');

if (!template.includes('<div id="root"></div>')) {
  throw new Error('prerender: could not find empty <div id="root"></div> in dist/index.html');
}

const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
fs.writeFileSync(indexPath, html);

// The SSR bundle is only needed during this build step.
fs.rmSync(serverDir, { recursive: true, force: true });

console.log('✓ Prerendered dist/index.html');
