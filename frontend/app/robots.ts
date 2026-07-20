import { MetadataRoute } from 'next';

const siteUrl = (
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
).replace(/\/+$/, '');

// Crawlers de IA a los que se les permite explícitamente el sitio (visibilidad
// en ChatGPT, Claude, Perplexity, Gemini, Meta AI, Copilot, etc.). Aunque `*`
// ya permite todo, listarlos deja claro que son bienvenidos y evita que un
// cambio futuro en la regla genérica los bloquee sin querer.
const AI_CRAWLERS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Google-Extended',
  'GoogleOther',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot',
  'Applebot-Extended',
  'meta-externalagent',
  'Meta-ExternalFetcher',
  'FacebookBot',
  'Amazonbot',
  'DuckAssistBot',
  'MistralAI-User',
  'Bytespider',
  'cohere-ai',
];

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
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: publicDisallow,
      })),
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/image-sitemap.xml`],
    host: siteUrl,
  };
}
