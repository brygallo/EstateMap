/**
 * The promotion laminas: one route, eight formats.
 *
 * Six of them describe a listing and can always be drawn. Two — `price-drop`
 * and `sold` — assert that something happened to it, and the route refuses to
 * draw them when it did not: see the guard in `GET`. SOC-102. The carousel is
 * the one format that is not a single image; how many frames a listing actually
 * gets is `carouselFrames`, and asking for one past that is the same 404 for
 * the same reason.
 *
 * Public on purpose. A lamina's whole job is to be fetched by Facebook for a
 * link preview, served by Instagram and looked at by strangers, so putting a
 * session in front of it would break the only use it has. It costs nothing to
 * open because SOC-001 keeps everything private off the image: what is drawn
 * here is what the public listing already shows.
 *
 * Runs on the Node runtime rather than the edge because it reads the brand mark
 * off disk and does real work on the photographs with sharp.
 *
 * Three constraints shape every decision below, and none is negotiable:
 *
 * 1. These images are forwarded through WhatsApp, which recompresses them.
 *    Thin type over a photograph, low-contrast gradients and hairlines are the
 *    first things to die. Text therefore sits on solid panels, not on washes.
 * 2. Satori does not synthesise font weights, and it will not say what it
 *    measured. The route registers the two real faces and reads their advance
 *    widths itself, so every fit below is arithmetic rather than a guess about
 *    how wide a character usually is. See `lib/text-metrics.ts`.
 * 3. The strings come from listings somebody typed and from importers that
 *    shout: emoji Satori cannot draw, titles in block capitals, a city that
 *    repeats its own province. `plainText`, `softenShouting` and `buildPlace`
 *    clean all three before a single glyph is placed — an image outlives the
 *    correction, so it has to be right the first time.
 *
 * The composition is one idea repeated across every format: a full-bleed
 * photograph, cut to that format's exact shape and graded to its own histogram,
 * and a single floating card that carries the whole commercial argument.
 * Everything a reader needs is inside one rounded panel — price first, proof
 * second, address and QR last — and the photograph is never cut in half by a
 * bar. See `InfoCard`.
 *
 * Two tones, not one. Most laminas are drawn on navy, but the 4:5 — the format
 * Instagram gives the most screen to — is drawn on paper with navy type, which
 * is the same information printed rather than lit. Seven identical dark cards
 * is a template; the same seven with a printed edition among them is a kit. See
 * `NIGHT` and `DAYLIGHT`.
 */

/* eslint-disable @next/next/no-img-element --
   Satori consumes a raw element tree and rasterises it; `next/image` has no
   meaning inside an ImageResponse, where there is no browser, no layout pass
   and no srcset to negotiate. */

import { createHash } from 'node:crypto';
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
  LAMINA_MIME,
  LAMINA_REVISION,
  SOCIAL_FORMATS,
  buildArtworkHeadline,
  buildFacts,
  buildPlace,
  buildPriceLine,
  carouselFrames,
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
import {
  fitToWidth,
  measureText,
  readFontMetrics,
  truncateToWidth,
  type FontMetrics,
} from '@/lib/text-metrics';
import type { Property } from '@/lib/types';

export const runtime = 'nodejs';

const tokens = aentsTokens.light;
const NAVY = tokens['--navy'];
const GREEN = tokens['--primary-strong'];
const TEAL = tokens['--accent-alt-strong'];
/** The same two hues at full saturation: legible as type on navy, unlike the
 *  `-strong` pair, which is tuned for white text sitting on top of it. */
const MINT = tokens['--primary'];
const AQUA = tokens['--teal'];

/** The one hue in the system that reads as "tag", for the price-drop badge. */
const AMBER = tokens['--amber'];
/** Warm paper: the ground of the printed edition, and of the sold stamp. */
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
 * A card's whole colour scheme, resolved once and handed down.
 *
 * Every piece that draws type takes one of these instead of hard-coding white,
 * which is what makes the printed edition possible at all: the same `Eyebrow`,
 * the same price, the same address, on cream instead of navy, without a second
 * copy of the layout to keep in sync.
 *
 * `sale` and `rent` belong to the tone rather than to the module because an
 * accent has to earn its contrast against the ground it sits on. `#22C55E` is
 * bright on navy and nearly invisible on cream; `#16A34A` is the reverse.
 */
type CardTone = {
  ground: string;
  /** Painted over `ground` to lift its top edge. Omitted on paper. */
  sheen?: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** The footer band, one step off the ground. */
  band: string;
  /** The hairline along the card's very top edge. */
  edge: string;
  qrTile: string;
  qrBorder: string;
  sale: string;
  rent: string;
};

const NIGHT: CardTone = {
  ground: NAVY,
  sheen: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0) 58%)',
  ink: '#FFFFFF',
  inkSoft: 'rgba(255,255,255,0.74)',
  inkFaint: 'rgba(255,255,255,0.52)',
  band: 'rgba(255,255,255,0.07)',
  edge: 'rgba(255,255,255,0.12)',
  qrTile: '#FFFFFF',
  qrBorder: 'rgba(15,16,32,0)',
  sale: MINT,
  rent: AQUA,
};

const DAYLIGHT: CardTone = {
  ground: PAPER,
  ink: NAVY,
  inkSoft: 'rgba(15,16,32,0.66)',
  inkFaint: 'rgba(15,16,32,0.46)',
  band: 'rgba(15,16,32,0.055)',
  edge: 'rgba(255,255,255,0.55)',
  qrTile: '#FFFFFF',
  qrBorder: 'rgba(15,16,32,0.08)',
  sale: GREEN,
  rent: TEAL,
};

function accentOn(property: Property, tone: CardTone): string {
  return property.status === 'for_rent' ? tone.rent : tone.sale;
}

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
  feed: 124,
  portrait: 136,
  story: 164,
  map: 134,
  og: 102,
  carousel: 136,
  'price-drop': 144,
  sold: 144,
};

type PhotoBox = { width: number; height: number };

/**
 * The exact frame each format wants its photograph cut to.
 *
 * Handing sharp the final shape is what replaced a centre crop with a framed
 * one: see `renderPhoto`. `map` is absent because that lamina draws tiles, and
 * the branded lamina it falls back to draws no photograph at all.
 */
const PHOTO_BOX: Partial<Record<SocialFormat, PhotoBox>> = {
  feed: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  og: { width: 476, height: 630 },
  carousel: { width: 1080, height: 1350 },
  'price-drop': { width: 1080, height: 1350 },
  sold: { width: 1080, height: 1350 },
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
 * The two faces, read once and used for two different things.
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
 */
let faceFilesPromise: Promise<{ regular: Buffer; extraBold: Buffer } | null> | null = null;
function faceFiles() {
  if (!faceFilesPromise) {
    faceFilesPromise = Promise.all([
      readFile(path.join(process.cwd(), 'public', 'fonts', 'PlusJakartaSans-Regular.ttf')),
      readFile(path.join(process.cwd(), 'public', 'fonts', 'PlusJakartaSans-ExtraBold.ttf')),
    ])
      .then(([regular, extraBold]) => ({ regular, extraBold }))
      .catch(() => null);
  }
  return faceFilesPromise;
}

/**
 * The faces handed to Satori.
 *
 * Satori does not synthesise weights: it registers the faces it is handed and
 * picks the nearest one, so a `fontWeight: 800` with only a regular loaded is a
 * decoration. Two static faces are therefore the whole difference between a
 * price that looks like a price and one that looks like a caption.
 *
 * Falling back to `undefined` rather than throwing, for the same reason
 * `brandTile` swallows its error: an unreadable font is a plainer lamina, and a
 * 500 is no lamina at all. `undefined` and not `[]` — an empty list is not "no
 * preference", it is "no fonts", and Satori answers it with "No fonts are
 * loaded. At least one font is required to calculate the layout." Omitting the
 * option is what leaves `next/og` free to use the Geist face it bundles.
 */
type PromotionFont = { name: string; data: Buffer; weight: 400 | 800 };
async function promotionFonts(): Promise<PromotionFont[] | undefined> {
  const files = await faceFiles();
  if (!files) return undefined;
  return [
    { name: 'Plus Jakarta Sans', data: files.regular, weight: 400 },
    { name: 'Plus Jakarta Sans', data: files.extraBold, weight: 800 },
  ];
}

/**
 * The advance widths of those same two faces.
 *
 * Process-wide constants — the fonts never change — so they live in a module
 * variable rather than being threaded through fifteen components as a prop.
 * `GET` resolves them before it builds a single element; until then, and if the
 * files cannot be parsed, every measurement falls back to the per-character
 * estimate in `lib/text-metrics.ts`, which is worse but never blank.
 */
let FACES: { body: FontMetrics | null; display: FontMetrics | null } = {
  body: null,
  display: null,
};
let metricsPromise: Promise<void> | null = null;
function loadMetrics(): Promise<void> {
  if (!metricsPromise) {
    metricsPromise = faceFiles().then((files) => {
      if (!files) return;
      FACES = { body: readFontMetrics(files.regular), display: readFontMetrics(files.extraBold) };
    });
  }
  return metricsPromise;
}

// --- Photographs -----------------------------------------------------------

/**
 * A listing photograph, fetched and decoded once.
 *
 * Every format wants the same picture in a different shape, and a burst of
 * scrapers on a freshly posted link wants it again a second later. Pulling it
 * out of the object store and decoding a four-megapixel JPEG for each of those
 * is the most expensive thing this route does and the easiest to stop doing:
 * the master is kept, and only the per-format crop is recomputed.
 *
 * The grade travels with it because it is derived from the same statistics, and
 * those cost a full decode to measure.
 */
type PhotoMaster = {
  data: Buffer;
  grade: { contrast: number; lift: number; saturation: number };
  /** Only ever compared against another frame of the same listing. */
  score: number;
  usable: boolean;
};

/**
 * Small on purpose. Each entry is a JPEG of at most 1920px — a couple of
 * hundred kilobytes — and this process shares eight gigabytes with the rest of
 * the stack. Twelve is one listing's whole carousel plus the last one somebody
 * looked at.
 */
const MASTER_LIMIT = 12;
const masters = new Map<string, Promise<PhotoMaster | null>>();

/**
 * What the grade does to one photograph, decided by that photograph.
 *
 * A fixed curve is the wrong tool here: the inventory is half phone snaps taken
 * against the sky and half interiors shot in the dark, and the same +6% of
 * contrast either rescues one or blows out the other. This aims the midpoint at
 * 128 and the spread at 58, clamped hard on both sides — a grade, not a filter.
 * The house has to look like itself when somebody arrives at the door.
 */
function gradeFor(mean: number, stdev: number) {
  const lift = Math.max(-14, Math.min(20, (128 - mean) * 0.42));
  const contrast = Math.max(1, Math.min(1.16, 1 + (58 - stdev) * 0.004));
  // A flat photograph is usually flat in colour too; a vivid one needs nothing.
  const saturation = stdev < 50 ? 1.1 : stdev > 70 ? 1.02 : 1.06;
  return { contrast, lift, saturation };
}

/**
 * Whether a frame is fit to be the face of a listing.
 *
 * Deliberately a rejection test and not a beauty contest. Ranking photographs
 * by exposure and detail sounds better than it is: on a listing it reliably
 * promotes a well-lit bathroom over a backlit façade, and the façade is the
 * picture that tells somebody what is being sold. What can be judged without
 * understanding the subject is whether a frame is usable at all — a black
 * rectangle, a blown white one, a smear — and that is all this decides.
 */
function isUsable(mean: number, stdev: number, sharpness: number): boolean {
  return mean > 45 && mean < 225 && stdev > 12 && sharpness > 0.35;
}

async function photoMaster(source?: string): Promise<PhotoMaster | null> {
  if (!source?.startsWith('http')) return null;

  const cached = masters.get(source);
  if (cached) return cached;

  const pending = (async (): Promise<PhotoMaster | null> => {
    try {
      // Imported here rather than at the top of the module so that a build
      // without a usable native binary degrades to the branded lamina instead
      // of failing the route outright. sharp is declared as a direct
      // dependency, but it ships as platform-specific binaries and an install
      // can skip one.
      const { default: sharp } = await import('sharp');

      const response = await fetch(source);
      if (!response.ok) return null;
      const data = await sharp(Buffer.from(await response.arrayBuffer()))
        .rotate() // Honour EXIF orientation; phone photos arrive sideways otherwise.
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 92 })
        .toBuffer();

      const stats = await sharp(data).stats();
      const channels = stats.channels.slice(0, 3);
      const mean = channels.reduce((total, channel) => total + channel.mean, 0) / channels.length;
      const stdev = channels.reduce((total, channel) => total + channel.stdev, 0) / channels.length;
      const sharpness = stats.sharpness ?? 1;
      const entropy = stats.entropy ?? 7;

      return {
        data,
        grade: gradeFor(mean, stdev),
        score:
          0.45 * (1 - Math.min(1, Math.abs(mean - 128) / 90)) +
          0.35 * Math.max(0, Math.min(1, (entropy - 6) / 2)) +
          0.2 * Math.min(1, sharpness / 3),
        usable: isUsable(mean, stdev, sharpness),
      };
    } catch {
      return null;
    }
  })();

  masters.set(source, pending);
  // A failure must not be remembered: the object store being briefly down is no
  // reason to draw the branded lamina for the rest of this process's life.
  void pending.then((value) => {
    if (!value) masters.delete(source);
  });
  while (masters.size > MASTER_LIMIT) {
    const oldest = masters.keys().next().value;
    if (oldest === undefined) break;
    masters.delete(oldest);
  }
  return pending;
}

/** How many frames are inspected before settling on a cover. */
const CANDIDATES = 4;
/** How much better a later frame has to be before it displaces the first. */
const DISPLACE_MARGIN = 0.25;

/**
 * The listing's photographs, in the order they should be drawn, decoded once.
 *
 * The order a listing arrives in is mostly right: the first frame is the façade
 * on an imported listing and the one the owner picked on a published one, and
 * neither is a coincidence worth overriding. So the order is kept, and only two
 * things move it:
 *
 * - An unusable frame is dropped. A cover that is a black rectangle is the one
 *   failure that is never a matter of taste.
 * - A frame that beats the first by a wide margin takes its place. The margin
 *   is wide precisely so this fires on "the first one is a dark blur and the
 *   third is a proper exterior" and never on two decent photographs.
 */
async function chooseMasters(property: Property, limit: number): Promise<PhotoMaster[]> {
  const images = property.images ?? [];
  const ordered = [...images].sort((a, b) => Number(Boolean(b.is_main)) - Number(Boolean(a.is_main)));
  const pool = ordered.slice(0, Math.max(limit, CANDIDATES));

  const loaded = (await Promise.all(pool.map((image) => photoMaster(image.image)))).filter(
    (master): master is PhotoMaster => Boolean(master)
  );
  if (loaded.length === 0) return [];

  const usable = loaded.filter((master) => master.usable);
  // Everything failed the test, which means the test is not the useful signal
  // here — a listing photographed at dusk is still that listing. Draw it.
  const candidates = usable.length > 0 ? usable : loaded;

  const best = candidates.reduce((top, master) => (master.score > top.score ? master : top));
  if (best !== candidates[0] && best.score - candidates[0].score > DISPLACE_MARGIN) {
    return [best, ...candidates.filter((master) => master !== best)].slice(0, limit);
  }
  return candidates.slice(0, limit);
}

/**
 * One master, cut and graded into the shape a format asked for.
 *
 * The crop is made with sharp's attention strategy — it keeps the region of
 * highest entropy, which on a listing photograph is the building rather than
 * the sky. Leaving it to `object-fit: cover` meant a centre crop against a
 * frame the photo had never been composed for, and a 9:16 story cut out of a
 * landscape photograph lost the house on both sides.
 *
 * The re-encode is not an optimisation, it is the only way the photo appears at
 * all: the image pipeline stores every upload as WebP, and Satori cannot decode
 * WebP — it fails the whole render with "Unsupported image type".
 */
async function renderPhoto(master: PhotoMaster, box: PhotoBox): Promise<string | null> {
  try {
    const { default: sharp } = await import('sharp');
    const jpeg = await sharp(master.data)
      .resize(box.width, box.height, { fit: 'cover', position: sharp.strategy.attention })
      .linear(master.grade.contrast, master.grade.lift)
      .modulate({ saturation: master.grade.saturation })
      .sharpen({ sigma: 0.7 })
      .jpeg({ quality: 86, chromaSubsampling: '4:4:4' })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Up to `limit` photographs, ready to draw.
 *
 * Keeps a null in place of a photograph that could not be prepared rather than
 * dropping it, so a carousel keeps its frame numbering and falls back to the
 * branded ground on the one frame that failed. SOC-004.
 */
async function marketingPhotos(
  property: Property,
  box: PhotoBox,
  limit = 3
): Promise<(string | null)[]> {
  const chosen = await chooseMasters(property, limit);
  return Promise.all(chosen.map((master) => renderPhoto(master, box)));
}

async function mainPhoto(property: Property, box: PhotoBox): Promise<string | null> {
  return (await marketingPhotos(property, box, 1))[0] ?? null;
}

/** Dark enough to carry white text on top of it. */
function statusChipColor(property: Property): string {
  return property.status === 'for_rent' ? TEAL : GREEN;
}

/** Bright enough to be read as type over a darkened photograph. */
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
      // written the way they are written: "3", "142 m²", "II".
      if (/\d/.test(word)) return word.toLowerCase().replace(/m²/g, 'm²');
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower.replace(/[^\p{L}]/gu, ''))) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

type Box = { size: number; min?: number; width: number; tracking?: number; bold?: boolean };

/** The face a piece of type is actually set in, so it is measured in that one. */
function faceFor(bold?: boolean): FontMetrics | null {
  return bold ? FACES.display : FACES.body;
}

/**
 * The largest size that keeps a string inside its box.
 *
 * Satori does not truncate and does not wrap where there is no opportunity: a
 * string wider than its box runs off the frame and is guillotined by the edge
 * of the raster. Every value that comes from a listing is therefore fitted or
 * cut here, against the width it actually has rather than a character budget.
 */
function fit(text: string, { size, min, width, tracking = 0, bold }: Box): number {
  return fitToWidth(text, {
    font: faceFor(bold),
    fontSize: size,
    letterSpacing: tracking,
    width,
    min: min ?? Math.round(size * 0.6),
  });
}

/** The same string, cut to the box, with an ellipsis when anything was dropped. */
function cut(text: string, { size, width, tracking = 0, bold }: Omit<Box, 'min'>): string {
  return truncateToWidth(plainText(text), {
    font: faceFor(bold),
    fontSize: size,
    letterSpacing: tracking,
    width,
  });
}

/** How wide a string will be drawn, for the rows that have to be shared. */
function span(text: string, { size, tracking = 0, bold }: Omit<Box, 'min' | 'width'>): number {
  return measureText(text, { font: faceFor(bold), fontSize: size, letterSpacing: tracking });
}

/** The listing's own words, cleaned, calmed and cut to its box. */
function listingTitle(property: Property, box: Omit<Box, 'min'>): string {
  return cut(softenShouting(plainText(property.title)), box);
}

// --- Shared pieces --------------------------------------------------------

/**
 * The QR, on its own tile, with the brand mark set into the middle of it.
 *
 * The mark is not decoration. A bare code is an anonymous black square that
 * could take you anywhere, and pointing a phone at one is an act of trust; the
 * same square with a known mark at its centre is a code from somebody.
 *
 * The badge is 24% of the code's width, so it covers under six per cent of its
 * area, against the thirty per cent that the level H the encoder uses is
 * specified to survive. That margin is the whole justification for putting
 * anything on top of a QR at all: grow the badge and the budget goes with it.
 *
 * `route.test.ts` decodes the rendered image, as drawn and after a hard
 * recompression, which is what turns that budget into something enforced rather
 * than asserted. There is a lot of headroom at 24% — the decode only starts
 * failing somewhere past half the width — so the tests are a floor, not a
 * licence: this is a signature, and a mark that covers a third of a code has
 * stopped being one.
 *
 * The bare short code used to sit under the tile. It came out because an
 * identifier stranded in the artwork sells nothing on its own: read off a photo
 * it is five characters with nowhere to type them. What the fallback actually
 * needs is the address, and that is where it lives now — `VerifyLine` prints
 * the full `/p/<code>` path. SOC-002.
 */
function QrCard({
  qr,
  size,
  tile,
  tone = NIGHT,
}: {
  qr: string;
  size: number;
  tile?: string;
  tone?: CardTone;
}) {
  const PAD = 12;
  const badge = Math.round(size * 0.24);
  const mark = Math.round(size * 0.16);
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        padding: PAD,
        borderRadius: 20,
        backgroundColor: tone.qrTile,
        border: `1px solid ${tone.qrBorder}`,
      }}
    >
      {/* Drawn at the width it was encoded at; see QR_TARGET. */}
      <img src={qr} width={size} height={size} alt="" />
      {tile ? (
        <div
          style={{
            position: 'absolute',
            left: PAD + Math.round((size - badge) / 2),
            top: PAD + Math.round((size - badge) / 2),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: badge,
            height: badge,
            borderRadius: 7,
            backgroundColor: '#FFFFFF',
          }}
        >
          <img src={tile} width={mark} height={mark} alt="" />
        </div>
      ) : null}
    </div>
  );
}

function verifyAddress(code: string): string {
  return code ? `geopropiedadesecuador.com/p/${code}` : 'geopropiedadesecuador.com';
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
  tone = NIGHT,
}: {
  code: string;
  fontSize: number;
  variant?: 'stacked' | 'inline';
  tone?: CardTone;
}) {
  const address = verifyAddress(code);

  if (variant === 'inline') {
    return (
      <div style={{ display: 'flex', fontSize, fontWeight: 800, color: tone.ink }}>{address}</div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div
        style={{
          display: 'flex',
          fontSize: Math.round(fontSize * 0.78),
          letterSpacing: 1.6,
          color: tone.inkFaint,
        }}
      >
        ESCANEA EL QR O VISITA
      </div>
      <div style={{ display: 'flex', fontSize, fontWeight: 800, color: tone.ink }}>{address}</div>
    </div>
  );
}

function BrandRow({
  tile,
  fontSize,
  tone = NIGHT,
}: {
  tile: string;
  fontSize: number;
  tone?: CardTone;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {tile ? <img src={tile} width={fontSize * 1.65} height={fontSize * 1.65} alt="" /> : null}
      <div style={{ display: 'flex', fontSize, fontWeight: 800, letterSpacing: 0.2, color: tone.ink }}>
        Geo Propiedades Ecuador
      </div>
    </div>
  );
}

/**
 * The brand mark as it appears over a photograph rather than on a card.
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
  width,
  tone = NIGHT,
}: {
  property: Property;
  fontSize: number;
  message?: string;
  width: number;
  tone?: CardTone;
}) {
  const accent = accentOn(property, tone);
  const marker = 22; // the accent square and the gap after it
  const room = Math.max(80, width - marker);
  const headline = (message || buildArtworkHeadline(property)).toUpperCase();
  const size = fit(headline, {
    size: fontSize,
    min: Math.round(fontSize * 0.76),
    width: room,
    tracking: 1.6,
    bold: true,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 3, backgroundColor: accent }} />
      <div style={{ display: 'flex', fontSize: size, fontWeight: 800, letterSpacing: 1.6, color: accent }}>
        {cut(headline, { size, width: room, tracking: 1.6, bold: true })}
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
function SurveyLine({
  property,
  height,
  color,
  tone = NIGHT,
}: {
  property: Property;
  height: number;
  /** Overridden only by the price-drop lamina, whose news is amber, not the
   *  operation's colour. */
  color?: string;
  tone?: CardTone;
}) {
  return (
    <div
      style={{
        display: 'flex',
        width: STRIPE,
        height,
        borderRadius: 999,
        backgroundColor: color ?? accentOn(property, tone),
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
 * underneath. The ground is opaque rather than a wash for the reason at the top
 * of this file: type over a recompressed photograph is the first thing to go.
 *
 * Three layers make it a card rather than a rectangle: the ground, a sheen that
 * lifts its top third, and a hairline along the very top edge. All three are
 * broad and low in contrast, which is what survives recompression — the one
 * thing a card must not do is develop a visible seam halfway down.
 *
 * The footer is a band one step off the ground, and it is where the address and
 * the kicker live. Two bands beat six stacked lines: the eye reads the card as
 * price-then-proof instead of as a list.
 */
function InfoCard({
  children,
  footerLeft,
  footerRight,
  padding = '34px 38px',
  footerPadding = '18px 38px',
  tone = NIGHT,
  style,
}: {
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  padding?: string;
  footerPadding?: string;
  tone?: CardTone;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: CARD_RADIUS,
        backgroundColor: tone.ground,
        ...(tone.sheen ? { backgroundImage: tone.sheen } : {}),
        boxShadow: CARD_SHADOW,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 2,
          backgroundColor: tone.edge,
          borderTopLeftRadius: CARD_RADIUS,
          borderTopRightRadius: CARD_RADIUS,
        }}
      />
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', padding }}>{children}</div>
      {footerLeft || footerRight ? (
        <div
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: 28,
            padding: footerPadding,
            backgroundColor: tone.band,
            borderBottomLeftRadius: CARD_RADIUS,
            borderBottomRightRadius: CARD_RADIUS,
          }}
        >
          {footerLeft}
          {/* An auto margin rather than `space-between`: Satori honours the
              margin on a row whose width it already knows and quietly ignores
              the justification, which is how the kicker ended up welded to the
              address. */}
          <div style={{ display: 'flex', marginLeft: 'auto' }}>{footerRight}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The declared attributes, set as figures rather than as a sentence.
 *
 * "216 m² · 198 m² construidos · 5 habitaciones" in a single weight is a
 * caption nobody reads. The number is the part that answers the question, so
 * the number carries the weight and the unit stays quiet beside it, with the
 * dot between groups instead of inside them.
 *
 * Groups are dropped from the end until the row fits, rather than each one
 * being cut short: "5 habitac…" tells nobody anything, and the third fact is
 * always the least important one on the lamina.
 */
function EditorialFacts({
  facts,
  fontSize,
  width,
  tone = NIGHT,
}: {
  facts: string[];
  fontSize: number;
  width: number;
  tone?: CardTone;
}) {
  const unitSize = Math.round(fontSize * 0.94);
  const groups = facts.slice(0, 3).map((fact) => {
    const [value, ...rest] = fact.split(' ');
    const unit = rest.join(' ');
    return {
      value,
      unit,
      width:
        span(value, { size: fontSize, bold: true }) + (unit ? span(unit, { size: unitSize }) + 5 : 0),
    };
  });

  const visible: typeof groups = [];
  let used = 0;
  for (const group of groups) {
    const cost = group.width + (visible.length ? 28 : 0); // the dot and its margins
    if (used + cost > width) break;
    visible.push(group);
    used += cost;
  }
  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {visible.map((group, index) => (
        <div key={group.value + group.unit} style={{ display: 'flex', alignItems: 'center' }}>
          {index > 0 ? (
            <div
              style={{
                display: 'flex',
                width: 4,
                height: 4,
                borderRadius: 999,
                margin: '0 12px',
                backgroundColor: tone.inkFaint,
              }}
            />
          ) : null}
          <div style={{ display: 'flex', fontSize, fontWeight: 800, color: tone.ink }}>
            {group.value}
          </div>
          {group.unit ? (
            <div style={{ display: 'flex', marginLeft: 5, fontSize: unitSize, color: tone.inkSoft }}>
              {group.unit}
            </div>
          ) : null}
        </div>
      ))}
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
  width,
  tone = NIGHT,
}: {
  property: Property;
  fontSize: number;
  width: number;
  tone?: CardTone;
}) {
  const text = [getPropertyTypeLabel(property.property_type), buildPlace(property)]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();
  const size = fit(text, {
    size: fontSize,
    min: Math.round(fontSize * 0.72),
    width,
    tracking: 2,
    bold: true,
  });
  return (
    <div
      style={{
        display: 'flex',
        // Bold now that there is a bold: at this size, letterspaced caps in the
        // regular face read as a whisper next to the price they introduce.
        fontSize: size,
        fontWeight: 800,
        letterSpacing: 2,
        color: accentOn(property, tone),
      }}
    >
      {cut(text, { size, width, tracking: 2, bold: true })}
    </div>
  );
}

/**
 * The price, at the one size on the lamina nothing else is allowed to reach.
 *
 * Set as a lockup rather than as a string. A dollar sign at the size of the
 * figure is a character competing with the number it qualifies, and "/mes" at
 * that size reads as part of the amount; both drop to about half and hang off
 * the figure, which is how a price is set anywhere it matters.
 *
 * Which is also why the lockup is measured as three pieces rather than fitted
 * as one string: fitting "$885.000" whole would shrink the figure to make room
 * for a symbol that is not drawn at that size, and the figure is the one thing
 * on the lamina that should be as large as its box allows.
 *
 * The plain branch is not a fallback so much as the honest answer for the
 * strings that are not a single figure — "Precio a consultar", or a listing
 * that is for sale and for rent at once and carries two.
 */
function PriceLine({
  price,
  base,
  min,
  width,
  tone = NIGHT,
}: {
  price: string;
  base: number;
  min: number;
  width: number;
  tone?: CardTone;
}) {
  const parts = price.match(/^\$([\d.,]+)(\/mes)?$/);

  if (!parts) {
    const size = fit(price, { size: base, min, width, bold: true });
    return (
      <div
        style={{
          display: 'flex',
          fontSize: size,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: -2,
          color: tone.ink,
        }}
      >
        {cut(price, { size, width, bold: true })}
      </div>
    );
  }

  const [, figure, suffix = ''] = parts;
  // Measured at one em, so the sum is "ems of lockup per em of figure".
  const ems =
    span('$', { size: 0.52, bold: true }) +
    span(figure, { size: 1, bold: true }) +
    (suffix ? span(suffix, { size: 0.38, bold: true }) : 0);
  const size = Math.max(min, Math.min(base, Math.floor(width / (ems || 1))));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', color: tone.ink }}>
      <div
        style={{
          display: 'flex',
          marginTop: Math.round(size * 0.1),
          marginRight: Math.round(size * 0.05),
          fontSize: Math.round(size * 0.52),
          fontWeight: 800,
          lineHeight: 1,
          color: tone.inkSoft,
        }}
      >
        $
      </div>
      <div style={{ display: 'flex', fontSize: size, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>
        {figure}
      </div>
      {suffix ? (
        <div
          style={{
            display: 'flex',
            marginTop: Math.round(size * 0.54),
            marginLeft: Math.round(size * 0.06),
            fontSize: Math.round(size * 0.38),
            fontWeight: 800,
            lineHeight: 1,
            color: tone.inkSoft,
          }}
        >
          {suffix}
        </div>
      ) : null}
    </div>
  );
}

/** The listing's own words, kept quiet: proof that a person wrote this. */
function TitleLine({
  title,
  fontSize,
  tone = NIGHT,
}: {
  title: string;
  fontSize: number;
  tone?: CardTone;
}) {
  if (!title) return null;
  return (
    <div style={{ display: 'flex', fontSize, lineHeight: 1.24, color: tone.inkFaint }}>{title}</div>
  );
}

/**
 * The declared attributes, one chip each.
 *
 * Only the link card uses these. There the panel is 700 pixels wide and the
 * facts have to sit under a title that has already wrapped, so a row that wraps
 * beats a line that either fits or runs off the frame.
 */
function FactChips({
  facts,
  fontSize,
  tone = NIGHT,
}: {
  facts: string[];
  fontSize: number;
  tone?: CardTone;
}) {
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
            color: tone.inkSoft,
          }}
        >
          {fact}
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
  const facts = buildFacts(property);

  const MARGIN = 40;
  const CARD_BODY = 190;
  const cardWidth = width - MARGIN * 2;
  const textWidth = cardWidth - 76 - STRIPE - 22 - qrSize - 24 - 30;
  // Fitted before it is cut, and in that order: a place name shrinks to fit its
  // box, and only what still does not fit gets an ellipsis. Cutting first threw
  // away half of "Santo Domingo de los Tsáchilas" at a size it never needed.
  const placeName = buildPlace(property) || 'Ecuador';
  const placeSize = fit(placeName, { size: 58, min: 34, width: textWidth, bold: true });
  const place = cut(placeName, { size: placeSize, width: textWidth, bold: true });

  const card = (
    <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: MARGIN, display: 'flex' }}>
      <InfoCard
        style={{ width: cardWidth }}
        footerLeft={
          <div style={{ display: 'flex', fontSize: 17, color: NIGHT.inkFaint }}>{ATTRIBUTION}</div>
        }
        footerRight={<VerifyLine code={code} fontSize={19} variant="inline" />}
      >
        <SurveyLine property={property} height={CARD_BODY - 68} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginLeft: 22, maxWidth: textWidth }}>
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
              fontSize: placeSize,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1,
              color: NIGHT.ink,
            }}
          >
            {place}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: fit(price, { size: 30, min: 21, width: textWidth }),
              color: NIGHT.inkSoft,
            }}
          >
            {price}
          </div>
          <EditorialFacts facts={facts} fontSize={19} width={textWidth} />
        </div>
        <div style={{ display: 'flex', marginLeft: 'auto' }}>
          <QrCard qr={qr} size={qrSize} tile={tile} />
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
    radius: outline.length >= 3 ? 24 : 34,
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
 * The photograph is full bleed, cut to this exact shape and graded to its own
 * histogram, and the card floats over its bottom edge with a margin all the way
 * round. That margin is the difference between an image that looks composed and
 * one that looks like a screenshot with a bar stuck to it, and it costs nothing:
 * the card is as tall as its content and no taller, so the picture keeps every
 * pixel the type does not need.
 *
 * The reading path is fixed and the same on both: what and where, then the
 * price, then the proof, then — in the footer band — the argument and the
 * address. The remaining photographs go to the carousel, which is the format
 * built to hold them. SOC-013.
 *
 * The 4:5 is the printed edition. Same layout, same reading path, cream ground
 * and navy type: it is the format Instagram gives the most screen to, and dark
 * type on paper is the one combination a chat app cannot degrade at all.
 */
async function photoLamina(
  property: Property,
  qr: string,
  code: string,
  qrSize: number,
  width: number,
  height: number,
  box: PhotoBox,
  message?: string,
  /** Passed in by the carousel, which has already prepared its photographs. */
  photo?: string | null
) {
  const withTitle = height >= 1200;
  const tone = withTitle ? DAYLIGHT : NIGHT;
  const [tile, cover] = await Promise.all([
    brandTile(),
    photo === undefined ? mainPhoto(property, box) : Promise.resolve(photo),
  ]);
  const facts = buildFacts(property);
  const price = buildPriceLine(property);

  const MARGIN = 40;
  const cardWidth = width - MARGIN * 2;
  const body = withTitle ? 224 : 186;
  const textWidth = cardWidth - 76 - STRIPE - 22 - qrSize - 24 - 30;
  const title = withTitle ? listingTitle(property, { size: 20, width: textWidth }) : '';

  // The band is one row: what is left after the address is what the kicker has.
  const bandInner = cardWidth - 76;
  const addressWidth = span(verifyAddress(code), { size: 20, bold: true });

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <PhotoLayer photo={cover} width="100%" height={height} tile={tile} />

      <TopScrim height={200} />
      <TopRow property={property} tile={tile} fontSize={withTitle ? 24 : 23} padding="38px 40px" />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelRamp height={body + 62 + MARGIN + 90} />
      </div>

      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: MARGIN, display: 'flex' }}>
        <InfoCard
          tone={tone}
          style={{ width: cardWidth }}
          footerLeft={
            <SalesCallout
              property={property}
              fontSize={20}
              message={message}
              width={bandInner - addressWidth - 28}
              tone={tone}
            />
          }
          footerRight={<VerifyLine code={code} fontSize={20} variant="inline" tone={tone} />}
        >
          <SurveyLine property={property} height={body - 68} tone={tone} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginLeft: 22, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={22} width={textWidth} tone={tone} />
            <PriceLine price={price} base={withTitle ? 94 : 88} min={38} width={textWidth} tone={tone} />
            <EditorialFacts facts={facts} fontSize={21} width={textWidth} tone={tone} />
            <TitleLine title={title} fontSize={20} tone={tone} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} tile={tile} tone={tone} />
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
 *
 * It is the one format that gets the commercial message set large and over the
 * photograph rather than as a kicker in the footer band. A story is nine
 * sixteenths of a phone screen watched for two seconds: there is room for a
 * sentence here that there is not on a square, and leaving that space empty
 * over a photograph is not restraint, it is a gap. The survey line runs down
 * its left edge for exactly as many lines as the message turned out to need,
 * which is a number this can compute now that the type is measured.
 */
async function storyLamina(
  property: Property,
  qr: string,
  code: string,
  qrSize: number,
  box: PhotoBox,
  message?: string
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property, box)]);
  const facts = buildFacts(property);
  const price = buildPriceLine(property);

  const WIDTH = 1080;
  const MARGIN = 52;
  const SAFE_BOTTOM = 230;
  const body = 268;
  const cardWidth = WIDTH - MARGIN * 2;
  const textWidth = cardWidth - 84 - STRIPE - 24 - qrSize - 24 - 32;
  const title = listingTitle(property, { size: 21, width: textWidth });

  // The card's own height, measured rather than guessed: the headline above it
  // and the ramp behind it both hang off this number, and a card that is taller
  // than the layout believes puts the headline on top of its own top edge.
  const cardHeight = 354;
  const headlineSize = 58;
  const headlineWidth = cardWidth - 40;
  // Two lines of room, and the survey line beside it is drawn for however many
  // of those the message actually used.
  const headline = cut(message || buildArtworkHeadline(property), {
    size: headlineSize,
    width: headlineWidth * 2,
    bold: true,
  });
  const headlineLines = Math.max(
    1,
    Math.min(2, Math.ceil(span(headline, { size: headlineSize, bold: true }) / headlineWidth))
  );
  const headlineHeight = Math.round(headlineSize * 1.08 * headlineLines);

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <PhotoLayer photo={photo} width="100%" height={1920} tile={tile} />

      <TopScrim height={300} />
      <TopRow property={property} tile={tile} fontSize={26} padding="64px 52px" />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelRamp height={cardHeight + SAFE_BOTTOM + 260} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: MARGIN + 6,
          right: MARGIN + 6,
          bottom: SAFE_BOTTOM + cardHeight + 78,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
        }}
      >
        <SurveyLine property={property} height={headlineHeight} />
        <div
          style={{
            display: 'flex',
            maxWidth: headlineWidth,
            fontSize: headlineSize,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -0.5,
            color: '#FFFFFF',
          }}
        >
          {headline}
        </div>
      </div>

      <div style={{ position: 'absolute', left: MARGIN, right: MARGIN, bottom: SAFE_BOTTOM, display: 'flex' }}>
        <InfoCard
          style={{ width: cardWidth }}
          padding="40px 42px"
          footerPadding="20px 42px"
          footerLeft={
            <div style={{ display: 'flex', fontSize: 21, color: NIGHT.inkFaint }}>
              ESCANEA EL QR O VISITA
            </div>
          }
          footerRight={<VerifyLine code={code} fontSize={22} variant="inline" />}
        >
          <SurveyLine property={property} height={body - 80} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginLeft: 24, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={25} width={textWidth} />
            <PriceLine price={price} base={104} min={44} width={textWidth} />
            <EditorialFacts facts={facts} fontSize={23} width={textWidth} />
            <TitleLine title={title} fontSize={21} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} tile={tile} />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

// --- The carousel ---------------------------------------------------------

/**
 * A middle frame: one photograph, one fact, and the pair that makes it
 * checkable.
 *
 * The cover already made the argument, so these are free to be what a carousel
 * is actually for — the second and third look at the place. A caption plate
 * rather than a card: the frame is about the picture, and a full card here
 * would be the cover again with a different photograph behind it.
 *
 * The QR and the address are not optional even here, and the reason is the same
 * one that puts the counter in the corner: a carousel frame gets saved and
 * reposted on its own. At that point it is a photograph of somebody's house
 * with this portal's mark on it and no way to check where it came from, which
 * is precisely the thing SOC-002 exists to prevent.
 */
function CarouselFrame({
  property,
  photo,
  tile,
  caption,
  code,
  qr,
  qrSize,
  frame,
  frames,
  height,
}: {
  property: Property;
  photo: string | null;
  tile: string;
  caption: string;
  code: string;
  qr: string;
  qrSize: number;
  frame: number;
  frames: number;
  height: number;
}) {
  const accent = accentColor(property);
  const [value, ...rest] = caption.split(' ');
  const unit = rest.join(' ');

  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', backgroundColor: NAVY, fontFamily: 'Plus Jakarta Sans' }}>
      <PhotoLayer photo={photo} width="100%" height={height} tile={tile} />

      <TopScrim height={190} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '38px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            padding: '10px 20px',
            borderRadius: 999,
            backgroundColor: 'rgba(15,16,32,0.62)',
            color: '#FFFFFF',
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: 1.4,
          }}
        >
          {frame} / {frames}
        </div>
        <BrandPill tile={tile} fontSize={23} />
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
        <PanelRamp height={300} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          bottom: 40,
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '22px 30px 22px 24px',
            borderRadius: 24,
            backgroundColor: NAVY,
            boxShadow: CARD_SHADOW,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', width: STRIPE, height: 34, borderRadius: 999, backgroundColor: accent }} />
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: '#FFFFFF' }}>{value}</div>
              {unit ? (
                <div style={{ display: 'flex', marginLeft: 8, fontSize: 28, color: NIGHT.inkSoft }}>
                  {unit}
                </div>
              ) : null}
            </div>
          </div>
          <VerifyLine code={code} fontSize={20} />
        </div>
        <div style={{ display: 'flex', marginLeft: 'auto' }}>
          <QrCard qr={qr} size={qrSize} tile={tile} />
        </div>
      </div>
    </div>
  );
}

/**
 * The carousel, one frame per request.
 *
 * Frame 1 is the cover, which is the printed 4:5 exactly as it is published on
 * its own — same picture, same price, same card. The last frame is the map,
 * because a carousel that never says where the place is has wasted the swipe
 * somebody gave it. Everything between is a photograph.
 *
 * The frames share one set of decoded photographs: `photoMaster` caches them,
 * so the four requests that make up a carousel cost one listing's worth of
 * fetching rather than four.
 */
async function carouselLamina(
  property: Property,
  frame: number,
  frames: number,
  qr: string,
  code: string,
  qrSize: number,
  width: number,
  height: number,
  box: PhotoBox,
  message?: string
) {
  if (frame >= frames) {
    return mapLamina(property, qr, code, qrSize, width, height);
  }

  const photos = await marketingPhotos(property, box, frames - 1);

  if (frame === 1) {
    return photoLamina(property, qr, code, qrSize, width, height, box, message, photos[0] ?? null);
  }

  const tile = await brandTile();
  const facts = buildFacts(property);
  // Frame two takes the second fact, three the third: the first is already on
  // the cover, and a carousel that repeats itself is one nobody swipes through.
  const caption = facts[frame - 1] ?? facts[0] ?? buildPlace(property);
  return (
    <CarouselFrame
      property={property}
      photo={photos[frame - 1] ?? null}
      tile={tile}
      caption={caption}
      code={code}
      qr={qr}
      qrSize={qrSize}
      frame={frame}
      frames={frames}
      height={height}
    />
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
async function ogLamina(
  property: Property,
  qr: string,
  code: string,
  qrSize: number,
  box: PhotoBox,
  message?: string
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property, box)]);
  const facts = buildFacts(property);
  const price = buildPriceLine(property);

  const PHOTO_WIDTH = 476;
  const EDGE = 7;
  const PANEL_WIDTH = 1200 - PHOTO_WIDTH - EDGE;
  const textWidth = PANEL_WIDTH - 80;
  // Two lines of title at this width, and the second one has to end somewhere.
  const title = listingTitle(property, { size: 23, width: textWidth * 2 });

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

        {/* No survey line down this one. The accent edge between the photo and
            the panel is already the full height of the frame, and a second
            vertical rule forty pixels from it is one mark too many at the size
            a link card is actually rendered. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: textWidth }}>
          <Eyebrow property={property} fontSize={20} width={textWidth} />
          <PriceLine price={price} base={66} min={30} width={textWidth} />
          {title ? (
            <div style={{ display: 'flex', fontSize: 23, lineHeight: 1.26, color: 'rgba(255,255,255,0.82)' }}>
              {title}
            </div>
          ) : null}
          <FactChips facts={facts} fontSize={19} />
          <SalesCallout property={property} fontSize={19} message={message} width={textWidth} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <VerifyLine code={code} fontSize={19} />
          <QrCard qr={qr} size={qrSize} tile={tile} />
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
  height: number,
  box: PhotoBox
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property, box)]);

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
          footerLeft={
            <div style={{ display: 'flex', fontSize: 18, color: NIGHT.inkSoft }}>
              Precio actualizado el {drop.changedLabel}
            </div>
          }
          footerRight={<VerifyLine code={code} fontSize={20} variant="inline" />}
        >
          <SurveyLine property={property} height={body - 68} color={AMBER} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginLeft: 22, maxWidth: textWidth }}>
            <Eyebrow property={property} fontSize={22} width={textWidth} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', fontSize: 20, fontWeight: 800, letterSpacing: 2.6, color: NIGHT.inkFaint }}>
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

            <PriceLine price={drop.currentLabel} base={98} min={44} width={textWidth} />
          </div>
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <QrCard qr={qr} size={qrSize} tile={tile} />
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
 * of green with a word in it is a sticker; the same word at 138 points over a
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
  height: number,
  box: PhotoBox
) {
  const [tile, photo] = await Promise.all([brandTile(), mainPhoto(property, box)]);
  const stamp = CLOSURE_STAMP[closure];
  const when = closureLabel(property);
  const accent = closure === 'rented' ? AQUA : MINT;

  const MARGIN = 40;
  const cardWidth = width - MARGIN * 2;
  const body = 168;
  const stageWidth = width - 120;
  const subject = cut(
    [getPropertyTypeLabel(property.property_type), buildPlace(property)]
      .filter(Boolean)
      .join(' · ')
      .toUpperCase(),
    { size: 26, width: stageWidth, tracking: 4, bold: true }
  );

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
            `linear-gradient(180deg, rgba(${NAVY_RGB},0.80) 0%, rgba(${NAVY_RGB},0.70) 42%,` +
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
            fontSize: fit(stamp, { size: 138, min: 92, width: stageWidth, tracking: 4, bold: true }),
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
            <QrCard qr={qr} size={qrSize} tile={tile} />
          </div>
        </InfoCard>
      </div>
    </div>
  );
}

// --- Route ----------------------------------------------------------------

/**
 * How long a lamina may be kept.
 *
 * A versioned address — one carrying `v`, which `laminaPath` builds out of the
 * listing's `updated_at` and the artwork revision — describes one immutable
 * image: edit the listing or redraw the artwork and the URL moves. Those can be
 * held for a month, which on a link every network scrapes the moment it is
 * posted is the difference between rendering a lamina once and rendering it
 * every minute.
 *
 * A month rather than a year, and not `immutable`, because `LAMINA_REVISION` is
 * bumped by hand: a cache entry nobody can reach should expire on its own
 * rather than need somebody to purge it.
 */
const VERSIONED_CACHE = 'public, max-age=3600, s-maxage=2592000, stale-while-revalidate=86400';
/** Hand-typed and unversioned: correct quickly, never cheap. */
const ROLLING_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400';

/**
 * The bytes that actually go out.
 *
 * `next/og` rasterises to PNG and offers no way to ask for anything else, which
 * for a lamina that is mostly photograph is the wrong container by a factor of
 * five — the 1080x1920 story is 2.7 MB as a PNG and around 300 KB as a JPEG
 * that nobody can tell apart once Instagram has had it. On a phone paying for
 * data, that difference is the download.
 *
 * The map is the exception and stays lossless: flat colour and thin type is the
 * one thing PNG encodes better and JPEG smears. `LAMINA_MIME` is shared with
 * the kit screen so the downloaded file's extension matches its contents.
 *
 * Falling back to the PNG on any failure, and saying so in the header rather
 * than serving JPEG's name over PNG's bytes.
 */
async function encodeLamina(png: Buffer, format: SocialFormat) {
  if (LAMINA_MIME[format] === 'image/png') return { body: png, type: 'image/png' };
  try {
    const { default: sharp } = await import('sharp');
    const jpeg = await sharp(png)
      .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toBuffer();
    return { body: jpeg, type: 'image/jpeg' };
  } catch {
    return { body: png, type: 'image/png' };
  }
}

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

  // A carousel frame is the same kind of claim, and `carouselFrames` is the
  // same kind of predicate: what the kit screen asks before it draws a card.
  const frames = carouselFrames(property);
  const frame = Math.max(
    1,
    Number.parseInt(request.nextUrl.searchParams.get('lamina') ?? '1', 10) || 1
  );
  if (format === 'carousel' && frame > frames) {
    return new Response('This listing has no such carousel frame', { status: 404 });
  }

  const cacheControl = request.nextUrl.searchParams.has('v') ? VERSIONED_CACHE : ROLLING_CACHE;

  // Everything that can change what is drawn, and nothing else. Answering 304
  // here is what makes a re-fetch free: the alternative is pulling three
  // photographs out of the object store and rasterising a tree to produce bytes
  // the caller already has.
  const etag = `"${createHash('sha1')
    .update(
      [
        LAMINA_REVISION,
        property.id,
        property.updated_at ?? '',
        format,
        frame,
        network,
        customMessage ?? '',
      ].join('|')
    )
    .digest('base64url')
    .slice(0, 20)}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': cacheControl },
    });
  }

  const code = property.short_code ?? '';
  const target = trackedUrl(property, network);
  const qrSize = qrPixelSize(target, QR_TARGET[format as SocialFormat]);
  const [qr, fonts] = await Promise.all([qrDataUri(target, qrSize), promotionFonts(), loadMetrics()]);
  const box = PHOTO_BOX[format as SocialFormat] ?? { width: spec.width, height: spec.height };

  let element;
  if (format === 'map') {
    element = await mapLamina(property, qr, code, qrSize, spec.width, spec.height);
  } else if (format === 'story') {
    element = await storyLamina(property, qr, code, qrSize, box, customMessage);
  } else if (format === 'og') {
    element = await ogLamina(property, qr, code, qrSize, box, customMessage);
  } else if (format === 'carousel') {
    element = await carouselLamina(
      property, frame, frames, qr, code, qrSize, spec.width, spec.height, box, customMessage
    );
  } else if (format === 'price-drop') {
    element = await priceDropLamina(property, drop!, qr, code, qrSize, spec.width, spec.height, box);
  } else if (format === 'sold') {
    element = await soldLamina(property, closure!, qr, code, qrSize, spec.width, spec.height, box);
  } else {
    element = await photoLamina(property, qr, code, qrSize, spec.width, spec.height, box, customMessage);
  }

  const png = Buffer.from(
    await new ImageResponse(element, { width: spec.width, height: spec.height, fonts }).arrayBuffer()
  );
  const { body, type } = await encodeLamina(png, format as SocialFormat);

  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': type,
      'Content-Length': String(body.length),
      ETag: etag,
      'Cache-Control': cacheControl,
    },
  });
}
