/**
 * The promotion laminas: one route, seven formats.
 *
 * Five of them describe a listing and can always be drawn. The last two —
 * `price-drop` and `sold` — assert that something happened to it, and the route
 * refuses to draw them when it did not: see the guard in `GET`. SOC-102.
 *
 * Public on purpose. A lamina's whole job is to be fetched by Facebook for a
 * link preview, served by Instagram and looked at by strangers, so putting a
 * session in front of it would break the only use it has. It costs nothing to
 * open because SOC-001 keeps everything private off the image: what is drawn
 * here is what the public listing already shows.
 *
 * Runs on the Node runtime rather than the edge because it reads the brand mark
 * off disk and transcodes the listing photo with sharp.
 *
 * Two constraints shape every decision below, and neither is negotiable:
 *
 * 1. These images are forwarded through WhatsApp, which recompresses them.
 *    Thin type over a photograph, low-contrast gradients and hairlines are the
 *    first things to die. Text therefore sits on solid panels, not on washes.
 * 2. Satori does not synthesise font weights. The route therefore registers
 *    the project's regular and extra-bold Plus Jakarta Sans faces explicitly,
 *    keeping the hierarchy intentional in every exported format.
 */

/* eslint-disable @next/next/no-img-element --
   Satori consumes a raw element tree and rasterises it; `next/image` has no
   meaning inside an ImageResponse, where there is no browser, no layout pass
   and no srcset to negotiate. */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

import aentsTokens from '@/lib/aents-tokens.json';
import { qrDataUri, qrPixelSize } from '@/lib/qr';
import { getProperty } from '@/lib/properties';
import { getPropertyTypeLabel, getStatusLabel } from '@/lib/property-labels';
import {
  CLOSURE_STAMP,
  SOCIAL_FORMATS,
  buildArtworkHeadline,
  buildFacts,
  buildPriceLine,
  closureKind,
  closureLabel,
  priceDrop,
  trackedUrl,
  type ClosureKind,
  type PriceDrop,
  type SocialFormat,
  type SocialNetwork,
} from '@/lib/social-kit';
import {
  ATTRIBUTION,
  buildMosaic,
  centerOf,
  fitZoom,
  markerOverlay,
  polygonOverlay,
  polygonPoints,
  shiftCenter,
  type LatLng,
} from '@/lib/static-map';
import type { Property } from '@/lib/types';

export const runtime = 'nodejs';

const tokens = aentsTokens.light;
const NAVY = tokens['--navy'];
const GREEN = tokens['--primary-strong'];
const TEAL = tokens['--accent-alt-strong'];
const FOG = tokens['--fog'];
/** The same two hues at full saturation: legible as type on navy, unlike the
 *  `-strong` pair, which is tuned for white text sitting on top of it. */
const MINT = tokens['--primary'];
const AQUA = tokens['--teal'];

/** The one hue in the system that reads as "tag", for the price-drop badge. */
const AMBER = tokens['--amber'];

/** `NAVY` as channels, so a gradient can fade to exactly the panel colour. */
const NAVY_RGB = '15,16,32';

const NETWORKS = new Set<SocialNetwork>(['facebook', 'instagram', 'tiktok', 'whatsapp']);

/**
 * How big the QR is drawn on each lamina.
 *
 * Requested from the encoder at these exact sizes rather than rendered once at
 * 320 and scaled down in the layout: a downscale averages module edges into
 * grey, which is precisely the damage error correction is there to absorb, and
 * spending it before the image even leaves the server is a waste.
 */
const QR_TARGET: Record<SocialFormat, number> = {
  feed: 152,
  portrait: 164,
  story: 224,
  map: 152,
  og: 112,
  'price-drop': 164,
  sold: 164,
};

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
 * The brand face, in the two weights the laminas actually use.
 *
 * Satori does not synthesise weights: it registers the faces it is handed and
 * picks the nearest one, so a `fontWeight: 800` with only a regular loaded is a
 * decoration. Two static faces are therefore the whole difference between a
 * price that looks like a price and one that looks like a caption.
 *
 * They are static on purpose. Plus Jakarta Sans ships as a variable font, and
 * the site loads it through `next/font/google`, which emits woff2 — a format
 * Satori cannot read, under a hashed build filename. The two TTFs in
 * `public/fonts/` were cut locally from the copy vendored in the design system
 * (`@fontsource-variable/plus-jakarta-sans`, OFL, licence alongside them) with
 * fontTools: `woff2.decompress` to undo the compression, then
 * `varLib.instancer.instantiateVariableFont` at `wght=400` and `wght=800`. The
 * latin subset is kept whole — 29 KB per face — rather than cut down to the
 * characters this file happens to print, because the strings that go through
 * here are listing titles somebody typed, and a missing glyph is a blank box
 * baked into an image that gets forwarded.
 *
 * Falling back to `undefined` rather than throwing, for the same reason
 * `brandTile` swallows its error: an unreadable font is a plainer lamina, and a
 * 500 is no lamina at all. `undefined` and not `[]` — an empty list is not "no
 * preference", it is "no fonts", and Satori answers it with "No fonts are
 * loaded. At least one font is required to calculate the layout." Omitting the
 * option is what leaves `next/og` free to use the Geist face it bundles.
 */
type PromotionFont = { name: string; data: Buffer; weight: 400 | 800 };
let promotionFontsPromise: Promise<PromotionFont[] | undefined> | null = null;
function promotionFonts() {
  if (!promotionFontsPromise) {
    promotionFontsPromise = Promise.all([
      readFile(path.join(process.cwd(), 'public', 'fonts', 'PlusJakartaSans-Regular.ttf')),
      readFile(path.join(process.cwd(), 'public', 'fonts', 'PlusJakartaSans-ExtraBold.ttf')),
    ])
      .then(([regular, extraBold]): PromotionFont[] => [
        { name: 'Plus Jakarta Sans', data: regular, weight: 400 },
        { name: 'Plus Jakarta Sans', data: extraBold, weight: 800 },
      ])
      .catch(() => undefined);
  }
  return promotionFontsPromise;
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
async function transcodePhoto(source?: string): Promise<string | null> {
  if (!source?.startsWith('http')) return null;

  try {
    // Imported here rather than at the top of the module so that a build
    // without a usable native binary degrades to the branded lamina instead of
    // failing the route outright. sharp is declared as a direct dependency,
    // but it ships as platform-specific binaries and an install can skip one.
    const { default: sharp } = await import('sharp');

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

async function marketingPhotos(property: Property, limit = 3): Promise<string[]> {
  const ordered = [...(property.images || [])].sort((a, b) => Number(Boolean(b.is_main)) - Number(Boolean(a.is_main)));
  const photos = await Promise.all(ordered.slice(0, limit).map((image) => transcodePhoto(image.image)));
  return photos.filter((photo): photo is string => Boolean(photo));
}

async function mainPhoto(property: Property): Promise<string | null> {
  return (await marketingPhotos(property, 1))[0] ?? null;
}

/** Dark enough to carry white text on top of it. */
function statusChipColor(property: Property): string {
  return property.status === 'for_rent' ? TEAL : GREEN;
}

/** Bright enough to be read as text on navy. */
function accentColor(property: Property): string {
  return property.status === 'for_rent' ? AQUA : MINT;
}

// --- Fitting text into boxes ----------------------------------------------

/**
 * A hard character cap, cut on a word boundary when one is close enough.
 *
 * Satori does not truncate. A string wider than its box gets no ellipsis and no
 * wrap opportunity it did not already have: it runs off the frame and is
 * guillotined by the edge of the raster. Every value that comes from a listing
 * has to be cut here or not at all — a title someone typed, a province called
 * "Santo Domingo de los Tsáchilas", a price line that carries both a sale and a
 * rent figure.
 */
function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s·,]+$/, '')}…`;
}

/**
 * A font size that keeps a known string inside a known box.
 *
 * Satori exposes no way to measure text, so the estimate is by character count:
 * past `comfortable` characters the size shrinks in proportion, with a floor so
 * a long string ends up small rather than invisible. Crude, and it has to be —
 * but the overflow it prevents is not hypothetical. "$85.000" is seven
 * characters; "Precio a consultar" is eighteen and "$1.700.000 venta ·
 * $14.000/mes alquiler" is thirty-nine, and all three land in the same box.
 */
function fitSize(text: string, base: number, comfortable: number, min: number): number {
  if (text.length <= comfortable) return base;
  return Math.max(min, Math.round((base * comfortable) / text.length));
}

// --- Shared pieces --------------------------------------------------------

/**
 * High-contrast card holding the QR and the code typed underneath it.
 *
 * The two are not redundant, which is why SOC-002 asks for both. The QR serves
 * whoever can scan the screen in front of them; the code in clear serves
 * everyone else — whoever got the image forwarded and recompressed by WhatsApp
 * until the modules stopped resolving, whoever is looking at it printed, and
 * whoever simply will not scan a code sent by a stranger.
 */
function QrCard({ qr, code, size }: { qr: string; code: string; size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 14,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Drawn at the width it was encoded at; see QR_TARGET. */}
      <img src={qr} width={size} height={size} alt="" />
      {code ? (
        <div
          style={{
            display: 'flex',
            fontSize: Math.round(size * 0.2),
            fontWeight: 800,
            letterSpacing: Math.round(size * 0.04),
            // Nudged right by the trailing letterspace so the code stays
            // optically centred under the code block.
            paddingLeft: Math.round(size * 0.04),
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
      <div
        style={{
          display: 'flex',
          fontSize: Math.round(fontSize * 0.82),
          letterSpacing: 1,
          color: 'rgba(255,255,255,0.62)',
        }}
      >
        ESCANEA EL QR O VISITA
      </div>
      {/* The address carries the code, not just the domain: a code printed
          under the QR with no path to type it into is a code nobody can use,
          and the pair is what SOC-002 asks for. */}
      <div style={{ display: 'flex', fontSize, fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>
        {code ? `geopropiedadesecuador.com/p/${code}` : 'geopropiedadesecuador.com'}
      </div>
    </div>
  );
}

function BrandRow({ tile, fontSize }: { tile: string; fontSize: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {tile ? <img src={tile} width={fontSize * 1.65} height={fontSize * 1.65} alt="" /> : null}
      <div style={{ display: 'flex', fontSize, letterSpacing: 0.5, color: '#FFFFFF' }}>
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
        padding: `${Math.round(fontSize * 0.42)}px ${Math.round(fontSize * 0.92)}px`,
        borderRadius: 999,
        backgroundColor: statusChipColor(property),
        color: '#FFFFFF',
        fontSize,
        fontWeight: 800,
        letterSpacing: 2,
      }}
    >
      {getStatusLabel(property.status).toUpperCase()}
    </div>
  );
}

function SalesCallout({ property, fontSize, message }: { property: Property; fontSize: number; message?: string }) {
  const headline = message || buildArtworkHeadline(property);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: `${Math.round(fontSize * 0.6)}px ${Math.round(fontSize * 0.8)}px`,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderLeft: `8px solid ${accentColor(property)}`,
        boxShadow: '0 18px 42px rgba(15,16,32,0.28)',
      }}
    >
      <div style={{ display: 'flex', fontSize, fontWeight: 800, letterSpacing: 1, color: NAVY }}>{headline}</div>
      <div style={{ display: 'flex', fontSize: Math.round(fontSize * 0.68), color: 'rgba(15,16,32,0.68)' }}>
        FOTOS · UBICACIÓN · CONTACTO DIRECTO
      </div>
    </div>
  );
}

/**
 * The "what and where" line above the price.
 *
 * Upper case and letterspaced to keep this line subordinate to the price. It
 * shrinks before it truncates: losing the province is worse than losing two
 * points of type size.
 */
function Eyebrow({
  property,
  fontSize,
  maxChars,
}: {
  property: Property;
  fontSize: number;
  maxChars: number;
}) {
  const place = [property.city, property.province].filter(Boolean).join(', ');
  const text = [getPropertyTypeLabel(property.property_type), place]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
  return (
    <div
      style={{
        display: 'flex',
        fontSize: fitSize(text, fontSize, maxChars, Math.round(fontSize * 0.72)),
        // Bold now that there is a bold: at this size, letterspaced caps in the
        // regular face read as a whisper next to the price they introduce.
        fontWeight: 800,
        letterSpacing: 2,
        color: accentColor(property),
      }}
    >
      {clamp(text, Math.round(maxChars * 1.35))}
    </div>
  );
}

/**
 * The declared attributes, one chip each.
 *
 * A dot-joined sentence is a single long line that either fits or runs off the
 * frame; chips wrap, and each one carries its own contrast box, which is what
 * survives a WhatsApp recompression. Capped at three so the sales message and
 * price remain the primary hierarchy on small screens.
 */
function FactChips({ facts, fontSize }: { facts: string[]; fontSize: number }) {
  if (facts.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {facts.slice(0, 3).map((fact) => (
        <div
          key={fact}
          style={{
            display: 'flex',
            padding: `${Math.round(fontSize * 0.3)}px ${Math.round(fontSize * 0.62)}px`,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.26)',
            fontSize,
            color: '#FFFFFF',
          }}
        >
          {clamp(fact, 22)}
        </div>
      ))}
    </div>
  );
}

/**
 * The photo layer, or the brand gradient when the listing has none.
 *
 * A listing with no photo is exactly the one nobody sees and that most needs
 * sharing; returning no lamina at all would punish it twice. SOC-004. The mark
 * is dropped in oversized behind everything so the fallback reads as a designed
 * cover rather than as a missing image.
 */
function PhotoLayer({
  photo,
  width,
  height,
  tile,
}: {
  photo: string | null;
  width: number | string;
  height: number | string;
  tile?: string;
}) {
  if (photo) {
    return <img src={photo} width={width} height={height} style={{ objectFit: 'cover' }} alt="" />;
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width,
        height,
        overflow: 'hidden',
        backgroundImage: `linear-gradient(135deg, ${TEAL} 0%, ${GREEN} 55%, ${NAVY} 100%)`,
      }}
    >
      {tile ? <img src={tile} width={520} height={520} style={{ opacity: 0.14 }} alt="" /> : null}
    </div>
  );
}

function PhotoCollage({ photos, width, height }: { photos: string[]; width: number; height: number }) {
  if (photos.length < 2) {
    return <PhotoLayer photo={photos[0] ?? null} width={width} height={height} />;
  }
  const mainWidth = Math.round(width * 0.68);
  const sideWidth = width - mainWidth;
  return (
    <div style={{ display: 'flex', width, height, gap: 6, backgroundColor: NAVY }}>
      <img src={photos[0]} width={mainWidth} height={height} style={{ objectFit: 'cover' }} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column', width: sideWidth, height, gap: 6 }}>
        <img src={photos[1]} width={sideWidth} height={photos[2] ? Math.round(height / 2) : height} style={{ objectFit: 'cover' }} alt="" />
        {photos[2] ? <img src={photos[2]} width={sideWidth} height={Math.round(height / 2)} style={{ objectFit: 'cover' }} alt="" /> : null}
      </div>
    </div>
  );
}

/**
 * The dark ramp that lifts a caption panel off whatever is behind it.
 *
 * A single soft gradient was not enough: over a bright sky the old panel left
 * white type sitting on near-white pixels, and WhatsApp finished the job. The
 * ramp is short and steep, and it ends on the panel colour exactly, so the
 * panel itself can be fully opaque without showing a seam.
 */
function PanelRamp({ height }: { height: number }) {
  return (
    <div
      style={{
        display: 'flex',
        height,
        backgroundImage:
          `linear-gradient(180deg, rgba(${NAVY_RGB},0) 0%, rgba(${NAVY_RGB},0.55) 42%,` +
          ` rgba(${NAVY_RGB},0.88) 72%, rgba(${NAVY_RGB},1) 100%)`,
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
  qrSize: number,
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
  const price = buildPriceLine(property);
  const place = clamp([property.city, property.province].filter(Boolean).join(', '), 34) || 'Ecuador';

  // Without coordinates there is no map to draw, and inventing a location is
  // the one thing a map lamina must never do. What is left is the branded
  // lamina, built out of the same parts as the photo formats rather than as a
  // one-off: a listing that is missing its coordinates should look like a
  // decision, not like a render that gave up halfway.
  if (!point) {
    return (
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
        <PhotoLayer photo={null} width="100%" height={height} tile={tile} />

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: 44,
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
            flexDirection: 'column',
          }}
        >
          <PanelRamp height={110} />
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 28,
              padding: '4px 48px 42px',
              backgroundColor: NAVY,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                maxWidth: width - 96 - qrSize - 60,
              }}
            >
              {/* Only the type, not `Eyebrow`: the place is the headline right
                  below, and printing it twice reads as a bug. */}
              <div
                style={{
                  display: 'flex',
                  fontSize: 25,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: accentColor(property),
                }}
              >
                {getPropertyTypeLabel(property.property_type).toUpperCase()}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: fitSize(place, 62, 18, 36),
                  fontWeight: 800,
                  lineHeight: 1.05,
                  color: '#FFFFFF',
                }}
              >
                {place}
              </div>
              <div style={{ display: 'flex', fontSize: fitSize(price, 36, 22, 24), color: FOG }}>
                {price}
              </div>
              <VerifyLine code={code} fontSize={23} />
            </div>
            <QrCard qr={qr} code={code} size={qrSize} />
          </div>
        </div>
      </div>
    );
  }

  // The caption panel covers the bottom of the frame, so the frame is not what
  // the plot has to fit into. Both the zoom and the centre are computed against
  // the band that stays visible, which is what keeps a plot from being framed
  // perfectly and then hidden behind the bar.
  const RAMP = 72;
  const PANEL = 212;
  const visible = height - RAMP - PANEL;

  const zoom = fitZoom(outline, width, visible);
  const mosaic = buildMosaic(shiftCenter(point, zoom, 0, (RAMP + PANEL) / 2), zoom, width, height);
  const strong = statusChipColor(property);
  const overlay =
    outline.length >= 3
      ? polygonOverlay(outline, mosaic, width, height, {
          stroke: strong,
          fill: property.status === 'for_rent' ? 'rgba(20,184,166,0.26)' : 'rgba(34,197,94,0.26)',
        })
      : '';
  // The pin is drawn even when the outline is, and on top of it: the outline
  // says how big the plot is, the pin says "here", and at Instagram size a
  // 40-metre polygon on its own is a smudge.
  const marker = markerOverlay(point, mosaic, width, height, {
    color: strong,
    radius: outline.length >= 3 ? 22 : 30,
  });

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', fontFamily: 'Plus Jakarta Sans' }}>
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
      ) : null}
      <img src={marker} width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} alt="" />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PanelRamp height={RAMP} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            // Room on the right for the QR card, which overlaps this panel.
            padding: '26px 240px 30px 48px',
            backgroundColor: NAVY,
          }}
        >
          <BrandRow tile={tile} fontSize={24} />
          {/* The place carries the weight here, not the price: this is the one
              lamina whose subject is where the listing is. */}
          <div
            style={{
              display: 'flex',
              fontSize: fitSize(place, 50, 22, 34),
              fontWeight: 800,
              color: '#FFFFFF',
            }}
          >
            {place}
          </div>
          <div style={{ display: 'flex', fontSize: fitSize(price, 32, 26, 22), color: FOG }}>
            {price}
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: 'rgba(255,255,255,0.78)' }}>
            {ATTRIBUTION}
          </div>
        </div>
      </div>

      {/* Deliberately outside the panel: letting the card break the panel's top
          edge buys back ~80px of map that a taller bar would have eaten. */}
      <div style={{ position: 'absolute', right: 44, bottom: 30, display: 'flex' }}>
        <QrCard qr={qr} code={code} size={qrSize} />
      </div>
    </div>
  );
}

// --- The photo laminas ----------------------------------------------------

/**
 * Square and 4:5: one photo, the facts on a solid panel under it.
 *
 * The panel is opaque, not a gradient. It costs a third of the photo and buys
 * type that is still readable after the image has been through a chat app twice,
 * which is the trade this whole kit exists to make.
 *
 * The listing title only appears on the 4:5. On the square there is no room for
 * it that does not come out of the price or the photo, and the square is the one
 * format that always travels with a caption — Facebook and WhatsApp both put the
 * text right underneath. The 4:5 is 270px taller and Instagram truncates its
 * caption after two lines, so there the title has to be in the picture.
 */
async function photoLamina(
  property: Property,
  qr: string,
  code: string,
  qrSize: number,
  width: number,
  height: number,
  message?: string
) {
  const withTitle = height >= 1200;
  const [tile, photos] = await Promise.all([brandTile(), marketingPhotos(property, withTitle ? 3 : 1)]);
  const photo = photos[0] ?? null;
  const facts = buildFacts(property);
  const price = buildPriceLine(property);
  const title = withTitle ? clamp(property.title ?? '', 62) : '';
  const textWidth = width - 96 - qrSize - 60;

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      {withTitle && photos.length > 1
        ? <PhotoCollage photos={photos} width={width} height={height} />
        : <PhotoLayer photo={photo} width="100%" height={height} tile={tile} />}

      <div
        style={{
          position: 'absolute',
          inset: 20,
          display: 'flex',
          border: '2px solid rgba(255,255,255,0.32)',
          borderRadius: 28,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: 44,
          backgroundImage:
            `linear-gradient(180deg, rgba(${NAVY_RGB},0.82) 0%, rgba(${NAVY_RGB},0.42) 58%,` +
            ` rgba(${NAVY_RGB},0) 100%)`,
        }}
      >
        <StatusChip property={property} fontSize={26} />
        <BrandRow tile={tile} fontSize={26} />
      </div>

      <div style={{ position: 'absolute', left: 44, top: 150, display: 'flex' }}>
        <SalesCallout property={property} fontSize={withTitle ? 26 : 23} message={message} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PanelRamp height={90} />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 28,
            padding: '4px 48px 42px',
            backgroundColor: NAVY,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={25} maxChars={30} />
            <div
              style={{
                display: 'flex',
                fontSize: fitSize(price, 78, 13, 34),
                fontWeight: 800,
                lineHeight: 1.02,
                color: '#FFFFFF',
              }}
            >
              {price}
            </div>
            {title ? (
              <div style={{ display: 'flex', fontSize: 29, lineHeight: 1.25, color: 'rgba(255,255,255,0.80)' }}>
                {title}
              </div>
            ) : null}
            {/* Smaller on the square, where four chips at the 4:5 size wrap and
                leave the last one orphaned on a row of its own. */}
            <FactChips facts={facts} fontSize={withTitle ? 25 : 22} />
            <VerifyLine code={code} fontSize={23} />
          </div>
          <QrCard qr={qr} code={code} size={qrSize} />
        </div>
      </div>
    </div>
  );
}

/** 9:16: photo on top, a solid brand panel below where the text can breathe. */
async function storyLamina(property: Property, qr: string, code: string, qrSize: number, message?: string) {
  const [tile, photos] = await Promise.all([brandTile(), marketingPhotos(property, 3)]);
  const photo = photos[0] ?? null;
  const facts = buildFacts(property);
  const price = buildPriceLine(property);
  const title = clamp(property.title ?? '', 68);

  // The photo takes everything the panel does not need, and the panel's height
  // is set by where its content has to end rather than by taste: the bottom
  // ~250px of a story sit under the app's own reply bar on every phone. The
  // budget assumes the worst case the panel can produce — a title that wraps to
  // two lines above four chips that wrap to two rows — because that is the case
  // that pushes the verifiable URL under the reply bar.
  const PHOTO = 1120;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: PHOTO }}>
        {photos.length > 1
          ? <PhotoCollage photos={photos} width={1080} height={PHOTO} />
          : <PhotoLayer photo={photo} width="100%" height={PHOTO} tile={tile} />}
        <div
          style={{
            position: 'absolute',
            inset: 24,
            display: 'flex',
            border: '2px solid rgba(255,255,255,0.32)',
            borderRadius: 30,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: 52,
            backgroundImage:
              `linear-gradient(180deg, rgba(${NAVY_RGB},0.82) 0%, rgba(${NAVY_RGB},0.42) 58%,` +
              ` rgba(${NAVY_RGB},0) 100%)`,
          }}
        >
          <StatusChip property={property} fontSize={30} />
          <BrandRow tile={tile} fontSize={28} />
        </div>
        <div style={{ position: 'absolute', left: 52, bottom: 52, display: 'flex' }}>
          <SalesCallout property={property} fontSize={28} message={message} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 36,
          padding: '58px 60px 0',
          backgroundImage: `linear-gradient(160deg, ${NAVY} 0%, #10222C 62%, ${TEAL} 190%)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1080 - 120 - 36 - qrSize - 28 }}>
          <Eyebrow property={property} fontSize={30} maxChars={26} />
          <div
            style={{
              display: 'flex',
              fontSize: fitSize(price, 94, 13, 40),
              fontWeight: 800,
              lineHeight: 1.02,
              color: '#FFFFFF',
            }}
          >
            {price}
          </div>
          {title ? (
            <div style={{ display: 'flex', fontSize: 33, lineHeight: 1.25, color: 'rgba(255,255,255,0.82)' }}>
              {title}
            </div>
          ) : null}
          <FactChips facts={facts} fontSize={29} />
          <VerifyLine code={code} fontSize={27} />
        </div>
        <QrCard qr={qr} code={code} size={qrSize} />
      </div>
    </div>
  );
}

/**
 * 1200x630: what a pasted link expands into, and the lamina that gets seen most.
 *
 * It is the only one nobody chooses to look at, which changes what it has to do:
 * there is no caption to lean on and no second glance, so it carries the title
 * and the status that the other formats can leave to context. The photo is a
 * third of the composition rather than the whole of it, because at the size
 * Facebook renders a link card the text is the only part that survives.
 */
async function ogLamina(property: Property, qr: string, code: string, qrSize: number, message?: string) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const facts = buildFacts(property);
  const price = buildPriceLine(property);
  const title = clamp(property.title ?? '', 76);

  const PHOTO_WIDTH = 470;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <div style={{ display: 'flex', position: 'relative', width: PHOTO_WIDTH, height: '100%' }}>
        <PhotoLayer photo={photo} width={PHOTO_WIDTH} height={630} tile={tile} />
        <div style={{ position: 'absolute', left: 34, bottom: 34, display: 'flex' }}>
          <StatusChip property={property} fontSize={22} />
        </div>
      </div>

      {/* A hard accent edge instead of a soft seam: at link-card size a gradient
          between photo and panel just reads as a compression artefact. */}
      <div style={{ display: 'flex', width: 7, height: '100%', backgroundColor: accentColor(property) }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 1200 - PHOTO_WIDTH - 7,
          padding: '38px 42px 34px',
          backgroundColor: NAVY,
        }}
      >
        <BrandRow tile={tile} fontSize={23} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Eyebrow property={property} fontSize={21} maxChars={34} />
          <div
            style={{
              display: 'flex',
              fontSize: fitSize(price, 62, 13, 30),
              fontWeight: 800,
              lineHeight: 1.02,
              color: '#FFFFFF',
            }}
          >
            {price}
          </div>
          {title ? (
            <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.3, color: 'rgba(255,255,255,0.82)' }}>
              {title}
            </div>
          ) : null}
          <FactChips facts={facts} fontSize={20} />
          <SalesCallout property={property} fontSize={18} message={message} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <VerifyLine code={code} fontSize={19} />
          <QrCard qr={qr} code={code} size={qrSize} />
        </div>
      </div>
    </div>
  );
}

// --- The moment laminas ---------------------------------------------------

/**
 * 4:5, "bajó el precio": the two figures, and nothing that competes with them.
 *
 * The whole lamina exists to be read in one glance as a comparison, so the old
 * price is not merely smaller — it is struck through and labelled ANTES. Size
 * alone would leave a reader guessing which of the two is being asked for
 * today, and guessing wrong about a price is the one mistake this kit cannot
 * afford to cause.
 *
 * The rule is drawn as a box rather than with `text-decoration`: Satori's
 * support for it is thin, and a hairline is the first thing WhatsApp destroys.
 * Three pixels of solid colour survive being forwarded.
 *
 * The date is printed because a price is a claim with a shelf life. An image
 * outlives the correction that follows it, and "actualizado el 1 de agosto"
 * lets whoever sees it in November judge for themselves.
 */
async function priceDropLamina(
  property: Property,
  drop: PriceDrop,
  qr: string,
  code: string,
  qrSize: number
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const title = clamp(property.title ?? '', 58);
  // Sized against what the panel below actually needs — badge, eyebrow, the two
  // prices, the date, the title and the verify line — rather than by ratio. The
  // panel is opaque, so every pixel it does not use is a pixel of photograph
  // thrown away.
  const PHOTO = 880;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: NAVY,
        fontFamily: 'Plus Jakarta Sans',
      }}
    >
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: PHOTO }}>
        <PhotoLayer photo={photo} width="100%" height={PHOTO} tile={tile} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: 44,
            backgroundImage:
              `linear-gradient(180deg, rgba(${NAVY_RGB},0.82) 0%, rgba(${NAVY_RGB},0.42) 58%,` +
              ` rgba(${NAVY_RGB},0) 100%)`,
          }}
        >
          <StatusChip property={property} fontSize={26} />
          <BrandRow tile={tile} fontSize={26} />
        </div>

        {/* Inside the photo and clear of its bottom edge. Hanging it over the
            seam reads better in a mockup and is invisible in the render: the
            panel is painted after this block and covers whatever overhangs. */}
        <div style={{ position: 'absolute', left: 48, bottom: 30, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              padding: '14px 26px',
              borderRadius: 999,
              backgroundColor: AMBER,
              color: NAVY,
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            BAJÓ DE PRECIO
          </div>
          {/* Only when it rounds to something. "-0 %" is a badge that says
              nothing, and a cut of eleven dollars is better told by the two
              figures themselves. */}
          {drop.percent > 0 ? (
            <div
              style={{
                display: 'flex',
                padding: '14px 22px',
                borderRadius: 999,
                border: `3px solid ${AMBER}`,
                color: AMBER,
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              −{drop.percent}%
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 30,
          padding: '58px 48px 0',
          backgroundColor: NAVY,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1080 - 96 - qrSize - 58 }}>
          <Eyebrow property={property} fontSize={24} maxChars={30} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' }}>
              ANTES
            </div>
            <div style={{ display: 'flex', position: 'relative' }}>
              <div style={{ display: 'flex', fontSize: 40, color: 'rgba(255,255,255,0.58)' }}>
                {drop.previousLabel}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: -6,
                  right: -6,
                  top: 22,
                  height: 3,
                  backgroundColor: 'rgba(255,255,255,0.58)',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: fitSize(drop.currentLabel, 96, 12, 44),
              fontWeight: 800,
              lineHeight: 1.02,
              color: '#FFFFFF',
            }}
          >
            {drop.currentLabel}
          </div>

          <div style={{ display: 'flex', fontSize: 23, color: FOG }}>
            Precio actualizado el {drop.changedLabel}
          </div>

          {title ? (
            <div style={{ display: 'flex', fontSize: 27, lineHeight: 1.25, color: 'rgba(255,255,255,0.78)' }}>
              {title}
            </div>
          ) : null}

          <VerifyLine code={code} fontSize={23} />
        </div>

        <QrCard qr={qr} code={code} size={qrSize} />
      </div>
    </div>
  );
}

/**
 * 4:5, "vendido": the one lamina that is not selling the property on it.
 *
 * It cannot be. The property is gone. What it sells is whoever closed the deal,
 * which is why it is built like a poster and not like a listing: the photo goes
 * under a scrim, the facts and the chips are dropped, and what is left is the
 * stamp, the place, the month and the mark. Somebody posts this because it is
 * their record, and every time they do, the portal's logo and a working code
 * land in front of people who have never heard of it. SOC-102.
 *
 * The asking price is deliberately absent. It is public and printing it would
 * break no rule, but next to the word VENDIDO it stops reading as "was asking"
 * and starts reading as "sold for" — a figure nobody recorded and this route
 * has no business implying.
 *
 * `StatusChip` is absent for a blunter reason: a closed listing is `inactive`,
 * and stamping INACTIVA across a celebration is the kind of detail that makes
 * whoever posted it look careless.
 */
async function soldLamina(
  property: Property,
  closure: ClosureKind,
  qr: string,
  code: string,
  qrSize: number,
  height: number
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const stamp = CLOSURE_STAMP[closure];
  const when = closureLabel(property);
  const plate = closure === 'rented' ? TEAL : GREEN;
  const accent = closure === 'rented' ? AQUA : MINT;
  const place = [property.city, property.province].filter(Boolean).join(', ');
  const subject = clamp(
    [getPropertyTypeLabel(property.property_type), place].filter(Boolean).join(' · ').toUpperCase(),
    38
  );

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: NAVY,
        fontFamily: 'Plus Jakarta Sans',
      }}
    >
      <PhotoLayer photo={photo} width="100%" height={height} tile={tile} />

      {/* Heavy on purpose. The photograph is context here, not the subject, and
          a bright kitchen behind the word VENDIDO fights it for attention. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          backgroundImage:
            `linear-gradient(180deg, rgba(${NAVY_RGB},0.78) 0%, rgba(${NAVY_RGB},0.62) 45%,` +
            ` rgba(${NAVY_RGB},0.92) 100%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          // Centred in the band the bottom panel leaves free, not in the frame:
          // measured from the top because Satori resolves `top` against the
          // parent and there is no vertical centring to lean on here.
          top: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          padding: '0 60px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 27, fontWeight: 800, letterSpacing: 4, color: accent }}>
          {subject}
        </div>

        <div
          style={{
            display: 'flex',
            padding: '26px 54px',
            borderRadius: 26,
            backgroundColor: plate,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: fitSize(stamp, 132, 8, 92),
              fontWeight: 800,
              letterSpacing: 6,
              color: '#FFFFFF',
            }}
          >
            {stamp}
          </div>
        </div>

        {when ? (
          <div style={{ display: 'flex', fontSize: 30, letterSpacing: 1, color: 'rgba(255,255,255,0.82)' }}>
            {when}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PanelRamp height={110} />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 28,
            padding: '4px 48px 44px',
            backgroundColor: NAVY,
          }}
        >
          {/* The mark is bigger here than on any other lamina, because on this
              one it is the message rather than the signature. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <BrandRow tile={tile} fontSize={36} />
            <VerifyLine code={code} fontSize={24} />
          </div>
          <QrCard qr={qr} code={code} size={qrSize} />
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
  const customMessage = request.nextUrl.searchParams.get('mensaje')?.replace(/\s+/g, ' ').trim().slice(0, 72) || undefined;
  // An unknown network in the querystring becomes the default rather than an
  // error: this URL gets pasted and edited by hand, and a broken preview is a
  // worse answer than an untagged one.
  const network: SocialNetwork = requested && NETWORKS.has(requested) ? requested : 'facebook';

  // The two moment laminas assert an event, and an event that did not happen
  // has no honest image. Answering 404 rather than quietly serving the ordinary
  // lamina is the difference between "this listing has no news" and "here is
  // something else, good luck telling which you got": these URLs end up in
  // `og:image` tags and in download buttons, and a 200 carrying a substitute
  // would be cached by every scraper that asked. `momentFormats` is the same
  // predicate the kit screen asks before drawing the card, so an offered card
  // never lands here and a hand-typed URL gets a straight answer.
  const drop = priceDrop(property);
  const closure = closureKind(property);
  if (format === 'price-drop' && !drop) {
    return new Response('This listing has no price drop to announce', { status: 404 });
  }
  if (format === 'sold' && !closure) {
    return new Response('This listing is not closed as sold or rented', { status: 404 });
  }

  const code = property.short_code ?? '';
  const target = trackedUrl(property, network);
  const qrSize = qrPixelSize(target, QR_TARGET[format as SocialFormat]);
  const [qr, fonts] = await Promise.all([qrDataUri(target, qrSize), promotionFonts()]);

  let element;
  if (format === 'map') {
    element = await mapLamina(property, qr, code, qrSize, spec.width, spec.height);
  } else if (format === 'story') {
    element = await storyLamina(property, qr, code, qrSize, customMessage);
  } else if (format === 'og') {
    element = await ogLamina(property, qr, code, qrSize, customMessage);
  } else if (format === 'price-drop') {
    element = await priceDropLamina(property, drop!, qr, code, qrSize);
  } else if (format === 'sold') {
    element = await soldLamina(property, closure!, qr, code, qrSize, spec.height);
  } else {
    element = await photoLamina(property, qr, code, qrSize, spec.width, spec.height, customMessage);
  }

  return new ImageResponse(element, {
    width: spec.width,
    height: spec.height,
    fonts,
    headers: {
      // Short enough that an edited price stops being served almost at once —
      // `getProperty` is tag-invalidated by the Django side, so the only stale
      // window is this one. Long enough to absorb the burst of scrapers that
      // hit a link the moment it is posted.
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400',
    },
  });
}
