/**
 * The heading a ficha shows, built from what the listing IS rather than from
 * what the advertiser typed.
 *
 * An imported headline is written for a different portal's audience and often
 * shouted in capitals: «ESPECTACULAR TERRENO PARA CAMPOSANTO CEMENTERIO
 * POMASQUI». Nobody searches that. People search «terreno de venta en Quito»,
 * and the page that answers them has to say so in its own `h1` and `title`.
 *
 * The advertiser's headline is not discarded — it stays on the page, below,
 * because it is the seller's voice and it carries words no template knows.
 * What changes is which of the two is the heading.
 */

import { getPropertyTypeLabel } from './property-labels';
import type { Property } from './types';

/** How the operation reads inside a sentence, or empty when it is unknown. */
function operationLabel(status?: string): string {
  if (status === 'for_sale') return 'de venta';
  if (status === 'for_rent') return 'de alquiler';
  return '';
}

/** Ratio of shouted letters, used to decide whether a headline needs calming. */
function shoutRatio(text: string): number {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (!letters) return 0;
  const upper = letters.replace(/[^\p{Lu}]/gu, '');
  return upper.length / letters.length;
}

// Words that stay lowercase inside a headline once it is calmed down. Only the
// ones that never begin a proper noun, so nothing meaningful is demoted.
const CONNECTORS = new Set([
  'a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los',
  'o', 'para', 'por', 'sin', 'sobre', 'su', 'sus', 'un', 'una', 'y',
]);

/**
 * Turns A HEADLINE WRITTEN IN CAPITALS into one written like a phrase.
 *
 * Only shouted headlines are touched — most of the letters have to be capitals
 * — so an acronym inside a normal sentence («Casa en el sector NNUU») is left
 * alone. Within a shouted one every word is calmed, connectors go lowercase and
 * the first word always keeps its capital. Nothing is ever deleted: the words
 * are the advertiser's, only the volume changes.
 */
export function softenShouting(text: string): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean || shoutRatio(clean) < 0.6) return clean;
  return clean
    .split(' ')
    .map((word, index) => {
      const letters = word.replace(/[^\p{L}]/gu, '');
      if (!letters || letters !== letters.toUpperCase()) return word;
      const lower = word.toLowerCase();
      if (index > 0 && CONNECTORS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Area as a plain «120 m²», or empty when the listing does not declare one. */
function areaLabel(area: Property['area']): string {
  const value = typeof area === 'string' ? Number.parseFloat(area) : area;
  if (!Number.isFinite(value as number) || (value as number) <= 0) return '';
  return `${Math.round(value as number).toLocaleString('es-EC')} m²`;
}

/**
 * «Casa de venta en Quito · 3 dormitorios · 180 m²»
 *
 * The order is the order of a search: what it is, which operation, where, and
 * then the two details people filter by. Every part is dropped when the listing
 * does not have it, so a sparse row degrades to «Propiedad de venta» instead of
 * announcing a place or a size it never declared.
 */
export function buildSearchHeading(property: Property): string {
  const type = getPropertyTypeLabel(property.property_type);
  const operation = operationLabel(property.status);
  const city = (property.city || '').trim();

  const head = [type, operation, city ? `en ${city}` : ''].filter(Boolean).join(' ');

  const rooms = property.rooms ?? 0;
  const details = [
    rooms > 0 ? `${rooms} ${rooms === 1 ? 'dormitorio' : 'dormitorios'}` : '',
    areaLabel(property.area),
  ].filter(Boolean);

  return details.length ? `${head} · ${details.join(' · ')}` : head;
}
