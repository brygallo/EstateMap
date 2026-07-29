import { generatePageMetadata } from '@/lib/metadata';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';

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
  return (
    <div className="aents-page-shell relative overflow-hidden">
      <BrandAtmosphere className="opacity-40" />
      <div className="relative">{children}</div>
    </div>
  );
}
