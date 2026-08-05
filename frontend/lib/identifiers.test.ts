import { describe, expect, it } from 'vitest';
import { sameIdentifier } from './identifiers';

describe('sameIdentifier', () => {
  it('matches a numeric API owner with a string JWT user id', () => {
    expect(sameIdentifier(31, '31')).toBe(true);
  });

  it('rejects different and missing identifiers', () => {
    expect(sameIdentifier(31, '32')).toBe(false);
    expect(sameIdentifier(null, null)).toBe(false);
    expect(sameIdentifier(undefined, '31')).toBe(false);
  });
});
