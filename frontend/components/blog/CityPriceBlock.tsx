/**
 * The block that makes an article worth citing.
 *
 * A guide about buying in Quito that offers only advice competes with every
 * other guide about buying in Quito. The same guide carrying today's price per
 * m² — a figure no other Ecuadorian portal publishes openly — is a source: it
 * is what the press links to and what the AI crawlers quote. Server-rendered on
 * purpose, since GPTBot and friends never run the JS that would fetch it.
 *
 * It also closes the loop the blog exists for: informational query in, city
 * inventory and price index out.
 */

import Link from 'next/link';
import {
  getMarketStats,
  money,
  integer,
  MIN_LISTINGS_FOR_PROMOTION,
} from '@/lib/market-stats';
import { slugify } from '@/lib/properties';

type CityPriceBlockProps = {
  city: string;
};

export type CityPriceFacts = {
  city: string;
  citySlug: string;
  pricePerM2: number;
  listings: number;
  changePct: number | null;
  sectors: Array<{ sector: string; avg_price_m2: number }>;
};

/**
 * Facts for one city, or null when the sample is too thin to publish. The page
 * uses the same result for the visible block and for the JSON-LD, so the schema
 * can never claim a figure the reader cannot see.
 */
export async function getCityPriceFacts(city: string): Promise<CityPriceFacts | null> {
  if (!city) return null;
  const stats = await getMarketStats(city);
  if (!stats) return null;

  const row =
    stats.by_city.find((entry) => slugify(entry.city || '') === slugify(city)) ??
    stats.overall;
  const listings = Number(row?.count || 0);
  const pricePerM2 = Number(row?.avg_price_m2 || 0);

  // Below the promotion threshold the average is noise. A number nobody can
  // stand behind is worse than no number: it is the kind of thing that gets a
  // site quoted once and distrusted afterwards.
  if (listings < MIN_LISTINGS_FOR_PROMOTION || pricePerM2 <= 0) return null;

  const evolution = stats.evolution.find(
    (entry) => slugify(entry.city || '') === slugify(city)
  );

  return {
    city,
    citySlug: slugify(city),
    pricePerM2,
    listings,
    changePct: evolution ? Number(evolution.change_pct) : null,
    sectors: stats.by_sector
      .filter((entry) => slugify(entry.city || '') === slugify(city))
      .slice(0, 3)
      .map((entry) => ({ sector: entry.sector, avg_price_m2: entry.avg_price_m2 })),
  };
}

export default async function CityPriceBlock({ city }: CityPriceBlockProps) {
  const facts = await getCityPriceFacts(city);
  const citySlug = slugify(city);

  // No usable figures still leaves the bridge: the reader of a Quito article
  // should always land one click from Quito's inventory.
  if (!facts) {
    return (
      <aside className="mt-10 rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-textPrimary">
          Propiedades en {city}
        </h2>
        <p className="mt-2 text-sm leading-6 text-textSecondary">
          Mira el inventario disponible en {city} sobre el mapa, con precio y
          ubicación exacta.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/propiedades/${citySlug}`}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
          >
            Ver propiedades en {city}
          </Link>
        </div>
      </aside>
    );
  }

  const rising = facts.changePct !== null && facts.changePct > 0;

  return (
    <aside
      className="mt-10 rounded-card border border-line bg-surface p-5"
      aria-labelledby="precio-m2-ciudad"
    >
      <h2 id="precio-m2-ciudad" className="text-lg font-semibold text-textPrimary">
        Precio del m² en {facts.city} hoy
      </h2>

      {/* The answer first, in one sentence: this is the passage an AI answer
          lifts, and a lead paragraph of context would bury it. */}
      <p className="mt-2 leading-7 text-textSecondary">
        El metro cuadrado en {facts.city} promedia{' '}
        <strong className="font-semibold text-textPrimary">
          {money(facts.pricePerM2)}
        </strong>{' '}
        según {integer(facts.listings)} anuncios comparables publicados en Geo
        Propiedades Ecuador
        {facts.changePct !== null && Number.isFinite(facts.changePct)
          ? `, ${rising ? 'un alza' : 'una baja'} de ${Math.abs(facts.changePct).toFixed(1)}% frente al periodo anterior`
          : ''}
        .
      </p>

      {facts.sectors.length > 0 && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {facts.sectors.map((sector) => (
            <div key={sector.sector} className="rounded-lg border border-line bg-white p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">
                {sector.sector}
              </dt>
              <dd className="mt-1 font-geo text-base font-semibold text-textPrimary">
                {money(sector.avg_price_m2)}/m²
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={`/propiedades/${facts.citySlug}`}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
        >
          Ver propiedades en {facts.city}
        </Link>
        <Link
          href={`/estadisticas-inmobiliarias/${facts.citySlug}`}
          className="inline-flex items-center rounded-lg border border-line px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
        >
          Índice de precios de {facts.city}
        </Link>
      </div>

      <p className="mt-3 text-xs leading-5 text-textSecondary">
        Cifras calculadas sobre los anuncios activos del portal, excluyendo
        valores atípicos. Puedes citarlas enlazando a esta página.{' '}
        <Link
          href="/estadisticas-inmobiliarias"
          className="text-primary hover:underline"
        >
          Metodología
        </Link>
        .
      </p>
    </aside>
  );
}
