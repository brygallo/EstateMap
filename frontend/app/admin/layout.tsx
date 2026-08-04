import { Metadata } from 'next';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Panel de administración',
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
    <div className="aents-page-shell relative min-h-[calc(100dvh-var(--app-header-height))]">
      <BrandAtmosphere className="opacity-50" />
      <div className="relative"><Suspense fallback={null}>{children}</Suspense></div>
    </div>
  );
}
