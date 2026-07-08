'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';

export function AutoLayerSwitch({
  activeLayer,
  preferredLayer,
  setActiveLayer,
}: {
  activeLayer: string;
  preferredLayer: string;
  setActiveLayer: (layer: string) => void;
}) {
  const map = useMap();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();

      // Layer max zoom levels
      const layerLimits: { [key: string]: number } = {
        satellite: 18,
        streets: 20,
        osm: 19,
      };

      const preferredLimit = layerLimits[preferredLayer] ?? 20;

      // If zoom is again within the preferred layer limit, return to it
      if (currentZoom <= preferredLimit && activeLayer !== preferredLayer) {
        setActiveLayer(preferredLayer);
        return;
      }

      // If current zoom exceeds preferred layer's max zoom, switch temporarily
      if (currentZoom > preferredLimit) {
        const availableLayers = Object.entries(layerLimits)
          .filter(([_, maxZoom]) => maxZoom >= currentZoom)
          .sort((a, b) => b[1] - a[1]); // Sort by max zoom descending

        if (availableLayers.length > 0) {
          const [newLayer] = availableLayers[0];
          if (newLayer !== activeLayer) {
            setActiveLayer(newLayer);

            // Show toast notification
            const layerNames: { [key: string]: string } = {
              satellite: 'Vista Satelital',
              streets: 'Mapa de Calles',
              osm: 'OpenStreetMap',
            };

            setToastMessage(`Cambiado a ${layerNames[newLayer]} (soporta zoom ${layerLimits[newLayer]})`);
            setShowToast(true);

            setTimeout(() => {
              setShowToast(false);
            }, 3000);
          }
        }
      }
    };

    // Run once on mount/dependency change to honor preferred layer immediately
    handleZoomEnd();
    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, activeLayer, preferredLayer, setActiveLayer]);

  return (
    <>
      {showToast && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
