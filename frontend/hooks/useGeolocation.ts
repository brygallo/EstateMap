'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast, type ExternalToast } from 'sonner';
import type { Property } from '@/lib/types';
import { getPropertyViewportDecision, isPointInEcuadorBounds, type LatLngPoint } from '@/lib/geo';
import {
  LOCATION_STORAGE_KEYS,
  geolocationErrorMessage,
  getGeolocationPermission,
  getLastSuccessfulLocation,
  hasPreviousLocationSuccess,
  markLocationSuccess,
  requestBrowserLocation,
  safeStorageSet,
  wasLocationPromptDismissed,
  watchGeolocationPermission,
} from '@/lib/browser-geolocation';

type MapRef = React.MutableRefObject<any>;
type PendingAdaptiveLocation = { location: LatLngPoint; readyAt: number };

const LOCATION_DISCOVERY_ZOOM = 10;
const ADAPTIVE_ZOOM_DELAY_MS = 1200;

/**
 * Encapsula toda la lógica de geolocalización del mapa: el modal de permiso en
 * la primera visita, la recuperación automática en visitas posteriores, el
 * botón "mi ubicación" y el toast de carga. Mueve el mapa a través de `mapRef`.
 */
export function useGeolocation(
  mapRef: MapRef,
  properties: Property[] = [],
  propertiesLoading = false
) {
  const [userLocation, setUserLocation] = useState<LatLngPoint | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [nearbyPropertyCount, setNearbyPropertyCount] = useState(0);
  const [adaptiveZoomTick, setAdaptiveZoomTick] = useState(0);
  const locationToastIdRef = useRef<string | number | null>(null);
  const pendingAdaptiveLocationRef = useRef<PendingAdaptiveLocation | null>(null);

  const toastOptions: ExternalToast = {
    duration: 2800,
    position: 'top-center',
  };

  const notifyLocationLoading = useCallback((message = 'Buscando tu ubicación…') => {
    if (locationToastIdRef.current) toast.dismiss(locationToastIdRef.current);
    locationToastIdRef.current = toast.loading(message, {
      position: 'top-center',
    });
  }, []);

  const notifyLocationSuccess = useCallback((message: string) => {
    const id = locationToastIdRef.current;
    if (id) {
      toast.success(message, { ...toastOptions, id });
    } else {
      toast.success(message, toastOptions);
    }
    locationToastIdRef.current = null;
  }, []);

  const notifyLocationError = useCallback((message: string) => {
    const id = locationToastIdRef.current;
    if (id) {
      toast.error(message, { ...toastOptions, duration: 6000, id });
    } else {
      toast.error(message, { ...toastOptions, duration: 6000 });
    }
    locationToastIdRef.current = null;
  }, []);

  const notifyOutsideCoverage = useCallback(() => {
    const id = locationToastIdRef.current;
    toast.info(
      'Todavía no tenemos propiedades en tu zona. Navega por el mapa para ver propiedades disponibles en Ecuador.',
      { ...toastOptions, duration: 6500, ...(id ? { id } : {}) }
    );
    locationToastIdRef.current = null;
  }, []);

  const flyTo = useCallback(
    (lat: number, lng: number, zoom: number, delay = 0) => {
      const doFly = () => {
        if (mapRef.current) {
          if (typeof mapRef.current.fitBounds === 'function' && typeof mapRef.current.flyToBounds !== 'function') {
            mapRef.current.flyTo({ center: [lng, lat], zoom, duration: 520 });
          } else {
            mapRef.current.flyTo([lat, lng], zoom, { duration: 0.6 });
          }
        }
      };
      if (delay) setTimeout(doFly, delay);
      else doFly();
    },
    [mapRef]
  );

  const centerOnLocation = useCallback(
    (lat: number, lng: number, delay = 0) => {
      const location = { lat, lng };
      pendingAdaptiveLocationRef.current = {
        location,
        readyAt: Date.now() + delay + ADAPTIVE_ZOOM_DELAY_MS,
      };
      setAdaptiveZoomTick((current) => current + 1);
      flyTo(lat, lng, LOCATION_DISCOVERY_ZOOM, delay);
    },
    [flyTo]
  );

  useEffect(() => {
    const pending = pendingAdaptiveLocationRef.current;
    if (!pending || !mapRef.current) return;

    const waitMs = pending.readyAt - Date.now();
    if (waitMs > 0) {
      const timer = setTimeout(() => setAdaptiveZoomTick((current) => current + 1), waitMs);
      return () => clearTimeout(timer);
    }

    if (propertiesLoading) return;

    const { location } = pending;
    const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    const decision = getPropertyViewportDecision(location, properties, mobile);
    const zoom = decision.zoom;
    setNearbyPropertyCount(decision.count);
    pendingAdaptiveLocationRef.current = null;
    if (zoom !== mapRef.current.getZoom?.()) {
      flyTo(location.lat, location.lng, zoom);
    }
    if (decision.count > 0) {
      toast.success(
        `${decision.count} ${decision.count === 1 ? 'propiedad encontrada' : 'propiedades encontradas'} cerca de ti`,
        toastOptions
      );
    }
  }, [adaptiveZoomTick, flyTo, mapRef, properties, propertiesLoading]);

  const handleAcceptLocation = useCallback(async () => {
    setShowLocationModal(false);
    safeStorageSet(LOCATION_STORAGE_KEYS.mapPromptDismissed, 'true');

    if (!navigator.geolocation) {
      notifyLocationError('Tu navegador no soporta geolocalización');
      return;
    }

    if (await getGeolocationPermission() === 'denied') {
      setLocationBlocked(true);
      notifyLocationError('La ubicación está bloqueada. Toca el botón de ubicación para ver cómo activarla.');
      return;
    }

    setLoadingLocation(true);
    notifyLocationLoading();
    try {
      const position = await requestBrowserLocation('discovery');
      const { latitude, longitude, accuracy: acc } = position.coords;
      if (!isPointInEcuadorBounds(latitude, longitude)) {
        setUserLocation(null);
        setAccuracy(null);
        setLocationBlocked(false);
        notifyOutsideCoverage();
        return;
      }
      setUserLocation({ lat: latitude, lng: longitude });
      setAccuracy(typeof acc === 'number' ? acc : null);
      centerOnLocation(latitude, longitude);
      markLocationSuccess(latitude, longitude);
      setLocationBlocked(false);
      notifyLocationSuccess('Ubicación encontrada');
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (geoError.code === 1) setLocationBlocked(true);
      notifyLocationError(geolocationErrorMessage(error));
    } finally {
      setLoadingLocation(false);
    }
  }, [centerOnLocation, notifyLocationError, notifyLocationLoading, notifyLocationSuccess, notifyOutsideCoverage]);

  // El aviso propio de la aplicación solo se muestra antes de la primera
  // decisión. Si el navegador ya tiene el permiso (o ya obtuvimos una
  // ubicación anteriormente), ubicamos el mapa directamente. Esto evita que
  // en móvil se vuelva a pedir permiso en cada visita.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let modalTimer: ReturnType<typeof setTimeout> | undefined;

    const initializeLocation = async () => {
      const permissionAsked = wasLocationPromptDismissed(LOCATION_STORAGE_KEYS.mapPromptDismissed);
      const permissionGranted = await getGeolocationPermission() === 'granted';

      if (cancelled) return;

      if (permissionGranted || hasPreviousLocationSuccess()) {
        const cachedLocation = getLastSuccessfulLocation();
        if (cachedLocation) {
          setUserLocation(cachedLocation);
          centerOnLocation(cachedLocation.lat, cachedLocation.lng);
        }
        void handleAcceptLocation();
        return;
      }

      if (!permissionAsked) {
        modalTimer = setTimeout(() => {
          if (!cancelled) setShowLocationModal(true);
        }, 500);
      }
    };

    void initializeLocation();

    return () => {
      cancelled = true;
      if (modalTimer) clearTimeout(modalTimer);
    };
  }, [handleAcceptLocation]);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;
    void watchGeolocationPermission((state) => {
      if (cancelled) return;
      setLocationBlocked(state === 'denied');
      if (state === 'granted') setShowLocationModal(false);
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const handleDeclineLocation = useCallback(() => {
    setShowLocationModal(false);
    safeStorageSet(LOCATION_STORAGE_KEYS.mapPromptDismissed, 'true');
  }, []);

  const handleGetMyLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      notifyLocationError('Tu navegador no soporta geolocalización.');
      return;
    }
    if (locationBlocked) {
      setShowLocationModal(true);
      return;
    }
    setLoadingLocation(true);
    notifyLocationLoading();
    try {
      const position = await requestBrowserLocation('discovery');
      const { latitude, longitude, accuracy: acc } = position.coords;
      if (!isPointInEcuadorBounds(latitude, longitude)) {
        setUserLocation(null);
        setAccuracy(null);
        setLocationBlocked(false);
        notifyOutsideCoverage();
        return;
      }
      setUserLocation({ lat: latitude, lng: longitude });
      setAccuracy(typeof acc === 'number' ? acc : null);
      centerOnLocation(latitude, longitude);
      markLocationSuccess(latitude, longitude);
      setLocationBlocked(false);
      notifyLocationSuccess('Ubicación encontrada');
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (geoError.code === 1) setLocationBlocked(true);
      notifyLocationError(geolocationErrorMessage(error));
    } finally {
      setLoadingLocation(false);
    }
  }, [centerOnLocation, locationBlocked, notifyLocationError, notifyLocationLoading, notifyLocationSuccess, notifyOutsideCoverage]);

  return {
    userLocation,
    accuracy,
    loadingLocation,
    showLocationModal,
    locationBlocked,
    nearbyPropertyCount,
    handleAcceptLocation,
    handleDeclineLocation,
    handleGetMyLocation,
  };
}
