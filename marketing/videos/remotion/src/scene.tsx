import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig, Video} from 'remotion';
import {MapField} from './map-field';
import {Captions} from './captions';
import {fit} from './layout';
import {font, headlineBox, palette, safe} from './theme';
import type {Scene} from './types';

const AssetLayer: React.FC<{scene: Scene; frame: number; offset: number}> = ({scene, frame, offset}) => {
  if (!scene.asset || !scene.assetType) {
    return <MapField accent={scene.accent} frame={frame + offset} />;
  }
  const span = Math.max(1, scene.durationInFrames);
  const scale = interpolate(frame, [0, span], [1.04, 1.13], {extrapolateRight: 'clamp'});
  const slide = interpolate(frame, [0, span], [0, -18], {extrapolateRight: 'clamp'});
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${scale}) translateY(${slide}px)`,
  };
  return (
    <AbsoluteFill style={{backgroundColor: palette.ink}}>
      {scene.assetType === 'video' ? (
        <Video src={staticFile(scene.asset)} muted loop style={style} />
      ) : (
        <Img src={staticFile(scene.asset)} style={style} />
      )}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(8,9,21,.72) 0%, rgba(8,9,21,.18) 26%, rgba(8,9,21,.55) 62%, rgba(8,9,21,.95) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Headline: React.FC<{text: string; accent: string; frame: number; ready: boolean; large: boolean}> = ({
  text,
  accent,
  frame,
  ready,
  large,
}) => {
  const {fps} = useVideoConfig();
  if (!ready) return null;
  const {fontSize, lines} = fit(text, {
    maxWidth: headlineBox.width,
    maxLines: 3,
    max: large ? 128 : 108,
    min: 52,
    letterSpacing: '-0.05em',
  });
  return (
    <div style={{position: 'absolute', left: headlineBox.left, width: headlineBox.width, top: headlineBox.top}}>
      <div
        style={{
          width: 104,
          height: 14,
          borderRadius: 99,
          backgroundColor: accent,
          marginBottom: 34,
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
          lineHeight: 0.99,
          letterSpacing: '-0.05em',
          color: palette.white,
          textShadow: '0 8px 40px rgba(8,9,21,.85)',
        }}
      >
        {lines.map((line, index) => {
          const start = fps * (0.05 + index * 0.09);
          const appear = interpolate(frame, [start, start + fps * 0.32], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={index} style={{overflow: 'hidden'}}>
              <div style={{transform: `translateY(${(1 - appear) * 78}px)`, opacity: appear}}>{line}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Wordmark: React.FC<{accent: string}> = ({accent}) => (
  <div
    style={{
      position: 'absolute',
      left: safe.left,
      top: safe.top - 96,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      fontFamily: font,
      fontWeight: 800,
      fontSize: 26,
      letterSpacing: '0.02em',
      color: palette.white,
      opacity: 0.92,
    }}
  >
    <div style={{width: 16, height: 16, borderRadius: 5, backgroundColor: accent}} />
    GEO PROPIEDADES
  </div>
);

const Closing: React.FC<{cta: string; url: string; brandTile: string | null; accent: string; frame: number; ready: boolean}> = ({
  cta,
  url,
  brandTile,
  accent,
  frame,
  ready,
}) => {
  const {fps} = useVideoConfig();
  const appear = interpolate(frame, [0, fps * 0.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (!ready) return null;
  const {fontSize, lines} = fit(cta, {
    maxWidth: headlineBox.width,
    maxLines: 2,
    max: 132,
    min: 58,
    letterSpacing: '-0.05em',
  });
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: appear}}>
      <div style={{width: headlineBox.width, textAlign: 'center'}}>
        {brandTile ? (
          <Img
            src={staticFile(brandTile)}
            style={{width: 168, height: 168, borderRadius: 42, marginBottom: 46, objectFit: 'cover'}}
          />
        ) : null}
        <div
          style={{
            fontFamily: font,
            fontWeight: 800,
            fontSize,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            color: palette.white,
            textShadow: '0 8px 40px rgba(8,9,21,.9)',
          }}
        >
          {lines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: 40,
            display: 'inline-block',
            padding: '18px 34px',
            borderRadius: 99,
            backgroundColor: accent,
            color: palette.ink,
            fontFamily: font,
            fontWeight: 800,
            fontSize: 40,
            letterSpacing: '-0.01em',
          }}
        >
          {url}
        </div>
      </div>
    </AbsoluteFill>
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
  ready: boolean;
}> = ({scene, index, total, offset, cta, url, brandTile, ready}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isFinal = scene.purpose === 'cta' || index === total - 1;
  const enter = interpolate(frame, [0, fps * 0.3], [scene.transition === 'fade' ? 0 : 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // One visible push per caption keeps the frame from ever sitting still for
  // the length of a whole sentence.
  const seconds = frame / fps;
  const beat = scene.captions.findIndex((caption) => seconds < caption.end);
  const beatStart = beat <= 0 ? 0 : scene.captions[beat - 1].end;
  const push = interpolate(seconds - beatStart, [0, 0.5], [1.014, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: enter, backgroundColor: palette.ink}}>
      <AbsoluteFill style={{transform: `scale(${push})`}}>
        <AssetLayer scene={scene} frame={frame} offset={offset} />
      </AbsoluteFill>
      <Wordmark accent={scene.accent} />
      {isFinal ? (
        <Closing cta={cta} url={url} brandTile={brandTile} accent={scene.accent} frame={frame} ready={ready} />
      ) : (
        <>
          <Headline text={scene.headline} accent={scene.accent} frame={frame} ready={ready} large={index === 0} />
          <Captions captions={scene.captions} frame={frame} accent={scene.accent} ready={ready} />
        </>
      )}
      {scene.voiceFile ? <Audio src={staticFile(scene.voiceFile)} /> : null}
    </AbsoluteFill>
  );
};
