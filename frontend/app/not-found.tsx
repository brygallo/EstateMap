import Link from 'next/link';
import { MapPin, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-height))] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primaryLight">
          <MapPin className="h-8 w-8 text-primary" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="font-geo text-sm font-semibold uppercase tracking-wide text-textSecondary">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-bold text-textPrimary">
          No encontramos esta página
        </h1>
        <p className="mt-3 text-base text-textSecondary">
          La dirección que buscas no existe o cambió de lugar. Puedes volver al
          mapa o explorar las propiedades disponibles.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al mapa
          </Link>
          <Link
            href="/propiedades"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-line bg-white px-5 text-sm font-semibold text-textPrimary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <Search className="h-4 w-4" aria-hidden />
            Ver propiedades
          </Link>
        </div>
      </div>
    </div>
  );
}
