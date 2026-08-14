import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, Series, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {SceneCard} from './scene';
import {SafeAreaOverlay} from './safe-areas';
import {useFontReady} from './layout';
import {palette, safe, stage} from './theme';
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
        // bottom of the upload. Keep our progress cue at the edge of the safe
        // canvas instead of underneath the platform chrome.
        top: 1920 - safe.bottom - 8,
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
      <style>{`@font-face { font-family: 'EstateMap Display'; src: url('${fontUrl}') format('truetype'); font-weight: 800; font-style: normal; font-display: block; }`}</style>
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
