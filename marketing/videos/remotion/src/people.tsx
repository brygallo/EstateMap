import React from 'react';

/**
 * People, drawn once and reused everywhere.
 *
 * A figure made of boxes that slide is what made the first scene look cheap.
 * This one has joints: shoulders, elbows, hips and knees rotate, the head
 * turns and nods, the chest breathes, and the weight shifts from foot to foot.
 * Every action below is a cycle driven by the frame, so nothing pops and
 * nothing needs to be told when to start.
 *
 * The ten actions are the ones the portal's stories actually need: someone
 * arriving, waiting, thinking it over, asking, pointing at what matters,
 * shrugging because the ad says nothing, agreeing, greeting, looking at their
 * phone, and celebrating. Each one is a person doing something, not a pose.
 */

export type PersonAction =
  | 'walk' | 'idle' | 'think' | 'talk' | 'point'
  | 'shrug' | 'agree' | 'wave' | 'phone' | 'celebrate';

export type PersonLook = {
  skin: string;
  hair: string;
  shirt: string;
  shirtDark: string;
  trousers: string;
  shoes: string;
};

/** Six looks, so a scene with three people is not the same person three times. */
export const LOOKS: PersonLook[] = [
  {skin: '#E8C6A0', hair: '#2B2118', shirt: '#2F6F55', shirtDark: '#25583F', trousers: '#243447', shoes: '#141C26'},
  {skin: '#C98D63', hair: '#1B1410', shirt: '#3B5BA9', shirtDark: '#2F4A8C', trousers: '#2B2F3A', shoes: '#16181F'},
  {skin: '#F0D3B4', hair: '#7A4B22', shirt: '#B4553F', shirtDark: '#94422F', trousers: '#39414F', shoes: '#1D222B'},
  {skin: '#8D5A3B', hair: '#120D0A', shirt: '#D9A441', shirtDark: '#B7862F', trousers: '#2A3240', shoes: '#15191F'},
  {skin: '#EBC49A', hair: '#43301F', shirt: '#6B5CF6', shirtDark: '#5346CC', trousers: '#26303D', shoes: '#171C24'},
  {skin: '#D9A87C', hair: '#0F0C0A', shirt: '#14B8A6', shirtDark: '#0F8F81', trousers: '#233040', shoes: '#131A21'},
];

const wave = (frame: number, period: number, phase = 0) => Math.sin((frame / period) * Math.PI * 2 + phase);
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

type Limb = {upper: number; fore: number; foot?: number};

/**
 * A value that travels around a cycle through keyframes, smoothed at each knot.
 *
 * A joint in a walk does not move like a sine wave. The knee, for one, bends
 * twice per stride and by very different amounts; written as a single sinusoid
 * it can only bend once, which is the first thing that reads as wrong. Keys are
 * given as [phase, degrees] with phase in 0..1, and the first and last must
 * agree or the cycle jumps when it wraps.
 */
const keyed = (phase: number, keys: [number, number][]) => {
  const t = phase - Math.floor(phase);
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
};

/**
 * Frames in one full gait cycle — two steps — at 30 fps.
 *
 * Thirty frames is one second, which puts the cadence near 120 steps a minute:
 * the pace of somebody walking somewhere, not strolling and not late. The
 * previous 22 was a third faster than that, closer to a jog, and no amount of
 * joint work reads as walking at a running cadence.
 */
const STRIDE = 30;

/**
 * One leg through one cycle, with phase 0 at heel strike.
 *
 * The numbers are the shape of a real gait, not a guess:
 *
 * - The **hip** swings almost sinusoidally, thigh forward at contact and behind
 *   the body just before the toe leaves the ground.
 * - The **knee** bends twice. A small give right after the heel lands, which is
 *   how a leg absorbs the body instead of stopping it dead, and a large one in
 *   mid-swing so the foot clears the floor. Between them it is nearly straight,
 *   because that is what holds the body up.
 * - The **ankle** is what was missing entirely. The heel lands with the toes
 *   raised, the foot rolls flat, and it pushes off toes-down. A foot welded to
 *   the shin can only slide; that single joint is most of the difference
 *   between walking and being dragged.
 */
const legCycle = (phase: number): Limb => ({
  upper: -24 * Math.cos(phase * Math.PI * 2),
  fore: keyed(phase, [
    [0, 4], [0.12, 17], [0.35, 6], [0.5, 14],
    [0.62, 46], [0.72, 60], [0.85, 26], [0.95, 5], [1, 4],
  ]),
  foot: keyed(phase, [
    [0, -9], [0.1, 4], [0.4, -3], [0.52, 26],
    [0.62, 6], [0.78, -9], [1, -9],
  ]),
});

/**
 * The skeleton, in the same numbers the drawing uses.
 *
 * These are read off `Leg` below and must stay with it: they are what lets the
 * body work out how high its own hips are.
 */
const THIGH = 64;   // hip pivot to knee pivot
const SHIN = 54;    // knee pivot to ankle pivot
const SOLE = 18;    // ankle to the bottom of the shoe
const HIP_Y = 194;  // the hip, measured down from the top of the figure
const STANDING = HIP_Y + THIGH + SHIN + SOLE; // where the sole sits standing still

/** How far below the hip this leg's sole reaches, for the angles it is holding. */
const soleDepth = (limb: Limb) => {
  const thigh = (limb.upper * Math.PI) / 180;
  const shin = thigh + (limb.fore * Math.PI) / 180;
  const foot = shin + ((limb.foot ?? 0) * Math.PI) / 180;
  return HIP_Y + THIGH * Math.cos(thigh) + SHIN * Math.cos(shin) + SOLE * Math.cos(foot);
};

/**
 * The arm on the same side as a leg, which swings against it.
 *
 * The elbow closes a little on the way forward and opens on the way back —
 * that is why a swinging arm is not a pendulum of one piece. A *little*: the
 * first attempt let it fold to nearly forty degrees and the forearm came across
 * the chest on every step, which reads as carrying something, not as walking.
 */
const armCycle = (phase: number): Limb => {
  const upper = 26 * Math.cos(phase * Math.PI * 2);
  return {upper, fore: 16 + Math.max(0, -upper) * 0.5};
};

/** Where every joint sits for a given action, as an angle in degrees. */
const posture = (action: PersonAction, frame: number) => {
  const gait = wave(frame, 22);
  const gait2 = wave(frame, 22, Math.PI);
  const breath = wave(frame, 96);
  const base = {
    head: breath * 1.2,
    nod: 0,
    torso: breath * 0.6,
    lift: 0,
    armL: {upper: 6, fore: 8} as Limb,
    armR: {upper: -6, fore: 8} as Limb,
    legL: {upper: 0, fore: 0} as Limb,
    legR: {upper: 0, fore: 0} as Limb,
  };
  switch (action) {
    case 'walk': {
      // Right leg leads; the left is half a cycle behind, which is what makes
      // two legs a walk instead of a hop.
      const right = (frame % STRIDE) / STRIDE;
      const left = right + 0.5;
      // The body rises over the leg that is holding it and drops when both feet
      // are down and the legs are apart — twice up and twice down per cycle.
      //
      // This is the correction that matters most. It used to be the other way
      // round: highest with the legs open, lowest standing on one leg. Nothing
      // else in the figure had to change for it to read as bouncing rather than
      // walking, because that inversion is exactly what a hop looks like.
      const legR = legCycle(right);
      const legL = legCycle(left);
      // The body does not bounce on a curve somebody picked: it sits on top of
      // whichever leg is holding it. Measuring how far the lower sole reaches
      // and hanging the hips that far above it is what keeps a planted foot
      // planted — no floating, no sinking through the floor — and it produces
      // the rise and fall of a real walk for free, with the right size and the
      // right timing. The version before this added a sine wave instead, and
      // the figure drifted a finger's width above the ground and back.
      const lift = Math.max(soleDepth(legR), soleDepth(legL)) - STANDING;
      return {
        ...base,
        lift,
        // A head that rides the bounce belongs to a puppet. A real one stays
        // put while the body moves under it, so it gives back about half of
        // what the hips just did.
        nod: lift * 0.8,
        head: breath * 0.8,
        // Walking leans into where it is going, and the shoulders roll a little
        // against the hips.
        torso: 3.4 + breath * 0.4 + Math.sin(right * Math.PI * 2) * 1.2,
        legR,
        legL,
        armR: armCycle(right),
        armL: armCycle(left),
      };
    }
    case 'idle':
      return {...base, lift: Math.abs(breath) * 1.5, legL: {upper: 2, fore: 0}, legR: {upper: -3, fore: 4}};
    case 'think':
      return {
        ...base,
        head: -6 + breath,
        nod: wave(frame, 70) * 3,
        armR: {upper: 24, fore: 122},
        armL: {upper: 10, fore: 22},
      };
    case 'talk':
      return {
        ...base,
        nod: wave(frame, 26) * 4,
        armR: {upper: 16 + wave(frame, 19) * 10, fore: 74 + wave(frame, 13) * 22},
        armL: {upper: 12, fore: 18},
      };
    case 'point':
      return {...base, head: -3, armR: {upper: -104 + wave(frame, 60) * 3, fore: -6}, armL: {upper: 10, fore: 12}};
    case 'shrug':
      return {
        ...base,
        head: wave(frame, 64) * 4,
        lift: 2 + smooth(Math.abs(wave(frame, 64))) * 8,
        armR: {upper: -60 - Math.abs(wave(frame, 64)) * 20, fore: -84},
        armL: {upper: 60 + Math.abs(wave(frame, 64)) * 20, fore: 84},
      };
    case 'agree':
      return {...base, nod: wave(frame, 20) * 9, armR: {upper: 10, fore: 64}, armL: {upper: 12, fore: 20}};
    case 'wave':
      return {...base, head: 3, armR: {upper: -146, fore: -44 + wave(frame, 12) * 26}, armL: {upper: 10, fore: 12}};
    case 'phone':
      return {
        ...base,
        head: -14 + breath,
        armR: {upper: 18, fore: 96},
        armL: {upper: 14, fore: 62},
      };
    case 'celebrate':
      return {
        ...base,
        lift: 4 + Math.abs(wave(frame, 18)) * 16,
        head: wave(frame, 18) * 3,
        armR: {upper: -150, fore: -20},
        armL: {upper: 150, fore: 20},
      };
    default:
      return base;
  }
};

/** A darker tone of the same colour, for the limbs on the far side. */
const darken = (hex: string, amount: number) => {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel * (1 - amount));
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  return `rgb(${r}, ${g}, ${b})`;
};

/** The edge that separates a limb from the body it hangs against. */
const EDGE = 'inset 0 0 0 3px rgba(10,14,24,.16)';

/**
 * An arm.
 *
 * `near` is the side of the body the camera is on. The far arm is drawn behind
 * the torso in a darker tone and the near one in front of it: without that a
 * shirt-coloured arm resting against a shirt-coloured chest is invisible, which
 * is how a person ends up looking like they have no arms at all.
 *
 * The joints rotate by the angle the posture asks for, with no side flip. Both
 * arms swing in the same plane; the alternation is already in the angles, and
 * mirroring one of them is what makes a walk look like a hop.
 *
 * The two shoulders sit close together on purpose. Pushed out to the edges of
 * the body they were far enough apart that a swing cancelled the gap at one
 * end of the stride and doubled it at the other: the hands bunched on one step
 * and flew apart on the next, which no walk does. Near the middle they simply
 * pass each other, which is what arms seen from the side actually do.
 */
const Arm: React.FC<{limb: Limb; look: PersonLook; near: boolean; holds?: 'phone'}> = ({limb, look, near, holds}) => {
  const upper = near ? look.shirt : darken(look.shirt, 0.28);
  const fore = near ? look.shirtDark : darken(look.shirtDark, 0.28);
  const skin = near ? look.skin : darken(look.skin, 0.22);
  return (
    <div style={{position: 'absolute', left: near ? 62 : 32, top: 96, width: 22, height: 62, transformOrigin: '50% 8px', transform: `rotate(${limb.upper}deg)`}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 11, background: upper, boxShadow: near ? EDGE : undefined}} />
      <div style={{position: 'absolute', left: 0, top: 52, width: 22, height: 58, transformOrigin: '50% 8px', transform: `rotate(${limb.fore}deg)`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 11, background: fore, boxShadow: near ? EDGE : undefined}} />
        <div style={{position: 'absolute', left: -1, top: 44, width: 24, height: 24, borderRadius: '50%', background: skin, boxShadow: near ? EDGE : undefined}} />
        {holds === 'phone' ? (
          <div style={{position: 'absolute', left: -16, top: 30, width: 32, height: 54, borderRadius: 7, background: '#0B0D17', border: '3px solid #39414F'}}>
            <div style={{position: 'absolute', inset: 4, borderRadius: 4, background: '#22C55E', opacity: .82}} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

/**
 * A leg, on the same rules as the arm, plus an ankle.
 *
 * The foot used to be painted onto the shin and could only slide along the
 * floor. Giving it a hinge is what lets the heel land first, the sole roll
 * flat and the toe push off — the three beats a walk is actually made of.
 * Every other action leaves `foot` unset and gets the old rigid foot back.
 */
const Leg: React.FC<{limb: Limb; look: PersonLook; near: boolean}> = ({limb, look, near}) => {
  const cloth = near ? look.trousers : darken(look.trousers, 0.26);
  const shoe = near ? look.shoes : darken(look.shoes, 0.26);
  return (
    <div style={{position: 'absolute', left: near ? 48 : 24, top: 186, width: 28, height: 74, transformOrigin: '50% 8px', transform: `rotate(${limb.upper}deg)`}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 12, background: cloth, boxShadow: near ? EDGE : undefined}} />
      <div style={{position: 'absolute', left: 0, top: 64, width: 28, height: 72, transformOrigin: '50% 8px', transform: `rotate(${limb.fore}deg)`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 12, background: cloth, boxShadow: near ? EDGE : undefined}} />
        {/* The pivot sits at the ankle, near the back of the shoe, so the foot
            turns about the heel instead of about the middle of itself. */}
        <div style={{position: 'absolute', left: 0, top: 58, width: 28, height: 22, transformOrigin: '32% 4px', transform: `rotate(${limb.foot ?? 0}deg)`}}>
          <div style={{position: 'absolute', left: -6, top: 0, width: 42, height: 22, borderRadius: '10px 14px 7px 7px', background: shoe, boxShadow: near ? EDGE : undefined}} />
        </div>
      </div>
    </div>
  );
};

/**
 * One person. `frame` drives every cycle, `action` chooses the posture, and
 * `facing` flips them without redrawing anything.
 */
export const Person: React.FC<{
  frame: number;
  action?: PersonAction;
  look?: number;
  facing?: 1 | -1;
  scale?: number;
  says?: string;
  saysProgress?: number;
  /** Which side of the person the bubble sits on: 1 to their right on screen. */
  saysSide?: 1 | -1;
  /** Degrees of head turn on top of the posture: where they are looking. */
  headTurn?: number;
  /** Degrees the whole body leans, for interest, weight or defeat. */
  lean?: number;
}> = ({frame, action = 'idle', look = 0, facing = 1, scale = 1, says, saysProgress = 1, saysSide = 1, headTurn = 0, lean = 0}) => {
  const skin = LOOKS[look % LOOKS.length];
  const pose = posture(action, frame);
  // A blink is two frames every hundred and twenty, never on the beat.
  const cycle = (frame + look * 37) % 118;
  const blink = cycle < 3 ? 0.12 : 1;
  const bubbleLeft = (saysSide === 1) === (facing === 1);
  const mouth = action === 'talk' ? Math.max(0, wave(frame, 9)) : says ? Math.max(0, wave(frame, 11)) * 0.7 : 0;
  return (
    // Anchored to the ground of whatever contains it: a person stands on the
    // floor of their scene, they do not hang from its ceiling.
    <div style={{position: 'absolute', left: 0, bottom: 0, width: 100, height: 340, transform: `scale(${scale * facing}, ${scale})`, transformOrigin: '50% 100%'}}>
      {/* The shadow is what puts weight on the floor. It shrinks when the
          person lifts off it, which is the only reason anyone believes a jump. */}
      <div style={{position: 'absolute', left: 4, bottom: -6, width: 92 - pose.lift * 1.4, height: 16, borderRadius: '50%', background: 'rgba(11,13,23,.22)', filter: 'blur(2px)'}} />
      {/* `saysSide` is which side of the screen the bubble sits on, so a person
          facing left does not end up talking into the back of their own head.
          The person is drawn mirrored, so the anchor flips with them. */}
      {says ? (
        <div style={{position: 'absolute', left: bubbleLeft ? 86 : undefined, right: bubbleLeft ? undefined : 86, bottom: 300, transform: `scaleX(${facing}) translateY(${(1 - smooth(saysProgress)) * 10}px)`, transformOrigin: '50% 50%', opacity: smooth(saysProgress), whiteSpace: 'nowrap'}}>
          <div style={{padding: '12px 22px', borderRadius: 999, background: '#FFFFFF', border: '4px solid #0B0D17', fontSize: 30, fontWeight: 900, color: '#0B0D17', boxShadow: '0 10px 24px rgba(0,0,0,.28)'}}>{says}</div>
            <div style={{position: 'absolute', left: bubbleLeft ? 22 : undefined, right: bubbleLeft ? undefined : 22, bottom: -14, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '16px solid #0B0D17'}} />
        </div>
      ) : null}
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-pose.lift}px) rotate(${pose.torso * 0.4 + lean}deg)`, transformOrigin: '50% 100%'}}>
        <Leg limb={pose.legL} look={skin} near={false} />
        <Arm limb={pose.armL} look={skin} near={false} />
        <div style={{position: 'absolute', left: 16, top: 88, width: 68, height: 108, borderRadius: '26px 26px 14px 14px', background: skin.shirt}} />
        <div style={{position: 'absolute', left: 16, top: 168, width: 68, height: 28, borderRadius: '0 0 14px 14px', background: skin.shirtDark}} />
        <Leg limb={pose.legR} look={skin} near />
        <Arm limb={pose.armR} look={skin} near holds={action === 'phone' ? 'phone' : undefined} />
        <div style={{position: 'absolute', left: 30, top: 74, width: 40, height: 20, borderRadius: 8, background: skin.skin}} />
        <div style={{position: 'absolute', left: 18, top: 8, width: 64, height: 74, transformOrigin: '50% 90%', transform: `rotate(${pose.head + headTurn}deg) translateY(${pose.nod * 0.6}px)`}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: '32px 32px 28px 28px', background: skin.skin}} />
          <div style={{position: 'absolute', left: -3, top: -4, width: 70, height: 34, borderRadius: '34px 34px 10px 10px', background: skin.hair}} />
          {/* Eyes blink on their own clock, roughly every four seconds, and
              the mouth opens while the person is speaking. Two details, and
              the difference between a puppet and someone who is alive. */}
          <div style={{position: 'absolute', left: 40, top: 38, width: 8, height: 8 * blink, borderRadius: '50%', background: '#1B1B1B'}} />
          <div style={{position: 'absolute', left: 22, top: 38, width: 8, height: 8 * blink, borderRadius: '50%', background: '#1B1B1B'}} />
          <div style={{position: 'absolute', left: 27, top: 53, width: 20, height: 6 + mouth * 10, borderRadius: 8, background: 'rgba(27,27,27,.62)'}} />
        </div>
      </div>
    </div>
  );
};
