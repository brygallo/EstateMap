export interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
}

export interface MapNetworkProfile {
  constrained: boolean;
  cardDelayMs: number;
  cardPageSize: number;
  includeCardImages: boolean;
  mapPointLimit: number;
}

export function getMapNetworkProfile(connection?: NetworkInformationLike | null): MapNetworkProfile {
  const effectiveType = connection?.effectiveType?.toLowerCase() || '';
  const constrained = Boolean(connection?.saveData) || effectiveType === 'slow-2g' || effectiveType === '2g';

  return constrained
    ? {
        constrained: true,
        cardDelayMs: 1_400,
        cardPageSize: 6,
        includeCardImages: false,
        mapPointLimit: 700,
      }
    : {
        constrained: false,
        cardDelayMs: 750,
        cardPageSize: 20,
        includeCardImages: true,
        mapPointLimit: 1_400,
      };
}

export function readMapNetworkProfile(): MapNetworkProfile {
  if (typeof navigator === 'undefined') return getMapNetworkProfile();
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return getMapNetworkProfile(connection);
}
