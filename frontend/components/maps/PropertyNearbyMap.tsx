'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MapBounds, MapPropertyItem, Property } from '@/lib/types';
import { getPropertyMapCamera, getPropertyPoint } from '@/lib/geo';

const GeneralMap = dynamic(() => import('./MapLibreMap'), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse bg-muted" />,
});

interface PropertyNearbyMapProps {
  property: Property;
  nearbyProperties: Property[];
}

export default function PropertyNearbyMap({ property, nearbyProperties }: PropertyNearbyMapProps) {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [zoom, setZoom] = useState(12);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const initialProperties = useMemo(
    () => [property, ...nearbyProperties].map((item) => ({ ...item, is_card_result: true })),
    [property, nearbyProperties]
  );
  const [mapProperties, setMapProperties] = useState<MapPropertyItem[]>(initialProperties);
  const properties = useMemo(() => {
    const withoutCurrent = mapProperties.filter((item) =>
      (item as any).is_cluster || String(item.id) !== String(property.id)
    );
    return [{ ...property, is_card_result: true }, ...withoutCurrent];
  }, [mapProperties, property]);
  const centerPoint = getPropertyPoint(property) ?? getPropertyPoint(nearbyProperties[0]);
  const center: [number, number] = centerPoint ? [centerPoint.lat, centerPoint.lng] : [-1.8312, -78.1834];

  useEffect(() => {
    setMapProperties(initialProperties);
  }, [initialProperties]);

  // Match the main map: each viewport requests only the points or clusters
  // within the visible area instead of downloading the full catalog.
  useEffect(() => {
    if (!bounds) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingProperties(true);
      try {
        const { apiFetch } = await import('@/lib/api');
        const params = new URLSearchParams({
          bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
          zoom: String(zoom),
          limit: zoom <= 9.2 ? '900' : '1400',
        });
        const response = await apiFetch(`/properties/map_points/?${params}`, {
          skipAuth: true,
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = await response.json();
        const items: MapPropertyItem[] = Array.isArray(payload)
          ? payload
          : payload.items ?? payload.results ?? [];
        setMapProperties(items);
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.error('Could not load map properties:', error);
      } finally {
        if (!controller.signal.aborted) setLoadingProperties(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bounds, zoom]);

  const handleMapReady = useCallback((map: any) => {
    mapRef.current = map;
    const selectedPoint = getPropertyPoint(property);
    if (!selectedPoint) return;
    const nearbyPoints = properties
      .filter((item) => String(item.id) !== String(property.id))
      .map(getPropertyPoint)
      .filter(Boolean) as Array<{ lat: number; lng: number }>;
    const camera = getPropertyMapCamera(selectedPoint, nearbyPoints);

    if (camera.mode === 'center') {
      map.jumpTo({ center: camera.center, zoom: camera.zoom });
      return;
    }

    map.fitBounds(camera.bounds, {
      padding: 64,
      maxZoom: camera.maxZoom,
      duration: 0,
    });
  }, [properties, property]);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationBlocked(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(next);
        setLocationBlocked(false);
        setLocating(false);
        mapRef.current?.easeTo({ center: [next.lng, next.lat], zoom: 15 });
      },
      () => {
        setLocationBlocked(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return (
    <div className="relative h-[52dvh] min-h-[380px] w-full lg:min-h-[500px]" aria-label="Mapa de la propiedad y publicaciones cercanas">
      <GeneralMap
        filteredProperties={properties}
        selectedProperty={property}
        userLocation={userLocation}
        onMapReady={handleMapReady}
        onVisiblePropertiesChange={() => undefined}
        onBoundsChange={setBounds}
        onZoomChange={setZoom}
        onPolygonClick={(selected) => {
          if (selected?.id != null && String(selected.id) !== String(property.id)) {
            router.push(`/propiedad/${selected.id}`);
          }
        }}
        onLocate={handleLocate}
        locating={locating}
        locationBlocked={locationBlocked}
        isRefreshing={loadingProperties}
        center={center}
      />
    </div>
  );
}
