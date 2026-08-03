'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Ruler, TrendingUp } from 'lucide-react';

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
const demandColor = {
  low: 'bg-red-500 ring-red-100',
  medium: 'bg-amber-400 ring-amber-100',
  high: 'bg-emerald-500 ring-emerald-100',
};

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
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Metric icon={Ruler} label="Precio por m²" value={`${money(data.price_per_m2)}/m²`} />
      <Metric icon={TrendingUp} label="Frente a similares" value={difference == null ? 'Sin muestra' : `${difference > 0 ? '+' : ''}${difference}%`} />
      <DemandMetric level={data.demand.level} />
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-card bg-background p-4 text-sm"><p className="font-semibold text-textPrimary">Rango habitual de la zona</p><p className="mt-1 text-textSecondary">{money(data.zone_range.low)}–{money(data.zone_range.high)}/m² · {data.comparison.sample_size} comparables</p><p className="mt-1 text-textSecondary">Oferta disponible: {data.available_supply} propiedades</p></div>
      {data.comparison.sample_size >= 4 && difference != null && (
        <div className={`rounded-card p-4 text-sm ${data.price_alert ? 'bg-amber-50 text-amber-900' : 'bg-primaryLight text-textSecondary'}`}><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Evaluación de precio</p><p className="mt-1">{data.price_alert === 'above_range' ? 'El precio está inusualmente por encima del rango comparable.' : data.price_alert === 'below_range' ? 'El precio está inusualmente por debajo del rango comparable.' : 'El precio se encuentra dentro del comportamiento esperado.'}</p></div>
      )}
    </div>
    {data.price_history.length > 1 && <div className="mt-4 text-sm text-textSecondary"><span className="font-semibold text-textPrimary">Evolución publicada:</span> {data.price_history.map((point) => `${new Date(point.recorded_at).toLocaleDateString('es-EC')}: ${money(Number(point.price))}`).join(' → ')}</div>}
    <p className="mt-4 text-xs text-textSecondary">{data.methodology}</p>
  </section>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Ruler; label: string; value: string; detail?: string }) {
  return <div className="rounded-card border border-line bg-white p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-1 font-geo text-lg font-bold text-textPrimary">{value}</p>{detail && <p className="text-xs text-textSecondary">{detail}</p>}</div>;
}

function DemandMetric({ level }: { level: Intelligence['demand']['level'] }) {
  return <div className="rounded-card border border-line bg-white p-4">
    <span className={`block h-4 w-4 rounded-full ring-4 ${demandColor[level]}`} aria-hidden />
    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">Demanda observada</p>
    <p className="mt-1 font-geo text-lg font-bold text-textPrimary">{demandLabel[level]}</p>
  </div>;
}
