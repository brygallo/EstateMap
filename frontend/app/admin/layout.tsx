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
    <div className="aents-page-shell relative min-h-[calc(100dvh-var(--app-header-height))] w-full min-w-0 max-w-full overflow-x-clip">
      <BrandAtmosphere className="opacity-50" />
      <div className="relative w-full min-w-0 max-w-full"><Suspense fallback={null}>{children}</Suspense></div>
    </div>
  );
}
