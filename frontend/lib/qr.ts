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

export async function qrDataUri(value: string, size = 320): Promise<string> {
  return QRCode.toDataURL(value, {
    type: 'image/png',
    // Networks recompress uploads without mercy. Level H survives losing
    // roughly a third of the modules, which is the difference between a code
    // that still scans off a reshared screenshot and one that does not.
    errorCorrectionLevel: 'H',
    margin: 2,
    width: size,
    color: { dark: '#0F172AFF', light: '#FFFFFFFF' },
  });
}
