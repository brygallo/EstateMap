'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-height))] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warningBg">
          <AlertTriangle className="h-8 w-8 text-warning" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-3xl font-bold text-textPrimary">Algo salió mal</h1>
        <p className="mt-3 text-base text-textSecondary">
          Ocurrió un error inesperado al cargar esta página. Puedes intentarlo
          de nuevo; si el problema continúa, vuelve al inicio.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-line bg-white px-5 text-sm font-semibold text-textPrimary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
