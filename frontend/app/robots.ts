import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/cuenta',
          '/publicar-propiedad',
          '/mis-propiedades',
          '/editar-propiedad',
          '/iniciar-sesion',
          '/registro',
          '/recuperar-contrasena',
          '/restablecer-contrasena',
          '/verificar-correo',
          '/admin',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
