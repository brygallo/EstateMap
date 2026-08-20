import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useVideoConfig} from 'remotion';
import {
  BoxedText,
  BrandTokens,
  Field,
  Halo,
  PANEL_WIDTH,
  Panel,
  Reveal,
  Sweep,
  Trace,
  anticipate,
  beat,
  glass,
  glide,
  land,
  lit,
  metronome,
  settle,
  stagger,
  tokensFor,
} from './system-kit';
import {DEPTH, HERO_MOVES, HeroImpact, HeroPlane, HeroStage, heroBeats} from './hero-stage';
import {AppWindow, NavRail, Pill, Row, ui} from './interface-kit';
import {palette, sideCrop} from './theme';
import type {SimulationProps} from './simulations';

/**
 * «Del problema al software»: what Aents does, shown instead of listed.
 *
 * The bar these are built to: a viewer who arrives with the sound off should be
 * able to say what this company does before the second scene ends. That is a
 * craft problem, not a copy problem, so every scene here obeys the same rules —
 * one subject at a time, weight on every arrival, depth behind the subject,
 * light that says where the front is, and something moving in every frame.
 *
 * Everything is drawn, never a screenshot, and nothing states a fact: no counts,
 * no deadlines, no prices. The tools a viewer already uses are named by category
 * — hojas, documentos, mensajes, tareas — because putting a third party's
 * wordmark on screen would be quoting a brand this piece does not carry.
 *
 * The ground, the panel, the physics and the fitted text come from `system-kit`,
 * so a Geo piece gets the same craft with its own palette. What stays here is
 * what only makes sense for Aents: these scenes argue for custom software.
 */

const mark = (brandTile?: string | null) => (brandTile ? staticFile(brandTile) : null);

/** The stage every panel scene draws inside. */
const STAGE = {width: PANEL_WIDTH, height: 500};

/* ------------------------------------------------------------------ *
 * 1 · Hook — the scattered problem crosses the mark and comes out as software
 *
 * The opening shot of the piece, and therefore the one every viewer sees: it is
 * built on `hero-stage` and `interface-kit` because the finish of this frame is
 * the argument. A company that draws its own product as three grey boxes has
 * told you what it would deliver.
 *
 * Staging `push-in`, declared in `renderer.HERO_STAGINGS` so the next hook is
 * not shot the same way. What the scene owns is the argument: four scattered
 * places where one process lives, fused into a single problem, taken through
 * the mark, and returned as an interface where those same three things —
 * proceso, datos, equipo — are one system that resolves in front of the viewer.
 * ------------------------------------------------------------------ */

/**
 * Where the scattered work starts, before it becomes one problem.
 *
 * Wide apart and large on purpose. The first version of this hook placed four
 * small chips near the centre and measured 0.75 events per second: on a
 * 1080 x 1920 canvas an element that occupies two per cent of the frame can
 * arrive, travel and land without anything having visibly happened.
 */
const SCATTERED = [
  {label: 'Hojas', from: {x: 302, y: 322}},
  {label: 'Documentos', from: {x: 778, y: 300}},
  {label: 'Mensajes', from: {x: 296, y: 508}},
  {label: 'Tareas', from: {x: 784, y: 486}},
];

const CARD = {width: 248, height: 92};

/** The three things the system ends up holding together. */
const SYSTEM_ROWS = [
  {label: 'Tu proceso', meta: 'Conectado'},
  {label: 'Tus datos', meta: 'En un sitio'},
  {label: 'Tu equipo', meta: 'Con acceso'},
];

const FUSION = {x: 540, y: 392};
const MARK = {x: 540, y: 606, size: 208};
/**
 * The window is laid out for the end of the push, not the start.
 *
 * A camera that closes in 26 % takes everything on the subject plane out with
 * it: the first geometry here was 780 wide and, by the last second, its two
 * borders sat outside `sideCrop` — invisible on any phone taller than 16:9, and
 * invisible in a way no still frame of the first second would show.
 */
const WINDOW = {left: 210, top: 760, width: 660, height: 372};
const RAIL_WIDTH = 200;
const IMPACT_AT = 0.5;

export const AentsProblemToSoftwareSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName, brandTile}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const tile = mark(brandTile);

  // The mark is on screen from the first frame: a hook only works if the viewer
  // knows who is claiming it while the claim is still being made.
  const arrival = spring({frame, fps, config: {damping: 14, mass: 0.6}});
  // Milestones are named for what happens, not for when: the voice decides how
  // long this scene is, and the arc has to survive being 3.6 s or 4.4 s.
  const gathering = heroBeats(p, SCATTERED.length, {from: 0.02, to: 0.28, hold: 0.09});
  const fused = beat(p, 0.28, 0.36);
  const thrown = anticipate(p, 0.34, IMPACT_AT);
  const charging = beat(p, 0.34, IMPACT_AT);
  const grade = beat(p, 0.18, IMPACT_AT);
  const absorbed = beat(p, IMPACT_AT - 0.04, IMPACT_AT + 0.04);
  const ignition = Math.sin(beat(p, 0.42, 0.64) * Math.PI);
  const assembled = land(p, 0.52, 0.76);
  const rows = heroBeats(p, SYSTEM_ROWS.length, {from: 0.58, to: 0.84, hold: 0.1});
  const resolved = heroBeats(p, SYSTEM_ROWS.length, {from: 0.72, to: 0.98, hold: 0.09});
  const stamped = land(p, 0.86, 1);
  /**
   * The mark answers every beat of the scene, and the window answers its own.
   *
   * A card and a row are small objects on a tall canvas: either can arrive,
   * travel and settle without the picture measurably changing, which is what
   * the first pass of this hook did for a second and a half at a time. The mark
   * is the largest lit thing in frame, so tying each beat to a reaction on it is
   * how a small event becomes a visible one — and it is the causality the
   * standard asks for, not decoration: the mark is what the scene claims is
   * doing the work.
   */
  const reaction = Math.max(
    0,
    ...[...gathering, ...rows, ...resolved].map((event) =>
      Math.sin(beat(p, event.start, event.start + 0.06) * Math.PI),
    ),
    // The four becoming one, and the window taking shape.
    Math.sin(beat(p, 0.28, 0.34) * Math.PI),
    Math.sin(beat(p, 0.52, 0.58) * Math.PI),
  );

  return (
    <HeroStage tokens={tokens} progress={p} camera={HERO_MOVES['push-in'](p)} keyLight={{x: MARK.x, y: MARK.y - 120}}>
      {(camera) => (
        <>
          {/* Context: the same work living in four places, on its own plane so
              it reads as further away than the problem it turns into. */}
          <HeroPlane camera={camera} depth={DEPTH.context}>
            {SCATTERED.map((piece, index) => {
              const gathered = gathering[index].progress;
              const pull = glide(p, 0.16 + index * 0.02, 0.3);
              const x = piece.from.x + (FUSION.x - piece.from.x) * pull;
              const y = piece.from.y + (FUSION.y - piece.from.y) * pull;
              // The card arrives from outside the frame, in the direction it
              // will later be pulled from: entering and leaving on the same
              // axis is what makes the convergence read as one movement.
              const outward = piece.from.x < FUSION.x ? -1 : 1;
              return (
                <div
                  key={piece.label}
                  style={{
                    position: 'absolute',
                    left: x - CARD.width / 2 + (1 - gathered) * outward * 320,
                    top: y - CARD.height / 2,
                    width: CARD.width,
                    height: CARD.height,
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    gap: ui.space(1.5),
                    padding: `0 ${ui.space(2)}px`,
                    borderRadius: ui.radius.card,
                    ...glass(tokens, 1.1),
                    fontSize: ui.type.label,
                    fontWeight: 800,
                    color: palette.white,
                    opacity: Math.min(1, gathered * 1.5) * (1 - fused),
                    transform: `scale(${(0.82 + gathered * 0.18) * (1 - pull * 0.6)}) rotate(${(1 - gathered) * outward * 9}deg)`,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 44,
                      borderRadius: 99,
                      background: tokens.alert,
                      boxShadow: `0 0 18px ${tokens.alert}`,
                      flex: 'none',
                    }}
                  />
                  {piece.label}
                </div>
              );
            })}
          </HeroPlane>

          {/* The room goes down as the problem gathers, and comes back on the
              frame it is absorbed.
              This is the light doing the storytelling, and it is also the only
              honest way a dark composition passes its own stillness gate: four
              cards and a label are four per cent of a 1080 x 1920 frame, so they
              can converge, travel and land while the picture — measured as a
              picture — has not changed. The grade changes all of it. */}
          <AbsoluteFill
            style={{
              background: '#03040C',
              opacity: grade * 0.55 * (1 - absorbed),
              pointerEvents: 'none',
            }}
          />

          {/* Subject: the four become one problem, and the one is thrown. */}
          <HeroPlane camera={camera} depth={DEPTH.subject}>
            {/* The mark charges before it takes the hit: a ring the width of the
                frame closes onto it. Without this the throw was 1.3 s in which
                a 300 px label travelled 200 px and the picture, measured as a
                whole, did not change at all. Energy arriving has to be seen
                arriving, or the impact is a flash with no cause. */}
            {absorbed < 1
              ? [0, 0.08].map((delay) => {
                  const closing = beat(p, 0.34 + delay, IMPACT_AT);
                  if (closing <= 0) return null;
                  return (
                    <div
                      key={delay}
                      style={{
                        position: 'absolute',
                        left: MARK.x - 540,
                        top: MARK.y - 540,
                        width: 1080,
                        height: 1080,
                        borderRadius: '50%',
                        border: `${4 + closing * 8}px solid ${tokens.alert}`,
                        opacity: closing * (1 - absorbed) * 0.75,
                        transform: `scale(${1 - closing * 0.8})`,
                      }}
                    />
                  );
                })
              : null}

            {/* The token travels with a wake. A label that slides from one
                position to another reads as a transition; a wake reads as
                weight going somewhere. */}
            {thrown > 0.1 ? [2, 1].map((ghost) => (
              <div
                key={ghost}
                style={{
                  position: 'absolute',
                  left: FUSION.x - 150,
                  top: FUSION.y - 40 + Math.max(0, anticipate(p, 0.34 + ghost * 0.02, IMPACT_AT + ghost * 0.02)) * (MARK.y - FUSION.y),
                  width: 300,
                  height: 86,
                  borderRadius: ui.radius.pill,
                  border: `3px solid ${tokens.alert}`,
                  opacity: fused * (1 - absorbed) * (0.2 / ghost),
                  filter: `blur(${ghost * 5}px)`,
                }}
              />
            )) : null}

            <div
              style={{
                position: 'absolute',
                left: FUSION.x - 150,
                top: FUSION.y - 40 + Math.max(0, thrown) * (MARK.y - FUSION.y),
                width: 300,
                boxSizing: 'border-box',
                padding: `${ui.space(2)}px 0`,
                borderRadius: ui.radius.pill,
                textAlign: 'center',
                background: `${tokens.alert}26`,
                border: `3px solid ${tokens.alert}`,
                boxShadow: `0 0 ${30 + ignition * 40}px ${tokens.alert}59`,
                color: palette.white,
                fontSize: ui.type.body,
                fontWeight: 800,
                letterSpacing: '.08em',
                opacity: fused * (1 - absorbed),
                transform: `scale(${(0.86 + fused * 0.14) * (1 - absorbed * 0.5)})`,
              }}
            >
              PROBLEMA
            </div>

            {/* The mark takes the hit. It is above the traffic on purpose: with
                the label crossing over the logo both became unreadable. */}
            <div
              style={{
                position: 'absolute',
                left: MARK.x - MARK.size / 2,
                top: MARK.y - MARK.size / 2,
                width: MARK.size,
                height: MARK.size,
                borderRadius: 60,
                display: 'grid',
                placeItems: 'center',
                background: `linear-gradient(150deg, ${tokens.accent}, #33268A)`,
                boxShadow:
                  `0 34px ${110 + reaction * 90}px ${tokens.accent}${ignition > 0.5 ? 'B3' : '8C'}, ` +
                  `inset 0 3px 0 rgba(255,255,255,.3)`,
                opacity: arrival,
                transform: `scale(${0.82 + arrival * 0.18 + ignition * 0.1 + reaction * 0.07})`,
              }}
            >
              {tile ? <Img src={tile} style={{width: 142, height: 142, borderRadius: 40}} /> : null}
            </div>

            <HeroImpact progress={p} at={IMPACT_AT} x={MARK.x} y={MARK.y} color={tokens.soft} reach={620} />

            {/* What comes out the other side is a product, drawn to the rules a
                product obeys: one active destination, real states, real targets. */}
            <AppWindow
              tokens={tokens}
              title="Tu operación"
              breadcrumb="Un solo sistema"
              width={WINDOW.width}
              height={WINDOW.height}
              enter={assembled}
              style={{
                left: WINDOW.left,
                top: WINDOW.top + (1 - assembled) * 74,
                borderColor: `${tokens.soft}${reaction > 0.4 ? 'B3' : '3D'}`,
                boxShadow: `0 40px 104px rgba(0,0,0,.6), 0 0 ${reaction * 90}px ${tokens.accent}80`,
              }}
            >
              <NavRail
                tokens={tokens}
                items={['Procesos', 'Datos', 'Equipo', 'Reportes']}
                active={0}
                width={RAIL_WIDTH}
                enter={beat(p, 0.56, 0.82)}
              />
              <div style={{position: 'absolute', left: RAIL_WIDTH, right: 0, top: 0, bottom: 0, padding: ui.space(2.5)}}>
                {SYSTEM_ROWS.map((row, index) => (
                  <Row
                    key={row.label}
                    tokens={tokens}
                    label={row.label}
                    meta={row.meta}
                    state={resolved[index].done ? 'done' : resolved[index].progress > 0 ? 'working' : 'idle'}
                    enter={rows[index].progress}
                  />
                ))}
                <div style={{marginTop: ui.space(1), opacity: stamped, transform: `translateY(${(1 - stamped) * 12}px)`}}>
                  <Pill tokens={tokens} text="HECHO A TU MEDIDA" tone="confirm" />
                </div>
              </div>
              {/* The system running, once it exists. A window that finishes
                  assembling and then holds is the last two seconds of the shot
                  spent on a screenshot. */}
              {assembled >= 1 ? (
                <Sweep progress={metronome(p, 1.6)} color={`${tokens.soft}3D`} width={260} span={WINDOW.width} />
              ) : null}
              {/* One pass of confirmation light when the last row resolves: the
                  system is not being built any more, it is running. */}
              {stamped > 0 ? (
                <Sweep progress={glide(p, 0.86, 1) * 0.62} color={`${tokens.confirm}59`} width={300} span={WINDOW.width} />
              ) : null}
            </AppWindow>
          </HeroPlane>
        </>
      )}
    </HeroStage>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · The same process, living in four places at once
 * ------------------------------------------------------------------ */

// Depth is what stops four cards on a grid from reading as a template: each
// stack sits on its own plane, moves at its own speed and blurs accordingly.
const SOURCES = [
  {label: 'Hojas', x: 8, y: 12, depth: 1, drift: {x: 232, y: 168}},
  {label: 'Documentos', x: 430, y: 0, depth: 0.72, drift: {x: -196, y: 190}},
  {label: 'Mensajes', x: 26, y: 318, depth: 0.86, drift: {x: 258, y: -140}},
  {label: 'Tareas', x: 452, y: 330, depth: 1, drift: {x: -168, y: -178}},
];

export const AentsScatteredSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // Each source keeps emitting for the whole scene: the work does not stop
  // arriving because the viewer already understood it.
  const emission = (index: number, offset = 0) => (p * 1.9 + index * 0.23 + offset) % 1;
  const turn = p * 640;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="HOY" title="Cada parte en otro lado">
      <div style={{position: 'relative', height: STAGE.height, marginTop: 24}}>
        <Halo color={`${tokens.alert}3D`} size={520} x={STAGE.width / 2} y={250} strength={0.5} />

        <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} width="100%" height={STAGE.height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {SOURCES.map((source, index) => {
            const from = {x: source.x + 150, y: source.y + 90};
            const to = {x: from.x + source.drift.x, y: from.y + source.drift.y};
            return (
              <Trace
                key={source.label}
                from={from}
                to={to}
                progress={emission(index)}
                color={`${tokens.alert}99`}
                width={3}
              />
            );
          })}
          {[
            [SOURCES[0], SOURCES[3]],
            [SOURCES[1], SOURCES[2]],
          ].map(([a, b], index) => (
            <path
              key={a.label + b.label}
              d={`M${a.x + 150} ${a.y + 90} Q${STAGE.width / 2} ${250 + index * 90} ${b.x + 150} ${b.y + 90}`}
              fill="none"
              stroke={tokens.alert}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - glide(p, 0.34 + index * 0.12, 0.72 + index * 0.12)}
              opacity={0.55}
            />
          ))}
        </svg>

        {SOURCES.map((source, index) => {
          const appear = p >= stagger(index, 0.08) ? land(p, stagger(index, 0.08), 0.3 + stagger(index, 0.08)) : 0;
          const isTask = source.label === 'Tareas';
          // Parallax: the near stacks travel further than the far ones.
          const parallax = p * 16 * source.depth;
          return (
            <div
              key={source.label}
              style={{
                position: 'absolute',
                left: source.x,
                top: source.y,
                width: 300,
                height: 182,
                boxSizing: 'border-box',
                padding: '20px 22px',
                borderRadius: 26,
                ...glass(tokens, source.depth),
                borderColor: isTask ? `${tokens.alert}80` : undefined,
                opacity: appear,
                filter: source.depth < 0.8 ? 'blur(.6px)' : 'none',
                transform: `translate(${-parallax}px, ${parallax * 0.4}px) scale(${(0.9 + appear * 0.1) * (0.94 + source.depth * 0.06)})`,
              }}
            >
              <BoxedText text={source.label} width={256} max={30} min={20} style={{fontWeight: 800}} />
              {isTask ? (
                <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 14}}>
                  <svg width={56} height={56} viewBox="0 0 54 54" style={{transform: `rotate(${turn}deg)`}}>
                    <path d="M27 7a20 20 0 1 1-14.1 5.9" fill="none" stroke={tokens.alert} strokeWidth={5} strokeLinecap="round" />
                    <path d="M12 4v11h11" fill="none" stroke={tokens.alert} strokeWidth={5} strokeLinecap="round" />
                  </svg>
                  <span style={{fontSize: 21, fontWeight: 700, color: 'rgba(255,255,255,.66)'}}>otra vez</span>
                </div>
              ) : (
                <div style={{marginTop: 20, display: 'grid', gap: 9}}>
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      style={{
                        height: 12,
                        width: `${88 - row * 18}%`,
                        borderRadius: 99,
                        background: 'rgba(255,255,255,.16)',
                        opacity: 0.5 + Math.abs(Math.sin((p * 3 + row * 0.4 + index) * Math.PI)) * 0.5,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* The piece that leaves each stack, still travelling when the scene cuts. */}
        {SOURCES.map((source, index) =>
          [0, 0.5].map((offset) => {
            const progress = emission(index, offset);
            return (
              <div
                key={`${source.label}-${offset}`}
                style={{
                  position: 'absolute',
                  left: source.x + 128 + source.drift.x * progress,
                  top: source.y + 74 + source.drift.y * progress,
                  width: 60,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.2)',
                  border: `2px solid ${tokens.soft}80`,
                  boxShadow: `0 10px 24px rgba(0,0,0,.4)`,
                  opacity: Math.sin(progress * Math.PI) * 0.9,
                  transform: `rotate(${progress * 26 - 13}deg) scale(${0.8 + Math.sin(progress * Math.PI) * 0.25})`,
                }}
              />
            );
          }),
        )}
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 3 · The tools exist. The connection does not.
 * ------------------------------------------------------------------ */

const ISLANDS = [
  {label: 'Hojas', x: 78, y: 26},
  {label: 'Documentos', x: 448, y: 26},
  {label: 'Mensajes', x: 78, y: 330},
  {label: 'Tareas', x: 448, y: 330},
];

export const AentsDisconnectedSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName, brandTile}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The pull-back is the argument: close up each tool looks fine, and only the
  // wider frame shows that nothing joins them. It runs for the whole scene.
  const pullBack = 1.2 - glide(p, 0, 1) * 0.2;
  // A spark that sets off and dies before it arrives, twice, until the mark
  // lands. Failure has to be seen failing.
  const attempt = (p * 2.4) % 1;
  const arrived = p >= 0.5 ? land(p, 0.5, 0.72) : 0;
  const centre = {x: STAGE.width / 2, y: 250};
  const tile = mark(brandTile);
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="LA TECNOLOGÍA YA ESTÁ" title="Lo que falta es la conexión">
      <div style={{position: 'relative', height: STAGE.height, marginTop: 24, transform: `scale(${pullBack})`, transformOrigin: '50% 46%'}}>
        <Halo color={`${tokens.accent}66`} size={620} x={centre.x} y={centre.y} strength={arrived * 0.8} />

        <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} width="100%" height={STAGE.height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {ISLANDS.map((island, index) => {
            const from = {x: island.x + 102, y: island.y + 62};
            const failing = Math.min(attempt * 1.6, 0.42);
            const connected = arrived > 0 ? glide(p, 0.56 + stagger(index, 0.07), 0.9 + stagger(index, 0.07)) : 0;
            const flowing = metronome(p, 3.4, index * 0.25);
            return (
              <g key={island.label}>
                <path
                  d={`M${from.x} ${from.y} L${centre.x} ${centre.y}`}
                  fill="none"
                  stroke={`${tokens.alert}66`}
                  strokeWidth={3}
                  strokeDasharray="10 16"
                  opacity={(1 - arrived) * 0.8}
                />
                {arrived < 0.4 ? (
                  <circle
                    cx={from.x + (centre.x - from.x) * failing}
                    cy={from.y + (centre.y - from.y) * failing}
                    r={5}
                    fill={tokens.alert}
                    opacity={(1 - attempt) * (1 - arrived)}
                  />
                ) : null}
                <Trace from={from} to={centre} progress={connected} color={tokens.soft} width={5} />
                {/* Once a link exists it carries something. A finished line that
                    just sits there says the tools are joined and nothing is
                    happening, which is the opposite of the claim, and it is what
                    left the second half of this scene measured as still. */}
                {connected >= 1 ? (
                  <circle
                    cx={from.x + (centre.x - from.x) * flowing}
                    cy={from.y + (centre.y - from.y) * flowing}
                    r={7}
                    fill={tokens.confirm}
                    opacity={Math.sin(flowing * Math.PI)}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {ISLANDS.map((island, index) => {
          const appear = p >= stagger(index, 0.05) ? land(p, stagger(index, 0.05), 0.26 + stagger(index, 0.05)) : 0;
          return (
            <div
              key={island.label}
              style={{
                position: 'absolute',
                left: island.x,
                top: island.y,
                width: 208,
                height: 124,
                boxSizing: 'border-box',
                padding: '16px 18px',
                borderRadius: 24,
                ...glass(tokens, 0.9),
                opacity: appear,
                transform: `scale(${0.92 + appear * 0.08})`,
              }}
            >
              <BoxedText text={island.label} width={172} max={26} min={18} style={{fontWeight: 800}} />
              <div style={{marginTop: 14, height: 10, width: '70%', borderRadius: 99, background: 'rgba(255,255,255,.16)'}} />
              <div style={{marginTop: 8, height: 10, width: '45%', borderRadius: 99, background: 'rgba(255,255,255,.1)'}} />
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: centre.x - 76,
            top: centre.y - 76,
            width: 152,
            height: 152,
            borderRadius: 46,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(150deg, ${tokens.accent}, #33268A)`,
            boxShadow: `0 28px 84px ${tokens.accent}8C, inset 0 3px 0 rgba(255,255,255,.28)`,
            opacity: Math.min(1, arrived * 1.6),
            transform: `scale(${0.5 + arrived * 0.5}) rotate(${(1 - arrived) * -14}deg)`,
          }}
        >
          {tile ? <Img src={tile} style={{width: 102, height: 102, borderRadius: 30}} /> : null}
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 4 · Before building anything, read how the business works
 * ------------------------------------------------------------------ */

const FLOW = [
  {label: 'Entra el pedido', top: 0},
  {label: 'Alguien decide', top: 124},
  {label: 'Tu equipo ejecuta', top: 248},
  {label: 'Resultado', top: 372},
];

export const AentsUnderstandSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The reading travels the whole flow and settles on the step that jams. The
  // claim is that Aents starts by understanding, so the scene has to be seen
  // understanding something specific rather than nodding at a diagram.
  const reading = glide(p, 0.08, 0.7) * 3;
  const found = p >= 0.7 ? land(p, 0.7, 0.92) : 0;
  const pulse = Math.abs(Math.sin(p * 5 * Math.PI));
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="PRIMERO ESCUCHAMOS" title="¿Cómo funciona hoy?">
      <div style={{position: 'relative', height: STAGE.height, marginTop: 22}}>
        <Halo color={`${tokens.accent}59`} size={520} x={230} y={40 + reading * 124} strength={0.6} />

        {FLOW.map((step, index) => {
          const appear = p >= stagger(index, 0.07) ? land(p, stagger(index, 0.07), 0.28 + stagger(index, 0.07)) : 0;
          const jam = index === 1 ? found : 0;
          const read = Math.max(0, 1 - Math.abs(reading - index) * 1.4);
          return (
            <React.Fragment key={step.label}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: step.top,
                  width: 470,
                  height: 104,
                  boxSizing: 'border-box',
                  padding: '0 26px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 26,
                  ...glass(tokens, 0.8 + read * 0.6),
                  borderColor: jam > 0.4 ? `${tokens.alert}` : `${tokens.soft}${read > 0.5 ? '99' : '33'}`,
                  opacity: appear,
                  transform: `translateX(${(1 - appear) * -26}px) scale(${1 + read * 0.02})`,
                }}
              >
                <BoxedText text={step.label} width={418} max={31} min={22} style={{fontWeight: 800, opacity: 0.6 + read * 0.4}} />
              </div>
              {index < FLOW.length - 1 ? (
                <svg
                  width={30}
                  height={24}
                  viewBox="0 0 30 24"
                  style={{position: 'absolute', left: 220, top: step.top + 102, opacity: appear * 0.85}}
                >
                  <path d={`M15 0V${14 + Math.sin((p * 4 + index) * Math.PI) * 3}`} stroke={tokens.soft} strokeWidth={4} strokeLinecap="round" />
                  <path d="M9 12l6 8 6-8" fill="none" stroke={tokens.soft} strokeWidth={4} strokeLinecap="round" />
                </svg>
              ) : null}
            </React.Fragment>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: 502,
            top: 124,
            width: 250,
            padding: '20px 22px',
            borderRadius: 24,
            background: `${tokens.alert}1A`,
            border: `2px solid ${tokens.alert}`,
            boxShadow: `0 22px 60px rgba(0,0,0,.45), 0 0 ${26 + pulse * 22}px ${tokens.alert}4D`,
            opacity: Math.min(1, found * 1.4),
            transform: `translateX(${(1 - found) * 40}px) rotate(${(1 - found) * 4}deg)`,
          }}
        >
          <BoxedText text="Aquí se traba" width={206} max={28} min={20} style={{fontWeight: 800, color: tokens.alert}} />
          <div style={{marginTop: 8, fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,.72)'}}>Eso es lo que se arregla</div>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
/* ------------------------------------------------------------------ *
 * 5 · One need, and the shape of technology it actually asks for
 *
 * Five cards, all the same size, on a grid with gaps wide enough that none of
 * them can reach another. The version this replaces put four cards on an
 * ellipse around a smaller fifth and turned the ellipse slowly: at the sizes
 * involved every outer card overlapped the centre by about 28 x 11 px, and
 * because the ring was turning the overlap appeared and disappeared. Nothing
 * asked for it, which is exactly what the standard means by an element touching
 * another by accident.
 *
 * The life the spin used to provide comes from the links instead, which is
 * where it belongs: a finished connection carries something.
 * ------------------------------------------------------------------ */

/** One size for every card in this scene. A choice is not more important for
 *  being drawn bigger, and unequal boxes on a grid read as a mistake. */
const CHOICE = {width: 216, height: 96};

/** The need sits in the middle; the gaps around it are 48 px on every side. */
const NEED = {x: 268, y: 152};

const SOLUTIONS = [
  {label: 'App móvil', kind: 'phone', x: 4, y: 8,
   link: {from: {x: 220, y: 104}, to: {x: 268, y: 152}}},
  {label: 'Plataforma web', kind: 'browser', x: 532, y: 8,
   link: {from: {x: 532, y: 104}, to: {x: 484, y: 152}}},
  {label: 'Sistema', kind: 'panel', x: 4, y: 296,
   link: {from: {x: 220, y: 296}, to: {x: 268, y: 248}}},
  {label: 'Automatización', kind: 'flow', x: 532, y: 296,
   link: {from: {x: 532, y: 296}, to: {x: 484, y: 248}}},
] as const;

/** The four shapes, drawn as objects rather than named in a list. */
const SolutionArt: React.FC<{kind: string; color: string; live: number}> = ({kind, color, live}) => {
  if (kind === 'phone') {
    return (
      <svg width={64} height={64} viewBox="0 0 96 96">
        <rect x="28" y="8" width="40" height="80" rx="10" fill="none" stroke={color} strokeWidth={5} />
        <rect x="36" y="22" width="24" height="6" rx="3" fill={color} opacity={live} />
        <rect x="36" y="36" width={24 * live} height="6" rx="3" fill={color} opacity={0.8} />
        <circle cx="48" cy="70" r="5" fill={color} opacity={live} />
      </svg>
    );
  }
  if (kind === 'browser') {
    return (
      <svg width={64} height={64} viewBox="0 0 96 96">
        <rect x="8" y="20" width="80" height="58" rx="9" fill="none" stroke={color} strokeWidth={5} />
        <path d="M8 36H88" stroke={color} strokeWidth={5} />
        <rect x="18" y="46" width={36 * live} height="6" rx="3" fill={color} />
        <rect x="18" y="58" width={54 * live} height="6" rx="3" fill={color} opacity={0.65} />
      </svg>
    );
  }
  if (kind === 'panel') {
    return (
      <svg width={64} height={64} viewBox="0 0 96 96">
        <rect x="8" y="16" width="80" height="66" rx="9" fill="none" stroke={color} strokeWidth={5} />
        <rect x="20" y={68 - 18 * live} width="12" height={18 * live + 4} rx="3" fill={color} />
        <rect x="42" y={68 - 28 * live} width="12" height={28 * live + 4} rx="3" fill={color} />
        <rect x="64" y={68 - 36 * live} width="12" height={36 * live + 4} rx="3" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={64} height={64} viewBox="0 0 96 96">
      <circle cx="22" cy="48" r="12" fill="none" stroke={color} strokeWidth={5} />
      <circle cx="74" cy="48" r="12" fill="none" stroke={color} strokeWidth={5} />
      <path d="M34 48H62" stroke={color} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - live} />
      <circle cx={34 + 28 * live} cy="48" r="5" fill={color} opacity={live > 0.05 && live < 0.98 ? 1 : 0} />
    </svg>
  );
};

export const AentsSolutionsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const selected = Math.min(3, Math.floor(glide(p, 0.06, 0.84) * 4));
  const joined = glide(p, 0.8, 1);
  // Once the four are linked the scene used to hold, and the review measured
  // 38 % of the shot as one picture. A finished system is a running system:
  // the whole set answers on a slow beat, and the need breathes with it.
  const running = joined >= 1 ? Math.sin(metronome(p, 2.4) * Math.PI) : 0;
  const centre = {x: NEED.x + CHOICE.width / 2, y: NEED.y + CHOICE.height / 2};
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="UNA NECESIDAD" title="La tecnología que le toca">
      <div style={{position: 'relative', height: STAGE.height, marginTop: 18}}>
        <Halo color={`${tokens.accent}80`} size={560} x={centre.x} y={centre.y} strength={0.6 + joined * 0.3} />

        <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} width="100%" height={STAGE.height} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {SOLUTIONS.map((solution, index) => {
            const live = index <= selected ? glide(p, 0.1 + index * 0.18, 0.32 + index * 0.18) : 0;
            // A link that is finished keeps carrying work, staggered so the four
            // of them read as one system running rather than four drawn lines.
            const flowing = metronome(p, 3.2, index * 0.22);
            const {from, to} = solution.link;
            return (
              <g key={solution.label}>
                <Trace
                  from={from}
                  to={to}
                  progress={live}
                  color={index === selected ? tokens.accent : `${tokens.soft}B3`}
                  width={index === selected ? 6 : 4}
                  head={index === selected}
                />
                {live >= 1 ? (
                  <circle
                    cx={from.x + (to.x - from.x) * flowing}
                    cy={from.y + (to.y - from.y) * flowing}
                    r={10}
                    fill={tokens.confirm}
                    opacity={Math.sin(flowing * Math.PI)}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: NEED.x,
            top: NEED.y,
            width: CHOICE.width,
            height: CHOICE.height,
            boxSizing: 'border-box',
            borderRadius: 26,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            ...lit(tokens),
            opacity: enter,
            boxShadow: `0 26px ${64 + running * 46}px ${tokens.accent}${running > 0.5 ? '99' : '66'}`,
          }}
        >
          <BoxedText text="Tu necesidad" width={CHOICE.width - 40} max={27} min={19} lines={2} style={{fontWeight: 800}} />
        </div>

        {SOLUTIONS.map((solution, index) => {
          const appear = p >= stagger(index, 0.05) ? land(p, stagger(index, 0.05), 0.26 + stagger(index, 0.05)) : 0;
          const active = index === selected;
          const live = index <= selected ? glide(p, 0.1 + index * 0.18, 0.34 + index * 0.18) : 0;
          return (
            <div
              key={solution.label}
              style={{
                position: 'absolute',
                left: solution.x,
                top: solution.y,
                width: CHOICE.width,
                height: CHOICE.height,
                boxSizing: 'border-box',
                padding: '0 14px',
                borderRadius: 26,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                ...(active ? lit(tokens) : glass(tokens, 0.9)),
                borderColor: live >= 1 ? `${tokens.confirm}${running > 0.5 ? 'B3' : '4D'}` : undefined,
                opacity: appear,
                // The chosen one is signalled by light, never by size: a card
                // that grows when it is picked is what made these look unequal.
                transform: `translateY(${(1 - appear) * 14}px)`,
              }}
            >
              <SolutionArt kind={solution.kind} color={palette.white} live={live} />
              <BoxedText text={solution.label} width={114} max={24} min={16} lines={2} style={{fontWeight: 800}} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
/* ------------------------------------------------------------------ *
 * 6 · The same product crossing the four stages
 *
 * The claim is «estrategia, diseño, desarrollo, y no te soltamos hasta el
 * lanzamiento», and a claim about four stages has to show four different
 * things. The version this replaces showed the same grey rectangle at every
 * stage with its opacity nudged, which is why it read as random boxes: nothing
 * in frame said what happens in a stage, only that a stage had changed.
 *
 * Now each one draws what actually comes out of it — a flow that is understood,
 * a layout that is decided, a product that works, and the product in the hands
 * it was built for — and it is the same object all the way through, turning
 * over between stages instead of cross-fading.
 * ------------------------------------------------------------------ */

const STAGES = [
  {label: 'Estrategia', note: 'Entendemos el flujo'},
  {label: 'Diseño', note: 'Decidimos la forma'},
  {label: 'Desarrollo', note: 'Lo construimos'},
  {label: 'Lanzamiento', note: 'Lo usa tu equipo'},
] as const;

const OBJECT = {width: 440, height: 320};

/** Estrategia: the business's own flow, read and drawn rather than assumed. */
const StageStrategy: React.FC<{tokens: BrandTokens; progress: number}> = ({tokens, progress}) => {
  const nodes = [
    {x: 40, y: 40, label: 'Entra'},
    {x: 168, y: 130, label: 'Se decide'},
    {x: 296, y: 220, label: 'Sale'},
  ];
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${OBJECT.width} ${OBJECT.height}`}>
      {[0, 1, 2, 3, 4].map((line) => (
        <path key={line} d={`M0 ${36 + line * 62}H440`} stroke={`${tokens.soft}26`} strokeWidth={2} />
      ))}
      {nodes.slice(0, -1).map((node, index) => {
        const next = nodes[index + 1];
        const drawn = beat(progress, 0.25 + index * 0.22, 0.6 + index * 0.22);
        return (
          <Trace
            key={node.label}
            from={{x: node.x + 104, y: node.y + 26}}
            to={{x: next.x, y: next.y + 26}}
            progress={drawn}
            color={tokens.soft}
            width={4}
          />
        );
      })}
      {nodes.map((node, index) => {
        const arrived = beat(progress, index * 0.2, 0.3 + index * 0.2);
        return (
          <g key={node.label} opacity={arrived}>
            <rect
              x={node.x}
              y={node.y}
              width={104}
              height={52}
              rx={12}
              fill="rgba(255,255,255,.05)"
              stroke={tokens.soft}
              strokeWidth={3}
              strokeDasharray="9 7"
            />
            <text x={node.x + 52} y={node.y + 33} textAnchor="middle" fontFamily="inherit" fontSize="22" fontWeight="800" fill="#FFF">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** Diseño: the flow becomes a layout. Still grey — nothing is built yet. */
const StageDesign: React.FC<{tokens: BrandTokens; progress: number}> = ({tokens, progress}) => {
  const blocks = [
    {x: 24, y: 24, width: 392, height: 44},
    {x: 24, y: 84, width: 108, height: 212},
    {x: 148, y: 84, width: 268, height: 96},
    {x: 148, y: 196, width: 268, height: 100},
  ];
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${OBJECT.width} ${OBJECT.height}`}>
      {blocks.map((block, index) => {
        const placed = land(progress, index * 0.14, 0.4 + index * 0.14);
        return (
          <rect
            key={index}
            x={block.x}
            y={block.y + (1 - placed) * 18}
            width={block.width}
            height={block.height}
            rx={12}
            fill="rgba(255,255,255,.07)"
            stroke={`${tokens.soft}80`}
            strokeWidth={3}
            strokeDasharray="10 8"
            opacity={placed}
          />
        );
      })}
    </svg>
  );
};

/** Desarrollo: the same layout, built. Real chrome, one active destination,
 *  rows that resolve — the interface rules come from `interface-kit`. */
const StageBuild: React.FC<{tokens: BrandTokens; progress: number}> = ({tokens, progress}) => (
  <div style={{position: 'absolute', inset: 0}}>
    <div
      style={{
        position: 'absolute',
        left: 24,
        top: 24,
        width: 392,
        height: 44,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${tokens.accent}, #4C39C4)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2)',
        opacity: Math.min(1, progress * 3),
      }}
    />
    <div style={{position: 'absolute', left: 24, top: 84, width: 108, height: 212}}>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          style={{
            height: 40,
            marginBottom: 10,
            borderRadius: 10,
            background: item === 0 ? `${tokens.accent}3D` : 'rgba(255,255,255,.08)',
            boxShadow: item === 0 ? `inset 3px 0 0 ${tokens.accent}` : 'none',
            opacity: beat(progress, 0.1 + item * 0.08, 0.4 + item * 0.08),
          }}
        />
      ))}
    </div>
    {[0, 1, 2, 3].map((row) => {
      const built = beat(progress, 0.2 + row * 0.12, 0.55 + row * 0.12);
      return (
        <div
          key={row}
          style={{
            position: 'absolute',
            left: 148,
            top: 84 + row * 56,
            width: 268,
            height: 44,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 14px',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,.1)',
            opacity: built,
            transform: `translateX(${(1 - built) * 20}px)`,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 99,
              background: built >= 1 ? tokens.confirm : tokens.alert,
              boxShadow: `0 0 12px ${built >= 1 ? tokens.confirm : tokens.alert}`,
            }}
          />
          <span style={{flex: 1, height: 10, borderRadius: 99, background: 'rgba(255,255,255,.24)'}} />
        </div>
      );
    })}
  </div>
);

/** Lanzamiento: the same product, in use, on the two screens it was built for. */
const StageLaunch: React.FC<{tokens: BrandTokens; progress: number}> = ({tokens, progress}) => {
  const desktop = land(progress, 0.05, 0.45);
  const phone = land(progress, 0.28, 0.7);
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24}}>
      <div
        style={{
          width: 244,
          height: 168,
          borderRadius: 16,
          border: `4px solid ${tokens.confirm}`,
          background: 'rgba(255,255,255,.06)',
          padding: 14,
          boxSizing: 'border-box',
          opacity: Math.min(1, desktop * 1.6),
          transform: `translateY(${(1 - desktop) * 20}px)`,
          boxShadow: `0 18px 48px ${tokens.confirm}3D`,
        }}
      >
        <div style={{height: 12, width: '58%', borderRadius: 99, background: tokens.confirm}} />
        <div style={{marginTop: 12, height: 10, width: '86%', borderRadius: 99, background: 'rgba(255,255,255,.3)'}} />
        <div style={{marginTop: 10, height: 10, width: '70%', borderRadius: 99, background: 'rgba(255,255,255,.22)'}} />
        <div style={{marginTop: 18, height: 34, width: 118, borderRadius: 10, background: `${tokens.confirm}CC`}} />
      </div>
      <div
        style={{
          width: 104,
          height: 190,
          borderRadius: 20,
          border: `4px solid ${tokens.confirm}`,
          background: 'rgba(255,255,255,.06)',
          padding: 12,
          boxSizing: 'border-box',
          opacity: Math.min(1, phone * 1.6),
          transform: `translateY(${(1 - phone) * 24}px)`,
          boxShadow: `0 18px 48px ${tokens.confirm}3D`,
        }}
      >
        <div style={{height: 10, width: '70%', borderRadius: 99, background: tokens.confirm}} />
        <div style={{marginTop: 12, height: 9, width: '90%', borderRadius: 99, background: 'rgba(255,255,255,.3)'}} />
        <div style={{marginTop: 9, height: 9, width: '64%', borderRadius: 99, background: 'rgba(255,255,255,.22)'}} />
        <div style={{marginTop: 18, height: 30, borderRadius: 10, background: `${tokens.confirm}CC`}} />
      </div>
    </div>
  );
};

export const AentsStagesSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // One travelling progress, not four independent reveals: the point of the
  // scene is that it is the same product all the way through.
  const march = glide(p, 0.03, 0.97) * 4;
  const stage = Math.min(3, Math.floor(march));
  const inside = march - stage;
  // The turn between stages, so the object changes state on a movement instead
  // of a cross-fade: it tips, and comes back as the next thing.
  const turning = Math.sin(Math.min(1, inside * 4.2) * Math.PI) * Math.sin(Math.PI * Math.min(1, inside * 4.2));
  const faces = [StageStrategy, StageDesign, StageBuild, StageLaunch];
  const Face = faces[stage];
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="TÚ CONOCES EL PROBLEMA" title="Nosotros lo llevamos hasta el final">
      <div style={{position: 'relative', height: STAGE.height, marginTop: 20}}>
        <Halo color={`${tokens.accent}66`} size={620} x={STAGE.width / 2} y={180} strength={0.5 + stage * 0.12} />

        <div
          style={{
            position: 'absolute',
            left: STAGE.width / 2 - OBJECT.width / 2,
            top: 0,
            width: OBJECT.width,
            height: OBJECT.height,
            borderRadius: 30,
            overflow: 'hidden',
            ...glass(tokens, 1.3),
            transform: `perspective(1400px) rotateY(${turning * 12}deg) translateY(${Math.sin(p * Math.PI) * -12}px)`,
          }}
        >
          {/* A build light that crosses the object without pause, so the stage
              being worked on is never a parked rectangle. */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 200,
              left: -200 + ((p * 2.2) % 1) * 640,
              background: `linear-gradient(90deg,transparent,${tokens.soft}33,transparent)`,
            }}
          />
          {/* The face fills faster than the stage advances, and the turn only
              dims it. Fading fully to nothing at the hand-over left the object
              blank for a beat, which reads as a glitch rather than a change. */}
          <div style={{position: 'absolute', inset: 0, opacity: 1 - turning * 0.55}}>
            <Face tokens={tokens} progress={Math.min(1, inside * 1.5)} />
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, top: 368}}>
          <div style={{height: 8, borderRadius: 99, background: 'rgba(255,255,255,.1)', overflow: 'hidden'}}>
            <div
              style={{
                width: `${(march / 4) * 100}%`,
                height: '100%',
                borderRadius: 99,
                background: `linear-gradient(90deg, ${tokens.accent}, ${tokens.soft})`,
                boxShadow: `0 0 22px ${tokens.accent}`,
              }}
            />
          </div>
          <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10}}>
            {STAGES.map((item, index) => (
              <div
                key={item.label}
                style={{
                  padding: '10px 6px',
                  borderRadius: 16,
                  textAlign: 'center',
                  background: index === stage ? `${tokens.accent}38` : 'transparent',
                  border: `2px solid ${index <= stage ? tokens.soft : 'rgba(255,255,255,.12)'}`,
                }}
              >
                <BoxedText
                  text={item.label}
                  width={158}
                  max={23}
                  min={15}
                  style={{fontWeight: 800, opacity: index <= stage ? 1 : 0.45, textAlign: 'center'}}
                />
                {/* What that stage actually produces, so the rail names a step
                    instead of labelling a box. */}
                <div style={{marginTop: 4, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.6)', opacity: index === stage ? 1 : 0}}>
                  {item.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 7 · Generic software does not fit a business. It is the other way round.
 * ------------------------------------------------------------------ */

/** The shape of a company's process: the hole everything has to fill. */
const SOCKET = 'M40 30 H250 V110 H330 V210 H150 V300 H40 Z';

export const AentsCustomFitSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // Two attempts, then the answer. The generic block has to fail visibly —
  // twice, against the same edge — or the closing fit reads as decoration.
  const drawn = glide(p, 0.02, 0.24);
  const approach = glide(p, 0.08, 0.3);
  const knock = Math.max(0, Math.sin(beat(p, 0.24, 0.46) * Math.PI * 4)) * 30;
  const rejected = glide(p, 0.42, 0.52);
  // The block is at its stop exactly when the knock is at its extreme, so the
  // flash below marks contact rather than decorating the shake.
  const impact = knock / 30;
  const build = p >= 0.5 ? 1 : 0;
  const pieces = [
    {d: 'M40 30 H250 V110 H40 Z', at: 0.52, from: -160},
    {d: 'M40 110 H330 V210 H40 Z', at: 0.66, from: 190},
    {d: 'M40 210 H150 V300 H40 Z', at: 0.8, from: -140},
  ];
  const sealed = glide(p, 0.9, 1);
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="NO AL REVÉS" title="El software se adapta a ti">
      <div style={{position: 'relative', height: STAGE.height, marginTop: 16}}>
        <Halo color={`${tokens.accent}6B`} size={560} x={330} y={190} strength={0.4 + sealed * 0.5} />

        <svg
          viewBox={`0 0 ${STAGE.width} 350`}
          width="100%"
          height={350}
          style={{position: 'absolute', left: 0, top: 6, overflow: 'visible'}}
        >
          {/* The whole assembly breathes across the scene: without it the socket
              is a parked drawing between one piece landing and the next. */}
          {/* The socket flexes when the block hits it. A collision where only
              the small object moves is a collision with a wall, not with the
              shape of a business — and it left this half measured as still. */}
          <g transform={`translate(${170 - p * 22 - impact * 9} ${8 + Math.sin(p * Math.PI) * -10}) rotate(${impact * -1.1} 185 165)`}>
            <path
              d={SOCKET}
              fill="rgba(255,255,255,.04)"
              stroke={`${tokens.soft}${build ? '99' : '66'}`}
              strokeWidth={4}
              strokeDasharray="14 12"
              opacity={drawn}
            />
            {/* The shape of the company's process is measured out before
                anything is tried against it. The scene used to open on a socket
                that was simply there, and its first half held so still that the
                review reported half the shot as one picture. */}
            {drawn < 1 ? (
              <path
                d={SOCKET}
                fill="none"
                stroke={tokens.soft}
                strokeWidth={6}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawn}
              />
            ) : null}
            {pieces.map((piece, index) => {
              const drawn = p >= piece.at ? land(p, piece.at, piece.at + 0.16) : 0;
              return (
                <path
                  key={piece.d}
                  d={piece.d}
                  fill={index === 1 ? tokens.accent : `${tokens.accent}CC`}
                  stroke={tokens.soft}
                  strokeWidth={3}
                  opacity={Math.min(1, drawn * 1.6)}
                  transform={`translate(${(1 - drawn) * piece.from} ${(1 - drawn) * -26})`}
                />
              );
            })}
            <path
              d={SOCKET}
              fill="none"
              stroke={tokens.confirm}
              strokeWidth={5}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - sealed}
              opacity={sealed}
            />
            {/* The finished outline keeps a light running round it. The arc
                closes before the scene does, on purpose, but «closed» is not the
                same as «stopped»: without this the last stretch of the take is
                the same picture, and the review measured it as such. */}
            {sealed >= 1 ? (
              <path
                d={SOCKET}
                fill="none"
                stroke={tokens.confirm}
                strokeWidth={7}
                pathLength={1}
                strokeDasharray="0.12 0.88"
                strokeDashoffset={-metronome(p, 2.2)}
                opacity={0.85}
              />
            ) : null}
          </g>

          {/* Rejection happens on a movement: the block tips off the edge it
              could not enter and leaves the frame. Fading it out would hide the
              only thing this half of the scene exists to show. */}
          {impact > 0.05 && rejected < 0.5 ? (
            <circle
              cx={414 - approach * 190 + knock}
              cy={171}
              r={10 + impact * 26}
              fill={tokens.alert}
              opacity={impact * 0.7}
            />
          ) : null}

          <g
            transform={
              `translate(${600 - approach * 190 + knock} ${96 + rejected * 320}) ` +
              `rotate(${rejected * 26} 93 75)`
            }
            opacity={1 - glide(p, 0.62, 0.72)}
          >
            <rect
              x="0"
              y="0"
              width="186"
              height="150"
              rx="14"
              fill={`${tokens.alert}1F`}
              stroke={tokens.alert}
              strokeWidth={4}
            />
            <text x="93" y="84" textAnchor="middle" fontSize="27" fontWeight="800" fill={tokens.alert} fontFamily="inherit">
              GENÉRICO
            </text>
          </g>
        </svg>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 386,
            display: 'flex',
            justifyContent: 'center',
            gap: 14,
            alignItems: 'center',
            opacity: sealed,
            transform: `translateY(${(1 - sealed) * 18}px)`,
          }}
        >
          <b
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              display: 'grid',
              placeItems: 'center',
              background: tokens.confirm,
              color: palette.ink,
              fontSize: 26,
              boxShadow: `0 0 26px ${tokens.confirm}80`,
            }}
          >
            ✓
          </b>
          <BoxedText text="Construido alrededor de tu proceso" width={PANEL_WIDTH - 120} max={31} min={22} style={{fontWeight: 800}} />
        </div>
      </div>
    </Panel>
  );
};

/** Kept beside the arc so a future Geo piece can reuse the socket idea. */
export const CUSTOM_FIT_SOCKET = SOCKET;
export const SYSTEM_SIDE_CROP = sideCrop;
