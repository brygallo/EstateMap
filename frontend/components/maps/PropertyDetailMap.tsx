'use client';

import dynamic from 'next/dynamic';
import type { PropertyDetailMapProps } from './PropertyDetailMapInner';

// Leaflet necesita `window`, así que el mapa real se carga solo en el cliente.
const Inner = dynamic(() => import('./PropertyDetailMapInner'), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse bg-muted" />,
});

const PropertyDetailMap = (props: PropertyDetailMapProps) => <Inner {...props} />;

export default PropertyDetailMap;
