import L from 'leaflet';

// Fix del ícono por defecto de Leaflet con webpack + guarda contra llamadas a
// removeClass cuando el path ya no existe (previene crash al desmontar).
// Efecto de módulo compartido por los mapas: importarlo garantiza el parche.
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  const originalRemoveClass = (L.DomUtil as any).removeClass;
  (L.DomUtil as any).removeClass = function (el: any, name: string) {
    if (!el || !el.classList) return this;
    return originalRemoveClass.call(this, el, name);
  };
}
