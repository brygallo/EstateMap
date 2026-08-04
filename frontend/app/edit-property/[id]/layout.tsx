import { Metadata } from 'next';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';

export const metadata: Metadata = {
  title: 'Editar propiedad',
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditPropertyLayout({
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
