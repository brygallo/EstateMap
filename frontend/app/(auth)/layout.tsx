import { Metadata } from 'next';
import BrandAtmosphere from '@/components/aents/BrandAtmosphere';
import { Suspense } from 'react';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aents-page-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16 sm:px-6 lg:px-8">
      <BrandAtmosphere />
      <div className="aents-shell-content relative w-full max-w-md">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </div>
  );
}
