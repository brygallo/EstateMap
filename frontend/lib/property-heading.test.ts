import { describe, expect, it } from 'vitest';
import { buildSearchHeading, softenShouting } from './property-heading';
import type { Property } from './types';

const base = (extra: Partial<Property> = {}): Property =>
  ({ id: 1, property_type: 'house', status: 'for_sale', price: 100, ...extra }) as Property;

// SPEC:SEO-008 — the heading describes the search, not the advertiser's headline.
describe('buildSearchHeading', () => {
  it('leads with what the listing is, the operation and the city', () => {
    expect(buildSearchHeading(base({ city: 'Quito' }))).toBe('Casa de venta en Quito');
  });

  it('appends the two details people filter by', () => {
    const heading = buildSearchHeading(base({ city: 'Quito', rooms: 3, area: 180 }));
    expect(heading).toBe('Casa de venta en Quito · 3 dormitorios · 180 m²');
  });

  it('says dormitorio in singular', () => {
    expect(buildSearchHeading(base({ city: 'Loja', rooms: 1 }))).toContain('1 dormitorio');
  });

  it('drops every part the listing does not declare', () => {
    expect(buildSearchHeading(base({ property_type: '', status: '' }))).toBe('Propiedad');
  });

  it('ignores an area that is zero, empty or not a number', () => {
    expect(buildSearchHeading(base({ city: 'Cuenca', area: 0 }))).toBe('Casa de venta en Cuenca');
    expect(buildSearchHeading(base({ city: 'Cuenca', area: '' }))).toBe('Casa de venta en Cuenca');
  });

  it('accepts an area that travels as a string', () => {
    expect(buildSearchHeading(base({ city: 'Manta', area: '250.00' }))).toContain('250 m²');
  });
});

// SPEC:SEO-008 — an imported headline keeps its words, loses the shouting.
describe('softenShouting', () => {
  it('calms a headline written entirely in capitals', () => {
    expect(softenShouting('ESPECTACULAR TERRENO PARA CAMPOSANTO POMASQUI')).toBe(
      'Espectacular Terreno para Camposanto Pomasqui'
    );
  });

  it('leaves a normally written headline untouched', () => {
    const headline = 'Casa amplia en el sector de Cumbayá';
    expect(softenShouting(headline)).toBe(headline);
  });

  it('lowercases connectors and keeps the first word capitalised', () => {
    expect(softenShouting('VENDO CASA EN LA VIA A SALINAS')).toBe('Vendo Casa en la Via a Salinas');
  });

  it('leaves an acronym alone when the headline is not shouted', () => {
    expect(softenShouting('Casa en el sector NNUU')).toBe('Casa en el sector NNUU');
  });

  it('collapses whitespace and survives an empty headline', () => {
    expect(softenShouting('  Casa   grande  ')).toBe('Casa grande');
    expect(softenShouting('')).toBe('');
  });
});
