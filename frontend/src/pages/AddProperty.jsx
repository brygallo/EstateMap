// src/pages/AddProperty.jsx
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import * as turf from '@turf/turf';

// Fix Leaflet icons (Vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const defaultCenter = [-2.31194, -78.124395]; // Macas

/* ===================== Utils ===================== */
const metersBetween = (a, b) => {
  const km = turf.length(
    turf.lineString([[a.lng, a.lat], [b.lng, b.lat]]),
    { units: 'kilometers' }
  );
  return km * 1000;
};
const formatM = (m) => `${(Math.round(m * 100) / 100).toFixed(2)} m`;
const formatAreaM2 = (m2) => (Math.round(m2 * 100) / 100).toFixed(2);

/* ===================== Dibujo & medición ===================== */
function DrawingTools({ onPolygonChange, onAreaChange }) {
  const map = useMap();

  const currentPolygonRef = useRef(null);
  const drawingRef = useRef({
    active: false,
    workingLayer: null,
  });
  const liveTooltipRef = useRef(null); // ← tooltip que sigue al cursor

  const metersBetween = (a, b) => {
    const km = turf.length(turf.lineString([[a.lng, a.lat], [b.lng, b.lat]]), { units: 'kilometers' });
    return km * 1000;
  };
  const formatM = (m) => `${(Math.round(m * 100) / 100).toFixed(2)} m`;

  /* ===== Helpers: edge labels / area / estilo ===== */
  const clearEdgeLabels = (layer) => {
    if (layer?._edgeMarkers) {
      layer._edgeMarkers.forEach((m) => m.remove());
      layer._edgeMarkers = [];
    }
  };
  const refreshEdgeLabels = (layer) => {
    clearEdgeLabels(layer);
    layer._edgeMarkers = [];
    const ring = layer.getLatLngs()?.[0] || [];
    if (ring.length < 2) return;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const m = metersBetween(a, b);
      const pos = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
      const marker = L.marker(pos, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'edge-label',
          html: `<div class="edge-badge">${formatM(m)}</div>`,
        }),
      }).addTo(map);
      layer._edgeMarkers.push(marker);
    }
  };
  const updateAreaAndCoords = (layer) => {
    const ring = layer.getLatLngs()?.[0] || [];
    onPolygonChange?.(ring.map((p) => [p.lat, p.lng]));
    if (ring.length >= 3) {
      const coords = ring.map((p) => [p.lng, p.lat]);
      const a = turf.area(turf.polygon([[...coords, coords[0]]]));
      onAreaChange?.(a);
    } else {
      onAreaChange?.(0);
    }
  };
  const stylePolygon = (layer) => {
    layer.setStyle?.({
      color: '#2b8a3e',
      weight: 2.5,
      fillOpacity: 0.15,
      lineJoin: 'round',
      lineCap: 'round',
    });
  };
  const bindFinalPolygon = (layer) => {
    currentPolygonRef.current = layer;
    stylePolygon(layer);
    refreshEdgeLabels(layer);
    updateAreaAndCoords(layer);
    layer.on('pm:edit', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:vertexadded', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:markerdrag', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
  };

  /* ===== Tooltip en vivo durante el dibujo ===== */
  const ensureLiveTooltip = () => {
    if (!liveTooltipRef.current) {
      liveTooltipRef.current = L.tooltip({
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'live-measure-tt',
        opacity: 0.95,
      }).setContent('0.00 m').setLatLng(map.getCenter()).addTo(map);
    }
  };
  const removeLiveTooltip = () => {
    if (liveTooltipRef.current) {
      map.removeLayer(liveTooltipRef.current);
      liveTooltipRef.current = null;
    }
  };

  useEffect(() => {
    // Controles
    map.pm.addControls({
      position: 'topleft',
      drawPolygon: true,
      editMode: true,
      removalMode: true,
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      cutPolygon: false,
      dragMode: false,
      rotateMode: false,
    });
    map.pm.setGlobalOptions({
      tooltips: true,
      snappable: true,
      snapDistance: 20,
      finishOnDoubleClick: true,
      allowSelfIntersection: false,
      templineStyle: { color: '#1971c2' },
      hintlineStyle: { color: '#1971c2', dashArray: [4, 4] },
    });

    /* === START dibujo === */
    const onDrawStart = (e) => {
      if (e.shape !== 'Polygon') return;

      // Un solo polígono
      if (currentPolygonRef.current && map.hasLayer(currentPolygonRef.current)) {
        clearEdgeLabels(currentPolygonRef.current);
        map.removeLayer(currentPolygonRef.current);
        currentPolygonRef.current = null;
        onPolygonChange?.([]);
        onAreaChange?.(0);
      }

      drawingRef.current.active = true;
      drawingRef.current.workingLayer = e.workingLayer || e.layer || null;
      ensureLiveTooltip();

      // cuando fijas un vértice, mostrará el último tramo fijado
      const wl = drawingRef.current.workingLayer;
      wl?.off('pm:vertexadded');
      wl?.on('pm:vertexadded', () => {
        const ring = wl.getLatLngs()?.[0] || [];
        if (ring.length >= 2 && liveTooltipRef.current) {
          const m = metersBetween(ring[ring.length - 2], ring[ring.length - 1]);
          liveTooltipRef.current.setContent(`${formatM(m)}`);
        }
      });
    };

    /* === MOVE mouse → último vértice confirmado → cursor === */
    const onMouseMove = (evt) => {
      if (!drawingRef.current.active || !liveTooltipRef.current) return;
      const wl = drawingRef.current.workingLayer;
      if (!wl) return;
      const ring = wl.getLatLngs()?.[0] || [];
      const last = ring[ring.length - 1];
      if (!last) return; // aún no hay al menos 1 segmento

      const segM = metersBetween(last, evt.latlng);
      liveTooltipRef.current.setLatLng(evt.latlng);
      liveTooltipRef.current.setContent(`${formatM(segM)}`);
    };

    /* === END dibujo === */
    const onDrawEnd = () => {
      drawingRef.current.active = false;
      drawingRef.current.workingLayer = null;
      removeLiveTooltip();
    };

    /* === Crear polígono final === */
    const onCreate = (e) => {
      if (e.shape !== 'Polygon') return;
      bindFinalPolygon(e.layer);
      removeLiveTooltip();
    };

    /* === Edit / Remove === */
    const onEdit = (e) => {
      e.layers.eachLayer((layer) => {
        if (layer === currentPolygonRef.current) {
          refreshEdgeLabels(layer);
          updateAreaAndCoords(layer);
        }
      });
    };
    const onRemove = (e) => {
      e.layers.eachLayer((layer) => {
        if (layer === currentPolygonRef.current) {
          clearEdgeLabels(layer);
          currentPolygonRef.current = null;
          onPolygonChange?.([]);
          onAreaChange?.(0);
        }
      });
      removeLiveTooltip();
    };

    // Bind
    map.on('pm:drawstart', onDrawStart);
    map.on('mousemove', onMouseMove);
    map.on('pm:drawend', onDrawEnd);
    map.on('pm:create', onCreate);
    map.on('pm:edit', onEdit);
    map.on('pm:remove', onRemove);
    try { map.pm.setLang('es'); } catch {}

    // Unbind
    return () => {
      map.off('pm:drawstart', onDrawStart);
      map.off('mousemove', onMouseMove);
      map.off('pm:drawend', onDrawEnd);
      map.off('pm:create', onCreate);
      map.off('pm:edit', onEdit);
      map.off('pm:remove', onRemove);
      removeLiveTooltip();
    };
  }, [map, onPolygonChange, onAreaChange]);

  return null;
}



/* ===================== Escala ===================== */
function ScaleBottomLeft() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.scale({ position: 'bottomleft', metric: true, imperial: false });
    control.addTo(map);
    return () => control.remove();
  }, [map]);
  return null;
}

/* ===================== HUD Área ===================== */
function AreaHud({ area }) {
  return (
    <div className="absolute top-3 right-3 z-[1000] bg-white/95 px-3 py-2 rounded-xl shadow text-sm font-semibold">
      Área total: {formatAreaM2(area)} m²
    </div>
  );
}

/* ===================== Página ===================== */
const AddProperty = () => {
  const [polygonCoords, setPolygonCoords] = useState([]); // [[lat,lng], ...]
  const [area, setArea] = useState(0);

  // General Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('land');
  const [status, setStatus] = useState('for_sale');

  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Macas');
  const [province, setProvince] = useState('Morona Santiago');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Characteristics
  const [builtArea, setBuiltArea] = useState('');
  const [rooms, setRooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [floors, setFloors] = useState('');
  const [furnished, setFurnished] = useState(false);
  const [yearBuilt, setYearBuilt] = useState('');

  // Financial Information
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [maintenanceFee, setMaintenanceFee] = useState('');

  // Contact
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const { token } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (polygonCoords.length < 3 && propertyType === 'land') {
      toast.error('Dibuja un polígono válido antes de guardar.');
      return;
    }
    try {
      const propertyData = {
        // General Information
        title,
        description,
        property_type: propertyType,
        status,

        // Location
        address,
        city,
        province,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        polygon: polygonCoords.length >= 3 ? polygonCoords : null,

        // Characteristics
        area: parseFloat(area),
        built_area: builtArea ? parseFloat(builtArea) : null,
        rooms: parseInt(rooms),
        bathrooms: parseInt(bathrooms),
        parking_spaces: parseInt(parkingSpaces),
        floors: floors ? parseInt(floors) : null,
        furnished,
        year_built: yearBuilt ? parseInt(yearBuilt) : null,

        // Financial Information
        price,
        currency,
        is_negotiable: isNegotiable,
        maintenance_fee: maintenanceFee ? maintenanceFee : null,

        // Contact
        contact_phone: contactPhone,
        contact_email: contactEmail,
      };

      const res = await fetch(`${API_URL}/properties/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(propertyData),
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error:', errorData);
        toast.error('No se pudo guardar la propiedad');
        return;
      }
      toast.success('Propiedad creada exitosamente');
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const handleClear = () => {
    const map = window._leaflet_map_ref;
    if (map) {
      map.eachLayer((layer) => {
        if (layer.pm && layer instanceof L.Polygon) {
          if (layer._edgeMarkers) layer._edgeMarkers.forEach((m) => m.remove());
          map.removeLayer(layer);
        }
      });
    }
    setPolygonCoords([]);
    setArea(0);
  };

  const bindMapRef = (map) => { window._leaflet_map_ref = map; };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nueva Propiedad</h1>
              <p className="text-sm text-gray-600 mt-1">Completa la información para registrar una nueva propiedad</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map Section */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Ubicación en el Mapa
                </h2>
                <p className="text-sm text-white/90 mt-1">
                  {propertyType === 'land' ? 'Dibuja el polígono del terreno' : 'Opcional: Dibuja el área de la propiedad'}
                </p>
              </div>
              <div className="relative h-[400px] lg:h-[500px]">
                <MapContainer
                  center={defaultCenter}
                  zoom={15}
                  maxZoom={20}
                  preferCanvas
                  className="h-full w-full"
                  whenCreated={bindMapRef}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    subdomains={['a','b','c','d']}
                    maxZoom={20}
                  />
                  <ScaleBottomLeft />
                  <AreaHud area={area} />
                  <DrawingTools
                    onPolygonChange={setPolygonCoords}
                    onAreaChange={setArea}
                  />
                </MapContainer>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t">
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpiar Polígono
                </button>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Information */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información General
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej: Casa moderna en zona residencial"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Propiedad *</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                        required
                      >
                        <option value="land">🏞️ Terreno</option>
                        <option value="house">🏠 Casa</option>
                        <option value="apartment">🏢 Apartamento</option>
                        <option value="commercial">🏪 Comercial</option>
                        <option value="other">📦 Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Estado *</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                        required
                      >
                        <option value="for_sale">💰 En Venta</option>
                        <option value="for_rent">🔑 En Alquiler</option>
                        <option value="sold">✅ Vendido</option>
                        <option value="rented">🏠 Alquilado</option>
                        <option value="inactive">⏸️ Inactivo</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe las características principales de la propiedad..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        rows="3"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ubicación
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej: Av. Principal #123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Macas"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Provincia</label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="Morona Santiago"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Characteristics */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Características
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Área Total (m²) *</label>
                      <input
                        type="number"
                        step="any"
                        value={formatAreaM2(area)}
                        onChange={(e) => setArea(Number(e.target.value || 0))}
                        placeholder="500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    {/* Campos para Casa, Apartamento o Comercial */}
                    {(propertyType === 'house' || propertyType === 'apartment' || propertyType === 'commercial') && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Área Construida (m²) *</label>
                          <input
                            type="number"
                            step="any"
                            value={builtArea}
                            onChange={(e) => setBuiltArea(e.target.value)}
                            placeholder="250"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            required
                          />
                        </div>
                        {propertyType !== 'commercial' && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Habitaciones *</label>
                            <input
                              type="number"
                              value={rooms}
                              onChange={(e) => setRooms(e.target.value)}
                              placeholder="3"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                              min="0"
                              required
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Baños *</label>
                          <input
                            type="number"
                            value={bathrooms}
                            onChange={(e) => setBathrooms(e.target.value)}
                            placeholder="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="0"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Campos específicos para Casa */}
                    {propertyType === 'house' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Pisos *</label>
                          <input
                            type="number"
                            value={floors}
                            onChange={(e) => setFloors(e.target.value)}
                            placeholder="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Estacionamientos</label>
                          <input
                            type="number"
                            value={parkingSpaces}
                            onChange={(e) => setParkingSpaces(e.target.value)}
                            placeholder="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Año de Construcción</label>
                          <input
                            type="number"
                            value={yearBuilt}
                            onChange={(e) => setYearBuilt(e.target.value)}
                            placeholder="2020"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="1900"
                            max={new Date().getFullYear()}
                          />
                        </div>
                      </>
                    )}

                    {/* Campos para Apartamento */}
                    {propertyType === 'apartment' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Estacionamientos</label>
                          <input
                            type="number"
                            value={parkingSpaces}
                            onChange={(e) => setParkingSpaces(e.target.value)}
                            placeholder="1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="checkbox"
                            id="furnished"
                            checked={furnished}
                            onChange={(e) => setFurnished(e.target.checked)}
                            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <label htmlFor="furnished" className="text-sm font-semibold text-gray-700">
                            Amueblado
                          </label>
                        </div>
                      </>
                    )}
          </div>
        </div>

              </div>

              {/* Financial Information */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información Financiera
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Precio *</label>
                      <input
                        type="number"
                        step="any"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="150000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                      >
                        <option value="USD">💵 USD</option>
                        <option value="EUR">💶 EUR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cuota de Mantenimiento</label>
                      <input
                        type="number"
                        step="any"
                        value={maintenanceFee}
                        onChange={(e) => setMaintenanceFee(e.target.value)}
                        placeholder="50"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-3 md:col-span-3 mt-2">
                      <input
                        type="checkbox"
                        id="negotiable"
                        checked={isNegotiable}
                        onChange={(e) => setIsNegotiable(e.target.checked)}
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="negotiable" className="text-sm font-semibold text-gray-700">
                        Precio Negociable
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Información de Contacto
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+593 99 999 9999"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contacto@ejemplo.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 inline-flex justify-center items-center px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Propiedad
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* estilos de medición */}
      <style>{`
        .edge-label .edge-badge,
        .live-measure .live-badge {
          background: rgba(0,0,0,0.78);
          color: #fff;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          transform: translate(-50%, -120%);
          box-shadow: 0 2px 6px rgba(0,0,0,.15);
        }
      `}</style>
    </div>
  );
};

export default AddProperty;
