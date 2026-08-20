import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {palette} from './theme';

/**
 * Branded fallback background. It is a stylised city plan, not a screenshot of
 * the product: when there is no approved footage the piece must look like a
 * typographic brand video, never like a fake interface.
 */

const BLOCKS = [
  [90, 260, 250, 190], [380, 210, 210, 240], [640, 300, 260, 160],
  [120, 520, 180, 260], [350, 520, 300, 150], [720, 520, 240, 220],
  [90, 860, 260, 200], [400, 740, 200, 300], [660, 800, 300, 180],
  [140, 1140, 320, 200], [520, 1120, 240, 240], [820, 1100, 200, 260],
  [100, 1420, 240, 220], [400, 1440, 300, 180], [760, 1420, 260, 200],
];

const PINS: Array<[number, number]> = [
  [300, 640], [700, 420], [520, 980], [840, 1180], [220, 1300],
];

export const MapField: React.FC<{accent: string; frame: number}> = ({accent, frame}) => {
  const drift = frame * 0.32;
  const zoom = interpolate(frame, [0, 900], [1.0, 1.07], {extrapolateRight: 'extend'});
  const dash = -frame * 4;
  return (
    <AbsoluteFill style={{backgroundColor: palette.ink, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${zoom}) translate(${-drift * 0.4}px, ${-drift * 0.25}px)`,
          transformOrigin: '50% 45%',
        }}
      >
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          <rect x="-200" y="-200" width="1480" height="2320" fill={palette.navy} />
          {BLOCKS.map(([x, y, width, height], index) => (
            <rect
              key={index}
              x={x}
              y={y}
              width={width}
              height={height}
              rx={14}
              fill={index % 4 === 0 ? '#252B47' : '#1E2338'}
              stroke="#333A5C"
              strokeWidth={3}
            />
          ))}
          <rect x={620} y={1180} width={340} height={280} rx={26} fill="#14342F" stroke="#1C4A42" strokeWidth={3} />
          <g stroke="#39406A" strokeLinecap="round">
            <path d="M0 480 H1080" strokeWidth={26} />
            <path d="M0 1080 H1080" strokeWidth={18} />
            <path d="M0 1380 H1080" strokeWidth={14} />
            <path d="M340 0 V1920" strokeWidth={24} />
            <path d="M700 0 V1920" strokeWidth={16} />
          </g>
          <g stroke="#4A527F" strokeLinecap="round" opacity={0.7}>
            <path d="M0 780 H1080" strokeWidth={6} />
            <path d="M0 1650 H1080" strokeWidth={6} />
            <path d="M520 0 V1920" strokeWidth={6} />
            <path d="M900 0 V1920" strokeWidth={6} />
          </g>
          <path
            d="M120 1620 C300 1400 300 1180 520 1040 S760 720 900 380"
            fill="none"
            stroke={accent}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray="30 26"
            strokeDashoffset={dash}
            opacity={0.95}
          />
          {PINS.map(([x, y], index) => {
            const pulse = 1 + Math.sin((frame + index * 30) / 14) * 0.12;
            const active = index === 2;
            return (
              <g key={index} opacity={active ? 1 : 0.55}>
                {active ? (
                  <circle cx={x} cy={y} r={54 * pulse} fill="none" stroke={accent} strokeWidth={6} opacity={0.5} />
                ) : null}
                <path
                  d={`M${x} ${y - 46} a30 30 0 0 1 30 30 c0 22 -30 52 -30 52 s-30 -30 -30 -52 a30 30 0 0 1 30 -30 z`}
                  fill={active ? accent : '#495484'}
                  stroke={active ? palette.white : '#5C68A0'}
                  strokeWidth={4}
                />
                <circle cx={x} cy={y - 16} r={10} fill={active ? palette.ink : '#0F1020'} />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            // The shade rides the last fifth only. It used to reach .88 from
            // the midpoint down, which darkened half the map — the thing the
            // piece exists to show — long before any word needed a backing.
            'linear-gradient(180deg, rgba(8,9,21,.86) 0%, rgba(8,9,21,.30) 22%, rgba(8,9,21,.18) 80%, rgba(8,9,21,.52) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
