import { describe, expect, it } from 'vitest';

import { hashSeed, pickSponsor, type SponsorSlot } from './sponsors';

function slot(id: number, weight = 10): SponsorSlot {
  return {
    id,
    placement: 'post_inline',
    kind: 'partner',
    headline: `Campaña ${id}`,
    body: 'Texto',
    cta_label: 'Ver',
    image: null,
    image_alt: '',
    click_path: `/api/blog/sponsors/${id}/go/`,
    weight,
    advertiser: { name: 'Aents', slug: 'aents', tagline: '', logo: null, logo_alt: '' },
  };
}

describe('pickSponsor', () => {
  it('returns nothing when there is no campaign', () => {
    expect(pickSponsor([], 'un-post')).toBeNull();
  });

  it('is stable: the same page always shows the same campaign', () => {
    // This is what lets the page stay statically cached. A random pick would
    // make every article uncacheable.
    const slots = [slot(1), slot(2), slot(3)];

    const first = pickSponsor(slots, 'como-comprar-una-propiedad');
    const again = pickSponsor(slots, 'como-comprar-una-propiedad');

    expect(again).toBe(first);
  });

  it('spreads impressions across different pages', () => {
    const slots = [slot(1), slot(2), slot(3)];
    const seeds = Array.from({ length: 40 }, (_, index) => `post-${index}`);

    const chosen = new Set(seeds.map((seed) => pickSponsor(slots, seed)!.id));

    expect(chosen.size).toBeGreaterThan(1);
  });

  it('honours weight: a heavier campaign shows up more often', () => {
    const slots = [slot(1, 90), slot(2, 10)];
    const seeds = Array.from({ length: 400 }, (_, index) => `post-${index}`);

    const heavy = seeds.filter((seed) => pickSponsor(slots, seed)!.id === 1).length;

    expect(heavy).toBeGreaterThan(seeds.length * 0.7);
  });

  it('never gets stuck when every weight is zero', () => {
    const slots = [slot(1, 0), slot(2, 0)];

    expect(pickSponsor(slots, 'x')).not.toBeNull();
  });
});

describe('hashSeed', () => {
  it('is deterministic and spreads different inputs apart', () => {
    expect(hashSeed('quito')).toBe(hashSeed('quito'));
    expect(hashSeed('quito')).not.toBe(hashSeed('cuenca'));
  });
});
