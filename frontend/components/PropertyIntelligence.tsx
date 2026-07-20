'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Clock, Eye, Ruler, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';
type Intelligence = {
  price_per_m2: number | null;
  zone: string;
  zone_range: { low: number | null; median: number | null; high: number | null };
  comparison: { sample_size: number; difference_pct: number | null };
  price_alert: 'above_range' | 'below_range' | null;
  price_history: Array<{ price: number; recorded_at: string }>;
  available_supply: number;
  published_days: number;
  publication_basis: 'source' | 'detected' | 'platform';
  demand: { level: 'low' | 'medium' | 'high'; views: number; contacts: number };
  methodology: string;
};
const money = (value: number | null) => value == null ? 'Sin datos' : new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const demandLabel = { low: 'Baja', medium: 'Media', high: 'Alta' };

export default function PropertyIntelligence({ propertyId }: { propertyId: number }) {
  const [data, setData] = useState<Intelligence | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/properties/${propertyId}/intelligence/`).then((response) => response.ok ? response.json() : null).then(setData).catch(() => undefined);
  }, [propertyId]);
  if (!data) return null;
  const difference = data.comparison.difference_pct;
  return <section className="mt-8 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
    <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold text-textPrimary">Inteligencia del anuncio</h2></div>
    <p className="mt-1 text-sm text-textSecondary">Comparación basada en inventario activo de {data.zone}.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric icon={Ruler} label="Precio por m²" value={`${money(data.price_per_m2)}/m²`} />
      <Metric icon={TrendingUp} label="Frente a similares" value={difference == null ? 'Sin muestra' : `${difference > 0 ? '+' : ''}${difference}%`} />
      <Metric icon={Clock} label={data.publication_basis === 'detected' ? 'Tiempo en seguimiento' : 'Tiempo publicado'} value={`${data.published_days} días`} detail={data.publication_basis === 'detected' ? 'Desde que lo detectamos' : data.publication_basis === 'source' ? 'Según el portal de origen' : 'En Geo Propiedades'} />
      <Metric icon={Eye} label="Demanda observada" value={demandLabel[data.demand.level]} detail={`${data.demand.views} vistas · ${data.demand.contacts} contactos`} />
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-card bg-background p-4 text-sm"><p className="font-semibold text-textPrimary">Rango habitual de la zona</p><p className="mt-1 text-textSecondary">{money(data.zone_range.low)}–{money(data.zone_range.high)}/m² · {data.comparison.sample_size} comparables</p><p className="mt-1 text-textSecondary">Oferta disponible: {data.available_supply} propiedades</p></div>
      <div className={`rounded-card p-4 text-sm ${data.price_alert ? 'bg-amber-50 text-amber-900' : 'bg-primaryLight text-textSecondary'}`}><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Evaluación de precio</p><p className="mt-1">{data.price_alert === 'above_range' ? 'El precio está inusualmente por encima del rango comparable.' : data.price_alert === 'below_range' ? 'El precio está inusualmente por debajo del rango comparable.' : 'El precio se encuentra dentro del comportamiento esperado o aún no hay muestra suficiente.'}</p></div>
    </div>
    {data.price_history.length > 1 && <div className="mt-4 text-sm text-textSecondary"><span className="font-semibold text-textPrimary">Evolución publicada:</span> {data.price_history.map((point) => `${new Date(point.recorded_at).toLocaleDateString('es-EC')}: ${money(Number(point.price))}`).join(' → ')}</div>}
    <p className="mt-4 text-xs text-textSecondary">{data.methodology}</p>
  </section>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Ruler; label: string; value: string; detail?: string }) {
  return <div className="rounded-card border border-line bg-white p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-1 font-geo text-lg font-bold text-textPrimary">{value}</p>{detail && <p className="text-xs text-textSecondary">{detail}</p>}</div>;
}
