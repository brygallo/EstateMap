import React from 'react';
import {Easing, Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {
  BoxedText,
  Field,
  Halo,
  PANEL_WIDTH,
  Panel,
  Reveal,
  Trace,
  beat,
  glide,
  land,
  stagger,
  figures,
  tokensFor,
} from './system-kit';
import type {BrandTokens} from './system-kit';
import {palette} from './theme';
import type {SimulationProps} from './simulations';

/**
 * «Estás creando software con inteligencia artificial»: the lesson about
 * directing a model so that what it writes can be maintained.
 *
 * Three rules govern everything drawn here.
 *
 * The first is that every piece of advice has to be *demonstrated failing*
 * before it is given. A slide that says «divide el proyecto» convinces nobody;
 * a trace that gets lost twice among four hundred generated files does. So the
 * wrong version is animated with the same care as the right one, and the fix
 * always arrives as a visible consequence of an action, never as a new slide.
 *
 * The second is that nothing here is a claim. There are no figures about
 * productivity, error rates or adoption; the file counters are the staging of a
 * change, never a measurement, and the narration never says them out loud. The
 * appointment book of `sim:aents-ia-reglas` is invented to teach a collision and
 * carries the `EJEMPLO` badge for as long as it is on screen.
 *
 * The third is that no AI tool is named, compared or recommended. The prompts
 * are drawn as a generic message field, because the subject of the piece is how
 * a person directs the work, not which product they used.
 *
 * The ground, the panel, the contained text and the rhythm come from
 * `system-kit`, so a fix to the panel reaches both brands at once.
 */

const ink = '#0F1526';
const paper = '#F4F7FB';
const rule = '#CBD3E1';
const muted = '#8892A6';
const bezel = '#1A1B32';

/** The room a composition has under the panel header. */
const STAGE = PANEL_WIDTH;
const STAGE_HEIGHT = 500;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const mix = (amount: number, a: number, b: number) => a + (b - a) * clamp01(amount);

/** The series' gesture curve: quick departure, long settle. */
const gesture = (value: number, from: number, to: number, a: number, b: number) =>
  interpolate(value, [from, to], [a, b], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Interface travel: soft ends, even middle, so a long move uses its whole window. */
const ramp = (value: number, from: number, to: number, a: number, b: number) =>
  interpolate(value, [from, to], [a, b], {
    easing: Easing.bezier(0.35, 0.12, 0.28, 0.92),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** A rise that holds and then leaves, for something that must not stay. */
const passing = (value: number, from: number, peak: number, to: number) =>
  Math.min(beat(value, from, peak), 1 - beat(value, peak, to));

/**
 * The badge every invented figure lives under.
 *
 * Only one composition needs it — the appointment book — and it stays on screen
 * for as long as the times and names it invents are visible.
 */
const Example: React.FC<{style?: React.CSSProperties}> = ({style}) => (
  <span
    style={{
      padding: '5px 12px',
      borderRadius: 99,
      border: '2px solid rgba(255,255,255,.3)',
      color: 'rgba(255,255,255,.8)',
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

const Tick: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5L10 17.5L19 7" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Cross: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 7L17 17M17 7L7 17" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

/** The arrow, which hits what its tip is on. */
const Cursor: React.FC<{x: number; y: number; opacity?: number; press?: number}> = ({x, y, opacity = 1, press = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      opacity,
      transform: `scale(${1 - press * 0.16})`,
      transformOrigin: '5px 3px',
      filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.45))',
      pointerEvents: 'none',
    }}
  >
    <svg width={34} height={40} viewBox="0 0 42 48">
      <path d="M5 3 L5 40 L15 31 L22 47 L31 43 L24 28 L36 27 Z" fill={palette.white} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  </div>
);

/**
 * The message field the whole piece is directed from.
 *
 * It is deliberately anonymous — a rounded field, a caret and a send button —
 * because the subject is the instruction a person writes, not the tool that
 * receives it.
 */
const Prompt: React.FC<{
  text: string;
  progress: number;
  width: number;
  tokens: BrandTokens;
  tone?: 'plain' | 'lit';
}> = ({text, progress, width, tokens, tone = 'plain'}) => {
  const shown = text.slice(0, Math.round(text.length * clamp01(progress)));
  const typing = progress > 0 && progress < 1;
  return (
    <div
      style={{
        width,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 18,
        background: tone === 'lit' ? `${tokens.accent}22` : 'rgba(255,255,255,.07)',
        border: `2px solid ${tone === 'lit' ? tokens.accent : 'rgba(255,255,255,.16)'}`,
      }}
    >
      <span style={{flex: 1, fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.92)', whiteSpace: 'nowrap', overflow: 'hidden'}}>
        {shown}
        {typing ? <span style={{color: tokens.soft}}>|</span> : null}
      </span>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 99,
          background: tokens.accent,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <path d="M5 12h13M12 6l6 6-6 6" stroke={palette.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
};

/** One line of generated code, drawn as an indented bar of tokens. */
const CodeLine: React.FC<{
  seed: number;
  width: number;
  progress: number;
  tokens: BrandTokens;
  tone?: 'plain' | 'alert' | 'confirm';
}> = ({seed, width, progress, tokens, tone = 'plain'}) => {
  // Deterministic geometry: the same seed always draws the same line.
  const indent = [0, 16, 32, 16][seed % 4];
  const pieces = [3, 4, 2, 3][seed % 4];
  const color = tone === 'alert' ? tokens.alert : tone === 'confirm' ? tokens.confirm : seed % 3 === 0 ? tokens.soft : 'rgba(255,255,255,.34)';
  return (
    <div style={{display: 'flex', gap: 7, marginLeft: indent, height: 9, alignItems: 'center'}}>
      {Array.from({length: pieces}).map((_, index) => {
        const share = [0.34, 0.22, 0.28, 0.16][(seed + index) % 4];
        const grown = clamp01((progress - index * 0.12) / 0.4);
        return (
          <div
            key={index}
            style={{
              width: (width - indent) * share * grown,
              height: 9,
              borderRadius: 99,
              background: index === 0 ? color : 'rgba(255,255,255,.2)',
              opacity: grown,
            }}
          />
        );
      })}
    </div>
  );
};

/** An editor surface: title bar, gutter and the lines it is filling. */
const Editor: React.FC<{
  width: number;
  height: number;
  lines: number;
  written: number;
  tokens: BrandTokens;
  alertLine?: number;
  style?: React.CSSProperties;
}> = ({width, height, lines, written, tokens, alertLine, style}) => (
  <div
    style={{
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: 18,
      background: 'linear-gradient(160deg,#14162B,#0C0D1C)',
      border: `2px solid ${tokens.soft}30`,
      boxShadow: '0 24px 60px rgba(0,0,0,.45)',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div style={{height: 26, display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: 'rgba(255,255,255,.05)'}}>
      {['#F87171', '#FBBF24', '#34D399'].map((dot) => (
        <span key={dot} style={{width: 8, height: 8, borderRadius: 99, background: dot, opacity: 0.7}} />
      ))}
    </div>
    <div style={{padding: '12px 14px', display: 'grid', gap: 8}}>
      {Array.from({length: lines}).map((_, index) => (
        <CodeLine
          key={index}
          seed={index}
          width={width - 40}
          progress={clamp01((written * lines - index) / 1.2)}
          tokens={tokens}
          tone={alertLine === index ? 'alert' : 'plain'}
        />
      ))}
    </div>
  </div>
);

/** A labelled slab: the shape this arc uses for a module, a layer or a step. */
const Slab: React.FC<{
  label: string;
  width: number;
  height: number;
  tokens: BrandTokens;
  state?: 'idle' | 'active' | 'done' | 'failed';
  enter?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({label, width, height, tokens, state = 'idle', enter = 1, style, children}) => {
  const border =
    state === 'done' ? tokens.confirm : state === 'failed' ? tokens.alert : state === 'active' ? tokens.accent : 'rgba(255,255,255,.16)';
  const background =
    state === 'active'
      ? `linear-gradient(140deg, ${tokens.accent}, ${tokens.accent}88 60%, #3B2C93)`
      : state === 'done'
        ? 'rgba(34,197,94,.14)'
        : state === 'failed'
          ? 'rgba(245,158,11,.16)'
          : 'linear-gradient(160deg, rgba(255,255,255,.1), rgba(255,255,255,.03))';
  return (
    <div
      style={{
        width,
        height,
        boxSizing: 'border-box',
        borderRadius: 16,
        border: `2px solid ${border}`,
        background,
        boxShadow: state === 'active' ? `0 18px 44px ${tokens.accent}55` : '0 12px 30px rgba(0,0,0,.35)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 14}px)`,
        ...style,
      }}
    >
      <BoxedText
        text={label}
        width={width - 28 - (children ? 40 : 0)}
        max={23}
        min={15}
        style={{fontWeight: 800, color: 'rgba(255,255,255,.92)', flex: 1}}
      />
      {children}
    </div>
  );
};

/** The line a beat closes on, on the floor of the stage. */
const Closing: React.FC<{text: string; opacity: number; tokens: BrandTokens; width?: number; lines?: number}> = ({
  text,
  opacity,
  tokens,
  width = STAGE,
  lines = 2,
}) => (
  <div style={{position: 'absolute', left: (STAGE - width) / 2, bottom: 0, width, opacity, textAlign: 'center'}}>
    <BoxedText
      text={text}
      width={width}
      max={31}
      min={21}
      lines={lines}
      style={{fontWeight: 800, color: 'rgba(255,255,255,.9)', letterSpacing: '-.02em'}}
    />
    <div style={{margin: '12px auto 0', width: 92, height: 5, borderRadius: 99, background: tokens.accent}} />
  </div>
);

/* ------------------------------------------------------------------ *
 * 1 · It runs. That is not the same as it is built.
 * ------------------------------------------------------------------ */

/** What nobody asked for, and what nobody checked either. */
const HIDDEN_LAYERS = [
  {label: 'Seguridad', x: 0, y: 0},
  {label: 'Base de datos', x: 1, y: 0},
  {label: 'Errores', x: 2, y: 0},
  {label: 'Móvil', x: 0, y: 1},
  {label: 'Permisos', x: 1, y: 1},
  {label: 'Respaldos', x: 2, y: 1},
] as const;

/**
 * Initial state: an instruction and an empty editor. Question: what did we
 * actually get? Action: the code writes itself and folds into a working screen
 * that confirms it runs. Proof: the camera pulls back and the confirmation is
 * surrounded by everything that was never decided, so the tick is replaced by
 * the question the tick cannot answer.
 */
export const AentsAiWorksSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const typed = beat(p, 0.02, 0.14);
  const written = beat(p, 0.16, 0.36);
  const folded = gesture(p, 0.38, 0.5, 0, 1);
  const works = land(p, 0.5, 0.6);
  const pullBack = ramp(p, 0.62, 0.74, 0, 1);
  const doubt = beat(p, 0.82, 0.9);
  const worksOut = 1 - beat(p, 0.8, 0.87);

  const appWidth = 300;
  const appHeight = 250;
  // The pull back has to leave a clear band for the layers and another for the
  // closing line: at 0.66 the screen still reached into the first row of boxes.
  const appScale = mix(pullBack, 1, 0.6);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="EN MINUTOS" title="La aplicación ya abre" push={p}>
      <div style={{position: 'relative', marginTop: 20, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: STAGE, opacity: 1 - beat(p, 0.66, 0.76)}}>
          <Prompt text="Créame un sistema de ventas" progress={typed} width={STAGE} tokens={tokens} tone="lit" />
        </div>

        {/* The editor writes, then folds forward into the screen it produced. */}
        <div
          style={{
            position: 'absolute',
            left: STAGE / 2 - appWidth / 2,
            top: mix(pullBack, 96, 40),
            transformOrigin: '50% 50%',
            transform: `scale(${appScale}) perspective(1200px) rotateX(${(1 - folded) * 22}deg)`,
          }}
        >
          <div style={{position: 'relative', width: appWidth, height: appHeight}}>
            <div style={{position: 'absolute', inset: 0, opacity: 1 - folded}}>
              <Editor width={appWidth} height={appHeight} lines={9} written={written} tokens={tokens} />
            </div>
            {/* The screen the code folded into: menu, table and one action. */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 18,
                background: paper,
                border: `2px solid ${rule}`,
                boxShadow: '0 26px 64px rgba(0,0,0,.5)',
                opacity: folded,
                overflow: 'hidden',
              }}
            >
              <div style={{height: 34, background: tokens.accent, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8}}>
                <span style={{fontSize: 15, fontWeight: 800, color: palette.white}}>Ventas</span>
                <span style={{marginLeft: 'auto', width: 40, height: 10, borderRadius: 99, background: 'rgba(255,255,255,.5)'}} />
              </div>
              <div style={{padding: 12, display: 'grid', gap: 8}}>
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <span style={{width: 26, height: 12, borderRadius: 4, background: '#E3E9F2'}} />
                    <span style={{flex: 1, height: 12, borderRadius: 4, background: '#EDF1F7'}} />
                    <span style={{width: 46, height: 12, borderRadius: 4, background: '#E3E9F2'}} />
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 6,
                    alignSelf: 'flex-start',
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: tokens.accent,
                    color: palette.white,
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  Nueva venta
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The confirmation, and then what it does not cover. */}
        <div
          style={{
            position: 'absolute',
            left: STAGE / 2 - 110,
            top: mix(pullBack, 372, 258),
            width: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '10px 0',
            borderRadius: 99,
            background: 'rgba(34,197,94,.16)',
            border: `2px solid ${tokens.confirm}`,
            opacity: works * worksOut,
            transform: `scale(${0.9 + works * 0.1})`,
          }}
        >
          <Tick size={24} color={tokens.confirm} />
          <span style={{fontSize: 26, fontWeight: 800, color: palette.white}}>Funciona</span>
        </div>

        {HIDDEN_LAYERS.map((layer, index) => {
          const show = beat(p, 0.66 + stagger(index, 0.028), 0.74 + stagger(index, 0.028));
          const column = layer.x;
          const row = layer.y;
          return (
            <div
              key={layer.label}
              style={{
                position: 'absolute',
                left: column * (STAGE / 3),
                top: 320 + row * 62,
                width: STAGE / 3 - 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 13,
                background: 'rgba(255,255,255,.05)',
                border: `2px solid ${tokens.alert}55`,
                opacity: show,
                transform: `translateY(${(1 - show) * 12}px)`,
              }}
            >
              <span style={{width: 16, height: 16, borderRadius: 5, border: `2px solid ${tokens.alert}`, flexShrink: 0}} />
              <BoxedText text={layer.label} width={STAGE / 3 - 62} max={19} min={13} style={{fontWeight: 800, color: 'rgba(255,255,255,.86)'}} />
            </div>
          );
        })}

        <Closing text="¿Pero está bien construido?" opacity={doubt} tokens={tokens} width={560} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · Context is what turns an order into a decision.
 * ------------------------------------------------------------------ */

const CONTEXT_CHIPS = [
  {label: 'Usuarios', x: 0, y: 0},
  {label: 'Roles', x: 1, y: 0},
  {label: 'Productos', x: 2, y: 0},
  {label: 'Bodegas', x: 3, y: 0},
  {label: 'Movimientos', x: 0, y: 1},
  {label: 'Permisos', x: 1, y: 1},
  {label: 'Reglas', x: 2, y: 1},
  {label: 'Tecnología', x: 3, y: 1},
] as const;

/**
 * Initial state: a four-word instruction. Question: what can it decide with
 * that? Action: the generic answer collapses, context is placed around the
 * field and each piece connects to it. Proof: the same request is built again
 * and this time the structure has names, levels and relations.
 */
export const AentsAiContextSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const typed = beat(p, 0.02, 0.12);
  const generic = beat(p, 0.14, 0.22);
  // The generic answer does not fade: it loses its footing and drops out.
  const collapse = ramp(p, 0.26, 0.36, 0, 1);
  const context = beat(p, 0.38, 0.62);
  const rebuilt = beat(p, 0.66, 0.86);
  const verdict = beat(p, 0.88, 0.96);

  const chipWidth = STAGE / 4 - 10;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="PRIMER CONSEJO" title="Explícale qué estás construyendo" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        <Prompt
          text={rebuilt > 0.1 ? 'Sistema de inventario con estas reglas' : 'Hazme un sistema de inventario'}
          progress={typed}
          width={STAGE}
          tokens={tokens}
          tone={rebuilt > 0.1 ? 'lit' : 'plain'}
        />

        {/* The generic answer: equal boxes, no names, and no ground under them. */}
        <div style={{position: 'absolute', left: 0, top: 96, width: STAGE, opacity: generic * (1 - collapse)}}>
          <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
            {Array.from({length: 6}).map((_, index) => (
              <div
                key={index}
                style={{
                  width: STAGE / 3 - 8,
                  height: 66,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.07)',
                  border: '2px dashed rgba(255,255,255,.22)',
                  transform: `translateY(${collapse * (90 + index * 26)}px) rotate(${collapse * (index % 2 ? 7 : -7)}deg)`,
                }}
              />
            ))}
          </div>
        </div>

        {/* The context: eight pieces, each one connected to the instruction. */}
        <svg width={STAGE} height={STAGE_HEIGHT} style={{position: 'absolute', left: 0, top: 0, opacity: context}}>
          {CONTEXT_CHIPS.map((chip, index) => {
            const progress = beat(p, 0.4 + stagger(index, 0.022), 0.56 + stagger(index, 0.022));
            const x = chip.x * (STAGE / 4) + chipWidth / 2;
            const y = 168 + chip.y * 60;
            return (
              <Trace
                key={chip.label}
                from={{x, y}}
                to={{x: STAGE / 2, y: 62}}
                progress={progress}
                color={`${tokens.soft}88`}
                width={3}
              />
            );
          })}
        </svg>

        {CONTEXT_CHIPS.map((chip, index) => {
          const show = land(p, 0.38 + stagger(index, 0.022), 0.5 + stagger(index, 0.022));
          const out = 1 - beat(p, 0.66 + stagger(index, 0.014), 0.74 + stagger(index, 0.014));
          return (
            <div
              key={chip.label}
              style={{
                position: 'absolute',
                left: chip.x * (STAGE / 4),
                top: 148 + chip.y * 60,
                width: chipWidth,
                boxSizing: 'border-box',
                padding: '11px 10px',
                borderRadius: 12,
                background: 'rgba(255,255,255,.07)',
                border: `2px solid ${tokens.soft}55`,
                textAlign: 'center',
                opacity: show * out,
                transform: `scale(${0.86 + show * 0.14})`,
              }}
            >
              <BoxedText text={chip.label} width={chipWidth - 20} max={19} min={13} style={{fontWeight: 800, color: 'rgba(255,255,255,.9)'}} />
            </div>
          );
        })}

        {/* The rebuild: named modules on three levels, with their relations. */}
        <div style={{position: 'absolute', left: 0, top: 150, width: STAGE, opacity: rebuilt}}>
          <div style={{display: 'flex', justifyContent: 'center'}}>
            <Slab label="Inventario" width={260} height={52} tokens={tokens} state="active" enter={rebuilt} />
          </div>
          <div style={{marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center'}}>
            {['Productos', 'Bodegas', 'Movimientos'].map((label, index) => (
              <Slab
                key={label}
                label={label}
                width={STAGE / 3 - 10}
                height={50}
                tokens={tokens}
                enter={beat(p, 0.7 + stagger(index, 0.03), 0.8 + stagger(index, 0.03))}
              />
            ))}
          </div>
          <div style={{marginTop: 16, display: 'flex', gap: 10, justifyContent: 'center'}}>
            {['Roles y permisos', 'Reglas del negocio'].map((label, index) => (
              <Slab
                key={label}
                label={label}
                width={STAGE / 2 - 10}
                height={50}
                tokens={tokens}
                enter={beat(p, 0.76 + stagger(index, 0.03), 0.86 + stagger(index, 0.03))}
              />
            ))}
          </div>
        </div>

        <Closing text="Mejor contexto, mejores decisiones" opacity={verdict} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 3 · One order, four hundred files. Or one block at a time.
 * ------------------------------------------------------------------ */

const BUILD_STEPS = ['Arquitectura', 'Acceso', 'Usuarios', 'Inventario', 'Reportes'] as const;

/** Deterministic scatter: the same index always lands in the same place. */
const scatterAt = (index: number) => {
  const columns = 12;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const wobble = ((index * 37) % 11) - 5;
  return {x: column * 62 + wobble, y: row * 34 + (((index * 53) % 9) - 4)};
};

/**
 * Initial state: one enormous instruction. Question: where is the error? Action:
 * the files scatter, one turns red and a trace tries twice to reach it through
 * the others. Proof: the same work done as five blocks, where the fault can only
 * be in the block that is lit.
 */
export const AentsAiPartsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const burst = beat(p, 0.08, 0.3);
  const broken = beat(p, 0.3, 0.36);
  // Two attempts to follow the thread, each one ending nowhere.
  const firstTry = passing(p, 0.34, 0.4, 0.46);
  const secondTry = passing(p, 0.44, 0.5, 0.56);
  const chaosOut = 1 - beat(p, 0.52, 0.6);
  const ladder = beat(p, 0.6, 0.66);
  const verdict = beat(p, 0.9, 0.97);

  const fileCount = 36;
  const brokenIndex = 21;
  const stepWidth = STAGE - 60;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="SEGUNDO CONSEJO" title="No pidas todo en un solo mensaje" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* The order, and everything it fires at once. */}
        <div style={{position: 'absolute', left: 0, top: 0, width: STAGE, opacity: chaosOut}}>
          <Prompt text="Usuarios, inventario, facturación, reportes…" progress={beat(p, 0.02, 0.1)} width={STAGE} tokens={tokens} />
          <div style={{position: 'relative', marginTop: 22, height: 210}}>
            {Array.from({length: fileCount}).map((_, index) => {
              const at = scatterAt(index);
              const fly = beat(p, 0.1 + stagger(index, 0.006), 0.26 + stagger(index, 0.006));
              const isBroken = index === brokenIndex;
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: mix(fly, STAGE / 2 - 22, at.x),
                    top: mix(fly, 0, at.y),
                    width: 44,
                    height: 26,
                    borderRadius: 6,
                    background: isBroken && broken > 0 ? `${tokens.alert}33` : 'rgba(255,255,255,.08)',
                    border: `2px solid ${isBroken && broken > 0 ? tokens.alert : 'rgba(255,255,255,.18)'}`,
                    opacity: burst * (0.5 + 0.5 * fly),
                    transform: `scale(${0.7 + fly * 0.3})`,
                  }}
                />
              );
            })}
            {/* The search for the fault: it starts, wanders and stops short. */}
            <svg width={STAGE} height={210} style={{position: 'absolute', left: 0, top: 0}}>
              <Trace from={{x: 20, y: 190}} to={{x: 250, y: 96}} progress={firstTry} color={`${tokens.soft}CC`} width={4} />
              <Trace from={{x: 250, y: 96}} to={{x: 430, y: 178}} progress={secondTry} color={`${tokens.soft}CC`} width={4} />
            </svg>
          </div>
        </div>

        {/* The same work, one block at a time. */}
        <div style={{position: 'absolute', left: 30, top: 6, width: stepWidth, opacity: ladder}}>
          {BUILD_STEPS.map((label, index) => {
            const from = 0.62 + index * 0.055;
            const building = beat(p, from, from + 0.03);
            const tested = beat(p, from + 0.03, from + 0.05);
            const state = tested > 0.9 ? 'done' : building > 0.1 ? 'active' : 'idle';
            return (
              <div key={label} style={{marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12}}>
                <Slab
                  label={label}
                  width={stepWidth - 96}
                  height={54}
                  tokens={tokens}
                  state={state as 'idle' | 'active' | 'done'}
                  enter={beat(p, from - 0.04, from)}
                >
                  <div style={{width: 70, height: 8, borderRadius: 99, background: 'rgba(255,255,255,.16)', overflow: 'hidden'}}>
                    <div style={{width: `${building * 100}%`, height: '100%', background: palette.white, opacity: 0.8}} />
                  </div>
                </Slab>
                <div style={{width: 72, display: 'flex', alignItems: 'center', gap: 6, opacity: tested}}>
                  <Tick size={22} color={tokens.confirm} />
                  <span style={{fontSize: 17, fontWeight: 800, color: tokens.confirm}}>listo</span>
                </div>
              </div>
            );
          })}
        </div>

        <Closing text="Construye, prueba, corrige y sigue" opacity={verdict} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 4 · The rules decide before the code does.
 * ------------------------------------------------------------------ */

const RULE_QUESTIONS = [
  {question: '¿Duplicados?', answer: 'Un horario, una cita'},
  {question: '¿Cancelaciones?', answer: 'Hasta 12 horas antes'},
  {question: '¿Disponibilidad?', answer: 'Solo horas publicadas'},
  {question: '¿Permisos?', answer: 'Cliente y profesional'},
] as const;

/**
 * Initial state: an appointment book with one booking in it. Question: what
 * happens when two people want the same slot? Action: the second booking
 * collides and bounces out, and every open question becomes a written rule.
 * Proof: the same booking is tried again and the system answers — it refuses
 * with a reason and offers the next free time.
 */
export const AentsAiRulesSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const first = land(p, 0.06, 0.16);
  const travel = ramp(p, 0.2, 0.3, 0, 1);
  const impact = passing(p, 0.3, 0.34, 0.46);
  const rejected = beat(p, 0.32, 0.4);
  const questions = beat(p, 0.42, 0.5);
  const rules = beat(p, 0.54, 0.68);
  const retry = ramp(p, 0.74, 0.84, 0, 1);
  const solved = beat(p, 0.86, 0.94);

  const gridWidth = 300;
  const cellHeight = 46;
  const slotTop = 84;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="TERCER CONSEJO" title="Las reglas van antes del código" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* The book. Everything printed on it is invented to teach a collision. */}
        <div style={{position: 'absolute', left: 0, top: 0, width: gridWidth}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10}}>
            <span style={{fontSize: 21, fontWeight: 800, color: 'rgba(255,255,255,.6)', letterSpacing: '.08em'}}>AGENDA</span>
            <Example />
          </div>
          <div style={{borderRadius: 14, background: paper, border: `2px solid ${rule}`, overflow: 'hidden'}}>
            {['09:00', '10:00', '11:00', '12:00'].map((hour, index) => (
              <div
                key={hour}
                style={{
                  height: cellHeight,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0 12px',
                  borderBottom: index === 3 ? 'none' : `1px solid ${rule}`,
                  background: index === 1 ? '#EDF1F9' : paper,
                }}
              >
                <span style={{fontSize: 16, fontWeight: 800, color: muted, width: 52}}>{hour}</span>
                {index === 1 ? (
                  <div
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 8,
                      background: tokens.accent,
                      color: palette.white,
                      fontSize: 15,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      opacity: first,
                      transform: `scale(${0.9 + first * 0.1})`,
                    }}
                  >
                    Cita confirmada
                  </div>
                ) : index === 2 && solved > 0 ? (
                  <div
                    style={{
                      flex: 1,
                      height: 30,
                      borderRadius: 8,
                      background: '#16A34A',
                      color: palette.white,
                      fontSize: 15,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      opacity: solved,
                    }}
                  >
                    Cita reubicada
                  </div>
                ) : (
                  <span style={{flex: 1, height: 10, borderRadius: 99, background: '#E7ECF3'}} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* The second booking: it arrives, it does not fit, and it is told why. */}
        <div
          style={{
            position: 'absolute',
            left: mix(travel, gridWidth + 120, 78),
            top: slotTop + mix(retry, 0, cellHeight) + impact * 8,
            width: 190,
            padding: '8px 12px',
            borderRadius: 10,
            background: rejected > 0.5 && retry < 0.5 ? `${tokens.alert}` : tokens.accent,
            color: palette.white,
            fontSize: 16,
            fontWeight: 800,
            boxShadow: '0 16px 34px rgba(0,0,0,.4)',
            opacity: 1 - beat(p, 0.86, 0.93),
            transform: `translateX(${impact * 26}px) rotate(${impact * 6}deg)`,
          }}
        >
          {retry > 0.5 ? 'Toma las 11:00' : 'Quiere las 10:00'}
        </div>

        {/* The questions nobody answered, and the rules they turn into. */}
        <div style={{position: 'absolute', right: 0, top: 34, width: STAGE - gridWidth - 24}}>
          {RULE_QUESTIONS.map((item, index) => {
            const asked = beat(p, 0.42 + stagger(index, 0.03), 0.5 + stagger(index, 0.03));
            const answered = beat(p, 0.56 + stagger(index, 0.03), 0.66 + stagger(index, 0.03));
            return (
              <div
                key={item.question}
                style={{
                  marginBottom: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: answered > 0.5 ? 'rgba(34,197,94,.12)' : 'rgba(255,255,255,.06)',
                  border: `2px solid ${answered > 0.5 ? `${tokens.confirm}77` : 'rgba(255,255,255,.16)'}`,
                  opacity: Math.max(asked * (questions > 0 ? 1 : 0), answered),
                  transform: `perspective(700px) rotateX(${(1 - Math.max(asked, answered)) * 18}deg)`,
                }}
              >
                <BoxedText
                  text={answered > 0.5 ? item.answer : item.question}
                  width={STAGE - gridWidth - 72}
                  max={20}
                  min={14}
                  style={{fontWeight: 800, color: answered > 0.5 ? palette.white : 'rgba(255,255,255,.78)'}}
                />
              </div>
            );
          })}
          <div style={{marginTop: 4, fontSize: 19, fontWeight: 800, letterSpacing: '.08em', color: tokens.soft, opacity: rules}}>
            REGLAS DEL NEGOCIO
          </div>
        </div>

        <Closing text="Primero las reglas. Después el código." opacity={beat(p, 0.9, 0.97)} tokens={tokens} width={640} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 5 · The happy path proves the happy path.
 * ------------------------------------------------------------------ */

const ADVERSE = [
  {key: 'offline', label: 'Sin conexión', result: 'No confirma'},
  {key: 'double', label: 'Doble toque', result: 'Dos registros'},
  {key: 'denied', label: 'Sin permiso', result: 'Igual entra'},
] as const;

/**
 * Initial state: a short form on a phone. Question: is that everything? Action:
 * the perfect run completes and is confirmed, then the same run is repeated
 * under three ordinary conditions. Proof: one tick against three crosses, in
 * the same device and with the same taps.
 */
export const AentsAiHappyPathSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const filled = beat(p, 0.06, 0.16);
  const sent = beat(p, 0.18, 0.24);
  const confirmed = land(p, 0.24, 0.32);

  // The three adverse runs share the middle of the arc, one after another.
  const adverseFrom = 0.4;
  const adverseSpan = 0.16;
  const activeIndex = Math.min(ADVERSE.length - 1, Math.max(0, Math.floor((p - adverseFrom) / adverseSpan)));
  const local = clamp01((p - adverseFrom - activeIndex * adverseSpan) / adverseSpan);
  const inAdverse = p >= adverseFrom && p < adverseFrom + adverseSpan * ADVERSE.length;
  const tally = beat(p, 0.9, 0.97);

  const phoneWidth = 250;
  const phoneHeight = 380;
  const active = ADVERSE[activeIndex];

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="EL ERROR MÁS COMÚN" title="Abrió, funcionó, ya está" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: 8, top: 0}}>
          <div
            style={{
              width: phoneWidth,
              height: phoneHeight,
              boxSizing: 'border-box',
              padding: 9,
              borderRadius: 30,
              background: bezel,
              border: `2px solid ${tokens.soft}44`,
              boxShadow: '0 30px 80px rgba(0,0,0,.55)',
            }}
          >
            <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 22, overflow: 'hidden', background: paper}}>
              <div style={{height: 40, background: tokens.accent}} />
              <div style={{padding: 14, display: 'grid', gap: 12}}>
                {[0, 1].map((row) => (
                  <div
                    key={row}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: `2px solid ${filled > 0.4 ? tokens.accent : rule}`,
                      background: palette.white,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                    }}
                  >
                    <span
                      style={{
                        height: 12,
                        borderRadius: 99,
                        background: '#DCE3EC',
                        width: `${clamp01((filled - row * 0.2) / 0.5) * 70}%`,
                      }}
                    />
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 4,
                    height: 46,
                    borderRadius: 12,
                    background: tokens.accent,
                    color: palette.white,
                    fontSize: 19,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                    transform: `scale(${1 - passing(p, 0.18, 0.21, 0.24) * 0.05})`,
                  }}
                >
                  Enviar
                </div>

                {/* What the screen answers, in each of the four runs. */}
                {!inAdverse ? (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 12px',
                      borderRadius: 12,
                      background: 'rgba(34,197,94,.16)',
                      border: `2px solid ${tokens.confirm}`,
                      opacity: confirmed * (1 - beat(p, 0.36, 0.4)),
                    }}
                  >
                    <Tick size={20} color="#15803D" />
                    <span style={{fontSize: 16, fontWeight: 800, color: '#14532D'}}>Guardado</span>
                  </div>
                ) : (
                  <div style={{marginTop: 8, display: 'grid', gap: 8, opacity: beat(local, 0.2, 0.4)}}>
                    {active.key === 'double' ? (
                      [0, 1].map((copy) => (
                        <div
                          key={copy}
                          style={{
                            padding: '9px 12px',
                            borderRadius: 10,
                            background: '#FDF2E3',
                            border: `2px solid ${tokens.alert}`,
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#92400E',
                            opacity: copy === 1 ? beat(local, 0.42, 0.56) : 1,
                          }}
                        >
                          Pedido registrado
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: '11px 12px',
                          borderRadius: 10,
                          background: active.key === 'denied' ? '#FDF2E3' : '#F1F4F9',
                          border: `2px solid ${active.key === 'denied' ? tokens.alert : rule}`,
                          fontSize: 15,
                          fontWeight: 800,
                          color: active.key === 'denied' ? '#92400E' : muted,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        {active.key === 'offline' ? (
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 99,
                              border: `3px solid ${rule}`,
                              borderTopColor: muted,
                              transform: `rotate(${local * 900}deg)`,
                            }}
                          />
                        ) : null}
                        {active.key === 'offline' ? 'Enviando…' : 'Panel de administración'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* The condition each run was made under, and what came out of it. */}
        <div style={{position: 'absolute', right: 0, top: 10, width: STAGE - phoneWidth - 40}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(34,197,94,.12)',
              border: `2px solid ${tokens.confirm}77`,
              opacity: confirmed,
            }}
          >
            <Tick size={22} color={tokens.confirm} />
            <BoxedText text="Caso perfecto" width={STAGE - phoneWidth - 110} max={21} min={15} style={{fontWeight: 800, color: palette.white}} />
          </div>
          {ADVERSE.map((item, index) => {
            const reached = index < activeIndex || (index === activeIndex && inAdverse && local > 0.5);
            const showing = inAdverse && index === activeIndex;
            return (
              <div
                key={item.key}
                style={{
                  marginTop: 10,
                  padding: '12px 14px',
                  borderRadius: 14,
                  background: reached ? 'rgba(245,158,11,.14)' : 'rgba(255,255,255,.05)',
                  border: `2px solid ${reached ? `${tokens.alert}88` : 'rgba(255,255,255,.12)'}`,
                  opacity: showing || reached ? 1 : 0.32,
                  transform: `scale(${showing ? 1 : 0.98})`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  {reached ? <Cross size={22} color={tokens.alert} /> : <span style={{width: 22, height: 22, borderRadius: 99, border: '2px solid rgba(255,255,255,.24)'}} />}
                  <BoxedText text={item.label} width={STAGE - phoneWidth - 110} max={21} min={15} style={{fontWeight: 800, color: 'rgba(255,255,255,.9)'}} />
                </div>
                <div style={{marginTop: 4, marginLeft: 32, fontSize: 18, fontWeight: 800, color: reached ? tokens.alert : 'rgba(255,255,255,.36)'}}>
                  {item.result}
                </div>
              </div>
            );
          })}
        </div>

        <Closing text="El caso perfecto no es el producto" opacity={tally} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 6 · Accepting is not the same as reading.
 * ------------------------------------------------------------------ */

const REVIEW_QUESTIONS = [
  {question: '¿Por qué este archivo?', answer: 'No hacía falta'},
  {question: '¿Y esta librería?', answer: 'Ya está resuelto'},
  {question: '¿Hay algo más simple?', answer: 'Dos capas menos'},
] as const;

/**
 * Initial state: a diff waiting for one of two buttons. Question: what happens
 * if nobody reads it? Action: the cursor goes for «aceptar todo», stops and
 * chooses «revisar»; each question lands on a specific line and gets an answer.
 * Proof: a block leaves the file, two near-identical components become one and
 * the counter of what is being merged goes down while it happens.
 */
export const AentsAiReviewSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  // The cursor sets off for the wrong button, hesitates and comes back.
  const approach = ramp(p, 0.04, 0.16, 0, 1);
  const divert = ramp(p, 0.2, 0.3, 0, 1);
  const press = passing(p, 0.3, 0.33, 0.36);
  const opened = beat(p, 0.34, 0.42);
  const merged = beat(p, 0.74, 0.86);
  const verdict = beat(p, 0.9, 0.97);

  const questionIndex = Math.min(REVIEW_QUESTIONS.length - 1, Math.max(0, Math.floor((p - 0.44) / 0.1)));
  const questionLocal = clamp01((p - 0.44 - questionIndex * 0.1) / 0.1);
  const asking = p >= 0.44 && p < 0.74;

  const editorWidth = 340;
  // The two buttons live in a 240 px column pinned to the right: «aceptar todo»
  // from y 40 and «revisar» from y 100. The cursor has to reach the first one
  // and then travel down to the second, or the change of mind is not visible.
  const cursorX = mix(divert, mix(approach, STAGE - 330, STAGE - 156), STAGE - 152);
  const cursorY = mix(divert, mix(approach, 250, 52), 112);
  const files = merged > 0.5 ? 9 : 12;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="ANTES DE ACEPTAR" title="Pregúntale por qué lo hizo así" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* The two buttons, and the one that gets pressed. */}
        <div style={{position: 'absolute', right: 0, top: 40, display: 'grid', gap: 12, width: 240}}>
          <div
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              textAlign: 'center',
              fontSize: 21,
              fontWeight: 800,
              color: 'rgba(255,255,255,.5)',
              background: 'rgba(255,255,255,.05)',
              border: '2px solid rgba(255,255,255,.14)',
              opacity: 1 - divert * 0.4,
            }}
          >
            Aceptar todo
          </div>
          <div
            style={{
              padding: '13px 16px',
              borderRadius: 12,
              textAlign: 'center',
              fontSize: 21,
              fontWeight: 800,
              color: palette.white,
              background: divert > 0.6 ? `linear-gradient(140deg, ${tokens.accent}, #3B2C93)` : 'rgba(255,255,255,.07)',
              border: `2px solid ${divert > 0.6 ? tokens.soft : 'rgba(255,255,255,.18)'}`,
              boxShadow: divert > 0.6 ? `0 18px 44px ${tokens.accent}55` : 'none',
              transform: `scale(${1 - press * 0.04})`,
            }}
          >
            Revisar
          </div>
          <div style={{marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center'}}>
            <span style={{fontSize: 34, fontWeight: 800, color: palette.white, ...figures}}>{files}</span>
            <span style={{fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.5)'}}>archivos</span>
          </div>
        </div>

        <Cursor x={cursorX} y={cursorY} opacity={1 - beat(p, 0.4, 0.46)} press={press} />

        {/* The file, with the line each question is asked about. */}
        <div style={{position: 'absolute', left: 0, top: 26, opacity: opened}}>
          <div
            style={{
              width: editorWidth,
              borderRadius: 18,
              background: 'linear-gradient(160deg,#14162B,#0C0D1C)',
              border: `2px solid ${tokens.soft}30`,
              boxShadow: '0 24px 60px rgba(0,0,0,.45)',
              overflow: 'hidden',
            }}
          >
            <div style={{height: 26, background: 'rgba(255,255,255,.05)'}} />
            <div style={{padding: '14px 16px', display: 'grid', gap: 10}}>
              {Array.from({length: 10}).map((_, index) => {
                const targeted = asking && index === [2, 5, 8][questionIndex];
                const removed = index >= 6 && index <= 8 && merged > 0.4;
                return (
                  <div
                    key={index}
                    style={{
                      position: 'relative',
                      opacity: removed ? 1 - beat(p, 0.74, 0.82) : 1,
                      transform: `translateX(${removed ? beat(p, 0.74, 0.84) * 60 : 0}px)`,
                    }}
                  >
                    {targeted ? (
                      <div
                        style={{
                          position: 'absolute',
                          left: -8,
                          right: -8,
                          top: -5,
                          bottom: -5,
                          borderRadius: 7,
                          background: `${tokens.accent}2E`,
                          border: `2px solid ${tokens.accent}`,
                        }}
                      />
                    ) : null}
                    <CodeLine seed={index} width={editorWidth - 44} progress={1} tokens={tokens} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* The exchange: one question at a time, and the answer it gets. */}
        <div style={{position: 'absolute', right: 0, top: 210, width: STAGE - editorWidth - 24}}>
          {asking ? (
            <>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 14,
                  borderBottomRightRadius: 4,
                  background: 'rgba(255,255,255,.08)',
                  border: '2px solid rgba(255,255,255,.18)',
                  opacity: beat(questionLocal, 0, 0.2),
                  transform: `translateY(${(1 - beat(questionLocal, 0, 0.2)) * 12}px)`,
                }}
              >
                <BoxedText
                  text={REVIEW_QUESTIONS[questionIndex].question}
                  width={STAGE - editorWidth - 60}
                  max={21}
                  min={14}
                  lines={2}
                  style={{fontWeight: 800, color: 'rgba(255,255,255,.9)'}}
                />
              </div>
              <div
                style={{
                  marginTop: 10,
                  marginLeft: 22,
                  padding: '12px 14px',
                  borderRadius: 14,
                  borderTopLeftRadius: 4,
                  background: `${tokens.accent}26`,
                  border: `2px solid ${tokens.accent}`,
                  opacity: beat(questionLocal, 0.42, 0.62),
                  transform: `translateY(${(1 - beat(questionLocal, 0.42, 0.62)) * 12}px)`,
                }}
              >
                <BoxedText
                  text={REVIEW_QUESTIONS[questionIndex].answer}
                  width={STAGE - editorWidth - 82}
                  max={21}
                  min={14}
                  lines={2}
                  style={{fontWeight: 800, color: palette.white}}
                />
              </div>
            </>
          ) : null}

          {/* The consequence: two components that were almost the same. */}
          <div style={{opacity: merged, marginTop: asking ? 0 : 0}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <div
                style={{
                  flex: 1,
                  padding: '11px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.06)',
                  border: '2px solid rgba(255,255,255,.16)',
                  fontSize: 17,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,.7)',
                  transform: `translateY(${(1 - merged) * -20}px)`,
                }}
              >
                Tarjeta A
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '11px 12px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,.06)',
                  border: '2px solid rgba(255,255,255,.16)',
                  fontSize: 17,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,.7)',
                  transform: `translateY(${(1 - merged) * 20}px)`,
                }}
              >
                Tarjeta B
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: '13px 12px',
                borderRadius: 12,
                textAlign: 'center',
                background: 'rgba(34,197,94,.14)',
                border: `2px solid ${tokens.confirm}88`,
                fontSize: 19,
                fontWeight: 800,
                color: palette.white,
                opacity: beat(p, 0.82, 0.88),
              }}
            >
              Un solo componente
            </div>
          </div>
        </div>

        <Closing text="Copiloto, no piloto automático" opacity={verdict} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 7 · Every dependency is also a decision.
 * ------------------------------------------------------------------ */

const PACKAGES = [
  {label: 'fechas', size: 84, keep: true, angle: -150},
  {label: 'iconos', size: 96, keep: false, angle: -95},
  {label: 'gráficos', size: 118, keep: false, angle: -40},
  {label: 'formularios', size: 104, keep: true, angle: 40},
  {label: 'animación', size: 132, keep: false, angle: 95},
  {label: 'utilidades', size: 150, keep: false, angle: 150},
] as const;

/**
 * Initial state: a small application, whole and readable. Question: what does
 * each package cost? Action: six of them dock onto it, each bigger than the
 * last, until the shape underneath is gone. Proof: three questions are put to
 * every package, the ones that fail them detach and leave, and the application
 * is visible again.
 */
export const AentsAiDependenciesSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const buried = beat(p, 0.14, 0.46);
  const audit = beat(p, 0.5, 0.62);
  const cleared = beat(p, 0.66, 0.8);
  const verdict = beat(p, 0.86, 0.94);

  const centreX = STAGE / 2;
  const centreY = 210;
  const radius = 152;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="CADA PAQUETE PESA" title="Antes de instalarla, pregúntate" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        <Halo color={`${tokens.accent}55`} size={420} x={centreX} y={centreY} strength={0.5} />

        {/* The application: covered while the packages pile on, whole again after. */}
        <div
          style={{
            position: 'absolute',
            left: centreX - 78,
            top: centreY - 52,
            width: 156,
            height: 104,
            borderRadius: 18,
            background: `linear-gradient(140deg, ${tokens.accent}, #3B2C93)`,
            border: `2px solid ${tokens.soft}`,
            boxShadow: `0 22px 56px ${tokens.accent}55`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 22,
            fontWeight: 800,
            color: palette.white,
            opacity: 1 - buried * 0.65 * (1 - cleared),
            zIndex: 1,
          }}
        >
          Tu aplicación
        </div>

        {PACKAGES.map((item, index) => {
          const dock = land(p, 0.14 + stagger(index, 0.045), 0.28 + stagger(index, 0.045));
          const leave = item.keep ? 0 : beat(p, 0.66 + stagger(index, 0.02), 0.78 + stagger(index, 0.02));
          const radians = (item.angle * Math.PI) / 180;
          const distance = mix(dock, radius + 190, radius) + leave * 320;
          const x = centreX + Math.cos(radians) * distance;
          const y = centreY + Math.sin(radians) * distance * 0.62;
          const checked = audit > 0.2 && !item.keep;
          return (
            <div
              key={item.label}
              style={{
                position: 'absolute',
                left: x - item.size / 2,
                top: y - item.size / 4,
                width: item.size,
                height: item.size / 2,
                borderRadius: 12,
                background: item.keep && cleared > 0.4 ? 'rgba(34,197,94,.16)' : 'rgba(255,255,255,.08)',
                border: `2px solid ${item.keep && cleared > 0.4 ? `${tokens.confirm}99` : checked ? `${tokens.alert}99` : 'rgba(255,255,255,.2)'}`,
                display: 'grid',
                placeItems: 'center',
                opacity: dock * (1 - leave),
                transform: `scale(${0.8 + dock * 0.2})`,
                zIndex: 2,
              }}
            >
              <BoxedText text={item.label} width={item.size - 20} max={19} min={12} style={{fontWeight: 800, color: 'rgba(255,255,255,.88)'}} />
            </div>
          );
        })}

        {/* The three questions every package has to pass. */}
        <div style={{position: 'absolute', left: 0, bottom: 62, width: STAGE, display: 'flex', gap: 10, opacity: audit}}>
          {['¿La necesito?', '¿Está mantenida?', '¿Es proporcional?'].map((question, index) => (
            <div
              key={question}
              style={{
                flex: 1,
                padding: '12px 10px',
                borderRadius: 12,
                textAlign: 'center',
                background: 'rgba(255,255,255,.06)',
                border: `2px solid ${tokens.soft}55`,
                opacity: beat(p, 0.5 + stagger(index, 0.035), 0.6 + stagger(index, 0.035)),
              }}
            >
              <BoxedText text={question} width={STAGE / 3 - 40} max={19} min={13} style={{fontWeight: 800, color: 'rgba(255,255,255,.9)'}} />
            </div>
          ))}
        </div>

        <Closing text="Cada dependencia es una decisión" opacity={verdict} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 8 · Hiding the button is not closing the door.
 * ------------------------------------------------------------------ */

const SECURITY_LAYERS = ['Acceso', 'Permisos', 'Validación'] as const;

/**
 * Initial state: a screen with an administrator button. Question: is removing
 * it enough? Action: the button is taken out and, from outside the interface, a
 * request travels straight to the server, which serves it. Proof: the same
 * request is sent again after the layers are closed around the server, and this
 * time it is refused with a reason.
 */
export const AentsAiSecuritySim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const hidden = beat(p, 0.1, 0.2);
  const looksSafe = passing(p, 0.2, 0.26, 0.34);
  const attack = ramp(p, 0.3, 0.44, 0, 1);
  const leak = beat(p, 0.44, 0.52);
  const layers = beat(p, 0.58, 0.72);
  const retry = ramp(p, 0.76, 0.88, 0, 1);
  const refused = beat(p, 0.86, 0.94);

  const screenWidth = 260;
  const serverX = STAGE - 150;
  const serverY = 300;
  const requestX = mix(retry > 0 ? retry : attack, 12, serverX - (retry > 0 ? 112 : 74));

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="DESDE LA ARQUITECTURA" title="Esconder no es proteger" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* The interface, and the button that stops being drawn. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: screenWidth,
            borderRadius: 16,
            background: paper,
            border: `2px solid ${rule}`,
            overflow: 'hidden',
            boxShadow: '0 22px 52px rgba(0,0,0,.45)',
          }}
        >
          <div style={{height: 30, background: tokens.accent}} />
          <div style={{padding: 12, display: 'grid', gap: 9}}>
            {[0, 1, 2].map((row) => (
              <div key={row} style={{height: 14, borderRadius: 99, background: '#E6EBF3'}} />
            ))}
            <div
              style={{
                marginTop: 4,
                height: 36,
                borderRadius: 10,
                background: tokens.alert,
                color: '#3B2600',
                fontSize: 16,
                fontWeight: 800,
                display: 'grid',
                placeItems: 'center',
                opacity: 1 - hidden,
                transform: `scale(${1 - hidden * 0.3})`,
              }}
            >
              Panel de administrador
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 208,
            width: screenWidth,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: 'rgba(255,255,255,.6)',
            opacity: looksSafe,
          }}
        >
          Parece seguro
        </div>

        {/* The server, and the layers that arrive late. */}
        {SECURITY_LAYERS.map((layer, index) => {
          const close = beat(p, 0.58 + stagger(index, 0.05), 0.7 + stagger(index, 0.05));
          const size = 132 + (SECURITY_LAYERS.length - index) * 42;
          return (
            <div
              key={layer}
              style={{
                position: 'absolute',
                left: serverX - size / 2,
                top: serverY - size / 2,
                width: size,
                height: size,
                borderRadius: 34,
                border: `3px solid ${index === 1 ? tokens.confirm : `${tokens.soft}88`}`,
                opacity: close * 0.9,
                transform: `scale(${mix(close, 1.25, 1)})`,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: -15,
                  transform: 'translateX(-50%)',
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: '#101128',
                  fontSize: 16,
                  fontWeight: 800,
                  color: index === 1 ? tokens.confirm : tokens.soft,
                  whiteSpace: 'nowrap',
                }}
              >
                {layer}
              </span>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: serverX - 62,
            top: serverY - 52,
            width: 124,
            height: 104,
            borderRadius: 16,
            background: 'linear-gradient(160deg,#1B1D3A,#0D0E1F)',
            border: `2px solid ${leak > 0.4 && layers < 0.2 ? tokens.alert : `${tokens.soft}66`}`,
            boxShadow: leak > 0.4 && layers < 0.2 ? `0 0 42px ${tokens.alert}66` : '0 18px 44px rgba(0,0,0,.45)',
            display: 'grid',
            placeItems: 'center',
            gap: 6,
          }}
        >
          <span style={{fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.86)'}}>Servidor</span>
          <span style={{width: 54, height: 6, borderRadius: 99, background: 'rgba(255,255,255,.24)'}} />
        </div>

        {/* The request that never touched the interface. */}
        <div
          style={{
            position: 'absolute',
            left: requestX,
            top: serverY - 18,
            padding: '8px 12px',
            borderRadius: 10,
            background: refused > 0.4 ? `${tokens.alert}` : 'rgba(255,255,255,.9)',
            color: ink,
            fontSize: 16,
            fontWeight: 800,
            opacity: (attack > 0 ? 1 : 0) * (1 - beat(p, 0.5, 0.58) * (1 - retry)),
            boxShadow: '0 14px 30px rgba(0,0,0,.45)',
            transform: `translateX(${refused * -46}px)`,
          }}
        >
          {refused > 0.4 ? 'Sin permiso' : 'Petición directa'}
        </div>

        {/* What came out the first time. */}
        <div
          style={{
            position: 'absolute',
            left: serverX - 40,
            top: serverY + 86,
            padding: '8px 12px',
            borderRadius: 10,
            background: `${tokens.alert}22`,
            border: `2px solid ${tokens.alert}`,
            fontSize: 17,
            fontWeight: 800,
            color: palette.white,
            opacity: leak * (1 - layers),
            transform: `translateY(${leak * 14}px)`,
          }}
        >
          Datos entregados
        </div>

        <Closing text="Se comprueba en el servidor" opacity={beat(p, 0.9, 0.97)} tokens={tokens} width={600} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 9 · What you paste is what you hand over.
 * ------------------------------------------------------------------ */

const SECRETS = [
  {label: 'contraseña', after: 'variable de entorno', keep: true},
  {label: 'clave de acceso', after: 'valor oculto', keep: true},
  {label: 'clientes.xlsx', after: 'datos tapados', keep: true},
  {label: 'base de datos', after: '', keep: false},
] as const;

/**
 * Initial state: four files on their way into a conversation. Question: what
 * exactly is being handed over? Action: a barrier stops them and each one is
 * dealt with — two become references, one is covered and one does not travel.
 * Proof: what finally goes through is the code with no secrets inside it.
 */
export const AentsAiSecretsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const travel = ramp(p, 0.08, 0.3, 0, 1);
  const barrier = land(p, 0.26, 0.36);
  const impact = passing(p, 0.32, 0.36, 0.44);
  const transform = beat(p, 0.46, 0.72);
  const lowered = beat(p, 0.76, 0.84);
  const passed = ramp(p, 0.8, 0.92, 0, 1);
  const verdict = beat(p, 0.9, 0.97);

  const barrierX = 330;
  const windowX = STAGE - 190;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="ANTES DE PEGAR" title="Piensa qué estás entregando" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* The conversation window everything is heading towards. */}
        <div
          style={{
            position: 'absolute',
            left: windowX,
            top: 40,
            width: 180,
            height: 300,
            borderRadius: 16,
            background: 'linear-gradient(160deg,#14162B,#0C0D1C)',
            border: `2px solid ${tokens.soft}44`,
            padding: 12,
            boxSizing: 'border-box',
            display: 'grid',
            gap: 8,
            alignContent: 'start',
          }}
        >
          <span style={{fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,.44)', letterSpacing: '.06em'}}>HERRAMIENTA DE IA</span>
          {[0, 1, 2].map((row) => (
            <div key={row} style={{height: 10, borderRadius: 99, background: 'rgba(255,255,255,.12)'}} />
          ))}
          <div
            style={{
              marginTop: 8,
              padding: '10px 10px',
              borderRadius: 10,
              background: `${tokens.confirm}22`,
              border: `2px solid ${tokens.confirm}88`,
              fontSize: 15,
              fontWeight: 800,
              color: palette.white,
              opacity: passed,
            }}
          >
            Código sin secretos
          </div>
        </div>

        {/* The barrier: it arrives with weight and everything stacks against it. */}
        <div
          style={{
            position: 'absolute',
            left: barrierX,
            top: mix(lowered, 10, 210),
            width: 10,
            height: mix(lowered, 320, 40),
            borderRadius: 99,
            background: `linear-gradient(180deg, ${tokens.alert}, ${tokens.alert}44)`,
            boxShadow: `0 0 30px ${tokens.alert}77`,
            opacity: barrier,
          }}
        />

        {SECRETS.map((item, index) => {
          const lane = 18 + index * 74;
          const done = beat(p, 0.46 + stagger(index, 0.05), 0.62 + stagger(index, 0.05));
          const leaving = item.keep ? 0 : beat(p, 0.64, 0.76);
          const x = mix(travel, -160 - index * 40, barrierX - 178 - (index % 2) * 14) + impact * -12;
          return (
            <div
              key={item.label}
              style={{
                position: 'absolute',
                left: x,
                top: lane,
                width: 168,
                padding: '11px 12px',
                borderRadius: 12,
                background: done > 0.5 ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.14)',
                border: `2px solid ${done > 0.5 ? `${tokens.confirm}88` : `${tokens.alert}88`}`,
                opacity: (1 - leaving) * clamp01(travel * 3),
                transform: `translateY(${leaving * 180}px) rotate(${leaving * 12}deg)`,
              }}
            >
              <BoxedText
                text={done > 0.5 && item.after ? item.after : item.label}
                width={148}
                max={19}
                min={13}
                style={{fontWeight: 800, color: palette.white}}
              />
              <div style={{marginTop: 6, display: 'flex', gap: 4}}>
                {Array.from({length: 6}).map((_, dot) => (
                  <span
                    key={dot}
                    style={{
                      width: 12,
                      height: 6,
                      borderRadius: 99,
                      background: done > 0.5 ? 'rgba(255,255,255,.32)' : `${tokens.alert}`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <Closing text="Piensa antes de compartir" opacity={verdict} tokens={tokens} width={560} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 10 · Make it break its own work.
 * ------------------------------------------------------------------ */

const CASES = ['vacío', 'negativo', 'duplicado', 'muy largo', 'sin permiso'] as const;

/**
 * Initial state: a finished feature with its tick. Question: does it hold? Action:
 * the same model changes role and fires five cases at it; four pass and one
 * fails. Proof: instead of patching where it broke, the trace goes down to the
 * function that caused it, the cause is fixed and the whole battery runs green.
 */
export const AentsAiTestsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const built = land(p, 0.04, 0.14);
  const role = beat(p, 0.18, 0.26);
  const firing = beat(p, 0.26, 0.5);
  const failed = beat(p, 0.46, 0.52);
  const descend = ramp(p, 0.54, 0.66, 0, 1);
  const fixed = beat(p, 0.7, 0.78);
  const rerun = beat(p, 0.8, 0.92);
  const verdict = beat(p, 0.92, 0.98);

  const cardWidth = 300;
  const failingIndex = 3;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="DESPUÉS DE IMPLEMENTAR" title="Pídele que intente romperlo" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* The role it is playing, flipped rather than faded. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            padding: '9px 16px',
            borderRadius: 99,
            background: role > 0.5 ? `${tokens.accent}` : 'rgba(255,255,255,.08)',
            border: `2px solid ${role > 0.5 ? tokens.soft : 'rgba(255,255,255,.2)'}`,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: '.08em',
            color: palette.white,
            transform: `perspective(600px) rotateX(${Math.sin(beat(p, 0.18, 0.26) * Math.PI) * 70}deg)`,
          }}
        >
          {role > 0.5 ? 'PROBAR' : 'CONSTRUIR'}
        </div>

        {/* The feature under test. */}
        <div
          style={{
            position: 'absolute',
            left: STAGE / 2 - cardWidth / 2,
            top: mix(descend, 74, 40),
            width: cardWidth,
            borderRadius: 16,
            background: 'linear-gradient(160deg, rgba(255,255,255,.1), rgba(255,255,255,.03))',
            border: `2px solid ${failed > 0.5 && fixed < 0.5 ? tokens.alert : `${tokens.soft}55`}`,
            boxShadow: '0 20px 48px rgba(0,0,0,.4)',
            padding: 14,
            boxSizing: 'border-box',
            opacity: built,
            transform: `scale(${mix(descend, 1, 0.86)})`,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{fontSize: 21, fontWeight: 800, color: palette.white}}>Reservar cita</span>
            <span style={{marginLeft: 'auto'}}>
              {failed > 0.5 && fixed < 0.5 ? <Cross size={22} color={tokens.alert} /> : <Tick size={22} color={tokens.confirm} />}
            </span>
          </div>
          <div style={{marginTop: 12, display: 'grid', gap: 8}}>
            {[0, 1, 2].map((line) => (
              <CodeLine key={line} seed={line} width={cardWidth - 44} progress={1} tokens={tokens} />
            ))}
          </div>
        </div>

        {/* The battery. Each case travels to the card and comes back with a verdict. */}
        <div style={{position: 'absolute', left: 0, top: 250, width: STAGE, display: 'flex', gap: 8}}>
          {CASES.map((label, index) => {
            const fire = beat(p, 0.26 + stagger(index, 0.04), 0.34 + stagger(index, 0.04));
            const isFailing = index === failingIndex;
            const green = rerun > 0.5 || (!isFailing && fire > 0.8);
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  padding: '11px 6px',
                  borderRadius: 12,
                  textAlign: 'center',
                  background: green ? 'rgba(34,197,94,.14)' : isFailing && fire > 0.8 ? 'rgba(245,158,11,.16)' : 'rgba(255,255,255,.05)',
                  border: `2px solid ${green ? `${tokens.confirm}88` : isFailing && fire > 0.8 ? tokens.alert : 'rgba(255,255,255,.14)'}`,
                  opacity: 0.4 + fire * 0.6,
                  transform: `translateY(${(1 - fire) * -18}px)`,
                }}
              >
                <BoxedText text={label} width={STAGE / 5 - 30} max={17} min={12} style={{fontWeight: 800, color: 'rgba(255,255,255,.9)'}} />
                <div style={{marginTop: 6, display: 'grid', placeItems: 'center', height: 22, opacity: fire}}>
                  {green ? <Tick size={20} color={tokens.confirm} /> : isFailing ? <Cross size={20} color={tokens.alert} /> : <Tick size={20} color={tokens.confirm} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Down to the cause, instead of patching where it showed. */}
        <svg width={STAGE} height={STAGE_HEIGHT} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
          <Trace
            from={{x: STAGE * 0.7, y: 300}}
            to={{x: STAGE * 0.5, y: 352}}
            progress={descend}
            color={tokens.alert}
            width={4}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: STAGE / 2 - 170,
            top: 352,
            width: 340,
            padding: '12px 14px',
            borderRadius: 14,
            background: fixed > 0.5 ? 'rgba(34,197,94,.12)' : 'rgba(245,158,11,.14)',
            border: `2px solid ${fixed > 0.5 ? `${tokens.confirm}88` : tokens.alert}`,
            opacity: descend,
          }}
        >
          <span style={{fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.7)', letterSpacing: '.06em'}}>
            {fixed > 0.5 ? 'CAUSA CORREGIDA' : 'CAUSA'}
          </span>
          <BoxedText
            text={fixed > 0.5 ? 'La fecha se valida al guardar' : 'La fecha nunca se validaba'}
            width={310}
            max={22}
            min={15}
            lines={2}
            style={{marginTop: 4, fontWeight: 800, color: palette.white}}
          />
        </div>

        <Closing text="Entiende la causa, no tapes el síntoma" opacity={verdict} tokens={tokens} width={640} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 11 · Fast forward is only safe with a way back.
 * ------------------------------------------------------------------ */

/** Where the saved points sit on the timeline, before and after the lesson. */
const SPARSE_POINTS = [0.06, 0.2];
const DENSE_POINTS = [0.06, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9];

/**
 * Initial state: code being rewritten and a counter of touched files climbing.
 * Question: what happens when something that worked yesterday stops working?
 * Action: the app fails, the timeline shows how far the last stable point is,
 * and the project is taken back to it. Proof: the same run with small saved
 * points costs one step back instead of everything since the morning.
 */
export const AentsAiGitSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const touched = Math.round(ramp(p, 0.04, 0.3, 0, 48));
  const broke = beat(p, 0.32, 0.38);
  const timeline = beat(p, 0.4, 0.48);
  const rewind = ramp(p, 0.52, 0.66, 0, 1);
  const recovered = beat(p, 0.66, 0.74);
  const dense = beat(p, 0.78, 0.88);
  const verdict = beat(p, 0.9, 0.97);

  const trackWidth = STAGE - 40;
  const points = dense > 0.4 ? DENSE_POINTS : SPARSE_POINTS;
  const headAt = dense > 0.4 ? 0.9 : mix(rewind, 0.94, SPARSE_POINTS[1]);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="CONTROL DE VERSIONES" title="Avanza rápido, pero puedes volver" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        {/* What changed, and the moment it stopped opening. */}
        <div style={{position: 'absolute', left: 0, top: 0, width: 300}}>
          <Editor
            width={300}
            height={210}
            lines={8}
            written={ramp(p, 0.04, 0.3, 0, 1)}
            tokens={tokens}
            alertLine={broke > 0.4 && recovered < 0.4 ? 4 : undefined}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 18,
              border: `3px solid ${tokens.alert}`,
              background: `${tokens.alert}1F`,
              display: 'grid',
              placeItems: 'center',
              opacity: broke * (1 - recovered),
            }}
          >
            <span style={{fontSize: 30, fontWeight: 800, color: palette.white, letterSpacing: '.08em'}}>NO ABRE</span>
          </div>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 18,
              border: `3px solid ${tokens.confirm}`,
              background: 'rgba(34,197,94,.14)',
              display: 'grid',
              placeItems: 'center',
              gap: 8,
              opacity: recovered * (1 - beat(p, 0.8, 0.86)),
            }}
          >
            <Tick size={42} color={tokens.confirm} />
            <span style={{fontSize: 22, fontWeight: 800, color: palette.white}}>Vuelve a abrir</span>
          </div>
        </div>

        {/* The counter: staging, never a measurement, and never spoken. */}
        <div style={{position: 'absolute', right: 0, top: 24, width: STAGE - 340, textAlign: 'center'}}>
          <div style={{fontSize: 92, fontWeight: 800, color: palette.white, lineHeight: 1, ...figures}}>{touched}</div>
          <div style={{marginTop: 6, fontSize: 21, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.56)'}}>
            ARCHIVOS MODIFICADOS
          </div>
        </div>

        {/* The line of saved points, and the head that travels along it. */}
        <div style={{position: 'absolute', left: 20, top: 300, width: trackWidth, opacity: timeline}}>
          <div style={{position: 'relative', height: 8, borderRadius: 99, background: 'rgba(255,255,255,.14)'}}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: 8,
                borderRadius: 99,
                width: `${headAt * 100}%`,
                background: `linear-gradient(90deg, ${tokens.soft}, ${tokens.accent})`,
              }}
            />
            {points.map((at, index) => (
              <div
                key={at}
                style={{
                  position: 'absolute',
                  left: `${at * 100}%`,
                  top: -9,
                  width: 26,
                  height: 26,
                  marginLeft: -13,
                  borderRadius: 99,
                  background: '#101128',
                  border: `3px solid ${tokens.confirm}`,
                  opacity: dense > 0.4 ? beat(p, 0.78 + stagger(index, 0.016), 0.86 + stagger(index, 0.016)) : 1,
                }}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                left: `${headAt * 100}%`,
                top: -22,
                marginLeft: -20,
                width: 40,
                height: 52,
                borderRadius: 12,
                background: tokens.accent,
                boxShadow: `0 12px 30px ${tokens.accent}66`,
                display: 'grid',
                placeItems: 'center',
                fontSize: 15,
                fontWeight: 800,
                color: palette.white,
              }}
            >
              hoy
            </div>
          </div>
          <div style={{marginTop: 26, display: 'flex', justifyContent: 'space-between'}}>
            <span style={{fontSize: 19, fontWeight: 800, color: tokens.confirm}}>Último punto estable</span>
            <span style={{fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.5)', opacity: dense}}>
              Cambios pequeños y seguidos
            </span>
          </div>
        </div>

        <Closing text="Guarda seguido para poder volver" opacity={verdict} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 12 · Generating is easy. Keeping it is the work.
 * ------------------------------------------------------------------ */

/** The project as it grows: six honest files and everything that piles on after. */
const NODES = [
  {x: 0.12, y: 0.16, at: 0, group: 0},
  {x: 0.34, y: 0.1, at: 0, group: 0},
  {x: 0.6, y: 0.18, at: 0, group: 1},
  {x: 0.84, y: 0.12, at: 0, group: 1},
  {x: 0.2, y: 0.46, at: 0, group: 2},
  {x: 0.5, y: 0.44, at: 0, group: 2},
  {x: 0.76, y: 0.5, at: 0.12, group: 1, twin: 2},
  {x: 0.08, y: 0.66, at: 0.16, group: 2},
  {x: 0.38, y: 0.72, at: 0.2, group: 0, twin: 1},
  {x: 0.64, y: 0.78, at: 0.24, group: 2},
  {x: 0.9, y: 0.66, at: 0.28, group: 1},
  {x: 0.26, y: 0.9, at: 0.32, group: 0},
  {x: 0.54, y: 0.94, at: 0.34, group: 2},
  {x: 0.82, y: 0.92, at: 0.36, group: 1},
] as const;

/**
 * Initial state: six files anyone could hold in their head. Question: what does
 * a project look like after six weeks of generating? Action: files multiply,
 * links tangle, two pairs turn out to be almost the same and a read of the
 * project loses its way twice. Proof: the duplicates merge, the rest groups into
 * three named folders and the same read crosses it in one pass.
 */
export const AentsAiOrderSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const grow = beat(p, 0.08, 0.44);
  const tangled = beat(p, 0.3, 0.5);
  const lostFirst = passing(p, 0.44, 0.5, 0.56);
  const lostSecond = passing(p, 0.52, 0.57, 0.63);
  const refactor = beat(p, 0.64, 0.7);
  const tidy = ramp(p, 0.66, 0.84, 0, 1);
  const read = beat(p, 0.86, 0.96);

  const width = STAGE;
  const height = 360;
  const groupX = [0.18, 0.5, 0.82];

  const place = (node: (typeof NODES)[number], index: number) => {
    const tidyX = groupX[node.group] * width;
    const tidyY = 60 + (index % 4) * 58;
    return {
      x: mix(tidy, node.x * (width - 60) + 30, tidyX),
      y: mix(tidy, node.y * (height - 60) + 30, tidyY),
    };
  };

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="CADA CIERTO TIEMPO" title="Detente y vuelve a ordenar" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0}}>
          {/* The web: every node linked to the two before it. */}
          {NODES.map((node, index) => {
            if (index < 2) return null;
            const here = place(node, index);
            const there = place(NODES[index - 2], index - 2);
            const shown = beat(p, node.at + 0.08, node.at + 0.2) * (1 - tidy * (index % 3 === 0 ? 1 : 0.2));
            return (
              <line
                key={`link-${index}`}
                x1={here.x}
                y1={here.y}
                x2={there.x}
                y2={there.y}
                stroke={`${tokens.soft}${index % 3 === 0 ? '55' : '30'}`}
                strokeWidth={2}
                opacity={shown * (0.3 + tangled * 0.7)}
              />
            );
          })}
          {/* Two attempts to read the project, each ending nowhere. */}
          <Trace from={{x: 30, y: 320}} to={{x: 250, y: 120}} progress={lostFirst} color={tokens.alert} width={4} />
          <Trace from={{x: 250, y: 120}} to={{x: 470, y: 300}} progress={lostSecond} color={tokens.alert} width={4} />
          {/* And the read that crosses once everything is grouped. */}
          <Trace from={{x: groupX[0] * width, y: 70}} to={{x: groupX[2] * width, y: 256}} progress={read} color={tokens.confirm} width={5} />
        </svg>

        {NODES.map((node, index) => {
          const born = land(p, node.at + 0.06, node.at + 0.16);
          const twin = 'twin' in node ? (node as {twin?: number}).twin : undefined;
          const isTwin = twin !== undefined;
          const merged = isTwin ? beat(p, 0.68, 0.78) : 0;
          const here = place(node, index);
          return (
            <div
              key={`node-${index}`}
              style={{
                position: 'absolute',
                left: here.x - 24,
                top: here.y - 16,
                width: 48,
                height: 32,
                borderRadius: 8,
                background: isTwin && tangled > 0.5 && merged < 0.5 ? `${tokens.alert}26` : 'rgba(255,255,255,.09)',
                border: `2px solid ${isTwin && tangled > 0.5 && merged < 0.5 ? tokens.alert : `${tokens.soft}55`}`,
                opacity: born * (1 - merged),
                transform: `scale(${0.7 + born * 0.3})`,
              }}
            />
          );
        })}

        {/* The three groups the tidy-up leaves behind. */}
        <div style={{position: 'absolute', left: 0, top: 322, width, display: 'flex', gap: 12, opacity: tidy}}>
          {['Interfaz', 'Dominio', 'Datos'].map((label, index) => (
            <div
              key={label}
              style={{
                flex: 1,
                padding: '11px 8px',
                borderRadius: 12,
                textAlign: 'center',
                background: 'rgba(255,255,255,.06)',
                border: `2px solid ${tokens.soft}55`,
                opacity: beat(p, 0.7 + stagger(index, 0.035), 0.8 + stagger(index, 0.035)),
              }}
            >
              <BoxedText text={label} width={STAGE / 3 - 40} max={20} min={14} style={{fontWeight: 800, color: 'rgba(255,255,255,.9)'}} />
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: STAGE / 2 - 110,
            top: 150,
            width: 220,
            padding: '12px 0',
            borderRadius: 99,
            textAlign: 'center',
            background: `linear-gradient(140deg, ${tokens.accent}, #3B2C93)`,
            border: `2px solid ${tokens.soft}`,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '.08em',
            color: palette.white,
            opacity: passing(p, 0.62, 0.68, 0.78),
            transform: `scale(${0.9 + refactor * 0.1})`,
          }}
        >
          REORDENAR
        </div>

        <Closing text="Mantener es el verdadero trabajo" opacity={beat(p, 0.9, 0.97)} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 13 · It knows programming. It does not know your business.
 * ------------------------------------------------------------------ */

const BUILT_PIECES = [
  {label: 'Código', x: 0.5, y: 0.06},
  {label: 'Interfaz', x: 0.1, y: 0.5},
  {label: 'Base de datos', x: 0.9, y: 0.5},
] as const;

const BUSINESS_PIECES = ['Reglas', 'Roles', 'Proceso', 'Objetivo'] as const;

/**
 * Initial state: three well-built pieces around an empty middle. Question: who
 * approves? Action: the button exists, is pressed, and the flow stops at the
 * gap because nothing there can answer it. Proof: a person fills the middle with
 * the rules, the roles, the process and the goal; the flow completes, and the
 * wheel stays in a human hand while the model does the accelerating.
 */
export const AentsAiJudgementSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const placed = beat(p, 0.04, 0.22);
  const pressed = passing(p, 0.26, 0.3, 0.36);
  const stalled = beat(p, 0.32, 0.4);
  const filled = beat(p, 0.46, 0.66);
  const connected = beat(p, 0.66, 0.78);
  const wheel = beat(p, 0.82, 0.9);
  const wheelOut = beat(p, 0.78, 0.84);

  const width = STAGE;
  const height = 340;
  const centreX = width / 2;
  const centreY = 168;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="LO QUE NO REEMPLAZA" title="Sabe programar. No sabe tu negocio" push={p}>
      <div style={{position: 'relative', marginTop: 18, height: STAGE_HEIGHT}}>
        <div style={{opacity: 1 - wheelOut}}>
          <svg width={width} height={height} style={{position: 'absolute', left: 0, top: 0}}>
            {BUILT_PIECES.map((piece, index) => (
              <Trace
                key={piece.label}
                from={{x: piece.x * (width - 120) + 60, y: piece.y * (height - 80) + 40}}
                to={{x: centreX, y: centreY}}
                progress={beat(p, 0.66 + stagger(index, 0.035), 0.78 + stagger(index, 0.035))}
                color={tokens.confirm}
                width={4}
              />
            ))}
          </svg>

          {BUILT_PIECES.map((piece, index) => {
            const show = land(p, 0.04 + stagger(index, 0.05), 0.18 + stagger(index, 0.05));
            return (
              <div
                key={piece.label}
                style={{
                  position: 'absolute',
                  left: piece.x * (width - 120) + 60 - 76,
                  top: piece.y * (height - 80) + 40 - 26,
                  width: 152,
                  padding: '12px 8px',
                  borderRadius: 14,
                  textAlign: 'center',
                  background: 'linear-gradient(160deg, rgba(255,255,255,.11), rgba(255,255,255,.03))',
                  border: `2px solid ${tokens.soft}66`,
                  boxShadow: '0 16px 40px rgba(0,0,0,.4)',
                  opacity: show * placed,
                  transform: `scale(${0.86 + show * 0.14})`,
                }}
              >
                <BoxedText text={piece.label} width={132} max={21} min={14} style={{fontWeight: 800, color: palette.white}} />
              </div>
            );
          })}

          {/* The middle: empty first, and then filled by someone who knows. */}
          <div
            style={{
              position: 'absolute',
              left: centreX - 96,
              top: centreY - 62,
              width: 192,
              height: 124,
              borderRadius: 18,
              border: `3px ${filled > 0.4 ? 'solid' : 'dashed'} ${filled > 0.4 ? tokens.accent : 'rgba(255,255,255,.3)'}`,
              background: filled > 0.4 ? `linear-gradient(140deg, ${tokens.accent}, #3B2C93)` : 'transparent',
              boxShadow: filled > 0.4 ? `0 22px 56px ${tokens.accent}55` : 'none',
              display: 'grid',
              placeItems: 'center',
              alignContent: 'center',
              gap: 6,
            }}
          >
            <span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: palette.white}}>NEGOCIO</span>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', padding: '0 8px'}}>
              {BUSINESS_PIECES.map((label, index) => (
                <span
                  key={label}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 99,
                    background: 'rgba(255,255,255,.18)',
                    fontSize: 15,
                    fontWeight: 800,
                    color: palette.white,
                    opacity: beat(p, 0.46 + stagger(index, 0.04), 0.58 + stagger(index, 0.04)),
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* The button that exists, and the question it cannot answer alone. */}
          <div
            style={{
              position: 'absolute',
              left: 24,
              top: 246,
              padding: '10px 18px',
              borderRadius: 10,
              background: tokens.accent,
              color: palette.white,
              fontSize: 19,
              fontWeight: 800,
              opacity: placed,
              transform: `scale(${1 - pressed * 0.06})`,
            }}
          >
            Aprobar
          </div>
          <div
            style={{
              position: 'absolute',
              left: 150,
              top: 244,
              padding: '10px 14px',
              borderRadius: 12,
              background: connected > 0.5 ? 'rgba(34,197,94,.14)' : 'rgba(245,158,11,.16)',
              border: `2px solid ${connected > 0.5 ? `${tokens.confirm}88` : tokens.alert}`,
              fontSize: 18,
              fontWeight: 800,
              color: palette.white,
              opacity: Math.max(stalled, connected),
            }}
          >
            {connected > 0.5 ? 'Aprueba quien tú decidas' : '¿Quién debería aprobar?'}
          </div>
        </div>

        {/* The wheel: it accelerates, the hand steers. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 40,
            width: STAGE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 26,
            opacity: wheelOut,
          }}
        >
          <div style={{position: 'relative', width: 200, height: 200}}>
            <Halo color={`${tokens.accent}66`} size={300} x={100} y={100} strength={0.55} />
            <svg width={200} height={200} viewBox="0 0 200 200" style={{position: 'relative'}}>
              <circle cx="100" cy="100" r="82" stroke={palette.white} strokeWidth="10" fill="none" opacity={0.9} />
              <circle cx="100" cy="100" r="26" fill={tokens.accent} />
              {[0, 120, 240].map((angle) => (
                <line
                  key={angle}
                  x1="100"
                  y1="100"
                  x2={100 + Math.cos((angle * Math.PI) / 180) * 78}
                  y2={100 + Math.sin((angle * Math.PI) / 180) * 78}
                  stroke={palette.white}
                  strokeWidth="9"
                  opacity={0.85}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div
              style={{
                position: 'absolute',
                left: 118,
                top: 24,
                padding: '7px 12px',
                borderRadius: 99,
                background: palette.white,
                color: ink,
                fontSize: 17,
                fontWeight: 800,
                opacity: wheel,
                transform: `translateY(${(1 - wheel) * -14}px)`,
              }}
            >
              tu mano
            </div>
          </div>
          <div style={{display: 'grid', gap: 12, width: 250}}>
            <div
              style={{
                padding: '13px 14px',
                borderRadius: 14,
                background: `${tokens.accent}26`,
                border: `2px solid ${tokens.accent}`,
                opacity: wheel,
              }}
            >
              <BoxedText text="La IA acelera" width={220} max={24} min={16} style={{fontWeight: 800, color: palette.white}} />
            </div>
            <div
              style={{
                padding: '13px 14px',
                borderRadius: 14,
                background: 'rgba(255,255,255,.06)',
                border: `2px solid ${tokens.soft}66`,
                opacity: beat(p, 0.86, 0.94),
              }}
            >
              <BoxedText text="Tú decides el rumbo" width={220} max={24} min={16} style={{fontWeight: 800, color: palette.white}} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 14 · The order the whole lesson was in.
 * ------------------------------------------------------------------ */

const PATH_STEPS = [
  'CONTEXTO',
  'REGLAS',
  'ARQUITECTURA',
  'DESARROLLO',
  'PRUEBAS',
  'SEGURIDAD',
  'PRODUCTO',
] as const;

/**
 * The closing scene owns the whole frame: `scene.tsx` draws no headline, no
 * captions and no outro over a simulation in the final beat, so the brand block,
 * the invitation and the domain have to live here.
 *
 * Initial state: the ideas of the lesson, scattered. Action: they order
 * themselves into a rising path and each step lights the next. Proof: the path
 * arrives at the product, collapses into the mark, and what stays on screen is
 * who to talk to and where.
 */
export const AentsAiClosingSim: React.FC<SimulationProps> = ({
  frame,
  total,
  brandId,
  brandName,
  brandTile,
  brandDomain,
}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const mark = spring({frame: frame - Math.round(span * 0.6), fps, config: {damping: 16, mass: 0.75}});

  const gathered = beat(p, 0.04, 0.3);
  const pathOut = beat(p, 0.56, 0.64);
  const name = beat(p, 0.64, 0.72);
  const invite = beat(p, 0.72, 0.8);
  const address = beat(p, 0.78, 0.86);

  const left = 150;
  const stepWidth = 460;
  const top = 470;
  const rise = 84;

  return (
    <Field tokens={tokens} push={p}>
      <Halo color={`${tokens.accent}66`} size={900} x={540} y={760} strength={0.5} />

      {/* The path: seven steps, each one lit by the one before it. */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - pathOut}}>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          {PATH_STEPS.map((step, index) => {
            if (index === 0) return null;
            const from = {x: left + 60 + (index - 1) * 26, y: top + (PATH_STEPS.length - index) * rise + 30};
            const to = {x: left + 60 + index * 26, y: top + (PATH_STEPS.length - 1 - index) * rise + 30};
            return (
              <Trace
                key={step}
                from={from}
                to={to}
                progress={beat(p, 0.1 + stagger(index, 0.055), 0.2 + stagger(index, 0.055))}
                color={`${tokens.soft}AA`}
                width={4}
              />
            );
          })}
        </svg>
        {PATH_STEPS.map((step, index) => {
          const arrive = land(p, 0.08 + stagger(index, 0.055), 0.2 + stagger(index, 0.055));
          const last = index === PATH_STEPS.length - 1;
          return (
            <div
              key={step}
              style={{
                position: 'absolute',
                left: left + index * 26,
                top: top + (PATH_STEPS.length - 1 - index) * rise,
                width: stepWidth,
                boxSizing: 'border-box',
                padding: '16px 24px',
                borderRadius: 18,
                background: last
                  ? `linear-gradient(140deg, ${tokens.accent}, #3B2C93)`
                  : 'linear-gradient(160deg, rgba(255,255,255,.1), rgba(255,255,255,.03))',
                border: `2px solid ${last ? tokens.soft : `${tokens.soft}55`}`,
                boxShadow: last ? `0 26px 64px ${tokens.accent}55` : '0 16px 40px rgba(0,0,0,.4)',
                opacity: arrive * gathered,
                transform: `translateX(${(1 - arrive) * -40}px)`,
              }}
            >
              <span style={{fontSize: 34, fontWeight: 800, letterSpacing: '.04em', color: palette.white}}>{step}</span>
            </div>
          );
        })}
      </div>

      {/* The mark, the invitation and the address. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 520,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: pathOut,
        }}
      >
        {brandTile ? (
          <Img
            src={staticFile(brandTile)}
            style={{
              width: 200,
              height: 200,
              borderRadius: 54,
              boxShadow: `0 34px 100px ${tokens.accent}88`,
              opacity: clamp01(mark),
              transform: `scale(${0.84 + clamp01(mark) * 0.16})`,
            }}
          />
        ) : null}
        <Reveal progress={name} style={{marginTop: 30}}>
          <div style={{fontSize: 84, fontWeight: 800, letterSpacing: '.02em', color: palette.white}}>{(brandName ?? 'Aents').toUpperCase()}</div>
        </Reveal>
        <Reveal progress={name} style={{marginTop: 6}}>
          <div style={{fontSize: 32, fontWeight: 800, color: tokens.soft}}>Software para personas.</div>
        </Reveal>

        <div style={{marginTop: 40, width: 560, textAlign: 'center', opacity: invite}}>
          <BoxedText
            text="Cuéntanos qué estás construyendo"
            width={560}
            max={54}
            min={34}
            lines={2}
            style={{fontWeight: 800, color: palette.white, letterSpacing: '-.03em'}}
          />
        </div>

        <div
          style={{
            marginTop: 34,
            padding: '18px 34px',
            borderRadius: 99,
            background: `linear-gradient(140deg, ${tokens.accent}, #3B2C93)`,
            border: `2px solid ${tokens.soft}`,
            boxShadow: `0 22px 60px ${tokens.accent}55`,
            fontSize: 34,
            fontWeight: 800,
            color: palette.white,
            opacity: address,
            transform: `translateY(${(1 - address) * 16}px)`,
          }}
        >
          {brandDomain ?? 'aents.net'}
        </div>
      </div>
    </Field>
  );
};
