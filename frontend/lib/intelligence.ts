/**
 * The listing's own analysis: price per m², the zone's usual range, comparables
 * and how long it has been published.
 *
 * This is the only part of a ficha that does not exist anywhere else. Every
 * other block — photos, specs, description — is the advertiser's, and when the
 * same listing is published elsewhere a search engine has to choose between two
 * pages carrying the same content. This one is computed here, from the whole
 * active catalogue, and it is what makes the page worth ranking on its own.
 *
 * It is fetched on the server for exactly that reason. It used to load from the
 * browser after hydration, which meant the HTML a crawler reads carried none of
 * it: no "precio por m²", no zone range, no comparables. Rendering it here puts
 * the differentiating content in the markup, where it counts.
 */

import { getServerApiUrl } from './api-url';
import { serverFetch } from './server-fetch';

const API_URL = getServerApiUrl();

export type PriceAlert = 'above_range' | 'below_range' | null;

export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';

/** One of the listings the range was built from, as the page shows it. */
export type Comparable = {
  id: number;
  title?: string;
  price?: number | string | null;
  area?: number | string | null;
  rooms?: number | null;
  bathrooms?: number | null;
  price_per_m2: number | null;
  difference_pct: number | null;
  distance_km: number | null;
  image: string | null;
};

export type Intelligence = {
  price_per_m2: number | null;
  zone: string;
  /** Whether the comparison is against the named zone or the whole city. */
  scope: 'sector' | 'city';
  scope_label: string;
  zone_range: { low: number | null; median: number | null; high: number | null };
  comparison: { sample_size: number; difference_pct: number | null; confidence: Confidence };
  /** What the same square metres cost at the median, and the gap in money. */
  estimated_price: number | null;
  difference_amount: number | null;
  comparables: Comparable[];
  listing_quality: {
    photos: number;
    has_location: boolean;
    updated_at: string | null;
    missing: string[];
  };
  price_alert: PriceAlert;
  price_history: Array<{ price: number | string; recorded_at: string }>;
  available_supply: number;
  published_days: number;
  publication_basis: 'source' | 'detected' | 'platform';
  /**
   * Only the level travels to a public page. The raw counters are owner/staff
   * data (VIS-001) and the API already leaves them out of an anonymous answer;
   * they are stripped again here so no future change on the other side can put
   * a visit counter inside server-rendered HTML.
   */
  demand: { level: 'low' | 'medium' | 'high'; window_days?: number };
  methodology: string;
};

/** Drops anything the public page must not carry, whatever the API answered. */
function publicOnly(payload: Record<string, unknown>): Intelligence {
  const demand = (payload.demand ?? {}) as { level?: Intelligence['demand']['level'] };
  return {
    ...(payload as unknown as Intelligence),
    demand: { level: demand.level ?? 'medium' },
  };
}

/**
 * The analysis for one listing, or null when the API never answered.
 *
 * The window matches the ficha's own `revalidate`: the block is rebuilt with
 * the page rather than on a schedule of its own, so what the reader sees and
 * what the analysis says always come from the same render.
 */
export async function getPropertyIntelligence(
  id: number | string,
  revalidate = 300
): Promise<Intelligence | null> {
  try {
    const res = await serverFetch(`${API_URL}/properties/${id}/intelligence/`, {
      next: { revalidate, tags: ['properties', `property-${id}`] },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res || !res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return publicOnly(data as Record<string, unknown>);
  } catch (error) {
    console.error('Error fetching property intelligence:', error);
    return null;
  }
}
