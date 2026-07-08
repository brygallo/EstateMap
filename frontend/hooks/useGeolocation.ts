'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast, type ExternalToast } from 'sonner';
import type { Property } from '@/lib/types';
import { distanceKm, getPropertyPoint, type LatLngPoint } from '@/lib/geo';

type MapRef = React.MutableRefObject<any>;
type PendingAdaptiveLocation = { location: LatLngPoint; readyAt: number };

const LOCATION_DISCOVERY_ZOOM = 10;
const ADAPTIVE_ZOOM_DELAY_MS = 1200;

const getAdaptiveLocationZoom = (location: LatLngPoint, properties: Property[]) => {
  const distances = properties
    .map((property) => {
      const point = getPropertyPoint(property);
      return point ? distanceKm(location, point) : null;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b);

  if (distances.length === 0) return LOCATION_DISCOVERY_ZOOM;

  const within2Km = distances.filter((distance) => distance <= 2).length;
  const within5Km = distances.filter((distance) => distance <= 5).length;
  const nearest = distances[0];

  if (within2Km >= 5) return 15;
  if (within5Km >= 8 || nearest <= 1.5) return 14;
  if (nearest <= 5) return 13;
  if (nearest <= 12) return 12;
  if (nearest <= 30) return 11;
  return LOCATION_DISCOVERY_ZOOM;
};

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

  const flyTo = useCallback(
    (lat: number, lng: number, zoom: number, delay = 0) => {
      const doFly = () => {
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
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
    const zoom = getAdaptiveLocationZoom(location, properties);
    pendingAdaptiveLocationRef.current = null;
    if (zoom !== mapRef.current.getZoom?.()) {
      flyTo(location.lat, location.lng, zoom);
    }
  }, [adaptiveZoomTick, flyTo, mapRef, properties, propertiesLoading]);

  const geoErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permiso de ubicación denegado. Habilítalo desde la configuración de tu navegador.';
      case error.POSITION_UNAVAILABLE:
        return 'Ubicación no disponible. Activa los servicios de ubicación en tu dispositivo.';
      case error.TIMEOUT:
        return 'Se agotó el tiempo de espera. Verifica tu señal GPS o Wi-Fi e intenta de nuevo.';
      default:
        return 'No se pudo obtener tu ubicación';
    }
  };

  // Decidir si mostrar el modal de permiso o recuperar ubicación automáticamente.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const permissionAsked = localStorage.getItem('locationPermissionAsked');

    if (!permissionAsked) {
      const t = setTimeout(() => setShowLocationModal(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleAcceptLocation = useCallback(async () => {
    setShowLocationModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
    }

    if (!navigator.geolocation) {
      notifyLocationError('Tu navegador no soporta geolocalización');
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        if (status.state === 'denied') {
          notifyLocationError('El permiso de ubicación está bloqueado. Habilítalo desde la configuración de tu navegador.');
          return;
        }
      } catch {
        // Permissions API no soportada (iOS Safari): continuar igualmente.
      }
    }

    setLoadingLocation(true);
    notifyLocationLoading();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setAccuracy(typeof acc === 'number' ? acc : null);
        centerOnLocation(latitude, longitude);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hasInitialLocation', 'true');
        }
        setLoadingLocation(false);
        setLocationBlocked(false);
        notifyLocationSuccess('Ubicación encontrada');
      },
      (error) => {
        setLoadingLocation(false);
        notifyLocationError(geoErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [centerOnLocation, notifyLocationError, notifyLocationLoading, notifyLocationSuccess]);

  const handleDeclineLocation = useCallback(() => {
    setShowLocationModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
      localStorage.setItem('hasInitialLocation', 'false');
    }
  }, []);

  const handleGetMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      notifyLocationError('Tu navegador no soporta geolocalización.');
      return;
    }
    setLoadingLocation(true);
    notifyLocationLoading();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setAccuracy(typeof acc === 'number' ? acc : null);
        centerOnLocation(latitude, longitude);
        setLoadingLocation(false);
        setLocationBlocked(false);
        notifyLocationSuccess('Ubicación encontrada');
      },
      (error) => {
        setLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) setLocationBlocked(true);
        notifyLocationError(geoErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [centerOnLocation, notifyLocationError, notifyLocationLoading, notifyLocationSuccess]);

  return {
    userLocation,
    accuracy,
    loadingLocation,
    showLocationModal,
    locationBlocked,
    handleAcceptLocation,
    handleDeclineLocation,
    handleGetMyLocation,
  };
}
