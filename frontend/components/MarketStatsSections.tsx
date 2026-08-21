import Link from 'next/link';
import { BarChart3, Building2, MapPin, Ruler, TrendingUp } from 'lucide-react';
import { slugify } from '@/lib/properties';
import AdSlot from '@/components/ads/AdSlot';
import {
  MarketStats,
  MIN_LISTINGS_FOR_PROMOTION,
  TYPE_LABELS,
  integer,
  money,
} from '@/lib/market-stats';

// Server component on purpose: the figures must be present in the HTML so
// Google and AI crawlers (which do not run JS) can read and cite them.

export default function MarketStatsSections({
  data,
  cityName,
}: {
  data: MarketStats;
  cityName?: string;
}) {
  const barRows = cityName
    ? data.by_sector.map((row) => ({
        key: `${row.city}-${row.sector}`,
        label: row.sector,
        count: row.count,
        avg_price_m2: row.avg_price_m2,
        href: null as string | null,
      }))
    : data.by_city.map((row) => ({
        key: `${row.province}-${row.city}`,
        label: row.city || 'Sin ciudad',
        count: row.count,
        avg_price_m2: row.avg_price_m2,
        href:
          row.city && row.count >= MIN_LISTINGS_FOR_PROMOTION
            ? `/estadisticas-inmobiliarias/${slugify(row.city)}`
            : null,
      }));
  const maxBarPrice = Math.max(...barRows.map((row) => Number(row.avg_price_m2)), 1);

  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* The median leads where there is one. An average over a market that
            pools a 60 m² flat with a 40 ha farm describes neither: Guayaquil
            published an average area of 4.571 m² that way. The average stays
            visible underneath, so nothing is hidden — it is just no longer the
            headline. */}
        <Kpi
          icon={Ruler}
          label={data.overall.median_price_m2 ? 'Precio mediano por m²' : 'Precio promedio por m²'}
          value={`${money(data.overall.median_price_m2 ?? data.overall.avg_price_m2)}/m²`}
          note={
            data.overall.median_price_m2
              ? `Promedio ${money(data.overall.avg_price_m2)}/m²`
              : undefined
          }
        />
        <Kpi icon={Building2} label="Propiedades analizadas" value={integer(data.overall.count)} />
        <Kpi
          icon={TrendingUp}
          label={data.overall.median_price ? 'Precio mediano' : 'Precio promedio'}
          value={money(data.overall.median_price ?? data.overall.avg_price)}
          note={data.overall.median_price ? `Promedio ${money(data.overall.avg_price)}` : undefined}
        />
        <Kpi
          icon={BarChart3}
          label={data.overall.median_area ? 'Área mediana' : 'Área promedio'}
          value={`${integer(data.overall.median_area ?? data.overall.avg_area)} m²`}
          note={data.overall.median_area ? `Promedio ${integer(data.overall.avg_area)} m²` : undefined}
        />
        <Kpi icon={TrendingUp} label="Antigüedad media del anuncio" value={`${integer(data.estimated_market_days)} días`} />
        <Kpi icon={BarChart3} label="Valores extremos excluidos" value={integer(data.outliers_excluded)} />
      </section>

      <AdSlot
        placement="stats_inline"
        seed={cityName ?? 'ecuador'}
        city={cityName}
        variant="banner"
        className="mt-8"
      />

      <section className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
          <h2 className="text-xl font-bold text-textPrimary">
            {cityName ? `Precio por m² según sector en ${cityName}` : 'Precio por m² según ciudad'}
          </h2>
          <p className="mt-1 text-sm text-textSecondary">
            {cityName
              ? 'Compara los sectores con inventario comparable dentro de la ciudad.'
              : 'Compara rápidamente dónde es más costoso comprar o alquilar.'}
          </p>
          <div className="mt-6 space-y-4">
            {barRows.map((row) => (
              <div key={row.key}>
                <div className="mb-1.5 flex items-end justify-between gap-3 text-sm">
                  <span className="min-w-0 font-semibold text-textPrimary">
                    <MapPin className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    {row.href ? (
                      <Link href={row.href} className="hover:text-primary hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}{' '}
                    <small className="font-normal text-textSecondary">({row.count})</small>
                  </span>
                  <span className="shrink-0 font-geo font-bold text-primary">{money(row.avg_price_m2)}/m²</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[var(--accent-alt)]"
                    style={{ width: `${Math.max(4, (Number(row.avg_price_m2) / maxBarPrice) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {!barRows.length && (
              <p className="text-sm text-textSecondary">Aún no hay suficientes datos comparables.</p>
            )}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold text-textPrimary">Por tipo de propiedad</h2>
            <div className="mt-4 divide-y divide-line">
              {data.by_property_type.map((row) => (
                <div key={row.property_type} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">
                      {TYPE_LABELS[row.property_type || ''] || row.property_type}
                    </p>
                    <p className="text-xs text-textSecondary">{row.count} anuncios</p>
                  </div>
                  <span className="font-geo text-sm font-bold text-primary">{money(row.avg_price_m2)}/m²</span>
                </div>
              ))}
              {!data.by_property_type.length && (
                <p className="py-3 text-sm text-textSecondary">Aún no hay suficientes datos comparables.</p>
              )}
            </div>
          </div>
          <div className="rounded-card bg-primaryLight p-5 text-sm leading-6 text-textSecondary">
            <p className="font-semibold text-textPrimary">Cómo leer estos datos</p>
            <p className="mt-1">{data.methodology}</p>
            <p className="mt-2">Los valores son referenciales y no sustituyen un avalúo profesional.</p>
            <p className="mt-2">
              <Link href="/metodologia" className="font-semibold text-primary hover:underline">
                Ver la metodología completa
              </Link>
            </p>
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatsTable
          title={cityName ? 'Evolución del precio' : 'Evolución por ciudad'}
          rows={data.evolution.map((row) => [
            row.city,
            `${row.change_pct > 0 ? '+' : ''}${row.change_pct}%`,
            `${money(row.current_price_m2)}/m²`,
          ])}
        />
        {/* Each zone now has a page of its own, and this table is the only
            place in the site that already names them. */}
        <StatsTable
          title="Sectores con inventario"
          rows={data.by_sector.map((row) => [
            cityName ? row.sector : `${row.sector}, ${row.city}`,
            `${row.count} anuncios`,
            `${money(row.avg_price_m2)}/m²`,
          ])}
          hrefs={data.by_sector.map((row) =>
            row.city && row.sector_key
              ? `/propiedades/${slugify(row.city)}/${slugify(row.sector_key)}`
              : null
          )}
        />
      </section>
    </>
  );
}

function StatsTable({
  title,
  rows,
  hrefs,
}: {
  title: string;
  rows: string[][];
  /** Optional destination per row, aligned by index. */
  hrefs?: (string | null)[];
}) {
  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold text-textPrimary">{title}</h2>
      <div className="mt-3 divide-y divide-line">
        {rows.slice(0, 8).map((row, index) => (
          <div key={`${row[0]}-${index}`} className="grid grid-cols-[1fr_auto] gap-x-3 py-3 text-sm">
            {hrefs?.[index] ? (
              <Link href={hrefs[index]!} className="font-semibold text-primary hover:underline">
                {row[0]}
              </Link>
            ) : (
              <span className="font-semibold text-textPrimary">{row[0]}</span>
            )}
            <span className="font-geo font-bold text-primary">{row[2]}</span>
            <span className="col-span-2 text-xs text-textSecondary">{row[1]}</span>
          </div>
        ))}
      </div>
      {!rows.length && <p className="mt-3 text-sm text-textSecondary">Aún no hay suficientes datos comparables.</p>}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Ruler;
  label: string;
  value: string;
  /** The figure the headline replaced, kept visible rather than dropped. */
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-button bg-primaryLight text-primary sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-[0.68rem] font-semibold uppercase leading-4 tracking-wide text-textSecondary sm:mt-4 sm:text-xs">{label}</p>
      <p className="mt-1 break-words font-geo text-lg font-black text-textPrimary sm:text-xl">{value}</p>
      {note && <p className="mt-1 text-[0.68rem] leading-4 text-textSecondary">{note}</p>}
    </div>
  );
}
