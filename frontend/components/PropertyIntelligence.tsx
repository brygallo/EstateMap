import Link from 'next/link';
import { AlertTriangle, BarChart3, CalendarClock, Camera, MapPin, Ruler, TrendingUp } from 'lucide-react';
import { money as formatMoney } from '@/lib/market-stats';
import type { Comparable, Confidence, Intelligence } from '@/lib/intelligence';
import { cn } from '@/lib/utils';

// Presentational on purpose: it receives the analysis instead of fetching it,
// so the property page can render it on the server and the map modal can keep
// asking for it from the browser. See `lib/intelligence.ts` for why that
// matters — this block is the only content on a ficha that is not the
// advertiser's, and a crawler has to find it in the HTML.
//
// It is called an analysis and not «inteligencia del anuncio» because it is
// read by whoever is deciding whether to buy, not by whoever published.

const demandLabel = { low: 'Baja', medium: 'Media', high: 'Alta' };
const demandColor = {
  low: 'bg-red-500 ring-red-100',
  medium: 'bg-amber-400 ring-amber-100',
  high: 'bg-emerald-500 ring-emerald-100',
};

// Shared currency formatter; null means the backend had no sample to compare.
const money = (value: number | null) => (value == null ? 'Sin datos' : formatMoney(value));

/** What the reader should do with the range, said in words. */
const CONFIDENCE_NOTE: Record<Confidence, string> = {
  high: 'Confianza alta: la muestra es amplia.',
  medium: 'Confianza media: la muestra es suficiente para orientarse.',
  low: 'Confianza baja: la muestra es pequeña, tómalo como una referencia.',
  insufficient: 'Muestra insuficiente: no hay comparables bastantes para afirmar nada.',
};

/** How long the listing has been published, in words a person uses. */
function publishedFor(days: number): string {
  if (days <= 0) return 'Publicado hoy';
  if (days === 1) return 'Publicado ayer';
  if (days < 30) return `Publicado hace ${days} días`;
  const months = Math.round(days / 30);
  if (months === 1) return 'Publicado hace un mes';
  if (months < 12) return `Publicado hace ${months} meses`;
  const years = Math.round(days / 365);
  return years === 1 ? 'Publicado hace un año' : `Publicado hace ${years} años`;
}

/**
 * The verdict in a sentence: how this price stands against the comparables, and
 * what the same square metres would cost at the median.
 *
 * A percentage alone leaves the reader doing arithmetic on the only question
 * that matters. The gap in dollars answers it, and naming the sample and the
 * place keeps the sentence checkable instead of authoritative.
 */
function priceVerdict(data: Intelligence): string | null {
  const { difference_pct: difference, sample_size: sample } = data.comparison;
  if (difference == null || sample < 1) return null;
  const direction = difference > 0 ? 'sobre' : 'bajo';
  const magnitude = Math.abs(difference);
  const head =
    magnitude < 3
      ? `Esta propiedad está en línea con la mediana de ${sample} comparables en ${data.scope_label}.`
      : `Esta propiedad está ${magnitude}% ${direction} la mediana de ${sample} comparables en ${data.scope_label}.`;
  if (data.estimated_price == null || data.difference_amount == null) return head;
  const gap = Math.abs(data.difference_amount);
  const tail =
    magnitude < 3
      ? `A la mediana de la zona costaría ${formatMoney(data.estimated_price)}.`
      : `A la mediana de la zona costaría ${formatMoney(data.estimated_price)}: ${formatMoney(gap)} ${
          data.difference_amount > 0 ? 'más de lo que se pide allí' : 'menos de lo que se pide allí'
        }.`;
  return `${head} ${tail}`;
}

export default function PropertyIntelligence({
  data,
  compact = false,
}: {
  data: Intelligence;
  compact?: boolean;
}) {
  const difference = data.comparison.difference_pct;
  const verdict = priceVerdict(data);
  const scopeSentence =
    data.scope === 'sector'
      ? `Comparado con propiedades del mismo tipo y operación en ${data.scope_label}.`
      : `Comparado con propiedades del mismo tipo y operación en ${data.scope_label}. No hay bastantes anuncios en el sector para compararlo solo con su zona.`;

  return <section className={cn('rounded-card border border-line bg-surface shadow-card', compact ? 'p-3' : 'mt-8 p-5 sm:p-6')}>
    <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className={cn('font-bold text-textPrimary', compact ? 'text-sm' : 'text-xl')}>Análisis de precio y mercado</h2></div>
    <p className="mt-1 text-sm text-textSecondary">{scopeSentence}</p>

    {verdict && (
      <p className={cn('mt-3 rounded-card bg-primaryLight p-4 text-textPrimary', compact ? 'text-sm' : 'text-base')}>
        {verdict}{' '}
        <span className="text-textSecondary">{CONFIDENCE_NOTE[data.comparison.confidence]}</span>
      </p>
    )}

    <div className={cn('grid gap-3', compact ? 'mt-3 grid-cols-1' : 'mt-5 sm:grid-cols-2 lg:grid-cols-3')}>
      <Metric icon={Ruler} label="Precio por m²" value={`${money(data.price_per_m2)}/m²`} />
      <Metric icon={TrendingUp} label="Frente a similares" value={difference == null ? 'Sin muestra' : `${difference > 0 ? '+' : ''}${difference}%`} />
      <DemandMetric level={data.demand.level} windowDays={data.demand.window_days} />
    </div>

    <div className={cn('mt-4 grid gap-3', !compact && 'md:grid-cols-2')}>
      <div className="rounded-card bg-background p-4 text-sm"><p className="font-semibold text-textPrimary">Rango habitual de la zona</p><p className="mt-1 text-textSecondary">{money(data.zone_range.low)}–{money(data.zone_range.high)}/m² · {data.comparison.sample_size} comparables</p><p className="mt-1 text-textSecondary">Oferta disponible: {data.available_supply} propiedades comparables</p></div>
      {data.comparison.sample_size >= 4 && difference != null && (
        <div className={`rounded-card p-4 text-sm ${data.price_alert ? 'bg-amber-50 text-amber-900' : 'bg-primaryLight text-textSecondary'}`}><p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Evaluación de precio</p><p className="mt-1">{data.price_alert === 'above_range' ? 'El precio está inusualmente por encima del rango comparable.' : data.price_alert === 'below_range' ? 'El precio está inusualmente por debajo del rango comparable.' : 'El precio se encuentra dentro del comportamiento esperado.'}</p></div>
      )}
    </div>

    {!compact && data.comparables?.length > 0 && (
      <div className="mt-6">
        <h3 className="text-base font-bold text-textPrimary">Con qué se está comparando</h3>
        <p className="mt-1 text-sm text-textSecondary">Las propiedades más parecidas en tamaño dentro del mismo universo. Puedes abrirlas y juzgar por tu cuenta.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.comparables.map((comparable) => (
            <ComparableCard key={comparable.id} comparable={comparable} />
          ))}
        </ul>
      </div>
    )}

    {!compact && <ListingQuality quality={data.listing_quality} />}

    {/* Time on the market is the one thing a listing never says about itself,
        and it is what tells a reader whether the price has been tested. */}
    <p className="mt-4 flex items-center gap-2 text-sm text-textSecondary"><CalendarClock className="h-4 w-4 text-primary" aria-hidden />{publishedFor(data.published_days)}</p>
    {data.price_history.length > 1 && <div className="mt-2 text-sm text-textSecondary"><span className="font-semibold text-textPrimary">Evolución publicada:</span> {data.price_history.map((point) => `${new Date(point.recorded_at).toLocaleDateString('es-EC')}: ${money(Number(point.price))}`).join(' → ')}</div>}
    <p className="mt-4 text-xs text-textSecondary">{data.methodology}</p>
  </section>;
}

function ComparableCard({ comparable }: { comparable: Comparable }) {
  const price = Number(comparable.price);
  const area = Number(comparable.area);
  const specs = [
    Number.isFinite(area) && area > 0 ? `${Math.round(area).toLocaleString('es-EC')} m²` : '',
    (comparable.rooms ?? 0) > 0 ? `${comparable.rooms} dorm.` : '',
    (comparable.bathrooms ?? 0) > 0 ? `${comparable.bathrooms} baños` : '',
  ].filter(Boolean);

  return (
    <li className="overflow-hidden rounded-card border border-line bg-white transition-shadow hover:shadow-cardHover">
      <Link href={`/propiedad/${comparable.id}`} className="block">
        {comparable.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comparable.image} alt="" className="h-28 w-full object-cover" loading="lazy" />
        )}
        <div className="p-3">
          <p className="font-geo text-base font-bold text-textPrimary">
            {Number.isFinite(price) ? formatMoney(price) : 'Consultar'}
          </p>
          <p className="mt-0.5 text-xs text-textSecondary">
            {comparable.price_per_m2 != null ? `${formatMoney(comparable.price_per_m2)}/m²` : 'Sin precio por m²'}
            {comparable.difference_pct != null && (
              <> · {comparable.difference_pct > 0 ? 'esta cuesta ' : 'esta cuesta '}
                {Math.abs(comparable.difference_pct)}% {comparable.difference_pct > 0 ? 'más' : 'menos'}
              </>
            )}
          </p>
          {specs.length > 0 && <p className="mt-1 text-xs text-textSecondary">{specs.join(' · ')}</p>}
          {comparable.distance_km != null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-textSecondary"><MapPin className="h-3 w-3" aria-hidden />a {comparable.distance_km} km</p>
          )}
        </div>
      </Link>
    </li>
  );
}

/**
 * What the advertisement declares, never what the property is worth.
 *
 * «Sin ubicación en el mapa» is a fact about the listing; a grade for the house
 * would be an opinion the portal has no business publishing.
 */
function ListingQuality({ quality }: { quality: Intelligence['listing_quality'] }) {
  const updated = quality.updated_at ? new Date(quality.updated_at) : null;
  return (
    <div className="mt-6 rounded-card bg-background p-4 text-sm">
      <p className="font-semibold text-textPrimary">Qué declara este anuncio</p>
      <ul className="mt-2 grid gap-1 text-textSecondary sm:grid-cols-2">
        <li className="flex items-center gap-2"><Camera className="h-4 w-4 text-primary" aria-hidden />{quality.photos > 0 ? `${quality.photos} ${quality.photos === 1 ? 'fotografía' : 'fotografías'}` : 'Sin fotografías'}</li>
        <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" aria-hidden />{quality.has_location ? 'Ubicación en el mapa' : 'Sin ubicación en el mapa'}</li>
        {updated && !Number.isNaN(updated.getTime()) && (
          <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" aria-hidden />Actualizado el {updated.toLocaleDateString('es-EC')}</li>
        )}
      </ul>
      {quality.missing.length > 0 && (
        <p className="mt-2 text-textSecondary">Le faltan: {quality.missing.join(', ')}.</p>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Ruler; label: string; value: string; detail?: string }) {
  return <div className="rounded-card border border-line bg-white p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-1 font-geo text-lg font-bold text-textPrimary">{value}</p>{detail && <p className="text-xs text-textSecondary">{detail}</p>}</div>;
}

function DemandMetric({ level, windowDays }: { level: Intelligence['demand']['level']; windowDays?: number }) {
  return <div className="rounded-card border border-line bg-white p-4">
    <span className={`block h-4 w-4 rounded-full ring-4 ${demandColor[level]}`} aria-hidden />
    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">Interés reciente</p>
    <p className="mt-1 font-geo text-lg font-bold text-textPrimary">{demandLabel[level]}</p>
    <p className="text-xs text-textSecondary">frente a anuncios comparables{windowDays ? `, ${windowDays} días` : ''}</p>
  </div>;
}

/** Skeleton the client wrapper shows while the analysis is still in flight. */
export function PropertyIntelligenceSkeleton({ compact = false }: { compact?: boolean }) {
  return <section className={cn('animate-pulse rounded-card border border-line bg-surface shadow-card motion-reduce:animate-none', compact ? 'p-3' : 'mt-8 p-5 sm:p-6')} aria-hidden>
    <div className={cn('h-6 rounded-card bg-muted', compact ? 'w-44' : 'w-56')} />
    <div className={cn('mt-2 h-4 max-w-full rounded-card bg-muted', compact ? 'w-56' : 'w-72')} />
    <div className={cn('grid gap-3', compact ? 'mt-3 grid-cols-1' : 'mt-5 sm:grid-cols-2 lg:grid-cols-3')}>
      <div className="h-24 rounded-card bg-muted" />
      <div className="h-24 rounded-card bg-muted" />
      <div className="h-24 rounded-card bg-muted" />
    </div>
  </section>;
}
