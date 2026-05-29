import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://notesandedges.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/privacy', '/terms'],
        disallow: ['/home', '/graph/', '/welcome', '/settings', '/api/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
