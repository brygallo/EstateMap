import React from 'react';
import {AbsoluteFill} from 'remotion';
import {BrandTokens, beat, glide, settle} from './system-kit';
import {font, palette, sideCrop} from './theme';

/**
 * The stage the opening scene of every video is built on.
 *
 * The first scene is not one scene among several. It is the only one every
 * viewer sees, it is the frame the platform freezes on the feed, and — for a
 * company that sells the making of software — it is the sample of work. A hook
 * that reads as a slide says more about the supplier than any claim in the
 * script does, so the finish of this shot is a commercial argument, not a
 * decorative preference.
 *
 * Everything that can be decided once is decided here rather than left to
 * whoever writes the next composition: the depth planes and what each one costs
 * in scale, blur and parallax; the camera and how it closes in; the ground, its
 * light and its floor; the one moment of spectacle and its physics; and the
 * cadence that keeps events arriving. A composition brings the argument — what
 * is being shown and why — and gets the craft by construction.
 *
 * The rule this file exists to make unavoidable is in `animation-standard.md`
 * («La escena 1»), and `review_tools.HeroSceneAudit` fails the master when a
 * hook does not meet it. Prose alone was tried; it lasted one video.
 */

/* ------------------------------------------------------------------ *
 * The stage
 * ------------------------------------------------------------------ */

/**
 * The band of canvas a hook may draw legible content in.
 *
 * Above it sits the brand block, below it the headline and the captions. The
 * ground bleeds past it on every side — it is meant to be cropped — but nothing
 * that has to be read starts outside this box.
 */
export const HERO_BOX = {
  left: sideCrop,
  top: 300,
  width: 1080 - sideCrop * 2,
  height: 820,
} as const;

/** The centre of the stage, where a subject sits unless it has a reason not to. */
export const HERO_CENTRE = {
  x: HERO_BOX.left + HERO_BOX.width / 2,
  y: HERO_BOX.top + HERO_BOX.height / 2,
} as const;

/**
 * Named distances from the camera.
 *
 * Depth is declared, never improvised: a group states which plane it lives on
 * and the rig derives its scale, its blur and how far it travels in the
 * parallax. Everything on one plane is what makes a composition read as a form.
 */
export const DEPTH = {
  /** The light, the grid and the floor. Moves most, resolves least. */
  ground: 0,
  /** What surrounds the subject and explains where it is. */
  context: 0.45,
  /** What the scene is about. Always the sharpest thing in frame. */
  subject: 1,
  /** What passes in front of the camera. Blurred, brief, never legible. */
  foreground: 1.4,
} as const;

/**
 * At least this many visible events per second, or the hook is not a hook.
 *
 * Mirrored by `review_tools.HeroSceneAudit.MIN_EVENTS_PER_SECOND`, which
 * measures it on the finished master instead of trusting the source.
 */
export const HERO_MIN_EVENTS_PER_SECOND = 3;

/* ------------------------------------------------------------------ *
 * The camera
 * ------------------------------------------------------------------ */

export type HeroCamera = (depth: number) => React.CSSProperties;

export type HeroCameraOptions = {
  /** How much the camera closes in across the whole shot. */
  dolly?: number;
  /** Lateral travel at the ground plane, in canvas pixels. */
  drift?: number;
  /** Perspective that resolves as the shot settles, in degrees. */
  tilt?: number;
};

/**
 * One camera for the whole scene, and every plane reads its position from it.
 *
 * A composition where each element invents its own movement has no camera: it
 * has elements that happen to be moving, which is why the frame feels flat even
 * when a lot is going on. Here the movement belongs to the point of view, so
 * distance is what decides how fast something travels and how sharp it is.
 */
export const heroCamera = (
  progress: number,
  {dolly = 0.22, drift = 76, tilt = 3.2}: HeroCameraOptions = {},
): HeroCamera => {
  const push = glide(progress, 0, 1);
  const resolved = settle(progress, 0, 0.24);
  return (depth: number): React.CSSProperties => {
    // 0 at the subject, 1 at the ground; positive only in front of the subject.
    const distance = Math.max(0, DEPTH.subject - depth);
    const near = Math.max(0, depth - DEPTH.subject);
    const scale = 1 + dolly * push * (1 - distance * 0.6) + near * 0.08;
    const x = -drift * push * (distance - near * 0.9);
    const y = -14 * push * (1 - distance);
    const blur = distance * 3.4 + near * 6;
    return {
      transform:
        `perspective(1900px) rotateX(${(tilt * (1 - resolved) * distance).toFixed(3)}deg) ` +
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
      transformOrigin: '50% 46%',
      filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined,
      opacity: 1 - distance * 0.2 - near * 0.35,
    };
  };
};

/**
 * The camera moves a hook may be shot with, and no two consecutive pieces get
 * the same one.
 *
 * A shared kit raises the floor and, left alone, flattens everything to one
 * look: the same push-in, the same subject in the same place, video after
 * video. So the move is part of what a hook declares, `renderer.HERO_STAGINGS`
 * records which one each piece used, and `quality.check_hero_scene` refuses a
 * plan whose hook repeats the staging of the piece before it. Craft is shared;
 * the shot is not.
 */
export const HERO_MOVES = {
  /** Closes in on a subject that stays put. For a claim being made. */
  'push-in': (p: number) => heroCamera(p, {dolly: 0.26, drift: 64, tilt: 3.2}),
  /** Starts tight and discovers the context around it. For a reveal. */
  'pull-back': (p: number) => heroCamera(1 - glide(p, 0, 1), {dolly: 0.3, drift: 96, tilt: 4}),
  /** Travels sideways past its planes. For a comparison or a journey. */
  'track-side': (p: number) => heroCamera(p, {dolly: 0.1, drift: 210, tilt: 1.6}),
  /** Descends onto the subject. For something being assembled below. */
  'crane-down': (p: number) => heroCamera(p, {dolly: 0.18, drift: 26, tilt: 9}),
  /**
   * Barely moves, and what movement there is belongs to the camera.
   *
   * For a hook whose subject must stay legible in every single frame — an
   * interface being read, a price being compared. The other four are built for
   * a subject that survives being skewed and travelled past; a white card with
   * type on it does not, and the version of `sim:geo-ranking-hero` shot on
   * `crane-down` came out as a tilted lozenge with its title cut off. The push
   * is still there, so the frame is never static; it is just not the thing the
   * viewer is asked to look at.
   */
  'hold-in': (p: number) => heroCamera(p, {dolly: 0.1, drift: 14, tilt: 1.2}),
} as const;

export type HeroMove = keyof typeof HERO_MOVES;

/**
 * A group of elements that share a distance, and therefore share a movement.
 *
 * Callers put their own transforms on children, never on the plane: the plane's
 * transform belongs to the camera.
 */
export const HeroPlane: React.FC<{
  camera: HeroCamera;
  depth: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({camera, depth, style, children}) => (
  <div style={{position: 'absolute', inset: 0, ...style, ...camera(depth)}}>{children}</div>
);

/* ------------------------------------------------------------------ *
 * The ground
 * ------------------------------------------------------------------ */

/** Deterministic pseudo-randomness: same index, same value, every render. */
const scatter = (seed: number): number => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const MOTES = Array.from({length: 26}, (_, index) => ({
  x: scatter(index + 1) * 1080,
  y: 240 + scatter(index + 41) * 940,
  size: 2 + scatter(index + 91) * 5,
  depth: scatter(index + 137),
  phase: scatter(index + 181),
}));

/**
 * The ground every hook stands on: light with a source, a floor that catches
 * it, air with something in it, and a grid that drifts against the camera.
 *
 * None of it is decoration. Flat colour behind a subject is the single cheapest
 * looking thing a piece can do, and it is exactly what the platform's re-encode
 * turns into banding.
 */
export const HeroGround: React.FC<{
  tokens: BrandTokens;
  camera: HeroCamera;
  progress: number;
  /** Where the key light comes from, so every shadow in the scene agrees. */
  keyLight?: {x: number; y: number};
}> = ({tokens, camera, progress, keyLight = {x: 720, y: 220}}) => {
  const rise = settle(progress, 0, 0.5);
  return (
    <>
      <AbsoluteFill style={{background: tokens.ground}} />
      <HeroPlane camera={camera} depth={DEPTH.ground}>
        <div
          style={{
            position: 'absolute',
            inset: -220,
            opacity: 0.16,
            backgroundImage:
              `linear-gradient(${tokens.soft}80 3px,transparent 3px),` +
              `linear-gradient(90deg,${tokens.soft}80 3px,transparent 3px)`,
            backgroundSize: '84px 84px',
            // Far enough to read as ground travelling under a camera. A drift of
            // a few dozen pixels across a whole shot is a still photograph that
            // technically moved.
            backgroundPosition: `${progress * -230}px ${progress * 168}px`,
            maskImage: 'radial-gradient(ellipse at 50% 42%, #000 12%, transparent 78%)',
          }}
        />
        {/* The key light: one source, named, so shadows do not disagree. */}
        <div
          style={{
            position: 'absolute',
            left: keyLight.x - 620,
            top: keyLight.y - 620,
            width: 1240,
            height: 1240,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tokens.accent}4D 0%, ${tokens.accent}14 38%, transparent 70%)`,
            filter: 'blur(38px)',
            opacity: 0.5 + rise * 0.45,
          }}
        />
        {/* The floor. A subject with nothing under it is a sticker. */}
        <div
          style={{
            position: 'absolute',
            left: -120,
            right: -120,
            top: HERO_BOX.top + HERO_BOX.height - 40,
            height: 360,
            background: `linear-gradient(180deg, ${tokens.soft}1A, transparent 62%)`,
            maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
            opacity: rise,
          }}
        />
      </HeroPlane>
      <HeroPlane camera={camera} depth={DEPTH.context}>
        {MOTES.map((mote, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: mote.x,
              top: mote.y - ((progress + mote.phase) % 1) * 120,
              width: mote.size,
              height: mote.size,
              borderRadius: '50%',
              background: tokens.soft,
              opacity: (0.1 + mote.depth * 0.28) * rise,
              filter: `blur(${(1 - mote.depth) * 2}px)`,
            }}
          />
        ))}
      </HeroPlane>
    </>
  );
};

/** The dark corners that keep the eye where the subject is. */
export const HeroVignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: 'radial-gradient(ellipse at 50% 44%, transparent 44%, rgba(4,5,14,.62) 100%)',
      pointerEvents: 'none',
    }}
  />
);

/* ------------------------------------------------------------------ *
 * The one moment of spectacle
 * ------------------------------------------------------------------ */

/**
 * The beat the viewer remembers: a release of energy at a point in space.
 *
 * One per hook, and it lands on the frame the idea turns over — not on an
 * entrance. Two shockwaves at different speeds read as force; one reads as a
 * loading spinner. It is over quickly on purpose: a flash that outstays its
 * cause is the piece asking for attention it has not earned.
 */
export const HeroImpact: React.FC<{
  progress: number;
  /** When it fires, as a fraction of the scene's arc. */
  at: number;
  x: number;
  y: number;
  color: string;
  /** How long it takes to spend itself, as a fraction of the arc. */
  span?: number;
  /** Radius the outer ring reaches. */
  reach?: number;
}> = ({progress, at, x, y, color, span = 0.16, reach = 560}) => {
  const local = beat(progress, at, at + span);
  if (local <= 0 || local >= 1) return null;
  const rings = [
    {delay: 0, width: 6, scale: 1},
    {delay: 0.28, width: 3, scale: 0.62},
  ];
  const flash = Math.sin(beat(progress, at, at + span * 0.45) * Math.PI);
  return (
    <>
      {/* One short lift of the whole frame. A release of energy that only
          brightens the object it happened to is a highlight; the room has to
          feel it. It is brief and single so it stays inside the accessibility
          limit on flashes. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${x}px ${y}px, ${color}59, transparent 62%)`,
          opacity: flash * 0.7,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - reach * 0.42,
          top: y - reach * 0.42,
          width: reach * 0.84,
          height: reach * 0.84,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}CC 0%, ${color}33 32%, transparent 68%)`,
          filter: 'blur(24px)',
          opacity: flash * 0.9,
        }}
      />
      {rings.map((ring, index) => {
        const grown = settle(local, ring.delay, 1);
        const size = reach * ring.scale * grown;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              border: `${ring.width}px solid ${color}`,
              opacity: (1 - grown) * 0.85,
            }}
          />
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ *
 * Cadence
 * ------------------------------------------------------------------ */

export type HeroBeat = {
  index: number;
  /** Where this event starts, as a fraction of the arc. */
  start: number;
  /** 0 → 1 across the event itself. */
  progress: number;
  /** True once the event has resolved and can be relied on as state. */
  done: boolean;
};

/**
 * `count` events spread across a window of the arc, each with its own ramp.
 *
 * The reason this is a function and not a list of hand-written numbers is that
 * the hook has to keep its cadence whatever the voice measures: a scene that
 * came out at 3.6 s instead of 4.2 s must lose air, not lose its last event.
 */
export const heroBeats = (
  progress: number,
  count: number,
  {from = 0, to = 1, hold = 0.2}: {from?: number; to?: number; hold?: number} = {},
): HeroBeat[] => {
  const step = count > 1 ? (to - from - hold) / (count - 1) : 0;
  return Array.from({length: count}, (_, index) => {
    const start = from + step * index;
    const value = beat(progress, start, start + hold);
    return {index, start, progress: value, done: value >= 1};
  });
};

/**
 * The whole rig, assembled: ground, light, floor, air, vignette and camera.
 *
 * A hook composition renders `<HeroStage>` and places its planes inside. What it
 * still owns is everything this file cannot know — what is on screen, why it
 * moves, and what the viewer is supposed to understand by the end of it.
 */
export const HeroStage: React.FC<{
  tokens: BrandTokens;
  progress: number;
  camera?: HeroCamera;
  keyLight?: {x: number; y: number};
  children: (camera: HeroCamera) => React.ReactNode;
}> = ({tokens, progress, camera, keyLight, children}) => {
  const rig = camera ?? heroCamera(progress);
  return (
    <AbsoluteFill style={{background: palette.ink, overflow: 'hidden', fontFamily: font}}>
      <HeroGround tokens={tokens} camera={rig} progress={progress} keyLight={keyLight} />
      {children(rig)}
      <HeroVignette />
    </AbsoluteFill>
  );
};
