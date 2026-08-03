export type GeolocationPermissionState = PermissionState | 'unsupported';
export type GeolocationPurpose = 'discovery' | 'precise';

export const LOCATION_STORAGE_KEYS = {
  mapPromptDismissed: 'mapLocationPromptDismissed',
  publicationPromptDismissed: 'publicationLocationPromptDismissed',
  lastSuccessAt: 'locationLastSuccessAt',
  lastLatitude: 'locationLastLatitude',
  lastLongitude: 'locationLastLongitude',
} as const;

let pendingRequest: Promise<GeolocationPosition> | null = null;

export function safeStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // La aplicación puede seguir funcionando sin persistencia (p. ej. modo privado).
  }
}

export function markLocationSuccess(latitude?: number, longitude?: number): void {
  safeStorageSet(LOCATION_STORAGE_KEYS.lastSuccessAt, Date.now().toString());
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    safeStorageSet(LOCATION_STORAGE_KEYS.lastLatitude, String(latitude));
    safeStorageSet(LOCATION_STORAGE_KEYS.lastLongitude, String(longitude));
  }
}

export function getLastSuccessfulLocation(): { lat: number; lng: number } | null {
  const storedLatitude = safeStorageGet(LOCATION_STORAGE_KEYS.lastLatitude);
  const storedLongitude = safeStorageGet(LOCATION_STORAGE_KEYS.lastLongitude);
  if (storedLatitude == null || storedLongitude == null) return null;
  const lat = Number(storedLatitude);
  const lng = Number(storedLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function hasPreviousLocationSuccess(): boolean {
  const value = Number(safeStorageGet(LOCATION_STORAGE_KEYS.lastSuccessAt));
  if (Number.isFinite(value) && value > 0) return true;

  // Compatibilidad con usuarios que visitaron el sitio antes de separar las claves.
  return safeStorageGet('hasInitialLocation') === 'true';
}

export function wasLocationPromptDismissed(key: string): boolean {
  if (safeStorageGet(key) === 'true') return true;
  // La clave anterior sigue evitando que usuarios existentes vean el aviso otra vez.
  return safeStorageGet('locationPermissionAsked') === 'true';
}

export async function getGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
}

export async function watchGeolocationPermission(
  onChange: (state: PermissionState) => void
): Promise<() => void> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return () => undefined;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    const handler = () => onChange(status.state);
    status.addEventListener('change', handler);
    return () => status.removeEventListener('change', handler);
  } catch {
    return () => undefined;
  }
}

function readPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function requestBrowserLocation(
  purpose: GeolocationPurpose = 'discovery'
): Promise<GeolocationPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.reject(new Error('GEOLOCATION_UNSUPPORTED'));
  }
  if (pendingRequest) return pendingRequest;

  const primaryOptions: PositionOptions = purpose === 'precise'
    ? { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    : { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 };

  pendingRequest = readPosition(primaryOptions)
    .catch((error: GeolocationPositionError) => {
      // Un segundo intento menos exigente ayuda cuando el GPS tarda, pero nunca
      // repetimos una solicitud que fue rechazada por permisos.
      if (purpose === 'precise' && error.code !== error.PERMISSION_DENIED) {
        return readPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
      }
      throw error;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}

export function geolocationErrorMessage(error: unknown): string {
  const geoError = error as GeolocationPositionError;
  switch (geoError?.code) {
    case 1: // GeolocationPositionError.PERMISSION_DENIED
      return 'La ubicación está bloqueada. Permítela en la configuración del sitio e intenta de nuevo.';
    case 2: // GeolocationPositionError.POSITION_UNAVAILABLE
      return 'No encontramos tu ubicación. Activa la localización del dispositivo o busca una ciudad.';
    case 3: // GeolocationPositionError.TIMEOUT
      return 'La ubicación tardó demasiado. Verifica tu señal e intenta nuevamente.';
    default:
      return error instanceof Error && error.message === 'GEOLOCATION_UNSUPPORTED'
        ? 'Tu navegador no soporta geolocalización.'
        : 'No se pudo obtener tu ubicación.';
  }
}
