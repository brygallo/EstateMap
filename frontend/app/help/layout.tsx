import { Metadata } from 'next';
import { HELP_FAQS } from '@/lib/help-faqs';
import { jsonLd } from '@/lib/properties';

const siteUrl = (
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
).replace(/\/+$/, '');

export const metadata: Metadata = {
  title: 'Ayuda y Preguntas Frecuentes | Geo Propiedades Ecuador',
  description:
    'Centro de ayuda para publicar propiedades en Ecuador. Aprende cómo usar nuestros mapas interactivos, sigue la guía para publicar gratis y encuentra respuestas a las preguntas más frecuentes.',
  keywords: [
    'ayuda publicar propiedad',
    'cómo publicar propiedad',
    'preguntas frecuentes',
    'guía de publicación',
    'mapa de propiedades',
    'inmobiliaria Ecuador',
    'casas en venta Ecuador',
  ],
  alternates: {
    canonical: '/ayuda',
  },
  openGraph: {
    title: 'Ayuda y Preguntas Frecuentes | Geo Propiedades Ecuador',
    description:
      'Centro de ayuda para publicar propiedades en Ecuador. Aprende cómo usar nuestros mapas interactivos, sigue la guía para publicar gratis y encuentra respuestas a las preguntas más frecuentes.',
    url: `${siteUrl}/ayuda`,
    siteName: 'Geo Propiedades Ecuador',
    locale: 'es_EC',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Ayuda y Preguntas Frecuentes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ayuda y Preguntas Frecuentes | Geo Propiedades Ecuador',
    description:
      'Centro de ayuda para publicar propiedades en Ecuador. Aprende cómo usar nuestros mapas interactivos, sigue la guía para publicar gratis y encuentra respuestas a las preguntas más frecuentes.',
    images: [`${siteUrl}/og-image.png`],
  },
};

// FAQPage emitido desde el layout (server component) porque la página es un
// componente cliente: así el schema llega en el HTML inicial para crawlers.
const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${siteUrl}/ayuda#faq`,
  inLanguage: 'es-EC',
  mainEntity: HELP_FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: { '@type': 'Answer', text: faq.a },
  })),
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqStructuredData) }}
      />
      {children}
    </>
  );
}
