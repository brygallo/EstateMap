import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publicar propiedad gratis en Ecuador',
  description:
    'Publica una casa, terreno, departamento o local comercial en Geo Propiedades Ecuador con ubicación en mapa, imágenes, precio y contacto directo.',
  alternates: { canonical: '/publicar-propiedad' },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PublicarPropiedadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
