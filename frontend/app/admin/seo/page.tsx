'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, RefreshCw, Search, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

interface CityRow { city: string; province: string; count: number; missing: number }
interface ComboRow { route: string; city: string; count: number; missing: number }
interface SectorRow { city: string; sector_key: string; name: string; count: number }

interface SeoHealth {
  thresholds: { combo: number; location: number; sector: number; description_chars: number };
  cities: { live: CityRow[]; near_miss: CityRow[]; total_cities: number };
  combos: { live: ComboRow[]; near_miss: ComboRow[] };
  sectors: { live: SectorRow[]; total: number };
  content: {
    published: number;
    without_title: number;
    without_description: number;
    short_description: number;
    without_images: number;
    thin: number;
  };
  blog: { published: number; scheduled: number; published_30d: number; drafts: number };
}

const ROUTE_LABELS: Record<string, string> = {
  'casas-en-venta': 'Casas en venta',
  'departamentos-en-alquiler': 'Departamentos en alquiler',
  'terrenos-en-venta': 'Terrenos en venta',
  'locales-comerciales': 'Locales comerciales',
};

export default function AdminSeoPage() {
  const [data, setData] = useState<SeoHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const response = await apiGet(`/admin/seo-health/${refresh ? '?refresh=1' : ''}`);
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      toast.error('No se pudo cargar el estado de las páginas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const livePages = data
    ? data.cities.live.length + data.combos.live.length + data.sectors.total
    : 0;

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Posicionamiento</p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-textPrimary">
                  <Search className="h-6 w-6" /> Páginas y SEO
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-textSecondary">
                  Las landings del portal se abren solas cuando una porción del catálogo alcanza el mínimo
                  de anuncios. Esto dice cuáles están abiertas y cuáles se abren con uno o dos anuncios más.
                </p>
              </div>
              <Button variant="outline" onClick={() => void load(true)} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Recalcular
              </Button>
            </header>

            {loading && !data ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
              </div>
            ) : data && (
              <>
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Páginas publicadas" value={livePages} hint="Ciudades, combos de tipo y zonas con inventario suficiente." />
                  <Metric
                    label="A un paso"
                    value={data.cities.near_miss.length + data.combos.near_miss.length}
                    hint={`Les faltan 1 o 2 anuncios para llegar al mínimo de ${data.thresholds.combo}.`}
                    tone="amber"
                  />
                  <Metric label="Anuncios publicados" value={data.content.published} hint="Lo que ve el sitemap: activo, canónico y fuera de la papelera." />
                  <Metric
                    label="Fichas flojas"
                    value={data.content.thin}
                    hint="Sin título, sin descripción o sin fotos: restan a la landing donde se listan."
                    tone={data.content.thin > 0 ? 'red' : undefined}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="border-b border-line">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-amber-600" /> Páginas a un paso de abrirse
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.combos.near_miss.length === 0 && data.cities.near_miss.length === 0 ? (
                        <p className="p-8 text-center text-sm text-textSecondary">
                          No hay ninguna a menos de dos anuncios del umbral.
                        </p>
                      ) : (
                        <ul className="divide-y divide-line">
                          {data.combos.near_miss.slice(0, 15).map((row) => (
                            <li key={`${row.route}-${row.city}`} className="flex items-center justify-between gap-3 px-4 py-3">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-textPrimary">
                                  {ROUTE_LABELS[row.route] || row.route} · {row.city}
                                </span>
                                <span className="text-xs text-textSecondary">{row.count} de {data.thresholds.combo} anuncios</span>
                              </span>
                              <Badge className="shrink-0 border-0 bg-amber-100 text-amber-800">
                                faltan {row.missing}
                              </Badge>
                            </li>
                          ))}
                          {data.cities.near_miss.slice(0, 10).map((row) => (
                            <li key={`city-${row.city}`} className="flex items-center justify-between gap-3 px-4 py-3">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-textPrimary">
                                  Ciudad · {row.city}
                                </span>
                                <span className="text-xs text-textSecondary">{row.count} de {data.thresholds.location} anuncios · {row.province}</span>
                              </span>
                              <Badge className="shrink-0 border-0 bg-amber-100 text-amber-800">
                                faltan {row.missing}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b border-line">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-emerald-600" /> Combos con más inventario
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-line">
                        {data.combos.live.slice(0, 15).map((row) => (
                          <li key={`${row.route}-${row.city}`} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="min-w-0 truncate text-sm text-textPrimary">
                              {ROUTE_LABELS[row.route] || row.route} · {row.city}
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-textPrimary">{row.count}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b border-line">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4 text-primary" /> Zonas con página propia
                        <Badge variant="outline" className="ml-auto">{data.sectors.total}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                        {data.sectors.live.map((row) => (
                          <li key={`${row.city}-${row.sector_key}`} className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-textPrimary">{row.name}</span>
                              <span className="text-xs text-textSecondary">{row.city}</span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-textPrimary">{row.count}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b border-line">
                      <CardTitle className="text-base">Calidad del texto publicado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4">
                      <QualityRow label="Sin título" value={data.content.without_title} total={data.content.published} />
                      <QualityRow label="Sin descripción" value={data.content.without_description} total={data.content.published} />
                      <QualityRow
                        label={`Descripción bajo ${data.thresholds.description_chars} caracteres`}
                        value={data.content.short_description}
                        total={data.content.published}
                      />
                      <QualityRow label="Sin fotos" value={data.content.without_images} total={data.content.published} />
                      <div className="mt-4 border-t border-line pt-4 text-sm text-textSecondary">
                        Blog: <strong className="text-textPrimary">{data.blog.published}</strong> publicados ·{' '}
                        <strong className="text-textPrimary">{data.blog.scheduled}</strong> programados ·{' '}
                        <strong className="text-textPrimary">{data.blog.drafts}</strong> borradores
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: number; hint: string; tone?: 'amber' | 'red' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
        <p className={cn(
          'mt-1 text-3xl font-bold',
          tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-textPrimary',
        )}>
          {value.toLocaleString('es-EC')}
        </p>
        <p className="mt-2 text-xs text-textSecondary">{hint}</p>
      </CardContent>
    </Card>
  );
}

function QualityRow({ label, value, total }: { label: string; value: number; total: number }) {
  const share = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-textPrimary">{label}</span>
        <span className="font-semibold text-textPrimary">{value.toLocaleString('es-EC')} · {share}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', share > 25 ? 'bg-red-500' : share > 10 ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${Math.min(100, share)}%` }}
        />
      </div>
    </div>
  );
}
