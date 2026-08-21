/**
 * Named zones — the neighbourhood, urbanization or building a listing sits in.
 *
 * The catalogue's finest geography, and the one Search Console says people
 * type: «urbanización Gardenia», «edificio Vista Linda», «Kennedy Norte». The
 * key and the display name are resolved by the backend so the stats table, the
 * zone page and the sitemap all name a zone the same way.
 */
import { getServerApiUrl, getServerApiHeaders } from '@/lib/api-url';
import { slugify, type Property } from '@/lib/properties';

/** A zone needs the same inventory a local landing needs to be indexed (SEO-001). */
export const MIN_SECTOR_LISTINGS = 5;

export type Sector = {
  city: string;
  province: string;
  sector_key: string;
  name: string;
  count: number;
  avg_price_m2: number | null;
  /** Keys this zone absorbed. Their URLs are indexed and must still lead here. */
  aliases: string[];
  updated_at: string | null;
};

/** URL segment for a zone: «Puerto Santa Ana» → `puerto-santa-ana`. */
export function sectorSlug(sector: Pick<Sector, 'sector_key'>): string {
  return slugify(sector.sector_key);
}

export async function getSectors(
  city?: string,
  minimum = MIN_SECTOR_LISTINGS,
  revalidate = 3600
): Promise<Sector[]> {
  try {
    const params = new URLSearchParams({ min: String(minimum) });
    if (city) params.set('city', city);
    const response = await fetch(`${getServerApiUrl()}/properties/sectors/?${params.toString()}`, {
      next: { revalidate, tags: ['properties'] },
      headers: getServerApiHeaders(),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (payload.sectors ?? []) as Sector[];
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return [];
  }
}

/**
 * The zone behind a URL, resolved by slug rather than by reversing it.
 *
 * A name can carry hyphens of its own, so turning `puerto-santa-ana` back into
 * a key would be guesswork; comparing slugs is exact.
 *
 * An absorbed zone answers here too, under the URL it used to own. That URL is
 * already indexed and already linked; letting it 404 would throw away whatever
 * it had earned. The caller compares slugs to decide whether to redirect.
 */
export async function findSector(citySlug: string, sectorParam: string): Promise<Sector | null> {
  const sectors = await getSectors(undefined, 1);
  const inCity = sectors.filter((sector) => slugify(sector.city) === citySlug);
  return (
    inCity.find((sector) => sectorSlug(sector) === sectorParam) ??
    inCity.find((sector) =>
      (sector.aliases ?? []).some((alias) => slugify(alias) === sectorParam)
    ) ??
    null
  );
}

export async function getSectorProperties(
  sector: Sector,
  revalidate = 1800
): Promise<Property[]> {
  try {
    const params = new URLSearchParams({
      city: sector.city,
      sector: sector.sector_key,
      page_size: '120',
      include_images: '1',
    });
    const response = await fetch(`${getServerApiUrl()}/properties/?${params.toString()}`, {
      next: { revalidate, tags: ['properties'] },
      headers: getServerApiHeaders(),
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return (Array.isArray(payload) ? payload : (payload.results ?? [])) as Property[];
  } catch (error) {
    console.error('Error fetching sector properties:', error);
    return [];
  }
}
