import { Metadata } from 'next';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';

export const metadata: Metadata = {
  title: 'Mis propiedades',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyPropertiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aents-page-shell relative">
      <BrandAtmosphere className="opacity-40" />
      <div className="relative">{children}</div>
    </div>
  );
}
