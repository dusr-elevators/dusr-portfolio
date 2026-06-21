/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import { isLang, dirForLang } from '@/lib/lang';
import { jsonLdFor } from '@/lib/seo';

export const viewport: Viewport = {
  themeColor: '#131313',
};

export function generateStaticParams() {
  return [{ lang: 'ar' }, { lang: 'en' }];
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html lang={lang} dir={dirForLang(lang)} className="dark">
      <body className="bg-[#131313] text-[#e5e2e1] selection:bg-[#FF5722] selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFor(lang)) }}
        />
        {children}
      </body>
    </html>
  );
}
