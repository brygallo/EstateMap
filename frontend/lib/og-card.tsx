/**
 * Tarjeta Open Graph compartida (1200x630) para las landings SEO dinámicas.
 * Se renderiza con `next/og` (satori): solo estilos inline y flexbox.
 * Los hex vienen de la paleta navy de tailwind.config.js.
 */

export const OG_SIZE = { width: 1200, height: 630 };

export function OgCard({
  title,
  subtitle,
  badge = 'Propiedades en Ecuador',
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        backgroundImage: 'linear-gradient(135deg, #2D3C67 0%, #496D9C 55%, #688CCA 100%)',
        color: '#FFFFFF',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 9999,
              backgroundColor: '#FFFFFF',
              color: '#2D3C67',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            GP
          </div>
          Geo Propiedades Ecuador
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            fontWeight: 600,
            padding: '10px 24px',
            borderRadius: 9999,
            backgroundColor: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.35)',
          }}
        >
          {badge}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            fontSize: title.length > 42 ? 58 : 72,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 1050,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              fontWeight: 500,
              color: '#E7E2F3',
              maxWidth: 1000,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 26,
          color: '#E7E2F3',
        }}
      >
        <div style={{ display: 'flex' }}>Todas las propiedades en un solo mapa</div>
        <div style={{ display: 'flex', fontWeight: 700, color: '#FFFFFF' }}>
          geopropiedadesecuador.com
        </div>
      </div>
    </div>
  );
}
