import { describe, expect, it } from 'vitest';
import { getMapFeatureProperty } from './map-feature';

describe('getMapFeatureProperty', () => {
  it('resolves a tapped polygon even when MapLibre serializes its id', () => {
    const property = { id: 42, title: 'Lote' };
    expect(getMapFeatureProperty([property], '42')).toBe(property);
  });

  it('ignores a feature that is no longer in the current map payload', () => {
    expect(getMapFeatureProperty([{ id: 42 }], 99)).toBeNull();
  });
});
