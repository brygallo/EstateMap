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
 * Three constraints shape every decision below, and none is negotiable:
 *
 * 1. These images are forwarded through WhatsApp, which recompresses them.
 *    Thin type over a photograph, low-contrast gradients and hairlines are the
 *    first things to die. Text therefore sits on solid panels, not on washes.
 * 2. Satori does not synthesise font weights. The route therefore registers
 *    the project's regular and extra-bold Plus Jakarta Sans faces explicitly,
 *    keeping the hierarchy intentional in every exported format.
 * 3. The strings come from listings somebody typed and from importers that
 *    shout: emoji Satori cannot draw, titles in block capitals, a city that
 *    repeats its own province. `plainText`, `softenShouting` and `buildPlace`
 *    clean all three before a single glyph is placed — an image outlives the
 *    correction, so it has to be right the first time.
 *
 * The composition is one idea repeated across every format: a full-bleed
 * photograph and a single floating card that carries the whole commercial
 * argument. Everything a reader needs is inside one rounded panel with a
 * high-contrast ground — price first, proof second, address and QR last — and
 * the photograph is never cut in half by a bar. See `InfoCard`.
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
  buildPlace,
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
/** Warm paper, kept for the one lamina whose type is the subject: the stamp. */
const PAPER = '#F3F0E8';

/** `NAVY` as channels, so a gradient can fade to exactly the panel colour. */
const NAVY_RGB = '15,16,32';

const NETWORKS = new Set<SocialNetwork>(['facebook', 'instagram', 'tiktok', 'whatsapp']);

// --- The one shape every lamina is built from -------------------------------

/** Corner radius of the floating card. Generous enough to read as a card at
 *  the size a feed renders a post, and it is the only radius in the system. */
const CARD_RADIUS = 36;
/** The card is opaque and sits on a photograph; without a shadow it looks
 *  pasted on. Wide and soft, because a tight shadow becomes a dark ring once
 *  the image has been recompressed. */
const CARD_SHADOW = '0 28px 64px rgba(0,0,0,0.46)';
/** Width of the accent edge that runs down every card. See `SurveyLine`. */
const STRIPE = 9;

/**
 * How big the QR is drawn on each lamina.
 *
 * Requested from the encoder at these exact sizes rather than rendered once at
 * 320 and scaled down in the layout: a downscale averages module edges into
 * grey, which is precisely the damage error correction is there to absorb, and
 * spending it before the image even leaves the server is a waste.
 *
 * They are floors, not widths: `qrPixelSize` rounds each one up to a whole
 * number of modules, so every layout below reserves space using the size the
 * encoder returned and never the number written here.
 */
const QR_TARGET: Record<SocialFormat, number> = {
  feed: 128,
  portrait: 140,
  story: 168,
  map: 138,
  og: 104,
  'price-drop': 148,
  sold: 148,
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
 * Everything Satori cannot draw, removed before it is asked to.
 *
 * Listing titles arrive with emoji in them — "🏡 SE VENDE CASA" is a real one —
 * and the two faces registered above have no glyph for a house. Satori does not
 * fall back to a colour emoji font it was never handed: it draws the missing
 * glyph as a black box, and the box gets baked into a PNG that people forward.
 * Dropping the pictographs is the only outcome that is never wrong.
 */
const PICTOGRAPHS =
  /[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu;

function plainText(value?: string | null): string {
  return (value ?? '').replace(PICTOGRAPHS, '').replace(/\s+/g, ' ').trim();
}

/** Words that stay lowercase inside a Spanish title. */
const MINOR_WORDS = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los',
  'o', 'para', 'por', 'sin', 'sobre', 'su', 'sus', 'un', 'una', 'y',
]);

/**
 * A title that was typed in capitals, brought back down.
 *
 * Importers and owners alike write "VENDO CASA DE 3 PISOS EN CUMBAYÁ", and set
 * beside a price in extra bold, block capitals stop being a title and start
 * being a second headline competing with it. This only fires when the string is
 * overwhelmingly upper case — a title with ordinary capitalisation, or one
 * carrying an acronym, is left exactly as its author wrote it.
 */
function softenShouting(text: string): string {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 12) return text;
  const upper = text.replace(/[^\p{Lu}]/gu, '').length;
  if (upper / letters.length < 0.86) return text;

  return text
    .split(' ')
    .map((word, index) => {
      // Anything with a digit in it is a measurement or a model, and those are
      // written the way they are written: "3", "142 M²", "II".
      if (/\d/.test(word)) return word.toLowerCase().replace(/m²/g, 'm²');
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower.replace(/[^\p{L}]/gu, ''))) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

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
  const clean = plainText(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s·,—-]+$/, '')}…`;
}

/** The listing's own words, cleaned and cut to one line. */
function listingTitle(property: Property, max: number): string {
  return clamp(softenShouting(plainText(property.title)), max);
}

/**
 * A font size that keeps a known string inside a known box.
 *
 * Satori exposes no way to measure text, so the estimate is by character count:
 * past `comfortable` characters the size shrinks in proportion, with a floor so
 * a long string ends up small rather than invisible. Crude, and it has to be —
 * but the overflow it prevents is not hypothetical. "$85.000" is seven
 * characters; "Precio a consultar" is eighteen and "$1.700.000 venta ·
 * $14.000/mes arriendo" is thirty-nine, and all three land in the same box.
 */
function fitSize(text: string, base: number, comfortable: number, min: number): number {
  if (text.length <= comfortable) return base;
  return Math.max(min, Math.round((base * comfortable) / text.length));
}

// --- Shared pieces --------------------------------------------------------

/**
 * High-contrast card holding the QR, and nothing else.
 *
 * The bare code used to sit under it. It came out because an identifier
 * stranded in the artwork sells nothing on its own: read off a photo it is five
 * characters with nowhere to type them. What the fallback actually needs is the
 * address, and that is where it lives now — `VerifyLine` prints the full
 * `/p/<code>` path, so whoever gets an image WhatsApp recompressed until the
 * modules stopped resolving still has something they can type. SOC-002.
 */
function QrCard({ qr, size }: { qr: string; size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Drawn at the width it was encoded at; see QR_TARGET. */}
      <img src={qr} width={size} height={size} alt="" />
    </div>
  );
}

/**
 * The line that turns a picture into a checkable claim. See SOC-002.
 *
 * Two shapes, same promise. `stacked` prints the instruction above the address
 * and is used where the address stands alone; `inline` is the one that runs
 * along the card's footer band, a hand's width under the QR itself, where the
 * instruction would only be repeating what the code already says.
 *
 * The address carries the path in both. A code printed on its own is five
 * characters with nowhere to type them, and the pair — scannable and typeable —
 * is what SOC-002 asks for.
 */
function VerifyLine({
  code,
  fontSize,
  variant = 'stacked',
}: {
  code: string;
  fontSize: number;
  variant?: 'stacked' | 'inline';
}) {
  const address = code ? `geopropiedadesecuador.com/p/${code}` : 'geopropiedadesecuador.com';

  if (variant === 'inline') {
    return (
      <div style={{ display: 'flex', fontSize, fontWeight: 800, color: 'rgba(255,255,255,0.94)' }}>
        {address}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div
        style={{
          display: 'flex',
          fontSize: Math.round(fontSize * 0.78),
          letterSpacing: 1.6,
          color: 'rgba(255,255,255,0.58)',
        }}
      >
        ESCANEA EL QR O VISITA
      </div>
      <div style={{ display: 'flex', fontSize, fontWeight: 800, color: 'rgba(255,255,255,0.95)' }}>
        {address}
      </div>
    </div>
  );
}

function BrandRow({ tile, fontSize }: { tile: string; fontSize: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {tile ? <img src={tile} width={fontSize * 1.65} height={fontSize * 1.65} alt="" /> : null}
      <div style={{ display: 'flex', fontSize, fontWeight: 800, letterSpacing: 0.2, color: '#FFFFFF' }}>
        Geo Propiedades Ecuador
      </div>
    </div>
  );
}

/**
 * The brand mark as it appears over a photograph rather than on navy.
 *
 * A word set straight onto a picture is at the mercy of whatever is behind it,
 * and the top of a listing photo is usually sky. The pill gives it its own
 * ground, which is the same trade the whole kit makes: solid panels beat washes
 * once an image has been through a chat app.
 */
function BrandPill({ tile, fontSize }: { tile: string; fontSize: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: `${Math.round(fontSize * 0.42)}px ${Math.round(fontSize * 0.72)}px`,
        borderRadius: 999,
        backgroundColor: 'rgba(15,16,32,0.62)',
      }}
    >
      {tile ? <img src={tile} width={fontSize * 1.5} height={fontSize * 1.5} alt="" /> : null}
      <div style={{ display: 'flex', fontSize, fontWeight: 800, color: '#FFFFFF' }}>
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
        padding: `${Math.round(fontSize * 0.46)}px ${Math.round(fontSize * 0.98)}px`,
        borderRadius: 999,
        backgroundColor: statusChipColor(property),
        color: '#FFFFFF',
        fontSize,
        fontWeight: 800,
        letterSpacing: 2,
        boxShadow: '0 10px 26px rgba(15,16,32,0.34)',
      }}
    >
      {getStatusLabel(property.status).toUpperCase()}
    </div>
  );
}

/**
 * The commercial argument, reduced to a kicker.
 *
 * It used to be a white floating card with a subtitle, set at nearly the size
 * of the price, and two headlines on one lamina is one headline too many: the
 * price is the argument that closes, and everything else is there to lead the
 * eye toward it. So the message keeps its own colour and its own marker and
 * gives up its weight. It still changes with the operation and the type of
 * property, and the owner can still replace it. SOC-013.
 */
function SalesCallout({
  property,
  fontSize,
  message,
  maxChars = 34,
}: {
  property: Property;
  fontSize: number;
  message?: string;
  maxChars?: number;
}) {
  const headline = clamp(message || buildArtworkHeadline(property), maxChars).toUpperCase();
  const accent = accentColor(property);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 3, backgroundColor: accent }} />
      <div
        style={{
          display: 'flex',
          fontSize: fitSize(headline, fontSize, maxChars, Math.round(fontSize * 0.76)),
          fontWeight: 800,
          letterSpacing: 1.6,
          color: accent,
        }}
      >
        {headline}
      </div>
    </div>
  );
}

/**
 * The kit's signature: the survey line that runs down the edge of every card.
 *
 * It borrows from a site plan — the boundary drawn at the margin of the sheet —
 * and it is the one mark that makes a lamina recognisable as this portal's at a
 * glance. It carries the operation's colour, so a listing in arriendo reads
 * teal down its whole edge and one en venta reads green.
 *
 * Given an explicit height rather than stretched: Satori resolves a flex child
 * before it knows how tall its siblings ended up, and a bar that guesses is a
 * bar that overshoots the card.
 */
function SurveyLine({ property, height }: { property: Property; height: number }) {
  return (
    <div
      style={{
        display: 'flex',
        width: STRIPE,
        height,
        borderRadius: 999,
        backgroundColor: accentColor(property),
      }}
    />
  );
}

/**
 * The floating card that carries the whole commercial argument.
 *
 * One shape, every format. A photograph cut in half by a full-width bar reads
 * as a screenshot; the same information inside a card with a margin around it
 * reads as something that was designed, and the photograph survives whole
 * underneath. The ground is opaque navy rather than a wash for the reason at
 * the top of this file: type over a recompressed photograph is the first thing
 * to go.
 *
 * `footer` is optional and gets its own slightly lighter band, which is where
 * the address and the kicker live. Two bands beat six stacked lines: the eye
 * reads the card as price-then-proof instead of as a list.
 */
function InfoCard({
  children,
  footer,
  padding = '34px 38px',
  footerPadding = '18px 38px',
  style,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  padding?: string;
  footerPadding?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: CARD_RADIUS,
        backgroundColor: NAVY,
        boxShadow: CARD_SHADOW,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding }}>{children}</div>
      {footer ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            padding: footerPadding,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderBottomLeftRadius: CARD_RADIUS,
            borderBottomRightRadius: CARD_RADIUS,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** One restrained proof line; the artwork is an ad, not the full listing. */
function EditorialFacts({ facts, fontSize }: { facts: string[]; fontSize: number }) {
  const visible = facts.slice(0, 3).map((fact) => clamp(fact, 24));
  if (visible.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        fontSize,
        letterSpacing: 0.3,
        color: 'rgba(255,255,255,0.74)',
      }}
    >
      {visible.join('  ·  ')}
    </div>
  );
}

/**
 * The "what and where" line above the price.
 *
 * Upper case and letterspaced to keep this line subordinate to the price. It
 * shrinks before it truncates: losing the province is worse than losing two
 * points of type size.
 *
 * The place comes from `buildPlace`, which is what keeps "Santo Domingo de los
 * Tsáchilas, Santo Domingo de los Tsáchilas" — a real listing, and a line that
 * used to run off the frame and get cut mid-province — from ever being drawn.
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
  const text = [getPropertyTypeLabel(property.property_type), buildPlace(property)]
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

/** The price, at the one size on the lamina nothing else is allowed to reach. */
function PriceLine({ price, base, min }: { price: string; base: number; min: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: fitSize(price, base, 13, min),
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: -2,
        color: '#FFFFFF',
      }}
    >
      {price}
    </div>
  );
}

/** The listing's own words, kept quiet: proof that a person wrote this. */
function TitleLine({ title, fontSize }: { title: string; fontSize: number }) {
  if (!title) return null;
  return (
    <div style={{ display: 'flex', fontSize, lineHeight: 1.24, color: 'rgba(255,255,255,0.56)' }}>
      {title}
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
      {facts.slice(0, 3).map((fact) => (
        <div
          key={fact}
          style={{
            display: 'flex',
            padding: `${Math.round(fontSize * 0.34)}px ${Math.round(fontSize * 0.62)}px`,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.11)',
            fontSize,
            color: 'rgba(255,255,255,0.88)',
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

/**
 * The dark ramp under the floating card.
 *
 * The card is opaque, so nothing depends on this for legibility — it is there
 * so the card lands on something instead of hovering over a bright kitchen. It
 * ends short of full navy on purpose: the photograph is meant to stay visible
 * around the card's edges, which is the whole point of letting it float.
 */
function PanelRamp({ height }: { height: number }) {
  return (
    <div
      style={{
        display: 'flex',
        height,
        backgroundImage:
          `linear-gradient(180deg, rgba(${NAVY_RGB},0) 0%, rgba(${NAVY_RGB},0.20) 48%,` +
          ` rgba(${NAVY_RGB},0.52) 100%)`,
      }}
    />
  );
}

/** The wash behind the top row, kept short so it never reads as a bar. */
function TopScrim({ height }: { height: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        display: 'flex',
        height,
        backgroundImage:
          `linear-gradient(180deg, rgba(${NAVY_RGB},0.68) 0%, rgba(${NAVY_RGB},0.28) 55%,` +
          ` rgba(${NAVY_RGB},0) 100%)`,
      }}
    />
  );
}

/** Status on the left, brand on the right: the same row on every lamina. */
function TopRow({
  property,
  tile,
  fontSize,
  padding,
  badge,
}: {
  property: Property;
  tile: string;
  fontSize: number;
  padding: string;
  badge?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 20,
        padding,
      }}
    >
      {badge ?? <StatusChip property={property} fontSize={fontSize} />}
      <BrandPill tile={tile} fontSize={fontSize} />
    </div>
  );
}

// --- The map lamina -------------------------------------------------------

/**
 * Tiles, plot outline and pin, with the attribution baked in.
 *
 * The attribution is not decoration: it is the condition under which the portal
 * may use these tiles at all, and a downloaded PNG has no map control to print
 * it. SOC-006. It sits in the card's footer band, next to the address, because
 * that band is the one part of the lamina nobody crops.
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
  const place = clamp(buildPlace(property), 34) || 'Ecuador';
  const facts = buildFacts(property);

  const MARGIN = 40;
  const CARD_BODY = 190;

  const card = (
    <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: MARGIN, display: 'flex' }}>
      <InfoCard
        style={{ width: width - MARGIN * 2 }}
        footer={
          <>
            <div style={{ display: 'flex', fontSize: 17, color: 'rgba(255,255,255,0.6)' }}>
              {ATTRIBUTION}
            </div>
            <VerifyLine code={code} fontSize={19} variant="inline" />
          </>
        }
      >
        <SurveyLine property={property} height={CARD_BODY - 68} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginLeft: 22,
            maxWidth: width - MARGIN * 2 - 76 - STRIPE - 22 - qrSize - 24 - 30,
          }}
        >
          {/* Only the type, not `Eyebrow`: the place is the headline right
              below, and printing it twice reads as a bug. */}
          <div
            style={{
              display: 'flex',
              fontSize: 23,
              fontWeight: 800,
              letterSpacing: 2.4,
              color: accentColor(property),
            }}
          >
            {getPropertyTypeLabel(property.property_type).toUpperCase()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: fitSize(place, 58, 18, 34),
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1,
              color: '#FFFFFF',
            }}
          >
            {place}
          </div>
          <div style={{ display: 'flex', fontSize: fitSize(price, 30, 24, 21), color: FOG }}>
            {price}
          </div>
          <EditorialFacts facts={facts} fontSize={19} />
        </div>
        <div style={{ display: 'flex', marginLeft: 'auto' }}>
          <QrCard qr={qr} size={qrSize} />
        </div>
      </InfoCard>
    </div>
  );

  // Without coordinates there is no map to draw, and inventing a location is
  // the one thing a map lamina must never do. What is left is the branded
  // lamina, built out of the same parts as the photo formats rather than as a
  // one-off: a listing that is missing its coordinates should look like a
  // decision, not like a render that gave up halfway.
  if (!point) {
    return (
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
        <PhotoLayer photo={null} width="100%" height={height} tile={tile} />
        <TopRow property={property} tile={tile} fontSize={24} padding="40px 44px" />
        {card}
      </div>
    );
  }

  // The card covers the bottom of the frame, so the frame is not what the plot
  // has to fit into. Both the zoom and the centre are computed against the band
  // that stays visible, which is what keeps a plot from being framed perfectly
  // and then hidden behind the card.
  const COVERED = CARD_BODY + 62 + MARGIN;
  const visible = height - COVERED - 120;

  const zoom = fitZoom(outline, width, visible);
  const mosaic = buildMosaic(shiftCenter(point, zoom, 0, COVERED / 2 - 40), zoom, width, height);
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

      <TopScrim height={190} />
      <TopRow property={property} tile={tile} fontSize={24} padding="40px 44px" />

      {card}
    </div>
  );
}

// --- The photo laminas ----------------------------------------------------

/**
 * Square and 4:5: one decisive photograph and one commercial reading path.
 *
 * The photograph is full bleed and the card floats over its bottom edge with a
 * margin all the way round. That margin is the difference between an image that
 * looks composed and one that looks like a screenshot with a bar stuck to it,
 * and it costs nothing: the card is as tall as its content and no taller, so
 * the picture keeps every pixel the type does not need.
 *
 * The reading path is fixed and the same on every format: what and where, then
 * the price, then the proof, then — in the footer band — the argument and the
 * address. Secondary photographs belong in the listing and in future carousel
 * frames, not in the cover. SOC-013.
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
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const facts = buildFacts(property);
  const price = buildPriceLine(property);
  const title = withTitle ? listingTitle(property, 58) : '';

  const MARGIN = 40;
  const cardWidth = width - MARGIN * 2;
  const body = withTitle ? 224 : 186;
  const textWidth = cardWidth - 76 - STRIPE - 22 - qrSize - 24 - 30;

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <PhotoLayer photo={photo} width="100%" height={height} tile={tile} />

      <TopScrim height={200} />
      <TopRow property={property} tile={tile} fontSize={withTitle ? 24 : 23} padding="38px 40px" />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelRamp height={body + 62 + MARGIN + 90} />
      </div>

      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: MARGIN, display: 'flex' }}>
        <InfoCard
          style={{ width: cardWidth }}
          footer={
            <>
              <SalesCallout property={property} fontSize={20} message={message} maxChars={32} />
              <VerifyLine code={code} fontSize={20} variant="inline" />
            </>
          }
        >
          <SurveyLine property={property} height={body - 68} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginLeft: 22, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={22} maxChars={34} />
            <PriceLine price={price} base={withTitle ? 94 : 88} min={38} />
            <EditorialFacts facts={facts} fontSize={21} />
            <TitleLine title={title} fontSize={20} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

/**
 * 9:16: an editorial cover kept clear of the platform's top and bottom chrome.
 *
 * The card is lifted well off the bottom edge because the last ~250px of a
 * story sit under the app's own reply bar on every phone, and the address is
 * the one thing on the lamina that must never end up under it.
 */
async function storyLamina(property: Property, qr: string, code: string, qrSize: number, message?: string) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const facts = buildFacts(property);
  const price = buildPriceLine(property);
  const title = listingTitle(property, 62);

  const WIDTH = 1080;
  const MARGIN = 52;
  const SAFE_BOTTOM = 230;
  const body = 268;
  const cardWidth = WIDTH - MARGIN * 2;
  const textWidth = cardWidth - 84 - STRIPE - 24 - qrSize - 24 - 32;

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <PhotoLayer photo={photo} width="100%" height={1920} tile={tile} />

      <TopScrim height={300} />
      <TopRow property={property} tile={tile} fontSize={26} padding="64px 52px" />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelRamp height={body + 66 + SAFE_BOTTOM + 120} />
      </div>

      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: SAFE_BOTTOM, display: 'flex' }}>
        <InfoCard
          style={{ width: cardWidth }}
          padding="40px 42px"
          footerPadding="20px 42px"
          footer={
            <>
              <SalesCallout property={property} fontSize={22} message={message} maxChars={30} />
              <VerifyLine code={code} fontSize={22} variant="inline" />
            </>
          }
        >
          <SurveyLine property={property} height={body - 80} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginLeft: 24, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={25} maxChars={30} />
            <PriceLine price={price} base={104} min={44} />
            <EditorialFacts facts={facts} fontSize={23} />
            <TitleLine title={title} fontSize={21} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} />
          </div>
        </InfoCard>
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
  const title = listingTitle(property, 74);

  const PHOTO_WIDTH = 476;
  const EDGE = 7;
  const PANEL_WIDTH = 1200 - PHOTO_WIDTH - EDGE;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <div style={{ display: 'flex', position: 'relative', width: PHOTO_WIDTH, height: '100%' }}>
        <PhotoLayer photo={photo} width={PHOTO_WIDTH} height={630} tile={tile} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            height: 150,
            backgroundImage: `linear-gradient(180deg, rgba(${NAVY_RGB},0) 0%, rgba(${NAVY_RGB},0.62) 100%)`,
          }}
        />
        <div style={{ position: 'absolute', left: 30, bottom: 30, display: 'flex' }}>
          <StatusChip property={property} fontSize={21} />
        </div>
      </div>

      {/* A hard accent edge instead of a soft seam: at link-card size a gradient
          between photo and panel just reads as a compression artefact. */}
      <div style={{ display: 'flex', width: EDGE, height: '100%', backgroundColor: accentColor(property) }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: PANEL_WIDTH,
          padding: '34px 40px 32px',
          backgroundColor: NAVY,
        }}
      >
        <BrandRow tile={tile} fontSize={22} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <SurveyLine property={property} height={196} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: PANEL_WIDTH - 80 - STRIPE - 20 }}>
            <Eyebrow property={property} fontSize={20} maxChars={34} />
            <PriceLine price={price} base={62} min={30} />
            {title ? (
              <div style={{ display: 'flex', fontSize: 23, lineHeight: 1.26, color: 'rgba(255,255,255,0.82)' }}>
                {title}
              </div>
            ) : null}
            <FactChips facts={facts} fontSize={19} />
            <SalesCallout property={property} fontSize={19} message={message} maxChars={38} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <VerifyLine code={code} fontSize={19} />
          <QrCard qr={qr} size={qrSize} />
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
 * lets whoever sees it in November judge for themselves. It sits in the footer
 * band, on the same line as the address: both are there to be checked.
 *
 * The status chip gives up its corner to the amber badge. A lamina can carry
 * one piece of news, and on this one the news is not that the listing is for
 * sale.
 */
async function priceDropLamina(
  property: Property,
  drop: PriceDrop,
  qr: string,
  code: string,
  qrSize: number,
  width: number,
  height: number
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);

  const MARGIN = 40;
  const cardWidth = width - MARGIN * 2;
  const body = 244;
  const textWidth = cardWidth - 76 - STRIPE - 22 - qrSize - 24 - 30;

  const badge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          padding: '13px 24px',
          borderRadius: 999,
          backgroundColor: AMBER,
          color: NAVY,
          fontSize: 27,
          fontWeight: 800,
          letterSpacing: 2,
          boxShadow: '0 10px 26px rgba(15,16,32,0.34)',
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
            padding: '13px 22px',
            borderRadius: 999,
            backgroundColor: 'rgba(15,16,32,0.72)',
            color: AMBER,
            fontSize: 27,
            fontWeight: 800,
          }}
        >
          −{drop.percent}%
        </div>
      ) : null}
    </div>
  );

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <PhotoLayer photo={photo} width="100%" height={height} tile={tile} />

      <TopScrim height={210} />
      <TopRow property={property} tile={tile} fontSize={24} padding="38px 40px" badge={badge} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelRamp height={body + 62 + MARGIN + 90} />
      </div>

      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: MARGIN, display: 'flex' }}>
        <InfoCard
          style={{ width: cardWidth }}
          footer={
            <>
              <div style={{ display: 'flex', fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>
                Precio actualizado el {drop.changedLabel}
              </div>
              <VerifyLine code={code} fontSize={20} variant="inline" />
            </>
          }
        >
          <div style={{ display: 'flex', width: STRIPE, height: body - 68, borderRadius: 999, backgroundColor: AMBER }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginLeft: 22, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={22} maxChars={32} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, letterSpacing: 2.6, color: 'rgba(255,255,255,0.5)' }}>
                ANTES
              </div>
              <div style={{ display: 'flex', position: 'relative' }}>
                <div style={{ display: 'flex', fontSize: 36, color: 'rgba(255,255,255,0.56)' }}>
                  {drop.previousLabel}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: -6,
                    right: -6,
                    top: 20,
                    height: 3,
                    backgroundColor: 'rgba(255,255,255,0.56)',
                  }}
                />
              </div>
            </div>

            <PriceLine price={drop.currentLabel} base={98} min={44} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} />
          </div>
        </InfoCard>
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
 * The stamp is set in type rather than dropped into a coloured plate. A slab
 * of green with a word in it is a sticker; the same word at 140 points over a
 * darkened photograph, with the survey line drawn under it, is a poster — and
 * the scrim already does everything the plate was there to do for contrast.
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
  width: number,
  height: number
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property)]);
  const stamp = CLOSURE_STAMP[closure];
  const when = closureLabel(property);
  const accent = closure === 'rented' ? AQUA : MINT;
  const subject = clamp(
    [getPropertyTypeLabel(property.property_type), buildPlace(property)]
      .filter(Boolean)
      .join(' · ')
      .toUpperCase(),
    38
  );

  const MARGIN = 40;
  const cardWidth = width - MARGIN * 2;
  const body = 168;

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
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
            `linear-gradient(180deg, rgba(${NAVY_RGB},0.80) 0%, rgba(${NAVY_RGB},0.60) 42%,` +
            ` rgba(${NAVY_RGB},0.94) 100%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          // Optically centred in the band the card leaves free, measured from
          // the top: Satori resolves `top` against the parent and there is no
          // vertical centring to lean on here.
          top: Math.round((height - body - 40 - MARGIN) / 2) - 148,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          padding: '0 60px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: 4, color: accent }}>
          {subject}
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: fitSize(stamp, 148, 8, 96),
            fontWeight: 800,
            letterSpacing: 4,
            lineHeight: 1.08,
            color: PAPER,
          }}
        >
          {stamp}
        </div>

        <div style={{ display: 'flex', width: 140, height: 8, borderRadius: 999, backgroundColor: accent }} />

        {when ? (
          <div style={{ display: 'flex', fontSize: 29, letterSpacing: 1, color: 'rgba(255,255,255,0.82)' }}>
            {when}
          </div>
        ) : null}
      </div>

      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: MARGIN, display: 'flex' }}>
        <InfoCard style={{ width: cardWidth }} padding="30px 38px">
          {/* The mark is bigger here than on any other lamina, because on this
              one it is the message rather than the signature. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <BrandRow tile={tile} fontSize={32} />
            <VerifyLine code={code} fontSize={22} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} />
          </div>
        </InfoCard>
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
  const customMessage = plainText(request.nextUrl.searchParams.get('mensaje')).slice(0, 72) || undefined;
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
    element = await priceDropLamina(property, drop!, qr, code, qrSize, spec.width, spec.height);
  } else if (format === 'sold') {
    element = await soldLamina(property, closure!, qr, code, qrSize, spec.width, spec.height);
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
