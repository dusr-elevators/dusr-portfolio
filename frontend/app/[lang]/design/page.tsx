import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLang, type Lang } from '@/lib/lang';
import DesignStudio from '@/components/design/DesignStudio';
import type { ComponentCategory } from '@/components/design/types';

const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:8000';

async function fetchCategories(): Promise<ComponentCategory[]> {
  try {
    const res = await fetch(`${apiBase}/api/design/categories/`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: ComponentCategory[] = Array.isArray(data) ? data : (data.results ?? []);
    // Rewrite internal Docker URLs to relative paths so the browser can load them
    const internalBase = (process.env.API_INTERNAL_URL || '').replace(/\/$/, '');
    if (!internalBase) return list;
    const fixUrl = (url: string) => url.replace(internalBase, '');
    return list.map(cat => ({
      ...cat,
      options: cat.options.map(opt => ({
        ...opt,
        thumbnail: fixUrl(opt.thumbnail),
        projection_image: fixUrl(opt.projection_image),
      })),
    }));
  } catch {
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
