import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/lang';

const languages = {
  ar: SITE_URL,
  en: `${SITE_URL}/en`,
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${SITE_URL}/en`,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: { languages },
    },
  ];
}
