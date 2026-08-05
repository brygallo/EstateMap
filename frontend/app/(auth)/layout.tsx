import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Accede a tu cuenta',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * No BrandAtmosphere here. Its diagonal hatch is anchored to the right edge of
 * the viewport, so on a centred single-card page it read as a stray artefact
 * rather than as texture. The field's own tint carries the brand instead.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aents-auth-field flex min-h-[calc(100dvh-var(--app-header-height))] flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Geo Propiedades Ecuador
      </p>
    </div>
  );
}
