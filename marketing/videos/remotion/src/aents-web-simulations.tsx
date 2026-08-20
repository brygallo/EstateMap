import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {font} from './theme';
import {Shell} from './aents-simulations';
import type {SimulationProps} from './simulations';

/**
 * The website arc of the Aents profile.
 *
 * Five compositions that follow one visitor: they search for a company, judge
 * it in a few seconds, give up on a page that does not work, watch the same
 * page rebuilt, and come back through it as a contact request. The site drawn
 * here belongs to an imaginary "Empresa XYZ" — it is an illustration of a
 * client website, never a recreation of a real one, and it carries no third
 * party branding.
 *
 * What the pieces may claim about Aents comes from `apps/web/src/i18n.ts` in
 * the Aents repository: fast, adaptable sites made to position a brand and
 * generate opportunities. Nothing else is drawn as a capability.
 */

const ink = '#080915';
const violet = '#6B5CF6';
const lavender = '#A78BFA';
const green = '#22C55E';
const leaving = '#F97066';
const paper = '#F3F5FA';
const dated = '#575767';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const reveal = (value: number, start: number, end: number) =>
  interpolate(value, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Interface travel: soft ends, even middle, so a long move uses the time it was given. */
const ramp = (value: number, from: number, to: number, a: number, b: number) =>
  interpolate(value, [from, to], [a, b], {
    easing: Easing.bezier(0.35, 0.12, 0.28, 0.92),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** The series' gesture curve: quick departure, long settle. */
const glide = (value: number, from: number, to: number, a: number, b: number) =>
  interpolate(value, [from, to], [a, b], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const mix = (amount: number, a: number, b: number) => a + (b - a) * clamp01(amount);

/** The drawing area the Aents card leaves free under its title. */
const BOARD = {width: 752, height: 500};

const Board: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position: 'relative', width: BOARD.width, height: BOARD.height, marginTop: 26}}>{children}</div>
);

const Pointer: React.FC<{x: number; y: number; opacity: number; press?: number}> = ({x, y, opacity, press = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - press * 0.16})`,
      transformOrigin: '6px 4px',
      filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.45))',
    }}
  >
    <svg width={42} height={48} viewBox="0 0 42 48">
      <path d="M5 3 L5 40 L15 31 L22 47 L31 43 L24 28 L36 27 Z" fill="#FFFFFF" stroke={ink} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  </div>
);

/** The ring a click leaves behind, so a press is visible and not just implied. */
const ClickRing: React.FC<{x: number; y: number; progress: number}> = ({x, y, progress}) =>
  progress <= 0 || progress >= 1 ? null : (
    <div
      style={{
        position: 'absolute',
        left: x - 44,
        top: y - 44,
        width: 88,
        height: 88,
        borderRadius: 99,
        border: `4px solid ${lavender}`,
        opacity: (1 - progress) * 0.85,
        transform: `scale(${0.3 + progress * 0.9})`,
      }}
    />
  );

const ExampleBadge: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <div
    style={{
      padding: '6px 14px',
      borderRadius: 10,
      background: 'rgba(255,255,255,.14)',
      border: '2px solid rgba(255,255,255,.28)',
      fontSize: 17,
      fontWeight: 800,
      letterSpacing: '.16em',
      color: 'rgba(255,255,255,.78)',
      ...style,
    }}
  >
    EJEMPLO
  </div>
);

const Bar: React.FC<{x: number; y: number; width: number; height: number; color: string; radius?: number; opacity?: number}> = ({
  x,
  y,
  width,
  height,
  color,
  radius = 8,
  opacity = 1,
}) => (
  <div style={{position: 'absolute', left: x, top: y, width, height, borderRadius: radius, background: color, opacity}} />
);

/**
 * 1 — Somebody just searched for your company.
 *
 * Initial state: an empty search field. Question: what does the visitor find?
 * Action: the query is typed, the result is opened. Response: the site takes
 * its time while the seconds are counted out loud. Proof: the decision splits
 * in two, and the piece hands that tension to the next scene.
 */
export const AentsWebSearchSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const query = 'Empresa XYZ';
  const typed = reveal(p, 0.05, 0.2);
  const submitted = reveal(p, 0.2, 0.25);
  const resultIn = reveal(p, 0.22, 0.33);
  const pointerTrip = glide(p, 0.34, 0.44, 0, 1);
  const clicked = reveal(p, 0.44, 0.52);
  const opened = reveal(p, 0.46, 0.58);
  const waiting = reveal(p, 0.5, 0.76);

  const caret = frame % Math.round(fps * 0.8) < fps * 0.42 && typed < 1;
  const panelHeight = mix(opened, 110, 222);
  const panelBottom = 108 + panelHeight;
  const seconds = Math.min(3, 1 + Math.floor(waiting * 2.999));

  const pointerX = mix(pointerTrip, 620, 214);
  const pointerY = mix(pointerTrip, 380, 150);

  const branches = [
    {key: 'leave', label: 'SIGUE BUSCANDO', color: leaving, x: 8, target: 158},
    {key: 'trust', label: 'CONFÍA EN TI', color: green, x: 412, target: 562},
  ];

  return (
    <Shell frame={frame} eyebrow="ALGUIEN TE BUSCA" title="¿Te elige o sigue buscando?">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: BOARD.width,
            height: 84,
            borderRadius: 42,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '0 32px',
            boxSizing: 'border-box',
            background: '#FFFFFF',
            boxShadow: `0 18px 44px rgba(0,0,0,.34)${submitted > 0 ? `, 0 0 0 ${submitted * 5}px rgba(167,139,250,.28)` : ''}`,
          }}
        >
          <svg width={30} height={30} viewBox="0 0 24 24">
            <circle cx={10.5} cy={10.5} r={7} fill="none" stroke="#7A8296" strokeWidth={3} />
            <path d="M16 16 L21 21" stroke="#7A8296" strokeWidth={3} strokeLinecap="round" />
          </svg>
          <span style={{fontSize: 34, fontWeight: 800, color: ink, letterSpacing: '-.02em'}}>
            {query.slice(0, Math.round(typed * query.length))}
          </span>
          {caret ? <span style={{width: 4, height: 38, background: violet, borderRadius: 3}} /> : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 108,
            width: 672,
            height: panelHeight,
            borderRadius: mix(opened, 22, 26),
            overflow: 'hidden',
            background: paper,
            border: '2px solid rgba(255,255,255,.16)',
            boxShadow: '0 26px 62px rgba(0,0,0,.42)',
            opacity: resultIn,
            transform: `scale(${mix(resultIn, 0.96, 1)})`,
          }}
        >
          <div style={{position: 'absolute', inset: 0, padding: '22px 28px', opacity: 1 - opened}}>
            <div style={{fontSize: 20, fontWeight: 800, color: '#5C6478'}}>empresaxyz.com</div>
            <div style={{marginTop: 8, fontSize: 30, fontWeight: 800, color: ink, letterSpacing: '-.02em'}}>Empresa XYZ · Inicio</div>
            <div style={{marginTop: 10, fontSize: 20, fontWeight: 700, color: '#6B7284'}}>Servicios, proyectos y contacto.</div>
          </div>

          <div style={{position: 'absolute', inset: 0, opacity: opened}}>
            <div style={{height: 46, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#FFFFFF'}}>
              {['#FF6B6B', '#FFD166', '#22C55E'].map((color) => (
                <i key={color} style={{width: 11, height: 11, borderRadius: 99, background: color}} />
              ))}
              <div
                style={{
                  marginLeft: 14,
                  flex: 1,
                  padding: '7px 16px',
                  borderRadius: 99,
                  background: '#EDF0F5',
                  color: '#59627A',
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                empresaxyz.com
              </div>
            </div>
            <Bar x={26} y={78} width={mix(waiting, 120, 300)} height={20} color="#D6DCE7" />
            <Bar x={26} y={112} width={mix(waiting, 80, 214)} height={20} color="#E1E6EF" />
            <Bar x={26} y={150} width={mix(waiting, 60, 160)} height={20} color="#E7EBF2" />
            <div
              style={{
                position: 'absolute',
                right: 26,
                top: 78,
                width: 132,
                height: 112,
                borderRadius: 18,
                background: '#E3E8F0',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                fontWeight: 800,
                color: '#98A1B4',
              }}
            >
              {waiting < 0.9 ? '···' : ' '}
            </div>
          </div>

          {opened > 0.4 ? (
            <div
              style={{
                position: 'absolute',
                right: 22,
                bottom: 20,
                padding: '10px 20px',
                borderRadius: 99,
                background: ink,
                color: '#FFFFFF',
                fontSize: 28,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                opacity: (opened - 0.4) / 0.6,
              }}
            >
              {seconds} s
            </div>
          ) : null}
        </div>

        <svg width={BOARD.width} height={BOARD.height} viewBox={`0 0 ${BOARD.width} ${BOARD.height}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {branches.map((branch, index) => {
            const drawn = reveal(p, 0.74 + index * 0.03, 0.86 + index * 0.03);
            return (
              <path
                key={branch.key}
                d={`M376 ${panelBottom} C376 ${panelBottom + 40} ${branch.target} ${panelBottom + 16} ${branch.target} 396`}
                fill="none"
                stroke={branch.color}
                strokeWidth={5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawn}
                opacity={0.9}
              />
            );
          })}
        </svg>

        {branches.map((branch, index) => {
          const chip = reveal(p, 0.8 + index * 0.04, 0.94 + index * 0.04);
          return (
            <div
              key={branch.key}
              style={{
                position: 'absolute',
                left: branch.x,
                top: 396,
                width: 300,
                height: 96,
                borderRadius: 26,
                display: 'grid',
                placeItems: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
                padding: '0 12px',
                background: `${branch.color}22`,
                border: `3px solid ${branch.color}`,
                fontSize: 27,
                fontWeight: 800,
                letterSpacing: '.02em',
                color: '#FFFFFF',
                opacity: chip,
                transform: `translateY(${(1 - chip) * 16}px) scale(${mix(chip, 0.94, 1)})`,
              }}
            >
              {branch.label}
            </div>
          );
        })}

        <Pointer x={pointerX} y={pointerY} opacity={reveal(p, 0.3, 0.36) * (1 - reveal(p, 0.6, 0.68))} press={clicked * (1 - clicked)} />
        <ClickRing x={pointerX + 6} y={pointerY + 6} progress={clicked} />
      </Board>
    </Shell>
  );
};

/**
 * 2 — A slow, dated, hard to use page.
 *
 * The page never adapts: it keeps its desktop width while the viewport becomes
 * a phone, so the crop itself is the proof. The visitor closes the tab and what
 * stays on screen is the impression the company left.
 */
export const AentsWebSlowSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const enter = reveal(p, 0.02, 0.14);
  const loading = ramp(p, 0.1, 0.44, 0, 0.68);
  const narrow = glide(p, 0.44, 0.64, 0, 1);
  const pointerTrip = glide(p, 0.68, 0.79, 0, 1);
  const closed = reveal(p, 0.8, 0.88);

  const viewport = {
    x: mix(narrow, 0, 226),
    y: mix(narrow, 16, 0),
    width: mix(narrow, 752, 300),
    height: mix(narrow, 392, 470),
  };

  const closeX = viewport.x + viewport.width - 44;
  const closeY = viewport.y + 22;
  const pointerX = mix(pointerTrip, 300, closeX - 6);
  const pointerY = mix(pointerTrip, 430, closeY - 6);

  return (
    <Shell frame={frame} eyebrow="LO QUE ENCUENTRA" title="Una web que no ayuda">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: viewport.x,
            top: viewport.y,
            width: viewport.width,
            height: viewport.height,
            borderRadius: mix(narrow, 24, 34),
            overflow: 'hidden',
            background: '#DFE3EB',
            border: '2px solid rgba(255,255,255,.14)',
            boxShadow: '0 30px 70px rgba(0,0,0,.45)',
            opacity: mix(closed, enter, 0.26),
            transform: `scale(${mix(closed, 1, 0.96)})`,
          }}
        >
          <div style={{position: 'absolute', left: 0, top: 0, width: viewport.width, height: 44, background: '#C9CFDA', display: 'flex', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box'}}>
            <div style={{flex: 1, fontSize: 17, fontWeight: 800, color: '#6A7182', overflow: 'hidden', whiteSpace: 'nowrap'}}>empresaxyz.com</div>
            <div style={{width: 26, height: 26, borderRadius: 8, background: '#AEB6C4', color: '#3E4553', fontSize: 18, fontWeight: 800, display: 'grid', placeItems: 'center'}}>✕</div>
          </div>

          {/* The page keeps its desktop width on purpose: the phone crops it. */}
          <div style={{position: 'absolute', left: 0, top: 44, width: 752, height: 426}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: 752, height: 52, background: dated, display: 'flex', alignItems: 'center', gap: 26, padding: '0 20px', boxSizing: 'border-box'}}>
              <span style={{fontSize: 21, fontWeight: 800, color: '#E4E7EE', letterSpacing: '.04em'}}>EMPRESA XYZ</span>
              {['Inicio', 'Nosotros', 'Servicios', 'Contacto'].map((item) => (
                <span key={item} style={{fontSize: 15, fontWeight: 700, color: '#B4BAC7'}}>
                  {item}
                </span>
              ))}
            </div>
            <Bar x={22} y={84} width={470} height={30} color="#C4CAD6" />
            <Bar x={64} y={130} width={286} height={22} color="#CDD3DE" />
            <Bar x={22} y={176} width={214} height={22} color="#CDD3DE" />
            <Bar x={310} y={196} width={168} height={112} color="#C4CAD6" radius={4} />
            <Bar x={22} y={236} width={244} height={74} color="#D3D8E2" radius={4} />
            <div
              style={{
                position: 'absolute',
                left: 560,
                top: 240,
                width: 172,
                height: 62,
                borderRadius: 4,
                background: dated,
                color: '#E7EAF0',
                fontSize: 19,
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              CONTÁCTENOS
            </div>
          </div>

          <div style={{position: 'absolute', left: 0, right: 0, top: 44, bottom: 0, background: 'rgba(223,227,235,.82)', display: 'grid', placeItems: 'center', opacity: 1 - reveal(p, 0.44, 0.56)}}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 26, fontWeight: 800, color: '#69707F', letterSpacing: '.02em'}}>Cargando…</div>
              <div style={{marginTop: 16, width: 220, height: 12, borderRadius: 99, background: '#C2C8D3', overflow: 'hidden', marginLeft: 'auto', marginRight: 'auto'}}>
                <div style={{width: `${loading * 100}%`, height: '100%', background: dated}} />
              </div>
            </div>
          </div>
        </div>

        {narrow > 0.6 ? (
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 178,
              width: 196,
              padding: '14px 16px',
              borderRadius: 18,
              background: 'rgba(249,112,102,.16)',
              border: `2px solid ${leaving}`,
              fontSize: 21,
              fontWeight: 800,
              lineHeight: 1.15,
              color: '#FFD9D5',
              opacity: (narrow - 0.6) / 0.4,
            }}
          >
            No cabe en el teléfono
          </div>
        ) : null}

        {closed > 0.2 ? (
          <div
            style={{
              position: 'absolute',
              left: 226,
              top: 214,
              width: 300,
              height: 92,
              borderRadius: 24,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(8,9,21,.86)',
              border: `3px solid ${leaving}`,
              fontSize: 32,
              fontWeight: 800,
              color: '#FFFFFF',
              opacity: (closed - 0.2) / 0.8,
              transform: `scale(${mix((closed - 0.2) / 0.8, 0.9, 1)})`,
            }}
          >
            SE FUE
          </div>
        ) : null}

        <Pointer x={pointerX} y={pointerY} opacity={reveal(p, 0.64, 0.7) * (1 - reveal(p, 0.86, 0.94))} press={reveal(p, 0.79, 0.82) * (1 - reveal(p, 0.83, 0.86))} />
        <ClickRing x={closeX + 6} y={closeY + 6} progress={reveal(p, 0.79, 0.88)} />
      </Board>
    </Shell>
  );
};

/**
 * 3 — The same page, rebuilt.
 *
 * A single sweep is the cause: every block becomes its finished component as
 * the light passes over it, so nothing appears by itself. Then the page is
 * toured section by section and finally narrowed to a phone, where the layout
 * reflows instead of being cropped — the opposite of the previous scene, drawn
 * with the same geometry so the comparison is honest.
 */
const REBUILD_BLOCKS = [
  {key: 'title', broken: {x: 18, y: 18, width: 604, height: 26}, built: {x: 40, y: 40, width: 470, height: 34}, radius: 10, tone: 'rgba(255,255,255,.92)'},
  {key: 'subtitle', broken: {x: 54, y: 62, width: 248, height: 26}, built: {x: 40, y: 88, width: 330, height: 24}, radius: 8, tone: 'rgba(255,255,255,.55)'},
  {key: 'card-a', broken: {x: 30, y: 212, width: 300, height: 96}, built: {x: 40, y: 260, width: 216, height: 124}, radius: 22, tone: 'rgba(255,255,255,.1)'},
  {key: 'card-b', broken: {x: 352, y: 230, width: 180, height: 72}, built: {x: 268, y: 260, width: 216, height: 124}, radius: 22, tone: 'rgba(255,255,255,.1)'},
  {key: 'card-c', broken: {x: 548, y: 196, width: 216, height: 130}, built: {x: 496, y: 260, width: 216, height: 124}, radius: 22, tone: 'rgba(255,255,255,.1)'},
];

const REBUILD_SECTIONS = [
  {key: 'servicios', label: 'Servicios', top: 414},
  {key: 'proyectos', label: 'Proyectos', top: 644},
  {key: 'contacto', label: 'Contacto', top: 874},
];

export const AentsWebRebuildSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const sweepX = ramp(p, 0.03, 0.3, -120, 880);
  const sweepLive = reveal(p, 0.02, 0.06) * (1 - reveal(p, 0.3, 0.36));
  const toured = ramp(p, 0.42, 0.66, 0, 670);
  const back = ramp(p, 0.68, 0.74, 0, 1);
  const scrollY = toured * (1 - back);
  const narrow = glide(p, 0.76, 0.93, 0, 1);
  const confirmed = spring({frame: frame - span * 0.9, fps, config: {damping: 15, mass: 0.7}});

  const pageWidth = mix(narrow, 752, 320);
  const pageLeft = (BOARD.width - pageWidth) / 2;
  /** The header is rebuilt when the sweep has cleared it, like every other block. */
  const navBuilt = clamp01((sweepX - 200) / 200);
  const menuBuilt = clamp01((sweepX - 320) / 180);
  const activeSection = REBUILD_SECTIONS.filter((section) => scrollY + 200 > section.top).slice(-1)[0];

  const narrowCards: Record<string, {x: number; y: number; width: number; height: number}> = {
    'card-a': {x: 24, y: 196, width: 272, height: 64},
    'card-b': {x: 24, y: 270, width: 272, height: 64},
    'card-c': {x: 24, y: 344, width: 272, height: 64},
  };
  const narrowText: Record<string, {x: number; y: number; width: number; height: number}> = {
    title: {x: 24, y: 24, width: 272, height: 30},
    subtitle: {x: 24, y: 64, width: 200, height: 22},
  };

  return (
    <Shell frame={frame} eyebrow="COMO DEBERÍA SER" title="La misma página, reconstruida">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: pageLeft,
            top: 14,
            width: pageWidth,
            height: 470,
            borderRadius: mix(narrow, 26, 34),
            overflow: 'hidden',
            background: 'linear-gradient(160deg,#191A34,#0C0D1E)',
            border: '2px solid rgba(167,139,250,.28)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: pageWidth,
              height: mix(navBuilt, 44, 56),
              background: navBuilt > 0.5 ? 'rgba(255,255,255,.07)' : dated,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              padding: '0 20px',
              boxSizing: 'border-box',
              zIndex: 3,
            }}
          >
            <span style={{fontSize: 19, fontWeight: 800, color: '#FFFFFF', letterSpacing: '.02em'}}>EMPRESA XYZ</span>
            {narrow < 0.5
              ? REBUILD_SECTIONS.map((section) => (
                  <span
                    key={section.key}
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: activeSection?.key === section.key ? lavender : 'rgba(255,255,255,.5)',
                      opacity: menuBuilt * clamp01(1 - narrow * 2),
                    }}
                  >
                    {section.label}
                  </span>
                ))
              : (
                <span style={{marginLeft: 'auto', display: 'grid', gap: 5, opacity: (narrow - 0.5) * 2}}>
                  {[0, 1, 2].map((line) => (
                    <i key={line} style={{width: 26, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.8)'}} />
                  ))}
                </span>
              )}
          </div>

          <div style={{position: 'absolute', left: 0, top: 56, width: pageWidth, height: 414, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: 0, top: -scrollY, width: pageWidth, height: 1084}}>
              {REBUILD_BLOCKS.map((block) => {
                const done = clamp01((sweepX - block.broken.x) / 110);
                const narrowTarget = narrowCards[block.key] ?? narrowText[block.key] ?? block.built;
                const target = {
                  x: mix(narrow, block.built.x, narrowTarget.x),
                  y: mix(narrow, block.built.y, narrowTarget.y),
                  width: mix(narrow, block.built.width, narrowTarget.width),
                  height: mix(narrow, block.built.height, narrowTarget.height),
                };
                return (
                  <div
                    key={block.key}
                    style={{
                      position: 'absolute',
                      left: mix(done, block.broken.x, target.x),
                      top: mix(done, block.broken.y, target.y),
                      width: mix(done, block.broken.width, target.width),
                      height: mix(done, block.broken.height, target.height),
                      borderRadius: mix(done, 3, block.radius),
                      background: done > 0.5 ? block.tone : '#4B4B5C',
                      border: block.key.startsWith('card') && done > 0.5 ? '2px solid rgba(167,139,250,.28)' : '2px solid transparent',
                      boxSizing: 'border-box',
                    }}
                  />
                );
              })}

              <div
                style={{
                  position: 'absolute',
                  left: mix(narrow, 40, 24),
                  top: mix(narrow, 150, 108),
                  width: mix(narrow, 300, 272),
                  height: mix(narrow, 64, 56),
                  borderRadius: 18,
                  background: `linear-gradient(135deg,#7C6BF8,#4C39C4)`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  opacity: clamp01((sweepX - 100) / 140),
                  boxShadow: '0 16px 40px rgba(107,92,246,.42)',
                }}
              >
                Solicitar información
              </div>

              {REBUILD_SECTIONS.map((section) => (
                <div key={section.key} style={{position: 'absolute', left: mix(narrow, 40, 24), top: section.top, width: mix(narrow, 672, 272)}}>
                  <div style={{fontSize: 24, fontWeight: 800, color: lavender, letterSpacing: '.02em'}}>{section.label}</div>
                  <div style={{marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap'}}>
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        style={{
                          width: mix(narrow, 208, 272),
                          height: mix(narrow, 116, 44),
                          borderRadius: 18,
                          background: 'rgba(255,255,255,.08)',
                          border: '2px solid rgba(167,139,250,.2)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sweepLive > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: sweepX - pageLeft,
                top: 0,
                width: 10,
                height: 470,
                background: `linear-gradient(180deg, transparent, ${lavender}, transparent)`,
                boxShadow: `0 0 46px 14px rgba(167,139,250,.5)`,
                opacity: sweepLive,
                zIndex: 4,
              }}
            />
          ) : null}
        </div>

        {confirmed > 0.05 ? (
          <div
            style={{
              position: 'absolute',
              left: 470,
              top: 396,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 24px',
              borderRadius: 99,
              background: green,
              color: '#06210F',
              fontSize: 26,
              fontWeight: 800,
              opacity: confirmed,
              transform: `translateY(${(1 - confirmed) * 20}px) scale(${mix(confirmed, 0.86, 1)})`,
              boxShadow: '0 18px 46px rgba(34,197,94,.4)',
            }}
          >
            Se adapta ✓
          </div>
        ) : null}
      </Board>
    </Shell>
  );
};

/**
 * 4 — What the page is for.
 *
 * Three stations and two pulses: a search becomes a visit, and a visit becomes
 * an opportunity. The chips under the middle station are the part that is not
 * design — position, speed and mobile — and they light before the button is
 * pressed, because they are what makes the press possible.
 */
const FUNNEL_CHIPS = ['Posicionamiento', 'Velocidad', 'Móvil'];

const FunnelStep: React.FC<{
  label: string;
  y: number;
  height: number;
  opacity: number;
  border?: string;
  children: React.ReactNode;
}> = ({label, y, height, opacity, border = 'rgba(167,139,250,.26)', children}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: y,
      width: BOARD.width,
      height,
      borderRadius: 26,
      background: 'rgba(255,255,255,.06)',
      border: `2px solid ${border}`,
      boxSizing: 'border-box',
      opacity,
      transform: `translateY(${(1 - opacity) * 14}px)`,
    }}
  >
    <div style={{position: 'absolute', right: 22, top: 16, fontSize: 17, fontWeight: 800, letterSpacing: '.16em', color: 'rgba(255,255,255,.45)'}}>{label}</div>
    {children}
  </div>
);

export const AentsWebFunnelSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const searchIn = reveal(p, 0.02, 0.14);
  const searchClick = reveal(p, 0.16, 0.24);
  const firstPulse = ramp(p, 0.24, 0.34, 0, 1);
  const pageIn = reveal(p, 0.3, 0.42);
  const buttonPress = reveal(p, 0.62, 0.7);
  const secondPulse = ramp(p, 0.72, 0.82, 0, 1);
  const landed = spring({frame: frame - span * 0.82, fps, config: {damping: 14, mass: 0.7}});

  const pointerTrip = glide(p, 0.52, 0.62, 0, 1);

  return (
    <Shell frame={frame} eyebrow="PARA QUÉ EXISTE" title="De una búsqueda a una oportunidad">
      <Board>
        <FunnelStep label="BÚSQUEDA" y={0} height={132} opacity={searchIn}>
          <div style={{position: 'absolute', left: 24, top: 22, width: 420, height: 56, borderRadius: 28, background: '#FFFFFF', display: 'flex', alignItems: 'center', padding: '0 22px', boxSizing: 'border-box', gap: 14}}>
            <svg width={22} height={22} viewBox="0 0 24 24">
              <circle cx={10.5} cy={10.5} r={7} fill="none" stroke="#7A8296" strokeWidth={3} />
              <path d="M16 16 L21 21" stroke="#7A8296" strokeWidth={3} strokeLinecap="round" />
            </svg>
            <span style={{fontSize: 26, fontWeight: 800, color: ink}}>Empresa XYZ</span>
          </div>
          <div style={{position: 'absolute', left: 24, top: 90, fontSize: 21, fontWeight: 800, color: searchClick > 0.5 ? lavender : 'rgba(255,255,255,.62)'}}>
            empresaxyz.com · Inicio
          </div>
        </FunnelStep>

        <FunnelStep label="VISITA" y={172} height={176} opacity={pageIn} border={pageIn > 0.8 ? 'rgba(167,139,250,.5)' : 'rgba(167,139,250,.26)'}>
          <div style={{position: 'absolute', left: 24, top: 20, width: 704, height: 30, borderRadius: 10, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', padding: '0 14px', boxSizing: 'border-box', fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,.62)'}}>
            empresaxyz.com
          </div>
          <Bar x={24} y={64} width={300} height={22} color="rgba(255,255,255,.82)" opacity={pageIn} />
          <Bar x={24} y={96} width={210} height={18} color="rgba(255,255,255,.4)" opacity={pageIn} />
          <div
            style={{
              position: 'absolute',
              left: 420,
              top: 62,
              width: 308,
              height: 60,
              borderRadius: 18,
              background: 'linear-gradient(135deg,#7C6BF8,#4C39C4)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 24,
              fontWeight: 800,
              color: '#FFFFFF',
              transform: `scale(${1 - buttonPress * (1 - buttonPress) * 0.25})`,
              boxShadow: buttonPress > 0.4 ? '0 0 0 5px rgba(167,139,250,.35)' : '0 16px 40px rgba(107,92,246,.4)',
            }}
          >
            Solicitar información
          </div>
          <div style={{position: 'absolute', left: 24, top: 134, display: 'flex', gap: 14}}>
            {FUNNEL_CHIPS.map((chip, index) => {
              const on = reveal(p, 0.42 + index * 0.05, 0.52 + index * 0.05);
              return (
                <div
                  key={chip}
                  style={{
                    width: 225,
                    height: 34,
                    borderRadius: 99,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 19,
                    fontWeight: 800,
                    background: on > 0.6 ? 'rgba(167,139,250,.22)' : 'rgba(255,255,255,.05)',
                    border: `2px solid ${on > 0.6 ? lavender : 'rgba(255,255,255,.12)'}`,
                    color: on > 0.6 ? '#FFFFFF' : 'rgba(255,255,255,.5)',
                    opacity: mix(on, 0.35, 1),
                  }}
                >
                  {chip}
                </div>
              );
            })}
          </div>
        </FunnelStep>

        <FunnelStep label="OPORTUNIDAD" y={388} height={112} opacity={landed} border={green}>
          <div style={{position: 'absolute', left: 24, top: 22, display: 'flex', alignItems: 'center', gap: 20}}>
            <div style={{width: 62, height: 62, borderRadius: 99, background: green, color: '#06210F', display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 800}}>✓</div>
            <div>
              <div style={{fontSize: 32, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-.02em'}}>Nueva solicitud de información</div>
              <div style={{marginTop: 4, fontSize: 19, fontWeight: 700, color: 'rgba(255,255,255,.6)'}}>Llegó desde tu página web</div>
            </div>
          </div>
        </FunnelStep>

        <svg width={BOARD.width} height={BOARD.height} viewBox={`0 0 ${BOARD.width} ${BOARD.height}`} style={{position: 'absolute', inset: 0}}>
          <path d="M376 132 L376 172" stroke={lavender} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - firstPulse} />
          <path d="M376 348 L376 388" stroke={green} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - secondPulse} />
          {firstPulse > 0 && firstPulse < 1 ? <circle cx={376} cy={132 + firstPulse * 40} r={9} fill={lavender} /> : null}
          {secondPulse > 0 && secondPulse < 1 ? <circle cx={376} cy={348 + secondPulse * 40} r={9} fill={green} /> : null}
        </svg>

        <Pointer
          x={mix(searchClick, 300, 300)}
          y={mix(searchClick, 118, 118)}
          opacity={reveal(p, 0.12, 0.18) * (1 - reveal(p, 0.26, 0.32))}
          press={searchClick * (1 - searchClick)}
        />
        <ClickRing x={306} y={124} progress={reveal(p, 0.18, 0.28)} />
        <Pointer
          x={mix(pointerTrip, 240, 560)}
          y={mix(pointerTrip, 420, 250)}
          opacity={reveal(p, 0.5, 0.56) * (1 - reveal(p, 0.74, 0.8))}
          press={buttonPress * (1 - buttonPress)}
        />
        <ClickRing x={566} y={256} progress={reveal(p, 0.64, 0.74)} />
      </Board>
    </Shell>
  );
};

/**
 * 5 — The close.
 *
 * A page keeps working when the office is closed: the dial turns through a full
 * day and the same three events keep arriving. They carry the `EJEMPLO` badge
 * because they illustrate what a website does, not what any particular one has
 * produced. The composition then settles into the Aents contact block, which is
 * the last thing on screen and stays still long enough to be acted on.
 */
const CLOCK_STOPS = [
  {time: '09:00', angle: 270, event: 'Nueva visita'},
  {time: '15:00', angle: 450, event: 'Nuevo contacto'},
  {time: '21:00', angle: 630, event: 'Nueva solicitud'},
  {time: '02:00', angle: 780, event: 'Nueva visita'},
];

export const AentsWebClosingSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const dayIn = reveal(p, 0.02, 0.12);
  const dayOut = reveal(p, 0.46, 0.56);
  const stop = Math.min(CLOCK_STOPS.length - 1, Math.floor(reveal(p, 0.06, 0.46) * CLOCK_STOPS.length));
  const hand = ramp(p, 0.06, 0.46, 270, 780);

  const mark = spring({frame: frame - span * 0.56, fps, config: {damping: 16, mass: 0.75}});
  const contact = spring({frame: frame - span * 0.68, fps, config: {damping: 17, mass: 0.8}});

  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 28%,#392D8C 0%,#111126 44%,#080915 76%)', fontFamily: font, color: '#FFFFFF'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 360, display: 'grid', justifyItems: 'center', opacity: dayIn * (1 - dayOut), transform: `scale(${mix(dayOut, 1, 0.94)})`}}>
        <svg width={300} height={300} viewBox="0 0 300 300">
          <circle cx={150} cy={150} r={132} fill="rgba(255,255,255,.05)" stroke="rgba(167,139,250,.35)" strokeWidth={5} />
          {Array.from({length: 12}, (_, index) => {
            const angle = (index * 30 * Math.PI) / 180;
            return (
              <circle
                key={index}
                cx={150 + Math.sin(angle) * 108}
                cy={150 - Math.cos(angle) * 108}
                r={index % 3 === 0 ? 7 : 4}
                fill={index % 3 === 0 ? lavender : 'rgba(255,255,255,.32)'}
              />
            );
          })}
          <line
            x1={150}
            y1={150}
            x2={150 + Math.sin((hand * Math.PI) / 180) * 92}
            y2={150 - Math.cos((hand * Math.PI) / 180) * 92}
            stroke={violet}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <circle cx={150} cy={150} r={12} fill={lavender} />
        </svg>
        <div style={{marginTop: 18, fontSize: 66, fontWeight: 800, letterSpacing: '.02em', fontVariantNumeric: 'tabular-nums'}}>{CLOCK_STOPS[stop].time}</div>
        <div style={{marginTop: 26, display: 'grid', gap: 14, justifyItems: 'center'}}>
          {CLOCK_STOPS.slice(0, 3).map((entry, index) => {
            const on = reveal(p, 0.14 + index * 0.11, 0.24 + index * 0.11);
            return (
              <div
                key={entry.event}
                style={{
                  width: 560,
                  padding: '16px 26px',
                  boxSizing: 'border-box',
                  borderRadius: 22,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'rgba(255,255,255,.08)',
                  border: '2px solid rgba(167,139,250,.28)',
                  fontSize: 32,
                  fontWeight: 800,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 18}px)`,
                }}
              >
                <i style={{width: 14, height: 14, borderRadius: 99, background: green}} />
                {entry.event}
              </div>
            );
          })}
          <ExampleBadge style={{marginTop: 4}} />
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 452, display: 'grid', justifyItems: 'center', opacity: mark}}>
        <Img
          src={staticFile('brand/aents-brand-tile-1024.png')}
          style={{width: 196, height: 196, borderRadius: 52, boxShadow: '0 34px 100px rgba(107,92,246,.55)', transform: `scale(${mix(mark, 0.82, 1)})`}}
        />
        <div style={{marginTop: 34, fontSize: 64, fontWeight: 800, letterSpacing: '-.055em', textAlign: 'center'}}>Conversemos tu página</div>
        <div style={{marginTop: 14, fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,.72)', opacity: contact}}>Websites para empresas.</div>
        <div
          style={{
            marginTop: 36,
            padding: '16px 38px 20px',
            borderRadius: 28,
            background: green,
            color: '#07140B',
            textAlign: 'center',
            boxShadow: '0 24px 70px rgba(34,197,94,.34)',
            opacity: contact,
            transform: `translateY(${(1 - contact) * 18}px)`,
          }}
        >
          <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.14em'}}>WHATSAPP</div>
          <div style={{marginTop: 4, fontSize: 43, fontWeight: 800}}>+593 98 373 8151</div>
        </div>
        <div style={{marginTop: 26, display: 'flex', gap: 18, opacity: contact}}>
          <div style={{padding: '16px 26px', borderRadius: 99, background: 'rgba(255,255,255,.1)', fontSize: 26, fontWeight: 800}}>Escríbenos</div>
          <div style={{padding: '16px 26px', borderRadius: 99, background: violet, fontSize: 26, fontWeight: 800}}>aents.net</div>
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, bottom: 300, textAlign: 'center', fontSize: 24, fontWeight: 800, letterSpacing: '.13em', color: 'rgba(255,255,255,.5)', opacity: contact}}>
        AENTS · SOFTWARE FOR PEOPLE
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------------ *
 * The transformation arc: the same company, before and after.
 *
 * Seven compositions that take one imaginary construction company from the
 * site it has today to the one it could have. The arc before this one argues
 * from the visitor's side; this one argues from the company's, and the whole
 * point is that nothing about the business changes between the first frame and
 * the last — only how it is presented.
 *
 * The company is invented. It is called CONSTRUCTORA XYZ on purpose, following
 * the EMPRESA XYZ convention already used above, so it cannot be mistaken for
 * a real Ecuadorian builder. Its years, its project count, its team size and
 * its Torres del Valle development are an illustration: they carry the EJEMPLO
 * badge while they are legible, and the narration never reads them out.
 *
 * What these pieces may claim about Aents comes from `apps/web/src/i18n.ts` in
 * the Aents repository — fast, adaptable sites made to position a brand and
 * generate opportunities. No result, no timeline and no price is drawn.
 * ------------------------------------------------------------------------ */

const EXAMPLE_COMPANY = 'CONSTRUCTORA XYZ';
const EXAMPLE_DOMAIN = 'constructoraxyz.com';

/** Figures that belong to the invented company, never to Aents or to a market. */
const EXAMPLE_STATS = [
  {value: '+80', label: 'Proyectos ejecutados'},
  {value: '12', label: 'Años de experiencia'},
  {value: '25', label: 'Profesionales'},
];

const EXAMPLE_WORK = ['Residencial', 'Comercial', 'Industrial'];

const NEW_HEADLINE = 'Construimos espacios que permanecen.';
const NEW_SUBHEAD = '12 años transformando proyectos en realidad.';

/** The browser bar both versions of the site share, so only the page below it changes. */
const BrowserBar: React.FC<{width: number; tone: 'dated' | 'new'}> = ({width, tone}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width,
      height: 46,
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '0 18px',
      boxSizing: 'border-box',
      background: tone === 'dated' ? '#D8DCE5' : '#FFFFFF',
      zIndex: 5,
    }}
  >
    {['#FF6B6B', '#FFD166', '#22C55E'].map((color) => (
      <i key={color} style={{width: 11, height: 11, borderRadius: 99, background: color}} />
    ))}
    <div
      style={{
        marginLeft: 14,
        flex: 1,
        padding: '7px 16px',
        borderRadius: 99,
        background: tone === 'dated' ? '#EBEDF2' : '#EDF0F5',
        color: '#59627A',
        fontSize: 18,
        fontWeight: 800,
      }}
    >
      {EXAMPLE_DOMAIN}
    </div>
  </div>
);

/**
 * The site the company has today.
 *
 * Everything here is a decision that reads as dated rather than as ugly: type
 * too small to scan, a menu with more items than room, a button that says
 * nothing, and a picture the layout never made space for.
 */
const DatedPage: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: '#EEF0F4'}}>
    <BrowserBar width={752} tone="dated" />

    <div style={{position: 'absolute', left: 0, top: 46, width: 752, height: 52, background: dated, display: 'flex', alignItems: 'center', padding: '0 18px', boxSizing: 'border-box', gap: 16}}>
      <span style={{fontSize: 17, fontWeight: 800, color: '#FFFFFF', letterSpacing: '.02em'}}>{EXAMPLE_COMPANY}</span>
      <span style={{display: 'flex', gap: 14, overflow: 'hidden', whiteSpace: 'nowrap'}}>
        {['Inicio', 'Quiénes somos', 'Servicios', 'Obras', 'Noticias', 'Galería', 'Contáctenos'].map((item) => (
          <span key={item} style={{fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.66)'}}>
            {item}
          </span>
        ))}
      </span>
    </div>

    <div style={{position: 'absolute', left: 36, top: 122, width: 300}}>
      <div style={{fontSize: 21, fontWeight: 800, color: '#3A3A48', letterSpacing: '-.01em'}}>Bienvenidos a nuestro sitio web</div>
      <div style={{marginTop: 12, fontSize: 13, fontWeight: 600, color: '#6D6D7C', lineHeight: 1.5}}>
        {EXAMPLE_COMPANY} es una empresa con 12 años de experiencia y más de 80 proyectos ejecutados, dedicada a la construcción y a la
        ejecución de obras de infraestructura en el país.
      </div>
      <div style={{marginTop: 16, display: 'inline-block', padding: '9px 20px', borderRadius: 4, background: '#B9BEC9', color: '#3A3A48', fontSize: 14, fontWeight: 800}}>
        Click aquí
      </div>
    </div>

    <div style={{position: 'absolute', right: 36, top: 122, width: 330, height: 176, background: '#D5D9E1', display: 'grid', placeItems: 'center', color: '#9AA0AD', fontSize: 15, fontWeight: 800}}>
      imagen1.jpg
    </div>

    <div style={{position: 'absolute', left: 36, top: 330, display: 'flex', gap: 12}}>
      {[0, 1, 2, 3].map((card) => (
        <div key={card} style={{width: 164, height: 82, background: '#DFE2E9', border: '1px solid #CBD0DA'}} />
      ))}
    </div>

    <div style={{position: 'absolute', left: 0, bottom: 0, width: 752, height: 40, background: dated, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.55)'}}>
      Copyright © {EXAMPLE_COMPANY} · Todos los derechos reservados
    </div>
  </div>
);

/**
 * The site the company could have.
 *
 * The same facts in the order somebody actually reads them: who they are, what
 * they have built, and one thing to do next.
 */
const NewPage: React.FC<{narrow?: number}> = ({narrow = 0}) => (
  <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#191A34,#0C0D1E)'}}>
    <BrowserBar width={mix(narrow, 752, 320)} tone="new" />

    <div style={{position: 'absolute', left: 0, top: 46, width: mix(narrow, 752, 320), height: 56, background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', padding: '0 22px', boxSizing: 'border-box', gap: 22}}>
      <span style={{fontSize: 19, fontWeight: 800, color: '#FFFFFF'}}>{EXAMPLE_COMPANY}</span>
      {narrow < 0.5 ? (
        ['Proyectos', 'Nosotros', 'Contacto'].map((item) => (
          <span key={item} style={{fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,.55)'}}>
            {item}
          </span>
        ))
      ) : (
        <span style={{marginLeft: 'auto', display: 'grid', gap: 5}}>
          {[0, 1, 2].map((line) => (
            <i key={line} style={{width: 26, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.8)'}} />
          ))}
        </span>
      )}
    </div>

    <div style={{position: 'absolute', left: mix(narrow, 40, 22), top: mix(narrow, 138, 128), width: mix(narrow, 372, 276)}}>
      <div style={{fontSize: mix(narrow, 38, 30), fontWeight: 800, color: '#FFFFFF', letterSpacing: '-.03em', lineHeight: 1.12}}>{NEW_HEADLINE}</div>
      <div style={{marginTop: 14, fontSize: mix(narrow, 20, 17), fontWeight: 700, color: 'rgba(255,255,255,.62)'}}>{NEW_SUBHEAD}</div>
      <div style={{marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap'}}>
        <div style={{padding: '14px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#7C6BF8,#4C39C4)', fontSize: 19, fontWeight: 800, color: '#FFFFFF', boxShadow: '0 16px 40px rgba(107,92,246,.42)'}}>
          Solicitar cotización
        </div>
        <div style={{padding: '14px 24px', borderRadius: 16, border: '2px solid rgba(167,139,250,.45)', fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.86)'}}>Ver proyectos</div>
      </div>
    </div>

    {narrow < 0.5 ? (
      <div style={{position: 'absolute', right: 40, top: 138, width: 272, height: 250, borderRadius: 24, background: 'linear-gradient(150deg,#6B5CF6,#2A2258)', border: '2px solid rgba(167,139,250,.3)'}} />
    ) : null}
  </div>
);

/**
 * 6 — What the company looks like on the internet today.
 *
 * The scene opens tight on the credentials, because that is the part the
 * company is proud of, and pulls back until those credentials turn out to be
 * buried in a page nobody would read. Nothing is exaggerated on the way out:
 * the same pixels that were dignified at 2.2× are the ones that fail at 1×.
 */
export const AentsWebDatedSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const pull = glide(p, 0.14, 0.68, 0, 1);
  const zoom = mix(pull, 2.2, 1);
  const stamp = reveal(p, 0.72, 0.86);

  return (
    <Shell frame={frame} eyebrow="ASÍ SE VE HOY" title="Una empresa con trayectoria">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 14,
            width: BOARD.width,
            height: 470,
            borderRadius: 26,
            overflow: 'hidden',
            border: '2px solid rgba(255,255,255,.14)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
          }}
        >
          <div style={{position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '186px 158px'}}>
            <DatedPage />
          </div>
        </div>

        <ExampleBadge style={{position: 'absolute', right: 16, top: 30}} />

        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 404,
            padding: '12px 26px',
            borderRadius: 14,
            background: leaving,
            color: '#2A0B0B',
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: '.16em',
            opacity: stamp,
            transform: `translateY(${(1 - stamp) * 14}px)`,
            boxShadow: '0 16px 40px rgba(249,112,102,.34)',
          }}
        >
          ANTES
        </div>
      </Board>
    </Shell>
  );
};

/**
 * 7 — The gap, stated as two columns.
 *
 * The left column is the company; the right column is what the internet says
 * about it. Neither side is argued — they are simply put next to each other,
 * and the question at the end is the whole scene.
 */
const CONTRAST_REAL = ['12 años de trabajo', '+80 proyectos', 'Equipo profesional'];
const CONTRAST_DIGITAL = ['Web antigua', 'Mala experiencia móvil', 'Sin propuesta clara'];

const ContrastColumn: React.FC<{
  title: string;
  color: string;
  rows: string[];
  x: number;
  progress: number;
  children?: React.ReactNode;
}> = ({title, color, rows, x, progress, children}) => (
  <div style={{position: 'absolute', left: x, top: 10, width: 344}}>
    <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.14em', color, opacity: reveal(progress, 0.04, 0.14)}}>{title}</div>
    <div style={{marginTop: 18, display: 'grid', gap: 14}}>
      {rows.map((row, index) => {
        const shown = reveal(progress, 0.16 + index * 0.11, 0.32 + index * 0.11);
        return (
          <div
            key={row}
            style={{
              padding: '20px 22px',
              borderRadius: 20,
              background: `${color}1A`,
              border: `2px solid ${color}66`,
              fontSize: 25,
              fontWeight: 800,
              color: '#FFFFFF',
              opacity: shown,
              transform: `translateY(${(1 - shown) * 16}px)`,
            }}
          >
            {row}
          </div>
        );
      })}
    </div>
    {children}
  </div>
);

export const AentsWebContrastSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const divider = reveal(p, 0.06, 0.22);
  const question = spring({frame: frame - span * 0.72, fps, config: {damping: 16, mass: 0.8}});

  return (
    <Shell frame={frame} eyebrow="EL MISMO NEGOCIO" title="Dos versiones de la empresa">
      <Board>
        <ContrastColumn title="EMPRESA REAL" color={green} rows={CONTRAST_REAL} x={0} progress={p}>
          <ExampleBadge style={{position: 'absolute', left: 0, top: 300}} />
        </ContrastColumn>

        <div
          style={{
            position: 'absolute',
            left: BOARD.width / 2 - 1,
            top: 10,
            width: 2,
            height: 300 * divider,
            background: 'linear-gradient(180deg,transparent,rgba(167,139,250,.7),transparent)',
          }}
        />

        <ContrastColumn title="PRESENCIA DIGITAL" color={leaving} rows={CONTRAST_DIGITAL} x={408} progress={p} />

        {question > 0.04 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 384,
              display: 'grid',
              placeItems: 'center',
              opacity: question,
              transform: `translateY(${(1 - question) * 20}px) scale(${mix(question, 0.9, 1)})`,
            }}
          >
            <div
              style={{
                padding: '18px 40px',
                borderRadius: 99,
                background: 'rgba(255,255,255,.08)',
                border: '2px solid rgba(167,139,250,.5)',
                fontSize: 36,
                fontWeight: 800,
                color: '#FFFFFF',
              }}
            >
              ¿Ves el problema?
            </div>
          </div>
        ) : null}
      </Board>
    </Shell>
  );
};

/**
 * 8 — Selected, deleted, rebuilt.
 *
 * One take in three acts. The page is selected and removed, so the piece is
 * honest that this is a rebuild and not a touch-up; the screen goes quiet for a
 * beat; and the new page arrives in the order a page is actually designed —
 * the grid before the logo, the title before the buttons. The label under the
 * frame names the piece being placed, which is what makes it read as
 * construction instead of as a transition.
 */
const REBUILD_STEPS = [
  {key: 'grid', label: 'RETÍCULA', at: 0.42},
  {key: 'logo', label: 'LOGO', at: 0.5},
  {key: 'nav', label: 'NAVEGACIÓN', at: 0.58},
  {key: 'image', label: 'IMAGEN', at: 0.66},
  {key: 'title', label: 'TÍTULO', at: 0.74},
  {key: 'cta', label: 'BOTONES', at: 0.84},
];

export const AentsWebRebootSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const selection = ramp(p, 0.05, 0.19, 0, 1);
  const wiped = reveal(p, 0.2, 0.27);
  const silence = reveal(p, 0.25, 0.31) * (1 - reveal(p, 0.37, 0.43));
  const pointerX = mix(ramp(p, 0.03, 0.19, 0, 1), 34, 712);
  const pointerY = mix(ramp(p, 0.03, 0.19, 0, 1), 30, 446);

  const built = (at: number) => reveal(p, at, at + 0.07);
  const step = REBUILD_STEPS.filter((item) => p >= item.at).slice(-1)[0];
  const stepShown = reveal(p, 0.42, 0.46) * (1 - reveal(p, 0.92, 0.98));

  return (
    <Shell frame={frame} eyebrow="ASÍ LA HARÍAMOS" title="La reconstruimos entera">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 14,
            width: BOARD.width,
            height: 470,
            borderRadius: 26,
            overflow: 'hidden',
            background: '#080915',
            border: '2px solid rgba(167,139,250,.28)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
          }}
        >
          <div style={{position: 'absolute', inset: 0, opacity: 1 - wiped, filter: `saturate(${1 - wiped})`}}>
            <DatedPage />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 752 * selection,
                height: 470 * selection,
                background: 'rgba(107,92,246,.3)',
                border: selection > 0.02 ? `2px solid ${lavender}` : 'none',
                boxSizing: 'border-box',
                zIndex: 6,
              }}
            />
          </div>

          {silence > 0.02 ? (
            <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: silence}}>
              <div style={{fontSize: 44, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-.03em'}}>Reconstruyámosla.</div>
            </div>
          ) : null}

          <div style={{position: 'absolute', inset: 0, opacity: reveal(p, 0.4, 0.46)}}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: built(0.42) * 0.35 * (1 - reveal(p, 0.86, 0.96)),
                backgroundImage: 'linear-gradient(rgba(167,139,250,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,.5) 1px,transparent 1px)',
                backgroundSize: '48px 48px',
              }}
            />
            <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(160deg,#191A34,#0C0D1E)', opacity: built(0.42) * 0.9, zIndex: -1}} />

            <div style={{opacity: built(0.5)}}>
              <BrowserBar width={752} tone="new" />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 46,
                width: 752,
                height: 56,
                background: 'rgba(255,255,255,.07)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 22px',
                boxSizing: 'border-box',
                gap: 22,
                opacity: built(0.5),
              }}
            >
              <span style={{fontSize: 19, fontWeight: 800, color: '#FFFFFF'}}>{EXAMPLE_COMPANY}</span>
              {['Proyectos', 'Nosotros', 'Contacto'].map((item, index) => (
                <span key={item} style={{fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,.55)', opacity: built(0.58 + index * 0.015)}}>
                  {item}
                </span>
              ))}
            </div>

            <div
              style={{
                position: 'absolute',
                right: 40,
                top: 138,
                width: 272,
                height: 250,
                borderRadius: 24,
                background: 'linear-gradient(150deg,#6B5CF6,#2A2258)',
                border: '2px solid rgba(167,139,250,.3)',
                opacity: built(0.66),
                transform: `scale(${mix(built(0.66), 0.94, 1)})`,
              }}
            />

            <div style={{position: 'absolute', left: 40, top: 138, width: 372}}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-.03em',
                  lineHeight: 1.12,
                  opacity: built(0.74),
                  transform: `translateY(${(1 - built(0.74)) * 14}px)`,
                }}
              >
                {NEW_HEADLINE}
              </div>
              <div style={{marginTop: 14, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,.62)', opacity: built(0.78)}}>{NEW_SUBHEAD}</div>
              <div style={{marginTop: 22, display: 'flex', gap: 12, opacity: built(0.84), transform: `translateY(${(1 - built(0.84)) * 12}px)`}}>
                <div style={{padding: '14px 24px', borderRadius: 16, background: 'linear-gradient(135deg,#7C6BF8,#4C39C4)', fontSize: 19, fontWeight: 800, color: '#FFFFFF', boxShadow: '0 16px 40px rgba(107,92,246,.42)'}}>
                  Solicitar cotización
                </div>
                <div style={{padding: '14px 24px', borderRadius: 16, border: '2px solid rgba(167,139,250,.45)', fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.86)'}}>Ver proyectos</div>
              </div>
            </div>
          </div>
        </div>

        <ExampleBadge style={{position: 'absolute', right: 16, top: 30, opacity: reveal(p, 0.78, 0.86)}} />

        {stepShown > 0.02 ? (
          <div
            style={{
              position: 'absolute',
              left: 22,
              top: 428,
              padding: '9px 18px',
              borderRadius: 10,
              background: 'rgba(8,9,21,.72)',
              border: '2px solid rgba(167,139,250,.4)',
              fontSize: 21,
              fontWeight: 800,
              letterSpacing: '.2em',
              color: lavender,
              opacity: stepShown,
            }}
          >
            {step ? step.label : ''}
          </div>
        ) : null}

        <Pointer x={pointerX} y={pointerY} opacity={1 - reveal(p, 0.19, 0.24)} press={selection > 0.02 ? 1 : 0} />
      </Board>
    </Shell>
  );
};

/**
 * 9 — The proof the company already owns.
 *
 * A single scroll, no cuts: the figures first because they are read in one
 * glance, the work after because it is what the figures are about. The badge
 * stays pinned while the numbers are legible and leaves with them.
 */
export const AentsWebCredibilitySim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const scroll = ramp(p, 0.16, 0.88, 0, 330);
  const statsVisible = 1 - reveal(p, 0.5, 0.66);

  return (
    <Shell frame={frame} eyebrow="LO QUE YA TIENEN" title="Su trabajo, al frente">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 14,
            width: BOARD.width,
            height: 470,
            borderRadius: 26,
            overflow: 'hidden',
            background: 'linear-gradient(160deg,#191A34,#0C0D1E)',
            border: '2px solid rgba(167,139,250,.28)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
          }}
        >
          <BrowserBar width={752} tone="new" />

          <div style={{position: 'absolute', left: 0, top: 46, width: 752, height: 424, overflow: 'hidden'}}>
            <div style={{position: 'absolute', left: 0, top: -scroll, width: 752, height: 820}}>
              <div style={{position: 'absolute', left: 40, top: 34, display: 'flex', gap: 20}}>
                {EXAMPLE_STATS.map((stat, index) => {
                  const shown = reveal(p, 0.08 + index * 0.07, 0.24 + index * 0.07);
                  return (
                    <div
                      key={stat.label}
                      style={{
                        width: 210,
                        padding: '24px 22px',
                        borderRadius: 22,
                        background: 'rgba(255,255,255,.06)',
                        border: '2px solid rgba(167,139,250,.24)',
                        boxSizing: 'border-box',
                        opacity: shown,
                        transform: `translateY(${(1 - shown) * 16}px)`,
                      }}
                    >
                      <div style={{fontSize: 52, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-.04em'}}>{stat.value}</div>
                      <div style={{marginTop: 6, fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,.58)'}}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{position: 'absolute', left: 40, top: 250, fontSize: 26, fontWeight: 800, color: lavender, letterSpacing: '.02em'}}>Proyectos</div>

              <div style={{position: 'absolute', left: 40, top: 300, display: 'flex', gap: 20}}>
                {EXAMPLE_WORK.map((kind, index) => {
                  const shown = reveal(p, 0.44 + index * 0.09, 0.62 + index * 0.09);
                  return (
                    <div
                      key={kind}
                      style={{
                        width: 210,
                        opacity: shown,
                        transform: `translateY(${(1 - shown) * 22}px)`,
                      }}
                    >
                      <div
                        style={{
                          height: 152,
                          borderRadius: 20,
                          background: `linear-gradient(150deg,${[violet, '#3E8BD8', '#2FA98C'][index]},#1B1A38)`,
                          border: '2px solid rgba(167,139,250,.24)',
                        }}
                      />
                      <div style={{marginTop: 12, fontSize: 24, fontWeight: 800, color: '#FFFFFF'}}>{kind}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <ExampleBadge style={{position: 'absolute', right: 16, top: 30, opacity: statsVisible}} />
      </Board>
    </Shell>
  );
};

/**
 * 10 — From a visit to a request.
 *
 * The page does the work: a project opens, the gallery moves, the information
 * is where it is expected, and the one action stays reachable the whole time.
 * The card on the other side says NUEVA SOLICITUD, in the words the person
 * running a construction company would use, not the industry's English one.
 */
const REQUEST_ROWS = [
  ['Ubicación', 'Sector norte'],
  ['Etapa', 'En construcción'],
  ['Unidades', '48 departamentos'],
];

export const AentsWebRequestSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const pageIn = reveal(p, 0.02, 0.14);
  const gallery = Math.min(2, Math.floor(reveal(p, 0.16, 0.46) * 2.999));
  const rowsIn = reveal(p, 0.34, 0.56);
  const pointerTrip = glide(p, 0.52, 0.66, 0, 1);
  const clicked = reveal(p, 0.66, 0.74);
  const received = spring({frame: frame - span * 0.74, fps, config: {damping: 15, mass: 0.7}});

  const pointerX = mix(pointerTrip, 610, 250);
  const pointerY = mix(pointerTrip, 150, 396);

  return (
    <Shell frame={frame} eyebrow="LO QUE LA PÁGINA HACE" title="De visita a solicitud">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 14,
            width: BOARD.width,
            height: 470,
            borderRadius: 26,
            overflow: 'hidden',
            background: 'linear-gradient(160deg,#191A34,#0C0D1E)',
            border: '2px solid rgba(167,139,250,.28)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
            opacity: pageIn,
          }}
        >
          <BrowserBar width={752} tone="new" />

          <div style={{position: 'absolute', left: 34, top: 74, fontSize: 30, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-.02em'}}>
            Proyecto Torres del Valle
          </div>

          <div style={{position: 'absolute', left: 34, top: 122, display: 'flex', gap: 14}}>
            {[0, 1, 2].map((slide) => (
              <div
                key={slide}
                style={{
                  width: slide === gallery ? 300 : 132,
                  height: 148,
                  borderRadius: 18,
                  background: `linear-gradient(150deg,${[violet, '#3E8BD8', '#2FA98C'][slide]},#1B1A38)`,
                  border: `2px solid ${slide === gallery ? lavender : 'rgba(167,139,250,.2)'}`,
                  boxSizing: 'border-box',
                  opacity: slide === gallery ? 1 : 0.55,
                }}
              />
            ))}
          </div>

          <div style={{position: 'absolute', left: 34, top: 292, width: 420, display: 'grid', gap: 10}}>
            {REQUEST_ROWS.map((row, index) => {
              const shown = reveal(rowsIn, index * 0.28, 0.4 + index * 0.28);
              return (
                <div key={row[0]} style={{display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, opacity: shown}}>
                  <span style={{color: 'rgba(255,255,255,.52)'}}>{row[0]}</span>
                  <span style={{color: '#FFFFFF', fontWeight: 800}}>{row[1]}</span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              left: 34,
              bottom: 26,
              width: 400,
              padding: '18px 0',
              borderRadius: 18,
              textAlign: 'center',
              background: 'linear-gradient(135deg,#7C6BF8,#4C39C4)',
              fontSize: 24,
              fontWeight: 800,
              color: '#FFFFFF',
              boxShadow: `0 16px 40px rgba(107,92,246,.42)`,
              transform: `scale(${1 - clicked * (1 - clicked) * 0.3})`,
            }}
          >
            Solicitar cotización
          </div>

          {received > 0.04 ? (
            <div
              style={{
                position: 'absolute',
                right: 22,
                bottom: 26,
                width: 262,
                padding: '20px 22px',
                borderRadius: 22,
                background: green,
                color: '#06210F',
                opacity: received,
                transform: `translateX(${(1 - received) * 40}px)`,
                boxShadow: '0 18px 46px rgba(34,197,94,.4)',
              }}
            >
              <div style={{fontSize: 19, fontWeight: 800, letterSpacing: '.14em'}}>NUEVA SOLICITUD ✓</div>
              <div style={{marginTop: 6, fontSize: 19, fontWeight: 700, opacity: 0.72}}>Torres del Valle</div>
            </div>
          ) : null}
        </div>

        <ExampleBadge style={{position: 'absolute', right: 16, top: 30}} />

        <Pointer x={pointerX} y={pointerY} opacity={reveal(p, 0.48, 0.54) * (1 - reveal(p, 0.8, 0.88))} press={clicked * (1 - clicked) * 4} />
        <ClickRing x={pointerX + 6} y={pointerY + 6} progress={clicked} />
      </Board>
    </Shell>
  );
};

/**
 * 11 — The same page on the device it will actually be opened on.
 *
 * The frame narrows and the page reorders itself instead of shrinking: the menu
 * folds, the columns stack, the button grows. A thumb walks down the phone and
 * reaches the action without a pinch, which is the only test that matters.
 */
export const AentsWebResponsiveSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();

  const narrow = glide(p, 0.1, 0.58, 0, 1);
  const width = mix(narrow, 752, 320);
  const left = (BOARD.width - width) / 2;
  const thumb = glide(p, 0.6, 0.84, 0, 1);
  const confirmed = spring({frame: frame - span * 0.86, fps, config: {damping: 15, mass: 0.7}});

  const labels = [
    {key: 'desktop', label: 'ESCRITORIO', until: 0.24},
    {key: 'tablet', label: 'TABLETA', until: 0.44},
    {key: 'phone', label: 'TELÉFONO', until: 1},
  ];
  const device = labels.filter((item) => p <= item.until)[0] ?? labels[2];

  return (
    <Shell frame={frame} eyebrow="DONDE ESTÁN TUS CLIENTES" title="La misma página, en el bolsillo">
      <Board>
        <div
          style={{
            position: 'absolute',
            left,
            top: 14,
            width,
            height: 470,
            borderRadius: mix(narrow, 26, 34),
            overflow: 'hidden',
            border: '2px solid rgba(167,139,250,.28)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
          }}
        >
          <NewPage narrow={narrow} />
        </div>

        <div style={{position: 'absolute', left: 6, top: 240, width: 190, textAlign: 'center', fontSize: 21, fontWeight: 800, letterSpacing: '.2em', color: lavender, opacity: narrow > 0.72 ? 1 : 0.55}}>
          {device.label}
        </div>

        {narrow > 0.7 ? (
          <div
            style={{
              position: 'absolute',
              left: left + mix(thumb, 250, 130),
              top: mix(thumb, 190, 320),
              width: 74,
              height: 74,
              borderRadius: 99,
              background: 'rgba(255,255,255,.22)',
              border: '3px solid rgba(255,255,255,.6)',
              opacity: (narrow - 0.7) / 0.3,
            }}
          />
        ) : null}

        {confirmed > 0.05 ? (
          <div
            style={{
              position: 'absolute',
              left: 556,
              top: 404,
              padding: '14px 24px',
              borderRadius: 99,
              background: green,
              color: '#06210F',
              fontSize: 26,
              fontWeight: 800,
              opacity: confirmed,
              transform: `translateY(${(1 - confirmed) * 20}px) scale(${mix(confirmed, 0.86, 1)})`,
              boxShadow: '0 18px 46px rgba(34,197,94,.4)',
            }}
          >
            Se adapta ✓
          </div>
        ) : null}
      </Board>
    </Shell>
  );
};

/**
 * 12 — The two versions, side by side, and then only one.
 *
 * The divider does the argument: while it sits in the middle the viewer
 * compares, and when it leaves there is nothing left to compare against. The
 * company did not change between the two halves, which is the line the
 * narration says over this shot.
 */
export const AentsWebBeforeAfterSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const hold = reveal(p, 0.04, 0.16);
  const sweep = ramp(p, 0.3, 0.86, 0.5, 1);
  const cut = BOARD.width * sweep;
  const labelsOut = 1 - reveal(p, 0.82, 0.94);

  return (
    <Shell frame={frame} eyebrow="LA MISMA EMPRESA" title="Antes y después">
      <Board>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 14,
            width: BOARD.width,
            height: 470,
            borderRadius: 26,
            overflow: 'hidden',
            border: '2px solid rgba(167,139,250,.28)',
            boxShadow: '0 30px 80px rgba(0,0,0,.5)',
            opacity: hold,
          }}
        >
          <div style={{position: 'absolute', inset: 0}}>
            <NewPage />
          </div>
          <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${BOARD.width - cut}px 0 0)`}}>
            <DatedPage />
          </div>

          <div style={{position: 'absolute', left: cut - 2, top: 0, width: 4, height: 470, background: lavender, boxShadow: `0 0 40px 10px rgba(167,139,250,.45)`, opacity: labelsOut}} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: Math.max(6, cut - 150),
            top: 424,
            padding: '10px 22px',
            borderRadius: 12,
            background: leaving,
            color: '#2A0B0B',
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: '.16em',
            opacity: labelsOut,
          }}
        >
          ANTES
        </div>

        <div
          style={{
            position: 'absolute',
            left: Math.min(BOARD.width - 190, cut + 20),
            top: 424,
            padding: '10px 22px',
            borderRadius: 12,
            background: green,
            color: '#06210F',
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: '.16em',
            opacity: labelsOut,
          }}
        >
          DESPUÉS
        </div>

        <ExampleBadge style={{position: 'absolute', right: 16, top: 30}} />
      </Board>
    </Shell>
  );
};
