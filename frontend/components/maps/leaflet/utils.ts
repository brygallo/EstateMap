import L from 'leaflet';

// Expande un bounds un porcentaje en cada lado (con un mínimo), para reportar un
// área un poco mayor que la vista visible al pedir propiedades.
export const padBounds = (bounds: L.LatLngBounds, ratio = 0.35) => {
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const latPad = Math.max((north - south) * ratio, 0.01);
  const lngPad = Math.max((east - west) * ratio, 0.01);

  return L.latLngBounds([south - latPad, west - lngPad], [north + latPad, east + lngPad]);
};

// Formatea el precio para las etiquetas del mapa: $1.2M, $250k, $80,000 o "Consultar".
export const getMapPriceLabel = (price: unknown) => {
  const value = Number.parseFloat(String(price));
  if (!Number.isFinite(value) || value <= 0) return 'Consultar';

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (value >= 100_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value).toLocaleString('en-US')}`;
};
