import Link from 'next/link';

import { integer, money } from '@/lib/market-stats';
import { slugify } from '@/lib/properties';
import { getRanking } from '@/lib/rankings';
import { listLivePages } from '@/lib/live-resolve';
import { placeInPhrase, typeGender } from '@/lib/live-pages';

/**
 * What is cheapest in this city right now, inside the article.
 *
 * An advice piece about buying in Quito ages the day it is published. The same
 * piece carrying three real listings and the price they ask stops being advice
 * and starts being a snapshot — one that recalculates itself with the
 * inventory, so the article is as true in November as the day it went out.
 *
 * It is also the shortest bridge the blog has to the catalogue: informational
 * query in, a listing with a price and a map link out.
 */

type CityRankingBlockProps = {
  city: string;
};

const SHOWN = 3;

export default async function CityRankingBlock({ city }: CityRankingBlockProps) {
  if (!city) return null;

  const citySlug = slugify(city);
  const ranking = await getRanking({
    criterion: 'cheapest',
    status: 'for_sale',
    city,
    limit: String(SHOWN),
  });

  // Below the threshold there is no snapshot worth showing, and the article
  // already carries the price block and its links.
  if (!ranking || !ranking.eligible || ranking.items.length === 0) return null;

  // The living pages of this same city, so the block ends somewhere: the
  // reader who wants the full list has it one click away, and the ranking
  // pages get the internal links they need to be crawled.
  const livePages = (await listLivePages()).filter(
    (page) => page.recipe.scope.kind === 'city' && page.recipe.scope.slug === citySlug
  );
  const cheapestPage = livePages.find((page) => page.recipe.criterion.criterion === 'cheapest');
  const others = livePages.filter((page) => page !== cheapestPage).slice(0, 3);

  return (
    <aside
      className="mt-10 rounded-card border border-line bg-surface p-5"
      aria-labelledby="ranking-vivo-ciudad"
    >
      <h2 id="ranking-vivo-ciudad" className="text-lg font-semibold text-textPrimary">
        Lo más barato en {city} ahora mismo
      </h2>
      <p className="mt-2 text-sm leading-6 text-textSecondary">
        {`Sobre ${integer(ranking.sample_size)} anuncios en venta activos${
          ranking.context.benchmark
            ? `, cuyo precio por m² promedia ${money(ranking.context.benchmark)}`
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
        <Link
          href={`/propiedades/${citySlug}`}
          className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
        >
          Todo el catálogo {placeInPhrase({ kind: 'city', slug: citySlug, name: city })}
        </Link>
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
