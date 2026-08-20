/**
 * How wide a string is going to be, before anything draws it.
 *
 * The promotion laminas are composed by Satori, which lays out a tree and
 * rasterises it without ever telling the caller what it measured. Everything in
 * that file used to size type by counting characters — "past thirty characters,
 * shrink in proportion" — which is a guess that is wrong in both directions:
 * "MMMMMMMMMM" and "illillillil" are the same length and nowhere near the same
 * width, so a title either overflowed the frame and was guillotined by the edge
 * of the raster, or was cut short with room to spare.
 *
 * This reads the advance widths straight out of the TTFs the route already
 * loads, so a fit is arithmetic rather than a guess. The parser handles exactly
 * what those two files contain — a format 4 `cmap` and a `hmtx` — and returns
 * null for anything else, which is what lets the caller keep the old estimate
 * as a fallback instead of failing a render over a font table.
 *
 * Two things it deliberately does not model, both erring wide:
 *
 * - **Kerning.** The pair adjustments live in `GPOS`, and skipping them
 *   overestimates a string by around one per cent. Overestimating is the safe
 *   direction: type comes out a point smaller than it had to be, rather than
 *   two points into the margin.
 * - **Shaping.** No ligatures, no contextual alternates. Latin text in this
 *   face has nothing that changes width.
 */

/** Everything needed to measure a string in one face. */
export interface FontMetrics {
  /** Advance width of one code point, in ems. */
  advance(codePoint: number): number;
}

interface Tables {
  [tag: string]: { offset: number; length: number };
}

function readTables(data: Buffer): Tables | null {
  if (data.length < 12) return null;
  const numTables = data.readUInt16BE(4);
  if (numTables === 0 || data.length < 12 + numTables * 16) return null;
  const tables: Tables = {};
  for (let i = 0; i < numTables; i += 1) {
    const entry = 12 + i * 16;
    const tag = data.toString('latin1', entry, entry + 4);
    tables[tag] = { offset: data.readUInt32BE(entry + 8), length: data.readUInt32BE(entry + 12) };
  }
  return tables;
}

/**
 * The glyph id for a code point, out of a format 4 `cmap` subtable.
 *
 * Format 4 is the segmented mapping every Latin font ships, and it is what
 * fontTools wrote when these two faces were instanced. The lookup is the one
 * described in the OpenType specification, including its quirk: a non-zero
 * `idRangeOffset` addresses into the glyph array *from the position of the
 * offset itself*, so the address has to be computed from where the value was
 * read and not from the start of the table.
 */
function makeCmapLookup(data: Buffer, offset: number): ((codePoint: number) => number) | null {
  if (data.readUInt16BE(offset) !== 4) return null;

  const segCountX2 = data.readUInt16BE(offset + 6);
  const segCount = segCountX2 / 2;
  const endCodes = offset + 14;
  const startCodes = endCodes + segCountX2 + 2;
  const idDeltas = startCodes + segCountX2;
  const idRangeOffsets = idDeltas + segCountX2;

  return (codePoint: number): number => {
    if (codePoint > 0xffff) return 0;
    for (let i = 0; i < segCount; i += 1) {
      const end = data.readUInt16BE(endCodes + i * 2);
      if (codePoint > end) continue;
      const start = data.readUInt16BE(startCodes + i * 2);
      if (codePoint < start) return 0;

      const delta = data.readInt16BE(idDeltas + i * 2);
      const rangeOffsetAt = idRangeOffsets + i * 2;
      const rangeOffset = data.readUInt16BE(rangeOffsetAt);
      if (rangeOffset === 0) return (codePoint + delta) & 0xffff;

      const glyphAt = rangeOffsetAt + rangeOffset + (codePoint - start) * 2;
      if (glyphAt + 1 >= data.length) return 0;
      const glyph = data.readUInt16BE(glyphAt);
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
}

/**
 * Advance widths for one TTF, or null when the file is not one this can read.
 *
 * Null is a supported answer, not a failure: the laminas fall back to their
 * character-count estimate, which is worse but never blank.
 */
export function readFontMetrics(data: Buffer): FontMetrics | null {
  try {
    const tables = readTables(data);
    if (!tables?.head || !tables.hhea || !tables.hmtx || !tables.cmap) return null;

    const unitsPerEm = data.readUInt16BE(tables.head.offset + 18);
    if (!unitsPerEm) return null;

    const numberOfHMetrics = data.readUInt16BE(tables.hhea.offset + 34);
    if (!numberOfHMetrics) return null;

    // Pick the Windows BMP subtable when it is there, and settle for whatever
    // format 4 subtable exists otherwise.
    const cmapOffset = tables.cmap.offset;
    const subtableCount = data.readUInt16BE(cmapOffset + 2);
    let lookup: ((codePoint: number) => number) | null = null;
    for (let i = 0; i < subtableCount; i += 1) {
      const record = cmapOffset + 4 + i * 8;
      const platform = data.readUInt16BE(record);
      const encoding = data.readUInt16BE(record + 2);
      const candidate = makeCmapLookup(data, cmapOffset + data.readUInt32BE(record + 4));
      if (!candidate) continue;
      lookup = candidate;
      if (platform === 3 && encoding === 1) break;
    }
    if (!lookup) return null;

    const hmtx = tables.hmtx.offset;
    // Every glyph past `numberOfHMetrics` shares the last advance in the table:
    // that is how a monospaced tail is stored without repeating the number.
    const lastAdvance = data.readUInt16BE(hmtx + (numberOfHMetrics - 1) * 4);

    const cache = new Map<number, number>();
    return {
      advance(codePoint: number): number {
        const hit = cache.get(codePoint);
        if (hit !== undefined) return hit;
        const glyph = lookup!(codePoint);
        const units =
          glyph < numberOfHMetrics ? data.readUInt16BE(hmtx + glyph * 4) : lastAdvance;
        const em = units / unitsPerEm;
        cache.set(codePoint, em);
        return em;
      },
    };
  } catch {
    // A truncated or unexpected font is not worth a 500. See the note above.
    return null;
  }
}

export interface TextBox {
  font: FontMetrics | null;
  fontSize: number;
  /** CSS letter-spacing in pixels; it lands after every character, last included. */
  letterSpacing?: number;
}

/**
 * The width one line of text will occupy, in pixels.
 *
 * Falls back to a per-character estimate when there are no metrics. The 0.55em
 * figure is the measured mean advance of this face over the strings these
 * laminas print — listing titles, place names and prices — so the fallback is
 * at least calibrated to the same text rather than to an alphabet.
 */
export function measureText(text: string, { font, fontSize, letterSpacing = 0 }: TextBox): number {
  const characters = Array.from(text);
  if (!font) return characters.length * (fontSize * 0.55 + letterSpacing);
  let ems = 0;
  for (const character of characters) ems += font.advance(character.codePointAt(0)!);
  return ems * fontSize + characters.length * letterSpacing;
}

/**
 * The largest size, at or under `fontSize`, that keeps the string inside
 * `width` — never below `min`, because a line that has to be unreadable to fit
 * should be truncated instead.
 */
export function fitToWidth(
  text: string,
  { font, fontSize, letterSpacing = 0, width, min }: TextBox & { width: number; min: number }
): number {
  if (!text || width <= 0) return fontSize;
  const measured = measureText(text, { font, fontSize, letterSpacing });
  if (measured <= width) return fontSize;
  // Letter-spacing does not scale with the size, so solving for it exactly
  // matters at the sizes where this fires: at 22px with 2px of tracking, a
  // third of the width of a caps line is spacing.
  const characters = Array.from(text).length;
  const spacing = characters * letterSpacing;
  const glyphs = measured - spacing;
  if (glyphs <= 0) return min;
  const scaled = ((width - spacing) * fontSize) / glyphs;
  return Math.max(min, Math.floor(scaled));
}

/**
 * The string cut to fit `width`, with an ellipsis when anything was dropped.
 *
 * Cuts on a word boundary when one is near enough to the cut, for the same
 * reason the old character clamp did: "Conjunto Isla Boni…" reads as damage,
 * "Conjunto Isla…" reads as a decision.
 */
export function truncateToWidth(
  text: string,
  { font, fontSize, letterSpacing = 0, width }: TextBox & { width: number }
): string {
  if (!text || width <= 0) return text;
  if (measureText(text, { font, fontSize, letterSpacing }) <= width) return text;

  const characters = Array.from(text);
  const ellipsis = measureText('…', { font, fontSize, letterSpacing });
  const budget = width - ellipsis;
  if (budget <= 0) return '…';

  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = characters.slice(0, middle).join('');
    if (measureText(candidate, { font, fontSize, letterSpacing }) <= budget) low = middle;
    else high = middle - 1;
  }

  const cut = characters.slice(0, low).join('');
  const space = cut.lastIndexOf(' ');
  const kept = space > cut.length * 0.6 ? cut.slice(0, space) : cut;
  return `${kept.replace(/[\s·,—-]+$/, '')}…`;
}
