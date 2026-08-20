import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { fitToWidth, measureText, readFontMetrics, truncateToWidth, type FontMetrics } from './text-metrics';

const FONT = path.join(process.cwd(), 'public', 'fonts', 'PlusJakartaSans-ExtraBold.ttf');

describe('readFontMetrics', () => {
  let font: FontMetrics | null = null;

  beforeAll(async () => {
    font = readFontMetrics(await readFile(FONT));
  });

  it('reads the face the laminas actually draw with', () => {
    expect(font).not.toBeNull();
  });

  it('gives narrow letters less advance than wide ones', () => {
    // The whole point: a character count cannot tell these apart.
    expect(font!.advance('i'.codePointAt(0)!)).toBeLessThan(font!.advance('M'.codePointAt(0)!));
    expect(font!.advance(' '.codePointAt(0)!)).toBeGreaterThan(0);
  });

  it('covers the accented characters Ecuadorian place names need', () => {
    for (const character of 'áéíóúñÁÉÍÓÚÑ¡¿²') {
      expect(font!.advance(character.codePointAt(0)!)).toBeGreaterThan(0);
    }
  });

  it('returns null rather than throwing on something that is not a font', () => {
    expect(readFontMetrics(Buffer.from('not a font at all'))).toBeNull();
  });

  it('measures the same string differently depending on its letters', () => {
    const wide = measureText('MMMMMMMMMM', { font, fontSize: 100 });
    const narrow = measureText('iiiiiiiiii', { font, fontSize: 100 });
    expect(wide).toBeGreaterThan(narrow * 1.5);
  });

  it('counts letter-spacing, which is most of a line of caps', () => {
    const plain = measureText('EN VENTA', { font, fontSize: 24 });
    const tracked = measureText('EN VENTA', { font, fontSize: 24, letterSpacing: 2 });
    expect(tracked - plain).toBeCloseTo(16, 5);
  });

  describe('fitToWidth', () => {
    it('leaves a string that already fits alone', () => {
      expect(fitToWidth('$100.000', { font, fontSize: 94, width: 2000, min: 38 })).toBe(94);
    });

    it('shrinks a long price until it fits its box', () => {
      const price = '$1.700.000 venta · $14.000/mes arriendo';
      const size = fitToWidth(price, { font, fontSize: 94, width: 720, min: 30 });
      expect(size).toBeLessThan(94);
      expect(measureText(price, { font, fontSize: size })).toBeLessThanOrEqual(720);
    });

    it('stops at the floor instead of shrinking to nothing', () => {
      const size = fitToWidth('x'.repeat(400), { font, fontSize: 94, width: 300, min: 38 });
      expect(size).toBe(38);
    });

    it('solves for tracking, which does not scale with the size', () => {
      const text = 'CASA · SANTO DOMINGO DE LOS TSÁCHILAS';
      const size = fitToWidth(text, { font, fontSize: 22, letterSpacing: 2, width: 400, min: 12 });
      expect(measureText(text, { font, fontSize: size, letterSpacing: 2 })).toBeLessThanOrEqual(400);
    });
  });

  describe('truncateToWidth', () => {
    it('leaves a string that already fits alone', () => {
      expect(truncateToWidth('Casa en Cuenca', { font, fontSize: 20, width: 900 })).toBe(
        'Casa en Cuenca'
      );
    });

    it('cuts to the box and says so', () => {
      const title = 'Se Vende Casa de 3 Pisos — Conjunto Isla Bonita, Portón del Río';
      const cut = truncateToWidth(title, { font, fontSize: 20, width: 320 });
      expect(cut.endsWith('…')).toBe(true);
      expect(measureText(cut, { font, fontSize: 20 })).toBeLessThanOrEqual(320);
    });

    it('prefers a word boundary to a cut through a word', () => {
      const original = 'Conjunto Isla Bonita Portón';
      const cut = truncateToWidth(original, { font, fontSize: 20, width: 200 });
      const kept = cut.slice(0, -1);
      // Whole words only: the kept text is a prefix of the original that ends
      // where a word ends, never halfway through "Bonita".
      expect(original.startsWith(kept)).toBe(true);
      expect(original[kept.length] === ' ' || kept.length === original.length).toBe(true);
    });
  });

  describe('without metrics', () => {
    it('still answers, using the per-character estimate', () => {
      expect(measureText('hola', { font: null, fontSize: 100 })).toBeGreaterThan(0);
      expect(fitToWidth('hola', { font: null, fontSize: 100, width: 50, min: 10 })).toBeLessThan(100);
      expect(truncateToWidth('hola mundo entero', { font: null, fontSize: 100, width: 120 })).toContain(
        '…'
      );
    });
  });
});
