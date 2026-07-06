import { generatePageMetadata } from '@/lib/metadata';

export const metadata = generatePageMetadata(
  'Publicar propiedad con ayuda',
  'Deja tus datos y te ayudamos a publicar tu propiedad gratis en Geo Propiedades Ecuador.',
  '/publicar-asistido'
);

export default function AssistedPublishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
