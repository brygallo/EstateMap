import { Metadata } from 'next';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aents-page-shell relative min-h-[calc(100dvh-var(--app-header-height))] overflow-hidden">
      <BrandAtmosphere className="opacity-50" />
      <div className="relative">{children}</div>
    </div>
  );
}
