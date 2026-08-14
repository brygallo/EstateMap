import React from 'react';
import {AbsoluteFill} from 'remotion';
import {font, safe, sideCrop} from './theme';

const zone: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: 'rgba(239,68,68,.22)',
  border: '2px dashed rgba(239,68,68,.8)',
};

const label: React.CSSProperties = {
  position: 'absolute',
  fontFamily: font,
  fontWeight: 800,
  fontSize: 22,
  color: '#FCA5A5',
  letterSpacing: '0.04em',
};

/**
 * Debug overlay. Render the SafeAreas composition in Remotion Studio to check a
 * layout against the space TikTok and Instagram cover with their own interface.
 */
export const SafeAreaOverlay: React.FC = () => (
  <AbsoluteFill>
    <div style={{...zone, left: 0, right: 0, top: 0, height: safe.top}} />
    <div style={{...label, left: 24, top: safe.top - 34}}>ARRIBA {safe.top} px · pestañas</div>
    <div style={{...zone, left: 0, right: 0, bottom: 0, height: safe.bottom}} />
    <div style={{...label, left: 24, bottom: safe.bottom + 12}}>ABAJO {safe.bottom} px · caption y usuario</div>
    <div style={{...zone, right: 0, top: safe.railTop, width: safe.right, bottom: safe.bottom}} />
    <div style={{...label, right: 24, top: safe.railTop - 34}}>DERECHA {safe.right} px · acciones</div>
    {/* The side crop runs the whole height: the phone hides these columns
        outright, unlike the interface bands, which only cover the canvas. */}
    <div style={{...zone, left: 0, top: 0, width: sideCrop, bottom: 0, backgroundColor: 'rgba(239,68,68,.3)'}} />
    <div style={{...zone, right: 0, top: 0, width: sideCrop, bottom: 0, backgroundColor: 'rgba(239,68,68,.3)'}} />
    <div style={{...label, left: sideCrop + 12, top: 960}}>RECORTE {sideCrop} px · fuera de pantalla en el móvil</div>
  </AbsoluteFill>
);
