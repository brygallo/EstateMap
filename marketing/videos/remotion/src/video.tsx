import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, Series, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneCard} from './scene';
import {SafeAreaOverlay} from './safe-areas';
import {useFontReady} from './layout';
import {palette, safe, stage, textFloor} from './theme';
import type {VideoProps} from './types';

const fontUrl = staticFile('fonts/PlusJakartaSans-ExtraBold.ttf');

const Progress: React.FC<{scenes: VideoProps['scenes']; accent: string}> = ({scenes, accent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const total = scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0) || 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: safe.left,
        right: safe.left,
        // TikTok paints its caption, username and audio controls over the
        // bottom of the upload. The cue rides just under the last word rather
        // than off `safe.bottom`: anchoring it to a second constant let the two
        // drift apart, and lowering the text floor once put the bar straight
        // through the second caption line.
        top: textFloor + 12,
        height: 6,
        borderRadius: 99,
        backgroundColor: 'rgba(255,255,255,.16)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${Math.min(1, frame / total) * 100}%`,
          background: `linear-gradient(90deg, ${accent}, #FFFFFF, ${accent})`,
          backgroundSize: '220% 100%',
          backgroundPositionX: `${interpolate(frame, [0, total], [100, -100])}%`,
          boxShadow: `0 0 18px ${accent}`,
          transformOrigin: 'left center',
          transform: `scaleY(${spring({frame, fps, config: {damping: 18}})})`,
        }}
      />
    </div>
  );
};

export const EstateMapVideo: React.FC<VideoProps> = ({
  scenes,
  musicFile,
  cta,
  url,
  brandTile,
  brandId = 'geo',
  brandName = 'Geo Propiedades Ecuador',
  brandTagline = 'Un producto de Aents',
  brandSymbol = 'brand/aents-symbol-negative.png',
  kicker,
  showSafeAreas,
}) => {
  const ready = useFontReady();
  const frame = useCurrentFrame();
  let elapsed = 0;
  const offsets = scenes.map((scene) => {
    const value = elapsed;
    elapsed += scene.durationInFrames;
    return value;
  });
  const active = offsets.reduce((found, offset, index) => (frame >= offset ? index : found), 0);
  return (
    <AbsoluteFill style={{backgroundColor: palette.ink}}>
      {/* Two real weights, not one.
          The portal loads Plus Jakarta Sans as a variable face and uses 400 for
          meta lines, 600 for the reason pill, 700 for a title and 900 for a
          price. The factory shipped only the ExtraBold static, so every word in
          a product scene came out at the same weight and the interface lost the
          hierarchy that makes it read as an interface. `Regular` is the same
          family, from the same OFL licence the portal ships beside it, and with
          both declared the browser resolves 600 and 700 to the nearest real
          face instead of faking one. */}
      <style>{`@font-face { font-family: 'EstateMap Display'; src: url('${fontUrl}') format('truetype'); font-weight: 800; font-style: normal; font-display: block; }`}</style>
      <style>{`@font-face { font-family: 'EstateMap Display'; src: url('${staticFile('fonts/PlusJakartaSans-Regular.ttf')}') format('truetype'); font-weight: 400; font-style: normal; font-display: block; }`}</style>
      <Series>
        {scenes.map((scene, index) => (
          <Series.Sequence key={`${index}-${scene.headline}`} durationInFrames={scene.durationInFrames}>
            <SceneCard
              scene={scene}
              index={index}
              total={scenes.length}
              offset={offsets[index]}
              cta={cta}
              url={url}
              brandTile={brandTile}
              brandId={brandId}
              brandName={brandName}
              brandTagline={brandTagline}
              brandSymbol={brandSymbol}
              kicker={kicker ?? null}
              ready={ready}
            />
          </Series.Sequence>
        ))}
      </Series>
      <Progress scenes={scenes} accent={scenes[active]?.accent ?? palette.green} />
      {musicFile ? (
        <Sequence from={0}>
          <Audio src={staticFile(musicFile)} volume={0.1} loop />
        </Sequence>
      ) : null}
      {showSafeAreas ? <SafeAreaOverlay /> : null}
    </AbsoluteFill>
  );
};
