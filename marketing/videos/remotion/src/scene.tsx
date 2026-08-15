import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Video} from 'remotion';
import {MapField} from './map-field';
import {SIMULATIONS} from './simulations';
import {Outro} from './outro';
import {Captions} from './captions';
import {fit} from './layout';
import {font, headlineBox, palette, safe, stage, textFloor} from './theme';
import type {Scene} from './types';

/**
 * The product plays in the stage at the top of the frame with nothing on top of
 * it. Everything the piece has to say happens in the panel underneath.
 */
const Stage: React.FC<{scene: Scene; frame: number; offset: number}> = ({scene, frame, offset}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, scene.durationInFrames);
  const zoom = scene.assetType === 'simulation' ? 1 : interpolate(frame, [0, span], [1.0, 1.06], {extrapolateRight: 'clamp'});
  const entrance = spring({frame, fps, config: {damping: 20, mass: 0.85, stiffness: 150}});
  // Scenes meet on a stable frame. Moving the outgoing scene during its final
  // syllable reads like an accidental crop on short-form platforms.
  const depthScale = 1.035 - entrance * 0.035;
  const depthY = (1 - entrance) * 28;
  const sheen = interpolate(frame, [fps * 0.08, fps * 0.72], [-420, 1320], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const Simulation = scene.assetType === 'simulation' && scene.asset ? SIMULATIONS[scene.asset] : undefined;
  const body = Simulation
    // The simulation carries the accent of its own scene. Pinning it to the
    // brand green left the card painted green while the headline, the captions
    // and the progress bar alternated violet, teal and lavender: two accents
    // fighting inside the same frame.
    ? <Simulation frame={frame + scene.assetStartInFrames} total={scene.assetTotalInFrames} accent={scene.accent} photo={scene.photo ?? null} />
    : !scene.asset || !scene.assetType
      ? <MapField accent={scene.accent} frame={frame + offset} />
      : scene.assetType === 'video'
        ? <Video src={staticFile(scene.asset)} muted loop startFrom={scene.assetStartInFrames} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'}} />
        : <Img src={staticFile(scene.asset)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'}} />;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: stage.top,
        width: 1080,
        height: stage.height,
        overflow: 'hidden',
        backgroundColor: palette.ink,
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `translateY(${depthY}px) scale(${zoom * depthScale})`,
          transformOrigin: '50% 28%',
          filter: `blur(${(1 - entrance) * 4}px)`,
        }}
      >
        {body}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 720,
          left: sheen,
          width: 220,
          opacity: interpolate(frame, [0, fps * 0.2, fps * 0.64, fps * 0.82], [0, 0.16, 0.08, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.9), transparent)',
          transform: 'skewX(-18deg)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Just enough shade under the platform's own top bar to keep the
          wordmark legible; the interface itself stays untouched. */}
      {scene.assetType === 'simulation' ? null : <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 820,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.38) 26%, rgba(8,9,21,.86) 52%, rgba(8,9,21,.98) 72%, rgba(8,9,21,1) 100%)',
        }}
      />}
    </div>
  );
};

/** The address on the left, the mark alone on the right. */
const Wordmark: React.FC<{brandTile: string | null; frame: number; label?: string}> = ({brandTile, frame, label = 'geopropiedadesecuador.com'}) => {
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - 3, fps, config: {damping: 18, mass: 0.65}});
  return (
  <>
    <div
      style={{
        position: 'absolute',
        left: safe.left,
        top: safe.top,
        padding: '13px 24px',
        borderRadius: 99,
        backgroundColor: 'rgba(8,9,21,.72)',
        borderTop: '2px solid rgba(255,255,255,.16)',
        borderRight: '2px solid rgba(255,255,255,.16)',
        borderBottom: '2px solid rgba(255,255,255,.16)',
        backdropFilter: 'blur(14px)',
        fontFamily: font,
        fontWeight: 800,
        fontSize: 28,
        letterSpacing: '-0.01em',
        color: palette.white,
        opacity: enter,
        transform: `translateX(${(1 - enter) * -46}px)`,
      }}
    >
      {label}
    </div>
    {brandTile ? (
      <Img
        src={staticFile(brandTile)}
        style={{
          position: 'absolute',
          right: safe.left,
          top: safe.top,
          width: 64,
          height: 64,
          borderRadius: 19,
          boxShadow: '0 12px 30px rgba(8,9,21,.55)',
          opacity: enter,
          transform: `translateY(${(1 - enter) * -24}px) rotate(${(1 - enter) * 8}deg)`,
        }}
      />
    ) : null}
  </>
  );
};

const Headline: React.FC<{text: string; accent: string; frame: number; ready: boolean}> = ({
  text,
  accent,
  frame,
  ready,
}) => {
  const {fps} = useVideoConfig();
  if (!ready) return null;
  // A headline always occupies a single row: two rows crowd the caption under
  // it and cost the piece a beat of reading time.
  const {fontSize, lines} = fit(text, {
    maxWidth: headlineBox.width,
    maxLines: 1,
    max: 76,
    min: 38,
    letterSpacing: '-0.05em',
  });
  return (
    <div>
      <div
        style={{
          width: 66,
          height: 8,
          borderRadius: 99,
          backgroundColor: accent,
          marginBottom: 16,
          transform: `scaleX(${interpolate(frame, [0, fps * 0.4], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
          transformOrigin: 'left center',
        }}
      />
      <div
        style={{
          fontFamily: font,
          fontWeight: 800,
          fontSize,
          lineHeight: 1,
          letterSpacing: '-0.05em',
          color: palette.white,
        }}
      >
        {lines.map((line, index) => {
          const start = fps * (0.05 + index * 0.09);
          const appear = spring({frame: frame - start, fps, config: {damping: 20, mass: 0.7, stiffness: 150}});
          return (
            <div key={index} style={{overflow: 'hidden'}}>
              <div style={{transform: `translateY(${(1 - appear) * 70}px)`, opacity: appear}}>{line}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Closing: React.FC<{cta: string; url: string; brandTile: string | null; accent: string; frame: number; ready: boolean}> = ({
  cta,
  url,
  brandTile,
  accent,
  frame,
  ready,
}) => {
  const {fps} = useVideoConfig();
  const appear = interpolate(frame, [0, fps * 0.35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (!ready) return null;
  const {fontSize, lines} = fit(cta, {
    maxWidth: headlineBox.width,
    maxLines: 2,
    max: 104,
    min: 56,
    letterSpacing: '-0.05em',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: headlineBox.left,
        width: headlineBox.width,
        bottom: 1920 - 1440,
        opacity: appear,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26}}>
        {brandTile ? <Img src={staticFile(brandTile)} style={{width: 84, height: 84, borderRadius: 24}} /> : null}
        <div
          style={{
            padding: '14px 26px',
            borderRadius: 99,
            backgroundColor: accent,
            color: palette.ink,
            fontFamily: font,
            fontWeight: 800,
            fontSize: 34,
          }}
        >
          {url}
        </div>
      </div>
      <div
        style={{
          fontFamily: font,
          fontWeight: 800,
          fontSize,
          lineHeight: 1,
          letterSpacing: '-0.05em',
          color: palette.white,
        }}
      >
        {lines.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
      </div>
    </div>
  );
};

export const SceneCard: React.FC<{
  scene: Scene;
  index: number;
  total: number;
  offset: number;
  cta: string;
  url: string;
  brandTile: string | null;
  kicker: string | null;
  ready: boolean;
}> = ({scene, index, total, offset, cta, url, brandTile, kicker, ready}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isFinal = scene.purpose === 'cta' || index === total - 1;
  const enter = interpolate(frame, [0, fps * 0.28], [scene.transition === 'fade' ? 0 : 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{opacity: enter, backgroundColor: palette.ink}}>
      <Stage scene={scene} frame={frame} offset={offset} />
      {isFinal ? null : <Wordmark brandTile={brandTile} frame={frame} label={scene.asset?.startsWith('sim:aents-') ? 'aents.net' : 'geopropiedadesecuador.com'} />}
      {isFinal ? (
        scene.assetType === 'simulation' && scene.asset ? null : <Outro cta={cta} url={url} brandTile={brandTile} accent={scene.accent} kicker={kicker} />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: headlineBox.left,
            width: headlineBox.width,
            bottom: 1920 - textFloor,
            display: 'flex',
            flexDirection: 'column',
            gap: 34,
          }}
        >
          <Headline text={scene.headline} accent={scene.accent} frame={frame} ready={ready} />
          <Captions captions={scene.captions} frame={frame} accent={scene.accent} ready={ready} />
        </div>
      )}
      {scene.voiceFile ? <Audio src={staticFile(scene.voiceFile)} /> : null}
    </AbsoluteFill>
  );
};
