import React from 'react';
import {Easing, interpolate, spring, useVideoConfig} from 'remotion';
import {BoxedText, PANEL_WIDTH, Panel, beat, figures, tokensFor} from './system-kit';
import type {BrandTokens} from './system-kit';
import {palette} from './theme';
import type {SimulationProps} from './simulations';

/**
 * «¿Diseñada para móvil o solo adaptada?»: the lesson about the difference
 * between responsive and mobile first.
 *
 * Three rules govern everything drawn here.
 *
 * The first is that the piece has to *fail* on screen before it teaches. A
 * diagram of two philosophies convinces nobody; a button the finger misses
 * twice does. So the wrong version is animated with the same care as the right
 * one, and every symptom is demonstrated rather than listed.
 *
 * The second is that the product example is real. The map that fills the phone,
 * the pill that opens search and filters, and the card that rises from the
 * bottom and can be dragged to full height or back down are what
 * `frontend/components/map/MobilePropertyDrawer.tsx` and
 * `frontend/lib/mobile-map-panel.ts` implement for Geo Propiedades Ecuador,
 * which `../../../Aents/apps/web/src/i18n.ts` lists as a product Aents builds.
 * The prices, the counter and the table rows are invented and carry the
 * `EJEMPLO` badge for as long as they are on screen.
 *
 * The third is that nothing here claims a method. The piece teaches mobile
 * first; it never says Aents practises it, because the published identity does
 * not say so.
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
const glide = (value: number, from: number, to: number, a: number, b: number) =>
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
 * The prices on the map, the counter on the pill and the rows of the table are
 * examples in exactly the sense the brief allows: they teach what a screen
 * does and report nothing about a market.
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

/** Three horizontal rules: the shape everyone reads as a menu. */
const Burger: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {[7, 12, 17].map((y) => (
      <path key={y} d={`M4 ${y}H20`} stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    ))}
  </svg>
);

/** The sliders the real launcher wears next to its counter. */
const Sliders: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="16" cy="7" r="2.4" stroke={color} strokeWidth="2.4" />
    <circle cx="10" cy="17" r="2.4" stroke={color} strokeWidth="2.4" />
  </svg>
);

const Magnifier: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="2.6" />
    <path d="M15.4 15.4L20 20" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
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
    <svg width={38} height={44} viewBox="0 0 42 48">
      <path d="M5 3 L5 40 L15 31 L22 47 L31 43 L24 28 L36 27 Z" fill={palette.white} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  </div>
);

/**
 * The finger, which hits an area rather than a point.
 *
 * The pale disc is the whole argument of `sim:aents-dedo`: a cursor is a pixel
 * and a fingertip is a coin, so the disc is drawn to scale against the buttons
 * it lands on and never shrinks to make a hit look cleaner than it was.
 */
const Finger: React.FC<{x: number; y: number; radius?: number; press?: number; opacity?: number}> = ({
  x,
  y,
  radius = 34,
  press = 0,
  opacity = 1,
}) => (
  <div style={{position: 'absolute', left: x - radius, top: y - radius, opacity, pointerEvents: 'none'}}>
    <div
      style={{
        width: radius * 2,
        height: radius * 2,
        borderRadius: 99,
        background: `rgba(255,255,255,${0.16 + press * 0.16})`,
        border: `3px solid rgba(255,255,255,${0.5 + press * 0.35})`,
        transform: `scale(${1 - press * 0.08})`,
        boxShadow: '0 12px 30px rgba(0,0,0,.35)',
      }}
    />
  </div>
);

/** The ring a press leaves behind, so a tap is seen and not only implied. */
const Ripple: React.FC<{x: number; y: number; progress: number; color: string}> = ({x, y, progress, color}) =>
  progress <= 0 || progress >= 1 ? null : (
    <div
      style={{
        position: 'absolute',
        left: x - 46,
        top: y - 46,
        width: 92,
        height: 92,
        borderRadius: 99,
        border: `4px solid ${color}`,
        opacity: (1 - progress) * 0.8,
        transform: `scale(${0.3 + progress * 0.95})`,
        pointerEvents: 'none',
      }}
    />
  );

/**
 * A phone: bezel, screen and the pill of the system bar.
 *
 * The screen clips its children on purpose — half of what this lesson has to
 * show is content that does not fit, and a mask is the only honest way to draw
 * that.
 */
const Phone: React.FC<{
  width: number;
  height: number;
  children: React.ReactNode;
  tokens: BrandTokens;
  style?: React.CSSProperties;
}> = ({width, height, children, tokens, style}) => (
  <div
    style={{
      width,
      height,
      boxSizing: 'border-box',
      padding: 9,
      borderRadius: Math.min(38, width * 0.11),
      background: bezel,
      border: `2px solid ${tokens.soft}44`,
      boxShadow: '0 30px 80px rgba(0,0,0,.55)',
      ...style,
    }}
  >
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: Math.min(30, width * 0.085),
        overflow: 'hidden',
        background: paper,
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 7,
          width: Math.min(74, width * 0.28),
          height: 8,
          marginLeft: -Math.min(37, width * 0.14),
          borderRadius: 99,
          background: 'rgba(15,21,38,.24)',
        }}
      />
    </div>
  </div>
);

/** A desktop: bezel, browser bar and a clipped viewport. */
const Desktop: React.FC<{
  width: number;
  height: number;
  children: React.ReactNode;
  tokens: BrandTokens;
  domain?: string;
  style?: React.CSSProperties;
}> = ({width, height, children, tokens, domain = 'tuempresa.com', style}) => {
  const barHeight = Math.max(22, Math.min(44, height * 0.1));
  return (
    <div
      style={{
        width,
        height,
        boxSizing: 'border-box',
        borderRadius: 22,
        overflow: 'hidden',
        background: bezel,
        border: `2px solid ${tokens.soft}44`,
        boxShadow: '0 30px 80px rgba(0,0,0,.5)',
        ...style,
      }}
    >
      <div style={{height: barHeight, display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', background: palette.white}}>
        {['#FF6B6B', '#FFD166', '#22C55E'].map((colour) => (
          <i key={colour} style={{width: 9, height: 9, borderRadius: 99, background: colour}} />
        ))}
        <div
          style={{
            marginLeft: 10,
            flex: 1,
            height: barHeight * 0.5,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRadius: 99,
            background: '#EEF1F6',
            color: muted,
            fontSize: Math.max(11, barHeight * 0.4),
            fontWeight: 800,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {domain}
        </div>
      </div>
      <div style={{position: 'relative', height: height - barHeight, overflow: 'hidden', background: paper}}>{children}</div>
    </div>
  );
};

/** The verdict chip a beat leaves behind: what worked, or what did not. */
const Verdict: React.FC<{label: string; tone: 'good' | 'bad'; opacity: number; tokens: BrandTokens; style?: React.CSSProperties}> = ({
  label,
  tone,
  opacity,
  tokens,
  style,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 18px',
      borderRadius: 99,
      background: tone === 'good' ? tokens.confirm : tokens.alert,
      color: tone === 'good' ? '#06210F' : '#231402',
      fontSize: 22,
      fontWeight: 800,
      whiteSpace: 'nowrap',
      opacity,
      boxShadow: `0 16px 40px ${tone === 'good' ? 'rgba(34,197,94,.35)' : 'rgba(245,158,11,.32)'}`,
      ...style,
    }}
  >
    {tone === 'good' ? <Tick size={22} color="#06210F" /> : <Cross size={22} color="#231402" />}
    {label}
  </div>
);

/** The line a scene closes on, on the ground rather than inside the product. */
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
 * The page every "wrong" beat shrinks: drawn once at desktop size.
 * ------------------------------------------------------------------ */

/**
 * A perfectly reasonable desktop page.
 *
 * It is drawn at one fixed width and then scaled by whoever shows it, because
 * that is precisely the mistake the first scenes are about: a layout that
 * survives by multiplying every dimension by the same number.
 */
const DESKTOP_PAGE = {width: 640, height: 360};

const DesktopPage: React.FC<{tokens: BrandTokens}> = ({tokens}) => (
  <div style={{width: DESKTOP_PAGE.width, height: DESKTOP_PAGE.height, boxSizing: 'border-box', padding: '18px 22px', background: paper, color: ink}}>
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 9}}>
        <div style={{width: 22, height: 22, borderRadius: 7, background: tokens.accent}} />
        <span style={{fontSize: 15, fontWeight: 800}}>Tu Empresa</span>
      </div>
      <div style={{display: 'flex', gap: 16}}>
        {['Inicio', 'Servicios', 'Proyectos', 'Nosotros', 'Contacto'].map((item) => (
          <span key={item} style={{fontSize: 12, fontWeight: 700, color: muted}}>
            {item}
          </span>
        ))}
      </div>
    </div>

    <div style={{marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 210px', gap: 20}}>
      <div>
        <div style={{fontSize: 26, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-.03em'}}>
          Todo lo que tu proyecto necesita, en un solo equipo.
        </div>
        <div style={{marginTop: 10, fontSize: 12, fontWeight: 600, color: muted, lineHeight: 1.45}}>
          Acompañamos cada etapa del trabajo con un equipo propio y un plan claro desde el primer día.
        </div>
        <div style={{marginTop: 14, display: 'flex', gap: 9}}>
          <div style={{padding: '7px 14px', borderRadius: 8, background: tokens.accent, color: palette.white, fontSize: 12, fontWeight: 800}}>Solicitar cotización</div>
          <div style={{padding: '7px 14px', borderRadius: 8, border: `2px solid ${rule}`, fontSize: 12, fontWeight: 800, color: muted}}>Ver proyectos</div>
        </div>
      </div>
      <div style={{borderRadius: 12, background: '#DCE3EE', border: `2px solid ${rule}`}} />
    </div>

    <div style={{marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12}}>
      {['Estrategia', 'Diseño', 'Obra', 'Entrega'].map((item) => (
        <div key={item} style={{padding: '11px 12px', borderRadius: 10, background: palette.white, border: `2px solid ${rule}`}}>
          <div style={{fontSize: 12, fontWeight: 800}}>{item}</div>
          <div style={{marginTop: 7, height: 5, borderRadius: 99, background: '#E2E7F0'}} />
          <div style={{marginTop: 5, height: 5, width: '72%', borderRadius: 99, background: '#E9EDF4'}} />
        </div>
      ))}
    </div>

    <div style={{marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: palette.white, border: `2px solid ${rule}`}}>
      <span style={{fontSize: 12, fontWeight: 800, color: muted}}>¿Conversamos sobre tu proyecto?</span>
      <span style={{padding: '6px 12px', borderRadius: 7, background: ink, color: palette.white, fontSize: 11, fontWeight: 800}}>Escríbenos</span>
    </div>
  </div>
);

/**
 * The stage, with a drawing that does not fill it centred inside it.
 *
 * The panel is a fixed 750 px tall for both brands, so a composition whose
 * subject is only 330 px high leaves a third of the card empty underneath and
 * reads as placed rather than composed. `content` is the height the drawing
 * actually uses; children keep their own coordinates inside that box.
 */
const Stage: React.FC<{content?: number; children: React.ReactNode}> = ({content = STAGE_HEIGHT, children}) => (
  <div style={{position: 'relative', marginTop: 22, height: STAGE_HEIGHT}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: Math.max(0, (STAGE_HEIGHT - content) / 2), height: content}}>
      {children}
    </div>
  </div>
);

/** Roughly where the primary button of `DesktopPage` sits, in page units. */
const DESKTOP_CTA = {x: 95, y: 206};

/**
 * One device that becomes another without a cut.
 *
 * Scene 1 is a single continuous narrowing, so it cannot swap a browser
 * component for a phone component halfway through: the chrome bar shrinks to
 * nothing, the bezel thickens and the corners round over, and the page inside
 * never moves relative to its own frame.
 */
const MorphFrame: React.FC<{
  width: number;
  height: number;
  narrow: number;
  tokens: BrandTokens;
  children: React.ReactNode;
}> = ({width, height, narrow, tokens, children}) => {
  const chrome = mix(narrow, 40, 0);
  const inset = mix(narrow, 0, 9);
  return (
    <div
      style={{
        width,
        height,
        boxSizing: 'border-box',
        padding: inset,
        borderRadius: mix(narrow, 22, 38),
        background: bezel,
        border: `2px solid ${tokens.soft}44`,
        boxShadow: '0 30px 80px rgba(0,0,0,.52)',
        overflow: 'hidden',
      }}
    >
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: mix(narrow, 6, 30), overflow: 'hidden', background: paper}}>
        <div
          style={{
            height: chrome,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '0 14px',
            background: palette.white,
            opacity: 1 - narrow,
            overflow: 'hidden',
          }}
        >
          {['#FF6B6B', '#FFD166', '#22C55E'].map((colour) => (
            <i key={colour} style={{width: 9, height: 9, borderRadius: 99, background: colour, flexShrink: 0}} />
          ))}
          <div style={{marginLeft: 10, flex: 1, height: 18, borderRadius: 99, background: '#EEF1F6'}} />
        </div>
        <div style={{position: 'relative', height: `calc(100% - ${chrome}px)`, overflow: 'hidden'}}>{children}</div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 7,
            width: 68,
            height: 8,
            marginLeft: -34,
            borderRadius: 99,
            background: 'rgba(15,21,38,.24)',
            opacity: narrow,
          }}
        />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ *
 * 1 · The same page, only smaller
 * ------------------------------------------------------------------ */

/**
 * Initial state: a page that works, on the screen it was designed for.
 * Question: what happens to it on a phone? Action: the frame narrows and the
 * layout follows by multiplication. Proof: the type is unreadable and the
 * button is smaller than the finger that has to hit it — and the piece names
 * the difference it is about before the first cut.
 */
export const AentsMobileShrinkSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  // One number drives the whole scene: the width of the frame. Everything else
  // is that width divided by the width the page was drawn for.
  const narrow = ramp(p, 0.16, 0.62, 0, 1);
  const width = mix(narrow, 700, 268);
  const height = mix(narrow, 400, 470);
  const deviceLeft = STAGE / 2 - width / 2;
  const deviceTop = 20;
  // The page lives inside the screen, not inside the frame, so the reduction is
  // measured against the screen. Dividing by the frame width printed the last
  // 18 px of the layout underneath the bezel.
  const chrome = mix(narrow, 40, 0);
  const inset = mix(narrow, 0, 9);
  const scale = (width - inset * 2) / DESKTOP_PAGE.width;

  const firstLabel = passing(p, 0.06, 0.2, 0.46);
  const secondLabel = beat(p, 0.62, 0.74);
  // The finger arrives only once the button is already too small to want.
  const touch = beat(p, 0.74, 0.9);
  // Where the page's own primary button ended up, measured through the same
  // scale the page was reduced by, so the disc lands on it and not near it.
  const targetX = deviceLeft + inset + DESKTOP_CTA.x * scale;
  const targetY = deviceTop + inset + chrome + DESKTOP_CTA.y * scale;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="LA MISMA PÁGINA" title="Se adapta, ¿pero a quién?">
      <div style={{position: 'relative', marginTop: 22, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: deviceLeft, top: deviceTop}}>
          <MorphFrame width={width} height={height} narrow={narrow} tokens={tokens}>
            <div style={{transformOrigin: '0 0', transform: `scale(${scale})`}}>
              <DesktopPage tokens={tokens} />
            </div>
          </MorphFrame>
        </div>

        {/* The finger against the button the shrink left behind. */}
        {touch > 0 ? (
          <>
            <Finger x={targetX} y={targetY} radius={30} press={Math.sin(touch * Math.PI)} opacity={touch} />
            <Ripple x={targetX} y={targetY} progress={beat(p, 0.8, 0.93)} color={tokens.alert} />
          </>
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            textAlign: 'center',
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-.03em',
            color: palette.white,
            opacity: firstLabel,
            transform: `translateY(${(1 - firstLabel) * -14}px)`,
          }}
        >
          ¿DISEÑADA PARA MÓVIL?
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 6,
            textAlign: 'center',
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: '-.03em',
            color: tokens.soft,
            opacity: secondLabel,
            transform: `translateY(${(1 - secondLabel) * 18}px)`,
          }}
        >
          ¿O SOLO ADAPTADA?
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · Five things you can check on your own phone
 * ------------------------------------------------------------------ */

const SYMPTOMS = [
  {key: 'button', label: 'Botón diminuto'},
  {key: 'zoom', label: 'Hay que ampliar'},
  {key: 'form', label: 'Formulario largo'},
  {key: 'table', label: 'Tabla que se sale'},
  {key: 'menu', label: 'Menú de escritorio'},
] as const;

const SymptomButton: React.FC<{progress: number; tokens: BrandTokens}> = ({progress, tokens}) => {
  const press = passing(progress, 0.42, 0.6, 0.78);
  return (
    <div style={{position: 'absolute', inset: 0, padding: '52px 22px 0'}}>
      <div style={{height: 9, width: '78%', borderRadius: 99, background: '#DDE3EC'}} />
      <div style={{marginTop: 8, height: 9, width: '58%', borderRadius: 99, background: '#E6EAF2'}} />
      <div style={{marginTop: 30, display: 'flex', justifyContent: 'center'}}>
        <div style={{padding: '4px 10px', borderRadius: 5, background: tokens.accent, color: palette.white, fontSize: 11, fontWeight: 800}}>Solicitar</div>
      </div>
      <Finger x={176} y={138} radius={31} press={press} opacity={beat(progress, 0.25, 0.42)} />
      <Ripple x={176} y={138} progress={beat(progress, 0.58, 0.86)} color={tokens.alert} />
    </div>
  );
};

const SymptomZoom: React.FC<{progress: number}> = ({progress}) => {
  const zoom = glide(progress, 0.3, 0.72, 1, 2.35);
  const spread = glide(progress, 0.3, 0.72, 0, 44);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 22, top: 74, width: 220, transformOrigin: '0 0', transform: `scale(${zoom})`}}>
        <div style={{fontSize: 8, fontWeight: 700, color: ink, lineHeight: 1.5}}>
          Atendemos proyectos residenciales, comerciales e industriales en todo el país, con un equipo propio para cada etapa.
        </div>
      </div>
      <Finger x={120 - spread} y={214} radius={26} opacity={beat(progress, 0.18, 0.32)} />
      <Finger x={168 + spread} y={214} radius={26} opacity={beat(progress, 0.18, 0.32)} />
    </div>
  );
};

const SymptomForm: React.FC<{progress: number; tokens: BrandTokens}> = ({progress, tokens}) => {
  const scroll = ramp(progress, 0.22, 0.86, 0, 300);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 20, right: 20, top: 52 - scroll}}>
        {['Nombre', 'Apellido', 'Cédula', 'Correo', 'Teléfono', 'Ciudad', 'Empresa', 'Mensaje'].map((label) => (
          <div key={label} style={{marginBottom: 12}}>
            <div style={{fontSize: 10, fontWeight: 800, color: muted}}>{label}</div>
            <div style={{marginTop: 4, height: 30, borderRadius: 7, background: palette.white, border: `2px solid ${rule}`}} />
          </div>
        ))}
        <div style={{height: 34, borderRadius: 8, background: tokens.accent}} />
      </div>
      {/* The rail on the right says how much of it is still below. */}
      <div style={{position: 'absolute', right: 6, top: 52, bottom: 12, width: 5, borderRadius: 99, background: '#E4E9F1'}}>
        <div style={{position: 'absolute', top: `${clamp01(scroll / 340) * 62}%`, height: '34%', left: 0, right: 0, borderRadius: 99, background: muted}} />
      </div>
    </div>
  );
};

const SymptomTable: React.FC<{progress: number; tokens: BrandTokens}> = ({progress, tokens}) => {
  const drag = ramp(progress, 0.34, 0.86, 0, -210);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 18 + drag, top: 60, width: 470}}>
        <div style={{display: 'flex', gap: 6}}>
          {['Proyecto', 'Estado', 'Fecha', 'Valor', 'Responsable'].map((head) => (
            <div key={head} style={{width: 90, padding: '6px 0', textAlign: 'center', fontSize: 10, fontWeight: 800, color: palette.white, background: ink, borderRadius: 5}}>
              {head}
            </div>
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} style={{marginTop: 6, display: 'flex', gap: 6}}>
            {[0, 1, 2, 3, 4].map((cell) => (
              <div key={cell} style={{width: 90, height: 26, borderRadius: 5, background: palette.white, border: `2px solid ${rule}`}} />
            ))}
          </div>
        ))}
      </div>
      <Finger x={mix(beat(progress, 0.34, 0.86), 230, 70)} y={200} radius={30} press={0.4} opacity={beat(progress, 0.22, 0.34)} />
      <div style={{position: 'absolute', right: 0, top: 52, bottom: 0, width: 26, background: `linear-gradient(90deg,rgba(243,247,251,0),${paper})`}} />
      <div style={{position: 'absolute', right: 8, bottom: 14, fontSize: 12, fontWeight: 800, color: tokens.alert}}>→ sigue</div>
    </div>
  );
};

const SymptomMenu: React.FC<{progress: number; tokens: BrandTokens}> = ({progress, tokens}) => {
  const open = beat(progress, 0.24, 0.56);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 34, height: 26, display: 'flex', alignItems: 'center', padding: '0 14px', background: palette.white, borderBottom: `2px solid ${rule}`}}>
        <div style={{width: 15, height: 15, borderRadius: 5, background: tokens.accent}} />
        <span style={{marginLeft: 7, fontSize: 10, fontWeight: 800, color: ink}}>Tu Empresa</span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 60,
          height: mix(open, 0, 250),
          overflow: 'hidden',
          background: palette.white,
          borderBottom: `2px solid ${rule}`,
        }}
      >
        {['Inicio', 'Servicios', 'Proyectos', 'Nosotros', 'Blog', 'Contacto'].map((item) => (
          <div key={item} style={{padding: '11px 16px', fontSize: 13, fontWeight: 800, color: ink, borderBottom: `1px solid ${rule}`}}>
            {item}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 16, right: 16, top: mix(open, 96, 322), height: 8, borderRadius: 99, background: '#E4E9F1'}} />
      <div style={{position: 'absolute', left: 16, width: 120, top: mix(open, 116, 342), height: 8, borderRadius: 99, background: '#EAEEF5'}} />
    </div>
  );
};

/**
 * Initial state: your own page, on your own phone. Question: which of these
 * happens to you? Action: five failures, demonstrated one at a time inside the
 * same device. Proof: the crosses stack up and the sentence names what they
 * add up to.
 */
export const AentsMobileSymptomsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  // The five demonstrations share the first 84 % of the arc; the closing line
  // owns the rest, so the last cross has time to be read before it leaves.
  const demoSpan = 0.84 / SYMPTOMS.length;
  const index = Math.min(SYMPTOMS.length - 1, Math.floor(p / demoSpan));
  const local = clamp01((p - index * demoSpan) / demoSpan);
  const active = SYMPTOMS[index].key;
  const closing = beat(p, 0.86, 0.96);
  const phoneOut = 1 - beat(p, 0.85, 0.93);

  const phoneWidth = 300;
  const phoneHeight = 430;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="HAZLO AHORA MISMO" title="Cinco señales en tu teléfono">
      <div style={{position: 'relative', marginTop: 22, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: STAGE / 2 - phoneWidth / 2, top: 8, opacity: phoneOut}}>
          <Phone width={phoneWidth} height={phoneHeight} tokens={tokens}>
            {active === 'button' ? <SymptomButton progress={local} tokens={tokens} /> : null}
            {active === 'zoom' ? <SymptomZoom progress={local} /> : null}
            {active === 'form' ? <SymptomForm progress={local} tokens={tokens} /> : null}
            {active === 'table' ? <SymptomTable progress={local} tokens={tokens} /> : null}
            {active === 'menu' ? <SymptomMenu progress={local} tokens={tokens} /> : null}
          </Phone>
        </div>

        {/* The tally: one cross per symptom already demonstrated. */}
        <div style={{position: 'absolute', right: 0, top: 20, width: 196, display: 'grid', gap: 10, opacity: phoneOut}}>
          {SYMPTOMS.map((symptom, position) => {
            const reached = position < index || (position === index && local > 0.68);
            const appear = reached ? 1 : 0;
            return (
              <div
                key={symptom.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: appear ? 'rgba(245,158,11,.14)' : 'rgba(255,255,255,.05)',
                  border: `2px solid ${appear ? `${tokens.alert}80` : 'rgba(255,255,255,.1)'}`,
                  opacity: position <= index ? 1 : 0.34,
                }}
              >
                <span style={{width: 24, height: 24, display: 'grid', placeItems: 'center'}}>
                  {appear ? <Cross size={22} color={tokens.alert} /> : <span style={{width: 9, height: 9, borderRadius: 99, background: 'rgba(255,255,255,.28)'}} />}
                </span>
                <BoxedText text={symptom.label} width={130} max={19} min={14} style={{fontWeight: 800, color: 'rgba(255,255,255,.86)'}} />
              </div>
            );
          })}
        </div>

        <Closing text="Que funcione en móvil no es estar diseñado para móvil" opacity={closing} tokens={tokens} width={620} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 3 · Two ways to start
 * ------------------------------------------------------------------ */

/**
 * Initial state: the same destination, two starting points. Question: what
 * decides the order of what you see? Action: the left column shrinks a finished
 * desktop; the right column fills an empty phone in order of importance. Proof:
 * both end in a phone, and only one of them chose what mattered.
 */
export const AentsMobileTwoPathsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const column = 350;
  const shrink = ramp(p, 0.16, 0.66, 0, 1);
  const leftWidth = mix(shrink, column, 168);
  const leftScale = leftWidth / column;

  const priorities = [
    {label: 'Acción principal', at: 0.2, tone: 'primary' as const},
    {label: 'Navegación', at: 0.34, tone: 'plain' as const},
    {label: 'Contenido', at: 0.48, tone: 'plain' as const},
  ];
  const extra = beat(p, 0.68, 0.84);
  const verdict = beat(p, 0.82, 0.94);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="DOS FORMAS DE EMPEZAR" title="Responsive y mobile first">
      <div style={{position: 'relative', marginTop: 20, height: STAGE_HEIGHT}}>
        {/* Left: a finished page, reduced. */}
        <div style={{position: 'absolute', left: 0, top: 0, width: column}}>
          <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.58)'}}>RESPONSIVE</div>
          <div style={{position: 'relative', marginTop: 14, height: 330}}>
            <div style={{position: 'absolute', left: column / 2 - leftWidth / 2, top: 0}}>
              <Desktop width={leftWidth} height={mix(shrink, 208, 300)} tokens={tokens}>
                <div style={{transformOrigin: '0 0', transform: `scale(${(leftScale * column) / DESKTOP_PAGE.width})`}}>
                  <DesktopPage tokens={tokens} />
                </div>
              </Desktop>
            </div>
          </div>
          <div style={{marginTop: 4, fontSize: 25, fontWeight: 800, color: 'rgba(255,255,255,.82)'}}>Adapta a cada tamaño.</div>
        </div>

        <div style={{position: 'absolute', left: STAGE / 2 - 1, top: 6, width: 2, height: 400, background: 'rgba(255,255,255,.12)'}} />

        {/* Right: an empty phone that fills in order. */}
        <div style={{position: 'absolute', right: 0, top: 0, width: column}}>
          <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.12em', color: tokens.soft}}>MOBILE FIRST</div>
          <div style={{position: 'relative', marginTop: 14, height: 330}}>
            <div style={{position: 'absolute', left: column / 2 - 84, top: 0}}>
              <Phone width={168} height={300} tokens={tokens}>
                <div style={{position: 'absolute', inset: 0, padding: '26px 12px 12px'}}>
                  {priorities.map((item) => {
                    const show = beat(p, item.at, item.at + 0.12);
                    return (
                      <div
                        key={item.label}
                        style={{
                          marginBottom: 9,
                          padding: item.tone === 'primary' ? '11px 10px' : '8px 10px',
                          borderRadius: 8,
                          background: item.tone === 'primary' ? tokens.accent : palette.white,
                          border: item.tone === 'primary' ? 'none' : `2px solid ${rule}`,
                          color: item.tone === 'primary' ? palette.white : ink,
                          fontSize: item.tone === 'primary' ? 13 : 11,
                          fontWeight: 800,
                          textAlign: 'center',
                          opacity: show,
                          transform: `translateY(${(1 - show) * 16}px)`,
                        }}
                      >
                        {item.label}
                      </div>
                    );
                  })}
                  <div style={{marginTop: 6, display: 'grid', gap: 7, opacity: extra}}>
                    {['Secundario', 'Secundario'].map((label, position) => (
                      <div key={position} style={{height: 22, borderRadius: 7, background: '#E7ECF3', border: `2px solid ${rule}`, display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800, color: muted}}>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </Phone>
            </div>

            {/* The extras only exist because the frame grew; the label says so. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 6,
                width: column,
                textAlign: 'center',
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: '.08em',
                color: tokens.confirm,
                opacity: extra,
              }}
            >
              Y LO DEMÁS, SI HAY ESPACIO
            </div>
          </div>
          <div style={{marginTop: 4, fontSize: 25, fontWeight: 800, color: palette.white}}>Decide qué va primero.</div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: -14, textAlign: 'center', opacity: verdict}}>
          <span style={{fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.62)'}}>Relacionados. No iguales.</span>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 4 · It fits. That is not the same as it works.
 * ------------------------------------------------------------------ */

const DESKTOP_PIECES = [
  {key: 'menu', label: 'Menú', x: 0, y: 0, width: 430, height: 34, at: 0.04},
  {key: 'side', label: 'Panel', x: 0, y: 44, width: 110, height: 196, at: 0.09},
  {key: 'table', label: 'Tabla', x: 120, y: 44, width: 310, height: 104, at: 0.14},
  {key: 'chart', label: 'Gráficos', x: 120, y: 158, width: 150, height: 84, at: 0.19},
  {key: 'filters', label: 'Filtros', x: 280, y: 158, width: 150, height: 40, at: 0.24},
  {key: 'cards', label: 'Tarjetas', x: 280, y: 204, width: 150, height: 38, at: 0.29},
] as const;

/**
 * Initial state: an empty desktop canvas. Question: what happens to all this on
 * a phone? Action: it is built until it is perfect, then squeezed until it
 * fits. Proof: the tick that says it fits is answered by the question the tick
 * cannot answer.
 */
export const AentsMobileFitsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const phoneIn = beat(p, 0.36, 0.46);
  // The squeeze: every piece travels to the column it will live in, and the
  // ones that do not survive the trip fade where they stand.
  const squeeze = ramp(p, 0.5, 0.76, 0, 1);
  const fits = beat(p, 0.78, 0.86);
  const doubt = beat(p, 0.88, 0.96);
  const fitsOut = 1 - beat(p, 0.87, 0.92);

  const phoneWidth = 196;
  const phoneLeft = STAGE - phoneWidth;
  const stackLeft = phoneLeft + 18;
  const stackWidth = phoneWidth - 36;

  // Where each piece ends up once the layout has been forced into the phone.
  const destinations: Record<string, {y: number; height: number; keep: boolean}> = {
    menu: {y: 40, height: 24, keep: true},
    side: {y: 0, height: 0, keep: false},
    table: {y: 72, height: 70, keep: true},
    chart: {y: 150, height: 62, keep: true},
    filters: {y: 220, height: 34, keep: true},
    cards: {y: 262, height: 34, keep: true},
  };

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="LO TRADICIONAL" title="Primero la pantalla grande">
      <Stage content={440}>
        <div style={{position: 'absolute', left: 0, top: 34, opacity: 1 - squeeze * 0.35}}>
          <Desktop width={454} height={300} tokens={tokens}>
            <div style={{position: 'absolute', inset: 0, padding: 12}} />
          </Desktop>
        </div>

        {/* The phone waits, empty, while the desktop is still being admired. */}
        <div style={{position: 'absolute', left: phoneLeft, top: 26, opacity: phoneIn, transform: `translateX(${(1 - phoneIn) * 40}px)`}}>
          <Phone width={phoneWidth} height={330} tokens={tokens}>
            <div style={{position: 'absolute', inset: 0}} />
          </Phone>
        </div>

        {/* One layer holds every piece, so the move to the phone is the same
            object travelling rather than a second drawing appearing. */}
        {DESKTOP_PIECES.map((piece) => {
          const born = beat(p, piece.at, piece.at + 0.06);
          const destination = destinations[piece.key];
          const left = mix(squeeze, 22 + piece.x, stackLeft);
          const top = mix(squeeze, 78 + piece.y, 34 + destination.y);
          const width = mix(squeeze, piece.width, destination.keep ? stackWidth : piece.width * 0.4);
          const height = mix(squeeze, piece.height, destination.keep ? destination.height : piece.height * 0.4);
          const alive = destination.keep ? 1 : 1 - beat(p, 0.5, 0.62);
          return (
            <div
              key={piece.key}
              style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                boxSizing: 'border-box',
                borderRadius: mix(squeeze, 10, 7),
                display: 'grid',
                placeItems: 'center',
                background: palette.white,
                border: `2px solid ${rule}`,
                color: muted,
                fontSize: mix(squeeze, 15, 10),
                fontWeight: 800,
                opacity: born * alive,
                transform: `scale(${0.94 + born * 0.06})`,
                boxShadow: '0 8px 20px rgba(0,0,0,.16)',
                overflow: 'hidden',
              }}
            >
              {piece.label}
            </div>
          );
        })}

        <Verdict
          label="CABE EN MÓVIL"
          tone="good"
          opacity={fits * fitsOut}
          tokens={tokens}
          style={{position: 'absolute', left: 40, top: 386}}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 380,
            width: 430,
            opacity: doubt,
            transform: `translateY(${(1 - doubt) * 12}px)`,
          }}
        >
          <div style={{fontSize: 36, fontWeight: 800, letterSpacing: '-.03em', color: palette.white}}>¿Pero es cómodo usarlo?</div>
          <div style={{marginTop: 12}}>
            <Verdict label="NO ES LO MISMO" tone="bad" opacity={doubt} tokens={tokens} />
          </div>
        </div>
      </Stage>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 5 · Change the question
 * ------------------------------------------------------------------ */

const CANDIDATE_ACTIONS = [
  {label: 'Buscar', primary: true},
  {label: 'Contactar', primary: true},
  {label: 'Comparar', primary: false},
  {label: 'Filtrar', primary: false},
  {label: 'Guardar', primary: false},
  {label: 'Compartir', primary: false},
  {label: 'Ver detalle', primary: false},
] as const;

/**
 * Initial state: an empty phone and a person. Question: which of all these
 * things does she actually come to do? Action: the answers sort themselves
 * instead of piling in. Proof: two actions own the screen and the rest are
 * still reachable, which is the whole method in one frame.
 */
export const AentsMobileQuestionSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const phoneWidth = 214;
  const phoneHeight = 372;
  const phoneLeft = STAGE / 2 - phoneWidth / 2;
  const centre = {x: STAGE / 2, y: 196};

  const orbit = beat(p, 0.12, 0.36);
  const sort = ramp(p, 0.42, 0.78, 0, 1);
  const closing = beat(p, 0.8, 0.92);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="CAMBIA LA PREGUNTA" title="¿Qué viene a hacer aquí?">
      <div style={{position: 'relative', marginTop: 22, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: phoneLeft, top: 10}}>
          <Phone width={phoneWidth} height={phoneHeight} tokens={tokens}>
            <div style={{position: 'absolute', inset: 0, padding: '30px 16px 16px'}}>
              {CANDIDATE_ACTIONS.filter((action) => action.primary).map((action, index) => (
                <div
                  key={action.label}
                  style={{
                    marginBottom: 12,
                    height: 52,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: index === 0 ? tokens.accent : palette.white,
                    border: index === 0 ? 'none' : `3px solid ${tokens.accent}`,
                    color: index === 0 ? palette.white : tokens.accent,
                    fontSize: 19,
                    fontWeight: 800,
                    opacity: sort,
                    transform: `scale(${mix(sort, 0.9, 1)})`,
                  }}
                >
                  {action.label}
                </div>
              ))}
              <div style={{marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, opacity: sort * 0.9}}>
                {CANDIDATE_ACTIONS.filter((action) => !action.primary).map((action) => (
                  <div key={action.label} style={{height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#E9EDF4', border: `2px solid ${rule}`, fontSize: 11, fontWeight: 800, color: muted}}>
                    {action.label}
                  </div>
                ))}
              </div>
            </div>
          </Phone>
        </div>

        {/* The person, at the centre of the question. */}
        <div
          style={{
            position: 'absolute',
            left: centre.x - 44,
            top: centre.y - 44,
            width: 88,
            height: 88,
            borderRadius: 99,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(145deg,${tokens.accent},#3B2C9B)`,
            boxShadow: `0 20px 54px ${tokens.accent}66`,
            opacity: 1 - sort,
            transform: `scale(${mix(sort, 1, 0.6)})`,
          }}
        >
          <svg width={44} height={44} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke={palette.white} strokeWidth="2.4" />
            <path d="M4.5 20c1.6-4 4.2-6 7.5-6s5.9 2 7.5 6" stroke={palette.white} strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>

        {/* The candidates, orbiting until the question sorts them. */}
        {CANDIDATE_ACTIONS.map((action, index) => {
          const angle = (index / CANDIDATE_ACTIONS.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 218;
          const from = {x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius * 0.82};
          const opacity = orbit * (1 - sort);
          return (
            <div
              key={action.label}
              style={{
                position: 'absolute',
                left: mix(sort, from.x, centre.x) - 62,
                top: mix(sort, from.y, centre.y) - 20,
                width: 124,
                padding: '9px 0',
                textAlign: 'center',
                borderRadius: 99,
                background: action.primary ? `${tokens.accent}2E` : 'rgba(255,255,255,.07)',
                border: `2px solid ${action.primary ? tokens.accent : 'rgba(255,255,255,.16)'}`,
                fontSize: 19,
                fontWeight: 800,
                color: 'rgba(255,255,255,.88)',
                opacity,
                transform: `scale(${mix(sort, 1, 0.7)})`,
              }}
            >
              {action.label}
            </div>
          );
        })}

        <Closing text="Primero la necesidad" opacity={closing} tokens={tokens} width={480} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * The example platform: the map, its prices and its sidebar
 * ------------------------------------------------------------------ */

const MARKERS = [
  {x: 0.2, y: 0.28, price: '$118k'},
  {x: 0.56, y: 0.2, price: '$96k'},
  {x: 0.36, y: 0.58, price: '$240k'},
  {x: 0.74, y: 0.52, price: '$132k'},
  {x: 0.15, y: 0.76, price: '$88k'},
] as const;

/**
 * The map surface: streets, a park and price markers.
 *
 * Drawn rather than captured, and deliberately generic — no city is named and
 * no marker sits on a real address. The prices are examples and the frame that
 * shows them always carries the badge.
 */
const MapSurface: React.FC<{
  width: number;
  height: number;
  offset?: {x: number; y: number};
  zoom?: number;
  visible?: number;
  selected?: number | null;
  tokens: BrandTokens;
}> = ({width, height, offset = {x: 0, y: 0}, zoom = 1, visible = MARKERS.length, selected = null, tokens}) => (
  <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#E7EDF4'}}>
    <div style={{position: 'absolute', inset: -80, transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})`}}>
      <svg width={width + 160} height={height + 160} viewBox={`0 0 ${width + 160} ${height + 160}`}>
        <rect width={width + 160} height={height + 160} fill="#E7EDF4" />
        {[0.14, 0.36, 0.58, 0.8].map((ratio) => (
          <path key={`v${ratio}`} d={`M${(width + 160) * ratio} 0V${height + 160}`} stroke="#CFD8E5" strokeWidth="11" />
        ))}
        {[0.22, 0.52, 0.82].map((ratio) => (
          <path key={`h${ratio}`} d={`M0 ${(height + 160) * ratio}H${width + 160}`} stroke="#CFD8E5" strokeWidth="11" />
        ))}
        <path
          d={`M-20 ${(height + 160) * 0.66}C${(width + 160) * 0.24} ${(height + 160) * 0.58} ${(width + 160) * 0.5} ${(height + 160) * 0.78} ${width + 180} ${(height + 160) * 0.62}V${height + 180}H-20Z`}
          fill="#D7E8DD"
        />
      </svg>
    </div>

    {MARKERS.slice(0, visible).map((marker, index) => {
      const active = selected === index;
      return (
        <div
          key={marker.price}
          style={{
            position: 'absolute',
            left: width * marker.x + offset.x,
            top: height * marker.y + offset.y,
            padding: '6px 11px',
            borderRadius: 99,
            background: active ? tokens.accent : palette.white,
            color: active ? palette.white : ink,
            border: `3px solid ${active ? tokens.accent : tokens.confirm}`,
            fontSize: 15,
            fontWeight: 800,
            whiteSpace: 'nowrap',
            transform: `translate(-50%,-50%) scale(${active ? 1.16 : 1})`,
            boxShadow: '0 8px 20px rgba(0,0,0,.24)',
            ...figures,
          }}
        >
          {marker.price}
        </div>
      );
    })}
  </div>
);

/** The desktop sidebar the product really has: search, filters and a list. */
const MapSidebar: React.FC<{width: number; tokens: BrandTokens; squeezed?: number}> = ({width, tokens, squeezed = 0}) => (
  <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width, background: palette.white, borderLeft: `2px solid ${rule}`, padding: 12, boxSizing: 'border-box', overflow: 'hidden'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 7, height: 30, padding: '0 10px', borderRadius: 99, background: '#EEF1F6'}}>
      <Magnifier size={15} color={muted} />
      <span style={{fontSize: 11, fontWeight: 800, color: muted, whiteSpace: 'nowrap', overflow: 'hidden'}}>Buscar por zona</span>
    </div>
    <div style={{marginTop: 9, display: 'flex', gap: 6, flexWrap: squeezed > 0.5 ? 'nowrap' : 'wrap'}}>
      {['Casa', 'Departamento', 'Terreno'].map((chip) => (
        <span key={chip} style={{padding: '5px 9px', borderRadius: 99, border: `2px solid ${rule}`, fontSize: 10, fontWeight: 800, color: muted, whiteSpace: 'nowrap'}}>
          {chip}
        </span>
      ))}
    </div>
    <div style={{marginTop: 10, display: 'grid', gap: 8}}>
      {[0, 1, 2].map((row) => (
        <div key={row} style={{display: 'flex', gap: 8, padding: 7, borderRadius: 9, border: `2px solid ${rule}`}}>
          <div style={{width: 44, height: 38, borderRadius: 6, background: '#DCE3EE', flexShrink: 0}} />
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 12, fontWeight: 800, color: ink, ...figures}}>{['$118k', '$96k', '$240k'][row]}</div>
            <div style={{marginTop: 4, height: 5, borderRadius: 99, background: '#E4E9F1'}} />
            <div style={{marginTop: 4, height: 5, width: '64%', borderRadius: 99, background: '#EBEFF6'}} />
          </div>
        </div>
      ))}
    </div>
    <div style={{position: 'absolute', left: 12, right: 12, bottom: 12, height: 28, borderRadius: 8, background: tokens.accent, color: palette.white, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800}}>
      Ver resultados
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * 6 · On the big screen everything fits at once
 * ------------------------------------------------------------------ */

/**
 * Initial state: the platform as it is meant to be seen. Question: what happens
 * if the same screen is asked to be a phone? Action: the frame narrows with the
 * layout untouched. Proof: the sidebar crushes the map, the markers pile onto
 * each other and the search field runs out of room.
 */
export const AentsMobilePortalDesktopSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const squeeze = ramp(p, 0.44, 0.86, 0, 1);
  const width = mix(squeeze, 700, 262);
  const height = mix(squeeze, 400, 440);
  const sidebar = mix(squeeze, 210, 132);
  const mapWidth = Math.max(56, width - sidebar);
  const collide = beat(p, 0.72, 0.94);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="UN EJEMPLO" title="En la pantalla grande cabe todo">
      <div style={{position: 'relative', marginTop: 22, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: STAGE / 2 - width / 2, top: 14}}>
          <Desktop width={width} height={height} tokens={tokens} domain="geopropiedadesecuador.com">
            <MapSurface
              width={mapWidth}
              height={height - 40}
              tokens={tokens}
              // The markers do not move: the map they sit on gets narrower, so
              // they end up on top of one another. That is the whole point.
              zoom={1}
            />
            <MapSidebar width={sidebar} tokens={tokens} squeezed={squeeze} />
          </Desktop>
        </div>

        <div style={{position: 'absolute', right: 0, top: 0, display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{width: 10, height: 10, borderRadius: 99, background: tokens.accent}} />
          <Example />
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: 6, textAlign: 'center', opacity: collide}}>
          <Verdict label="TODO EMPIEZA A CHOCAR" tone="bad" opacity={collide} tokens={tokens} />
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 7 · The same platform, decided for the phone
 * ------------------------------------------------------------------ */

/**
 * Initial state: the map, alone, filling the screen. Question: where did the
 * search, the filters and the list go? Action: the finger uses the surfaces the
 * product actually has — the pill, the sheet at half height, the sheet at full
 * height, the filters. Proof: the same work gets done, and the last frame shows
 * both versions doing it.
 *
 * Every state drawn here exists: `MobilePropertyDrawer` opens from a floating
 * pill, snaps to `half` and `full`, dims a backdrop behind it, and closes on a
 * downward drag.
 */
export const AentsMobilePortalPhoneSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const phoneWidth = 300;
  const phoneHeight = 466;
  const screenWidth = phoneWidth - 18;
  const screenHeight = phoneHeight - 18;

  // The arc, in the order the narration says it.
  const pan = ramp(p, 0.08, 0.18, 0, -34);
  const tapMarker = beat(p, 0.2, 0.26);
  const half = beat(p, 0.24, 0.34);
  const full = beat(p, 0.42, 0.52);
  const back = beat(p, 0.56, 0.64);
  const filtersOpen = beat(p, 0.68, 0.76);
  const filtersPicked = beat(p, 0.78, 0.86);
  const compare = beat(p, 0.88, 0.97);

  const sheetOpen = clamp01(half - back);
  const sheetFull = clamp01(full - back);
  // Where the top edge of the card sits: off screen, at half height, at the top.
  const sheetTop = mix(sheetFull, mix(sheetOpen, screenHeight, screenHeight * 0.56), 42);
  const backdrop = sheetFull * 0.5;

  const filtersSheet = clamp01(filtersOpen);
  const filtersTop = mix(filtersSheet, screenHeight, screenHeight * 0.42);

  const markerIndex = 2;
  const visibleMarkers = filtersPicked > 0.5 ? 3 : MARKERS.length;

  // The finger: it is on the map, then on the card, then on the pill.
  const fingerStages: Array<{at: number; x: number; y: number}> = [
    {at: 0.1, x: 190, y: 200},
    {at: 0.22, x: screenWidth * MARKERS[markerIndex].x, y: screenHeight * MARKERS[markerIndex].y},
    {at: 0.44, x: 150, y: 300},
    {at: 0.58, x: 150, y: 180},
    {at: 0.7, x: 141, y: 404},
    {at: 0.8, x: 96, y: 300},
  ];
  const stage = fingerStages.filter((item) => p >= item.at).slice(-1)[0] ?? fingerStages[0];
  const fingerVisible = beat(p, 0.06, 0.12) * (1 - beat(p, 0.86, 0.9));

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="GEO PROPIEDADES ECUADOR" title="La misma función, otra forma">
      <div style={{position: 'relative', marginTop: 20, height: STAGE_HEIGHT}}>
        <div
          style={{
            position: 'absolute',
            left: mix(compare, STAGE / 2 - phoneWidth / 2, STAGE - phoneWidth),
            top: 6,
            transform: `scale(${mix(compare, 1, 0.78)})`,
            transformOrigin: 'top right',
          }}
        >
          <Phone width={phoneWidth} height={phoneHeight} tokens={tokens}>
            <MapSurface
              width={screenWidth}
              height={screenHeight}
              offset={{x: pan, y: 0}}
              visible={visibleMarkers}
              selected={sheetOpen > 0.2 ? markerIndex : null}
              tokens={tokens}
            />

            {/* The launcher: the real one carries the sliders and the count. */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 16,
                transform: `translateX(-50%) scale(${1 - filtersSheet * 0.1})`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 99,
                background: tokens.accent,
                color: palette.white,
                fontSize: 15,
                fontWeight: 800,
                boxShadow: `0 14px 34px ${tokens.accent}77`,
                opacity: (1 - sheetOpen) * (1 - filtersSheet * 0.5),
                whiteSpace: 'nowrap',
                ...figures,
              }}
            >
              <Sliders size={17} color={palette.white} />
              {filtersPicked > 0.5 ? '3 propiedades' : '12 propiedades'}
            </div>

            {/* The backdrop the drawer dims when it reaches full height. */}
            <div style={{position: 'absolute', inset: 0, background: '#000', opacity: backdrop, pointerEvents: 'none'}} />

            {/* The property card, at whichever height the drag left it. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: sheetTop,
                bottom: 0,
                borderRadius: '20px 20px 0 0',
                background: palette.white,
                boxShadow: '0 -14px 40px rgba(0,0,0,.32)',
                padding: '10px 14px',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div style={{width: 44, height: 5, borderRadius: 99, background: rule, margin: '0 auto 10px'}} />
              <div style={{display: 'flex', gap: 10}}>
                <div style={{width: 92, height: 66, borderRadius: 10, background: '#DCE3EE', flexShrink: 0}} />
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 22, fontWeight: 800, color: ink, ...figures}}>$240.000</div>
                  <div style={{marginTop: 5, fontSize: 12, fontWeight: 700, color: muted}}>Casa · 3 hab. · 2 baños</div>
                  <div style={{marginTop: 5, fontSize: 12, fontWeight: 700, color: muted}}>Zona residencial</div>
                </div>
              </div>
              <div style={{marginTop: 12, opacity: sheetFull}}>
                {['Forma del terreno', 'Servicios del sector', 'Cómo llegar'].map((row) => (
                  <div key={row} style={{marginBottom: 8, padding: '9px 11px', borderRadius: 9, border: `2px solid ${rule}`, fontSize: 12, fontWeight: 800, color: ink}}>
                    {row}
                  </div>
                ))}
                <div style={{marginTop: 12, height: 34, borderRadius: 9, background: tokens.confirm, color: '#06210F', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800}}>
                  Contactar
                </div>
              </div>
            </div>

            {/* Search and filters, from the same edge, over the same map. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: filtersTop,
                bottom: 0,
                borderRadius: '20px 20px 0 0',
                background: palette.white,
                boxShadow: '0 -14px 40px rgba(0,0,0,.32)',
                padding: '10px 14px',
                boxSizing: 'border-box',
                opacity: filtersSheet,
              }}
            >
              <div style={{width: 44, height: 5, borderRadius: 99, background: rule, margin: '0 auto 10px'}} />
              <div style={{display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', borderRadius: 99, background: '#EEF1F6'}}>
                <Magnifier size={16} color={muted} />
                <span style={{fontSize: 12, fontWeight: 800, color: muted}}>Buscar por zona</span>
              </div>
              <div style={{marginTop: 12, fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: muted}}>TIPO</div>
              <div style={{marginTop: 7, display: 'flex', gap: 7}}>
                {['Casa', 'Departamento', 'Terreno'].map((chip, index) => {
                  const picked = index === 0 && filtersPicked > 0.35;
                  return (
                    <span
                      key={chip}
                      style={{
                        padding: '7px 11px',
                        borderRadius: 99,
                        border: `2px solid ${picked ? tokens.accent : rule}`,
                        background: picked ? tokens.accent : palette.white,
                        color: picked ? palette.white : muted,
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {chip}
                    </span>
                  );
                })}
              </div>
              <div style={{marginTop: 14, fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: muted}}>PRECIO</div>
              <div style={{marginTop: 9, position: 'relative', height: 6, borderRadius: 99, background: '#E4E9F1'}}>
                <div style={{position: 'absolute', left: 0, right: `${mix(filtersPicked, 0, 42)}%`, top: 0, bottom: 0, borderRadius: 99, background: tokens.accent}} />
                <div style={{position: 'absolute', left: `${mix(filtersPicked, 96, 56)}%`, top: -6, width: 18, height: 18, borderRadius: 99, background: palette.white, border: `3px solid ${tokens.accent}`}} />
              </div>
            </div>

            {fingerVisible > 0 ? (
              <>
                <Finger x={stage.x} y={stage.y} radius={28} press={Math.abs(Math.sin(p * 22)) * 0.3} opacity={fingerVisible} />
                <Ripple x={stage.x} y={stage.y} progress={tapMarker < 1 ? tapMarker : filtersOpen} color={tokens.accent} />
              </>
            ) : null}
          </Phone>
        </div>

        {/* The comparison the narration lands on. */}
        <div style={{position: 'absolute', left: 0, top: 52, width: 330, opacity: compare, transform: `translateX(${(1 - compare) * -28}px)`}}>
          <Desktop width={320} height={200} tokens={tokens} domain="geopropiedadesecuador.com">
            <MapSurface width={210} height={168} tokens={tokens} visible={3} />
            <MapSidebar width={110} tokens={tokens} />
          </Desktop>
          <div style={{marginTop: 16, fontSize: 27, fontWeight: 800, color: palette.white, letterSpacing: '-.02em'}}>La misma función.</div>
          <div style={{marginTop: 4, fontSize: 27, fontWeight: 800, color: tokens.soft, letterSpacing: '-.02em'}}>Otra manera de usarla.</div>
        </div>

        <div style={{position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: 12, opacity: 1 - compare}}>
          <span style={{width: 10, height: 10, borderRadius: 99, background: tokens.accent}} />
          <Example />
        </div>
        <div style={{position: 'absolute', right: 0, bottom: 0, opacity: compare}}>
          <Example />
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 8 · A pointer is a pixel; a finger is a coin
 * ------------------------------------------------------------------ */

const TOUCH_BUTTONS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Initial state: the same five buttons twice. Question: does the size of a
 * target depend on the design or on the hand? Action: the cursor hits, the
 * finger misses twice. Proof: only the right half changes, and then the same
 * gesture works.
 */
export const AentsMobileTouchSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const column = 350;
  const target = 2;

  const cursorTravel = glide(p, 0.08, 0.24, 0, 1);
  const cursorHit = beat(p, 0.24, 0.3);

  const firstMiss = passing(p, 0.3, 0.4, 0.5);
  const secondMiss = passing(p, 0.5, 0.58, 0.66);
  const grow = ramp(p, 0.66, 0.84, 0, 1);
  const finalHit = beat(p, 0.86, 0.94);

  const smallSize = 34;
  const size = mix(grow, smallSize, 62);
  const gap = mix(grow, 6, 18);
  const rowWidth = TOUCH_BUTTONS.length * size + (TOUCH_BUTTONS.length - 1) * gap;

  const buttonCentre = (index: number, width: number, buttonSize: number, buttonGap: number) =>
    (column - width) / 2 + index * (buttonSize + buttonGap) + buttonSize / 2;

  const leftWidth = TOUCH_BUTTONS.length * smallSize + (TOUCH_BUTTONS.length - 1) * 6;
  const cursorX = mix(cursorTravel, 40, buttonCentre(target, leftWidth, smallSize, 6) - 4);
  const missIndex = firstMiss > 0.05 ? target + 1 : secondMiss > 0.05 ? target - 1 : null;
  const fingerX = missIndex === null
    ? buttonCentre(target, rowWidth, size, gap)
    : buttonCentre(missIndex, rowWidth, size, gap);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="MOUSE Y DEDO" title="El mismo botón, otro instrumento">
      <Stage content={430}>
        {/* Left: the cursor, which lands where its tip is. */}
        <div style={{position: 'absolute', left: 0, top: 0, width: column, height: 340}}>
          <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.58)'}}>CON UN CURSOR</div>
          <div style={{position: 'relative', marginTop: 118, height: 90}}>
            <div style={{position: 'absolute', left: (column - leftWidth) / 2, top: 0, display: 'flex', gap: 6}}>
              {TOUCH_BUTTONS.map((label, index) => (
                <div
                  key={label}
                  style={{
                    width: smallSize,
                    height: smallSize,
                    borderRadius: 9,
                    display: 'grid',
                    placeItems: 'center',
                    background: index === target && cursorHit > 0.5 ? tokens.confirm : palette.white,
                    color: index === target && cursorHit > 0.5 ? '#06210F' : ink,
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <Cursor x={cursorX} y={mix(cursorTravel, 84, 12)} press={cursorHit} />
          </div>
          <div style={{marginTop: 78, textAlign: 'center'}}>
            <Verdict label="ACIERTA" tone="good" opacity={cursorHit} tokens={tokens} />
          </div>
        </div>

        <div style={{position: 'absolute', left: STAGE / 2 - 1, top: 6, width: 2, height: 380, background: 'rgba(255,255,255,.12)'}} />

        {/* Right: the same design, and a contact area the size of a fingertip. */}
        <div style={{position: 'absolute', right: 0, top: 0, width: column, height: 340}}>
          <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.12em', color: tokens.soft}}>CON UN DEDO</div>
          <div style={{position: 'relative', marginTop: 100, height: 120}}>
            <div style={{position: 'absolute', left: (column - rowWidth) / 2, top: 0, display: 'flex', gap}}>
              {TOUCH_BUTTONS.map((label, index) => {
                const wrong = missIndex === index;
                const right = missIndex === null && finalHit > 0.4 && index === target;
                return (
                  <div
                    key={label}
                    style={{
                      width: size,
                      height: size,
                      borderRadius: mix(grow, 9, 14),
                      display: 'grid',
                      placeItems: 'center',
                      background: wrong ? tokens.alert : right ? tokens.confirm : palette.white,
                      color: wrong ? '#231402' : right ? '#06210F' : ink,
                      fontSize: mix(grow, 16, 24),
                      fontWeight: 800,
                      border: index === target ? `3px solid ${tokens.accent}` : '3px solid transparent',
                      boxSizing: 'border-box',
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <Finger
              x={fingerX}
              y={mix(grow, 17, 31)}
              radius={30}
              press={Math.max(firstMiss, secondMiss, finalHit)}
              opacity={beat(p, 0.26, 0.32)}
            />
          </div>
          <div style={{position: 'relative', marginTop: 60, textAlign: 'center', height: 44}}>
            <Verdict label="TOCA EL DE AL LADO" tone="bad" opacity={Math.max(firstMiss, secondMiss)} tokens={tokens} />
            <Verdict label="AHORA SÍ" tone="good" opacity={finalHit} tokens={tokens} style={{position: 'absolute', left: column / 2 - 78, top: 0}} />
          </div>
        </div>

        <Closing text="Diseña para dedos, no para cursores" opacity={beat(p, 0.9, 0.98)} tokens={tokens} width={600} lines={1} />
      </Stage>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 9 · Do not shrink the component. Change it.
 * ------------------------------------------------------------------ */

const TABLE_COLUMNS = ['Proyecto', 'Estado', 'Fecha', 'Valor', 'Responsable', 'Acciones'];
const TABLE_ROWS = [
  {name: 'Torre Norte', state: 'En obra', date: '12 ago', value: '$84.000', owner: 'M. Vera'},
  {name: 'Casa Los Ceibos', state: 'Entregado', date: '04 ago', value: '$52.000', owner: 'J. Pinto'},
  {name: 'Bodega Sur', state: 'En diseño', date: '28 jul', value: '$130.000', owner: 'A. Salas'},
];

/**
 * Initial state: a six column table, which is a perfectly good desktop
 * component. Question: what does it become when the frame is a phone? Action:
 * the rows fold into cards, then a modal becomes a sheet, then a top menu
 * becomes a bottom bar. Proof: three components changed shape and none of them
 * changed size.
 */
export const AentsMobileCardsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const fold = ramp(p, 0.06, 0.34, 0, 1);
  const tableOut = 1 - beat(p, 0.44, 0.49);
  const modalIn = beat(p, 0.5, 0.55);
  const toSheet = ramp(p, 0.58, 0.72, 0, 1);
  const modalOut = 1 - beat(p, 0.74, 0.78);
  const menuIn = beat(p, 0.78, 0.82);
  const toBottom = ramp(p, 0.82, 0.93, 0, 1);
  const closing = beat(p, 0.9, 0.98);

  const wide = 700;
  const narrow = 300;
  const width = mix(fold, wide, narrow);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="NO LO ENCOJAS" title="Cámbialo de forma">
      <div style={{position: 'relative', marginTop: 22, height: STAGE_HEIGHT}}>
        {/* Beat one: rows become cards. */}
        <div style={{position: 'absolute', left: STAGE / 2 - width / 2, top: 0, width, opacity: tableOut}}>
          <div style={{display: 'flex', gap: 6, opacity: 1 - fold}}>
            {TABLE_COLUMNS.map((head) => (
              <div key={head} style={{flex: 1, padding: '9px 0', textAlign: 'center', fontSize: 14, fontWeight: 800, color: palette.white, background: ink, borderRadius: 7, whiteSpace: 'nowrap', overflow: 'hidden'}}>
                {head}
              </div>
            ))}
          </div>
          <div style={{marginTop: mix(fold, 8, 0)}}>
            {TABLE_ROWS.map((row, index) => {
              const rowFold = ramp(p, 0.06 + index * 0.05, 0.3 + index * 0.05, 0, 1);
              return (
                <div
                  key={row.name}
                  style={{
                    marginBottom: mix(rowFold, 6, 10),
                    padding: mix(rowFold, 0, 12),
                    borderRadius: mix(rowFold, 7, 14),
                    background: palette.white,
                    border: `2px solid ${rule}`,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  {/* Same six values, laid out as a row or as a card. */}
                  <div style={{display: 'flex', flexWrap: rowFold > 0.5 ? 'wrap' : 'nowrap', gap: mix(rowFold, 6, 8), alignItems: 'center'}}>
                    <div style={{flex: rowFold > 0.5 ? '1 0 100%' : 1, fontSize: mix(rowFold, 13, 18), fontWeight: 800, color: ink, textAlign: rowFold > 0.5 ? 'left' : 'center', whiteSpace: 'nowrap', overflow: 'hidden'}}>
                      {row.name}
                    </div>
                    <div style={{flex: rowFold > 0.5 ? '0 0 auto' : 1, textAlign: 'center'}}>
                      <span style={{padding: '4px 9px', borderRadius: 99, background: '#E9EDF4', fontSize: mix(rowFold, 11, 12), fontWeight: 800, color: muted, whiteSpace: 'nowrap'}}>{row.state}</span>
                    </div>
                    <div style={{flex: rowFold > 0.5 ? '0 0 auto' : 1, textAlign: 'center', fontSize: mix(rowFold, 11, 12), fontWeight: 700, color: muted}}>{row.date}</div>
                    <div style={{flex: rowFold > 0.5 ? '0 0 auto' : 1, textAlign: 'center', fontSize: mix(rowFold, 12, 16), fontWeight: 800, color: ink, ...figures}}>{row.value}</div>
                    <div style={{flex: rowFold > 0.5 ? '0 0 auto' : 1, textAlign: 'center', fontSize: mix(rowFold, 11, 12), fontWeight: 700, color: muted, opacity: 1 - rowFold * 0.2}}>{row.owner}</div>
                    <div style={{flex: rowFold > 0.5 ? '1 0 100%' : 1, marginTop: mix(rowFold, 0, 4)}}>
                      <div style={{height: mix(rowFold, 22, 34), borderRadius: 8, background: tokens.accent, color: palette.white, display: 'grid', placeItems: 'center', fontSize: mix(rowFold, 11, 14), fontWeight: 800}}>
                        Abrir
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Beat two: a modal becomes a sheet. */}
        <div style={{position: 'absolute', left: STAGE / 2 - 150, top: 0, opacity: modalIn * modalOut}}>
          <Phone width={300} height={430} tokens={tokens}>
            <div style={{position: 'absolute', inset: 0, padding: '30px 14px'}}>
              {[0, 1, 2, 3].map((line) => (
                <div key={line} style={{marginBottom: 9, height: 12, width: `${88 - line * 12}%`, borderRadius: 99, background: '#E4E9F1'}} />
              ))}
            </div>
            <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 0.32 * modalIn}} />
            <div
              style={{
                position: 'absolute',
                left: mix(toSheet, 34, 0),
                right: mix(toSheet, 34, 0),
                top: mix(toSheet, 128, 214),
                bottom: mix(toSheet, 128, 0),
                borderRadius: mix(toSheet, 14, 0),
                borderTopLeftRadius: 18,
                borderTopRightRadius: 18,
                background: palette.white,
                boxShadow: '0 -14px 40px rgba(0,0,0,.34)',
                padding: 14,
                boxSizing: 'border-box',
              }}
            >
              <div style={{width: 42, height: 5, borderRadius: 99, background: rule, margin: '0 auto 10px', opacity: toSheet}} />
              <div style={{fontSize: 15, fontWeight: 800, color: ink}}>Detalle del proyecto</div>
              <div style={{marginTop: 10, height: 30, borderRadius: 8, background: tokens.accent}} />
            </div>
          </Phone>
        </div>

        {/* Beat three: a top menu becomes a bottom bar. */}
        <div style={{position: 'absolute', left: STAGE / 2 - 150, top: 0, opacity: menuIn}}>
          <Phone width={300} height={430} tokens={tokens}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: mix(toBottom, 26, 358),
                height: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                background: palette.white,
                borderTop: `2px solid ${rule}`,
                borderBottom: `2px solid ${rule}`,
              }}
            >
              {['Inicio', 'Buscar', 'Guardados', 'Cuenta'].map((item, index) => (
                <div key={item} style={{textAlign: 'center', opacity: 1}}>
                  <div style={{width: mix(toBottom, 0, 20), height: mix(toBottom, 0, 20), margin: '0 auto', borderRadius: 6, background: index === 0 ? tokens.accent : '#D9DFEA'}} />
                  <div style={{marginTop: mix(toBottom, 0, 4), fontSize: mix(toBottom, 11, 10), fontWeight: 800, color: index === 0 ? tokens.accent : muted}}>{item}</div>
                </div>
              ))}
            </div>
            <div style={{position: 'absolute', left: 14, right: 14, top: mix(toBottom, 96, 60), display: 'grid', gap: 9}}>
              {[0, 1, 2].map((card) => (
                <div key={card} style={{height: 56, borderRadius: 11, background: palette.white, border: `2px solid ${rule}`}} />
              ))}
            </div>
          </Phone>
        </div>

        <Closing text="No lo reduzcas. Adáptalo al contexto." opacity={closing} tokens={tokens} width={620} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 10 · The gestures are part of the design
 * ------------------------------------------------------------------ */

const GESTURES = ['TOCAR', 'DESLIZAR', 'MANTENER', 'ARRASTRAR', 'AMPLIAR'] as const;

/**
 * Initial state: one phone. Question: what can it do that a mouse cannot?
 * Action: five gestures, each with its visible consequence. Proof: the names
 * line up under the device and the device never became a small computer.
 */
export const AentsMobileGesturesSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const phoneWidth = 290;
  const phoneHeight = 420;
  const screenWidth = phoneWidth - 18;
  const screenHeight = phoneHeight - 18;

  const slot = 0.84 / GESTURES.length;
  const index = Math.min(GESTURES.length - 1, Math.floor(p / slot));
  const local = clamp01((p - index * slot) / slot);
  const closing = beat(p, 0.86, 0.96);

  // Each gesture owns one consequence, and only one is on screen at a time.
  const cardOpen = index === 0 ? beat(local, 0.34, 0.68) : index > 0 ? 1 : 0;
  const photo = index === 1 ? ramp(local, 0.3, 0.76, 0, 1) : index > 1 ? 1 : 0;
  const held = index === 2 ? beat(local, 0.42, 0.66) : 0;
  const dragged = index === 3 ? ramp(local, 0.28, 0.76, 0, 1) : index > 3 ? 1 : 0;
  const zoom = index === 4 ? glide(local, 0.26, 0.8, 1, 1.75) : 1;
  const pinch = index === 4 ? glide(local, 0.26, 0.8, 0, 48) : 0;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="EL TELÉFONO SABE MÁS" title="Cinco formas de tocarlo">
      <div style={{position: 'relative', marginTop: 20, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: STAGE / 2 - phoneWidth / 2, top: 0}}>
          <Phone width={phoneWidth} height={phoneHeight} tokens={tokens}>
            {index === 4 ? (
              <MapSurface width={screenWidth} height={screenHeight} zoom={zoom} visible={4} tokens={tokens} />
            ) : (
              <div style={{position: 'absolute', inset: 0, padding: '26px 14px 14px'}}>
                {/* The photo the swipe changes. */}
                <div style={{position: 'relative', height: 128, borderRadius: 12, overflow: 'hidden', background: '#DCE3EE'}}>
                  <div style={{position: 'absolute', inset: 0, display: 'flex', transform: `translateX(${-photo * 100}%)`}}>
                    {['#DCE3EE', '#CBD8E8'].map((tone) => (
                      <div key={tone} style={{minWidth: '100%', height: '100%', background: tone}} />
                    ))}
                  </div>
                  <div style={{position: 'absolute', left: '50%', bottom: 9, display: 'flex', gap: 6, transform: 'translateX(-50%)'}}>
                    {[0, 1].map((dot) => (
                      <span key={dot} style={{width: 7, height: 7, borderRadius: 99, background: (dot === 0 ? photo < 0.5 : photo >= 0.5) ? tokens.accent : 'rgba(15,21,38,.24)'}} />
                    ))}
                  </div>
                </div>

                {/* The card the tap opens. */}
                <div style={{marginTop: 12, padding: 12, borderRadius: 12, background: palette.white, border: `2px solid ${rule}`, opacity: cardOpen, transform: `translateY(${(1 - cardOpen) * 14}px)`}}>
                  <div style={{fontSize: 18, fontWeight: 800, color: ink}}>Torre Norte</div>
                  <div style={{marginTop: 5, fontSize: 12, fontWeight: 700, color: muted}}>Zona residencial</div>
                </div>

                {/* The options a long press reveals. They are removed rather
                    than hidden: an invisible block still takes its height, and
                    the drag beat below would be pushed off the screen. */}
                {index === 2 ? (
                <div style={{marginTop: 10, display: 'grid', gap: 7, opacity: held, transform: `scale(${mix(held, 0.92, 1)})`, transformOrigin: 'top center'}}>
                  {['Guardar', 'Compartir', 'Ocultar'].map((option) => (
                    <div key={option} style={{padding: '8px 12px', borderRadius: 9, background: ink, color: palette.white, fontSize: 12, fontWeight: 800}}>
                      {option}
                    </div>
                  ))}
                </div>
                ) : null}

                {/* The item the drag moves. */}
                {index === 3 ? (
                  <div style={{marginTop: 12, position: 'relative', height: 96}}>
                    {[0, 1].map((slotIndex) => (
                      <div key={slotIndex} style={{position: 'absolute', left: 0, right: 0, top: slotIndex * 50, height: 42, borderRadius: 10, border: `2px dashed ${rule}`}} />
                    ))}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: mix(dragged, 0, 50),
                        height: 42,
                        borderRadius: 10,
                        background: tokens.accent,
                        color: palette.white,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 13,
                        fontWeight: 800,
                        boxShadow: `0 12px 28px ${tokens.accent}66`,
                      }}
                    >
                      Mover a favoritos
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* The hand: one finger, except for the pinch. */}
            {index === 4 ? (
              <>
                <Finger x={screenWidth / 2 - pinch} y={screenHeight / 2 + 20} radius={26} opacity={beat(local, 0.1, 0.24)} />
                <Finger x={screenWidth / 2 + pinch} y={screenHeight / 2 - 20} radius={26} opacity={beat(local, 0.1, 0.24)} />
              </>
            ) : (
              <Finger
                x={index === 1 ? mix(ramp(local, 0.3, 0.76, 0, 1), 210, 62) : index === 3 ? 150 : 150}
                y={index === 0 ? 118 : index === 1 ? 92 : index === 2 ? 176 : mix(dragged, 300, 350)}
                radius={28}
                press={index === 2 ? beat(local, 0.2, 0.44) : passing(local, 0.24, 0.4, 0.62)}
                opacity={beat(local, 0.08, 0.2)}
              />
            )}
          </Phone>
        </div>

        {/* The name of the gesture being made, next to the device. */}
        <div style={{position: 'absolute', left: 0, top: 150, width: 190, textAlign: 'right', opacity: 1 - closing}}>
          <div style={{fontSize: 34, fontWeight: 800, letterSpacing: '-.02em', color: tokens.soft}}>{GESTURES[index]}</div>
        </div>

        {/* All five, once the phone has shown them. */}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 54, display: 'flex', justifyContent: 'center', gap: 9, opacity: closing}}>
          {GESTURES.map((name) => (
            <span key={name} style={{padding: '9px 13px', borderRadius: 99, background: 'rgba(255,255,255,.09)', border: `2px solid ${tokens.soft}4D`, fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.88)'}}>
              {name}
            </span>
          ))}
        </div>

        <Closing text="Diseña la interacción" opacity={closing} tokens={tokens} width={460} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 11 · Your machine is not your user's machine
 * ------------------------------------------------------------------ */

const PAYLOAD = [
  {label: 'IMÁGENES', size: 132},
  {label: 'SCRIPTS', size: 96},
  {label: 'VIDEO', size: 120},
  {label: 'DATOS', size: 84},
] as const;

/**
 * Initial state: the same page, requested from two places. Question: why does
 * one of them still be loading? Action: the weight is made visible as it lands
 * on the phone, and then it is cut. Proof: the bar completes and the page
 * arrives, without anything about the page having changed.
 */
export const AentsMobileWeightSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const fibreDone = beat(p, 0.1, 0.18);
  const fall = beat(p, 0.2, 0.46);
  // The crawl: it gets nowhere on purpose, and stops entirely while the weight
  // is still arriving.
  const crawl = ramp(p, 0.24, 0.5, 0, 0.22);
  const fix = ramp(p, 0.56, 0.78, 0, 1);
  const finish = ramp(p, 0.72, 0.88, 0, 1);
  const bar = Math.max(crawl, finish);
  const closing = beat(p, 0.86, 0.96);

  const phoneWidth = 186;
  const phoneHeight = 300;

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="TAMBIÉN ES RENDIMIENTO" title="Tu máquina no es la suya">
      <Stage content={420}>
        {/* The developer's machine: instant, and therefore misleading. */}
        <div style={{position: 'absolute', left: 0, top: 6, width: 330}}>
          <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.12em', color: 'rgba(255,255,255,.58)'}}>FIBRA ÓPTICA</div>
          <div style={{marginTop: 12}}>
            <Desktop width={318} height={190} tokens={tokens}>
              <div style={{position: 'absolute', inset: 0, padding: 12, opacity: fibreDone}}>
                <div style={{height: 58, borderRadius: 9, background: '#DCE3EE'}} />
                <div style={{marginTop: 9, height: 10, width: '78%', borderRadius: 99, background: '#E4E9F1'}} />
                <div style={{marginTop: 7, height: 10, width: '56%', borderRadius: 99, background: '#EAEEF5'}} />
                <div style={{marginTop: 12, height: 26, width: 108, borderRadius: 8, background: tokens.accent}} />
              </div>
            </Desktop>
          </div>
          <div style={{marginTop: 14}}>
            <Verdict label="ABRE AL INSTANTE" tone="good" opacity={fibreDone} tokens={tokens} />
          </div>
        </div>

        {/* The user's phone, and everything that has to reach it. */}
        <div style={{position: 'absolute', right: 0, top: 6, width: 350}}>
          <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.12em', color: tokens.soft}}>DATOS MÓVILES</div>
          <div style={{position: 'relative', marginTop: 12, height: 330}}>
            <div style={{position: 'absolute', right: 12, top: 0}}>
              <Phone width={phoneWidth} height={phoneHeight} tokens={tokens}>
                <div style={{position: 'absolute', inset: 0, padding: 12, opacity: finish}}>
                  <div style={{height: 52, borderRadius: 9, background: '#DCE3EE'}} />
                  <div style={{marginTop: 9, height: 9, width: '82%', borderRadius: 99, background: '#E4E9F1'}} />
                  <div style={{marginTop: 7, height: 9, width: '58%', borderRadius: 99, background: '#EAEEF5'}} />
                  <div style={{marginTop: 11, height: 26, borderRadius: 8, background: tokens.accent}} />
                </div>

                {/* The bar that does not move. */}
                <div style={{position: 'absolute', left: 16, right: 16, top: 138, opacity: 1 - finish}}>
                  <div style={{height: 8, borderRadius: 99, background: '#E1E6EF', overflow: 'hidden'}}>
                    <div style={{height: '100%', width: `${bar * 100}%`, borderRadius: 99, background: bar > 0.5 ? tokens.confirm : tokens.alert}} />
                  </div>
                  <div style={{marginTop: 9, textAlign: 'center', fontSize: 12, fontWeight: 800, color: muted}}>
                    {finish > 0.05 ? 'Cargando…' : 'Cargando…'}
                  </div>
                </div>
              </Phone>
            </div>

            {/* The payload, falling and then being cut down. */}
            {PAYLOAD.map((block, index) => {
              const drop = beat(p, 0.2 + index * 0.05, 0.4 + index * 0.05);
              const width = mix(fix, block.size, block.size * 0.34);
              return (
                <div
                  key={block.label}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 18 + index * 52,
                    width,
                    height: mix(fix, 40, 24),
                    boxSizing: 'border-box',
                    borderRadius: 9,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    background: fix > 0.55 ? `${tokens.confirm}2E` : `${tokens.alert}2E`,
                    border: `2px solid ${fix > 0.55 ? tokens.confirm : tokens.alert}`,
                    color: 'rgba(255,255,255,.9)',
                    fontSize: mix(fix, 15, 12),
                    fontWeight: 800,
                    opacity: drop * (0.4 + fall * 0.6),
                    transform: `translateY(${(1 - drop) * -26}px)`,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {block.label}
                </div>
              );
            })}

            {/* A hundred rows asked for, ten of them shown. */}
            <div style={{position: 'absolute', left: 0, top: 230, width: 140, fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.85)', ...figures}}>
              <div style={{textDecoration: fix > 0.4 ? 'line-through' : 'none', opacity: fix > 0.4 ? 0.42 : 1}}>100 resultados</div>
              <div style={{marginTop: 6, color: tokens.confirm, opacity: beat(p, 0.6, 0.72)}}>10 resultados</div>
            </div>
            <div style={{position: 'absolute', left: 0, top: 292}}>
              <Example />
            </div>
          </div>
        </div>

        <Closing text="Carga lo que necesitas, cuando lo necesitas" opacity={closing} tokens={tokens} width={640} lines={1} />
      </Stage>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 12 · From the phone upwards
 * ------------------------------------------------------------------ */

const BREAKPOINTS = [
  {label: 'TELÉFONO', width: 214},
  {label: 'TABLETA', width: 372},
  {label: 'PORTÁTIL', width: 540},
  {label: 'MONITOR', width: 700},
] as const;

/**
 * Initial state: one resolved column. Question: what should the extra room be
 * used for? Action: the frame widens and new pieces appear in the space that
 * opens. Proof: the first column is exactly the width it always was, which is
 * the difference between growing and enlarging.
 */
export const AentsMobileUpwardSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const grow = ramp(p, 0.1, 0.86, 0, 1);
  const width = mix(grow, BREAKPOINTS[0].width, BREAKPOINTS[3].width);
  const closing = beat(p, 0.86, 0.96);

  // Which stop the frame has reached; the label follows the width, not a timer.
  const reached = BREAKPOINTS.filter((stop) => width >= stop.width - 8);
  const current = reached[reached.length - 1] ?? BREAKPOINTS[0];

  const columnWidth = 190;
  const second = clamp01((width - BREAKPOINTS[1].width + 60) / 90);
  const panel = clamp01((width - BREAKPOINTS[2].width + 60) / 90);
  const filters = clamp01((width - BREAKPOINTS[3].width + 70) / 90);

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="DE MÓVIL HACIA ARRIBA" title="Más espacio, más piezas">
      <div style={{position: 'relative', marginTop: 20, height: STAGE_HEIGHT}}>
        {/* The stops, evenly spaced.
            Placing each label above the frame edge it corresponds to looked
            precise and printed `PORTÁTIL` on top of `MONITOR`: the widths are
            79 px apart and the words are wider than that. Even spacing gives
            every word its own room and the highlight still says where we are. */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 40, display: 'flex'}}>
          {BREAKPOINTS.map((stop) => {
            const active = width >= stop.width - 8;
            return (
              <div key={stop.label} style={{flex: 1, textAlign: 'center'}}>
                <div style={{margin: '0 auto', width: active ? 28 : 3, height: 4, borderRadius: 99, background: active ? tokens.accent : 'rgba(255,255,255,.22)'}} />
                <div style={{marginTop: 9, fontSize: 17, fontWeight: 800, letterSpacing: '.06em', color: active ? tokens.soft : 'rgba(255,255,255,.3)'}}>{stop.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{position: 'absolute', left: STAGE / 2 - width / 2, top: 56}}>
          <div
            style={{
              width,
              height: 320,
              boxSizing: 'border-box',
              borderRadius: 18,
              overflow: 'hidden',
              background: paper,
              border: `2px solid ${tokens.soft}44`,
              boxShadow: '0 26px 70px rgba(0,0,0,.5)',
              display: 'flex',
            }}
          >
            {/* The panel that was behind a button on the phone. */}
            <div style={{width: panel * 132, overflow: 'hidden', background: palette.white, borderRight: panel > 0.1 ? `2px solid ${rule}` : 'none'}}>
              <div style={{width: 132, padding: 12, boxSizing: 'border-box', opacity: panel}}>
                <div style={{fontSize: 12, fontWeight: 800, color: muted, letterSpacing: '.08em'}}>NAVEGACIÓN</div>
                {['Inicio', 'Buscar', 'Guardados', 'Cuenta'].map((item) => (
                  <div key={item} style={{marginTop: 9, height: 24, borderRadius: 7, background: '#EDF1F7', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: muted}}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* The column that never changes width. */}
            <div style={{width: columnWidth, flexShrink: 0, padding: 12, boxSizing: 'border-box'}}>
              <div style={{height: 86, borderRadius: 10, background: '#DCE3EE'}} />
              <div style={{marginTop: 9, height: 10, width: '80%', borderRadius: 99, background: '#E4E9F1'}} />
              <div style={{marginTop: 7, height: 10, width: '58%', borderRadius: 99, background: '#EAEEF5'}} />
              <div style={{marginTop: 12, height: 34, borderRadius: 9, background: tokens.accent, color: palette.white, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800}}>
                Acción principal
              </div>
              <div style={{marginTop: 10, display: 'grid', gap: 8}}>
                {[0, 1].map((card) => (
                  <div key={card} style={{height: 42, borderRadius: 9, background: palette.white, border: `2px solid ${rule}`}} />
                ))}
              </div>
            </div>

            {/* The second column, which only exists because there is room. */}
            <div style={{width: second * 178, overflow: 'hidden'}}>
              <div style={{width: 178, padding: 12, boxSizing: 'border-box', opacity: second}}>
                <div style={{fontSize: 12, fontWeight: 800, color: muted, letterSpacing: '.08em'}}>RESULTADOS</div>
                <div style={{marginTop: 9, display: 'grid', gap: 8}}>
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} style={{height: 44, borderRadius: 9, background: palette.white, border: `2px solid ${rule}`}} />
                  ))}
                </div>
              </div>
            </div>

            {/* And the filters, last, because they were never the priority. */}
            <div style={{width: filters * 158, overflow: 'hidden', background: palette.white, borderLeft: filters > 0.1 ? `2px solid ${rule}` : 'none'}}>
              <div style={{width: 158, padding: 12, boxSizing: 'border-box', opacity: filters}}>
                <div style={{fontSize: 12, fontWeight: 800, color: muted, letterSpacing: '.08em'}}>FILTROS</div>
                {['Tipo', 'Precio', 'Área'].map((item) => (
                  <div key={item} style={{marginTop: 10}}>
                    <div style={{fontSize: 11, fontWeight: 800, color: ink}}>{item}</div>
                    <div style={{marginTop: 5, height: 6, borderRadius: 99, background: '#E4E9F1'}}>
                      <div style={{width: '58%', height: '100%', borderRadius: 99, background: tokens.accent}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, top: 396, fontSize: 22, fontWeight: 800, letterSpacing: '.1em', color: tokens.soft}}>{current.label}</div>

        <Closing text="Más espacio, más posibilidades" opacity={closing} tokens={tokens} width={560} lines={1} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 13 · Do not look at it. Use it.
 * ------------------------------------------------------------------ */

const TEST_STEPS = ['Abrir el menú', 'Buscar algo', 'Llenar el formulario', 'Pulsar la acción'] as const;

/**
 * Initial state: a phone in one hand. Question: can the work actually be done
 * like this? Action: the four steps of the test, each with its own result.
 * Proof: the reach arc, drawn last, says whether the answer was luck.
 */
export const AentsMobileUseItSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});

  const phoneWidth = 292;
  const phoneHeight = 442;
  const screenWidth = phoneWidth - 18;
  const screenHeight = phoneHeight - 18;
  const phoneLeft = STAGE / 2 - phoneWidth / 2 - 60;

  const slot = 0.62 / TEST_STEPS.length;
  const index = Math.min(TEST_STEPS.length - 1, Math.floor(p / slot));
  const local = clamp01((p - index * slot) / slot);
  const testing = p < 0.62;

  const reach = beat(p, 0.66, 0.84);
  const closing = beat(p, 0.86, 0.96);

  const menuOpen = index === 0 ? beat(local, 0.3, 0.6) : 1 - beat(p, slot * 1.1, slot * 1.3);
  const typed = index === 1 ? beat(local, 0.28, 0.72) : index > 1 ? 1 : 0;
  const filled = index === 2 ? beat(local, 0.24, 0.78) : index > 2 ? 1 : 0;
  const pressed = index === 3 ? beat(local, 0.4, 0.7) : 0;

  // Where the thumb is, step by step, and where it rests for the arc.
  const thumb = {
    x: index === 0 ? 42 : index === 1 ? 150 : index === 2 ? 150 : 150,
    y: index === 0 ? 40 : index === 1 ? 92 : index === 2 ? mix(filled, 190, 262) : 356,
  };

  return (
    <Panel tokens={tokens} enter={enter} eyebrow="LA PRUEBA" title="Ábrela y haz el trabajo">
      <div style={{position: 'relative', marginTop: 20, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: phoneLeft, top: 4}}>
          <Phone width={phoneWidth} height={phoneHeight} tokens={tokens}>
            {/* The top bar and its menu. */}
            <div style={{position: 'absolute', left: 0, right: 0, top: 22, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: palette.white, borderBottom: `2px solid ${rule}`}}>
              <Burger size={20} color={ink} />
              <span style={{fontSize: 13, fontWeight: 800, color: ink}}>Tu Empresa</span>
              <span style={{width: 20}} />
            </div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 60, height: mix(menuOpen, 0, 132), overflow: 'hidden', background: palette.white, borderBottom: menuOpen > 0.1 ? `2px solid ${rule}` : 'none'}}>
              {['Servicios', 'Proyectos', 'Contacto'].map((item) => (
                <div key={item} style={{padding: '12px 16px', fontSize: 13, fontWeight: 800, color: ink, borderBottom: `1px solid ${rule}`}}>
                  {item}
                </div>
              ))}
            </div>

            {/* The search the second step types into. */}
            <div style={{position: 'absolute', left: 14, right: 14, top: 74, height: 38, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', borderRadius: 99, background: '#EEF1F6', opacity: 1 - menuOpen}}>
              <Magnifier size={17} color={muted} />
              <span style={{fontSize: 13, fontWeight: 800, color: typed > 0.4 ? ink : muted}}>{typed > 0.4 ? 'Bodega industrial' : 'Buscar'}</span>
            </div>

            {/* The short form the third step fills. */}
            <div style={{position: 'absolute', left: 14, right: 14, top: 128, opacity: 1 - menuOpen}}>
              {['Nombre', 'Teléfono'].map((label, position) => {
                const done = filled > (position === 0 ? 0.35 : 0.75);
                return (
                  <div key={label} style={{marginBottom: 10}}>
                    <div style={{fontSize: 11, fontWeight: 800, color: muted}}>{label}</div>
                    <div style={{marginTop: 4, height: 42, borderRadius: 9, background: palette.white, border: `2px solid ${done ? tokens.confirm : rule}`, display: 'flex', alignItems: 'center', padding: '0 11px'}}>
                      <div style={{height: 8, width: done ? '62%' : 0, borderRadius: 99, background: '#DCE3EE'}} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* The primary action, where a thumb can reach it. */}
            <div
              style={{
                position: 'absolute',
                left: 14,
                right: 14,
                top: 336,
                height: 50,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                background: pressed > 0.4 ? tokens.confirm : tokens.accent,
                color: pressed > 0.4 ? '#06210F' : palette.white,
                fontSize: 17,
                fontWeight: 800,
                transform: `scale(${1 - pressed * 0.03})`,
                opacity: 1 - menuOpen * 0.4,
              }}
            >
              {pressed > 0.4 ? 'Enviado' : 'Enviar solicitud'}
            </div>

            {/* The reach arc, drawn from the thumb's pivot at the bottom right. */}
            {reach > 0 ? (
              <svg width={screenWidth} height={screenHeight} viewBox={`0 0 ${screenWidth} ${screenHeight}`} style={{position: 'absolute', inset: 0, opacity: reach}}>
                <defs>
                  <radialGradient id="reach-easy" cx="0.82" cy="1" r="0.86">
                    <stop offset="52%" stopColor={tokens.confirm} stopOpacity="0.34" />
                    <stop offset="53%" stopColor={tokens.confirm} stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="reach-hard" cx="0.82" cy="1" r="0.86">
                    <stop offset="52%" stopColor={tokens.alert} stopOpacity="0" />
                    <stop offset="53%" stopColor={tokens.alert} stopOpacity="0.26" />
                  </radialGradient>
                </defs>
                <rect width={screenWidth} height={screenHeight} fill="url(#reach-hard)" />
                <rect width={screenWidth} height={screenHeight} fill="url(#reach-easy)" />
              </svg>
            ) : null}

            {testing ? (
              <Finger x={thumb.x} y={thumb.y} radius={30} press={passing(local, 0.3, 0.46, 0.66)} opacity={beat(local, 0.06, 0.18)} />
            ) : (
              <Finger x={228} y={366} radius={30} press={0.2} opacity={reach} />
            )}
          </Phone>
        </div>

        {/* The checklist: the test is only passed by doing it. */}
        <div style={{position: 'absolute', right: 0, top: 24, width: 232, display: 'grid', gap: 11, opacity: 1 - closing}}>
          {TEST_STEPS.map((step, position) => {
            const done = position < index || (position === index && local > 0.72);
            return (
              <div
                key={step}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 13px',
                  borderRadius: 14,
                  background: done ? `${tokens.confirm}1F` : 'rgba(255,255,255,.05)',
                  border: `2px solid ${done ? `${tokens.confirm}7A` : 'rgba(255,255,255,.1)'}`,
                  opacity: position <= index ? 1 : 0.36,
                }}
              >
                <span style={{width: 24, height: 24, display: 'grid', placeItems: 'center'}}>
                  {done ? <Tick size={22} color={tokens.confirm} /> : <span style={{width: 9, height: 9, borderRadius: 99, background: 'rgba(255,255,255,.28)'}} />}
                </span>
                <BoxedText text={step} width={162} max={19} min={14} style={{fontWeight: 800, color: 'rgba(255,255,255,.88)'}} />
              </div>
            );
          })}
          <div style={{marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, opacity: reach}}>
            <span style={{width: 14, height: 14, borderRadius: 4, background: tokens.confirm}} />
            <span style={{fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.8)'}}>Alcanza el pulgar</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, opacity: reach}}>
            <span style={{width: 14, height: 14, borderRadius: 4, background: tokens.alert}} />
            <span style={{fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.8)'}}>Cuesta llegar</span>
          </div>
        </div>

        <Closing text="No la mires. Úsala." opacity={closing} tokens={tokens} width={440} lines={1} />
      </div>
    </Panel>
  );
};
