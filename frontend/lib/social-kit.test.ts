import { describe, expect, it } from 'vitest';

import {
  buildCopy,
  buildFacts,
  buildHashtags,
  buildPriceLine,
  shortUrl,
  trackedUrl,
} from '@/lib/social-kit';
import type { Property } from '@/lib/types';

const base = (overrides: Partial<Property> = {}): Property =>
  ({
    id: 42,
    title: 'Casa en Macas',
    property_type: 'house',
    status: 'for_sale',
    city: 'Macas',
    province: 'Morona Santiago',
    price: 85000,
    rooms: 3,
    bathrooms: 2,
    parking_spaces: 1,
    area: 250,
    ...overrides,
  }) as Property;

describe('buildPriceLine', () => {
  it('reads "Precio a consultar" when the price is null', () => {
    // SPEC:SOC-005 — a listing without a price never prints an invented number.
    const property = base({ price: null as unknown as number });

    expect(buildPriceLine(property)).toBe('Precio a consultar');
  });

  it('formats a sale price', () => {
    // SPEC:SOC-005
    const property = base({ price: 85000, status: 'for_sale' });

    expect(buildPriceLine(property)).toContain('$85.000');
  });

  it('shows both amounts, labelled, when the listing is sale and rent at once', () => {
    // SPEC:SOC-005 — mirrors the ficha's own criterion for a dual listing.
    const property = base({ price: 85000, rent_price: 450 });

    const line = buildPriceLine(property);
    expect(line).toContain('$85.000');
    expect(line).toContain('venta');
    expect(line).toContain('$450');
    expect(line).toContain('alquiler');
  });
});

describe('buildFacts', () => {
  it('omits rooms when there are none, instead of saying "0 habitaciones"', () => {
    // SPEC:SOC-007
    const property = base({ rooms: 0 });

    const facts = buildFacts(property);
    expect(facts.some((fact) => fact.includes('habitacion'))).toBe(false);
  });

  it('omits the area when it is null', () => {
    // SPEC:SOC-007
    const property = base({ area: null });

    const facts = buildFacts(property);
    expect(facts.some((fact) => fact.includes('m²'))).toBe(false);
  });

  it('uses the singular for a single room', () => {
    // SPEC:SOC-007
    const property = base({ rooms: 1 });

    const facts = buildFacts(property);
    expect(facts).toContain('1 habitación');
    expect(facts.some((fact) => fact.includes('habitaciones'))).toBe(false);
  });
});

describe('buildCopy', () => {
  it('produces distinct text for facebook, instagram and tiktok', () => {
    // SPEC:SOC-007 — each network gets its own shape, not the same paragraph truncated.
    const property = base();

    const facebook = buildCopy(property, 'facebook');
    const instagram = buildCopy(property, 'instagram');
    const tiktok = buildCopy(property, 'tiktok');

    expect(facebook).not.toBe(instagram);
    expect(facebook).not.toBe(tiktok);
    expect(instagram).not.toBe(tiktok);
  });
});

describe('trackedUrl', () => {
  it('tags the instagram link with utm_source=instagram', () => {
    // SPEC:SOC-008
    const property = base({ short_code: 'XK4T2' });

    expect(trackedUrl(property, 'instagram')).toContain('utm_source=instagram');
  });
});

describe('shortUrl', () => {
  it('uses /p/<short_code> when a code exists', () => {
    // SPEC:SOC-002
    const property = base({ short_code: 'XK4T2' });

    expect(shortUrl(property)).toContain('/p/XK4T2');
  });

  it('falls back to /propiedad/<id> when there is no code', () => {
    // SPEC:SOC-002
    const property = base({ id: 7, short_code: null });

    expect(shortUrl(property)).toContain('/propiedad/7');
  });
});

describe('buildHashtags', () => {
  it('drops empty tags and does not duplicate when city and province share a name', () => {
    const property = base({ city: 'Loja', province: 'Loja' });

    const tags = buildHashtags(property);
    expect(tags.filter((tag) => tag === '#Loja')).toHaveLength(1);
    expect(tags.every((tag) => tag.length > 1)).toBe(true);
  });

  it('never carries accented characters', () => {
    const property = base({ city: 'Azogues', province: 'Cañar' });

    const tags = buildHashtags(property);
    expect(tags.some((tag) => /[À-ſ]/.test(tag))).toBe(false);
  });
});
