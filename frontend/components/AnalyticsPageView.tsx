'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

export default function AnalyticsPageView() {
  const pathname = usePathname();
  useEffect(() => {
    trackEvent('page_view', { page_type: classify(pathname) });
  }, [pathname]);
  return null;
}

function classify(path: string) {
  if (path.startsWith('/propiedad/')) return 'property';
  if (path.startsWith('/propiedades/') || /-(en-venta|en-alquiler)?-?en-/.test(path)) return 'seo_landing';
  if (path === '/') return 'map';
  return 'content';
}
