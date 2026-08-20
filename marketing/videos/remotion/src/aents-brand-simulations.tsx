import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useVideoConfig} from 'remotion';
import {
  BoxedText,
  Field,
  Halo,
  KineticText,
  PANEL_WIDTH,
  Panel,
  Reveal,
  Sweep,
  Trace,
  beat,
  figures,
  glass,
  glide,
  land,
  lit,
  pulse,
  settle,
  stagger,
  tokensFor,
} from './system-kit';
import {palette, sideCrop} from './theme';
import type {SimulationProps} from './simulations';

/**
 * The brand story of Aents: a business that grows until nobody can hold it by
 * hand, the system that takes the work over, and where that system can go.
 *
 * These are drawn illustrations, never screenshots. The panels they show are
 * the kind of system Aents builds for a client — management, roles and flows —
 * so every figure inside them belongs to an invented business and carries the
 * `EJEMPLO` badge while it is on screen. Nothing here states a fact about
 * Aents, its clients or a market.
 *
 * The choreography follows `animation-standard.md` §10 bis: arrivals land with
 * weight, groups enter staggered, subjects sit in front of their own light,
 * surfaces catch light from above, text is uncovered instead of faded, links
 * travel with a head, and every scene carries a continuous push. What the
 * scenes say did not change when that was applied — only how they move.
 */

const alert = '#F59E0B';

/* ------------------------------------------------------------------ *
 * 1 · The business grows and the channels tangle
 * ------------------------------------------------------------------ */

// Where a client's day actually arrives from. The wording is the one Aents
// already uses in its own copy — documents, sheets and messages — so the piece
// does not put a third-party product name on screen as a category.
const CHANNELS = [
  {label: 'WhatsApp', angle: -150},
  {label: 'Hojas', angle: -90},
  {label: 'Correos', angle: -30},
  {label: 'Facturas', angle: 30},
  {label: 'Pedidos', angle: 90},
  {label: 'Cobros', angle: 150},
];

const RING = {cx: PANEL_WIDTH / 2, cy: 258, rx: 300, ry: 203};

const channelAt = (angle: number, spin = 0) => ({
  x: RING.cx + RING.rx * Math.cos(((angle + spin) * Math.PI) / 180),
  y: RING.cy + RING.ry * Math.sin(((angle + spin) * Math.PI) / 180),
});

// The crossings that appear once the volume is up: never neighbours, so the
// web reads as tangled rather than as a decorative polygon.
const CROSSINGS: Array<[number, number]> = [
  [0, 3],
  [1, 4],
  [2, 5],
  [0, 2],
  [3, 5],
];

/**
 * The badge every invented figure lives under.
 *
 * The panels below are illustrations of a client's operation, so their counts
 * are examples in exactly the sense the brief allows: they teach what a system
 * does, they do not report anything real.
 */
const Example: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <span
    style={{
      padding: '5px 12px',
      borderRadius: 99,
      border: '2px solid rgba(255,255,255,.28)',
      color: 'rgba(255,255,255,.78)',
      fontSize: 19,
      fontWeight: 800,
      letterSpacing: '.08em',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    EJEMPLO
  </span>
);

export const AentsGrowthSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const steps = [
    {value: '47', at: 0},
    {value: '126', at: 0.3},
    {value: '384', at: 0.52},
  ];
  const current = steps.reduce((found, step) => (p >= step.at ? step : found), steps[0]);
  const pop = steps.slice(1).reduce((sum, step) => sum + pulse(p, step.at, 0.09), 0);
  const tangle = glide(p, 0.58, 0.9);
  // The ring turns for the whole scene. What the voice claims is that the work
  // keeps arriving, and a wheel that stops turning says the opposite.
  const spin = p * 14;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="TU NEGOCIO CRECE" title="Y todo llega por todos lados">
      <div style={{position: 'relative', height: 520, marginTop: 24}}>
        <Halo color={`${tokens.accent}80`} size={620} x={RING.cx} y={RING.cy} strength={0.45 + pop * 0.4} />

        <svg viewBox={`0 0 ${PANEL_WIDTH} 520`} width="100%" height="520" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {CHANNELS.map((channel, index) => {
            const point = channelAt(channel.angle, spin);
            const drawn = settle(p, 0.12 + stagger(index, 0.05), 0.34 + stagger(index, 0.05));
            return (
              <Trace
                key={channel.label}
                from={point}
                to={{x: RING.cx, y: RING.cy}}
                progress={drawn}
                color={`${tokens.soft}8C`}
                width={4}
                head={drawn < 1}
              />
            );
          })}
          {CROSSINGS.map(([from, to], index) => {
            const a = channelAt(CHANNELS[from].angle, spin);
            const b = channelAt(CHANNELS[to].angle, spin);
            const drawn = glide(p, 0.58 + stagger(index, 0.05), 0.74 + stagger(index, 0.05));
            return (
              <path
                key={`${from}-${to}`}
                d={`M${a.x} ${a.y} Q${RING.cx + (index % 2 ? 120 : -120)} ${RING.cy} ${b.x} ${b.y}`}
                fill="none"
                stroke={alert}
                strokeWidth={3}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawn}
                opacity={drawn * 0.7}
              />
            );
          })}
        </svg>

        {CHANNELS.map((channel, index) => {
          const point = channelAt(channel.angle, spin);
          const arrival = p >= stagger(index, 0.05) ? land(p, stagger(index, 0.05), 0.26 + stagger(index, 0.05)) : 0;
          // Each channel throbs when its own line reaches the middle: the work
          // does not merely exist, it keeps landing on the same desk.
          const hit = pulse(p, 0.3 + stagger(index, 0.05), 0.12);
          return (
            <div
              key={channel.label}
              style={{
                position: 'absolute',
                left: point.x - 88,
                top: point.y - 29,
                width: 176,
                height: 58,
                borderRadius: 20,
                display: 'grid',
                placeItems: 'center',
                ...glass(tokens, 0.7),
                borderColor: `${tokens.soft}${tangle > 0.4 ? '80' : '4D'}`,
                fontSize: 25,
                fontWeight: 800,
                opacity: arrival,
                transform: `scale(${(0.9 + arrival * 0.1) * (1 + hit * 0.05)})`,
              }}
            >
              {channel.label}
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: RING.cx - 132,
            top: RING.cy - 84,
            width: 264,
            height: 168,
            borderRadius: 40,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            overflow: 'hidden',
            ...lit(tokens),
            transform: `scale(${(0.92 + enter * 0.08) * (1 + pop * 0.05)})`,
          }}
        >
          <Sweep progress={p} color="rgba(255,255,255,.12)" width={140} span={264} />
          <div style={{position: 'relative'}}>
            <div style={{fontSize: 74, fontWeight: 800, lineHeight: 1, letterSpacing: '-.05em', color: accent, ...figures}}>
              {current.value}
            </div>
            <div style={{marginTop: 8, fontSize: 26, fontWeight: 800, color: 'rgba(255,255,255,.72)'}}>clientes</div>
            <Example style={{display: 'inline-block', marginTop: 12}} />
          </div>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · Everything goes up except the time to handle it
 * ------------------------------------------------------------------ */

const LOAD = [
  {label: 'CLIENTES', direction: 1, fill: 0.82},
  {label: 'DATOS', direction: 1, fill: 0.9},
  {label: 'PROCESOS', direction: 1, fill: 0.74},
  {label: 'TIEMPO', direction: -1, fill: 0.22},
];

/** The arrow that says which way a measure moved: one shape, two rotations. */
const Trend: React.FC<{direction: number; color: string; nudge: number}> = ({direction, color, nudge}) => (
  <svg
    width={26}
    height={26}
    viewBox="0 0 26 26"
    style={{transform: `rotate(${direction > 0 ? 0 : 180}deg) translateY(${-nudge * 4}px)`}}
  >
    <path d="M13 3 L24 20 H2 Z" fill={color} />
  </svg>
);

export const AentsOverloadSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The queue stops the moment the error lands: a lane that keeps sliding
  // underneath a failure reads as decoration instead of as a consequence.
  const failed = p >= 0.76;
  const queue = glide(Math.min(p, 0.76), 0.42, 0.76);
  const stamp = spring({frame: frame - span * 0.78, fps, config: {damping: 12, stiffness: 200}});
  const breathe = Math.sin(p * Math.PI * 3);
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="MÁS DE TODO" title="Y una sola persona sosteniéndolo">
      <div style={{position: 'relative', height: 520, marginTop: 24}}>
        <Halo color={`${alert}${failed ? '80' : '33'}`} size={640} x={PANEL_WIDTH * 0.72} y={430} strength={failed ? 0.7 : 0.3} />

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22}}>
          {LOAD.map((measure, index) => {
            const arrival = p >= stagger(index, 0.06) ? land(p, stagger(index, 0.06), 0.24 + stagger(index, 0.06)) : 0;
            const grown = settle(p, 0.12 + stagger(index, 0.07), 0.52 + stagger(index, 0.07));
            const rising = measure.direction > 0;
            const color = rising ? accent : alert;
            return (
              <div
                key={measure.label}
                style={{
                  height: 148,
                  boxSizing: 'border-box',
                  padding: '18px 22px',
                  borderRadius: 26,
                  overflow: 'hidden',
                  position: 'relative',
                  ...glass(tokens, 0.8),
                  opacity: arrival,
                  transform: `translateY(${(1 - arrival) * 16}px) scale(${0.96 + arrival * 0.04})`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <Trend direction={measure.direction} color={color} nudge={breathe * (rising ? 1 : -1)} />
                  <span style={{fontSize: 24, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.72)'}}>
                    {measure.label}
                  </span>
                </div>
                <div style={{marginTop: 22, height: 16, borderRadius: 99, background: 'rgba(255,255,255,.1)', overflow: 'hidden'}}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(rising ? grown * measure.fill : 1 - grown * (1 - measure.fill)) * 100}%`,
                      borderRadius: 99,
                      background: color,
                      boxShadow: `0 0 22px ${color}66`,
                    }}
                  />
                </div>
                <div style={{marginTop: 14, fontSize: 22, fontWeight: 800, color: rising ? palette.white : alert}}>
                  {rising ? 'sube' : 'baja'}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 344,
            height: 158,
            boxSizing: 'border-box',
            padding: '20px 24px',
            borderRadius: 28,
            background: 'rgba(8,9,21,.55)',
            border: `2px solid ${failed ? `${alert}CC` : `${tokens.soft}38`}`,
            boxShadow: failed ? `0 0 60px ${alert}33` : 'none',
            overflow: 'hidden',
            opacity: glide(p, 0.34, 0.5),
          }}
        >
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.6)'}}>
            TODO PASA POR UNA PERSONA
          </div>
          <div style={{position: 'relative', marginTop: 20, height: 62}}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const arrival = settle(queue, index * 0.14, index * 0.14 + 0.24);
              // The pile leans as it grows: six identical upright tiles read as
              // a progress bar, and this is meant to read as backlog.
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: 12 + index * 112,
                    top: 0,
                    width: 96,
                    height: 62,
                    borderRadius: 18,
                    ...glass(tokens, 0.5),
                    opacity: arrival,
                    transform: `translateX(${(1 - arrival) * 70}px) rotate(${arrival * (index % 2 ? 2.4 : -2)}deg)`,
                  }}
                />
              );
            })}
            <div
              style={{
                position: 'absolute',
                right: -6,
                top: -12,
                padding: '14px 26px',
                borderRadius: 20,
                background: alert,
                color: '#1A1103',
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '.1em',
                boxShadow: `0 18px 46px ${alert}77`,
                opacity: stamp,
                transform: `scale(${0.8 + stamp * 0.2}) rotate(${(1 - stamp) * -8}deg)`,
              }}
            >
              ERROR
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 3 · The turn: one question, then the mark
 * ------------------------------------------------------------------ */

export const AentsTurnSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName, brandTile}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  // What the previous scene left behind, letting go. The beat exists because
  // the noise stops first — so the noise has to be seen leaving, blurring and
  // falling away rather than switching off.
  const clearing = 1 - glide(p, 0.04, 0.34);
  const asked = glide(p, 0.2, 0.46);
  const mark = spring({frame: frame - span * 0.56, fps, config: {damping: 13, mass: 0.8}});
  const tile = brandTile ? staticFile(brandTile) : null;
  return (
    <Field tokens={tokens} push={p}>
      <Halo color={`${tokens.accent}8C`} size={880} x={540} y={880} strength={0.3 + mark * 0.55} />

      <div
        style={{
          position: 'absolute',
          left: sideCrop,
          right: sideCrop,
          top: 360,
          opacity: clearing,
          filter: `blur(${(1 - clearing) * 9}px)`,
          transform: `scale(${1 - (1 - clearing) * 0.12}) translateY(${(1 - clearing) * -30}px)`,
        }}
      >
        <svg viewBox="0 0 840 220" width="100%" height="220">
          {CROSSINGS.map(([from, to], index) => (
            <path
              key={`${from}-${to}`}
              d={`M${60 + from * 130} ${40 + (index % 3) * 60} Q420 110 ${780 - to * 110} ${180 - (index % 2) * 70}`}
              fill="none"
              stroke={alert}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.45}
            />
          ))}
        </svg>
      </div>

      <KineticText
        text="¿Y si el sistema hiciera el trabajo?"
        progress={asked}
        step={0.09}
        style={{
          position: 'absolute',
          left: sideCrop,
          right: sideCrop,
          top: 470,
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: 78,
          fontWeight: 800,
          lineHeight: 1.02,
          letterSpacing: '-.05em',
        }}
      />

      <div style={{position: 'absolute', left: 0, right: 0, top: 780, display: 'grid', placeItems: 'center'}}>
        <div
          style={{
            width: 172,
            height: 172,
            borderRadius: 48,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(150deg, ${tokens.accent}, #33268A)`,
            boxShadow: `0 34px 96px ${tokens.accent}8C, inset 0 3px 0 rgba(255,255,255,.28)`,
            opacity: mark,
            transform: `scale(${0.7 + mark * 0.3}) rotate(${(1 - mark) * -12}deg)`,
          }}
        >
          {tile ? <Img src={tile} style={{width: 116, height: 116, borderRadius: 32}} /> : null}
        </div>
      </div>
    </Field>
  );
};

/* ------------------------------------------------------------------ *
 * 4 · The system, built around how the business already works
 * ------------------------------------------------------------------ */

const MODULES = ['Clientes', 'Ventas', 'Inventario', 'Pagos'];

export const AentsArchitectureSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const band = (index: number) => (p >= stagger(index, 0.13) ? land(p, stagger(index, 0.13), 0.24 + stagger(index, 0.13)) : 0);
  const link = (index: number) => settle(p, 0.14 + stagger(index, 0.13), 0.26 + stagger(index, 0.13));
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="ASÍ TRABAJA TU NEGOCIO" title="Y así se construye el sistema">
      <div style={{position: 'relative', height: 520, marginTop: 24}}>
        <Halo color={`${tokens.accent}73`} size={560} x={PANEL_WIDTH / 2} y={254} strength={0.5} />

        {/* The connectors are drawn downward by a head, so the structure is
            built in front of the viewer instead of appearing assembled. */}
        <svg viewBox={`0 0 ${PANEL_WIDTH} 520`} width="100%" height="520" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {[70, 176, 306, 406].map((top, index) => (
            <Trace
              key={top}
              from={{x: PANEL_WIDTH / 2, y: top}}
              to={{x: PANEL_WIDTH / 2, y: top + 26}}
              progress={link(index)}
              color={tokens.soft}
              width={4}
              head={false}
            />
          ))}
        </svg>

        <div
          style={{
            position: 'absolute',
            left: PANEL_WIDTH / 2 - 150,
            top: 0,
            width: 300,
            height: 70,
            borderRadius: 22,
            display: 'grid',
            placeItems: 'center',
            ...glass(tokens, 0.8),
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: '.06em',
            opacity: band(0),
            transform: `translateY(${(1 - band(0)) * -18}px)`,
          }}
        >
          CLIENTES
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, top: 96, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32}}>
          {['Web', 'App'].map((surface, index) => {
            const arrival = p >= 0.18 + stagger(index, 0.05) ? land(p, 0.18 + stagger(index, 0.05), 0.36 + stagger(index, 0.05)) : 0;
            return (
              <div
                key={surface}
                style={{
                  height: 80,
                  borderRadius: 24,
                  display: 'grid',
                  placeItems: 'center',
                  ...glass(tokens, 0.8),
                  fontSize: 32,
                  fontWeight: 800,
                  opacity: arrival,
                  transform: `scale(${0.9 + arrival * 0.1})`,
                }}
              >
                {surface}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 202,
            height: 104,
            borderRadius: 30,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            ...lit(tokens),
            opacity: band(2),
            transform: `scale(${0.94 + band(2) * 0.06})`,
          }}
        >
          <Sweep progress={p} color="rgba(255,255,255,.14)" width={220} span={PANEL_WIDTH} />
          <div style={{textAlign: 'center', position: 'relative'}}>
            <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.68)'}}>TU SISTEMA</div>
            <div style={{marginTop: 4, fontSize: 40, fontWeight: 800, letterSpacing: '-.04em'}}>Hecho a tu medida</div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, top: 332, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16}}>
          {MODULES.map((module, index) => {
            const arrival = p >= 0.5 + stagger(index, 0.05) ? land(p, 0.5 + stagger(index, 0.05), 0.66 + stagger(index, 0.05)) : 0;
            return (
              <div
                key={module}
                style={{
                  height: 74,
                  borderRadius: 20,
                  display: 'grid',
                  placeItems: 'center',
                  ...glass(tokens, 0.7),
                  fontSize: 22,
                  fontWeight: 800,
                  opacity: arrival,
                  transform: `translateY(${(1 - arrival) * 16}px)`,
                }}
              >
                {module}
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 432,
            height: 82,
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: `${accent}1F`,
            border: `2px solid ${accent}88`,
            fontSize: 30,
            fontWeight: 800,
            color: palette.white,
            opacity: band(4),
            transform: `translateY(${(1 - band(4)) * 20}px)`,
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 99,
              background: accent,
              boxShadow: `0 0 ${16 + Math.abs(Math.sin(p * Math.PI * 4)) * 16}px ${accent}`,
            }}
          />
          Automatización
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 5 · One order arrives and the system does the rest
 * ------------------------------------------------------------------ */

const AUTOMATED = ['Pago confirmado', 'Inventario actualizado', 'Factura generada', 'Cliente notificado', 'Reporte actualizado'];

export const AentsAutomationSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const arrival = p > 0 ? land(p, 0.01, 0.18) : 0;
  const spine = settle(p, 0.1, 0.74);
  // A pulse keeps running down the spine after it is drawn: the line is a
  // channel with something in it, not a rule printed on the panel.
  const carrier = (p * 2.6) % 1;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="ENTRA UN PEDIDO" title="Y el resto ocurre solo">
      <div style={{position: 'relative', height: 520, marginTop: 24}}>
        <Halo color={`${tokens.accent}66`} size={520} x={120} y={300} strength={0.45} />

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 24px',
            borderRadius: 22,
            overflow: 'hidden',
            ...lit(tokens),
            opacity: Math.min(1, arrival * 1.4),
            transform: `translateX(${(1 - arrival) * -70}px)`,
          }}
        >
          <Sweep progress={p} color="rgba(255,255,255,.16)" width={120} span={420} />
          <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', position: 'relative'}}>NUEVO PEDIDO</span>
          <Example style={{position: 'relative'}} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 96,
            width: 4,
            height: 396,
            borderRadius: 99,
            background: `linear-gradient(180deg,${tokens.soft},${tokens.accent})`,
            transformOrigin: 'top center',
            transform: `scaleY(${spine})`,
          }}
        />
        {spine > 0.2 ? (
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 96 + carrier * 380,
              width: 16,
              height: 16,
              borderRadius: 99,
              background: tokens.soft,
              boxShadow: `0 0 22px ${tokens.soft}`,
              opacity: Math.sin(carrier * Math.PI),
            }}
          />
        ) : null}

        {AUTOMATED.map((step, index) => {
          // Five confirmations have to finish inside the line, with room left
          // for the last tick to be seen: the run closes around seven tenths.
          const at = 0.14 + index * 0.115;
          const arrived = p >= at ? land(p, at, at + 0.14) : 0;
          const done = p >= at + 0.06 ? land(p, at + 0.06, at + 0.16) : 0;
          return (
            <div
              key={step}
              style={{
                position: 'absolute',
                left: 62,
                right: 0,
                top: 106 + index * 80,
                height: 66,
                boxSizing: 'border-box',
                padding: '0 22px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                ...glass(tokens, 0.6),
                background: done > 0.9 ? `${accent}1F` : undefined,
                borderColor: done > 0.9 ? `${accent}88` : undefined,
                opacity: arrived,
                transform: `translateX(${(1 - arrived) * 34}px)`,
              }}
            >
              <span style={{fontSize: 27, fontWeight: 800}}>{step}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  display: 'grid',
                  placeItems: 'center',
                  background: accent,
                  color: '#07140B',
                  fontSize: 24,
                  fontWeight: 800,
                  opacity: Math.min(1, done * 1.3),
                  boxShadow: done > 0.6 ? `0 0 24px ${accent}66` : 'none',
                  transform: `scale(${0.6 + done * 0.4})`,
                }}
              >
                ✓
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 6 · The panel that answers what needs attention
 * ------------------------------------------------------------------ */

const ATTENTION = [
  {count: '3', label: 'clientes por responder', tone: '#6B5CF6'},
  {count: '2', label: 'pagos pendientes', tone: alert},
  {count: '1', label: 'pedido sin despachar', tone: '#A78BFA'},
];

const ROLES = ['Ventas', 'Bodega', 'Gerencia'];

export const AentsPanelSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const asked = glide(p, 0.02, 0.18);
  // The read travels down the rows: the panel answers a question, and a
  // question is answered in an order.
  const reading = glide(p, 0.2, 0.72) * 2;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="TODO EN UN PANEL" title="¿Qué necesita atención hoy?">
      <div style={{position: 'relative', height: 520, marginTop: 24}}>
        <Halo color={`${tokens.accent}59`} size={520} x={PANEL_WIDTH * 0.3} y={110 + reading * 92} strength={0.5} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 22px',
            borderRadius: 20,
            ...glass(tokens, 0.6),
            opacity: asked,
          }}
        >
          <span style={{fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.72)'}}>Panel de tu operación</span>
          <Example style={{marginLeft: 'auto'}} />
        </div>

        {ATTENTION.map((item, index) => {
          const at = 0.22 + index * 0.14;
          const arrived = p >= at ? land(p, at, at + 0.2) : 0;
          const read = Math.max(0, 1 - Math.abs(reading - index) * 1.6);
          return (
            <div
              key={item.label}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 100 + index * 92,
                height: 78,
                boxSizing: 'border-box',
                padding: '0 24px',
                borderRadius: 22,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                ...glass(tokens, 0.7 + read * 0.7),
                borderColor: `${item.tone}${read > 0.5 ? 'CC' : '55'}`,
                opacity: arrived,
                transform: `translateY(${(1 - arrived) * 22}px) scale(${1 + read * 0.015})`,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  background: item.tone,
                  boxShadow: `0 0 ${14 + read * 18}px ${item.tone}`,
                }}
              />
              <span style={{fontSize: 42, fontWeight: 800, letterSpacing: '-.04em', ...figures}}>{item.count}</span>
              <span style={{fontSize: 27, fontWeight: 800, color: 'rgba(255,255,255,.82)'}}>{item.label}</span>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 392,
            height: 96,
            boxSizing: 'border-box',
            padding: '0 24px',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'rgba(8,9,21,.5)',
            border: `2px solid ${tokens.soft}33`,
            opacity: glide(p, 0.54, 0.66),
          }}
        >
          <span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.6)'}}>ROLES</span>
          {ROLES.map((role, index) => {
            const at = 0.6 + stagger(index, 0.05);
            const arrived = p >= at ? land(p, at, at + 0.12) : 0;
            return (
              <span
                key={role}
                style={{
                  padding: '12px 22px',
                  borderRadius: 99,
                  background: index === 0 ? accent : 'rgba(255,255,255,.09)',
                  color: index === 0 ? '#07140B' : palette.white,
                  fontSize: 24,
                  fontWeight: 800,
                  opacity: arrived,
                  transform: `scale(${0.84 + arrived * 0.16})`,
                }}
              >
                {role}
              </span>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 7 · The numbers grow and the interface does not move
 * ------------------------------------------------------------------ */

const SCALE_STEPS = [
  {value: '10', height: 52},
  {value: '100', height: 96},
  {value: '1.000', height: 142},
  {value: '10.000', height: 188},
];

export const AentsScaleSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const reached = SCALE_STEPS.reduce((found, step, index) => (p >= 0.12 + index * 0.2 ? index : found), 0);
  const pop = SCALE_STEPS.slice(1).reduce((sum, _step, index) => sum + pulse(p, 0.12 + (index + 1) * 0.2, 0.08), 0);
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="EL MISMO SISTEMA" title="Con diez o con diez mil">
      <div style={{position: 'relative', height: 520, marginTop: 24}}>
        <Halo color={`${tokens.accent}66`} size={560} x={PANEL_WIDTH * 0.6} y={430} strength={0.4 + pop * 0.4} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 24px',
            borderRadius: 22,
            ...glass(tokens, 0.7),
          }}
        >
          <span style={{fontSize: 23, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.62)'}}>CLIENTES</span>
          <Example />
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 58,
              fontWeight: 800,
              letterSpacing: '-.05em',
              color: accent,
              textShadow: pop > 0.2 ? `0 0 32px ${accent}88` : 'none',
              transform: `scale(${1 + pop * 0.08})`,
              ...figures,
            }}
          >
            {SCALE_STEPS[reached].value}
          </span>
        </div>

        {/* The chrome that proves the point: it never moves. It only breathes
            with a light crossing it, so the viewer can tell it is alive and
            still see that nothing below it shifted a pixel. */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 118, display: 'grid', gap: 14}}>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              style={{
                height: 44,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '0 20px',
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(255,255,255,.05)',
                border: '2px solid rgba(255,255,255,.08)',
              }}
            >
              <Sweep progress={p + row * 0.12} color={`${tokens.soft}1A`} width={160} span={PANEL_WIDTH} />
              <span style={{width: 10, height: 10, borderRadius: 99, background: `${tokens.soft}99`, position: 'relative'}} />
              <span style={{height: 10, width: 200 + row * 90, borderRadius: 99, background: 'rgba(255,255,255,.14)', position: 'relative'}} />
              <span style={{marginLeft: 'auto', height: 10, width: 74, borderRadius: 99, background: 'rgba(255,255,255,.1)', position: 'relative'}} />
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 244,
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: 24,
            alignItems: 'end',
          }}
        >
          {SCALE_STEPS.map((step, index) => {
            const grown = settle(p, 0.1 + index * 0.2, 0.3 + index * 0.2);
            const live = index <= reached;
            return (
              <div key={step.value} style={{display: 'grid', justifyItems: 'center', gap: 14}}>
                <div
                  style={{
                    width: '100%',
                    height: step.height * grown,
                    borderRadius: '18px 18px 8px 8px',
                    background: live ? `linear-gradient(180deg,${accent},${tokens.accent})` : 'rgba(255,255,255,.08)',
                    boxShadow: live ? `0 16px 40px ${accent}44` : 'none',
                  }}
                />
                <span style={{fontSize: 26, fontWeight: 800, color: live ? palette.white : 'rgba(255,255,255,.4)', ...figures}}>
                  {step.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 8 · What Aents says it builds
 * ------------------------------------------------------------------ */

export const AentsPositioningSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  // The replacement has to be readable for most of the scene, not arrive in its
  // last second: struck out early, gone by a third, and the statement standing
  // from the halfway mark onwards.
  const struck = settle(p, 0.08, 0.26);
  const leaving = glide(p, 0.28, 0.42);
  const eyebrow = glide(p, 0.34, 0.46);
  const statement = glide(p, 0.38, 0.9);
  return (
    <Field tokens={tokens} push={p}>
      <Halo color={`${tokens.accent}73`} size={900} x={540} y={760} strength={0.35 + statement * 0.35} />

      <div
        style={{
          position: 'absolute',
          left: sideCrop,
          right: sideCrop,
          top: 480,
          textAlign: 'center',
          opacity: 1 - leaving,
          filter: `blur(${leaving * 10}px)`,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            position: 'relative',
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: '-.05em',
            color: 'rgba(255,255,255,.5)',
            transform: `translateY(${leaving * -46}px) scale(${1 - leaving * 0.06})`,
          }}
        >
          SOFTWARE
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '52%',
              height: 9,
              width: `${struck * 100}%`,
              borderRadius: 99,
              background: alert,
              boxShadow: `0 0 24px ${alert}88`,
            }}
          />
        </div>
      </div>

      <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 640, textAlign: 'center'}}>
        <Reveal progress={eyebrow}>
          <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '.16em', color: accent}}>CONSTRUIMOS</div>
        </Reveal>
        <KineticText
          text="SISTEMAS QUE HACEN AVANZAR NEGOCIOS"
          progress={statement}
          step={0.08}
          style={{
            marginTop: 22,
            justifyContent: 'center',
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: '-.05em',
          }}
        />
      </div>
    </Field>
  );
};

/* ------------------------------------------------------------------ *
 * 9 · The sign-off
 * ------------------------------------------------------------------ */

// The four families Aents publishes on its own site. Nothing is added here that
// the landing does not already offer.
const OFFER = 'Web · Apps · Sistemas · Automatización';

export const AentsSignOffSim: React.FC<SimulationProps> = ({frame, total, accent, brandId, brandName, brandTile}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const mark = spring({frame, fps, config: {damping: 14, mass: 0.75}});
  // A call to action has to be read, so the whole card is standing before the
  // halfway mark and the rest of the scene is time to act on it. The closing
  // frame settles: the contract asks for a stable last second, and a card that
  // is still drifting when the video ends cannot be acted on.
  const name = glide(p, 0.08, 0.24);
  const offer = glide(p, 0.2, 0.36);
  const action = p >= 0.3 ? land(p, 0.3, 0.5) : 0;
  const rest = 1 - glide(p, 0.5, 0.86);
  const tile = brandTile ? staticFile(brandTile) : null;
  return (
    <Field tokens={tokens} push={p * 0.35}>
      <Halo color={`${tokens.accent}8C`} size={1000} x={540} y={720} strength={0.32 + mark * 0.4} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 420}}>
        {tile ? (
          <Img
            src={tile}
            style={{
              width: 210,
              height: 210,
              borderRadius: 56,
              boxShadow: `0 34px 100px ${tokens.accent}8C`,
              opacity: mark,
              transform: `scale(${0.78 + mark * 0.22}) translateY(${rest * -8}px)`,
            }}
          />
        ) : null}
        <Reveal progress={name} style={{marginTop: 34}}>
          <div style={{fontSize: 88, fontWeight: 800, letterSpacing: '.02em'}}>AENTS</div>
        </Reveal>
        <Reveal progress={name} style={{marginTop: 10}}>
          <div style={{fontSize: 34, fontWeight: 800, color: tokens.soft}}>Software para personas.</div>
        </Reveal>

        <div
          style={{
            marginTop: 30,
            width: 420 * offer,
            height: 3,
            borderRadius: 99,
            background: `linear-gradient(90deg, transparent, ${tokens.soft}, transparent)`,
            opacity: offer,
          }}
        />
        <Reveal progress={offer} style={{marginTop: 26}}>
          <div style={{fontSize: 29, fontWeight: 800, color: 'rgba(255,255,255,.72)'}}>{OFFER}</div>
        </Reveal>

        <div style={{marginTop: 40, display: 'flex', alignItems: 'center', gap: 18}}>
          {[
            {label: 'Conversemos', background: accent, color: '#07140B'},
            {label: 'aents.net', background: tokens.accent, color: palette.white},
          ].map((button, index) => {
            const at = 0.3 + stagger(index, 0.08);
            const arrived = p >= at ? land(p, at, at + 0.2) : 0;
            return (
              <span
                key={button.label}
                style={{
                  padding: '18px 32px',
                  borderRadius: 99,
                  background: button.background,
                  color: button.color,
                  fontSize: 30,
                  fontWeight: 800,
                  boxShadow: `0 22px 60px ${button.background}55`,
                  opacity: Math.min(1, arrived * 1.3),
                  transform: `scale(${0.86 + arrived * 0.14})`,
                }}
              >
                {button.label}
              </span>
            );
          })}
        </div>
        <div style={{opacity: action * 0}} />
      </AbsoluteFill>
    </Field>
  );
};
