'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';

type LatLng = { lat: number; lng: number };
type MapRef = React.MutableRefObject<any>;

/**
 * Encapsula toda la lógica de geolocalización del mapa: el modal de permiso en
 * la primera visita, la recuperación automática en visitas posteriores, el
 * botón "mi ubicación" y el toast de carga. Mueve el mapa a través de `mapRef`.
 */
export function useGeolocation(mapRef: MapRef) {
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationToast, setShowLocationToast] = useState(false);

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
    const hasInitialLocation = localStorage.getItem('hasInitialLocation');

    if (!permissionAsked && !hasInitialLocation) {
      const t = setTimeout(() => setShowLocationModal(true), 500);
      return () => clearTimeout(t);
    }

    if (hasInitialLocation === 'true' && navigator.geolocation) {
      setLoadingLocation(true);
      setShowLocationToast(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          flyTo(latitude, longitude, 12, 1000);
          setLoadingLocation(false);
          setTimeout(() => setShowLocationToast(false), 2000);
        },
        () => {
          setLoadingLocation(false);
          setShowLocationToast(false);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAcceptLocation = useCallback(async () => {
    setShowLocationModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
    }

    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        if (status.state === 'denied') {
          toast.error('El permiso de ubicación está bloqueado. Habilítalo desde la configuración de tu navegador.');
          return;
        }
      } catch {
        // Permissions API no soportada (iOS Safari): continuar igualmente.
      }
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        flyTo(latitude, longitude, 12);
        if (typeof window !== 'undefined') {
          localStorage.setItem('hasInitialLocation', 'true');
        }
        setLoadingLocation(false);
      },
      (error) => {
        toast.error(geoErrorMessage(error));
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [flyTo]);

  const handleDeclineLocation = useCallback(() => {
    setShowLocationModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
      localStorage.setItem('hasInitialLocation', 'false');
    }
  }, []);

  const handleGetMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        flyTo(latitude, longitude, 17);
        setLoadingLocation(false);
      },
      (error) => {
        toast.error(geoErrorMessage(error));
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [flyTo]);

  return {
    userLocation,
    loadingLocation,
    showLocationModal,
    showLocationToast,
    handleAcceptLocation,
    handleDeclineLocation,
    handleGetMyLocation,
  };
}
