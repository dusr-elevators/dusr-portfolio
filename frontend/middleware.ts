/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Keeps Arabic canonical at "/" while the app is organized under an [lang]
 * segment: external "/..." is rewritten to internal "/ar/...", and "/en/..."
 * passes straight through. The public URLs (and canonical/hreflang) stay clean.
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // English already carries its locale prefix — serve as-is.
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return NextResponse.next();
  }

  // Everything else is Arabic: rewrite "/x" -> "/ar/x" (internal only).
  const url = req.nextUrl.clone();
  url.pathname = `/ar${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, API routes, and any file with an extension
  // (robots.txt, sitemap.xml, logo.png, favicon.ico, _next assets, ...).
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
