import React from 'react';
import {AbsoluteFill} from 'remotion';
import {font, safe} from './theme';

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
    <div style={{...zone, left: 0, top: safe.top, width: safe.left, bottom: safe.bottom, backgroundColor: 'rgba(239,68,68,.12)'}} />
  </AbsoluteFill>
);
