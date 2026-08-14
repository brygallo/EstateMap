import { describe, expect, it } from 'vitest';
import { getMapNetworkProfile } from './network-profile';

describe('getMapNetworkProfile', () => {
  it('keeps the full map experience on an unconstrained connection', () => {
    expect(getMapNetworkProfile({ effectiveType: '4g' })).toMatchObject({
      constrained: false,
      includeCardImages: true,
      mapPointLimit: 1_400,
    });
  });

  it.each([{ effectiveType: 'slow-2g' }, { effectiveType: '2g' }, { saveData: true }])(
    'prioritizes map points when the connection is constrained: %o',
    (connection) => {
      expect(getMapNetworkProfile(connection)).toMatchObject({
        constrained: true,
        includeCardImages: false,
        mapPointLimit: 700,
      });
    }
  );
});
