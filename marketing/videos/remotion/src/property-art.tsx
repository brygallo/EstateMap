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
 * axes below multiply out to dozens of distinct scenes per kind, and adding one
 * more axis adds a whole set rather than one drawing.
 *
 * What «with care» means concretely, and why each part is here:
 *
 * - **Nothing is flat.** Walls carry a vertical gradient, roofs a second one,
 *   glass a diagonal. Flat fills are what the platform's re-encode bands first,
 *   and what makes a drawing read as a diagram.
 * - **Everything is on the ground.** Each volume casts a contact shadow. A
 *   subject with nothing under it is a sticker.
 * - **There is a distance.** A hillside sits behind the street, hazed, because
 *   Quito has one behind every street and because depth is what stops a drawing
 *   looking like clip art.
 * - **The details a person notices**: an eave that overhangs, mullions and a
 *   reflection in the glass, a door with a step and a handle, a kerb, planting
 *   in two tones, a parked car for scale.
 *
 * The drawing is SVG with a `viewBox`, so the same art is crisp at the 92 px of
 * a collapsed row and the 264 px of a hook card. The composition is centre-
 * weighted on purpose: a thumbnail is nearly square and `slice` crops the
 * sides, so nothing that carries meaning lives near the edges.
 *
 * The four kinds are the product's own (`PropertyType` in
 * `frontend/lib/types.ts`). Each is drawn as the thing is recognised in the
 * street, not as the product models it — the lesson of 14 August: a plot seen
 * from above reads as a shape floating in the sky and nobody knows what it is,
 * so a lot is the gap between two houses, with its fence and the road in front.
 */

export type PropertyKind = 'house' | 'apartment' | 'land' | 'commercial';

/** Six harmonised sets. Warm and cool alternate so a column has rhythm. */
const PALETTES = [
  {sky: ['#CFE7F7', '#EEF6FC'], wall: ['#FBF6EC', '#EADFCD'], roof: ['#33455E', '#22303F'], door: '#2B6B4F'},
  {sky: ['#F7DCC9', '#FDF3EA'], wall: ['#F3E3D3', '#DEC8B2'], roof: ['#8A4E3B', '#6B3A2A'], door: '#3A5470'},
  {sky: ['#D7EBDC', '#F1F8F3'], wall: ['#F2F5EE', '#DDE5D8'], roof: ['#365C4A', '#254134'], door: '#7A4030'},
  {sky: ['#DEDAF6', '#F4F2FD'], wall: ['#F0EDF8', '#DAD4EA'], roof: ['#4C4470', '#332C52'], door: '#2F6360'},
  {sky: ['#FBE7D2', '#FEF7EE'], wall: ['#FFFBF3', '#EFE2CE'], roof: ['#7A5230', '#583919'], door: '#37566E'},
  {sky: ['#D3E6EF', '#EFF6FA'], wall: ['#E9EFF2', '#D3DDE3'], roof: ['#2C4756', '#1C2F3A'], door: '#8A5A2B'},
];

const GRASS = ['#9DC7A4', '#7FB088'];
const KERB = '#DFE5EB';
const ROAD = '#7C8896';
const HILL = '#B9CBD8';
const TREE = ['#5C9A6E', '#3F7551'];
const CARS = ['#C9552F', '#3B6EA5', '#4B8C6A', '#D08A2C', '#7A5AA8', '#37566E'];

/**
 * Deterministic per variant, so the same listing always draws the same scene.
 * Two rows apart in a list must never land on the same combination, which a
 * plain modulo would do the moment two axes shared a factor — hence the primes.
 */
const axis = (variant: number, prime: number, count: number) =>
  Math.abs(Math.floor(variant * prime + prime)) % count;

/** A tree in two tones, so foliage has a lit side. */
const Tree: React.FC<{x: number; y: number; r: number}> = ({x, y, r}) => (
  <g>
    <ellipse cx={x} cy={y + r * 0.95} rx={r * 0.9} ry={r * 0.2} fill="#000" opacity="0.1" />
    <rect x={x - r * 0.11} y={y} width={r * 0.22} height={r * 0.95} fill="#7A6046" rx={r * 0.08} />
    <circle cx={x} cy={y} r={r} fill={TREE[1]} />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.78} fill={TREE[0]} />
  </g>
);

/** Contact shadow. Everything that stands on the ground gets one. */
const Grounded: React.FC<{x: number; w: number; y: number}> = ({x, w, y}) => (
  <ellipse cx={x + w / 2} cy={y} rx={w * 0.56} ry="7" fill="#1D2A36" opacity="0.16" />
);

/** A window with a frame, mullions and one stroke of reflection. */
const Window: React.FC<{x: number; y: number; w: number; h: number; uid: string; bars?: boolean}> = ({
  x,
  y,
  w,
  h,
  uid,
  bars = true,
}) => (
  <g>
    <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="3" fill="#FFFFFF" opacity="0.85" />
    <rect x={x} y={y} width={w} height={h} rx="2" fill={`url(#glass-${uid})`} />
    {bars ? (
      <>
        <path d={`M${x + w / 2} ${y} V${y + h}`} stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
        <path d={`M${x} ${y + h / 2} H${x + w}`} stroke="#FFFFFF" strokeWidth="2" opacity="0.55" />
      </>
    ) : null}
    <path
      d={`M${x + 3} ${y + h - 4} L${x + w * 0.55} ${y + 3}`}
      stroke="#FFFFFF"
      strokeWidth="3"
      opacity="0.45"
      strokeLinecap="round"
    />
  </g>
);

const Door: React.FC<{x: number; y: number; w: number; h: number; colour: string}> = ({x, y, w, h, colour}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="3" fill={colour} />
    <circle cx={x + w - 7} cy={y + h * 0.52} r="2.6" fill="#F4E6C8" />
    <rect x={x - 6} y={y + h - 4} width={w + 12} height="6" rx="2" fill={KERB} />
  </g>
);

/** A parked car: the cheapest way to say how big everything else is. */
const Car: React.FC<{x: number; y: number; colour: string}> = ({x, y, colour}) => (
  <g>
    <ellipse cx={x + 22} cy={y + 15} rx="26" ry="4" fill="#1D2A36" opacity="0.18" />
    <path d={`M${x} ${y + 9} q2 -9 10 -10 h24 q8 1 10 10 z`} fill={colour} />
    <rect x={x} y={y + 7} width="44" height="7" rx="3" fill={colour} />
    <path d={`M${x + 11} ${y + 1} h22 l5 7 h-32 z`} fill="#CFE0EC" />
    <circle cx={x + 11} cy={y + 14} r="4" fill="#2A3440" />
    <circle cx={x + 33} cy={y + 14} r="4" fill="#2A3440" />
  </g>
);

/** A street lamp, for the variants that want something vertical. */
const Lamp: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g>
    <rect x={x - 2} y={y - 54} width="4" height="54" fill="#8C97A3" />
    <path d={`M${x} ${y - 54} q0 -10 12 -10`} stroke="#8C97A3" strokeWidth="4" fill="none" />
    <ellipse cx={x + 13} cy={y - 62} rx="7" ry="4" fill="#FFF3C4" />
  </g>
);

/** The four roof shapes a small house in Quito actually has. */
const Roof: React.FC<{
  style: number;
  left: number;
  right: number;
  base: number;
  uid: string;
  flat: string;
}> = ({style, left, right, base, uid, flat}) => {
  const mid = (left + right) / 2;
  if (style === 0) return <path d={`M${left - 18} ${base} L${mid} ${base - 62} L${right + 18} ${base} Z`} fill={`url(#roof-${uid})`} />;
  if (style === 1)
    return (
      <path
        d={`M${left - 18} ${base} L${left + 42} ${base - 54} L${right - 42} ${base - 54} L${right + 18} ${base} Z`}
        fill={`url(#roof-${uid})`}
      />
    );
  if (style === 2)
    return (
      <>
        <rect x={left - 14} y={base - 20} width={right - left + 28} height="20" rx="3" fill={`url(#roof-${uid})`} />
        <rect x={left - 4} y={base - 28} width="26" height="10" rx="2" fill={flat} />
      </>
    );
  return <path d={`M${left - 18} ${base} L${right + 18} ${base - 56} L${right + 18} ${base} Z`} fill={`url(#roof-${uid})`} />;
};

export const PropertyArt: React.FC<{
  kind?: PropertyKind;
  variant?: number;
  /** 0 → 1 across the shot; drifts the subject so the art is never a still. */
  progress?: number;
  style?: React.CSSProperties;
}> = ({kind = 'house', variant = 0, progress = 0, style}) => {
  const p = PALETTES[axis(variant, 7, PALETTES.length)];
  const uid = `${kind}-${variant}`;
  const shift = progress * (variant % 2 === 0 ? 8 : -8);
  const car = CARS[axis(variant, 11, CARS.length)];

  // The axes. Each one multiplies the library rather than adding one drawing.
  const roofStyle = axis(variant, 3, 4);
  const storeys = axis(variant, 5, 2) + 1;
  const garage = axis(variant, 13, 2) === 1;
  const floors = 3 + axis(variant, 5, 3);
  const crown = axis(variant, 3, 3);
  const neighbours = axis(variant, 5, 3);
  const sloped = axis(variant, 13, 2) === 1;
  const units = axis(variant, 3, 2) + 1;
  const awning = axis(variant, 5, 3);

  const houseTop = storeys === 2 ? 52 : 84;
  const wallLeft = garage ? 118 : 96;
  const wallRight = 344;

  return (
    <svg width="100%" height="100%" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice" style={style}>
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
          <stop offset="0" stopColor={GRASS[0]} />
          <stop offset="1" stopColor={GRASS[1]} />
        </linearGradient>
      </defs>

      <rect width="440" height="190" fill={`url(#sky-${uid})`} />
      <path d="M-20 120 q90 -58 190 -20 q80 30 150 -14 q60 -38 140 6 V190 H-20 Z" fill={HILL} opacity="0.5" />
      <circle cx={356 + shift * 0.2} cy="38" r="22" fill="#FFF8DC" opacity="0.95" />

      <rect x="0" y="132" width="440" height="58" fill={`url(#grass-${uid})`} />
      <rect x="0" y="166" width="440" height="24" fill={ROAD} />
      <rect x="0" y="164" width="440" height="5" fill={KERB} />
      <path d="M16 180 H116 M156 180 H256 M296 180 H416" stroke="#E7ECF1" strokeWidth="3" strokeLinecap="round" opacity="0.85" />

      <g transform={`translate(${shift} 0)`}>
        {kind === 'house' ? (
          <>
            <Grounded x={wallLeft - 4} w={wallRight - wallLeft + 8} y={168} />
            <rect x={wallLeft} y={houseTop} width={wallRight - wallLeft} height={166 - houseTop} rx="4" fill={`url(#wall-${uid})`} />
            <Roof style={roofStyle} left={wallLeft} right={wallRight} base={houseTop + 8} uid={uid} flat={p.roof[1]} />
            {storeys === 2 ? (
              <>
                <Window x={wallLeft + 22} y={houseTop + 22} w={54} h={34} uid={uid} />
                <Window x={wallRight - 76} y={houseTop + 22} w={54} h={34} uid={uid} />
                <path d={`M${wallLeft} ${houseTop + 68} H${wallRight}`} stroke={p.roof[1]} strokeWidth="3" opacity="0.25" />
              </>
            ) : null}
            <Window x={wallLeft + 22} y={storeys === 2 ? 108 : 104} w={54} h={38} uid={uid} />
            <Window x={wallRight - 76} y={storeys === 2 ? 108 : 104} w={54} h={38} uid={uid} />
            <Door x={(wallLeft + wallRight) / 2 - 18} y={storeys === 2 ? 112 : 108} w={36} h={54} colour={p.door} />
            {garage ? (
              <>
                <Grounded x={44} w={72} y={168} />
                <rect x="44" y="112" width="72" height="54" rx="3" fill={`url(#wall-${uid})`} />
                <rect x="36" y="104" width="88" height="12" rx="3" fill={p.roof[1]} />
                <rect x="52" y="124" width="56" height="42" rx="2" fill={p.roof[0]} opacity="0.85" />
                {[0, 1, 2].map((i) => (
                  <path key={i} d={`M52 ${132 + i * 12} H108`} stroke="#FFFFFF" strokeWidth="2" opacity="0.25" />
                ))}
              </>
            ) : (
              <Tree x={58} y={132} r={17} />
            )}
            <Tree x={384} y={136} r={19} />
            {axis(variant, 17, 2) === 1 ? <Lamp x={404} y={166} /> : <Car x={286} y={152} colour={car} />}
          </>
        ) : null}

        {kind === 'apartment' ? (
          <>
            <Grounded x={104} w={232} y={168} />
            {(() => {
              const top = 166 - (floors * 30 + 24);
              return (
                <>
                  <rect x="108" y={top} width="224" height={166 - top} rx="4" fill={`url(#wall-${uid})`} />
                  {crown === 0 ? <rect x="98" y={top - 10} width="244" height="15" rx="3" fill={`url(#roof-${uid})`} /> : null}
                  {crown === 1 ? (
                    <>
                      <rect x="98" y={top - 10} width="244" height="15" rx="3" fill={`url(#roof-${uid})`} />
                      <rect x="276" y={top - 26} width="34" height="16" rx="3" fill={p.roof[1]} />
                    </>
                  ) : null}
                  {crown === 2 ? (
                    <>
                      <rect x="140" y={top - 28} width="160" height="30" rx="4" fill={`url(#wall-${uid})`} />
                      <rect x="132" y={top - 36} width="176" height="12" rx="3" fill={`url(#roof-${uid})`} />
                    </>
                  ) : null}
                  {Array.from({length: floors}, (_, i) => {
                    const y = top + 14 + i * 30;
                    return (
                      <g key={y}>
                        <Window x={126} y={y} w={48} h={20} uid={uid} bars={false} />
                        <Window x={196} y={y} w={48} h={20} uid={uid} bars={false} />
                        <Window x={266} y={y} w={48} h={20} uid={uid} bars={false} />
                        <path d={`M118 ${y + 25} H322`} stroke={p.roof[0]} strokeWidth="3" opacity="0.4" />
                      </g>
                    );
                  })}
                </>
              );
            })()}
            <Door x={196} y={136} w={48} h={30} colour={p.door} />
            <Tree x={72} y={134} r={18} />
            <Tree x={372} y={138} r={16} />
            <Car x={296} y={152} colour={car} />
          </>
        ) : null}

        {kind === 'land' ? (
          <>
            {neighbours !== 2 ? (
              <>
                <Grounded x={58} w={116} y={168} />
                <rect x="62" y="88" width="112" height="78" rx="4" fill={`url(#wall-${uid})`} />
                <Roof style={roofStyle} left={70} right={166} base={96} uid={uid} flat={p.roof[1]} />
                <Window x={88} y={112} w={34} h={26} uid={uid} />
              </>
            ) : (
              <Tree x={92} y={126} r={20} />
            )}
            {neighbours !== 1 ? (
              <>
                <Grounded x={266} w={116} y={168} />
                <rect x="266" y="88" width="112" height="78" rx="4" fill={`url(#wall-${uid})`} />
                <Roof style={(roofStyle + 1) % 4} left={274} right={370} base={96} uid={uid} flat={p.roof[1]} />
                <Window x={304} y={112} w={34} h={26} uid={uid} />
              </>
            ) : (
              <Tree x={348} y={128} r={19} />
            )}

            {/* The lot: mown grass, a fence with rails, and a FOR SALE post. */}
            <rect x="186" y={sloped ? 102 : 110} width="68" height={sloped ? 64 : 56} fill="#B4D9BA" />
            <path d={`M186 ${sloped ? 102 : 110} H254`} stroke="#8CBF97" strokeWidth="3" />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={190 + i * 17} y="126" width="5" height="40" rx="2" fill="#4E8B62" />
            ))}
            <path d="M188 138 H252" stroke="#4E8B62" strokeWidth="5" />
            <path d="M188 152 H252" stroke="#4E8B62" strokeWidth="4" opacity="0.7" />
            <rect x="216" y="86" width="4" height="26" fill="#8A7256" />
            <rect x="204" y="76" width="30" height="16" rx="2" fill="#FFFFFF" />
            <path d="M208 82 H230 M208 87 H224" stroke="#4E8B62" strokeWidth="2.5" strokeLinecap="round" />
            <Tree x={168} y={116} r={11} />
            {axis(variant, 17, 2) === 1 ? <Lamp x={398} y={166} /> : <Car x={286} y={152} colour={car} />}
          </>
        ) : null}

        {kind === 'commercial' ? (
          <>
            <Grounded x={98} w={244} y={168} />
            <rect x="102" y={units === 2 ? 52 : 66} width="236" height={166 - (units === 2 ? 52 : 66)} rx="4" fill={`url(#wall-${uid})`} />
            <rect x="92" y={units === 2 ? 42 : 56} width="256" height="15" rx="3" fill={`url(#roof-${uid})`} />
            {units === 2 ? (
              <>
                <Window x={126} y={70} w={78} h={30} uid={uid} bars={false} />
                <Window x={236} y={70} w={78} h={30} uid={uid} bars={false} />
              </>
            ) : null}
            <rect x="112" y={units === 2 ? 108 : 76} width="216" height="20" rx="3" fill={p.roof[0]} opacity="0.9" />
            {awning !== 2 ? (
              <>
                <path d={`M108 ${units === 2 ? 132 : 100} H332 L316 ${units === 2 ? 156 : 124} H124 Z`} fill="#F2F5F8" />
                {awning === 0
                  ? [0, 1, 2, 3, 4, 5].map((i) => (
                      <path
                        key={i}
                        d={`M${112 + i * 37} ${units === 2 ? 132 : 100} L${104 + i * 37} ${units === 2 ? 156 : 124} h18 l8 -24 z`}
                        fill={p.door}
                        opacity="0.75"
                      />
                    ))
                  : null}
              </>
            ) : null}
            <Window x={128} y={units === 2 ? 160 : 130} w={78} h={36} uid={uid} bars={false} />
            <Window x={244} y={units === 2 ? 160 : 130} w={78} h={36} uid={uid} bars={false} />
            <Door x={212} y={126} w={26} h={40} colour={p.door} />
            <Tree x={70} y={136} r={16} />
            {axis(variant, 17, 2) === 1 ? <Lamp x={396} y={166} /> : <Car x={300} y={152} colour={car} />}
          </>
        ) : null}
      </g>

      <rect width="440" height="190" fill="none" stroke="#1D2A36" strokeWidth="10" opacity="0.05" />
    </svg>
  );
};
