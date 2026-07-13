/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLang } from '@/lib/lang';
import { homeMetadata } from '@/lib/seo';
import Home from '@/components/Home';

const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:8000';

async function fetchShowDesignCTA(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/design/cta-settings/`, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.is_visible);
  } catch {
    return false;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return homeMetadata(lang);
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const showDesignCTA = await fetchShowDesignCTA();
  return <Home lang={lang} showDesignCTA={showDesignCTA} />;
}
