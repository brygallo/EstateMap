import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {fit} from './layout';
import {font, palette, sideCrop} from './theme';

/**
 * The pieces every animation is built from, for both brands.
 *
 * A panel, a rail, a chip and a label that cannot overflow are the same object
 * whether the piece is selling a map or a system: only the ground and the accent
 * change. Keeping them here means a fix to the panel reaches every composition
 * at once, instead of landing in one brand's file and drifting in the other's.
 *
 * What does NOT belong here is a scene. `sim:aents-etapas` explains how Aents
 * builds software and would be a lie inside a Geo piece; a shared component that
 * needs a brand-specific `if` for its content has stopped being shared.
 */

export type BrandTokens = {
  /** Radial ground behind everything. */
  ground: string;
  /** The dominant hue: panels, links, selection. */
  accent: string;
  /** The lighter partner of the accent, for lines and secondary text. */
  soft: string;
  /** Reserved for what fails, waits or breaks. Never decorative. */
  alert: string;
  /** Reserved for what is confirmed. */
  confirm: string;
  /** The name printed in the panel's status line. */
  label: string;
};

const AENTS: BrandTokens = {
  ground: 'radial-gradient(circle at 72% 15%, #392D8C 0%, #15152E 36%, #080915 74%)',
  accent: palette.violet,
  soft: palette.lavender,
  alert: '#F59E0B',
  confirm: palette.green,
  label: 'AENTS',
};

const GEO: BrandTokens = {
  ground: 'radial-gradient(circle at 72% 15%, #10412C 0%, #101A2E 36%, #080915 74%)',
  accent: palette.green,
  soft: palette.teal,
  alert: '#F59E0B',
  confirm: palette.green,
  label: 'GEO PROPIEDADES',
};

/** The tokens of whoever is rendering; Geo is the default profile of the CLI. */
export const tokensFor = (brandId?: string, brandName?: string): BrandTokens => {
  const base = brandId === 'aents' ? AENTS : GEO;
  return brandName ? {...base, label: brandName.toUpperCase()} : base;
};

/** A stage of an arc, clamped at both ends so nothing extrapolates. */
export const beat = (value: number, from: number, to: number) =>
  interpolate(value, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** A rise and fall inside its own window, for a change that must not ring on. */
export const pulse = (value: number, at: number, width: number) =>
  Math.sin(beat(value, at, at + width) * Math.PI);

/** Tabular figures: a value that changes must not shift what sits beside it. */
export const figures: React.CSSProperties = {fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"'};

/* ------------------------------------------------------------------ *
 * The motion vocabulary
 *
 * A linear `interpolate` is why a composition looks like a slide deck: real
 * objects accelerate, settle past their mark and come back. Everything below
 * exists so a scene can be built out of weight, depth and light instead of
 * opacity fades — and so both brands share the same physics rather than each
 * inventing its own easing.
 * ------------------------------------------------------------------ */

/** Smooth acceleration and deceleration. The default for anything that travels. */
export const glide = (value: number, from: number, to: number) => {
  const t = beat(value, from, to);
  return t * t * (3 - 2 * t);
};

/** Fast out, slow in: for something that is thrown and then settles. */
export const settle = (value: number, from: number, to: number) => {
  const t = beat(value, from, to);
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Arrival with weight: overshoots its mark and comes back.
 *
 * The amount is small on purpose — 4 % — because a card that bounces like a
 * toy reads as a template. This is the difference between «it appeared» and
 * «it landed».
 */
export const land = (value: number, from: number, to: number) => {
  const t = beat(value, from, to);
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -9 * t) * Math.cos(t * Math.PI * 2.4);
};

/** Anticipation: pulls back before it goes. Use it on the subject, not on props. */
export const anticipate = (value: number, from: number, to: number) => {
  const t = beat(value, from, to);
  return t < 0.24 ? -0.28 * Math.sin((t / 0.24) * Math.PI) : glide(t, 0.24, 1);
};

/**
 * The nth member of a group, staggered by a beat of its own.
 *
 * The default step is short on purpose. A scene has to feel like «pasa esto, y
 * esto, y esto»: at least two visible events every second, or the viewer's
 * thumb decides the piece is not going anywhere. Four cards spread over three
 * seconds is a slideshow; the same four over one second is a beat.
 */
export const stagger = (index: number, step = 0.045) => index * step;

/**
 * A steady cadence of micro-events inside a scene.
 *
 * Returns a 0→1 ramp that restarts `times` per scene, so a composition can fire
 * something small — a blip travelling a line, a row lighting up, a chip leaving
 * a stack — at a rhythm the main choreography does not have to carry. This is
 * what fills the gaps between the big arrivals.
 */
export const metronome = (progress: number, times: number, offset = 0) => (progress * times + offset) % 1;

/** How long an arrival takes. Short: an entrance is an event, not a journey. */
export const ARRIVAL = 0.1;

/**
 * A light that lives behind the subject.
 *
 * Flat compositions read cheap because everything sits on the same plane. A
 * halo puts the subject in front of its own light, and it is the cheapest
 * depth cue that survives platform recompression.
 */
export const Halo: React.FC<{color: string; size: number; x: number; y: number; strength?: number}> = ({
  color,
  size,
  x,
  y,
  strength = 0.5,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
      opacity: strength,
      filter: 'blur(28px)',
      pointerEvents: 'none',
    }}
  />
);

/**
 * A surface with a lit edge, the way a real panel catches light from above.
 *
 * The inner highlight and the darker underside are what make a rectangle read
 * as a physical card instead of a coloured div.
 */
export const glass = (tokens: BrandTokens, lift = 1): React.CSSProperties => ({
  background: 'linear-gradient(160deg, rgba(255,255,255,.11), rgba(255,255,255,.03) 42%, rgba(0,0,0,.16))',
  border: `2px solid ${tokens.soft}2E`,
  boxShadow: `0 ${18 * lift}px ${46 * lift}px rgba(0,0,0,.42), inset 0 2px 0 rgba(255,255,255,.16)`,
  backdropFilter: 'blur(2px)',
});

/** The same surface when it is the one being chosen. */
export const lit = (tokens: BrandTokens): React.CSSProperties => ({
  background: `linear-gradient(140deg, ${tokens.accent}, ${tokens.accent}99 46%, #3B2C93)`,
  border: `2px solid ${tokens.soft}`,
  boxShadow: `0 26px 64px ${tokens.accent}66, inset 0 2px 0 rgba(255,255,255,.28)`,
});

/**
 * A reveal that wipes instead of fading.
 *
 * Type that fades in has no direction and reads as a placeholder; type that is
 * uncovered has a hand behind it. `clip-path` costs nothing at render time.
 */
export const Reveal: React.FC<{progress: number; from?: 'left' | 'up'; children: React.ReactNode; style?: React.CSSProperties}> = ({
  progress,
  from = 'up',
  children,
  style,
}) => (
  <div
    style={{
      clipPath:
        from === 'left'
          ? `inset(0 ${(1 - progress) * 100}% 0 0)`
          : `inset(${(1 - progress) * 100}% 0 0 0)`,
      transform: from === 'left' ? `translateX(${(1 - progress) * -12}px)` : `translateY(${(1 - progress) * 16}px)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * A statement that arrives word by word, each one uncovered and settling.
 *
 * A headline that fades in as a block is a caption. Kinetic type is how a claim
 * gets said out loud: the words land in reading order, at reading speed, and the
 * eye is never asked to take a whole sentence at once.
 */
export const KineticText: React.FC<{
  text: string;
  progress: number;
  style?: React.CSSProperties;
  step?: number;
}> = ({text, progress, style, step = 0.12}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', gap: '0 .28em', ...style}}>
    {text.split(' ').map((word, index) => {
      const arrival = beat(progress, index * step, index * step + 0.42);
      return (
        <span
          key={`${word}-${index}`}
          style={{
            display: 'inline-block',
            opacity: arrival,
            filter: arrival < 1 ? `blur(${(1 - arrival) * 6}px)` : 'none',
            transform: `translateY(${(1 - arrival) * 26}px)`,
          }}
        >
          {word}
        </span>
      );
    })}
  </div>
);

/**
 * A light that crosses a surface and keeps crossing it.
 *
 * It is what makes a panel look powered rather than printed, and it is the
 * cheapest way to keep a composition alive during the beats where the subject
 * is deliberately holding still.
 */
export const Sweep: React.FC<{progress: number; color: string; width?: number; span?: number}> = ({
  progress,
  color,
  width = 200,
  span: distance = 900,
}) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      width,
      left: -width + ((progress * 1.6) % 1) * (distance + width),
      background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      pointerEvents: 'none',
    }}
  />
);

/**
 * A connector that is drawn by something: the line arrives with a head on it.
 *
 * A path that simply grows is a progress bar. A path with a travelling dot is
 * a signal going somewhere, which is the entire subject of half these scenes.
 */
export const Trace: React.FC<{
  from: {x: number; y: number};
  to: {x: number; y: number};
  progress: number;
  color: string;
  width?: number;
  head?: boolean;
}> = ({from, to, progress, color, width = 4, head = true}) => (
  <>
    <path
      d={`M${from.x} ${from.y} L${to.x} ${to.y}`}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
      opacity={0.9}
    />
    {head && progress > 0 && progress < 1 ? (
      <circle
        cx={from.x + (to.x - from.x) * progress}
        cy={from.y + (to.y - from.y) * progress}
        r={width * 1.7}
        fill={color}
      />
    ) : null}
  </>
);

/**
 * Text that cannot leave its box.
 *
 * The size is measured against the width the caller actually has — the
 * container minus its padding — and never guessed from the length of the
 * string. `AUTOMATIZACIÓN` printed over both borders of its card because the
 * size was chosen with `title.length > 10 ? 22 : 29`; a longer word would have
 * done it again at any hardcoded pair of numbers.
 */
export const BoxedText: React.FC<{
  text: string;
  width: number;
  max: number;
  min?: number;
  lines?: number;
  style?: React.CSSProperties;
}> = ({text, width, max, min, lines = 1, style}) => {
  const fitted = fit(text, {maxWidth: width, maxLines: lines, max, min: min ?? Math.round(max * 0.55)});
  return (
    <div style={{fontSize: fitted.fontSize, lineHeight: 1.06, ...style}}>
      {fitted.lines.map((line, index) => (
        <div key={`${line}-${index}`}>{line}</div>
      ))}
    </div>
  );
};

/**
 * A slow push that runs for the whole scene, in one direction.
 *
 * Not decoration: the review measures how long a composition holds the same
 * pixels, and a panel whose elements arrive and then park reads as a
 * photograph with a voice over it. Every scene built on this kit passes its own
 * progress so something is always moving, and the movement is slow enough that
 * nothing competes with the subject.
 */
export const camera = (progress: number) => ({
  transform: `scale(${1 + progress * 0.045}) translateY(${progress * -14}px)`,
});

/** Deterministic pseudo-randomness: same index, same value, every render. */
const scatter = (seed: number): number => {
  const value = Math.sin(seed * 91.7 + 47.3) * 26421.7;
  return value - Math.floor(value);
};

const MOTES = Array.from({length: 18}, (_, index) => ({
  x: scatter(index + 3) * 1080,
  y: 180 + scatter(index + 29) * 1000,
  size: 2 + scatter(index + 67) * 4,
  drift: 0.4 + scatter(index + 103) * 0.8,
  phase: scatter(index + 149),
}));

/**
 * The layer that keeps a frame alive while its subject is deliberately resting.
 *
 * Every arc closes before the scene does — that is the rule, and it is right —
 * but a composition whose last two seconds are the same pixels is a photograph
 * with a voice over it, and the review says so: `MotionDefectAudit` measured
 * aents-001 as still for 78 % of one of its scenes and it was correct.
 *
 * Air moving and light travelling are not events and are not meant to be. They
 * are the floor under the events, which is why they live in `Field` and reach
 * every composition of both brands instead of being remembered scene by scene.
 */
export const Ambient: React.FC<{tokens: BrandTokens; push: number; passes?: number}> = ({tokens, push, passes = 2.2}) => {
  const sweep = (push * passes) % 1;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 420,
          left: -420 + sweep * 1920,
          background: `linear-gradient(100deg, transparent, ${tokens.soft}1A 42%, ${tokens.soft}0F 58%, transparent)`,
          transform: 'skewX(-14deg)',
          pointerEvents: 'none',
        }}
      />
      {MOTES.map((mote, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: mote.x + Math.sin((push + mote.phase) * Math.PI * 2) * 26,
            top: mote.y - ((push * mote.drift + mote.phase) % 1) * 260,
            width: mote.size,
            height: mote.size,
            borderRadius: '50%',
            background: tokens.soft,
            opacity: 0.1 + mote.drift * 0.14,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};

/**
 * The full-bleed ground for beats that hold nothing but words.
 */
export const Field: React.FC<{tokens: BrandTokens; push?: number; children: React.ReactNode}> = ({tokens, push = 0, children}) => (
  <AbsoluteFill style={{background: tokens.ground, fontFamily: font, color: palette.white}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        backgroundImage: `linear-gradient(${tokens.soft}80 2px,transparent 2px),linear-gradient(90deg,${tokens.soft}80 2px,transparent 2px)`,
        backgroundSize: '64px 64px',
        maskImage: 'linear-gradient(#000,transparent 72%)',
        // The grid drifts against the push, so the ground is never a still
        // photograph even in the beats that hold nothing but words.
        backgroundPosition: `${push * -34}px ${push * 26}px`,
      }}
    />
    <Ambient tokens={tokens} push={push} />
    {children}
  </AbsoluteFill>
);

/** The inner width of `Panel`: the canvas minus the side crop and the padding. */
export const PANEL_WIDTH = 1080 - sideCrop * 2 - 44 * 2;

/**
 * The panel the series shows its subject in: one eyebrow, one title and the
 * brand's own status line, on the same ground as `Field`.
 */
export const Panel: React.FC<{
  tokens: BrandTokens;
  enter: number;
  eyebrow: string;
  title: string;
  /** Scene progress, 0 to 1: drives the slow push that keeps the frame alive. */
  push?: number;
  children: React.ReactNode;
}> = ({tokens, enter, eyebrow, title, push = 0, children}) => (
  <Field tokens={tokens} push={push}>
    <div
      style={{
        position: 'absolute',
        left: sideCrop,
        right: sideCrop,
        top: 305,
        height: 750,
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: '40px 44px 48px',
        borderRadius: 42,
        background: 'linear-gradient(145deg,rgba(30,28,61,.97),rgba(11,12,28,.98))',
        border: `2px solid ${tokens.soft}40`,
        boxShadow: `0 48px 130px rgba(0,0,0,.5),0 0 80px ${tokens.accent}2E, inset 0 2px 0 rgba(255,255,255,.14)`,
        opacity: enter,
        // A hair of perspective, resolving as the panel lands. Straight-on for
        // the whole scene is what makes a composition read as a slide.
        transformOrigin: '50% 100%',
        transform: `perspective(1600px) rotateX(${(1 - enter) * 4}deg) scale(${0.98 + enter * 0.02 + push * 0.03}) translateY(${push * -12}px)`,
      }}
    >
      <Halo color={`${tokens.accent}55`} size={760} x={PANEL_WIDTH * 0.72} y={120} strength={0.55} />
      <div style={{position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <Reveal progress={Math.min(1, enter * 1.6)} from="left">
          <span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.1em', color: tokens.soft}}>{eyebrow}</span>
        </Reveal>
        <span style={{fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.6)'}}>● &nbsp; {tokens.label}</span>
      </div>
      <Reveal progress={Math.min(1, enter * 1.35)} style={{position: 'relative'}}>
        <BoxedText text={title} width={PANEL_WIDTH} max={48} min={30} lines={2} style={{marginTop: 12, fontWeight: 800, letterSpacing: '-.05em'}} />
      </Reveal>
      {children}
    </div>
    <AbsoluteFill style={{top: 980, background: 'linear-gradient(transparent,rgba(8,9,21,.94) 32%,#080915 48%)'}} />
  </Field>
);
