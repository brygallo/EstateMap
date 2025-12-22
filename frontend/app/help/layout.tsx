import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com';

export const metadata: Metadata = {
  title: 'Publica tu Propiedad Gratis',
  description:
    'Publica tu propiedad gratis en Ecuador con mapas interactivos. Atrae compradores con ubicación exacta, fotos y medidas reales.',
  keywords: [
    'publicar propiedad gratis',
    'vender propiedad Ecuador',
    'arrienda propiedad Ecuador',
    'mapa de propiedades',
    'inmobiliaria Ecuador',
    'casas en venta Ecuador',
    'terrenos en venta Ecuador',
  ],
  alternates: {
    canonical: '/help',
  },
  openGraph: {
    title: 'Publica tu Propiedad Gratis | Geo Propiedades Ecuador',
    description:
      'Publica tu propiedad gratis en Ecuador con mapas interactivos. Atrae compradores con ubicación exacta, fotos y medidas reales.',
    url: `${siteUrl}/help`,
    siteName: 'Geo Propiedades Ecuador',
    locale: 'es_EC',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Publica tu Propiedad Gratis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Publica tu Propiedad Gratis | Geo Propiedades Ecuador',
    description:
      'Publica tu propiedad gratis en Ecuador con mapas interactivos. Atrae compradores con ubicación exacta, fotos y medidas reales.',
    images: [`${siteUrl}/og-image.png`],
  },
};

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
