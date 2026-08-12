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
 * Reserved space for the platform interface, measured on a 1080 x 1920 canvas.
 *
 * `bottom` covers the TikTok caption, username and music ticker, which reach
 * higher than Instagram's. `right` covers the action rail (like, comment,
 * share); it only matters below `railTop`, so headlines placed above that line
 * may use the full width.
 */
export const safe = {
  top: 240,
  bottom: 460,
  left: 64,
  right: 240,
  railTop: 820,
};

export const headlineBox = {
  left: safe.left,
  width: 1080 - safe.left * 2,
  top: safe.top + 60,
};

export const captionBox = {
  left: safe.left,
  width: 1080 - safe.left - safe.right,
  bottom: safe.bottom,
};
