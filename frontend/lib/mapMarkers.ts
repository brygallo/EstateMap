// Fuente única de verdad para el estilo de marcadores del mapa.
// - Color por ESTADO (venta/alquiler/inactivo), con los tokens de marca Aents.
// - Icono por TIPO de propiedad (casa/depto/terreno/comercial).
// Cambiar aquí reestiliza todos los mapas (home, detalle, publicar).
import aentsTokens from '@/lib/aents-tokens.json';

// These values are consumed by APIs that cannot resolve CSS custom properties
// (MapLibre GL `paint` expressions and base64 SVG data
// URLs), so the raw Aents token values are read instead of `var(--token)`.
const tokens = aentsTokens.light;

// Builds an rgba() string from the `*-rgb` companion token (e.g. "27 134 72").
const tokenRgba = (rgbToken: string, alpha: string) =>
  `rgba(${(tokens as Record<string, string>)[rgbToken].split(' ').join(', ')}, ${alpha})`;

export interface StatusMarker {
  solid: string;
  gradient: string;
  shadow: string; // rgba para sombras
  ring: string; // rgba para halos de foco/hover
}

const FOR_SALE: StatusMarker = {
  solid: tokens['--primary-strong'],
  gradient: `linear-gradient(135deg, ${tokens['--accent-alt-strong']}, ${tokens['--primary-strong']})`,
  shadow: tokenRgba('--accent-alt-strong-rgb', '0.20'),
  ring: tokenRgba('--primary-strong-rgb', '0.28'),
};

const FOR_RENT: StatusMarker = {
  solid: tokens['--accent-alt'],
  gradient: `linear-gradient(135deg, ${tokens['--primary-strong']}, ${tokens['--accent-alt']})`,
  shadow: tokenRgba('--primary-strong-rgb', '0.20'),
  ring: tokenRgba('--accent-alt-rgb', '0.30'),
};

const INACTIVE: StatusMarker = {
  solid: tokens['--text-muted'],
  gradient: `linear-gradient(135deg, ${tokens['--text-secondary']}, ${tokens['--text-muted']})`,
  shadow: tokenRgba('--text-secondary-rgb', '0.18'),
  ring: tokenRgba('--text-muted-rgb', '0.24'),
};

// Selection hierarchy on the detail map. The active listing keeps the normal
// brand green; surrounding listings use a quieter green instead of competing
// with it through status colors.
const SELECTED_GREEN: StatusMarker = {
  solid: tokens['--primary-strong'],
  gradient: `linear-gradient(135deg, ${tokens['--primary']}, ${tokens['--primary-strong']})`,
  shadow: tokenRgba('--primary-strong-rgb', '0.24'),
  ring: tokenRgba('--primary-rgb', '0.34'),
};

const MUTED_GREEN: StatusMarker = {
  solid: '#6FA886',
  gradient: 'linear-gradient(135deg, #8DBDA0, #679A7B)',
  shadow: 'rgba(27, 134, 72, 0.12)',
  ring: 'rgba(27, 134, 72, 0.16)',
};

export function statusMarker(status?: string): StatusMarker {
  return status === 'for_sale' ? FOR_SALE : status === 'for_rent' ? FOR_RENT : INACTIVE;
}

// Solo el color base (polígonos, bordes, etc.)
export function statusColor(status?: string): string {
  return statusMarker(status).solid;
}

// Paths SVG rellenos (viewBox 0 0 24 24) por tipo de propiedad.
const TYPE_ICON_PATHS: Record<string, string> = {
  house: 'M12 3 2 12h3v8h5v-5h4v5h5v-8h3z',
  apartment:
    'M3 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4h7a1 1 0 0 1 1 1v12zM6 6v2h2V6zm4 0v2h2V6zM6 10v2h2v-2zm4 0v2h2v-2zM6 14v2h2v-2zm4 0v2h2v-2zm6-2v2h2v-2zm0 4v2h2v-2z',
  land: 'M12 2 5.5 12H9l-3.5 6H10v4h4v-4h4.5L15 12h3.5z',
  commercial:
    'M4 4h16l1 5a2.9 2.9 0 0 1-5.4 1.1A2.9 2.9 0 0 1 12 11a2.9 2.9 0 0 1-3.6-.9A2.9 2.9 0 0 1 3 9zM5 12.8A4.4 4.4 0 0 0 8 12v8h8v-8a4.4 4.4 0 0 0 3 .8V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z',
  other:
    'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z',
};

export function typeIconPath(type?: string): string {
  return TYPE_ICON_PATHS[type || 'other'] || TYPE_ICON_PATHS.other;
}

// SVG (string) del icono de tipo, para incrustar en L.DivIcon.
export function typeIconSvg(type?: string, color = '#ffffff', size = 13): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true"><path d="${typeIconPath(
    type
  )}"/></svg>`;
}

// Marcador "píldora" bonito: icono de tipo + precio, coloreado por estado.
// Estilos inline para que funcione dentro del HTML de L.DivIcon sin CSS externo.
export function priceMarkerHtml({
  status,
  type,
  price,
  selected = false,
  muted = false,
}: {
  status?: string;
  type?: string;
  price: string;
  selected?: boolean;
  muted?: boolean;
}): string {
  const c = selected ? SELECTED_GREEN : muted ? MUTED_GREEN : statusMarker(status);
  const scale = selected ? 'scale(1.06)' : 'scale(1)';
  const ring = selected ? `0 0 0 3px ${c.ring},` : '';
  const shadowOpacity = selected ? '0.34' : '0.24';
  return `
    <div class="gp-marker ${selected ? 'gp-marker-selected' : ''}" style="
      position:relative;
      width:112px;
      height:48px;
      display:flex;
      align-items:flex-start;
      justify-content:center;
      transform:${scale};
      transform-origin:50% 100%;
      will-change:transform;
      pointer-events:auto;
    ">
      ${selected ? `<span style="position:absolute;left:50%;top:-17px;z-index:4;transform:translateX(-50%);padding:2px 7px;border-radius:999px;background:#fff;color:${c.solid};font-size:9px;font-weight:800;line-height:1.35;white-space:nowrap;box-shadow:0 2px 8px rgba(15,23,42,.22);">Seleccionada</span>` : ''}
      <div style="
        position:absolute; left:50%; bottom:5px; z-index:0;
        width:48px; height:10px; border-radius:999px;
        background:rgba(15,23,42,${shadowOpacity});
        filter:blur(6px);
        transform:translateX(-50%);
      "></div>
      <div style="
        box-sizing:border-box;
        position:relative; z-index:2;
        display:flex; align-items:center; justify-content:center; gap:5px;
        min-width:76px; max-width:96px; height:30px;
        background:${c.gradient};
        color:#fff; border:2px solid #fff; border-radius:999px;
        padding:4px 9px 4px 5px;
        box-shadow:${ring} inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 5px rgba(15,23,42,0.16);
        transition: transform .15s ease, box-shadow .15s ease;
        overflow:hidden;
      ">
        <span style="display:flex; align-items:center; justify-content:center; flex:0 0 auto; width:18px; height:18px; border-radius:999px; background:rgba(255,255,255,0.22);">
          ${typeIconSvg(type, '#ffffff', 12)}
        </span>
        <span style="
          font-family:var(--font-jetbrains), var(--font-mono);
          font-size:12px; font-weight:800; line-height:1; letter-spacing:0;
          font-variant-numeric:tabular-nums; white-space:nowrap;
          overflow:hidden; text-overflow:ellipsis;
          text-shadow:0 1px 2px rgba(0,0,0,0.22);
        ">${price}</span>
      </div>
      <div style="
        position:absolute; left:50%; bottom:10px; z-index:1;
        width:9px; height:9px; margin-left:-4.5px; background:${c.solid};
        border-right:2px solid #fff; border-bottom:2px solid #fff;
        transform: rotate(45deg); border-bottom-right-radius:2px;
      "></div>
    </div>
  `;
}

// Marcador solo-icono (sin precio): círculo con el icono de tipo.
export function iconMarkerHtml({
  status,
  type,
  selected = false,
  muted = false,
}: {
  status?: string;
  type?: string;
  selected?: boolean;
  muted?: boolean;
}): string {
  const c = selected ? SELECTED_GREEN : muted ? MUTED_GREEN : statusMarker(status);
  const scale = selected ? 'scale(1.12)' : 'scale(1)';
  const ring = selected ? `0 0 0 3px ${c.ring},` : '';
  const shadowOpacity = selected ? '0.34' : '0.24';
  return `
    <div class="gp-marker ${selected ? 'gp-marker-selected' : ''}" style="
      position:relative;
      width:40px;
      height:44px;
      transform:${scale};
      transform-origin:50% 100%;
    ">
      ${selected ? `<span style="position:absolute;left:50%;top:-11px;z-index:4;transform:translateX(-50%);padding:2px 7px;border-radius:999px;background:#fff;color:${c.solid};font-size:9px;font-weight:800;line-height:1.35;white-space:nowrap;box-shadow:0 2px 8px rgba(15,23,42,.22);">Seleccionada</span>` : ''}
      <div style="
        position:absolute; left:50%; bottom:0; z-index:0;
        width:24px; height:7px; border-radius:999px;
        background:rgba(15,23,42,${shadowOpacity});
        filter:blur(5px);
        transform:translateX(-50%);
      "></div>
      <div style="
        position:absolute; left:50%; top:7px; z-index:1;
        display:flex; align-items:center; justify-content:center;
        width:30px; height:30px; border-radius:999px 999px 999px 6px;
        background:${c.gradient}; border:2px solid #fff;
        box-shadow:${ring} inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 5px rgba(15,23,42,0.16);
        transform: translateX(-50%) rotate(-45deg);
      ">
        <span style="transform: rotate(45deg); display:flex;">${typeIconSvg(type, '#ffffff', 15)}</span>
      </div>
    </div>
  `;
}
