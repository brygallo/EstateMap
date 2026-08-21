/**
 * Reads the resolved rankings the living pages are built from.
 *
 * The order, the plausibility guard and the comparison average all live in the
 * backend (`services/rankings.py`); this side only asks and renders. The cache
 * tag is the inventory one, so a page recalculates itself when the market it
 * describes changes, not on a timer.
 */
import { getServerApiUrl } from '@/lib/api-url';
import { serverFetch } from '@/lib/server-fetch';

export type RankingItem = {
  id: number;
  title: string;
  /** Main photo of the listing, thumbnail when the worker already made one. */
  image: string | null;
  property_type: string;
  status: string;
  city: string | null;
  province: string | null;
  address: string | null;
  price: number | null;
  area: number | null;
  price_per_m2: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
  value: number | null;
  /** Distance to the scope average, on the axis named by `comparison`. */
  delta_pct: number | null;
};

export type Ranking = {
  criterion: string;
  label: string;
  comparison: 'price_per_m2' | 'area' | 'none';
  limit: number;
  sample_size: number;
  implausible_excluded: number;
  duplicates_collapsed?: number;
  minimum: number;
  eligible: boolean;
  /** Whether this ranking earns a slot in the index and in the sitemap. */
  indexable: boolean;
  context: {
    average: number | null;
    benchmark: number | null;
    avg_price: number | null;
    avg_area: number | null;
    avg_price_m2: number | null;
    updated_at: string | null;
  };
  items: RankingItem[];
};

export async function getRanking(
  query: Record<string, string>,
  revalidate = 1800
): Promise<Ranking | null> {
  try {
    const params = new URLSearchParams(query);
    const response = await serverFetch(`${getServerApiUrl()}/properties/rankings/?${params.toString()}`, {
      next: { revalidate, tags: ['properties'] },
    });
    if (!response || !response.ok) return null;
    return (await response.json()) as Ranking;
  } catch (error) {
    console.error('Error fetching ranking:', error);
    return null;
  }
}

export type ScopeRow = {
  city?: string | null;
  province?: string | null;
  property_type?: string | null;
  status?: string | null;
  total: number;
  with_price: number;
  with_area: number;
};

export type RankingScopes = {
  minimum: number;
  minimum_indexable: number;
  minimum_narrow_criteria: number;
  broad_criteria: string[];
  country: { total: number; with_price: number; with_area: number };
  by_type: ScopeRow[];
  by_type_status: ScopeRow[];
  by_city: ScopeRow[];
  by_province: ScopeRow[];
};

/**
 * Which places hold enough inventory for a living page to exist.
 *
 * One request answers for every candidate page at once, which is what makes
 * `generateStaticParams` and the sitemap affordable: the alternative is asking
 * per recipe and discovering that most have nothing.
 */
export async function getRankingScopes(revalidate = 3600): Promise<RankingScopes | null> {
  try {
    const response = await serverFetch(`${getServerApiUrl()}/properties/ranking-scopes/`, {
      next: { revalidate, tags: ['properties'] },
    });
    if (!response || !response.ok) return null;
    return (await response.json()) as RankingScopes;
  } catch (error) {
    console.error('Error fetching ranking scopes:', error);
    return null;
  }
}
