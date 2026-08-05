import { describe, expect, it } from 'vitest';

import {
  CLOSURE_STAMP,
  NETWORK_LIMITS,
  NETWORK_STEPS,
  buildCopy,
  buildArtworkHeadline,
  buildDetails,
  buildFacts,
  buildHashtags,
  buildHeadline,
  buildPriceLine,
  buildSalesAngle,
  closureKind,
  closureLabel,
  momentFormats,
  priceDrop,
  shortUrl,
  trackedUrl,
} from '@/lib/social-kit';
import type { CopyTone, SocialNetwork } from '@/lib/social-kit';
import type { Property } from '@/lib/types';

const NETWORKS: SocialNetwork[] = ['facebook', 'instagram', 'tiktok', 'whatsapp'];
const TONES: CopyTone[] = ['cercano', 'formal', 'urgente'];

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
    expect(line).toContain('arriendo');
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

describe('buildSalesAngle', () => {
  it('turns declared land area into a reason to evaluate the listing', () => {
    const angle = buildSalesAngle(base({ property_type: 'land', area: 2546 }));

    expect(angle).toContain('2.546 m²');
    expect(angle).toContain('evalúa');
  });

  it('uses the declared home distribution without adding unsupported qualities', () => {
    const angle = buildSalesAngle(base({ rooms: 3, parking_spaces: 1 }));

    expect(angle).toContain('3 habitaciones');
    expect(angle).toContain('1 parqueadero');
    expect(angle).not.toMatch(/lujos|segur|rentab|plusval/i);
  });

  it('does not invent an area when the commercial listing has none', () => {
    const angle = buildSalesAngle(base({ property_type: 'commercial', area: null }));

    expect(angle).not.toContain('m²');
    expect(angle).toContain('actividad comercial');
  });
});

describe('buildArtworkHeadline', () => {
  it('recommends a specific base message for land', () => {
    // SPEC:SOC-013 — the sales message follows the property type.
    expect(buildArtworkHeadline(base({ property_type: 'land' }))).toContain('TERRENO');
  });

  it('prioritizes the rental message over the property type', () => {
    // SPEC:SOC-013 — how it is published outranks what it is.
    expect(buildArtworkHeadline(base({ property_type: 'land', status: 'for_rent' }))).toBe(
      'CONOCE TU PRÓXIMO ESPACIO'
    );
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

describe('buildFacts, the attributes the listing declares', () => {
  it('names the built area and the floors when they are declared', () => {
    // SPEC:SOC-007 — both are fields of the listing, so both can be said.
    const property = base({ built_area: 180, floors: 2 });

    const facts = buildFacts(property, { limit: 6 });
    expect(facts).toContain('180 m² construidos');
    expect(facts).toContain('2 pisos');
  });

  it('does not repeat the same number as area and as built area', () => {
    // SPEC:SOC-007 — imported listings fill both columns with the same figure,
    // and "250 m² · 250 m² construidos" reads as a bug, not as a house.
    const property = base({ area: 250, built_area: 250 });

    const facts = buildFacts(property, { limit: 6 });
    expect(facts.filter((fact) => fact.includes('250')).length).toBe(1);
  });

  it('caps at four phrases by default, which is what a lamina can print', () => {
    const property = base({ built_area: 180, floors: 2 });

    expect(buildFacts(property)).toHaveLength(4);
    expect(buildFacts(property, { limit: 6 }).length).toBeGreaterThan(4);
  });

  it('says nothing at all about a listing that declares nothing', () => {
    // SPEC:SOC-007
    const property = base({
      area: null,
      built_area: null,
      rooms: 0,
      bathrooms: 0,
      parking_spaces: 0,
      floors: null,
    });

    expect(buildFacts(property, { limit: 6 })).toEqual([]);
  });
});

describe('buildDetails', () => {
  it('carries furnished, year built, negotiable price and the drawn shape', () => {
    // SPEC:SOC-007 — every phrase maps to a field the listing filled in.
    const property = base({
      furnished: true,
      year_built: 2018,
      is_negotiable: true,
      polygon: [
        [-2.31, -78.11],
        [-2.31, -78.12],
        [-2.32, -78.12],
      ],
    });

    const details = buildDetails(property);
    expect(details).toContain('Amoblado');
    expect(details).toContain('Año de construcción: 2018');
    expect(details).toContain('Precio negociable');
    expect(details).toContain('Forma del terreno dibujada en el mapa');
  });

  it('omits every attribute the listing left empty', () => {
    // SPEC:SOC-007 — no "Amoblado: No", no year, no shape.
    const property = base({ furnished: false, is_negotiable: false });

    expect(buildDetails(property)).toEqual([]);
  });

  it('does not offer to negotiate a price that does not exist', () => {
    // SPEC:SOC-005 — "Precio a consultar · Precio negociable" says nothing twice.
    const property = base({ price: null as unknown as number, is_negotiable: true });

    expect(buildDetails(property)).not.toContain('Precio negociable');
  });

  it('says the measurements are a reference when the owner asked for that', () => {
    // SPEC:SOC-007 — VIS-003 lets an owner publish a reference figure, and the
    // text must not turn that into a survey.
    const property = base({
      show_measurements: false,
      polygon: [
        [-2.31, -78.11],
        [-2.31, -78.12],
      ],
    });

    expect(buildDetails(property).join(' ')).toContain('referenciales');
  });
});

describe('buildHeadline', () => {
  it('says arriendo, which is how the operation is named in Ecuador', () => {
    const property = base({ status: 'for_rent' });

    expect(buildHeadline(property)).toContain('en arriendo');
  });

  it('names the place once when the city names its own province', () => {
    const property = base({
      city: 'Santo Domingo de los Tsáchilas',
      province: 'Santo Domingo de los Tsáchilas',
    });

    const headline = buildHeadline(property);
    expect(headline.match(/Santo Domingo/g)).toHaveLength(1);
  });
});

describe('buildHashtags per network', () => {
  it('gives every network a count that fits how it uses tags', () => {
    const property = base();

    expect(buildHashtags(property, 'facebook')).toHaveLength(3);
    expect(buildHashtags(property, 'instagram')).toHaveLength(10);
    expect(buildHashtags(property, 'tiktok')).toHaveLength(5);
    expect(buildHashtags(property, 'whatsapp')).toEqual([]);
  });

  it('spends the short Facebook budget on the local tags, not the global ones', () => {
    const property = base();

    expect(buildHashtags(property, 'facebook')).toEqual([
      '#CasasEnVentaMacas',
      '#Macas',
      '#BienesRaicesMacas',
    ]);
  });

  it('drops the connectors of a long place name instead of gluing them', () => {
    const property = base({
      city: 'Santo Domingo de los Tsáchilas',
      province: 'Santo Domingo de los Tsáchilas',
    });

    const tags = buildHashtags(property);
    expect(tags).toContain('#SantoDomingoTsachilas');
    expect(tags.join(' ')).not.toContain('DeLos');
    // The composed forms are dropped once they stop looking like something a
    // person would type: nobody searches #TerrenosEnVentaSantoDomingoTsachilas.
    expect(tags.every((tag) => tag.length <= 26)).toBe(true);
  });

  it('keeps the leading article of a province that starts with one', () => {
    const property = base({ city: 'Machala', province: 'El Oro' });

    expect(buildHashtags(property)).toContain('#ElOro');
  });

  it('names the operation the listing actually offers', () => {
    expect(buildHashtags(base({ status: 'for_rent' }))).toContain('#CasasEnArriendo');
    expect(buildHashtags(base({ status: 'for_sale' }))).toContain('#CasasEnVenta');
  });

  it('mixes reach with intent on TikTok instead of taking the first five', () => {
    const property = base();

    const tags = buildHashtags(property, 'tiktok');
    expect(tags).toContain('#Macas');
    expect(tags).toContain('#Ecuador');
    expect(tags).toContain('#ParaTi');
  });
});

describe('buildCopy per network', () => {
  const rich = base({
    short_code: 'XK4T2',
    address: 'Av. Juan de la Cruz y Soasti',
    description: 'Casa de dos plantas a cinco minutos del centro de Macas. '.repeat(40),
    built_area: 180,
    floors: 2,
    furnished: true,
    year_built: 2018,
    rent_price: 450,
  });

  it('never exceeds the character limit of its network, in any tone', () => {
    for (const network of NETWORKS) {
      for (const tone of TONES) {
        const copy = buildCopy(rich, network, tone);
        expect(copy.length).toBeLessThanOrEqual(NETWORK_LIMITS[network]);
      }
    }
  });

  it('puts no clickable link in an Instagram caption, where links do not work', () => {
    const copy = buildCopy(rich, 'instagram');

    expect(copy).not.toContain('http');
    // The QR carries the short URL without exposing the internal code in the caption.
    expect(copy).not.toContain('XK4T2');
  });

  it('carries the tracked link on the networks where a link is a link', () => {
    // SPEC:SOC-008
    for (const network of ['facebook', 'whatsapp'] as SocialNetwork[]) {
      expect(buildCopy(rich, network)).toContain(`utm_source=${network}`);
    }
  });

  it('writes WhatsApp as a message to one person: no hashtags', () => {
    const copy = buildCopy(rich, 'whatsapp');

    expect(copy).not.toContain('#');
    expect(copy).toContain('Fotos y ubicación exacta:');
  });

  it('opens TikTok with a hook short enough to survive the "más"', () => {
    const [hook] = buildCopy(rich, 'tiktok').split('\n');

    expect(hook.length).toBeLessThanOrEqual(100);
  });

  it('says nothing about a price the listing does not have', () => {
    // SPEC:SOC-005 — and a hook never reads "por Precio a consultar".
    const copy = buildCopy(base({ price: null as unknown as number }), 'tiktok');

    expect(copy).not.toContain('por Precio a consultar');
    expect(copy).not.toContain('$0');
  });

  it('mentions no attribute a bare listing never declared', () => {
    // SPEC:SOC-007 — the minimal case: no price, no rooms, no photos, no code.
    const bare = base({
      short_code: null,
      description: undefined,
      address: undefined,
      price: null as unknown as number,
      area: null,
      rooms: 0,
      bathrooms: 0,
      parking_spaces: 0,
      images: [],
    });

    for (const network of NETWORKS) {
      const copy = buildCopy(bare, network);
      expect(copy).not.toContain('0 habitaciones');
      expect(copy).not.toContain('0 baños');
      expect(copy).not.toContain('m²');
      expect(copy).not.toContain('Código del anuncio');
      expect(copy.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('the three tones', () => {
  const property = base({ short_code: 'XK4T2', address: 'Av. Juan de la Cruz y Soasti' });

  it('reads differently on every network, not only at the opening line', () => {
    // SPEC:SOC-007 — a tone that only shows at the ends is a label, not a voice.
    for (const network of NETWORKS) {
      const [cercano, formal, urgente] = TONES.map((tone) =>
        buildCopy(property, network, tone)
      );
      expect(new Set([cercano, formal, urgente]).size).toBe(3);

      // Every tone differs in the body too: strip the first line and they still
      // must not collapse into the same text.
      const body = (text: string) => text.split('\n').slice(1).join('\n');
      expect(new Set([body(cercano), body(formal), body(urgente)]).size).toBe(3);
    }
  });

  it('writes the formal tone without emoji', () => {
    for (const network of NETWORKS) {
      const copy = buildCopy(property, network, 'formal');
      expect(/[\u{1F300}-\u{1FAFF}]/u.test(copy)).toBe(false);
    }
  });

  it('lets the urgent tone hurry the reader but never claim demand', () => {
    // SPEC:SOC-007 — "se vende rápido" is a statement about the market that no
    // field of the listing supports. Urgency may only speak for whoever posts.
    for (const network of NETWORKS) {
      const copy = buildCopy(property, network, 'urgente').toLowerCase();
      for (const claim of ['se va rápido', 'última oportunidad', 'no te lo pierdas', 'oferta']) {
        expect(copy).not.toContain(claim);
      }
      // The hurry is always in the sender's own availability.
      expect(copy.includes('hoy') || copy.includes('esta semana')).toBe(true);
    }
  });
});

describe('NETWORK_STEPS', () => {
  it('tells every network how to publish, and Instagram why its link is dead', () => {
    for (const network of NETWORKS) {
      expect(NETWORK_STEPS[network].length).toBeGreaterThan(1);
    }
    expect(NETWORK_STEPS.instagram.join(' ')).toContain('no son clicables');
  });
});

describe('priceDrop', () => {
  const dropped = (overrides: Partial<Property> = {}) =>
    base({
      price: 79000,
      previous_price: '90000.00',
      price_changed_at: '2026-08-01T15:04:00Z',
      ...overrides,
    });

  it('offers the drop when the price came down', () => {
    // SPEC:SOC-102 — bajar el precio ofrece la lámina de bajada.
    const drop = priceDrop(dropped());

    expect(drop).not.toBeNull();
    expect(momentFormats(dropped())).toContain('price-drop');
  });

  it('carries both prices, so the lamina can show the two of them', () => {
    // SPEC:SOC-102 — la lámina de bajada muestra los dos precios.
    const drop = priceDrop(dropped())!;

    expect(drop.previousLabel).toContain('$90.000');
    expect(drop.currentLabel).toContain('$79.000');
    expect(drop.percent).toBe(12);
  });

  it('says nothing when the history gave no trustworthy "before"', () => {
    // SPEC:SOC-102 — the server nulls both fields when the newest history row
    // disagrees with the price being asked. Inventing one is the one thing a
    // price-drop lamina must never do.
    expect(priceDrop(dropped({ previous_price: null, price_changed_at: null }))).toBeNull();
    expect(priceDrop(dropped({ price_changed_at: null }))).toBeNull();
    expect(momentFormats(dropped({ previous_price: null }))).not.toContain('price-drop');
  });

  it('refuses to call a rise a drop', () => {
    // SPEC:SOC-102 — a lamina that printed "ANTES $79.000 / AHORA $90.000"
    // would be reading its own layout backwards.
    expect(priceDrop(dropped({ price: 90000, previous_price: '79000.00' }))).toBeNull();
    expect(priceDrop(dropped({ price: 90000, previous_price: '90000.00' }))).toBeNull();
  });

  it('never builds a drop out of a listing with no price', () => {
    // SPEC:SOC-005 — "Precio a consultar" is not a number to compare against.
    expect(priceDrop(dropped({ price: null as unknown as number }))).toBeNull();
  });

  it('writes a monthly figure as monthly on both sides', () => {
    // SPEC:SOC-005 — the ficha says "$450/mes"; two bare amounts here would
    // read as a house that lost seventy dollars of its sale price.
    const drop = priceDrop(dropped({ status: 'for_rent', price: 450, previous_price: '520.00' }))!;

    expect(drop.previousLabel).toBe('$520/mes');
    expect(drop.currentLabel).toBe('$450/mes');
  });

  it('reports no percentage when the cut rounds to nothing', () => {
    // SPEC:SOC-102 — a real drop of eleven dollars is still a drop, but "-0 %"
    // is a badge that says nothing.
    const drop = priceDrop(dropped({ price: 89989, previous_price: '90000.00' }))!;

    expect(drop).not.toBeNull();
    expect(drop.percent).toBe(0);
  });
});

describe('closureKind', () => {
  it('offers the closure lamina for a sold listing', () => {
    // SPEC:SOC-102 — marcar como vendido ofrece la lámina de vendido.
    const sold = base({ status: 'inactive', closed_reason: 'sold', closed_at: '2026-08-01' });

    expect(closureKind(sold)).toBe('sold');
    expect(CLOSURE_STAMP[closureKind(sold)!]).toBe('VENDIDO');
    expect(momentFormats(sold)).toContain('sold');
  });

  it('says ARRENDADO for a rental, which is the word used in Ecuador', () => {
    // SPEC:SOC-102
    const rented = base({ status: 'inactive', closed_reason: 'rented' });

    expect(CLOSURE_STAMP[closureKind(rented)!]).toBe('ARRENDADO');
  });

  it('does not congratulate anyone for withdrawing an ad', () => {
    // SPEC:SOC-102 — retirar un anuncio no es una venta. An inactive listing
    // with no reason is exactly the same case: nothing happened worth posting.
    expect(closureKind(base({ status: 'inactive', closed_reason: 'withdrawn' }))).toBeNull();
    expect(closureKind(base({ status: 'inactive', closed_reason: '' }))).toBeNull();
    expect(closureKind(base({ status: 'inactive' }))).toBeNull();
    expect(momentFormats(base({ status: 'inactive', closed_reason: 'withdrawn' }))).toEqual([]);
  });

  it('does not announce the closure of a listing that is still open', () => {
    // SPEC:SOC-102
    expect(closureKind(base({ status: 'for_sale' }))).toBeNull();
    expect(momentFormats(base())).toEqual([]);
  });

  it('drops the price-drop lamina once the listing has closed', () => {
    // SPEC:SOC-102 — a cut on something already sold invites offers nobody can
    // act on. It also removes the case where the figures lied: closing sets
    // `status` to `inactive`, so a rental lost its "/mes" and "$450" beside
    // "ANTES $520" read as a house that shed seventy dollars.
    const closedWithDrop = {
      previous_price: 520,
      price: 450,
      price_changed_at: '2026-07-20T10:00:00Z',
      closed_at: '2026-08-01T10:00:00Z',
    };

    expect(momentFormats(base({ status: 'for_rent', ...closedWithDrop }))).toContain('price-drop');
    expect(
      momentFormats(base({ status: 'inactive', closed_reason: 'rented', ...closedWithDrop }))
    ).toEqual(['sold']);
    expect(
      momentFormats(base({ status: 'inactive', closed_reason: 'withdrawn', ...closedWithDrop }))
    ).toEqual([]);
  });

  it('dates a closure by month, because a closure ages in months', () => {
    // SPEC:SOC-102 — and an absent date says nothing rather than "Invalid Date".
    expect(closureLabel(base({ closed_at: '2026-08-01T12:00:00Z' }))).toContain('2026');
    expect(closureLabel(base({ closed_at: null }))).toBe('');
  });
});
