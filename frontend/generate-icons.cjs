#!/usr/bin/env node

/**
 * PWA icon export.
 *
 * Chrome on Android will not offer "install" unless the manifest lists a raster
 * icon of at least 192px; it ignores SVG entries. This script exports those
 * rasters from the vendored Aents brand tile.
 *
 * It resizes and pads an approved master — it never redraws it. See
 * public/aents/README.md: recolouring or vectorising the mark forks the
 * identity, and the tile is artwork, not a CSS box.
 *
 * Run with `node generate-icons.cjs` after the brand tile is updated.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, 'public');
const SOURCE = path.join(publicDir, 'aents', 'aents-brand-tile-1024.png');

// "any" icons keep the tile's own silhouette — its rounded corners are part of
// the mark, and every launcher that reads a non-maskable icon draws it as-is.
const ANY_SIZES = [192, 512];
// Maskable icons get cropped to whatever shape the launcher wants, so they need
// paint in the corners. The tile's artwork already sits inside the 80% safe
// circle at full scale, so only the transparent corners need filling.
const MASKABLE_SIZES = [192, 512];
// iOS never masks; it rounds a square and composites it on white if the source
// is transparent, which would ring the tile in a pale halo. Ship it bled.
const APPLE_SIZE = 180;

/**
 * A canvas of the tile with no transparent corners.
 *
 * The backdrop is the same tile scaled past the frame and centre-cropped, so
 * the corners are filled by the tile's own gradient continuing outward. A flat
 * colour would seam against the gradient at the top-left, where the tile is
 * lightest.
 */
const bleed = async (size) => {
  const backdrop = await sharp(SOURCE)
    .resize(Math.round(size * 1.18), Math.round(size * 1.18), { fit: 'cover' })
    .toBuffer();
  const tile = await sharp(SOURCE).resize(size, size, { fit: 'contain' }).toBuffer();

  return sharp(backdrop)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .composite([{ input: tile }])
    .png()
    .toBuffer();
};

const write = async (buffer, filename) => {
  await fs.promises.writeFile(path.join(publicDir, filename), buffer);
  console.log(`✅ ${filename}`);
};

(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error(`No se encontró el master de marca: ${SOURCE}`);
    process.exit(1);
  }

  console.log('🎨 Exportando iconos PWA desde el tile de marca Aents...\n');

  for (const size of ANY_SIZES) {
    const buffer = await sharp(SOURCE).resize(size, size, { fit: 'contain' }).png().toBuffer();
    await write(buffer, `icon-${size}.png`);
  }

  for (const size of MASKABLE_SIZES) {
    await write(await bleed(size), `icon-maskable-${size}.png`);
  }

  await write(await bleed(APPLE_SIZE), 'apple-touch-icon.png');

  console.log('\n📝 Listo. Los .svg antiguos siguen ahí para compatibilidad,');
  console.log('   pero el manifest ya apunta a los PNG.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
