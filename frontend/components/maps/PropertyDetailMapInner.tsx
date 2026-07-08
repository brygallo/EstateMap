'use client';

import { MapContainer, TileLayer, Polygon, Marker, useMap, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import LayerSwitch, { type MapLayer } from '@/components/map/LayerSwitch';
import { statusColor, statusMarker } from '@/lib/mapMarkers';

// Fix default marker icon issue with webpack
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

export interface PropertyDetailMapProps {
  latitude: number;
  longitude: number;
  polygon?: any;
  status?: string;
  price?: number | string | null;
  title?: string | null;
}

// Convierte el polígono (GeoJSON [lng,lat] o array simple [lat,lng]) al formato
// de Leaflet [lat, lng].
function toLeafletCoordinates(polygon: any): [number, number][] | null {
  if (polygon?.coordinates?.[0]) {
    return polygon.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
  }
  if (Array.isArray(polygon) && polygon.length >= 3) {
    return polygon as [number, number][];
  }
  return null;
}

// Encuadra el mapa sobre la propiedad (polígono o punto) al montar.
function FitToProperty({
  coordinates,
  center,
}: {
  coordinates: [number, number][] | null;
  center: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    const fitMap = () => {
      map.invalidateSize();
      if (coordinates && coordinates.length >= 3) {
        const bounds = L.latLngBounds(coordinates.map(([lat, lng]) => L.latLng(lat, lng)));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
      } else {
        map.setView(center, 16);
      }
    };

    fitMap();
    const resizeTimer = window.setTimeout(fitMap, 120);
    const settleTimer = window.setTimeout(fitMap, 450);

    return () => {
      window.clearTimeout(resizeTimer);
      window.clearTimeout(settleTimer);
    };
  }, [map, coordinates, center]);

  return null;
}

const PropertyDetailMapInner = ({
  latitude,
  longitude,
  polygon,
  status,
  price,
  title,
}: PropertyDetailMapProps) => {
  const [activeLayer, setActiveLayer] = useState<MapLayer>('streets');
  const toggleLayer = () =>
    setActiveLayer((prev) => (prev === 'satellite' ? 'streets' : 'satellite'));

  const coordinates = useMemo(() => toLeafletCoordinates(polygon), [polygon]);
  const center: [number, number] = [latitude, longitude];

  // Colores alineados con la home: verde profundo (venta), dorado (alquiler),
  // gris neutro (inactivo).
  const baseColor = statusColor(status);
  const priceGradient = statusMarker(status).gradient;

  const formattedPrice = price
    ? `$${parseFloat(String(price)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : null;

  // Posición de la etiqueta de precio: centroide del polígono o el propio punto.
  const labelPosition = useMemo<[number, number]>(() => {
    if (coordinates) {
      try {
        const ring = coordinates.map(([lat, lng]) => [lng, lat]);
        ring.push(ring[0]);
        const centroid = turf.centroid(turf.polygon([ring]));
        return [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
      } catch {
        return coordinates[0];
      }
    }
    return center;
  }, [coordinates, center]);

  const markerIcon = useMemo(() => {
    if (coordinates) return null;
    return new L.Icon({
      iconUrl:
        'data:image/svg+xml;base64,' +
        btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${baseColor}" width="32" height="32">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        `),
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, [coordinates, baseColor]);

  const priceIcon = useMemo(() => {
    if (!formattedPrice) return null;
    return new L.DivIcon({
      className: 'price-label-icon',
      html: `
        <div style="display:flex;align-items:center;justify-content:center;">
          <div style="
            background:${priceGradient};
            color:#fff;
            padding:4px 9px;
            border-radius:999px;
            font-weight:700;
            font-size:12px;
            line-height:1.1;
            white-space:nowrap;
            box-shadow:0 4px 12px rgba(32,45,40,0.24);
            border:2px solid #ffffff;
            text-shadow:0 1px 2px rgba(0,0,0,0.28);
            font-family:var(--font-geist-mono), ui-monospace, 'SFMono-Regular', monospace;
            font-variant-numeric:tabular-nums;
            transform:translate(-50%, -50%);
          ">${formattedPrice}</div>
        </div>
      `,
      iconSize: [1, 1],
      iconAnchor: [0, 0],
    });
  }, [formattedPrice, priceGradient]);

  return (
    <>
      <style>{`
        .price-label-icon { background: transparent !important; border: none !important; }
      `}</style>
      <MapContainer
        center={center}
        zoom={16}
        maxZoom={21}
        scrollWheelZoom={false}
        className="h-64 w-full relative z-0"
        preferCanvas
      >
        {activeLayer === 'streets' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains={['a', 'b', 'c', 'd']}
            maxZoom={21}
            maxNativeZoom={20}
          />
        )}
        {activeLayer === 'satellite' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            maxZoom={21}
            maxNativeZoom={18}
          />
        )}

        <LayerSwitch active={activeLayer} onToggle={toggleLayer} />
        <ScaleControl position="bottomright" metric imperial={false} maxWidth={120} />
        <FitToProperty coordinates={coordinates} center={center} />

        {coordinates ? (
          <Polygon
            positions={coordinates}
            pathOptions={{ color: baseColor, fillOpacity: 0.25, weight: 2.5 }}
          />
        ) : (
          markerIcon && <Marker position={center} icon={markerIcon} keyboard={false} alt={title || ''} />
        )}

        {priceIcon && <Marker position={labelPosition} icon={priceIcon} interactive={false} keyboard={false} alt="" zIndexOffset={500} />}
      </MapContainer>
    </>
  );
};

export default PropertyDetailMapInner;
