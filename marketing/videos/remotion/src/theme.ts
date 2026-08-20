export const palette = {
  navy: '#0F1020',
  ink: '#080915',
  white: '#FFFFFF',
  fog: '#F1F3F6',
  green: '#22C55E',
  teal: '#14B8A6',
  violet: '#6B5CF6',
  lavender: '#A78BFA',
};

export const accents = [palette.green, palette.teal, palette.violet, palette.lavender];

export const font = '"EstateMap Display", "Avenir Next", system-ui, sans-serif';

/**
 * Phones are taller than the 16:9 the canvas assumes, and TikTok fills the
 * screen: it scales a 9:16 upload to the screen height, which pushes the sides
 * out of view. The canvas is never cropped vertically — it is cropped
 * horizontally, and by more than it looks.
 *
 * On a 1080 px canvas the hidden margin is `(1080 - 1920 / ratio) / 2`:
 *
 *   19.5:9  (iPhone X and later, most Android)   97 px per side
 *   20:9    (taller Android)                    108 px per side
 *
 * 120 px clears both. Nothing legible may start inside it — not text, not the
 * brand block, not a card border. Backgrounds and gradients still bleed to the
 * full 1080: they are meant to be cut.
 *
 * This was measured, not guessed: with the 19.5:9 crop applied to geo-003 the
 * domain pill read "opropiedadesecuador.com", the brand tile was sliced in half
 * and "¿Cómo quieres ubicarla?" lost its opening sign.
 */
export const sideCrop = 120;

/**
 * Reserved space for the platform interface, measured on a 1080 x 1920 canvas.
 *
 * `bottom` covers the TikTok caption, username and music ticker, which reach
 * higher than Instagram's. `right` covers the action rail (like, comment,
 * share); it only matters below `railTop`, so headlines placed above that line
 * may use the full width.
 */
export const safe = {
  // TikTok's top navigation clears this line on a 1080 x 1920 export. This is
  // also the established brand anchor for the video system.
  top: 205,
  bottom: 460,
  // The side margin is the device crop, not a taste decision. Anything anchored
  // closer to the edge than this is invisible on a phone.
  left: sideCrop,
  right: 250,
  railTop: 820,
};

/**
 * Split layout: the product occupies the top of the frame untouched, and every
 * word lives in a band underneath it. Text over a screen recording forced a
 * heavy scrim that made the interface unreadable, which defeats the point of
 * filming the interface at all.
 */
export const stage = {
  top: 0,
  // The picture fills the frame; its lower quarter is kept free of detail and
  // shaded so the words can live there without covering anything.
  height: 1920,
};

export const panel = {
  top: stage.height,
  height: 1920 - stage.height,
};

// Words end here: below this line TikTok paints its own caption and username.
// The reservation is 380 px by product decision: 460 pushed the block so high
// that the scrim needed to cover the lower half of the stage to keep it
// readable, which darkened the interface the piece exists to show. 1580 was
// once tried and let the second caption line fall behind the username on small
// devices; 1580 is the floor by product decision, with the progress cue
// pinned to it so the two can no longer drift apart.
export const textFloor = 1580;

/**
 * The headline rests on the last stretch of the stage over a short gradient —
 * enough to be readable, not enough to hide what the interface is doing — and
 * the spoken line runs underneath on clean ground.
 */
export const captionBox = {
  left: safe.left,
  width: 1080 - safe.left - safe.right,
  bottom: 1920 - textFloor,
};

export const headlineBox = {
  left: safe.left,
  width: 1080 - safe.left - safe.right,
  bottom: 1920 - textFloor + 190,
};
