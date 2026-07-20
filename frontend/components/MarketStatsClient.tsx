'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Building2, MapPin, Ruler, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';
type StatRow = { city?: string; province?: string; property_type?: string; status?: string; count: number; avg_price_m2: number; avg_price: number; avg_area: number };
type Stats = { overall: StatRow & { min_price_m2: number; max_price_m2: number }; by_city: StatRow[]; by_property_type: StatRow[]; by_operation: StatRow[]; methodology: string };
const money = (value?: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value?: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(Number(value || 0));
const typeLabels: Record<string, string> = { land: 'Terrenos', house: 'Casas', apartment: 'Departamentos', commercial: 'Locales comerciales', other: 'Otros' };

export default function MarketStatsClient() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch(`${API_URL}/market-stats/`).then((response) => {
      if (!response.ok) throw new Error();
      return response.json();
    }).then(setData).catch(() => setError(true));
  }, []);
  const maxCityPrice = useMemo(() => Math.max(...(data?.by_city.map((row) => Number(row.avg_price_m2)) || [1])), [data]);

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-line bg-gradient-to-br from-primary via-primaryHover to-[#172554] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/20"><TrendingUp className="h-4 w-4" /> Datos del mercado ecuatoriano</span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">¿Cuánto cuesta el metro cuadrado?</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">Explora precios, áreas y ciudades con información calculada sobre propiedades activas reales del portal.</p>
            <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-cardHover">Explorar propiedades en el mapa <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {error ? <div className="rounded-card border border-error/20 bg-error/5 p-6 text-center text-error">No fue posible cargar las estadísticas.</div> : !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-card" />)}</div>
        ) : <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Ruler} label="Precio promedio por m²" value={`${money(data.overall.avg_price_m2)}/m²`} />
            <Kpi icon={Building2} label="Propiedades analizadas" value={number(data.overall.count)} />
            <Kpi icon={TrendingUp} label="Precio promedio" value={money(data.overall.avg_price)} />
            <Kpi icon={BarChart3} label="Área promedio" value={`${number(data.overall.avg_area)} m²`} />
          </section>
          <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
              <h2 className="text-xl font-bold text-textPrimary">Precio por m² según ciudad</h2>
              <p className="mt-1 text-sm text-textSecondary">Compara rápidamente dónde es más costoso comprar o alquilar.</p>
              <div className="mt-6 space-y-4">{data.by_city.map((row) => <div key={`${row.province}-${row.city}`}>
                <div className="mb-1.5 flex items-end justify-between gap-3 text-sm"><span className="min-w-0 font-semibold text-textPrimary"><MapPin className="mr-1 inline h-3.5 w-3.5 text-primary" />{row.city || 'Sin ciudad'} <small className="font-normal text-textSecondary">({row.count})</small></span><span className="shrink-0 font-geo font-bold text-primary">{money(row.avg_price_m2)}/m²</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-[#688CCA]" style={{ width: `${Math.max(4, Number(row.avg_price_m2) / maxCityPrice * 100)}%` }} /></div>
              </div>)}</div>
            </div>
            <div className="space-y-6">
              <div className="rounded-card border border-line bg-white p-5 shadow-card"><h2 className="text-lg font-bold text-textPrimary">Por tipo de propiedad</h2><div className="mt-4 divide-y divide-line">{data.by_property_type.map((row) => <div key={row.property_type} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-textPrimary">{typeLabels[row.property_type || ''] || row.property_type}</p><p className="text-xs text-textSecondary">{row.count} anuncios</p></div><span className="font-geo text-sm font-bold text-primary">{money(row.avg_price_m2)}/m²</span></div>)}</div></div>
              <div className="rounded-card bg-primaryLight p-5 text-sm leading-6 text-textSecondary"><p className="font-semibold text-textPrimary">Cómo leer estos datos</p><p className="mt-1">{data.methodology}</p><p className="mt-2">Los valores son referenciales y no sustituyen un avalúo profesional.</p></div>
            </div>
          </section>
        </>}
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return <div className="rounded-card border border-line bg-white p-5 shadow-card"><span className="flex h-10 w-10 items-center justify-center rounded-button bg-primaryLight text-primary"><Icon className="h-5 w-5" /></span><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-1 font-geo text-xl font-black text-textPrimary">{value}</p></div>;
}
