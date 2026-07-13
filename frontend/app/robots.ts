import { MetadataRoute } from 'next';

const siteUrl = (
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
).replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  const publicDisallow = [
    '/cuenta',
    '/account',
    '/add-property',
    '/mis-propiedades',
    '/my-properties',
    '/editar-propiedad',
    '/edit-property',
    '/iniciar-sesion',
    '/login',
    '/registro',
    '/register',
    '/recuperar-contrasena',
    '/forgot-password',
    '/restablecer-contrasena',
    '/reset-password',
    '/verificar-correo',
    '/verify-email',
    '/admin',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: publicDisallow,
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: publicDisallow,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: publicDisallow,
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: publicDisallow,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: publicDisallow,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: publicDisallow,
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/image-sitemap.xml`],
    host: siteUrl,
  };
}
