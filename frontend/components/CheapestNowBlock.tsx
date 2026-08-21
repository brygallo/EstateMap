import Link from 'next/link';

import { integer, money } from '@/lib/market-stats';
import { slugify } from '@/lib/properties';
import { getRanking } from '@/lib/rankings';
import { listLivePages } from '@/lib/live-resolve';
import { placeInPhrase, typeGender } from '@/lib/live-pages';

/**
 * What is cheapest in this slice of the market right now, with the listing
 * that proves it.
 *
 * A landing that says «desde $20.000» has the answer and withholds it: the
 * reader — and anything reading on their behalf — still has to guess which
 * listing that is. Naming it, with its area, its price per m² and its distance
 * from the local average, turns a range into an answer that can be quoted.
 *
 * It is also the shortest bridge to the catalogue: an informational query in, a
 * listing with a price and a map link out.
 *
 * The block renders nothing at all when the slice is below the ranking
 * threshold. A «cheapest» computed over four listings is not a market reading,
 * and a page is better off silent than confidently wrong.
 */

type CheapestNowBlockProps = {
  /** City name, or omitted for a national slice. */
  city?: string;
  /** `house`, `apartment`… Omitted means every type pooled. */
  propertyType?: string;
  status?: string;
  /** How to name the slice in prose: «departamentos en venta en Guayaquil». */
  segmentLabel?: string;
};

const SHOWN = 3;

export default async function CheapestNowBlock({
  city,
  propertyType,
  status = 'for_sale',
  segmentLabel,
}: CheapestNowBlockProps) {
  const citySlug = city ? slugify(city) : '';
  const ranking = await getRanking({
    criterion: 'cheapest',
    status,
    limit: String(SHOWN),
    ...(city ? { city } : {}),
    ...(propertyType ? { type: propertyType } : {}),
  });

  // Below the threshold there is no snapshot worth showing.
  if (!ranking || !ranking.eligible || ranking.items.length === 0) return null;

  const leader = ranking.items[0];
  const where = city ? `en ${city}` : 'en Ecuador';
  const segment = segmentLabel ?? `propiedades en venta ${where}`;

  // The living pages of the same scope, so the block ends somewhere: the reader
  // who wants the full list has it one click away, and the ranking pages get
  // the internal links they need to be crawled.
  const livePages = (await listLivePages()).filter((page) =>
    city
      ? page.recipe.scope.kind === 'city' && page.recipe.scope.slug === citySlug
      : page.recipe.scope.kind === 'country'
  );
  const cheapestPage = livePages.find(
    (page) =>
      page.recipe.criterion.criterion === 'cheapest' &&
      (!propertyType || page.recipe.typeDef.type === propertyType)
  );
  const others = livePages.filter((page) => page !== cheapestPage).slice(0, 3);

  return (
    <aside
      className="mt-10 rounded-card border border-line bg-surface p-5"
      aria-labelledby="ranking-vivo-ciudad"
    >
      <h2 id="ranking-vivo-ciudad" className="text-lg font-semibold text-textPrimary">
        ¿Cuál es {segmentLabel ? 'el más barato' : `lo más barato ${where}`} ahora mismo?
      </h2>
      <p className="mt-2 text-sm leading-6 text-textSecondary">
        {`El más barato de los ${integer(ranking.sample_size)} ${segment} cuesta ${money(
          leader.price ?? 0
        )}${
          ranking.context.benchmark
            ? `, frente a un precio por m² que promedia ${money(ranking.context.benchmark)} en la zona`
            : ''
        }. Se recalcula con el inventario publicado.`}
      </p>

      <ol className="mt-4 space-y-2">
        {ranking.items.map((item, index) => (
          <li key={item.id} className="rounded-lg border border-line bg-white p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Link
                href={`/propiedad/${item.id}`}
                className="text-sm font-semibold text-textPrimary hover:text-primary"
              >
                {index + 1}. {item.title}
              </Link>
              <span className="font-geo text-sm font-bold tabular-nums text-primary">
                {money(item.price ?? 0)}
              </span>
            </div>
            <p className="mt-1 text-xs text-textSecondary">
              {item.area ? `${integer(item.area)} m²` : 'Área no declarada'}
              {item.price_per_m2 ? ` · ${money(item.price_per_m2)}/m²` : ''}
              {item.delta_pct !== null && Math.abs(item.delta_pct) >= 1
                ? ` · ${integer(Math.abs(item.delta_pct))} % ${
                    item.delta_pct < 0 ? 'por debajo' : 'por encima'
                  } del precio por m² promedio`
                : ''}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-3">
        {cheapestPage && (
          <Link
            href={`/blog/${cheapestPage.slug}`}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
          >
            Ver la lista completa
          </Link>
        )}
        {city && (
          <Link
            href={`/propiedades/${citySlug}`}
            className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
          >
            Todo el catálogo {placeInPhrase({ kind: 'city', slug: citySlug, name: city })}
          </Link>
        )}
      </div>

      {others.length > 0 && (
        <p className="mt-3 text-xs leading-5 text-textSecondary">
          También:{' '}
          {others.map((page, index) => (
            <span key={page.slug}>
              {index > 0 ? ' · ' : ''}
              <Link href={`/blog/${page.slug}`} className="text-primary hover:underline">
                {page.recipe.typeDef.plural.toLowerCase()}{' '}
                {page.recipe.criterion.label[typeGender(page.recipe.typeDef)]}
              </Link>
            </span>
          ))}
        </p>
      )}
    </aside>
  );
}
