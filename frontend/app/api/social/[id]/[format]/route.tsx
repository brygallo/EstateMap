/**
 * The promotion laminas: one route, five formats.
 *
 * Public on purpose. A lamina's whole job is to be fetched by Facebook for a
 * link preview, served by Instagram and looked at by strangers, so putting a
 * session in front of it would break the only use it has. It costs nothing to
 * open because SOC-001 keeps everything private off the image: what is drawn
 * here is what the public listing already shows.
 *
 * Runs on the Node runtime rather than the edge because it reads the brand mark
 * off disk and transcodes the listing photo with sharp.
 */

/* eslint-disable @next/next/no-img-element --
   Satori consumes a raw element tree and rasterises it; `next/image` has no
   meaning inside an ImageResponse, where there is no browser, no layout pass
   and no srcset to negotiate. */

import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

import aentsTokens from '@/lib/aents-tokens.json';
import { qrDataUri } from '@/lib/qr';
import { getProperty } from '@/lib/properties';
import { getPropertyTypeLabel, getStatusLabel } from '@/lib/property-labels';
import {
  SOCIAL_FORMATS,
  buildFacts,
  buildPriceLine,
  trackedUrl,
  type SocialFormat,
  type SocialNetwork,
} from '@/lib/social-kit';
import {
  ATTRIBUTION,
  buildMosaic,
  centerOf,
  fitZoom,
  polygonOverlay,
  polygonPoints,
  type LatLng,
} from '@/lib/static-map';
import type { Property } from '@/lib/types';

export const runtime = 'nodejs';

const tokens = aentsTokens.light;
const NAVY = tokens['--navy'];
const GREEN = tokens['--primary-strong'];
const TEAL = tokens['--accent-alt-strong'];
const FOG = tokens['--fog'];

const NETWORKS = new Set<SocialNetwork>(['facebook', 'instagram', 'tiktok', 'whatsapp']);

/**
 * The brand tile, inlined.
 *
 * Read off disk instead of fetched over HTTP: at render time the site's own
 * origin may not be reachable from inside the container, and a mark that fails
 * to load takes the whole image down with it. It is the approved PNG export —
 * the brand rules forbid redrawing it as CSS boxes.
 */
let brandTilePromise: Promise<string> | null = null;
function brandTile(): Promise<string> {
  if (!brandTilePromise) {
    brandTilePromise = readFile(
      path.join(process.cwd(), 'public', 'aents', 'aents-brand-tile-256.png')
    )
      .then((buffer) => `data:image/png;base64,${buffer.toString('base64')}`)
      .catch(() => '');
  }
  return brandTilePromise;
}

/**
 * The listing's main photo, re-encoded as a JPEG data URI.
 *
 * The transcode is not an optimisation, it is the only way the photo appears at
 * all: the image pipeline stores every upload as WebP, and Satori cannot decode
 * WebP — it fails the whole render with "Unsupported image type". Handing it
 * bytes it understands is the fix.
 *
 * Downscaling on the way through is a happy side effect. A lamina is at most
 * 1080 wide, so a 4000px original would spend its extra pixels being thrown
 * away, having first been base64-encoded into the layout.
 *
 * Returns null on any failure, which is what routes the caller to the branded
 * fallback rather than to a 500. A listing whose photo host is briefly down
 * still gets a kit.
 */
async function mainPhoto(property: Property): Promise<string | null> {
  const image = property.images?.find((img) => img.is_main) || property.images?.[0];
  const source = image?.image;
  if (!source?.startsWith('http')) return null;

  try {
    const response = await fetch(source);
    if (!response.ok) return null;
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
      .rotate() // Honour EXIF orientation; phone photos arrive sideways otherwise.
      .resize(1280, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

function statusChipColor(property: Property): string {
  return property.status === 'for_rent' ? TEAL : GREEN;
}

// --- Shared pieces --------------------------------------------------------

/** White card holding the QR and the code typed underneath it. */
function QrCard({ qr, code, size }: { qr: string; code: string; size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
      }}
    >
      <img src={qr} width={size} height={size} alt="" />
      {code ? (
        <div
          style={{
            display: 'flex',
            fontSize: Math.round(size * 0.19),
            fontWeight: 800,
            letterSpacing: 3,
            color: NAVY,
          }}
        >
          {code}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The line that turns a picture into a checkable claim. See SOC-002.
 *
 * Broken into two rows deliberately. As one sentence it is long enough to wrap
 * on every format, and an accidental wrap puts the break mid-URL — which is
 * precisely the part someone is meant to be able to read and type.
 */
function VerifyLine({ code, fontSize }: { code: string; fontSize: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', fontSize: Math.round(fontSize * 0.85), color: 'rgba(255,255,255,0.6)' }}>
        Verifica este anuncio en
      </div>
      <div style={{ display: 'flex', fontSize, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
        {code ? `geopropiedadesecuador.com/p/${code}` : 'geopropiedadesecuador.com'}
      </div>
    </div>
  );
}

function BrandRow({ tile, fontSize }: { tile: string; fontSize: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {tile ? <img src={tile} width={fontSize * 1.7} height={fontSize * 1.7} alt="" /> : null}
      <div style={{ display: 'flex', fontSize, fontWeight: 700, color: '#FFFFFF' }}>
        Geo Propiedades Ecuador
      </div>
    </div>
  );
}

function StatusChip({ property, fontSize }: { property: Property; fontSize: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignSelf: 'flex-start',
        padding: `${Math.round(fontSize * 0.45)}px ${Math.round(fontSize * 0.9)}px`,
        borderRadius: 999,
        backgroundColor: statusChipColor(property),
        color: '#FFFFFF',
        fontSize,
        fontWeight: 800,
        letterSpacing: 1,
      }}
    >
      {getStatusLabel(property.status).toUpperCase()}
    </div>
  );
}

/**
 * The photo layer, or the brand gradient when the listing has none.
 *
 * A listing with no photo is exactly the one nobody sees and that most needs
 * sharing; returning no lamina at all would punish it twice. SOC-004.
 */
function PhotoLayer({ photo, height }: { photo: string | null; height: number | string }) {
  if (photo) {
    return (
      <img
        src={photo}
        width="100%"
        height={height}
        style={{ objectFit: 'cover' }}
        alt=""
      />
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height,
        backgroundImage: `linear-gradient(135deg, ${TEAL} 0%, ${GREEN} 55%, ${NAVY} 100%)`,
      }}
    />
  );
}

// --- The map lamina -------------------------------------------------------

/**
 * Tiles, plot outline and pin, with the attribution baked in.
 *
 * The attribution is not decoration: it is the condition under which the portal
 * may use these tiles at all, and a downloaded PNG has no map control to print
 * it. SOC-006.
 */
async function mapLamina(
  property: Property,
  qr: string,
  code: string,
  width: number,
  height: number
) {
  const outline = polygonPoints(property.polygon);
  const point: LatLng | null =
    centerOf(outline) ??
    (property.latitude != null && property.longitude != null
      ? { lat: property.latitude, lng: property.longitude }
      : null);

  const tile = await brandTile();

  // Without coordinates there is no map to draw, and inventing a location is
  // the one thing a map lamina must never do.
  if (!point) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          padding: 64,
          backgroundImage: `linear-gradient(135deg, ${TEAL} 0%, ${GREEN} 60%, ${NAVY} 100%)`,
          color: '#FFFFFF',
        }}
      >
        <BrandRow tile={tile} fontSize={30} />
        <div style={{ display: 'flex', marginTop: 24, fontSize: 62, fontWeight: 800 }}>
          {[property.city, property.province].filter(Boolean).join(', ') || 'Ecuador'}
        </div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 34, color: FOG }}>
          {buildPriceLine(property)}
        </div>
        <div style={{ display: 'flex', marginTop: 40 }}>
          <QrCard qr={qr} code={code} size={200} />
        </div>
      </div>
    );
  }

  const zoom = fitZoom(outline, width, height);
  const mosaic = buildMosaic(point, zoom, width, height);
  const overlay = polygonOverlay(outline, mosaic, width, height);
  const pin = mosaic.project(point);

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
      {mosaic.tiles.map((mapTile) => (
        <img
          key={`${mapTile.left}-${mapTile.top}`}
          src={mapTile.url}
          width={mapTile.size}
          height={mapTile.size}
          style={{ position: 'absolute', left: mapTile.left, top: mapTile.top }}
          alt=""
        />
      ))}

      {overlay ? (
        <img src={overlay} width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} alt="" />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: Math.round(pin.x - 26),
            top: Math.round(pin.y - 26),
            width: 52,
            height: 52,
            borderRadius: 26,
            border: '8px solid #FFFFFF',
            backgroundColor: statusChipColor(property),
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '110px 48px 48px',
          backgroundImage:
            'linear-gradient(180deg, rgba(15,16,32,0) 0%, rgba(15,16,32,0.6) 30%, rgba(15,16,32,0.96) 62%)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: width - 300 }}>
          <BrandRow tile={tile} fontSize={26} />
          <div style={{ display: 'flex', fontSize: 46, fontWeight: 800, color: '#FFFFFF' }}>
            {[property.city, property.province].filter(Boolean).join(', ') || 'Ecuador'}
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: FOG }}>
            {buildPriceLine(property)}
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>
            {ATTRIBUTION}
          </div>
        </div>
        <QrCard qr={qr} code={code} size={150} />
      </div>
    </div>
  );
}

// --- The photo laminas ----------------------------------------------------

/** Square and 4:5: one photo, the facts over it, the QR in the corner. */
async function photoLamina(
  property: Property,
  qr: string,
  code: string,
  height: number
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const facts = buildFacts(property).join(' · ');
  const headline = [property.city, property.province].filter(Boolean).join(', ');

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY }}>
      <PhotoLayer photo={photo} height={height} />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: 48,
          backgroundImage: 'linear-gradient(180deg, rgba(15,16,32,0.72) 0%, rgba(15,16,32,0) 100%)',
        }}
      >
        <StatusChip property={property} fontSize={26} />
        <BrandRow tile={tile} fontSize={26} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
          padding: 52,
          backgroundImage: 'linear-gradient(180deg, rgba(15,16,32,0) 0%, rgba(15,16,32,0.94) 58%)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: FOG }}>
            {getPropertyTypeLabel(property.property_type)}
            {headline ? ` · ${headline}` : ''}
          </div>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.05 }}>
            {buildPriceLine(property)}
          </div>
          {facts ? (
            <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.88)' }}>{facts}</div>
          ) : null}
          <VerifyLine code={code} fontSize={22} />
        </div>
        <QrCard qr={qr} code={code} size={160} />
      </div>
    </div>
  );
}

/** 9:16: photo on top, a solid brand panel below where the text can breathe. */
async function storyLamina(property: Property, qr: string, code: string) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const facts = buildFacts(property).join(' · ');
  const headline = [property.city, property.province].filter(Boolean).join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: NAVY }}>
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: 1120 }}>
        <PhotoLayer photo={photo} height={1120} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: 56,
            backgroundImage: 'linear-gradient(180deg, rgba(15,16,32,0.7) 0%, rgba(15,16,32,0) 100%)',
          }}
        >
          <StatusChip property={property} fontSize={30} />
          <BrandRow tile={tile} fontSize={28} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          // Top-aligned, not centred: the bottom ~250px of a story is covered
          // by the app's own reply bar, and centred content lands right in it.
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 40,
          padding: '72px 64px 64px',
          backgroundImage: `linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 180%)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 600, color: FOG }}>
            {getPropertyTypeLabel(property.property_type)}
            {headline ? ` · ${headline}` : ''}
          </div>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.02 }}>
            {buildPriceLine(property)}
          </div>
          {facts ? (
            <div style={{ display: 'flex', fontSize: 34, color: 'rgba(255,255,255,0.9)' }}>{facts}</div>
          ) : null}
          <VerifyLine code={code} fontSize={26} />
        </div>
        <QrCard qr={qr} code={code} size={230} />
      </div>
    </div>
  );
}

/** 1200x630: what a pasted link expands into. Photo left, facts right. */
async function ogLamina(property: Property, qr: string, code: string) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const facts = buildFacts(property).join(' · ');
  const headline = [property.city, property.province].filter(Boolean).join(', ');

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: NAVY }}>
      <div style={{ display: 'flex', width: 640, height: '100%' }}>
        <PhotoLayer photo={photo} height={630} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 560,
          padding: 48,
          backgroundImage: `linear-gradient(160deg, ${NAVY} 0%, ${TEAL} 210%)`,
        }}
      >
        <BrandRow tile={tile} fontSize={24} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', fontSize: 26, color: FOG }}>
            {getPropertyTypeLabel(property.property_type)}
            {headline ? ` · ${headline}` : ''}
          </div>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.05 }}>
            {buildPriceLine(property)}
          </div>
          {facts ? (
            <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.88)' }}>{facts}</div>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <VerifyLine code={code} fontSize={17} />
          <QrCard qr={qr} code={code} size={100} />
        </div>
      </div>
    </div>
  );
}

// --- Route ----------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  const { id, format } = await params;

  const spec = SOCIAL_FORMATS[format as SocialFormat];
  if (!spec) {
    return new Response('Unknown format', { status: 404 });
  }

  const property = await getProperty(id);
  if (!property) {
    return new Response('Property not found', { status: 404 });
  }

  const requested = request.nextUrl.searchParams.get('red') as SocialNetwork | null;
  // An unknown network in the querystring becomes the default rather than an
  // error: this URL gets pasted and edited by hand, and a broken preview is a
  // worse answer than an untagged one.
  const network: SocialNetwork = requested && NETWORKS.has(requested) ? requested : 'facebook';

  const code = property.short_code ?? '';
  const qr = await qrDataUri(trackedUrl(property, network), 320);

  let element;
  if (format === 'map') {
    element = await mapLamina(property, qr, code, spec.width, spec.height);
  } else if (format === 'story') {
    element = await storyLamina(property, qr, code);
  } else if (format === 'og') {
    element = await ogLamina(property, qr, code);
  } else {
    element = await photoLamina(property, qr, code, spec.height);
  }

  return new ImageResponse(element, {
    width: spec.width,
    height: spec.height,
    headers: {
      // Short enough that an edited price stops being served almost at once —
      // `getProperty` is tag-invalidated by the Django side, so the only stale
      // window is this one. Long enough to absorb the burst of scrapers that
      // hit a link the moment it is posted.
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400',
    },
  });
}
