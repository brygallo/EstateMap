/**
 * The QR code drawn onto a promotion lamina, as a PNG data URI.
 *
 * Not `qrcode.react`, which is what the on-screen share dialog uses: that is a
 * React component, it calls hooks, and Satori walks an element tree without
 * running a renderer, so the hooks blow up. Rendering it to markup first would
 * mean importing `react-dom/server`, which the App Router refuses outright.
 * A plain encoder that returns bytes sidesteps both.
 *
 * PNG rather than SVG because it is the one format every stage of the image
 * pipeline decodes the same way.
 */

import QRCode from 'qrcode';

/** Shared so the size calculation and the bitmap can never disagree. */
const ENCODING = {
  // Networks recompress uploads without mercy. Level H survives losing roughly
  // a third of the modules, which is the difference between a code that still
  // scans off a reshared screenshot and one that does not.
  errorCorrectionLevel: 'H',
  margin: 2,
} as const;

/**
 * A width at which every module lands on whole pixels.
 *
 * The encoder happily renders any size, but a code whose module is 2.6 pixels
 * wide gets its edges averaged into grey — first by the resampler, then again by
 * whatever a network does to an upload. Rounding the bitmap up to a whole number
 * of pixels per module costs a few kilobytes and is worth more to a scanner than
 * any amount of error correction.
 *
 * The caller must then draw it at exactly this width: scaling it down in the
 * layout undoes the whole thing.
 */
export function qrPixelSize(value: string, atLeast: number): number {
  const span = QRCode.create(value, ENCODING).modules.size + ENCODING.margin * 2;
  return Math.ceil(atLeast / span) * span;
}

export async function qrDataUri(value: string, size = 320): Promise<string> {
  return QRCode.toDataURL(value, {
    type: 'image/png',
    ...ENCODING,
    width: size,
    color: { dark: '#0F172AFF', light: '#FFFFFFFF' },
  });
}
