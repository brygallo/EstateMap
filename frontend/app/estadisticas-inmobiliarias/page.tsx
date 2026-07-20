import type { Metadata } from 'next';
import MarketStatsClient from '@/components/MarketStatsClient';

export const metadata: Metadata = {
  title: 'Precio por metro cuadrado en Ecuador | Estadísticas inmobiliarias',
  description: 'Compara precios promedio por metro cuadrado, ciudades y tipos de propiedad con datos reales del inventario publicado.',
  alternates: { canonical: '/estadisticas-inmobiliarias' },
};

export default function MarketStatsPage() {
  return <MarketStatsClient />;
}
