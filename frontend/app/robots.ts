import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/add-property',
          '/my-properties',
          '/edit-property',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
