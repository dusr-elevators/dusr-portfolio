import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLang, type Lang } from '@/lib/lang';
import DesignStudio from '@/components/design/DesignStudio';
import type { ComponentCategory } from '@/components/design/types';

const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:8000';

async function fetchCategories(): Promise<ComponentCategory[]> {
  const url = `${apiBase}/api/design/categories/`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Failed to fetch design categories from ${url}: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    const list: ComponentCategory[] = Array.isArray(data) ? data : (data.results ?? []);
    // Rewrite internal Docker URLs to relative paths so the browser can load them
    const internalBase = (process.env.API_INTERNAL_URL || '').replace(/\/$/, '');
    if (!internalBase) return list;
    const fixUrl = (url: string) => url.replace(internalBase, '');
    const fixUrlNullable = (url: string | null) => (url ? fixUrl(url) : url);
    return list.map(cat => ({
      ...cat,
      options: cat.options.map(opt => ({
        ...opt,
        thumbnail: fixUrlNullable(opt.thumbnail),
        projection_image: fixUrlNullable(opt.projection_image),
        variants: opt.variants?.map(v => ({
          ...v,
          projection_image: fixUrl(v.projection_image),
        })),
      })),
    }));
  } catch (error) {
    console.error(`Failed to fetch design categories from ${url}:`, error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return {
    title:
      lang === 'ar'
        ? 'مصمم كبينة المصعد | دسر'
        : 'Elevator Cabin Designer | Dusr',
    description:
      lang === 'ar'
        ? 'صمم كبينة المصعد الخاصة بك واختر المكونات وحمّل ملف PDF مع شعار دسر'
        : 'Design your elevator cabin, choose components, and download a PDF with Dusr branding.',
  };
}

export default async function DesignPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const categories = await fetchCategories();

  return (
    <Suspense>
      <DesignStudio categories={categories} lang={lang as Lang} />
    </Suspense>
  );
}
