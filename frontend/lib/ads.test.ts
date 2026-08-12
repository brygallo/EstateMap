import { describe, expect, it } from 'vitest';

import {
  ROTATION_WINDOW_MS,
  hashSeed,
  pickAd,
  rotationWindow,
  type AdSlotData,
} from './ads';

function slot(id: number, weight = 10): AdSlotData {
  return {
    id,
    placement: 'property_sidebar',
    kind: 'paid',
    headline: `Campaña ${id}`,
    body: 'Texto',
    cta_label: 'Saber más',
    image: null,
    image_alt: '',
    click_path: `/api/ads/${id}/go/`,
    weight,
    advertiser: null,
  };
}

describe('rotation', () => {
  it('is stable for the same page inside the same window', () => {
    // SPEC:ADS-013 — deterministic, so the page stays cacheable and does not
    // flash a different ad after hydration.
    const slots = [slot(1), slot(2), slot(3)];

    const first = pickAd(slots, 'property:123', 100);
    const second = pickAd(slots, 'property:123', 100);

    expect(first?.id).toBe(second?.id);
  });

  it('spreads different pages across advertisers', () => {
    // SPEC:ADS-013 — what makes impressions divide over thousands of listings.
    const slots = [slot(1), slot(2), slot(3)];

    const chosen = new Set(
      Array.from({ length: 40 }, (_, index) => pickAd(slots, `property:${index}`, 100)?.id)
    );

    expect(chosen.size).toBeGreaterThan(1);
  });

  it('rotates the same page as windows go by', () => {
    // SPEC:ADS-013 — hashing the page alone would show one listing's visitor
    // the same advertiser forever, and that is not what was sold.
    const slots = [slot(1), slot(2), slot(3)];

    const overADay = new Set(
      Array.from({ length: 48 }, (_, window) => pickAd(slots, 'property:123', window)?.id)
    );

    expect(overADay.size).toBeGreaterThan(1);
  });

  it('gives a heavier campaign more of the impressions', () => {
    // SPEC:ADS-013 — weight is the only lever for splitting a placement.
    const slots = [slot(1, 90), slot(2, 10)];

    let heavy = 0;
    for (let index = 0; index < 400; index += 1) {
      if (pickAd(slots, `property:${index}`, 7)?.id === 1) heavy += 1;
    }

    expect(heavy).toBeGreaterThan(280);
  });

  it('returns the only campaign there is without hashing anything', () => {
    expect(pickAd([slot(9)], 'whatever', 1)?.id).toBe(9);
  });

  it('returns null when nothing was sold', () => {
    // SPEC:ADS-016 — the caller renders the house sign instead of a hole.
    expect(pickAd([], 'property:1', 1)).toBeNull();
  });
});

describe('rotationWindow', () => {
  it('advances every half hour, which is the payload TTL', () => {
    // SPEC:ADS-013 — the window turns over exactly when the cache expires, so
    // the rotation costs no extra request.
    // Aligned to a window boundary on purpose: an arbitrary instant sits mid
    // window, and then "start" and "start + TTL - 1" straddle the edge.
    const start = Math.ceil(1_700_000_000_000 / ROTATION_WINDOW_MS) * ROTATION_WINDOW_MS;

    expect(rotationWindow(start)).toBe(rotationWindow(start + ROTATION_WINDOW_MS - 1));
    expect(rotationWindow(start + ROTATION_WINDOW_MS)).toBe(rotationWindow(start) + 1);
  });
});

describe('hashSeed', () => {
  it('is stable across calls', () => {
    expect(hashSeed('macas')).toBe(hashSeed('macas'));
    expect(hashSeed('macas')).not.toBe(hashSeed('sucua'));
  });
});
