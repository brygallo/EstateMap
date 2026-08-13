/**
 * Sponsorship slots for the blog.
 *
 * The rotation is deterministic on purpose. Picking at random on the server
 * would make every page uncacheable, and picking on the client would flash a
 * different ad after hydration. Instead the choice is a hash of whatever
 * identifies the page — the post slug, the category — so a given article always
 * shows the same sponsor, different articles spread the impressions, and the
 * whole thing stays static.
 */

import { getServerApiUrl } from './api-url';

export type SponsorSlot = {
  id: number;
  placement: string;
  /** `promo` is the house sign: it has no advertiser and no redirect. */
  kind: 'paid' | 'partner' | 'promo';
  headline: string;
  body: string;
  cta_label: string;
  image: string | null;
  image_alt: string;
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
  | 'category_top';

const REVALIDATE_SECONDS = 1800;

export async function getSponsors(placement: Placement): Promise<SponsorSlot[]> {
  try {
    const res = await fetch(
      `${getServerApiUrl()}/blog/sponsors/?placement=${encodeURIComponent(placement)}`,
      { next: { revalidate: REVALIDATE_SECONDS, tags: ['blog', 'blog-sponsors'] } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching sponsors:', error);
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

/**
 * Choose one creative, honouring `weight`: a slot with weight 30 shows up three
 * times as often as one with weight 10 across the set of pages.
 */
export function pickSponsor(slots: SponsorSlot[], seed: string): SponsorSlot | null {
  if (slots.length === 0) return null;
  if (slots.length === 1) return slots[0];

  const total = slots.reduce((sum, slot) => sum + Math.max(1, slot.weight || 1), 0);
  let cursor = hashSeed(seed) % total;
  for (const slot of slots) {
    cursor -= Math.max(1, slot.weight || 1);
    if (cursor < 0) return slot;
  }
  return slots[slots.length - 1];
}
