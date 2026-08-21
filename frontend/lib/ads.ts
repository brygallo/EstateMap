/**
 * Advertising slots for the whole portal.
 *
 * The rotation is deterministic on purpose. Picking at random on the server
 * would make every page uncacheable, and picking on the client would flash a
 * different ad after hydration. Instead the choice is a hash of two things: what
 * identifies the page, and the half-hour window we are in.
 *
 * That second half is what makes it a rotation rather than a fixed assignment.
 * Hashing the page alone — which is what the blog did — spreads impressions
 * across thousands of listings, but whoever comes back to the same property
 * always sees the same advertiser, and that is not what was sold. With the
 * window in the seed, one listing cycles through its advertisers about
 * forty-eight times a day and the page still serves from cache.
 *
 * Half an hour is not an arbitrary number: it is the TTL the API payload and
 * the page revalidation already use, so the window turns over exactly when the
 * page is regenerated. The rotation costs no extra request.
 *
 * What this does not do: reload the same page twice inside one window and you
 * get the same ad. That is the price of serving cached pages.
 */

import { getServerApiUrl, getServerApiHeaders } from './api-url';

export type AdKind = 'paid' | 'partner' | 'promo';

export type AdSlotData = {
  id: number;
  placement: string;
  kind: AdKind;
  headline: string;
  body: string;
  cta_label: string;
  image: string | null;
  image_alt: string;
  /** Null on a house sign: it goes to WhatsApp, not through the redirect. */
  click_path: string | null;
  weight: number;
  advertiser: {
    name: string;
    slug: string;
    tagline: string;
    logo: string | null;
    logo_alt: string;
  } | null;
};

export type Placement =
  | 'index_top'
  | 'index_feed'
  | 'post_inline'
  | 'post_footer'
  | 'category_top'
  | 'home_feed'
  | 'city_hero'
  | 'listing_feed'
  | 'property_sidebar'
  | 'property_footer'
  | 'stats_inline'
  | 'site_footer';

/** Human names for the placements, for the WhatsApp message a reader sends. */
export const PLACEMENT_LABELS: Record<Placement, string> = {
  index_top: 'portada del blog',
  index_feed: 'rejilla del blog',
  post_inline: 'dentro de un artículo',
  post_footer: 'final de un artículo',
  category_top: 'categoría del blog',
  home_feed: 'lista de resultados del mapa',
  city_hero: 'cabecera de ciudad',
  listing_feed: 'rejilla de propiedades',
  property_sidebar: 'ficha de propiedad',
  property_footer: 'final de una ficha',
  stats_inline: 'estadísticas del mercado',
  site_footer: 'pie de página',
};

export const ROTATION_WINDOW_MS = 30 * 60 * 1000;
const REVALIDATE_SECONDS = ROTATION_WINDOW_MS / 1000;

export async function getAdSlots(
  placement: Placement,
  city?: string | null,
  province?: string | null
): Promise<AdSlotData[]> {
  const query = new URLSearchParams({ placement });
  if (city) query.set('city', city);
  if (province) query.set('province', province);

  try {
    const res = await fetch(`${getServerApiUrl()}/ads/?${query.toString()}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['ads', `ads-${placement}`] },
      headers: getServerApiHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    // A slot is never worth failing a page over.
    console.error('Error fetching ad slots:', error);
    return [];
  }
}

/** Stable 32-bit hash of a string (FNV-1a). Same input, same slot, always. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Which half-hour window we are in. Exposed so tests can pin it. */
export function rotationWindow(now: number = Date.now()): number {
  return Math.floor(now / ROTATION_WINDOW_MS);
}

/**
 * Choose one creative, honouring `weight`: a slot with weight 30 shows up three
 * times as often as one with weight 10.
 */
export function pickAd(
  slots: AdSlotData[],
  seed: string,
  window: number = rotationWindow()
): AdSlotData | null {
  if (slots.length === 0) return null;
  if (slots.length === 1) return slots[0];

  const total = slots.reduce((sum, slot) => sum + Math.max(1, slot.weight || 1), 0);
  let cursor = hashSeed(`${seed}:${window}`) % total;
  for (const slot of slots) {
    cursor -= Math.max(1, slot.weight || 1);
    if (cursor < 0) return slot;
  }
  return slots[slots.length - 1];
}
