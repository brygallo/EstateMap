import React from 'react';
import {useVideoConfig} from 'remotion';
import {captionBox, font, palette} from './theme';
import {fit} from './layout';
import type {Caption} from './types';

/**
 * Karaoke captions. Each caption is its own synthesised clip, so its start and
 * end are measured from the audio rather than estimated; only the highlight
 * inside a caption is interpolated, and at two to six words the error stays
 * under a frame.
 */

const MAX_WIDTH = captionBox.width;

export const Captions: React.FC<{captions: Caption[]; frame: number; accent: string; ready: boolean}> = ({
  captions,
  frame,
  accent,
  ready,
}) => {
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const index = captions.findIndex((caption) => seconds < caption.end);
  const current = index === -1 ? captions[captions.length - 1] : captions[index];
  if (!current || !ready) return null;

  const local = seconds - current.start;
  const {fontSize, lines} = fit(current.text, {
    maxWidth: MAX_WIDTH,
    maxLines: 2,
    max: 54,
    min: 34,
    letterSpacing: '-0.02em',
  });

  let cursor = 0;
  const spoken = new Map<number, {start: number; end: number}>();
  for (const word of current.words) {
    spoken.set(cursor, {start: word.start, end: word.end});
    cursor += 1;
  }

  let wordIndex = 0;
  return (
    <div
      style={{
        width: MAX_WIDTH,
        // Keep one fixed two-line box for every caption. Recomputing the box
        // from each fitted font size moves the headline above it whenever a
        // longer fragment arrives, which reads as a cut in the whole scene.
        height: 132,
        fontFamily: font,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        // A caption replaces text on a stable baseline. Making every fragment
        // rise and fade repeats an entrance every few words and fights the
        // natural continuity of one spoken sentence.
        overflow: 'visible',
      }}
    >
      {lines.map((line, lineNumber) => (
        <div key={lineNumber} style={{display: 'flex', flexWrap: 'wrap', gap: '0 0.28em'}}>
          {line.split(/\s+/).filter(Boolean).map((word) => {
            const timing = spoken.get(wordIndex);
            wordIndex += 1;
            const active = timing ? local >= timing.start - 0.04 : false;
            return (
              <span
                key={`${lineNumber}-${wordIndex}`}
                style={{
                  color: active ? accent : palette.white,
                  transition: 'none',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
