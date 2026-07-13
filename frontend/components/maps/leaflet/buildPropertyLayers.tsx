'use client';

import { Polygon, Marker } from 'react-leaflet';
import L from 'leaflet';
import { statusMarker, statusColor, priceMarkerHtml, iconMarkerHtml } from '@/lib/mapMarkers';
import { isPointInEcuadorBounds } from '@/lib/geo';
import { getMapPriceLabel } from './utils';

interface BuildPropertyLayersParams {
  filteredProperties: any[];
  selectedProperty: any;
  mapZoom: number;
  onPolygonClick: (property: any) => void;
  hoverTimeoutRef: React.MutableRefObject<any>;
  addEdgeLabels: (layer: any) => void;
  polygonLayersRef: React.MutableRefObject<Record<string, any>>;
  mapInstanceRef: React.MutableRefObject<any>;
  renderLimit?: number;
}

// Construye las capas visibles del mapa (polígonos, marcadores de precio y
// clusters) según el zoom y la selección actual. Es una función pura: todo lo
// que necesita entra por parámetros. Se llama desde un useMemo en el mapa.
export function buildPropertyLayers({
  filteredProperties,
  selectedProperty,
  mapZoom,
  onPolygonClick,
  hoverTimeoutRef,
  addEdgeLabels,
  polygonLayersRef,
  mapInstanceRef,
  renderLimit = Number.POSITIVE_INFINITY,
}: BuildPropertyLayersParams): JSX.Element[] {
  const polygons: JSX.Element[] = [];
  const markers: JSX.Element[] = [];
  const clusterLabels: JSX.Element[] = [];
  const markerCandidates: Array<{
    key: string;
    property: any;
    position: [number, number];
    formattedPrice: string;
    priceIconColor: string;
    priceRingColor: string;
    shadowColor: string;
    baseColor: string;
    isSelected: boolean;
    priority: number;
  }> = [];
  const clusterBuckets = new Map<string, {
    count: number;
    total: number;
    minPrice: number;
    maxPrice: number;
    lat: number;
    lng: number;
    sample: {
      property: any;
      position: [number, number];
      formattedPrice: string;
      ringColor: string;
      shadowColor: string;
      baseColor: string;
    };
  }>();
  const currentBounds = mapInstanceRef.current?.getBounds?.();
  const visiblePropertyCount = currentBounds
    ? filteredProperties.filter((property) => {
        const lat = Number(property.latitude);
        const lng = Number(property.longitude);
        if (isPointInEcuadorBounds(lat, lng) && currentBounds.contains([lat, lng])) return true;

        if (property.polygon?.coordinates?.[0]) {
          return property.polygon.coordinates[0].some((point: any) => {
            const [pointLng, pointLat] = point;
            return isPointInEcuadorBounds(Number(pointLat), Number(pointLng)) && currentBounds.contains([Number(pointLat), Number(pointLng)]);
          });
        }

        if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
          return property.polygon.some((point: any) => {
            const [pointLat, pointLng] = point;
            return isPointInEcuadorBounds(Number(pointLat), Number(pointLng)) && currentBounds.contains([Number(pointLat), Number(pointLng)]);
          });
        }

        return false;
      }).length
    : filteredProperties.length;
  const shouldUseDetailedVisibleRender = visiblePropertyCount > 0 && visiblePropertyCount <= 20;
  const shouldClusterPrices = !shouldUseDetailedVisibleRender && mapZoom < 13 && filteredProperties.length > 35;
  const maxRichMarkers = shouldUseDetailedVisibleRender
    ? 20
    : mapZoom >= 16 ? 160 : mapZoom >= 14 ? 110 : mapZoom >= 12 ? 70 : filteredProperties.length <= 35 ? 35 : 0;
  const maxPolygons = shouldUseDetailedVisibleRender
    ? 20
    : mapZoom >= 16 ? 160 : mapZoom >= 14 ? 80 : mapZoom >= 12 ? 24 : 0;
  const minLabelDistance = mapZoom >= 16 ? 0.0008 : mapZoom >= 14 ? 0.0018 : mapZoom >= 12 ? 0.0035 : 0.014;
  const clusterPrecision = mapZoom <= 6 ? 0 : mapZoom <= 8 ? 1 : 2;
  const minClusterDistance = mapZoom <= 6 ? 1.05 : mapZoom <= 8 ? 0.48 : 0.2;
  let processedVisibleProperties = 0;

  filteredProperties.forEach((p, idx) => {
    // Handle both GeoJSON and simple array formats for properties with polygons
    let leafletCoordinates;

    if (p.polygon?.coordinates?.[0]) {
      // GeoJSON format: convert [lng, lat] to [lat, lng]
      leafletCoordinates = p.polygon.coordinates[0]
        .map((coord: any) => [coord[1], coord[0]])
        .filter((coord: any) => isPointInEcuadorBounds(Number(coord?.[0]), Number(coord?.[1])));
    } else if (Array.isArray(p.polygon) && p.polygon.length >= 3) {
      // Simple array format: already [lat, lng]
      leafletCoordinates = p.polygon.filter((coord: any) =>
        isPointInEcuadorBounds(Number(coord?.[0]), Number(coord?.[1]))
      );
    }
    if (leafletCoordinates && leafletCoordinates.length < 3) leafletCoordinates = null;

    const isSelected = selectedProperty?.id === p.id;
    // Colores alineados a la paleta navy: azul profundo para venta,
    // azul claro para alquiler y gris pizarra neutral para inactivo.
    const marker = statusMarker(p.status);
    const baseColor = statusColor(p.status);
    const shadowColor = marker.shadow;
    const ringColor = marker.ring;

    const formattedPrice = getMapPriceLabel(p.price);
    const priceIconColor = marker.solid;

    // Prefer the stored center from the backend. Computing Turf centroids for
    // every polygon on every render is expensive while panning/zooming.
    let labelPosition: [number, number] | null = null;
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);

    if (isPointInEcuadorBounds(lat, lng)) {
      labelPosition = [lat, lng];
    } else if (leafletCoordinates?.length) {
      const totals = leafletCoordinates.reduce(
        (acc: { lat: number; lng: number; count: number }, coord: any) => {
          const pointLat = Number(coord?.[0]);
          const pointLng = Number(coord?.[1]);
          if (!isPointInEcuadorBounds(pointLat, pointLng)) return acc;
          acc.lat += pointLat;
          acc.lng += pointLng;
          acc.count += 1;
          return acc;
        },
        { lat: 0, lng: 0, count: 0 }
      );
      if (totals.count > 0) {
        labelPosition = [totals.lat / totals.count, totals.lng / totals.count];
      }
    }

    if (currentBounds) {
      const hasVisibleMarker = labelPosition ? currentBounds.contains(labelPosition) : false;
      const hasVisiblePolygonVertex = leafletCoordinates?.some((coord: any) => {
        const pointLat = Number(coord?.[0]);
        const pointLng = Number(coord?.[1]);
        return Number.isFinite(pointLat) && Number.isFinite(pointLng) && currentBounds.contains([pointLat, pointLng]);
      });

      if (!hasVisibleMarker && !hasVisiblePolygonVertex) return;
    }

    if (!shouldClusterPrices && !isSelected && processedVisibleProperties >= renderLimit) return;
    processedVisibleProperties += 1;

    // Los poligonos son costosos en Leaflet; solo se dibujan al acercar
    // bastante o cuando la propiedad esta seleccionada.
    if (leafletCoordinates && (isSelected || polygons.length < maxPolygons)) {
      polygons.push(
        <Polygon
          key={`polygon-${p.id || idx}`}
          positions={leafletCoordinates}
          ref={(layer: any) => {
            if (layer) {
              const idKey = p.id || `idx-${idx}`;
              polygonLayersRef.current[idKey] = layer;
            }
          }}
          pathOptions={{
            color: baseColor,
            fillOpacity: isSelected ? 0.4 : 0.2,
            weight: isSelected ? 3 : 2,
            className: 'property-polygon'
          }}
          eventHandlers={{
            click: () => {
              // Cancel any pending hover timeout
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              onPolygonClick(p);
              // Mostrar etiquetas al seleccionar (solo si show_measurements es true)
              const showMeasurements = p.show_measurements !== false;
              const layer = polygonLayersRef.current[p.id || `idx-${idx}`];
              if (layer && showMeasurements) {
                addEdgeLabels(layer);
              }
            },
            mouseover: (e: any) => {
              const layer = e.target;
              layer.setStyle({
                fillOpacity: 0.4,
                weight: 3
              });
            },
            mouseout: (e: any) => {
              const layer = e.target;
              if (!isSelected) {
                layer.setStyle({
                  fillOpacity: 0.2,
                  weight: 2
                });
              }

              // Cancel hover timeout if mouse leaves before time expires
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }
          }}
        />
      );
    }

    if (labelPosition) {
      if (shouldClusterPrices && !isSelected) {
        const [lat, lng] = labelPosition;
        const key = `${lat.toFixed(clusterPrecision)}:${lng.toFixed(clusterPrecision)}`;
        const priceValue = Number.parseFloat(String(p.price)) || 0;
        const current = clusterBuckets.get(key) || {
          count: 0,
          total: 0,
          minPrice: priceValue,
          maxPrice: priceValue,
          lat: 0,
          lng: 0,
          sample: {
            property: p,
            position: labelPosition,
            formattedPrice,
            ringColor,
            shadowColor,
            baseColor,
          },
        };
        current.count += 1;
        current.total += priceValue;
        if (priceValue > 0) {
          current.minPrice = current.minPrice > 0 ? Math.min(current.minPrice, priceValue) : priceValue;
          current.maxPrice = Math.max(current.maxPrice, priceValue);
        }
        current.lat += lat;
        current.lng += lng;
        clusterBuckets.set(key, current);
      } else {
        const priceValue = Number.parseFloat(String(p.price)) || 0;
        markerCandidates.push({
          key: `map-marker-${p.id || idx}`,
          property: p,
          position: labelPosition,
          formattedPrice,
          priceIconColor,
          priceRingColor: ringColor,
          shadowColor,
          baseColor,
          isSelected,
          priority: (isSelected ? 1_000_000_000 : 0) + priceValue,
        });
      }
    }
  });

  const usedPositions: [number, number][] = [];
  markerCandidates
    .sort((a, b) => b.priority - a.priority)
    .forEach((candidate) => {
      if (!candidate.isSelected && markers.length >= maxRichMarkers) return;
      if (
        !candidate.isSelected &&
        usedPositions.some(([lat, lng]) => Math.abs(lat - candidate.position[0]) < minLabelDistance && Math.abs(lng - candidate.position[1]) < minLabelDistance)
      ) {
        return;
      }
      usedPositions.push(candidate.position);

      const useCompactMarker = mapZoom < 12 && !candidate.isSelected && !shouldUseDetailedVisibleRender;
      const markerIcon = new L.DivIcon({
        className: useCompactMarker ? 'map-marker-icon' : 'map-rich-marker-icon',
        html: useCompactMarker
          ? `<div>${iconMarkerHtml({
              status: candidate.property.status,
              type: candidate.property.property_type,
              selected: false,
            })}</div>`
          : `<div>${priceMarkerHtml({
              status: candidate.property.status,
              type: candidate.property.property_type,
              price: candidate.formattedPrice,
              selected: candidate.isSelected,
            })}</div>`,
        iconSize: useCompactMarker ? [40, 44] : [112, 48],
        iconAnchor: useCompactMarker ? [20, 44] : [56, 48]
      });

      markers.push(
        <Marker
          key={candidate.key}
          position={candidate.position}
          icon={markerIcon}
          zIndexOffset={500}
          interactive={true}
          keyboard={false}
          alt=""
          bubblingMouseEvents={false}
          eventHandlers={{
            click: (e) => {
              L.DomEvent.stopPropagation(e.originalEvent);
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              onPolygonClick(candidate.property);
            },
            mouseover: () => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
            }
          }}
        />
      );
    });

  if (shouldClusterPrices) {
    const displayClusters: Array<{
      key: string;
      count: number;
      total: number;
      minPrice: number;
      maxPrice: number;
      lat: number;
      lng: number;
      sample: {
        property: any;
        position: [number, number];
        formattedPrice: string;
        ringColor: string;
        shadowColor: string;
        baseColor: string;
      };
    }> = [];
    const maxClusters = mapZoom <= 7 ? 48 : mapZoom <= 9 ? 72 : 120;
    const singletonMarkers: typeof markerCandidates = [];

    Array.from(clusterBuckets.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .forEach(([key, bucket]) => {
        const clusterPosition: [number, number] = [bucket.lat / bucket.count, bucket.lng / bucket.count];
        const nearbyCluster = displayClusters.find((cluster) => {
          const lat = cluster.lat / cluster.count;
          const lng = cluster.lng / cluster.count;
          return Math.abs(lat - clusterPosition[0]) < minClusterDistance && Math.abs(lng - clusterPosition[1]) < minClusterDistance;
        });

        if (nearbyCluster) {
          nearbyCluster.count += bucket.count;
          nearbyCluster.total += bucket.total;
          if (bucket.minPrice > 0) {
            nearbyCluster.minPrice = nearbyCluster.minPrice > 0 ? Math.min(nearbyCluster.minPrice, bucket.minPrice) : bucket.minPrice;
            nearbyCluster.maxPrice = Math.max(nearbyCluster.maxPrice, bucket.maxPrice);
          }
          nearbyCluster.lat += bucket.lat;
          nearbyCluster.lng += bucket.lng;
          return;
        }

        if (displayClusters.length < maxClusters) {
          displayClusters.push({
          key,
          count: bucket.count,
          total: bucket.total,
          minPrice: bucket.minPrice,
          maxPrice: bucket.maxPrice,
          lat: bucket.lat,
          lng: bucket.lng,
          sample: bucket.sample,
          });
          return;
        }

        singletonMarkers.push({
          key: `cluster-overflow-${key}`,
          property: bucket.sample.property,
          position: clusterPosition,
          formattedPrice: bucket.count > 1 ? `${bucket.count}` : bucket.sample.formattedPrice,
          priceIconColor: bucket.sample.baseColor,
          priceRingColor: bucket.sample.ringColor,
          shadowColor: bucket.sample.shadowColor,
          baseColor: bucket.sample.baseColor,
          isSelected: false,
          priority: bucket.count * 1_000_000 + (Number.parseFloat(String(bucket.sample.property.price)) || 0),
        });
      });

    displayClusters
      .forEach((cluster) => {
        const clusterPosition: [number, number] = [cluster.lat / cluster.count, cluster.lng / cluster.count];
        if (cluster.count < 2) {
          singletonMarkers.push({
            key: `cluster-single-${cluster.key}`,
            property: cluster.sample.property,
            position: clusterPosition,
            formattedPrice: cluster.sample.formattedPrice,
            priceIconColor: cluster.sample.baseColor,
            priceRingColor: cluster.sample.ringColor,
            shadowColor: cluster.sample.shadowColor,
            baseColor: cluster.sample.baseColor,
            isSelected: false,
            priority: Number.parseFloat(String(cluster.sample.property.price)) || 0,
          });
          return;
        }

        const clusterSizeClass = cluster.count >= 100 ? 'map-cluster-large' : cluster.count >= 25 ? 'map-cluster-medium' : '';
        const clusterIcon = new L.DivIcon({
          className: 'price-label-icon',
          html: `
            <div class="map-cluster ${clusterSizeClass}" aria-hidden="true">
              <strong>${cluster.count}</strong>
            </div>
          `,
          iconSize: [58, 58],
          iconAnchor: [29, 58]
        });
        clusterLabels.push(
          <Marker
            key={`cluster-${cluster.key}`}
            position={clusterPosition}
            icon={clusterIcon}
            interactive={true}
            keyboard={false}
            alt=""
            zIndexOffset={450}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                const map = mapInstanceRef.current;
                if (!map) return;
                const nextZoom = Math.min(Math.max(map.getZoom() + 2, 11), 15);
                map.flyTo(clusterPosition, nextZoom, { duration: 0.75 });
              }
            }}
          />
        );
      });

    singletonMarkers
      .sort((a, b) => b.priority - a.priority)
      .slice(0, mapZoom <= 7 ? 80 : mapZoom <= 10 ? 120 : 160)
      .forEach((candidate) => {
        const markerIcon = new L.DivIcon({
          className: 'map-rich-marker-icon',
          html: `<div>${priceMarkerHtml({
            status: candidate.property.status,
            type: candidate.property.property_type,
            price: candidate.formattedPrice,
            selected: false,
          })}</div>`,
          iconSize: [112, 48],
          iconAnchor: [56, 48]
        });

        markers.push(
          <Marker
            key={candidate.key}
            position={candidate.position}
            icon={markerIcon}
            zIndexOffset={430}
            interactive={true}
            keyboard={false}
            alt=""
            bubblingMouseEvents={false}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e.originalEvent);
                onPolygonClick(candidate.property);
              }
            }}
          />
        );
      });
  }

  return [...polygons, ...clusterLabels, ...markers];
}
