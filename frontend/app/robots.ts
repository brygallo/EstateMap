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

// Backlink and rank-tracking crawlers. They index nothing a person can search:
// they resell the crawl to whoever pays. Over fifteen days of August 2026 they
// asked for 180.297 pages here — AhrefsBot alone six times more than Googlebot —
// against a host shared with three other projects. Blocking them costs no
// visibility at all.
//
// This list is intent, not enforcement: none of these respects robots.txt
// reliably, so the rule that actually stops them lives in Cloudflare. Keeping
// both means the refusal is stated where a well-behaved crawler reads it.
const SEO_TOOL_CRAWLERS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
  'SERankingBacklinksBot',
  'Barkrowler',
  'BLEXBot',
  'SeekportBot',
  'Serpstat',
  'SEOkicks',
  'ZoominfoBot',
];

export default function robots(): MetadataRoute.Robots {
  // The REST API carries no indexable content, but crawlers were spending about
  // a third of their budget on it (`/api/properties/`, `map_points`, and the
  // analytics beacon). Blocking it sends that budget back to the listings.
  const publicDisallow = [
    '/api/',
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
    // Draft-recovery URLs carry a token. Nothing here is meant to be found.
    '/continuar-publicacion',
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
      ...SEO_TOOL_CRAWLERS.map((userAgent) => ({
        userAgent,
        disallow: '/',
      })),
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/image-sitemap.xml`],
    host: siteUrl,
  };
}
