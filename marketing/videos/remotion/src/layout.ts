import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {font} from './theme';

/**
 * Text is measured with the real font in the rendering browser instead of being
 * guessed. Without this a long CTA silently overflows the frame, which is what
 * happened to the first video the factory produced.
 */

const FAMILY = 'EstateMap Display';

export const useFontReady = (): boolean => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Loading display font'));
  useEffect(() => {
    const done = () => {
      setReady(true);
      continueRender(handle);
    };
    if (typeof document === 'undefined' || !document.fonts) {
      done();
      return;
    }
    document.fonts
      .load(`800 100px "${FAMILY}"`)
      .then(() => document.fonts.ready)
      .then(done)
      .catch(done);
  }, [handle]);
  return ready;
};

let context: CanvasRenderingContext2D | null = null;

const measurer = (): CanvasRenderingContext2D | null => {
  if (context) return context;
  if (typeof document === 'undefined') return null;
  context = document.createElement('canvas').getContext('2d');
  return context;
};

export const measure = (text: string, fontSize: number, letterSpacing: string): number => {
  const ctx = measurer();
  if (!ctx) return text.length * fontSize * 0.5;
  ctx.font = `800 ${fontSize}px ${font}`;
  // Chrome honours letterSpacing on the 2D context; older engines ignore it and
  // simply over-measure, which errs towards a smaller, safe font size.
  (ctx as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = letterSpacing;
  return ctx.measureText(text).width;
};

export const wrap = (text: string, fontSize: number, maxWidth: number, letterSpacing: string): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measure(candidate, fontSize, letterSpacing) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

type FitOptions = {
  maxWidth: number;
  maxLines: number;
  max: number;
  min: number;
  letterSpacing?: string;
};

export const fit = (text: string, options: FitOptions): {fontSize: number; lines: string[]} => {
  const letterSpacing = options.letterSpacing ?? '0em';
  for (let size = options.max; size >= options.min; size -= 2) {
    const lines = wrap(text, size, options.maxWidth, letterSpacing);
    const widest = Math.max(...lines.map((line) => measure(line, size, letterSpacing)));
    if (lines.length <= options.maxLines && widest <= options.maxWidth) {
      return {fontSize: size, lines};
    }
  }
  return {fontSize: options.min, lines: wrap(text, options.min, options.maxWidth, letterSpacing)};
};
