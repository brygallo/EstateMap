import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {font, sideCrop} from './theme';
import {Shell} from './aents-simulations';
import type {SimulationProps} from './simulations';

/**
 * What a customer finds when they look a company up, and what they could find
 * instead.
 *
 * Everything drawn here belongs to an invented company: the search results, the
 * domain, the loading counter and the rebuilt page are illustrations of a
 * situation, not a report about anyone. They carry the `EJEMPLO` badge for as
 * long as they are on screen, and no figure on them states a fact about a
 * market, a client or Aents.
 *
 * The search surface is drawn as a generic one — a field, a magnifier and a
 * list of results — instead of imitating a search engine's marks. The piece
 * recreates the pattern the viewer recognises; it does not put someone else's
 * logo on screen.
 */

const violet = '#6B5CF6';
const lavender = '#A78BFA';
const alert = '#F59E0B';
const ink = '#0F1526';

/** A stage of the shot, clamped at both ends so nothing extrapolates. */
const beat = (value: number, from: number, to: number) =>
  interpolate(value, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Tabular figures: a counter that changes must not shift what sits beside it. */
const figures: React.CSSProperties = {fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"'};

/**
 * The badge every invented company lives under.
 *
 * `tuempresa.com`, its profiles and its rebuilt page are examples in exactly the
 * sense the brief allows: they teach what a visitor runs into, they do not
 * report anything real.
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

/**
 * The full-bleed ground for the beats that hold nothing but words.
 *
 * It repeats the radial and the grid of `Shell` so the typographic scenes read
 * as the same room with the panel taken out, rather than as different stock.
 */
const Field: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 30%, #392D8C 0%, #15152E 38%, #080915 76%)', fontFamily: font, color: '#FFFFFF'}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        backgroundImage:
          'linear-gradient(rgba(167,139,250,.5) 2px,transparent 2px),linear-gradient(90deg,rgba(167,139,250,.5) 2px,transparent 2px)',
        backgroundSize: '64px 64px',
        maskImage: 'linear-gradient(#000,transparent 72%)',
      }}
    />
    {children}
  </AbsoluteFill>
);

/** The magnifier, drawn rather than typed, so it never depends on an emoji font. */
const Magnifier: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="2.6" />
    <path d="M15.4 15.4L20 20" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

/* ------------------------------------------------------------------ *
 * 1 · The search, and the result that is missing from it
 * ------------------------------------------------------------------ */

const QUERY = 'Tu Empresa';

// What a company without a site of its own actually ranks with: profiles it
// does not own and a listing somebody else wrote. They are named as the kind of
// page they are, never drawn with another company's mark.
const FOUND = [
  {title: 'Tu Empresa', kind: 'Perfil de Instagram', host: 'instagram.com'},
  {title: 'Tu Empresa', kind: 'Página de Facebook', host: 'facebook.com'},
  {title: 'Tu Empresa', kind: 'Ficha en un directorio', host: 'directorio-de-empresas.ec'},
];

export const AentsQuerySim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();
  const typed = QUERY.slice(0, Math.round(beat(p, 0.03, 0.24) * QUERY.length));
  const caret = Math.floor(frame / (fps * 0.28)) % 2 === 0 && p < 0.3;
  const missing = spring({frame: frame - span * 0.66, fps, config: {damping: 15, mass: 0.8}});
  // The last beat is a shift of attention rather than a new element: what was
  // found dims, and the row that is missing keeps the light. Without it the
  // shot froze for its final two seconds.
  const dimmed = beat(p, 0.8, 0.96);
  return (
    <Shell frame={frame} eyebrow="LO QUE ENCUENTRA" title="Tu empresa en el buscador">
      <div style={{position: 'relative', marginTop: 22, height: 500}}>
        {/* The field, with the query arriving letter by letter. */}
        <div
          style={{
            height: 84,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '0 26px',
            borderRadius: 99,
            background: '#FFFFFF',
            boxShadow: '0 18px 46px rgba(0,0,0,.34)',
          }}
        >
          <Magnifier size={34} color="#67718A" />
          <span style={{fontSize: 34, fontWeight: 800, color: ink, letterSpacing: '-.02em'}}>
            {typed}
            <span style={{opacity: caret ? 1 : 0, color: violet}}>|</span>
          </span>
        </div>

        <div style={{marginTop: 20, display: 'grid', gap: 12}}>
          {FOUND.map((result, index) => {
            const a = beat(p, 0.26 + index * 0.09, 0.42 + index * 0.09);
            return (
              <div
                key={result.kind}
                style={{
                  height: 88,
                  boxSizing: 'border-box',
                  padding: '14px 22px',
                  borderRadius: 22,
                  background: 'rgba(255,255,255,.07)',
                  border: '2px solid rgba(255,255,255,.12)',
                  opacity: a * (1 - dimmed * 0.62),
                  transform: `translateY(${(1 - a) * 16}px) scale(${1 - dimmed * 0.015})`,
                }}
              >
                <div style={{fontSize: 27, fontWeight: 800, color: lavender}}>
                  {result.title} <span style={{color: 'rgba(255,255,255,.45)'}}>· {result.kind}</span>
                </div>
                <div style={{marginTop: 6, fontSize: 21, fontWeight: 700, color: 'rgba(255,255,255,.42)'}}>{result.host}</div>
              </div>
            );
          })}

          {/* The row that never arrives. It is drawn as an empty slot on
              purpose: the problem is an absence, and an absence needs a shape
              to be seen. */}
          <div
            style={{
              height: 88,
              boxSizing: 'border-box',
              padding: '14px 22px',
              borderRadius: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              border: `3px dashed ${alert}`,
              background: `${alert}12`,
              opacity: missing,
              transform: `scale(${0.96 + missing * 0.04})`,
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: alert,
                color: '#1B1204',
                fontSize: 30,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              ✕
            </span>
            <div>
              <div style={{fontSize: 28, fontWeight: 800}}>Tu página web</div>
              <div style={{marginTop: 3, fontSize: 21, fontWeight: 800, color: alert, letterSpacing: '.06em'}}>NO APARECE</div>
            </div>
          </div>
        </div>

        <Example style={{position: 'absolute', right: 0, bottom: -26}} />
      </div>
    </Shell>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · It exists, it is slow, and the phone cannot hold it
 * ------------------------------------------------------------------ */

/**
 * The page inside the viewport keeps its desktop width whatever happens around
 * it. That is the whole demonstration: the frame narrows to a phone and the
 * layout does not follow, so the columns run off the edge exactly as they do on
 * a site built for one screen size.
 */
const DesktopPage: React.FC<{lit: number}> = ({lit}) => (
  <div style={{width: 752, height: '100%', background: '#FFFFFF', opacity: lit}}>
    <div style={{height: 62, display: 'flex', alignItems: 'center', gap: 26, padding: '0 24px', borderBottom: '2px solid #E6EBF3'}}>
      <span style={{fontSize: 24, fontWeight: 800, color: ink}}>TU EMPRESA</span>
      {['Inicio', 'Nosotros', 'Servicios', 'Productos', 'Contacto'].map((item) => (
        <span key={item} style={{fontSize: 18, fontWeight: 700, color: '#6C778F', whiteSpace: 'nowrap'}}>{item}</span>
      ))}
    </div>
    <div style={{padding: '22px 24px'}}>
      <div style={{fontSize: 30, fontWeight: 800, color: ink, whiteSpace: 'nowrap'}}>Bienvenidos a nuestro sitio institucional</div>
      <div style={{marginTop: 14, display: 'grid', gap: 9}}>
        {[720, 690, 730, 660, 700, 640].map((width, index) => (
          <div key={index} style={{width, height: 11, borderRadius: 99, background: '#DCE3EE'}} />
        ))}
      </div>
      <div style={{marginTop: 20, display: 'flex', gap: 16}}>
        {['Servicio A', 'Servicio B', 'Servicio C'].map((card) => (
          <div key={card} style={{width: 232, height: 132, borderRadius: 14, background: '#EEF2F8', border: '2px solid #E2E8F2', padding: 16, boxSizing: 'border-box'}}>
            <div style={{fontSize: 19, fontWeight: 800, color: '#5A6479'}}>{card}</div>
            <div style={{marginTop: 12, display: 'grid', gap: 7}}>
              {[190, 170, 150].map((width) => <div key={width} style={{width, height: 8, borderRadius: 99, background: '#D8E0EC'}} />)}
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 22, width: 240, height: 52, borderRadius: 10, background: '#3E5C86', color: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800}}>
        Más información
      </div>
    </div>
  </div>
);

export const AentsSlowSiteSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();
  // The wait is measured in whole seconds because that is how a visitor counts
  // it. The number is an illustration of the wait, not a benchmark.
  const waited = Math.min(4, Math.floor(beat(p, 0.06, 0.5) * 4.6));
  const loading = beat(p, 0.06, 0.5);
  const lit = beat(p, 0.44, 0.56);
  // The viewport collapses to a phone; the page inside keeps its width.
  const viewport = interpolate(beat(p, 0.5, 0.68), [0, 1], [752, 330]);
  const squeezed = beat(p, 0.56, 0.74);
  const verdict = spring({frame: frame - span * 0.74, fps, config: {damping: 16, mass: 0.8}});
  return (
    <Shell frame={frame} eyebrow="Y SI SÍ TIENES UNA" title="tuempresa.com">
      <div style={{position: 'relative', marginTop: 24, height: 500, display: 'grid', placeItems: 'center'}}>
        <div
          style={{
            width: viewport,
            height: 452,
            borderRadius: squeezed > 0.3 ? 38 : 22,
            overflow: 'hidden',
            background: '#FFFFFF',
            border: `${6 + squeezed * 8}px solid #1B2233`,
            boxSizing: 'border-box',
            boxShadow: '0 26px 70px rgba(0,0,0,.42)',
            position: 'relative',
          }}
        >
          <DesktopPage lit={lit} />

          {/* While it loads there is nothing to look at but the wait. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: '#F5F7FB',
              opacity: 1 - lit,
            }}
          >
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 92, fontWeight: 800, color: '#8A93A8', letterSpacing: '-.05em', ...figures}}>{waited}s</div>
              <div style={{margin: '18px auto 0', width: 300, height: 8, borderRadius: 99, background: '#E1E7F0', overflow: 'hidden'}}>
                <div style={{width: `${loading * 74}%`, height: '100%', borderRadius: 99, background: alert}} />
              </div>
              <div style={{marginTop: 16, fontSize: 22, fontWeight: 800, color: '#98A1B5', letterSpacing: '.1em'}}>CARGANDO</div>
            </div>
          </div>
        </div>

        {/* The findings live in the column the shrunken frame leaves free. A row
            under the card would sit on top of the phone: once the viewport is
            330 px wide the card still occupies the middle of the board, so the
            only empty space is beside it. */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 150,
            width: 196,
            display: 'grid',
            gap: 14,
            opacity: verdict,
            transform: `translateX(${(1 - verdict) * 20}px)`,
          }}
        >
          {['TARDA EN ABRIR', 'NO SE ADAPTA'].map((chip) => (
            <span
              key={chip}
              style={{
                padding: '12px 14px',
                borderRadius: 20,
                background: `${alert}1F`,
                border: `2px solid ${alert}`,
                color: alert,
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: '.05em',
                lineHeight: 1.2,
                textAlign: 'center',
              }}
            >
              {chip}
            </span>
          ))}
        </div>

        <Example style={{position: 'absolute', right: 0, bottom: -26}} />
      </div>
    </Shell>
  );
};

/* ------------------------------------------------------------------ *
 * 3 · The visitor leaves, and nobody finds out
 * ------------------------------------------------------------------ */

const STEPS = [
  {label: 'BUSCA', at: 0.04},
  {label: 'ENTRA', at: 0.18},
  {label: 'SE VA', at: 0.32},
];

export const AentsBounceSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const travel = beat(p, 0.06, 0.44);
  const struck = beat(p, 0.5, 0.74);
  const lost = beat(p, 0.72, 0.94);
  const columns = [sideCrop + 6, 540, 1080 - sideCrop - 226];
  return (
    <Field>
      {/* The route, laid out left to right: three stops and one dot walking
          them. Nothing here is a screen — this is the person, not the page. */}
      <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 386, height: 8, borderRadius: 99, background: 'rgba(255,255,255,.12)'}} />
      <div
        style={{
          position: 'absolute',
          left: sideCrop,
          top: 386,
          height: 8,
          width: (1080 - sideCrop * 2) * travel,
          borderRadius: 99,
          background: `linear-gradient(90deg, ${lavender}, ${alert})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: sideCrop + (1080 - sideCrop * 2) * travel - 17,
          top: 373,
          width: 34,
          height: 34,
          borderRadius: 99,
          background: '#FFFFFF',
          boxShadow: '0 0 34px rgba(255,255,255,.6)',
        }}
      />
      {STEPS.map((step, index) => {
        const a = beat(p, step.at, step.at + 0.12);
        const last = index === STEPS.length - 1;
        return (
          <div
            key={step.label}
            style={{
              position: 'absolute',
              left: columns[index],
              top: 440,
              width: 226,
              textAlign: index === 0 ? 'left' : index === 1 ? 'center' : 'right',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '.12em',
              color: last ? alert : 'rgba(255,255,255,.62)',
              opacity: a,
              transform: `translateY(${(1 - a) * 14}px)`,
            }}
          >
            {step.label}
          </div>
        );
      })}

      {/* The same strike the brand uses to retire a word, applied to the thing
          that was actually lost. */}
      <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 600, textAlign: 'center'}}>
        <div
          style={{
            display: 'inline-block',
            position: 'relative',
            fontSize: 86,
            fontWeight: 800,
            letterSpacing: '-.05em',
            color: `rgba(255,255,255,${0.92 - struck * 0.42})`,
          }}
        >
          NUEVO CLIENTE
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

      <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 760, textAlign: 'center'}}>
        <div style={{fontSize: 28, fontWeight: 800, letterSpacing: '.16em', color: alert, opacity: lost}}>SE FUE A OTRA</div>
        <div
          style={{
            marginTop: 18,
            fontSize: 82,
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: '-.05em',
            opacity: lost,
            transform: `translateY(${(1 - lost) * 22}px)`,
          }}
        >
          OPORTUNIDAD<br />PERDIDA
        </div>
      </div>
    </Field>
  );
};

/* ------------------------------------------------------------------ *
 * 4 · The same page, put back together properly
 * ------------------------------------------------------------------ */

// The sections a small company page actually needs. No testimonial, no figure:
// an invented page may show its structure, never borrowed proof.
const SECTIONS = ['Servicios', 'Proyectos', 'Contacto'];

/**
 * The four pillars, each one a promise Aents already publishes on its own site:
 * `apps/web/src/i18n.ts` offers webs that are fast (`rápidas`), adaptable
 * (`adaptables`), meant to position the brand (`posicionar tu marca`) and to
 * generate opportunities (`generar oportunidades`). Nothing else is added —
 * measurement in particular is still an unchecked plan in the Aents repo.
 *
 * They stamp onto the finished page instead of living in a scene of their own:
 * the closing card carries no subtitles, and a spoken line with nothing written
 * under it fails the piece's own rule of working without sound.
 */
const PILLARS = ['POSICIONAMIENTO', 'MÓVIL', 'VELOCIDAD', 'CONVERSIÓN'];

export const AentsRebuildSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();
  // Every piece starts scattered and lands on its place in the grid. The offsets
  // are fixed so the assembly reads as one movement, not as noise.
  const piece = (index: number) => beat(p, 0.03 + index * 0.045, 0.18 + index * 0.045);
  const settle = (a: number, dx: number, dy: number, rotation: number) => ({
    opacity: a,
    transform: `translate(${(1 - a) * dx}px, ${(1 - a) * dy}px) rotate(${(1 - a) * rotation}deg)`,
  });
  const click = spring({frame: frame - span * 0.46, fps, config: {damping: 14, stiffness: 190}});
  const lead = beat(p, 0.55, 0.64);
  const stamp = (index: number) => beat(p, 0.66 + index * 0.06, 0.8 + index * 0.06);
  return (
    <Shell frame={frame} eyebrow="AHORA IMAGINA" title="Que encuentre esto">
      <div style={{position: 'relative', marginTop: 24, height: 500}}>
        <div style={{height: 400, borderRadius: 26, overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 26px 70px rgba(0,0,0,.42)'}}>
          <div style={{height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '2px solid #EDF1F7', ...settle(piece(0), 0, -46, 0)}}>
            <span style={{fontSize: 25, fontWeight: 800, color: ink, letterSpacing: '-.02em'}}>Tu Empresa</span>
            <div style={{display: 'flex', gap: 22}}>
              {SECTIONS.map((item) => <span key={item} style={{fontSize: 20, fontWeight: 700, color: '#69738A'}}>{item}</span>)}
            </div>
          </div>

          <div style={{padding: '20px 24px 0', ...settle(piece(1), -70, 26, -3)}}>
            <div style={{fontSize: 34, fontWeight: 800, color: ink, letterSpacing: '-.04em', lineHeight: 1.06}}>Lo que hacemos,<br />claro desde el inicio</div>
          </div>

          <div style={{marginTop: 16, padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14}}>
            {SECTIONS.map((label, index) => {
              const a = piece(2 + index);
              return (
                <div
                  key={label}
                  style={{
                    height: 108,
                    boxSizing: 'border-box',
                    padding: '14px 18px',
                    borderRadius: 16,
                    background: '#F4F7FC',
                    border: '2px solid #E5EBF4',
                    ...settle(a, index === 0 ? -60 : index === 2 ? 60 : 0, 54, index === 1 ? 0 : index === 0 ? -4 : 4),
                  }}
                >
                  <div style={{width: 36, height: 36, borderRadius: 11, background: `${accent}22`, border: `2px solid ${accent}`, display: 'grid', placeItems: 'center', color: accent, fontSize: 20, fontWeight: 800}}>✓</div>
                  <div style={{marginTop: 10, fontSize: 21, fontWeight: 800, color: ink}}>{label}</div>
                </div>
              );
            })}
          </div>

          <div style={{marginTop: 16, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...settle(piece(5), 0, 44, 0)}}>
            <div
              style={{
                position: 'relative',
                padding: '16px 30px',
                borderRadius: 12,
                background: accent,
                color: '#07140B',
                fontSize: 24,
                fontWeight: 800,
                transform: `scale(${1 - click * 0.04})`,
                boxShadow: `0 16px 40px ${accent}44`,
              }}
            >
              Solicitar cotización
              {/* The pointer arrives, presses, and the pill answers. */}
              <svg width="34" height="40" viewBox="0 0 24 28" style={{position: 'absolute', right: -18, bottom: -22, opacity: click, transform: `translate(${(1 - click) * 26}px, ${(1 - click) * 26}px)`}}>
                <path d="M3 2l16 12-7 1 4 8-3 1.5-4-8-6 5z" fill="#0F1526" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 10, opacity: lead}}>
              <span style={{width: 12, height: 12, borderRadius: 99, background: accent, boxShadow: `0 0 16px ${accent}`}} />
              <span style={{fontSize: 21, fontWeight: 800, color: '#3D4A63'}}>Nueva oportunidad</span>
            </div>
          </div>
        </div>

        {/* What holds the page up, stamped underneath it once it exists. */}
        {/* Four across leaves 182 px a chip, and POSICIONAMIENTO fills 163 of
            them at 18 px. There is no room for a tick beside it, so the accent
            border and fill carry the "confirmed" reading instead: a smaller
            type size would drop under the minimum the review measures. */}
        <div style={{marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8}}>
          {PILLARS.map((label, index) => {
            const a = stamp(index);
            return (
              <div
                key={label}
                style={{
                  height: 64,
                  boxSizing: 'border-box',
                  padding: '0 4px',
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${accent}1C`,
                  border: `2px solid ${accent}`,
                  opacity: a,
                  transform: `translateY(${(1 - a) * 14}px) scale(${0.94 + a * 0.06})`,
                }}
              >
                <span style={{fontSize: 18, fontWeight: 800, letterSpacing: '-.01em', whiteSpace: 'nowrap'}}>{label}</span>
              </div>
            );
          })}
        </div>

        <Example style={{position: 'absolute', right: 0, bottom: -30}} />
      </div>
    </Shell>
  );
};

/* ------------------------------------------------------------------ *
 * 5 · What holds it up, and the invitation to check for yourself
 * ------------------------------------------------------------------ */

/**
 * The closing card.
 *
 * The system draws neither the outro nor the subtitles over a final scene that
 * is a simulation, so everything the viewer needs to act has to be inside this
 * frame: the mark, the name, the invitation the voice makes, and where to go.
 */
export const AentsWebProofSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const {fps} = useVideoConfig();
  const mark = spring({frame, fps, config: {damping: 16, mass: 0.75}});
  const name = beat(p, 0.12, 0.3);
  const invite = beat(p, 0.3, 0.46);
  const action = beat(p, 0.48, 0.64);
  // The pill keeps breathing after everything has arrived, so the last seconds
  // of the piece are a held frame rather than a frozen one.
  const pulse = Math.sin(beat(p, 0.64, 1) * Math.PI * 2);
  return (
    <Field>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 420}}>
        <Img
          src={staticFile('brand/aents-brand-tile-1024.png')}
          style={{width: 210, height: 210, borderRadius: 56, boxShadow: '0 34px 100px rgba(107,92,246,.55)', opacity: mark, transform: `scale(${0.84 + mark * 0.16})`}}
        />
        <div style={{marginTop: 32, fontSize: 86, fontWeight: 800, letterSpacing: '.02em', opacity: name}}>AENTS</div>
        <div style={{marginTop: 8, fontSize: 33, fontWeight: 800, color: lavender, opacity: name}}>Software para personas.</div>

        <div
          style={{
            marginTop: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '17px 28px',
            borderRadius: 99,
            background: 'rgba(255,255,255,.08)',
            border: '2px solid rgba(255,255,255,.18)',
            opacity: invite,
            transform: `translateY(${(1 - invite) * 16}px)`,
          }}
        >
          <Magnifier size={31} color={lavender} />
          <span style={{fontSize: 31, fontWeight: 800, color: 'rgba(255,255,255,.88)'}}>Busca tu empresa</span>
        </div>

        <div style={{marginTop: 34, display: 'flex', alignItems: 'center', gap: 16, opacity: action}}>
          <span
            style={{
              padding: '18px 32px',
              borderRadius: 99,
              background: accent,
              color: '#07140B',
              fontSize: 30,
              fontWeight: 800,
              boxShadow: `0 22px ${60 + pulse * 14}px ${accent}44`,
              transform: `scale(${1 + pulse * 0.012})`,
            }}
          >
            Cuéntanos tu proyecto
          </span>
          <span style={{padding: '18px 30px', borderRadius: 99, background: violet, fontSize: 30, fontWeight: 800}}>aents.net</span>
        </div>
      </AbsoluteFill>
    </Field>
  );
};
