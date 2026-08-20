/**
 * Server-side fetcher for the public market-stats API.
 *
 * The stats pages must ship real figures in the HTML: Google ranks them faster
 * and AI crawlers (GPTBot, ClaudeBot, PerplexityBot) never execute JS, so a
 * client-side fetch would leave the most citable pages of the site empty.
 */

import { getServerApiUrl } from './api-url';

export type StatRow = {
  city?: string;
  province?: string;
  property_type?: string;
  status?: string;
  count: number;
  avg_price_m2: number;
  avg_price: number;
  avg_area: number;
  updated_at?: string | null;
};

export type MarketStats = {
  overall: StatRow & { min_price_m2: number; max_price_m2: number };
  by_city: StatRow[];
  by_property_type: StatRow[];
  by_operation: StatRow[];
  by_sector: Array<{
    city: string;
    sector: string;
    /** Normalized key, the address the zone page answers at. */
    sector_key: string;
    count: number;
    avg_price_m2: number;
  }>;
  evolution: Array<{ city: string; current_price_m2: number; previous_price_m2: number; change_pct: number }>;
  growth_zones: Array<{ city: string; change_pct: number }>;
  estimated_market_days: number;
  outliers_excluded: number;
  methodology: string;
};

export async function getMarketStats(city?: string): Promise<MarketStats | null> {
  try {
    const query = city ? `?city=${encodeURIComponent(city)}` : '';
    const res = await fetch(`${getServerApiUrl()}/market-stats/${query}`, {
      next: { revalidate: 1800, tags: ['market-stats'] },
    });
    if (!res.ok) return null;
    return (await res.json()) as MarketStats;
  } catch (error) {
    console.error('Error fetching market stats:', error);
    return null;
  }
}

export const money = (value?: number) =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const integer = (value?: number) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(Number(value || 0));

// Aggregate rows read better in plural; the canonical map lives with the rest
// of the property labels so wording stays consistent across the site.
export { PROPERTY_TYPE_PLURAL_LABELS as TYPE_LABELS } from './property-labels';

/** Cities need a handful of comparable sale listings before their stats page
 * is worth indexing; below this the page stays crawlable but noindex. */
export const MIN_LISTINGS_FOR_INDEX = 3;

/** Stricter threshold for discovery surfaces (sitemap, llms.txt, internal
 * links) so they only promote pages that are safely above the index gate. */
export const MIN_LISTINGS_FOR_PROMOTION = 5;
