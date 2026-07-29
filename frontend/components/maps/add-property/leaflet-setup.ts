import L from 'leaflet';
import aentsTokens from '@/lib/aents-tokens.json';
import './../leaflet-icon-fix';

// The SVG is embedded as a base64 data URI, an isolated document where the page
// CSS custom properties cannot be resolved, so the raw token value is inlined.
// Functional signal color for geolocation (not a brand color).
const USER_LOCATION_COLOR = aentsTokens.light['--info'];

export const userLocationIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${USER_LOCATION_COLOR}" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="${USER_LOCATION_COLOR}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

export const defaultCenter: [number, number] = [-1.5, -78.5]; // Centro de Ecuador
