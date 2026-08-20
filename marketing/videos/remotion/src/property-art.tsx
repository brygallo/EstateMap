import React from 'react';

/**
 * The property a piece shows where the product would show a photograph.
 *
 * Every listing on the portal has photographs, and a piece that draws a grey
 * rectangle in their place is not showing the product — it is showing the
 * placeholder the product falls back to when something is missing. That is the
 * single cheapest-looking thing a Geo piece can do, and it is what separated
 * the first cut of `geo-015` from `geo-013`, which draws a whole house.
 *
 * Photographs are not an option: the listings in a piece are invented, and a
 * real photograph would be a real property this factory has no authorisation
 * to show. So they are illustrated — and illustrated with the care something
 * that appears in every piece deserves.
 *
 * **This is a library, not a drawing.** A ranking puts three of these on screen
 * at once and every future piece about listings draws them again, so a palette
 * swap is not enough: three houses that differ only in wall colour read as the
 * same photograph three times. `variant` picks a whole composition — the pitch
 * of the roof, how many storeys, whether there is a garage, how the block is
 * crowned, which neighbours a lot has — and the palette on top of that. The
 * axes multiply out to sixty compositions per kind before the palette is even
 * applied, and adding one more axis adds a whole set rather than one drawing.
 * `property-art.md`, next to this file, is the usage guide.
 *
 * What «with care» means concretely, and why each part is here:
 *
 * - **Nothing is flat.** Walls carry a vertical gradient, roofs a second one,
 *   glass a diagonal, the road and the grass their own. Flat fills are what the
 *   platform's re-encode bands first, and what makes a drawing read as a
 *   diagram.
 * - **Everything is on the ground.** Each volume casts a contact shadow. A
 *   subject with nothing under it is a sticker.
 * - **There is a distance.** Two hillsides sit behind the street, the far one
 *   hazier, because Quito has them behind every street and because two planes
 *   are the cheapest depth there is.
 * - **The details a person notices**: an eave that overhangs the wall, mullions
 *   and a reflection in the glass, a door with a step and a handle, a plinth at
 *   the foot of the wall, a kerb and a paved strip, planting in two tones, and
 *   a parked car or a figure on the pavement so the rest has a size.
 *
 * The drawing is SVG with a `viewBox`, so the same art is crisp at the 92 px of
 * a collapsed row and the 264 px of a hook card. The composition is centre-
 * weighted on purpose: a thumbnail is nearly square and `slice` crops the sides
 * down to roughly x ∈ [125, 315], so every subject is built inside that band
 * and only scenery — trees, a car, a lamp — is allowed to fall outside it.
 *
 * The four kinds are the product's own (`PropertyType` in
 * `frontend/lib/types.ts`). Each is drawn as the thing is recognised in the
 * street, not as the product models it — the lesson of 14 August: a plot seen
 * from above reads as a shape floating in the sky and nobody knows what it is,
 * so a lot is the gap between two houses, with its fence and the road in front.
 */

export type PropertyKind = 'house' | 'apartment' | 'land' | 'commercial';

/** Eight harmonised sets. Warm and cool alternate so a column has rhythm. */
const PALETTES = [
  {sky: ['#CFE7F7', '#EEF6FC'], wall: ['#FBF6EC', '#EADFCD'], roof: ['#33455E', '#22303F'], door: '#2B6B4F', accent: '#C9552F'},
  {sky: ['#F7DCC9', '#FDF3EA'], wall: ['#F3E3D3', '#DEC8B2'], roof: ['#8A4E3B', '#6B3A2A'], door: '#3A5470', accent: '#2E6E8E'},
  {sky: ['#D7EBDC', '#F1F8F3'], wall: ['#F2F5EE', '#DDE5D8'], roof: ['#365C4A', '#254134'], door: '#7A4030', accent: '#D08A2C'},
  {sky: ['#DEDAF6', '#F4F2FD'], wall: ['#F0EDF8', '#DAD4EA'], roof: ['#4C4470', '#332C52'], door: '#2F6360', accent: '#B8556F'},
  {sky: ['#FBE7D2', '#FEF7EE'], wall: ['#FFFBF3', '#EFE2CE'], roof: ['#7A5230', '#583919'], door: '#37566E', accent: '#4B8C6A'},
  {sky: ['#D3E6EF', '#EFF6FA'], wall: ['#E9EFF2', '#D3DDE3'], roof: ['#2C4756', '#1C2F3A'], door: '#8A5A2B', accent: '#C9552F'},
  {sky: ['#E7E0D1', '#FBF7EF'], wall: ['#F6EDE0', '#E2D2BC'], roof: ['#5A5F4A', '#3B4032'], door: '#93412F', accent: '#3A6EA5'},
  {sky: ['#CADCEF', '#EDF3FA'], wall: ['#EDE7F1', '#D6CEDD'], roof: ['#3E3550', '#281F38'], door: '#356B57', accent: '#D8752F'},
];

const KERB = '#EDF1F5';
const PAVING = '#E2E8EE';
const HILL = ['#C3D3DE', '#A9BFCE'];
const TREE = ['#5C9A6E', '#3F7551'];
const TRUNK = '#7A6046';
const CARS = ['#C9552F', '#3B6EA5', '#4B8C6A', '#D08A2C', '#7A5AA8', '#37566E', '#B24A4A'];
const SHIRTS = ['#3B6EA5', '#C9552F', '#4B8C6A', '#7A5AA8'];

/**
 * Where the scene is cut horizontally. Everything above `BASE` is built, below
 * it is pavement, kerb and road.
 */
const W = 440;
const H = 190;
const BASE = 150;
const GARDEN_TOP = 120;

/**
 * Deterministic per variant, so the same listing always draws the same scene.
 *
 * The stride has to be coprime with `count` or the axis stops moving — the
 * previous cut asked for `axis(v, 3, 3)` and got a constant, which is why every
 * block in the library was crowned the same way. Every stride below is a prime
 * of at least 7 and every count is at most 5, so coprimality holds by
 * construction and adjacent variants differ on *every* axis at once.
 */
const axis = (variant: number, prime: number, count: number) =>
  Math.abs(Math.floor(variant * prime + prime)) % count;

/** Contact shadow. Everything that stands on the ground gets one. */
const Grounded: React.FC<{x: number; w: number; y: number}> = ({x, w, y}) => (
  <ellipse cx={x + w / 2} cy={y} rx={w * 0.54} ry="5" fill="#1D2A36" opacity="0.17" />
);

/** Three silhouettes, because a street of identical lollipops reads as wallpaper. */
const Tree: React.FC<{x: number; y: number; r: number; shape?: number}> = ({x, y, r, shape = 0}) => (
  <g>
    <ellipse cx={x} cy={y + r * 0.95} rx={r * 0.85} ry={r * 0.2} fill="#1D2A36" opacity="0.13" />
    <rect x={x - r * 0.1} y={y} width={r * 0.2} height={r * 0.98} fill={TRUNK} rx={r * 0.08} />
    {shape === 0 ? (
      <>
        <circle cx={x} cy={y} r={r} fill={TREE[1]} />
        <circle cx={x - r * 0.3} cy={y - r * 0.24} r={r * 0.74} fill={TREE[0]} />
      </>
    ) : null}
    {shape === 1 ? (
      <>
        <path d={`M${x} ${y - r * 1.5} L${x + r * 0.72} ${y + r * 0.5} H${x - r * 0.72} Z`} fill={TREE[1]} />
        <path d={`M${x} ${y - r * 1.5} L${x - r * 0.72} ${y + r * 0.5} H${x - r * 0.1} Z`} fill={TREE[0]} />
      </>
    ) : null}
    {shape === 2 ? (
      <g>
        {[-1, -0.5, 0.5, 1].map((k) => (
          <path
            key={k}
            d={`M${x} ${y - r * 0.2} q${k * r * 1.1} ${-r * 0.5} ${k * r * 1.3} ${r * 0.35}`}
            stroke={k < 0 ? TREE[0] : TREE[1]}
            strokeWidth={r * 0.34}
            fill="none"
            strokeLinecap="round"
          />
        ))}
        <circle cx={x} cy={y - r * 0.24} r={r * 0.2} fill={TRUNK} />
      </g>
    ) : null}
  </g>
);

/** Low planting: fills the strip between a fence and a wall without stealing focus. */
const Bush: React.FC<{x: number; y: number; r: number}> = ({x, y, r}) => (
  <g>
    <ellipse cx={x} cy={y} rx={r * 1.15} ry={r * 0.85} fill={TREE[1]} />
    <ellipse cx={x - r * 0.35} cy={y - r * 0.25} rx={r * 0.7} ry={r * 0.55} fill={TREE[0]} />
  </g>
);

/** A window with a frame, a sill, mullions and one stroke of reflection. */
const Window: React.FC<{x: number; y: number; w: number; h: number; uid: string; bars?: boolean}> = ({
  x,
  y,
  w,
  h,
  uid,
  bars = true,
}) => (
  <g>
    <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="2.5" fill="#FFFFFF" opacity="0.9" />
    <rect x={x} y={y} width={w} height={h} rx="1.5" fill={`url(#glass-${uid})`} />
    {bars ? (
      <>
        <path d={`M${x + w / 2} ${y} V${y + h}`} stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
        <path d={`M${x} ${y + h / 2} H${x + w}`} stroke="#FFFFFF" strokeWidth="1.8" opacity="0.5" />
      </>
    ) : null}
    <path
      d={`M${x + 2.5} ${y + h - 3} L${x + w * 0.5} ${y + 2.5}`}
      stroke="#FFFFFF"
      strokeWidth="2.6"
      opacity="0.42"
      strokeLinecap="round"
    />
    <rect x={x - 4} y={y + h + 2} width={w + 8} height="2.6" rx="1.2" fill="#FFFFFF" opacity="0.75" />
  </g>
);

/** A door with a step under it and a handle on the latch side. */
const Door: React.FC<{x: number; y: number; w: number; h: number; colour: string; glazed?: boolean}> = ({
  x,
  y,
  w,
  h,
  colour,
  glazed = false,
}) => (
  <g>
    <rect x={x - 5} y={y + h - 3} width={w + 10} height="5" rx="1.5" fill={PAVING} />
    <rect x={x} y={y} width={w} height={h} rx="2" fill={colour} />
    <rect x={x + 3} y={y + 3} width={w - 6} height={h * 0.38} rx="1.5" fill="#FFFFFF" opacity={glazed ? 0.5 : 0.13} />
    <rect x={x + 3} y={y + h * 0.5} width={w - 6} height={h * 0.4} rx="1.5" fill="#000000" opacity="0.1" />
    <circle cx={x + w - 5} cy={y + h * 0.55} r="1.9" fill="#F4E6C8" />
  </g>
);

/** A parked car: the cheapest way to say how big everything else is. */
const Car: React.FC<{x: number; y: number; colour: string}> = ({x, y, colour}) => (
  <g>
    <ellipse cx={x + 25} cy={y} rx="27" ry="3.6" fill="#1D2A36" opacity="0.2" />
    <path d={`M${x + 8} ${y - 12} q6 -10 17 -10 h10 q9 1 14 10 z`} fill={colour} />
    <path d={`M${x + 13} ${y - 13} q5 -7 12 -7 h9 q7 1 11 7 z`} fill="#CFE0EC" />
    <rect x={x} y={y - 13} width="50" height="9" rx="4" fill={colour} />
    <rect x={x} y={y - 9} width="50" height="4" rx="2" fill="#000000" opacity="0.14" />
    <circle cx={x + 12} cy={y - 3} r="4.6" fill="#2A3440" />
    <circle cx={x + 12} cy={y - 3} r="1.8" fill="#8B98A6" />
    <circle cx={x + 38} cy={y - 3} r="4.6" fill="#2A3440" />
    <circle cx={x + 38} cy={y - 3} r="1.8" fill="#8B98A6" />
  </g>
);

/** A figure on the pavement. Nothing states a building's height faster. */
const Person: React.FC<{x: number; y: number; shirt: string}> = ({x, y, shirt}) => (
  <g>
    <ellipse cx={x} cy={y} rx="6" ry="2.4" fill="#1D2A36" opacity="0.18" />
    <rect x={x - 3} y={y - 9} width="6" height="9" rx="2" fill="#41506A" />
    <rect x={x - 4} y={y - 19} width="8" height="11" rx="3" fill={shirt} />
    <circle cx={x} cy={y - 22} r="3.4" fill="#E8C9A6" />
    <path d={`M${x - 3.4} ${y - 23.4} q3.4 -3.4 6.8 0 q-3.4 -1.6 -6.8 0 z`} fill="#3A3128" />
  </g>
);

/** A street lamp, for the variants that want something vertical. */
const Lamp: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <ellipse cx={x} cy={y} rx="5" ry="2.2" fill="#1D2A36" opacity="0.18" />
    <rect x={x - 2} y={y - 58} width="4" height="58" rx="1.5" fill="#8C97A3" />
    <rect x={x - 1} y={y - 58} width="1.4" height="58" fill="#FFFFFF" opacity="0.35" />
    <path d={`M${x} ${y - 58} q0 -11 13 -11`} stroke="#8C97A3" strokeWidth="3.6" fill="none" />
    <ellipse cx={x + 14} cy={y - 67} rx="7" ry="4" fill="#FFF3C4" />
    <ellipse cx={x + 14} cy={y - 63} rx="12" ry="6" fill="#FFF3C4" opacity="0.22" />
  </g>
);

/**
 * The five roof shapes a small building in Quito actually has, each with an
 * eave that flies past the wall and a fascia board under it. The overhang is
 * what stops a roof reading as a hat sitting on a box.
 */
const Roof: React.FC<{
  style: number;
  left: number;
  right: number;
  base: number;
  uid: string;
  flat: string;
}> = ({style, left, right, base, uid, flat}) => {
  const mid = (left + right) / 2;
  const l = left - 12;
  const r = right + 12;
  const fascia = <rect x={l} y={base - 1} width={r - l} height="5" rx="2" fill={flat} />;
  if (style === 0)
    return (
      <>
        <path d={`M${l} ${base} L${mid} ${base - 36} L${r} ${base} Z`} fill={`url(#roof-${uid})`} />
        <path d={`M${mid} ${base - 36} L${r} ${base} H${mid} Z`} fill="#000000" opacity="0.12" />
        {fascia}
      </>
    );
  if (style === 1)
    return (
      <>
        <path d={`M${l} ${base} L${left + 32} ${base - 30} L${right - 32} ${base - 30} L${r} ${base} Z`} fill={`url(#roof-${uid})`} />
        <path d={`M${right - 32} ${base - 30} L${r} ${base} H${mid} Z`} fill="#000000" opacity="0.1" />
        {fascia}
      </>
    );
  if (style === 2)
    return (
      <>
        <rect x={l} y={base - 12} width={r - l} height="12" rx="2" fill={`url(#roof-${uid})`} />
        <rect x={l} y={base - 14} width={r - l} height="4" rx="2" fill={flat} />
        <rect x={l + 6} y={base - 9} width={r - l - 12} height="3" fill="#FFFFFF" opacity="0.16" />
      </>
    );
  if (style === 3)
    return (
      <>
        {/* The gable end under a mono-pitch. Without it the slab floats. */}
        <path d={`M${left} ${base + 2} L${right} ${base + 2} L${right} ${base - 26} Z`} fill={`url(#wall-${uid})`} />
        <path d={`M${left} ${base + 2} L${right} ${base + 2} L${right} ${base - 26} Z`} fill="#1D2A36" opacity="0.13" />
        <path d={`M${l} ${base} L${l} ${base - 6} L${r} ${base - 32} L${r} ${base - 26} Z`} fill={`url(#roof-${uid})`} />
        <path d={`M${l} ${base - 6} L${r} ${base - 32} L${r} ${base - 29} L${l} ${base - 3} Z`} fill="#FFFFFF" opacity="0.16" />
      </>
    );
  return (
    <>
      <path d={`M${l} ${base} L${left + 14} ${base - 26} L${right - 14} ${base - 26} L${r} ${base} Z`} fill={`url(#roof-${uid})`} />
      <rect x={left + 8} y={base - 32} width={right - left - 16} height="8" rx="2" fill={flat} />
      <path d={`M${right - 14} ${base - 26} L${r} ${base} H${mid} Z`} fill="#000000" opacity="0.1" />
      {fascia}
    </>
  );
};

/** A wall with a plinth at its foot and a lit corner. Never a plain rectangle. */
const Wall: React.FC<{x: number; y: number; w: number; h: number; uid: string; plinth: string}> = ({
  x,
  y,
  w,
  h,
  uid,
  plinth,
}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="2" fill={`url(#wall-${uid})`} />
    <rect x={x} y={y + h - 7} width={w} height="7" fill={plinth} opacity="0.35" />
    <rect x={x} y={y} width="4" height={h} fill="#FFFFFF" opacity="0.3" />
    <rect x={x + w - 4} y={y} width="4" height={h} fill="#1D2A36" opacity="0.07" />
  </g>
);

/** Four ways to close a plot off from the pavement. */
const Fence: React.FC<{x: number; w: number; style: number; accent: string; roof: string; h?: number}> = ({
  x,
  w,
  style,
  accent,
  roof,
  h = 26,
}) => {
  const posts = Math.max(3, Math.round(w / 15));
  if (style === 0)
    return (
      <g>
        {Array.from({length: posts}, (_, i) => (
          <path
            key={i}
            d={`M${x + 4 + i * ((w - 8) / (posts - 1))} ${BASE} V${BASE - 22} l3.5 -4 l3.5 4`}
            stroke="#4E8B62"
            strokeWidth="3.4"
            fill="none"
            strokeLinejoin="round"
          />
        ))}
        <path d={`M${x} ${BASE - 14} H${x + w}`} stroke="#4E8B62" strokeWidth="3" />
      </g>
    );
  if (style === 1)
    return (
      <g>
        <rect x={x} y={BASE - 24} width={w} height="24" fill="url(#mesh)" opacity="0.85" />
        <path d={`M${x} ${BASE - 24} H${x + w}`} stroke="#8B98A6" strokeWidth="2.6" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={x + i * ((w - 4) / 2)} y={BASE - 27} width="4" height="27" rx="1.5" fill="#8B98A6" />
        ))}
      </g>
    );
  if (style === 2)
    return (
      <g>
        <rect x={x} y={BASE - h} width={w} height={h} rx="1.5" fill="#E4E0D6" />
        <rect x={x} y={BASE - h} width={w} height={h} rx="1.5" fill="#1D2A36" opacity="0.06" />
        <rect x={x - 2} y={BASE - h - 4} width={w + 4} height="5" rx="2" fill={roof} />
        <rect x={x + w * 0.38} y={BASE - h + 2} width={w * 0.26} height={h - 2} rx="1.5" fill={accent} opacity="0.85" />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M${x + w * 0.38 + 3 + (i * (w * 0.26 - 6)) / 3} ${BASE - h + 5} V${BASE - 3}`}
            stroke="#FFFFFF"
            strokeWidth="1.6"
            opacity="0.4"
          />
        ))}
      </g>
    );
  return (
    <g>
      {Array.from({length: posts}, (_, i) => (
        <rect key={i} x={x + 3 + i * ((w - 6) / (posts - 1))} y={BASE - 20} width="3.4" height="20" rx="1" fill="#9B8365" />
      ))}
      <path d={`M${x} ${BASE - 16} H${x + w} M${x} ${BASE - 8} H${x + w}`} stroke="#B9A88C" strokeWidth="1.8" />
    </g>
  );
};

/** The FOR SALE post that turns a gap between houses into a listing. */
const SaleSign: React.FC<{x: number; y: number; accent: string}> = ({x, y, accent}) => (
  <g>
    <rect x={x - 1.8} y={y} width="3.6" height={BASE - y} fill="#8A7256" />
    <rect x={x - 17} y={y - 20} width="34" height="21" rx="2.5" fill="#FFFFFF" />
    <rect x={x - 17} y={y - 20} width="34" height="6" rx="2.5" fill={accent} />
    <path d={`M${x - 12} ${y - 10} H${x + 12} M${x - 12} ${y - 5} H${x + 4}`} stroke="#7C8896" strokeWidth="2.2" strokeLinecap="round" />
  </g>
);

/** Shop cover: a striped scallop, a canvas with a valance, or a glass canopy. */
const Awning: React.FC<{x: number; w: number; y: number; style: number; accent: string}> = ({
  x,
  w,
  y,
  style,
  accent,
}) => {
  const drop = 20;
  if (style === 0) {
    const bays = Math.max(4, Math.round(w / 30));
    const step = w / bays;
    return (
      <g>
        <path d={`M${x + 6} ${y} H${x + w - 6} L${x + w} ${y + drop} H${x} Z`} fill="#F4F7FA" />
        {Array.from({length: bays}, (_, i) => (
          <path
            key={i}
            d={`M${x + 6 + i * step} ${y} L${x + i * step} ${y + drop} h${step * 0.5} l${step * 0.5 - 6} ${-drop} z`}
            fill={accent}
            opacity="0.85"
          />
        ))}
        <path
          d={`M${x} ${y + drop} q${w / (bays * 2)} 6 ${w / bays} 0 t${w / bays} 0 t${w / bays} 0 t${w / bays} 0 t${w / bays} 0 t${w / bays} 0`}
          fill="#F4F7FA"
        />
      </g>
    );
  }
  if (style === 1)
    return (
      <g>
        <path d={`M${x + 6} ${y} H${x + w - 6} L${x + w} ${y + drop} H${x} Z`} fill={accent} opacity="0.9" />
        <path d={`M${x + 6} ${y} H${x + w - 6} L${x + w} ${y + drop} H${x} Z`} fill="url(#shade)" opacity="0.35" />
        <rect x={x - 1} y={y + drop} width={w + 2} height="6" rx="2" fill="#F4F7FA" />
        <path d={`M${x + 4} ${y + drop + 6} H${x + w - 4}`} stroke="#1D2A36" strokeWidth="1.4" opacity="0.12" />
      </g>
    );
  if (style === 2)
    return (
      <g>
        <path d={`M${x + 4} ${y - 4} H${x + w - 4} L${x + w} ${y + 10} H${x} Z`} fill="#CFE6F2" opacity="0.75" />
        <path d={`M${x + 4} ${y - 4} H${x + w - 4} L${x + w} ${y + 10} H${x} Z`} fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
        {[0.2, 0.5, 0.8].map((k) => (
          <path key={k} d={`M${x + w * k} ${y - 3} L${x + w * k - 4} ${y - 16}`} stroke="#8B98A6" strokeWidth="2" />
        ))}
      </g>
    );
  return null;
};

/**
 * Signage without a word in it. A wordmark would either invent a business or
 * borrow a real one, so a sign is drawn as bars — the shape a person reads as
 * «sign» before they read the letters anyway.
 */
const Sign: React.FC<{x: number; w: number; y: number; style: number; accent: string; roof: string}> = ({
  x,
  w,
  y,
  style,
  accent,
  roof,
}) => {
  const band = (
    <g>
      <rect x={x} y={y} width={w} height="17" rx="2" fill={roof} />
      <rect x={x} y={y} width={w} height="5" fill="#FFFFFF" opacity="0.14" />
      <rect x={x + w * 0.16} y={y + 5} width={w * 0.4} height="6" rx="3" fill={accent} />
      <rect x={x + w * 0.6} y={y + 5} width={w * 0.24} height="6" rx="3" fill="#FFFFFF" opacity="0.6" />
    </g>
  );
  const blade = (
    <g>
      <rect x={x + w - 4} y={y - 2} width="4" height="30" rx="1" fill="#8B98A6" />
      <rect x={x + w} y={y} width="16" height="26" rx="2.5" fill={accent} />
      <path d={`M${x + w + 4} ${y + 7} H${x + w + 12} M${x + w + 4} ${y + 13} H${x + w + 12} M${x + w + 4} ${y + 19} H${x + w + 9}`} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    </g>
  );
  if (style === 0) return band;
  if (style === 1)
    return (
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={x + w * 0.2 + i * (w * 0.14)} y={y - 2} width={w * 0.1} height="15" rx="2" fill={accent} />
        ))}
        <rect x={x + w * 0.2} y={y + 14} width={w * 0.52} height="2.4" rx="1.2" fill="#1D2A36" opacity="0.14" />
      </g>
    );
  if (style === 2) return blade;
  if (style === 3)
    return (
      <>
        {band}
        {blade}
      </>
    );
  return (
    <g>
      {band}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${x + 14 + i * (w / 3)} ${y - 26} h14 v22 l-7 -5 l-7 5 z`}
          fill={i % 2 === 0 ? accent : roof}
          opacity="0.9"
        />
      ))}
      <path d={`M${x + 10} ${y - 26} H${x + w - 6}`} stroke="#8B98A6" strokeWidth="2" />
    </g>
  );
};

/** A balcony slab with a railing, used by the block and by the two-storey house. */
const Balcony: React.FC<{x: number; w: number; y: number; roof: string}> = ({x, w, y, roof}) => {
  const rails = Math.max(3, Math.round(w / 8));
  return (
    <g>
      <rect x={x} y={y} width={w} height="3.4" rx="1.4" fill={roof} opacity="0.8" />
      <rect x={x} y={y - 9} width={w} height="9" fill="#FFFFFF" opacity="0.5" />
      {Array.from({length: rails}, (_, i) => (
        <path
          key={i}
          d={`M${x + 2 + i * ((w - 4) / (rails - 1))} ${y} V${y - 9}`}
          stroke={roof}
          strokeWidth="1.3"
          opacity="0.55"
        />
      ))}
      <rect x={x - 1} y={y - 11} width={w + 2} height="2.4" rx="1.2" fill={roof} opacity="0.75" />
    </g>
  );
};

/** Outdoor stairs up to a raised entrance. */
const Stairs: React.FC<{x: number; y: number; w: number; steps: number}> = ({x, y, w, steps}) => (
  <g>
    {Array.from({length: steps}, (_, i) => (
      <rect key={i} x={x - i * 2} y={y + i * ((BASE - y) / steps)} width={w + i * 4} height={(BASE - y) / steps + 1} fill={PAVING} stroke="#C9D3DC" strokeWidth="0.6" />
    ))}
  </g>
);

export const PropertyArt: React.FC<{
  kind?: PropertyKind;
  variant?: number;
  /** 0 → 1 across the shot; drifts the subject so the art is never a still. */
  progress?: number;
  style?: React.CSSProperties;
}> = ({kind = 'house', variant = 0, progress = 0, style}) => {
  const p = PALETTES[axis(variant, 7, PALETTES.length)];
  // Variants can be negative, and an id may not collide between two on screen.
  const uid = `${kind}-${String(variant).replace(/[^0-9a-zA-Z]/g, 'n')}`;
  const shift = progress * (Math.abs(Math.round(variant)) % 2 === 0 ? 8 : -8);
  const car = CARS[axis(variant, 11, CARS.length)];
  const shirt = SHIRTS[axis(variant, 13, SHIRTS.length)];
  const treeShape = axis(variant, 17, 3);
  const scenery = axis(variant, 19, 3);

  // The axes of each kind. Each one multiplies the library rather than adding
  // one drawing; the counts are 5·3·3·4 or so, whose lowest common multiple is
  // 60, which is how many compositions a kind has before the palette applies.
  const roofStyle = axis(variant, 7, 5);
  const storeys = axis(variant, 11, 3) + 1;
  const outbuilding = axis(variant, 13, 3);
  const porch = axis(variant, 17, 3);
  const front = axis(variant, 19, 4);

  const floors = axis(variant, 7, 5) + 3;
  const crown = axis(variant, 11, 5);
  const balconies = axis(variant, 13, 4);
  const podium = axis(variant, 17, 3);

  const neighbours = axis(variant, 7, 5);
  const terrain = axis(variant, 11, 3);
  const fence = axis(variant, 13, 4);
  const lotExtra = axis(variant, 17, 3);

  const levels = axis(variant, 11, 3) + 1;
  const units = axis(variant, 13, 3) + 1;
  const awning = axis(variant, 17, 4);
  const signage = axis(variant, 7, 5);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={style}>
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <linearGradient id={`wall-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.wall[0]} />
          <stop offset="1" stopColor={p.wall[1]} />
        </linearGradient>
        <linearGradient id={`roof-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={p.roof[0]} />
          <stop offset="1" stopColor={p.roof[1]} />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#CDEAF7" />
          <stop offset="0.55" stopColor="#8FB2C8" />
          <stop offset="1" stopColor="#5D7891" />
        </linearGradient>
        <linearGradient id={`grass-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A6CCAC" />
          <stop offset="1" stopColor="#7FB088" />
        </linearGradient>
        <linearGradient id={`road-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8B96A3" />
          <stop offset="1" stopColor="#6B7684" />
        </linearGradient>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>
        <pattern id="mesh" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 0 L6 6 M6 0 L0 6" stroke="#A9B6C2" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width={W} height={H} fill={`url(#sky-${uid})`} />
      <circle cx={352 + shift * 0.2} cy="32" r="20" fill="#FFF8DC" opacity="0.95" />
      <circle cx={352 + shift * 0.2} cy="32" r="31" fill="#FFF8DC" opacity="0.22" />
      <g fill="#FFFFFF" opacity="0.55">
        <ellipse cx={92 + shift * 0.4} cy="34" rx="26" ry="9" />
        <ellipse cx={112 + shift * 0.4} cy="28" rx="17" ry="8" />
      </g>
      <path d="M-20 112 q72 -44 152 -20 q72 22 132 -12 q66 -36 196 6 V132 H-20 Z" fill={HILL[0]} opacity="0.5" />
      <path d="M-20 122 q86 -28 170 -4 q76 20 142 -10 q62 -26 168 14 V140 H-20 Z" fill={HILL[1]} opacity="0.55" />

      <rect x="0" y={GARDEN_TOP} width={W} height={H - GARDEN_TOP} fill={`url(#grass-${uid})`} />
      <rect x="0" y={BASE} width={W} height="10" fill={PAVING} />
      <path d={`M0 ${BASE} H${W}`} stroke="#C9D3DC" strokeWidth="1" />
      {[40, 120, 200, 280, 360].map((x) => (
        <path key={x} d={`M${x} ${BASE} V${BASE + 10}`} stroke="#CFD8E1" strokeWidth="1" />
      ))}
      <rect x="0" y={BASE + 10} width={W} height="6" fill={KERB} />
      <rect x="0" y={BASE + 16} width={W} height={H - BASE - 16} fill={`url(#road-${uid})`} />
      <path d={`M0 ${BASE + 17} H${W}`} stroke="#1D2A36" strokeWidth="2" opacity="0.14" />
      <path
        d={`M14 180 H108 M148 180 H242 M282 180 H376 M416 180 H440`}
        stroke="#E7ECF1"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />

      <g transform={`translate(${shift} 0)`}>
        {kind === 'house'
          ? (() => {
              // A garage or a carport eats into the plot, so the house narrows
              // and slides right; the whole subject still lands inside the band
              // a square thumbnail keeps.
              const narrow = storeys === 1 ? 14 : 0;
              const coreLeft = (outbuilding === 0 ? 138 : 186) + narrow;
              const coreRight = (outbuilding === 0 ? 302 : 306) - narrow;
              const coreW = coreRight - coreLeft;
              // A ground floor has to hold a door, a window above the sill and
              // a plinth; at 42 px it held none of them and the house read as a
              // bunker with a hat.
              const groundH = 54;
              const upperH = 28;
              const wallTop = BASE - groundH - (storeys - 1) * upperH;
              const bays = coreW > 150 ? 3 : 2;
              const doorX = coreLeft + coreW / 2 - 13;
              return (
                <>
                  <Grounded x={coreLeft - 6} w={coreW + 12} y={BASE} />
                  <Wall x={coreLeft} y={wallTop} w={coreW} h={BASE - wallTop} uid={uid} plinth={p.roof[1]} />
                  <Roof style={roofStyle} left={coreLeft} right={coreRight} base={wallTop + 4} uid={uid} flat={p.roof[1]} />

                  {Array.from({length: storeys - 1}, (_, i) => {
                    const y = wallTop + 8 + i * upperH;
                    return (
                      <g key={y}>
                        {Array.from({length: bays}, (_, b) => (
                          <Window
                            key={b}
                            x={coreLeft + 14 + b * ((coreW - 28) / bays)}
                            y={y}
                            w={(coreW - 28) / bays - 12}
                            h={16}
                            uid={uid}
                          />
                        ))}
                        <path d={`M${coreLeft} ${y + upperH - 6} H${coreRight}`} stroke={p.roof[1]} strokeWidth="2" opacity="0.18" />
                      </g>
                    );
                  })}

                  <Window x={coreLeft + 12} y={BASE - 42} w={coreW * 0.26} h={26} uid={uid} />
                  <Window x={coreRight - 12 - coreW * 0.26} y={BASE - 42} w={coreW * 0.26} h={26} uid={uid} />
                  <Door x={doorX} y={BASE - 38} w={26} h={38} colour={p.door} />

                  {porch === 1 ? (
                    <>
                      <path d={`M${doorX - 25} ${BASE - 50} h62 v5 h-62 z`} fill={p.roof[1]} />
                      <path d={`M${doorX - 22} ${BASE - 45} V${BASE} M${doorX + 35} ${BASE - 45} V${BASE}`} stroke="#FFFFFF" strokeWidth="3.4" opacity="0.9" />
                      <path d={`M${doorX - 22} ${BASE - 45} V${BASE} M${doorX + 35} ${BASE - 45} V${BASE}`} stroke="#1D2A36" strokeWidth="1" opacity="0.1" />
                    </>
                  ) : null}
                  {porch === 2 && storeys > 1 ? (
                    <Balcony x={doorX - 18} w={62} y={BASE - 52} roof={p.roof[1]} />
                  ) : null}
                  {porch === 2 && storeys === 1 ? <Stairs x={doorX - 2} y={BASE - 12} w={30} steps={2} /> : null}

                  {outbuilding === 1 ? (
                    <>
                      <Grounded x={130} w={54} y={BASE} />
                      <Wall x={136} y={BASE - 44} w={46} h={44} uid={uid} plinth={p.roof[1]} />
                      <rect x="128" y={BASE - 50} width="62" height="8" rx="2" fill={p.roof[1]} />
                      <rect x="143" y={BASE - 36} width="32" height="36" rx="1.5" fill={p.roof[0]} opacity="0.9" />
                      {[0, 1, 2, 3].map((i) => (
                        <path key={i} d={`M143 ${BASE - 29 + i * 8} H175`} stroke="#FFFFFF" strokeWidth="1.6" opacity="0.28" />
                      ))}
                    </>
                  ) : null}
                  {outbuilding === 2 ? (
                    <>
                      <rect x="126" y={BASE - 48} width="70" height="9" rx="2" fill={`url(#roof-${uid})`} />
                      <rect x="126" y={BASE - 40} width="70" height="4" rx="2" fill={p.roof[1]} />
                      <path d={`M132 ${BASE - 36} V${BASE} M190 ${BASE - 36} V${BASE}`} stroke="#B6C1CC" strokeWidth="3.4" />
                      <Car x={134} y={BASE - 1} colour={car} />
                    </>
                  ) : null}

                  {front === 1 ? <Fence x={coreLeft - 10} w={coreW + 22} style={2} accent={p.accent} roof={p.roof[1]} h={20} /> : null}
                  {front === 2 ? <Fence x={coreLeft - 10} w={coreW + 22} style={0} accent={p.accent} roof={p.roof[1]} /> : null}
                  {front === 3 ? (
                    <g>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Bush key={i} x={coreLeft - 6 + i * ((coreW + 12) / 4)} y={BASE - 7} r={11} />
                      ))}
                    </g>
                  ) : null}
                  {front === 0 ? (
                    <>
                      <path d={`M${doorX + 3} ${BASE} l-9 10 h38 l-9 -10 z`} fill={PAVING} />
                      <Bush x={coreLeft - 14} y={BASE - 6} r={9} />
                    </>
                  ) : null}

                  <Tree x={62} y={BASE - 24} r={19} shape={treeShape} />
                  <Tree x={388} y={BASE - 20} r={17} shape={(treeShape + 1) % 3} />
                  {scenery === 0 ? <Car x={286} y={BASE + 30} colour={car} /> : null}
                  {scenery === 1 ? <Lamp x={402} y={BASE + 10} /> : null}
                  {scenery === 2 ? (
                    <>
                      <Person x={340} y={BASE + 9} shirt={shirt} />
                      <Lamp x={92} y={BASE + 10} />
                    </>
                  ) : null}
                </>
              );
            })()
          : null}

        {kind === 'apartment'
          ? (() => {
              const left = 128;
              const right = 312;
              const width = right - left;
              // How a block is crowned is one of its four axes, so the crown has
              // to be inside the frame: the storeys share whatever is left after
              // the podium and a 24 px reserve at the top, never the other way
              // round. A taller block reads through the density of its bands.
              const podiumH = 32;
              const floorH = Math.min(24, Math.floor(88 / floors));
              const top = BASE - podiumH - floors * floorH;
              const bays = 3;
              const bayW = (width - 26) / bays;
              return (
                <>
                  <Grounded x={left - 6} w={width + 12} y={BASE} />
                  <Wall x={left} y={top} w={width} h={BASE - top} uid={uid} plinth={p.roof[1]} />

                  {crown === 0 ? <rect x={left - 10} y={top - 9} width={width + 20} height="12" rx="2" fill={`url(#roof-${uid})`} /> : null}
                  {crown === 1 ? (
                    <>
                      <rect x={left - 10} y={top - 8} width={width + 20} height="11" rx="2" fill={`url(#roof-${uid})`} />
                      {[left + 26, left + 52].map((x) => (
                        <g key={x}>
                          <rect x={x} y={top - 24} width="16" height="17" rx="7" fill="#DCE4EA" />
                          <rect x={x} y={top - 24} width="5" height="17" rx="2.5" fill="#FFFFFF" opacity="0.7" />
                        </g>
                      ))}
                      <rect x={right - 54} y={top - 20} width="34" height="13" rx="2" fill={p.roof[1]} />
                    </>
                  ) : null}
                  {crown === 2 ? (
                    <>
                      <rect x={left - 8} y={top - 6} width={width + 16} height="9" rx="2" fill={`url(#roof-${uid})`} />
                      <Wall x={left + 34} y={top - 24} w={width - 68} h={20} uid={uid} plinth={p.roof[1]} />
                      <rect x={left + 26} y={top - 29} width={width - 52} height="8" rx="2" fill={`url(#roof-${uid})`} />
                      <Window x={left + 48} y={top - 19} w={width - 96} h={11} uid={uid} bars={false} />
                    </>
                  ) : null}
                  {crown === 3 ? (
                    <>
                      <rect x={left - 8} y={top - 6} width={width + 16} height="9" rx="2" fill={`url(#roof-${uid})`} />
                      <rect x={left + 20} y={top - 28} width={width - 40} height="4" rx="2" fill={p.roof[1]} />
                      {[0, 1, 2, 3, 4].map((i) => (
                        <path key={i} d={`M${left + 26 + i * ((width - 52) / 4)} ${top - 24} V${top - 6}`} stroke={p.roof[1]} strokeWidth="2.6" />
                      ))}
                      <Bush x={left + 34} y={top - 10} r={8} />
                      <Bush x={right - 34} y={top - 10} r={8} />
                    </>
                  ) : null}
                  {crown === 4 ? (
                    <>
                      <path
                        d={`M${left - 12} ${top + 3} L${left + 38} ${top - 19} L${right - 38} ${top - 19} L${right + 12} ${top + 3} Z`}
                        fill={`url(#roof-${uid})`}
                      />
                      <path d={`M${right - 38} ${top - 19} L${right + 12} ${top + 3} H${left + width / 2} Z`} fill="#000000" opacity="0.1" />
                      <rect x={left - 12} y={top + 2} width={width + 24} height="5" rx="2" fill={p.roof[1]} />
                    </>
                  ) : null}

                  {Array.from({length: floors}, (_, i) => {
                    const y = top + 6 + i * floorH;
                    const glassH = Math.max(5, floorH - 10);
                    const loggia = balconies === 3 && i % 2 === 0;
                    return (
                      <g key={y}>
                        {Array.from({length: bays}, (_, b) => {
                          const x = left + 13 + b * bayW;
                          const w = bayW - 12;
                          if (loggia && b === 1)
                            return (
                              <g key={b}>
                                <rect x={x - 4} y={y - 3} width={w + 8} height={glassH + 8} rx="2" fill={p.roof[1]} opacity="0.5" />
                                <Window x={x} y={y} w={w} h={glassH} uid={uid} bars={false} />
                              </g>
                            );
                          return <Window key={b} x={x} y={y} w={w} h={glassH} uid={uid} bars={false} />;
                        })}
                        {balconies === 1 ? <Balcony x={left + 6} w={width - 12} y={y + floorH - 8} roof={p.roof[1]} /> : null}
                        {balconies === 2 && i % 2 === 1 ? (
                          <>
                            <Balcony x={left + 10} w={bayW + 4} y={y + floorH - 8} roof={p.roof[1]} />
                            <Balcony x={right - bayW - 14} w={bayW + 4} y={y + floorH - 8} roof={p.roof[1]} />
                          </>
                        ) : null}
                        {balconies === 0 ? (
                          <path d={`M${left} ${y + floorH - 5} H${right}`} stroke={p.roof[1]} strokeWidth="1.6" opacity="0.16" />
                        ) : null}
                      </g>
                    );
                  })}

                  {podium === 0 ? (
                    <>
                      <rect x={left + 8} y={BASE - podiumH + 4} width={width - 16} height={podiumH - 4} rx="2" fill={p.roof[1]} opacity="0.14" />
                      <rect x={left + width / 2 - 44} y={BASE - 30} width="88" height="8" rx="2" fill={p.roof[1]} />
                      <Window x={left + width / 2 - 40} y={BASE - 22} w={30} h={22} uid={uid} bars={false} />
                      <Window x={left + width / 2 + 10} y={BASE - 22} w={30} h={22} uid={uid} bars={false} />
                      <Door x={left + width / 2 - 8} y={BASE - 26} w={16} h={26} colour={p.door} glazed />
                    </>
                  ) : null}
                  {podium === 1 ? (
                    <>
                      <Window x={left + 14} y={BASE - 26} w={62} h={26} uid={uid} bars={false} />
                      <Window x={right - 76} y={BASE - 26} w={62} h={26} uid={uid} bars={false} />
                      <Awning x={left + 8} w={74} y={BASE - 32} style={0} accent={p.accent} />
                      <Awning x={right - 82} w={74} y={BASE - 32} style={1} accent={p.accent} />
                      <Door x={left + width / 2 - 12} y={BASE - 30} w={24} h={30} colour={p.door} glazed />
                    </>
                  ) : null}
                  {podium === 2 ? (
                    <>
                      <rect x={left + 6} y={BASE - podiumH} width={width - 12} height={podiumH} fill="#1D2A36" opacity="0.22" />
                      {[0, 1, 2, 3].map((i) => (
                        <rect key={i} x={left + 16 + i * ((width - 44) / 3)} y={BASE - podiumH} width="12" height={podiumH} fill={`url(#wall-${uid})`} />
                      ))}
                      <Car x={left + 42} y={BASE - 1} colour={car} />
                    </>
                  ) : null}

                  <Tree x={78} y={BASE - 26} r={20} shape={treeShape} />
                  <Tree x={370} y={BASE - 22} r={18} shape={(treeShape + 2) % 3} />
                  {scenery === 0 ? <Car x={330} y={BASE + 30} colour={car} /> : null}
                  {scenery === 1 ? (
                    <>
                      <Lamp x={404} y={BASE + 10} />
                      <Person x={116} y={BASE + 9} shirt={shirt} />
                    </>
                  ) : null}
                  {scenery === 2 ? <Person x={324} y={BASE + 9} shirt={shirt} /> : null}
                </>
              );
            })()
          : null}

        {kind === 'land'
          ? (() => {
              // A lot is not a shape seen from above: it is the gap between two
              // built neighbours, fenced, with the road in front. The gap sits
              // dead centre so a square crop keeps the whole story.
              const lotLeft = 184;
              const lotRight = 268;
              const leftHouse = neighbours !== 2;
              const rightHouse = neighbours !== 1;
              const leftStoreys = neighbours === 4 ? 2 : 1;
              const rightStoreys = neighbours === 3 ? 2 : 1;
              const lotBack = terrain === 1 ? 96 : 104;
              const lotFront = terrain === 1 ? 112 : 104;
              return (
                <>
                  {leftHouse ? (
                    <>
                      <Grounded x={92} w={92} y={BASE} />
                      <Wall x={98} y={BASE - 44 - (leftStoreys - 1) * 26} w={84} h={44 + (leftStoreys - 1) * 26} uid={uid} plinth={p.roof[1]} />
                      <Roof style={roofStyle} left={98} right={182} base={BASE - 40 - (leftStoreys - 1) * 26} uid={uid} flat={p.roof[1]} />
                      {leftStoreys === 2 ? <Window x={128} y={BASE - 62} w={30} h={16} uid={uid} /> : null}
                      <Window x={112} y={BASE - 34} w={26} h={20} uid={uid} />
                      <Door x={150} y={BASE - 28} w={22} h={28} colour={p.door} />
                    </>
                  ) : (
                    <>
                      <Tree x={112} y={BASE - 34} r={22} shape={treeShape} />
                      <Tree x={152} y={BASE - 24} r={17} shape={(treeShape + 1) % 3} />
                    </>
                  )}

                  {rightHouse ? (
                    <>
                      <Grounded x={268} w={92} y={BASE} />
                      <Wall x={274} y={BASE - 44 - (rightStoreys - 1) * 26} w={84} h={44 + (rightStoreys - 1) * 26} uid={uid} plinth={p.roof[1]} />
                      <Roof style={(roofStyle + 2) % 5} left={274} right={358} base={BASE - 40 - (rightStoreys - 1) * 26} uid={uid} flat={p.roof[1]} />
                      {rightStoreys === 2 ? <Window x={300} y={BASE - 62} w={30} h={16} uid={uid} /> : null}
                      <Window x={318} y={BASE - 34} w={26} h={20} uid={uid} />
                      <Door x={284} y={BASE - 28} w={22} h={28} colour={p.door} />
                    </>
                  ) : (
                    <>
                      <Tree x={300} y={BASE - 32} r={21} shape={(treeShape + 2) % 3} />
                      <Tree x={340} y={BASE - 22} r={16} shape={treeShape} />
                    </>
                  )}

                  {/* The party walls the neighbours left behind. They are what
                      turns a pale patch of grass into a plot with two sides. */}
                  {leftHouse ? <rect x={lotLeft - 6} y={BASE - 40} width="7" height="40" fill="#1D2A36" opacity="0.13" /> : null}
                  {rightHouse ? <rect x={lotRight - 1} y={BASE - 40} width="7" height="40" fill="#1D2A36" opacity="0.13" /> : null}

                  {/* Bare ground, not lawn: a vacant plot is the one thing in
                      the street nobody mows. */}
                  <path d={`M${lotLeft} ${lotFront} L${lotRight} ${lotBack} V${BASE} H${lotLeft} Z`} fill="#D9D2AE" />
                  <path d={`M${lotLeft} ${lotFront} L${lotRight} ${lotBack} V${lotBack + 9} L${lotLeft} ${lotFront + 9} Z`} fill="#B9C58E" />
                  <path d={`M${lotLeft} ${lotFront} L${lotRight} ${lotBack}`} stroke="#93A76F" strokeWidth="2.5" />
                  {terrain === 2 ? (
                    <>
                      <rect x={lotLeft} y={BASE - 24} width={lotRight - lotLeft} height="7" fill="#C6BC9C" />
                      <rect x={lotLeft} y={BASE - 24} width={lotRight - lotLeft} height="2" fill="#FFFFFF" opacity="0.5" />
                      <rect x={lotLeft} y={BASE - 17} width={lotRight - lotLeft} height="17" fill="#E2DCBC" />
                    </>
                  ) : null}
                  <ellipse cx={lotLeft + 26} cy={BASE - 12} rx="16" ry="5" fill="#C9BE99" />
                  <ellipse cx={lotRight - 22} cy={BASE - 24} rx="13" ry="4" fill="#C9BE99" />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <path
                      key={i}
                      d={`M${lotLeft + 8 + i * 17} ${BASE - 3 - (i % 2) * 9} q4 -9 1 -14`}
                      stroke="#8FA96B"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  ))}

                  {lotExtra === 1 ? (
                    <>
                      {[0, 1, 2].map((i) => (
                        <rect key={i} x={lotLeft + 8 + i * 32} y={BASE - 26} width="2.6" height="26" fill="#C9552F" />
                      ))}
                      <path d={`M${lotLeft + 9} ${BASE - 22} H${lotLeft + 73}`} stroke="#C9552F" strokeWidth="1.2" strokeDasharray="4 3" />
                    </>
                  ) : null}
                  {lotExtra === 2 ? (
                    <>
                      {[0, 1, 2, 3].map((i) => (
                        <rect
                          key={i}
                          x={lotLeft + 46 + (i % 2) * 15}
                          y={BASE - 8 - Math.floor(i / 2) * 7}
                          width="14"
                          height="6.5"
                          rx="1"
                          fill="#D8CDB6"
                          stroke="#BCB098"
                          strokeWidth="0.7"
                        />
                      ))}
                      <ellipse cx={lotLeft + 20} cy={BASE - 12} rx="11" ry="4" fill="#5D7891" />
                      <rect x={lotLeft + 9} y={BASE - 24} width="22" height="12" rx="3" fill="#8FB2C8" />
                    </>
                  ) : null}

                  <Fence x={lotLeft - 4} w={lotRight - lotLeft + 8} style={fence} accent={p.accent} roof={p.roof[1]} />
                  <SaleSign x={(lotLeft + lotRight) / 2} y={BASE - 62} accent={p.accent} />

                  {scenery === 0 ? <Car x={300} y={BASE + 30} colour={car} /> : null}
                  {scenery === 1 ? <Lamp x={152} y={BASE + 10} /> : null}
                  {scenery === 2 ? (
                    <>
                      <Person x={300} y={BASE + 9} shirt={shirt} />
                      <Lamp x={392} y={BASE + 10} />
                    </>
                  ) : null}
                </>
              );
            })()
          : null}

        {kind === 'commercial'
          ? (() => {
              const left = 124;
              const right = 316;
              const width = right - left;
              const shopH = 46;
              const officeH = 30;
              const top = BASE - shopH - (levels - 1) * officeH;
              const shopTop = BASE - shopH;
              const unitW = width / units;
              return (
                <>
                  <Grounded x={left - 6} w={width + 12} y={BASE} />
                  <Wall x={left} y={top} w={width} h={BASE - top} uid={uid} plinth={p.roof[1]} />
                  <rect x={left - 10} y={top - 8} width={width + 20} height="11" rx="2" fill={`url(#roof-${uid})`} />

                  {Array.from({length: levels - 1}, (_, i) => {
                    const y = top + 12 + i * officeH;
                    return (
                      <g key={y}>
                        {[0, 1, 2, 3].map((b) => (
                          <Window key={b} x={left + 14 + b * ((width - 28) / 4)} y={y} w={(width - 28) / 4 - 12} h={16} uid={uid} bars={false} />
                        ))}
                        <path d={`M${left} ${y + officeH - 8} H${right}`} stroke={p.roof[1]} strokeWidth="2" opacity="0.16" />
                      </g>
                    );
                  })}

                  <rect x={left + 4} y={shopTop} width={width - 8} height={shopH} rx="2" fill={p.roof[1]} opacity="0.18" />
                  {Array.from({length: units}, (_, u) => {
                    const x = left + 6 + u * unitW;
                    const w = unitW - 12;
                    const glassTop = shopTop + 18;
                    const glassH = BASE - glassTop;
                    return (
                      <g key={u}>
                        <Window x={x + 4} y={glassTop} w={w * 0.58} h={glassH} uid={uid} bars={false} />
                        {/* A lit interior behind the glass: an empty shopfront
                            the size of a wall reads as a hole, not a shop. */}
                        <rect x={x + 6} y={glassTop + glassH * 0.34} width={w * 0.54} height="4" rx="2" fill="#FFFFFF" opacity="0.4" />
                        <rect x={x + 6} y={BASE - 9} width={w * 0.54} height="9" fill={p.roof[1]} opacity="0.3" />
                        <Door x={x + w * 0.68} y={glassTop} w={w * 0.26} h={glassH} colour={p.door} glazed />
                        {u > 0 ? <rect x={left + u * unitW - 4} y={shopTop} width="5" height={shopH} fill={`url(#wall-${uid})`} /> : null}
                      </g>
                    );
                  })}

                  {/* Above the glass, never across it — an awning that covers the
                      window is a tarpaulin. */}
                  <Awning x={left + 4} w={width - 8} y={shopTop - 6} style={awning} accent={p.accent} />
                  <Sign x={left + 10} w={width - 20} y={shopTop - 27} style={signage} accent={p.accent} roof={p.roof[1]} />

                  <Tree x={72} y={BASE - 24} r={19} shape={treeShape} />
                  <Tree x={382} y={BASE - 20} r={17} shape={(treeShape + 1) % 3} />
                  <Bush x={left - 14} y={BASE - 6} r={9} />
                  <Bush x={right + 14} y={BASE - 6} r={9} />
                  {scenery === 0 ? (
                    <>
                      <Car x={276} y={BASE + 30} colour={car} />
                      <Person x={150} y={BASE + 9} shirt={shirt} />
                    </>
                  ) : null}
                  {scenery === 1 ? <Lamp x={402} y={BASE + 10} /> : null}
                  {scenery === 2 ? (
                    <>
                      <Person x={196} y={BASE + 9} shirt={shirt} />
                      <Person x={264} y={BASE + 9} shirt={SHIRTS[(SHIRTS.indexOf(shirt) + 2) % SHIRTS.length]} />
                    </>
                  ) : null}
                </>
              );
            })()
          : null}
      </g>

      <rect width={W} height={H} fill="none" stroke="#1D2A36" strokeWidth="10" opacity="0.05" />
    </svg>
  );
};
