// Estilos de los marcadores/clusters/pines del mapa principal. Se extraen aquí
// para no inflar el componente; se inyectan en un <style> dentro del mapa.
export const MAP_STYLES = `
        .price-label-icon {
          background: transparent !important;
          border: none !important;
          transform: translate(-50%, -50%);
        }
        .map-marker-icon {
          background: transparent !important;
          border: 0 !important;
        }
        .map-rich-marker-icon {
          background: transparent !important;
          border: 0 !important;
        }
        .map-price-pin {
          --marker-bg: #496D9C;
          --marker-ring: rgba(73, 109, 156, 0.28);
          --marker-shadow: rgba(45, 60, 103, 0.30);
          align-items: center;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          transform: translate(-50%, -100%);
        }
        .map-price-bubble {
          background: var(--marker-bg);
          border: 2px solid #ffffff;
          border-radius: 999px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
          color: #ffffff;
          font-family: var(--font-geist-mono), ui-monospace, 'SFMono-Regular', monospace;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          font-weight: 900;
          line-height: 1;
          padding: 6px 9px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.26);
          transform: translateY(2px);
          white-space: nowrap;
        }
        .map-price-pin-head {
          background: var(--marker-bg);
          border: 2px solid #ffffff;
          border-radius: 999px 999px 999px 5px;
          box-shadow: 0 8px 18px var(--marker-shadow), 0 2px 6px rgba(15, 23, 42, 0.2);
          height: 18px;
          transform: rotate(-45deg);
          width: 18px;
        }
        .map-price-pin-head::after {
          background: rgba(255, 255, 255, 0.88);
          border-radius: 999px;
          content: '';
          display: block;
          height: 5px;
          margin: 4.5px auto 0;
          width: 5px;
        }
        .map-price-pin:hover .map-price-bubble,
        .map-price-pin-selected .map-price-bubble {
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.34), 0 0 0 7px var(--marker-ring), 0 0 0 12px rgba(255, 255, 255, 0.62);
        }
        .map-price-pin:hover .map-price-pin-head,
        .map-price-pin-selected .map-price-pin-head {
          box-shadow: 0 12px 28px var(--marker-shadow), 0 0 0 7px var(--marker-ring), 0 0 0 12px rgba(255, 255, 255, 0.62);
        }
        .map-pin {
          --pin-color: #496D9C;
          --pin-shadow: rgba(45, 60, 103, 0.28);
          align-items: center;
          background: var(--pin-color);
          border: 2px solid #ffffff;
          border-radius: 999px 999px 999px 6px;
          box-shadow: 0 8px 18px var(--pin-shadow), 0 2px 6px rgba(15, 23, 42, 0.2);
          display: flex;
          height: 22px;
          justify-content: center;
          transform: rotate(-45deg);
          transition: transform 150ms ease, box-shadow 150ms ease;
          width: 22px;
        }
        .map-pin::after {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          content: '';
          height: 7px;
          width: 7px;
        }
        .map-pin:hover,
        .map-pin-selected {
          box-shadow: 0 10px 24px var(--pin-shadow), 0 0 0 6px rgba(73, 109, 156, 0.16);
          transform: rotate(-45deg) scale(1.14);
        }
        .map-cluster {
          align-items: center;
          background: radial-gradient(circle at 35% 28%, #688CCA 0%, #496D9C 48%, #2D3C67 100%);
          border: 2px solid #ffffff;
          border-radius: 999px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.24), 0 0 0 7px rgba(73, 109, 156, 0.15);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          font-family: var(--font-geist-mono), ui-monospace, 'SFMono-Regular', monospace;
          font-variant-numeric: tabular-nums;
          height: 50px;
          justify-content: center;
          line-height: 1;
          min-width: 50px;
          padding: 0 12px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
          transform: translate(-50%, -50%);
          white-space: nowrap;
        }
        .map-cluster strong {
          font-size: 16px;
          font-weight: 900;
        }
        .map-cluster-medium {
          min-width: 56px;
        }
        .map-cluster-large {
          min-width: 64px;
        }
        .map-empty-state {
          pointer-events: auto;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `;
