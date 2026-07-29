'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Progreso indeterminado para navegaciones del App Router. Next no expone
 * eventos públicos de inicio/fin, por eso el inicio se detecta sobre enlaces
 * internos y el final al cambiar pathname/searchParams.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setActive(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  useEffect(() => {
    const beginFromLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      const sameDocument =
        next.pathname === current.pathname &&
        next.search === current.search;
      if (sameDocument) return;
      setActive(true);
    };

    const beginFromHistory = () => setActive(true);
    document.addEventListener('click', beginFromLink, true);
    window.addEventListener('popstate', beginFromHistory);
    return () => {
      document.removeEventListener('click', beginFromLink, true);
      window.removeEventListener('popstate', beginFromHistory);
    };
  }, []);

  return active ? (
    <div
      className="aents-route-progress aents-progress aents-progress--indeterminate"
      role="progressbar"
      aria-label="Cargando página"
    >
      <span className="aents-progress__fill" aria-hidden />
    </div>
  ) : null;
}
