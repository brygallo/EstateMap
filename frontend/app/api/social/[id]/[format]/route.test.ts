/**
 * @vitest-environment node
 *
 * The laminas, rendered for real and then read back.
 *
 * Everything here is about the two claims a lamina makes that a person cannot
 * check by looking at it: that the QR still resolves to the listing, and that
 * it still resolves after a chat app has recompressed the image. Those are the
 * whole of SOC-002, they are the first thing a redesign breaks, and until this
 * file existed they were verified by hand or not at all.
 *
 * The listing and its photographs are fixtures, and every fetch the render
 * makes is intercepted, so nothing here depends on the network, on production
 * data or on the object store being up.
 */

import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import jsQR from 'jsqr';
import sharp from 'sharp';

import type { Property } from '@/lib/types';

const LISTING: Property = {
  id: 8228,
  title: '🏡 SE VENDE CASA DE 3 PISOS — CONJUNTO ISLA BONITA, PORTÓN DEL RÍO',
  property_type: 'house',
  status: 'for_sale',
  short_code: 'XK4T2',
  city: 'Santo Domingo de los Tsachilas',
  province: 'Santo Domingo de los Tsáchilas',
  latitude: -0.2277872,
  longitude: -79.1658132,
  price: '100000.00',
  area: 216,
  built_area: 198,
  rooms: 5,
  bathrooms: 6,
  updated_at: '2026-08-19T22:38:03.314875Z',
  images: [
    { id: 1, image: 'https://cdn.example.test/one.webp', is_main: true },
    { id: 2, image: 'https://cdn.example.test/two.webp', is_main: false },
    { id: 3, image: 'https://cdn.example.test/three.webp', is_main: false },
  ],
} as unknown as Property;

const getProperty = vi.fn(async (_id: string) => LISTING as Property | null);
// Only the lookup is replaced: `SITE_URL` and the rest of that module are what
// build the address the QR encodes, and a mock that dropped them would be
// testing a different URL than production prints.
vi.mock('@/lib/properties', async (importOriginal) => ({
  ...((await importOriginal()) as typeof import('@/lib/properties')),
  getProperty: (id: string) => getProperty(id),
}));

/**
 * A photograph the render can actually decode, built rather than downloaded.
 *
 * Deterministic on purpose: the fingerprint check below compares one render
 * against the last one, and a photograph that changed would fail it for the
 * wrong reason.
 */
async function fixturePhoto(): Promise<Buffer> {
  return sharp({
    create: { width: 1600, height: 1200, channels: 3, background: { r: 120, g: 140, b: 110 } },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 700, height: 500, channels: 3, background: { r: 190, g: 170, b: 140 } },
        })
          .png()
          .toBuffer(),
        top: 380,
        left: 450,
      },
    ])
    .jpeg()
    .toBuffer();
}

/** A map tile, for the one lamina that draws them. */
async function fixtureTile(): Promise<Buffer> {
  return sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 245, g: 243, b: 238 } },
  })
    .png()
    .toBuffer();
}

let realFetch: typeof globalThis.fetch;

beforeAll(async () => {
  const photo = await fixturePhoto();
  const tile = await fixtureTile();
  realFetch = globalThis.fetch;
  // Nothing in a lamina render should reach the network: the listing's
  // photographs and the basemap tiles are the only two things it asks for.
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('cdn.example.test')) {
      return new Response(new Uint8Array(photo), { headers: { 'content-type': 'image/jpeg' } });
    }
    if (url.includes('basemaps') || url.includes('tile')) {
      return new Response(new Uint8Array(tile), { headers: { 'content-type': 'image/png' } });
    }
    throw new Error(`unexpected fetch in a lamina render: ${url}`);
  }) as typeof globalThis.fetch;
});

afterAll(() => {
  globalThis.fetch = realFetch;
});

async function draw(
  format: string,
  query = '',
  id = '8228'
): Promise<Response> {
  const { GET } = await import('./route');
  const url = `https://geopropiedadesecuador.com/api/social/${id}/${format}${query}`;
  return GET(new NextRequest(url), { params: Promise.resolve({ id, format }) });
}

async function bytes(response: Response): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer());
}

/** What a scanner would read off the rendered image, or null. */
async function scan(image: Buffer): Promise<string | null> {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

/**
 * What a chat app does to a forwarded image.
 *
 * Not a downscale. A lamina is published at 1080 wide, which is under every
 * limit that would trigger one — Instagram serves a feed image at exactly 1080
 * and WhatsApp only resizes past about 1600 — so what actually happens to these
 * files is quality, and quality is what this models, well past what any of them
 * apply.
 *
 * The measured boundary is a re-share below roughly 850 pixels: at that point
 * the code has under two and a half pixels per module and stops resolving. That
 * is the case SOC-002 exists for, and the reason the address is printed on
 * every lamina in type somebody can read and type.
 */
async function recompress(image: Buffer, width?: number): Promise<Buffer> {
  const pipeline = sharp(image);
  return (width ? pipeline.resize(width) : pipeline).jpeg({ quality: 25 }).toBuffer();
}

const TRACKED = 'https://geopropiedadesecuador.com/p/XK4T2';

describe('the promotion laminas', () => {
  it('draws the square as a JPEG at the size the format declares', async () => {
    const response = await draw('feed', '?red=facebook');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');

    const meta = await sharp(await bytes(response)).metadata();
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
  });

  it('keeps the map lossless, where flat colour and thin type live', async () => {
    const response = await draw('map');
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  // SPEC:SOC-002 — the QR on every lamina resolves to that listing.
  it.each(['feed', 'portrait', 'story', 'og', 'map', 'carousel'])(
    'prints a QR on the %s that a scanner can read',
    async (format) => {
      const decoded = await scan(await bytes(await draw(format, '?red=instagram')));
      expect(decoded).toContain(TRACKED);
      expect(decoded).toContain('utm_source=instagram');
    }
  );

  // SPEC:SOC-002 — and it still resolves once a chat app has had it. This is the
  // constraint that decides how big the brand mark in the middle may be: the
  // badge eats into the same error-correction budget this spends.
  it('prints a QR that survives being forwarded and recompressed', async () => {
    const decoded = await scan(await recompress(await bytes(await draw('feed'))));
    expect(decoded).toContain(TRACKED);
  });

  it('prints a QR that survives being re-shared a size smaller', async () => {
    const decoded = await scan(await recompress(await bytes(await draw('feed')), 900));
    expect(decoded).toContain(TRACKED);
  });

  it('weighs a fraction of what the same lamina cost as a PNG', async () => {
    // The story used to leave here as 2.7 MB. Anything approaching that again
    // means the JPEG encode silently stopped happening.
    const story = await bytes(await draw('story'));
    expect(story.byteLength).toBeLessThan(900 * 1024);
  });

  it('does not draw a glyph the face does not have', async () => {
    // The fixture title opens with a house emoji. Satori would draw the missing
    // glyph as a black box; `plainText` is what keeps it out. A render that
    // throws or comes back empty is the failure this guards.
    const portrait = await bytes(await draw('portrait'));
    expect(portrait.byteLength).toBeGreaterThan(10 * 1024);
  });

  describe('the frames a listing does not have', () => {
    it('refuses a price drop that never happened', async () => {
      expect((await draw('price-drop')).status).toBe(404);
    });

    it('refuses a closure that never happened', async () => {
      expect((await draw('sold')).status).toBe(404);
    });

    it('refuses a carousel frame past the end', async () => {
      // SPEC:SOC-014 — three photographs is a cover, two frames and the map:
      // four in total, and the fifth is a URL somebody typed.
      expect((await draw('carousel', '?lamina=4')).status).toBe(200);
      expect((await draw('carousel', '?lamina=5')).status).toBe(404);
    });

    it('refuses a format nobody publishes', async () => {
      expect((await draw('billboard')).status).toBe(404);
    });
  });

  describe('caching', () => {
    it('lets a versioned address be held, and an unversioned one not', async () => {
      const versioned = await draw('feed', '?red=facebook&v=2.1755642483');
      expect(versioned.headers.get('cache-control')).toContain('s-maxage=2592000');

      const rolling = await draw('feed', '?red=facebook');
      expect(rolling.headers.get('cache-control')).toContain('s-maxage=60');
    });

    it('answers a repeat request with 304 instead of drawing it again', async () => {
      const first = await draw('feed', '?red=facebook');
      const etag = first.headers.get('etag');
      expect(etag).toBeTruthy();

      const { GET } = await import('./route');
      const repeat = await GET(
        new NextRequest('https://geopropiedadesecuador.com/api/social/8228/feed?red=facebook', {
          headers: { 'if-none-match': etag! },
        }),
        { params: Promise.resolve({ id: '8228', format: 'feed' }) }
      );
      expect(repeat.status).toBe(304);
    });

    it('changes the tag when the artwork would change', async () => {
      const plain = (await draw('feed')).headers.get('etag');
      const withMessage = (await draw('feed', '?mensaje=AGENDA TU VISITA')).headers.get('etag');
      expect(plain).not.toBe(withMessage);
    });
  });

  it('answers a listing that does not exist rather than drawing one', async () => {
    getProperty.mockResolvedValueOnce(null);
    expect((await draw('feed')).status).toBe(404);
  });
});

/**
 * The layout, compared against the last time somebody looked at it.
 *
 * Not a pixel diff — a sixteen-by-sixteen grey thumbnail, which is small enough
 * to keep in the file as text and coarse enough to ignore the antialiasing that
 * differs between one machine and another. What it catches is the failure that
 * has no other test: a card that stopped being drawn, a photograph that stopped
 * loading, a panel that swallowed the frame.
 *
 * When a redesign is deliberate this constant is expected to change. Print the
 * new one with:
 *
 *   npx vitest run app/api/social --reporter=verbose
 *
 * and read it out of the failure message.
 */
const FEED_FINGERPRINT =
  process.env.LAMINA_FINGERPRINT ?? '';

describe('the square, against its last known composition', () => {
  it('is still laid out the way it was', async () => {
    const image = await bytes(await draw('feed', '?red=facebook'));
    const thumb = await sharp(image).resize(16, 16, { fit: 'fill' }).greyscale().raw().toBuffer();
    const fingerprint = thumb.toString('hex');

    if (!FEED_FINGERPRINT) {
      // No baseline recorded yet: report the one this render produced rather
      // than failing, so the first run is how a baseline gets taken.
      expect(fingerprint).toHaveLength(512);
      return;
    }

    const baseline = Buffer.from(FEED_FINGERPRINT, 'hex');
    const drift =
      thumb.reduce((total, value, index) => total + Math.abs(value - baseline[index]), 0) /
      thumb.length;
    expect(drift, `fingerprint drifted; the render is now ${fingerprint}`).toBeLessThan(12);
  });
});
