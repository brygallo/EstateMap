import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {font, palette, safe} from './theme';

/**
 * Shared closing card. Every piece ends the same way so the account is
 * recognisable in a feed: the mark, the product name, the domain and the call
 * to action of that particular video.
 */
export const Outro: React.FC<{cta: string; url: string; brandTile: string | null; accent: string; kicker?: string | null}> = ({
  cta,
  url,
  brandTile,
  accent,
  kicker,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const mark = spring({frame, fps, config: {damping: 15, mass: 0.7}});
  const name = spring({frame: frame - fps * 0.22, fps, config: {damping: 18}});
  const line = interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const call = spring({frame: frame - fps * 0.6, fps, config: {damping: 18}});
  const glow = interpolate(frame, [0, fps * 1.4], [0.5, 1], {extrapolateRight: 'clamp'});
  const orbit = frame * 0.45;
  const pulse = 1 + Math.sin(frame / 7) * 0.018;

  return (
    <AbsoluteFill style={{backgroundColor: palette.ink, fontFamily: font, color: palette.white}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 38%, ${accent}2E 0%, rgba(8,9,21,0) 58%)`,
          opacity: glow,
        }}
      />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 560, pointerEvents: 'none'}}>
        {[0, 1].map((ring) => (
          <div
            key={ring}
            style={{
              position: 'absolute',
              width: 330 + ring * 92,
              height: 330 + ring * 92,
              borderRadius: '50%',
              border: `2px solid ${accent}${ring === 0 ? '52' : '28'}`,
              opacity: mark,
              transform: `rotate(${(ring ? -1 : 1) * orbit}deg) scale(${0.82 + mark * 0.18})`,
              boxShadow: ring === 0 ? `inset 0 0 42px ${accent}20` : 'none',
            }}
          >
            <div style={{position: 'absolute', left: '50%', top: -7, width: 14, height: 14, borderRadius: '50%', backgroundColor: accent, boxShadow: `0 0 22px ${accent}`}} />
          </div>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 260}}>
        {brandTile ? (
          <Img
            src={staticFile(brandTile)}
            style={{
              width: 232,
              height: 232,
              borderRadius: 58,
              transform: `scale(${0.82 + mark * 0.18})`,
              opacity: mark,
              boxShadow: '0 30px 90px rgba(107,92,246,.45)',
            }}
          />
        ) : null}
        <div
          style={{
            marginTop: 46,
            fontSize: 58,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            opacity: name,
            transform: `translateY(${(1 - name) * 26}px)`,
          }}
        >
          Geo Propiedades Ecuador
        </div>
        <div
          style={{
            marginTop: 26,
            height: 8,
            width: 300 * line,
            borderRadius: 99,
            backgroundColor: accent,
          }}
        />
        <div
          style={{
            marginTop: 34,
            padding: '17px 34px',
            borderRadius: 99,
            backgroundColor: accent,
            color: palette.ink,
            fontSize: 34,
            fontWeight: 800,
            opacity: call,
            transform: `translateY(${(1 - call) * 22}px)`,
            scale: `${pulse}`,
            boxShadow: `0 18px 52px ${accent}38`,
          }}
        >
          {url}
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            opacity: call,
          }}
        >
          {cta} <span style={{display: 'inline-block', transform: `translateX(${Math.sin(frame / 8) * 5}px)`}}>→</span>
        </div>
        {kicker ? (
          <div
            style={{
              marginTop: 18,
              fontSize: 28,
              fontWeight: 700,
              color: 'rgba(255,255,255,.66)',
              opacity: interpolate(frame, [fps * 0.9, fps * 1.3], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            {kicker}
          </div>
        ) : null}
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: safe.bottom - 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          opacity: interpolate(frame, [fps * 0.9, fps * 1.4], [0, 0.95], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        <span style={{fontSize: 26, fontWeight: 700, letterSpacing: '0.12em'}}>UN PRODUCTO DE</span>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 18,
            background: 'linear-gradient(140deg, #7C6BF8 0%, #5A46E0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 28px rgba(107,92,246,.5)',
          }}
        >
          <Img src={staticFile('brand/aents-symbol-negative.png')} style={{width: 44, height: 44}} />
        </div>
        <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '0.08em'}}>AENTS</span>
      </div>
    </AbsoluteFill>
  );
};
