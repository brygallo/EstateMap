import { ImageResponse } from 'next/og';

// Satori does not resolve CSS custom properties, so the brand colours are read
// as data from the generated token file instead of var(--*).
import aentsTokens from '@/lib/aents-tokens.json';

export const runtime = 'edge';
export const alt = 'Geo Propiedades Ecuador — propiedades en un solo mapa';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${aentsTokens.light['--navy']} 0%, ${aentsTokens.light['--accent-alt-strong']} 58%, ${aentsTokens.light['--primary-strong']} 100%)`,
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', left: 900, top: 72, width: 18, height: 18, borderRadius: 9, background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ position: 'absolute', left: 1080, top: 490, width: 12, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.24)' }} />
        <div style={{ position: 'absolute', left: 850, top: 520, width: 9, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.2)' }} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '820px',
            padding: '72px 0 72px 82px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, fontWeight: 700 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 58,
                height: 58,
                borderRadius: 16,
                background: '#fff',
                color: aentsTokens.light['--accent-alt-strong'],
              }}
            >
              G
            </div>
            Geo Propiedades Ecuador
          </div>
          <div style={{ marginTop: 38, fontSize: 68, lineHeight: 1.06, fontWeight: 800, letterSpacing: -2 }}>
            Propiedades en un solo mapa
          </div>
          <div style={{ marginTop: 28, maxWidth: 760, fontSize: 28, lineHeight: 1.35, color: aentsTokens.light['--fog'] }}>
            Compra, alquila o vende con ubicación clara, filtros y contacto directo.
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 72,
            top: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 250,
            height: 390,
            borderRadius: 120,
            border: '18px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.08)',
            fontSize: 74,
            fontWeight: 800,
          }}
        >
          EC
        </div>
      </div>
    ),
    size
  );
}
