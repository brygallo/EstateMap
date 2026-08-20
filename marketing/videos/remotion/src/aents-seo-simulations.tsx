import React from 'react';
import {spring, useVideoConfig} from 'remotion';
import {
  BoxedText,
  Halo,
  PANEL_WIDTH,
  Panel,
  Reveal,
  Trace,
  anticipate,
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
import type {BrandTokens} from './system-kit';
import {palette} from './theme';
import type {SimulationProps} from './simulations';

/**
 * «Que te encuentren»: the lesson about being found by a search engine and
 * quoted by the readers that answer questions for people.
 *
 * Three rules govern everything drawn here.
 *
 * The first is that no other company's mark appears. A search surface is drawn
 * as the pattern a viewer recognises — a field, a magnifier, a list of results —
 * and an answering reader is drawn as a written paragraph with its sources
 * underneath. They are labelled by what they are, never by whose they are.
 *
 * The second is that every business on screen is invented. `Taller XYZ` and its
 * pages, prices and times illustrate what a page can say; they carry the
 * `EJEMPLO` badge for as long as they are visible and no figure among them
 * states anything about a market, a client or Aents. The one composition that
 * does describe real work — `AentsSeoReadableSim` — draws only what
 * `../../../Aents/scripts/prerender.mjs`, `packages/seo/src/index.ts` and
 * `scripts/check-seo.mjs` implement.
 *
 * The third is about time. These scenes run seventeen to twenty-two seconds,
 * two to three times a normal beat, and the first cut of this file spread its
 * arrivals across the whole span: at every midpoint a third of the composition
 * existed and the lower half of the panel was empty. Each scene now builds
 * itself inside the first half and spends the second half on the one state that
 * proves the line — with the camera push and one travelling element carrying
 * the stretch in between.
 */

const ink = '#0F1526';
const paper = '#F4F7FB';
const codeFace = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** The room a composition has under the panel header, measured, not guessed. */
const STAGE = PANEL_WIDTH;
const STAGE_HEIGHT = 530;

/** A rise that holds and then leaves, for something that must not stay. */
const passing = (value: number, from: number, peak: number, to: number) =>
  Math.min(beat(value, from, peak), 1 - glide(value, peak, to));

/**
 * The badge every invented business lives under.
 *
 * The workshop, its pages and its prices are examples in exactly the sense the
 * brief allows: they teach what a page can say and report nothing real.
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

/** The magnifier, drawn rather than typed, so it never depends on an emoji font. */
const Magnifier: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth="2.6" />
    <path d="M15.4 15.4L20 20" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

/**
 * A tick that is drawn, not faded in.
 *
 * `progress` runs the stroke along its own path, so a confirmation reads as
 * something being written rather than something appearing.
 */
const Tick: React.FC<{size: number; color: string; progress?: number}> = ({size, color, progress = 1}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5L10 17.5L19 7"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  </svg>
);

/** A cross, for what is missing or refused. */
const Cross: React.FC<{size: number; color: string; progress?: number}> = ({size, color, progress = 1}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 7L17 17" stroke={color} strokeWidth="3.2" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
    <path
      d="M17 7L7 17"
      stroke={color}
      strokeWidth="3.2"
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - beat(progress, 0.4, 1)}
    />
  </svg>
);

/** The search field: white, rounded, with the query typed into it. */
const SearchField: React.FC<{query: string; width: number; height?: number; caret?: boolean}> = ({
  query,
  width,
  height = 64,
  caret = false,
}) => (
  <div
    style={{
      width,
      height,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 22px',
      borderRadius: 99,
      background: palette.white,
      boxShadow: '0 18px 44px rgba(0,0,0,.4), inset 0 -2px 0 rgba(0,0,0,.08)',
    }}
  >
    <Magnifier size={25} color="#67718A" />
    <BoxedText text={query} width={width - 96} max={25} min={15} style={{fontWeight: 800, color: ink, letterSpacing: '-.02em'}} />
    {caret ? <span style={{width: 3, height: 26, background: ink, opacity: 0.7}} /> : null}
  </div>
);

/** One result in a list: a title, its host, and nothing else. */
const Result: React.FC<{
  title: string;
  host: string;
  width: number;
  arrive: number;
  tokens?: BrandTokens;
  lift?: number;
}> = ({title, host, width, arrive, tokens, lift = 0}) => (
  <div
    style={{
      boxSizing: 'border-box',
      height: 66,
      padding: '0 20px',
      borderRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      ...(tokens
        ? {
            background: `linear-gradient(140deg, ${tokens.confirm}33, ${tokens.confirm}14)`,
            border: `2px solid ${tokens.confirm}8C`,
            boxShadow: `0 18px 46px ${tokens.confirm}2E`,
          }
        : {
            background: 'linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.03))',
            border: '2px solid rgba(255,255,255,.12)',
          }),
      opacity: arrive,
      transform: `translateY(${(1 - arrive) * 22 + lift}px) scale(${0.97 + arrive * 0.03})`,
    }}
  >
    <BoxedText
      text={title}
      width={width - 200}
      max={23}
      min={15}
      style={{fontWeight: 800, color: tokens ? palette.white : 'rgba(255,255,255,.84)'}}
    />
    <span style={{fontSize: 19, fontWeight: 700, color: 'rgba(255,255,255,.44)', whiteSpace: 'nowrap'}}>{host}</span>
  </div>
);

/** A source credited under a written answer. */
const Source: React.FC<{host: string; arrive: number; tokens?: BrandTokens}> = ({host, arrive, tokens}) => (
  <span
    style={{
      padding: '9px 15px',
      borderRadius: 99,
      fontSize: 19,
      fontWeight: 800,
      whiteSpace: 'nowrap',
      opacity: arrive,
      transform: `scale(${0.86 + arrive * 0.14})`,
      background: tokens ? tokens.confirm : 'rgba(255,255,255,.1)',
      color: tokens ? '#06230F' : 'rgba(255,255,255,.62)',
      border: `2px solid ${tokens ? tokens.confirm : 'rgba(255,255,255,.14)'}`,
      boxShadow: tokens ? `0 16px 40px ${tokens.confirm}4D` : 'none',
    }}
  >
    {host}
  </span>
);

/**
 * The written answer an answering reader gives back.
 *
 * The lines are bars rather than sentences: the shot is about where the answer
 * comes from, and readable prose at this size would pull the eye off the
 * sources underneath it. Each bar wipes out from the left, the way text is
 * written, instead of fading in.
 */
const WrittenAnswer: React.FC<{progress: number; widths: number[]; height?: number}> = ({
  progress,
  widths,
  height = 14,
}) => (
  <div style={{display: 'grid', gap: 12}}>
    {widths.map((width, index) => (
      <div
        key={index}
        style={{
          height,
          width: `${width * settle(progress, stagger(index, 0.13), stagger(index, 0.13) + 0.34)}%`,
          borderRadius: 99,
          background: 'linear-gradient(90deg, rgba(255,255,255,.42), rgba(255,255,255,.24))',
        }}
      />
    ))}
  </div>
);

/* ------------------------------------------------------------------ *
 * 1 · Two doors, and your page behind neither of them
 * ------------------------------------------------------------------ */

const COLUMN = 356;

export const AentsSeoFoundSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The site is alone and lit first: losing it only means something if the
  // viewer saw it there on its own. Then it is displaced — not faded — by the
  // two surfaces that answer for it.
  const site = land(p, 0.02, 0.16);
  const travel = glide(p, 0.18, 0.38);
  const doors = glide(p, 0.2, 0.36);
  const answer = beat(p, 0.34, 0.62);
  const verdict = land(p, 0.66, 0.8);
  // The site keeps just enough light to be seen while it is being ignored.
  const dimmed = 1 - glide(p, 0.3, 0.5) * 0.55;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="DOS PUERTAS" title="Dónde te buscan hoy">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <Halo color={`${tokens.accent}66`} size={520} x={STAGE / 2} y={120 + travel * 260} strength={0.4 * dimmed} />

        {/* Door one: the list. */}
        <Reveal progress={doors} from="left" style={{position: 'absolute', left: 0, top: 0, width: COLUMN}}>
          <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.1em', color: tokens.soft}}>UN BUSCADOR</div>
          <div style={{marginTop: 12}}>
            <SearchField query="taller mecánico" width={COLUMN} height={58} />
          </div>
          <div style={{marginTop: 12, display: 'grid', gap: 10}}>
            {['Taller XYZ', 'Mecánica ABC', 'Servicio DEF'].map((title, index) => (
              <Result
                key={title}
                title={title}
                host="otro-sitio.ec"
                width={COLUMN}
                arrive={land(p, 0.36 + stagger(index, 0.05), 0.5 + stagger(index, 0.05))}
              />
            ))}
          </div>
        </Reveal>

        {/* Door two: the answer. */}
        <Reveal progress={doors} from="left" style={{position: 'absolute', right: 0, top: 0, width: COLUMN}}>
          <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.1em', color: tokens.soft}}>UNA IA QUE RESPONDE</div>
          <div
            style={{
              marginTop: 12,
              boxSizing: 'border-box',
              width: COLUMN,
              height: 286,
              padding: '18px 20px',
              borderRadius: 22,
              ...glass(tokens),
            }}
          >
            <BoxedText
              text="¿A quién le llevo el carro?"
              width={COLUMN - 40}
              max={21}
              min={16}
              lines={2}
              style={{fontWeight: 800, color: 'rgba(255,255,255,.86)'}}
            />
            <div style={{marginTop: 18}}>
              <WrittenAnswer progress={answer} widths={[100, 92, 76, 58]} />
            </div>
            <div style={{marginTop: 22, display: 'flex', gap: 9, flexWrap: 'wrap'}}>
              {['otro-sitio.ec', 'directorio.ec'].map((host, index) => (
                <Source key={host} host={host} arrive={land(p, 0.52 + stagger(index, 0.05), 0.64 + stagger(index, 0.05))} />
              ))}
            </div>
          </div>
        </Reveal>

        {/* And the page neither of them named, pushed out of the conversation. */}
        <div
          style={{
            position: 'absolute',
            left: STAGE / 2 - 160 - travel * (STAGE / 2 - 190),
            top: 8 + travel * 396,
            width: 320,
            boxSizing: 'border-box',
            padding: '16px 20px',
            borderRadius: 22,
            ...glass(tokens),
            opacity: site * dimmed,
            transform: `scale(${(0.9 + site * 0.1) * (1 - travel * 0.14)})`,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{width: 12, height: 12, borderRadius: 99, background: tokens.soft}} />
            <span style={{fontSize: 23, fontWeight: 800, color: 'rgba(255,255,255,.88)'}}>tuempresa.com</span>
          </div>
          <div style={{marginTop: 12, height: 11, width: '78%', borderRadius: 99, background: 'rgba(255,255,255,.2)'}} />
          <div style={{marginTop: 8, height: 11, width: '54%', borderRadius: 99, background: 'rgba(255,255,255,.13)'}} />
        </div>

        {/* The proof: neither door named you. */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 404,
            width: 372,
            boxSizing: 'border-box',
            padding: '20px 22px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: `${tokens.alert}1F`,
            border: `2px solid ${tokens.alert}70`,
            opacity: verdict,
            transform: `translateX(${(1 - verdict) * 26}px)`,
          }}
        >
          <Cross size={34} color={tokens.alert} progress={beat(p, 0.68, 0.8)} />
          <BoxedText text="En ninguna sales tú" width={280} max={27} min={20} style={{fontWeight: 800, color: tokens.alert}} />
        </div>

        <Example style={{position: 'absolute', left: 0, bottom: 4}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · What the engine has to understand before it can show you
 * ------------------------------------------------------------------ */

const UNDERSTOOD = [
  {label: 'QUIÉN ERES', value: 'Taller XYZ · Cuenca'},
  {label: 'QUÉ HACES', value: 'Mecánica y mantenimiento'},
  {label: 'CUÁNDO MOSTRARTE', value: 'Cuando buscan un taller'},
];

export const AentsSeoUnderstandSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // One pass of the reader down the page. Each card is not scheduled on its own
  // clock: it lands when the line has physically crossed its half of the page,
  // so the cause is on screen every time.
  const scan = glide(p, 0.08, 0.46);
  const shown = beat(p, 0.5, 0.62);
  const climb = land(p, 0.58, 0.76);
  const page = 340;
  const column = 376;
  const pageHeight = 356;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="LO QUE TIENE QUE ENTENDER" title="Quién eres y cuándo mostrarte">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: page,
            height: pageHeight,
            boxSizing: 'border-box',
            padding: '20px 22px',
            borderRadius: 22,
            background: paper,
            overflow: 'hidden',
            boxShadow: '0 26px 60px rgba(0,0,0,.44)',
          }}
        >
          <BoxedText text="Taller XYZ · Cuenca" width={page - 44} max={27} min={19} style={{fontWeight: 800, color: ink, letterSpacing: '-.02em'}} />
          <div style={{marginTop: 7, fontSize: 19, fontWeight: 800, color: '#67718A'}}>Mecánica y mantenimiento</div>
          <div style={{marginTop: 20, display: 'grid', gap: 11}}>
            {[100, 88, 94, 70, 82, 76].map((width, index) => (
              <div key={index} style={{height: 13, width: `${width}%`, borderRadius: 99, background: '#DCE4EF'}} />
            ))}
          </div>
          <div style={{marginTop: 20, display: 'flex', gap: 9}}>
            {['Motores', 'Frenos', 'Revisión'].map((chip) => (
              <span key={chip} style={{padding: '8px 14px', borderRadius: 99, background: '#E4EBF4', color: '#4C5872', fontSize: 17, fontWeight: 800}}>
                {chip}
              </span>
            ))}
          </div>
          {/* The reading line, and the ground it has already covered. */}
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: scan * pageHeight, background: `${tokens.accent}14`}} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: scan * pageHeight,
              height: 5,
              background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
              boxShadow: `0 0 22px ${tokens.accent}`,
              opacity: scan > 0.01 && scan < 0.99 ? 1 : 0,
            }}
          />
        </div>

        <div style={{position: 'absolute', right: 0, top: 0, width: column, display: 'grid', gap: 14}}>
          {UNDERSTOOD.map((item, index) => {
            // The card owes its arrival to the scan line reaching its row.
            const crossed = land(scan, 0.24 + index * 0.24, 0.44 + index * 0.24);
            return (
              <div
                key={item.label}
                style={{
                  boxSizing: 'border-box',
                  padding: '15px 20px',
                  borderRadius: 18,
                  background: `linear-gradient(150deg, ${tokens.confirm}2E, ${tokens.confirm}0F)`,
                  border: `2px solid ${tokens.confirm}70`,
                  opacity: crossed,
                  transform: `translateX(${(1 - crossed) * 30}px)`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <Tick size={22} color={tokens.confirm} progress={beat(crossed, 0.3, 1)} />
                  <span style={{fontSize: 19, fontWeight: 800, color: tokens.confirm, letterSpacing: '.05em'}}>{item.label}</span>
                </div>
                <BoxedText text={item.value} width={column - 40} max={24} min={17} style={{marginTop: 7, fontWeight: 800, color: palette.white}} />
              </div>
            );
          })}
        </div>

        {/* And then the list, with the page in it. */}
        <div style={{position: 'absolute', left: 0, bottom: 0, width: STAGE, opacity: shown}}>
          <SearchField query="taller mecánico en Cuenca" width={STAGE} height={60} />
          <div style={{marginTop: 12}}>
            <Result title="Taller XYZ · Cuenca" host="tuempresa.com" width={STAGE} arrive={climb} tokens={tokens} />
          </div>
        </div>

        <Example style={{position: 'absolute', right: 0, top: 372}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 3 · Interruption on one side, intent on the other
 * ------------------------------------------------------------------ */

export const AentsSeoIntentSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // Left: something lands on top of what the person was doing and is thrown
  // off. Right: the person starts, and the page is what answers.
  const interrupt = passing(p, 0.08, 0.26, 0.5);
  const swipe = settle(p, 0.34, 0.5);
  const feed = glide(p, 0.3, 0.62) * 70;
  const asked = beat(p, 0.4, 0.5);
  const found = land(p, 0.5, 0.66);
  const verdict = land(p, 0.72, 0.86);
  const box = 348;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="DOS FORMAS DE LLEGAR" title="Interrumpir o responder">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: box}}>
          <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.5)'}}>UN ANUNCIO</div>
          <div
            style={{
              position: 'relative',
              marginTop: 12,
              height: 356,
              borderRadius: 22,
              background: 'rgba(255,255,255,.04)',
              border: '2px solid rgba(255,255,255,.1)',
              overflow: 'hidden',
            }}
          >
            {/* What the person was actually doing, still scrolling underneath. */}
            <div style={{position: 'absolute', left: 18, right: 18, top: 18 - feed, display: 'grid', gap: 14}}>
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} style={{height: 84, borderRadius: 16, background: 'rgba(255,255,255,.06)', border: '2px solid rgba(255,255,255,.05)'}} />
              ))}
            </div>
            {/* And what landed on top of it. */}
            <div
              style={{
                position: 'absolute',
                left: 18,
                right: 18,
                top: 116,
                boxSizing: 'border-box',
                padding: '20px 22px',
                borderRadius: 18,
                background: tokens.alert,
                color: '#1B1204',
                boxShadow: '0 24px 60px rgba(0,0,0,.5)',
                opacity: Math.max(0, interrupt),
                transform: `translateY(${(1 - Math.max(0, interrupt)) * 14}px) translateX(${swipe * 440}px) rotate(${swipe * 6}deg)`,
              }}
            >
              <div style={{fontSize: 18, fontWeight: 800, letterSpacing: '.08em', opacity: 0.72}}>PUBLICIDAD</div>
              <BoxedText text="Conoce nuestro taller" width={box - 80} max={26} min={18} style={{marginTop: 7, fontWeight: 800}} />
            </div>
          </div>
          <div style={{marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, opacity: beat(p, 0.5, 0.62)}}>
            <Cross size={26} color="rgba(255,255,255,.45)" progress={beat(p, 0.5, 0.62)} />
            <span style={{fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,.55)'}}>Estaba en otra cosa</span>
          </div>
        </div>

        <div style={{position: 'absolute', right: 0, top: 0, width: box}}>
          <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.1em', color: tokens.soft}}>UNA BÚSQUEDA</div>
          <div
            style={{
              position: 'relative',
              marginTop: 12,
              height: 356,
              boxSizing: 'border-box',
              padding: 20,
              borderRadius: 22,
              background: `${tokens.accent}14`,
              border: `2px solid ${tokens.accent}5C`,
            }}
          >
            <Halo color={`${tokens.confirm}55`} size={300} x={box / 2 - 20} y={190} strength={found * 0.5} />
            <SearchField query="cambio de frenos" width={box - 40} height={56} caret={asked < 1} />
            <div
              style={{
                position: 'relative',
                marginTop: 18,
                boxSizing: 'border-box',
                padding: '18px 20px',
                borderRadius: 18,
                background: `linear-gradient(150deg, ${tokens.confirm}33, ${tokens.confirm}12)`,
                border: `2px solid ${tokens.confirm}8C`,
                opacity: found,
                transform: `translateY(${(1 - found) * 20}px)`,
              }}
            >
              <BoxedText text="Cambio de frenos" width={box - 80} max={23} min={17} style={{fontWeight: 800, color: palette.white}} />
              <div style={{marginTop: 7, fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.58)'}}>tuempresa.com</div>
            </div>
            <div style={{position: 'relative', marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, opacity: beat(p, 0.62, 0.74)}}>
              <Tick size={26} color={tokens.confirm} progress={beat(p, 0.62, 0.76)} />
              <span style={{fontSize: 22, fontWeight: 800, color: tokens.confirm}}>Ya venía buscando</span>
            </div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, display: 'grid', placeItems: 'center'}}>
          <Reveal progress={verdict}>
            <BoxedText
              text="La intención ya estaba ahí"
              width={STAGE}
              max={36}
              min={26}
              style={{fontWeight: 800, letterSpacing: '-.03em', color: palette.white, textAlign: 'center'}}
            />
          </Reveal>
        </div>

        <Example style={{position: 'absolute', left: 0, bottom: 62}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 4 · A pretty page is not a page that can be understood
 * ------------------------------------------------------------------ */

const SIGNALS = ['Título claro', 'Estructura', 'Direcciones', 'Enlaces internos', 'Velocidad', 'En el teléfono', 'Datos estructurados'];

export const AentsSeoSignalsSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The shot states what the reader could not find, then fills that same list
  // in: the checklist answers the cross instead of starting a new subject.
  const mute = passing(p, 0.04, 0.16, 0.34);
  const purpose = land(p, 0.74, 0.88);
  const page = 316;
  const column = 400;
  const pageHeight = 386;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="NO BASTA CON QUE SEA BONITA" title="Tiene que poder entenderse">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: page,
            height: pageHeight,
            boxSizing: 'border-box',
            borderRadius: 22,
            background: paper,
            overflow: 'hidden',
            boxShadow: '0 26px 60px rgba(0,0,0,.44)',
          }}
        >
          <div style={{height: 168, background: `linear-gradient(140deg, ${tokens.accent}, #3B2E96)`}} />
          <div style={{padding: '20px 22px'}}>
            <div style={{height: 24, width: '62%', borderRadius: 99, background: '#DCE4EF'}} />
            <div style={{marginTop: 16, display: 'grid', gap: 10}}>
              {[92, 78, 84].map((width, index) => (
                <div key={index} style={{height: 12, width: `${width}%`, borderRadius: 99, background: '#E6ECF4'}} />
              ))}
            </div>
            <div style={{marginTop: 22, height: 48, width: 172, borderRadius: 14, background: '#E1E8F2'}} />
          </div>
          <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(8,9,21,.8)', opacity: mute}}>
            <div style={{textAlign: 'center', padding: '0 22px'}}>
              <Cross size={48} color={tokens.alert} progress={beat(mute, 0.2, 1)} />
              <BoxedText
                text="No dice de qué trata"
                width={page - 44}
                max={27}
                min={19}
                lines={2}
                style={{marginTop: 12, fontWeight: 800, color: palette.white}}
              />
            </div>
          </div>
        </div>

        <div style={{position: 'absolute', right: 0, top: 0, width: column, display: 'grid', gap: 9}}>
          {SIGNALS.map((label, index) => {
            const arrive = land(p, 0.26 + stagger(index, 0.045), 0.38 + stagger(index, 0.045));
            return (
              <div
                key={label}
                style={{
                  boxSizing: 'border-box',
                  height: 48,
                  padding: '0 18px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: `linear-gradient(150deg, ${tokens.confirm}26, ${tokens.confirm}0D)`,
                  border: `2px solid ${tokens.confirm}52`,
                  opacity: arrive,
                  transform: `translateX(${(1 - arrive) * 26}px)`,
                }}
              >
                <Tick size={22} color={tokens.confirm} progress={beat(arrive, 0.35, 1)} />
                {/* 400 wide, 18 of padding a side, a 22 tick and its 12 gap: the
                    label owns 330, and the size is measured against that. */}
                <BoxedText text={label} width={330} max={23} min={15} style={{fontWeight: 800, color: 'rgba(255,255,255,.92)'}} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: STAGE,
            boxSizing: 'border-box',
            padding: '20px 24px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            ...lit(tokens),
            opacity: purpose,
            transform: `translateY(${(1 - purpose) * 20}px)`,
          }}
        >
          <span style={{fontSize: 19, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.72)', whiteSpace: 'nowrap'}}>SOBRE TODO</span>
          <BoxedText text="Que responda la pregunta" width={STAGE - 220} max={30} min={22} style={{fontWeight: 800, color: palette.white}} />
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 5 · One page per question, all of them leading to the same place
 * ------------------------------------------------------------------ */

const PAGES = [
  {query: 'mantenimiento de motores', path: '/mantenimiento-de-motores/'},
  {query: 'cambio de frenos', path: '/cambio-de-frenos/'},
  {query: 'revisión de auto usado', path: '/revision-de-auto-usado/'},
];

export const AentsSeoNetworkSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The one vague page pulls back and opens into the three questions it was
  // hiding; the three then send their visitors to a single destination.
  const one = land(p, 0.02, 0.14);
  const split = anticipate(p, 0.16, 0.36);
  const converge = land(p, 0.7, 0.84);
  const card = 224;
  const gap = (STAGE - card * 3) / 2;
  const centre = STAGE / 2;
  const cardTop = 166;
  const cardHeight = 214;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="UNA PÁGINA POR PREGUNTA" title="La página que ya responde">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <Halo color={`${tokens.confirm}66`} size={420} x={centre} y={476} strength={converge * 0.55} />

        <div
          style={{
            position: 'absolute',
            left: centre - 136,
            top: 0,
            width: 272,
            boxSizing: 'border-box',
            padding: '15px 18px',
            borderRadius: 18,
            textAlign: 'center',
            ...glass(tokens),
            opacity: one * (1 - beat(p, 0.3, 0.5) * 0.5),
            transform: `scale(${(0.9 + one * 0.1) * (1 - Math.max(0, split) * 0.1)})`,
          }}
        >
          <div style={{fontSize: 25, fontWeight: 800, color: 'rgba(255,255,255,.88)'}}>/servicios/</div>
          <div style={{marginTop: 5, fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.44)'}}>Una sola página</div>
        </div>

        <svg viewBox={`0 0 ${STAGE} ${STAGE_HEIGHT}`} width={STAGE} height={STAGE_HEIGHT} style={{position: 'absolute', inset: 0}}>
          {PAGES.map((page, index) => {
            const x = card / 2 + index * (card + gap);
            return (
              <Trace
                key={`down-${page.path}`}
                from={{x: centre, y: 86}}
                to={{x, y: cardTop - 8}}
                progress={glide(p, 0.2 + stagger(index, 0.05), 0.4 + stagger(index, 0.05))}
                color={tokens.soft}
              />
            );
          })}
          {PAGES.map((page, index) => {
            const x = card / 2 + index * (card + gap);
            return (
              <Trace
                key={`up-${page.path}`}
                from={{x, y: cardTop + cardHeight + 8}}
                to={{x: centre, y: 438}}
                progress={glide(p, 0.56 + stagger(index, 0.04), 0.74 + stagger(index, 0.04))}
                color={tokens.confirm}
              />
            );
          })}
        </svg>

        {PAGES.map((page, index) => {
          const arrive = land(p, 0.3 + stagger(index, 0.055), 0.44 + stagger(index, 0.055));
          return (
            <div
              key={page.path}
              style={{
                position: 'absolute',
                left: index * (card + gap),
                top: cardTop,
                width: card,
                height: cardHeight,
                boxSizing: 'border-box',
                padding: '16px 18px',
                borderRadius: 18,
                ...glass(tokens),
                borderColor: `${tokens.accent}8C`,
                opacity: arrive,
                transform: `translateY(${(1 - arrive) * 26}px) scale(${0.94 + arrive * 0.06})`,
              }}
            >
              <div style={{display: 'flex', alignItems: 'flex-start', gap: 8}}>
                <div style={{paddingTop: 2}}>
                  <Magnifier size={18} color={tokens.soft} />
                </div>
                <BoxedText text={page.query} width={card - 36 - 26} max={18} min={13} lines={2} style={{fontWeight: 800, color: tokens.soft}} />
              </div>
              <div style={{marginTop: 14, height: 2, background: 'rgba(255,255,255,.14)'}} />
              <BoxedText text={page.path} width={card - 36} max={20} min={12} style={{marginTop: 14, fontWeight: 800, color: palette.white}} />
              <div style={{marginTop: 14, display: 'grid', gap: 7}}>
                {[92, 74, 60].map((width, line) => (
                  <div key={line} style={{height: 9, width: `${width * beat(arrive, 0.5, 1)}%`, borderRadius: 99, background: 'rgba(255,255,255,.2)'}} />
                ))}
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: centre - 164,
            top: 440,
            width: 328,
            boxSizing: 'border-box',
            padding: '20px 22px',
            borderRadius: 20,
            textAlign: 'center',
            background: `linear-gradient(140deg, ${tokens.confirm}, #12924B)`,
            color: '#06230F',
            fontSize: 28,
            fontWeight: 800,
            opacity: converge,
            transform: `scale(${0.9 + converge * 0.1})`,
            boxShadow: `0 24px 62px ${tokens.confirm}4D, inset 0 2px 0 rgba(255,255,255,.3)`,
          }}
        >
          Pedir una cita
        </div>

        <Example style={{position: 'absolute', right: 0, top: 4}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 6 · From a position in a list to a source under an answer
 * ------------------------------------------------------------------ */

export const AentsSeoAnswerSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The list does not vanish and get replaced: it lifts out of frame as the
  // answer takes its place, so both read as the same question answered twice.
  const leaving = settle(p, 0.22, 0.42);
  const answer = beat(p, 0.34, 0.66);
  const cited = land(p, 0.6, 0.72);
  const missing = land(p, 0.74, 0.88);
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="LA SEGUNDA PELEA" title="De salir primero a ser la fuente">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT, overflow: 'hidden'}}>
        <SearchField query="¿qué taller me recomiendan en Cuenca?" width={STAGE} height={62} />

        <div style={{position: 'absolute', left: 0, top: 84, width: STAGE, display: 'grid', gap: 11, opacity: 1 - beat(p, 0.3, 0.44)}}>
          {['Taller XYZ', 'Mecánica ABC', 'Servicio DEF'].map((title, index) => (
            <Result key={title} title={title} host="otro-sitio.ec" width={STAGE} arrive={1} lift={-leaving * (120 + index * 46)} />
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 84,
            width: STAGE,
            boxSizing: 'border-box',
            padding: '22px 24px',
            borderRadius: 22,
            ...glass(tokens),
            opacity: beat(p, 0.32, 0.44),
            transform: `translateY(${(1 - beat(p, 0.32, 0.46)) * 30}px)`,
          }}
        >
          <Halo color={`${tokens.accent}66`} size={360} x={80} y={40} strength={0.5} />
          <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 12}}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                fontSize: 18,
                fontWeight: 800,
                ...lit(tokens),
              }}
            >
              IA
            </span>
            <span style={{fontSize: 21, fontWeight: 800, color: 'rgba(255,255,255,.62)'}}>Respuesta</span>
          </div>
          <div style={{position: 'relative', marginTop: 20}}>
            <WrittenAnswer progress={answer} widths={[100, 96, 88, 74, 52]} height={15} />
          </div>
          <div style={{position: 'relative', marginTop: 24, paddingTop: 18, borderTop: '2px solid rgba(255,255,255,.1)'}}>
            <div style={{fontSize: 18, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.44)'}}>FUENTES</div>
            <div style={{marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'}}>
              {['otro-sitio.ec', 'directorio.ec'].map((host, index) => (
                <Source key={host} host={host} arrive={land(p, 0.6 + stagger(index, 0.05), 0.72 + stagger(index, 0.05))} />
              ))}
              <span
                style={{
                  padding: '9px 15px',
                  borderRadius: 99,
                  fontSize: 19,
                  fontWeight: 800,
                  border: `2px dashed ${tokens.alert}`,
                  color: tokens.alert,
                  opacity: missing,
                  transform: `scale(${0.86 + missing * 0.14 + pulse(p, 0.9, 0.1) * 0.03})`,
                }}
              >
                ¿tuempresa.com?
              </span>
            </div>
          </div>
        </div>

        <Example style={{position: 'absolute', right: 0, bottom: 0, opacity: cited}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 7 · There is no secret button
 * ------------------------------------------------------------------ */

const QUALITIES = ['Clara', 'Propia', 'Actualizada', 'Verificable'];

export const AentsSeoNoTrickSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The button is pressed and nothing happens; the pile of pages that was meant
  // to replace it comes down. Only then does what actually works arrive.
  const press = pulse(p, 0.1, 0.12);
  const nothing = beat(p, 0.18, 0.3);
  const pile = beat(p, 0.26, 0.42);
  const collapse = settle(p, 0.44, 0.6);
  const kept = beat(p, 0.6, 0.72);
  const column = 356;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="NO HAY ATAJO" title="El botón secreto no existe">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: column}}>
          <div
            style={{
              boxSizing: 'border-box',
              padding: '26px 24px',
              borderRadius: 20,
              textAlign: 'center',
              ...lit(tokens),
              transform: `scale(${1 - press * 0.05}) translateY(${press * 3}px)`,
              opacity: 1 - nothing * 0.42,
            }}
          >
            <BoxedText text="Salir en la IA" width={column - 48} max={28} min={19} style={{fontWeight: 800, color: palette.white}} />
          </div>
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: nothing,
              transform: `translateX(${(1 - nothing) * 18}px)`,
            }}
          >
            <Cross size={30} color={tokens.alert} progress={beat(p, 0.2, 0.32)} />
            <span style={{fontSize: 24, fontWeight: 800, color: tokens.alert}}>No pasa nada</span>
          </div>
        </div>

        <div style={{position: 'absolute', right: 0, top: 0, width: column, height: 250}}>
          {[0, 1, 2, 3].map((index) => {
            const arrive = beat(p, 0.26 + stagger(index, 0.03), 0.38 + stagger(index, 0.03));
            const fall = beat(collapse, index * 0.06, 0.6 + index * 0.06);
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: index * 15,
                  top: index * 22,
                  right: 26 - index * 8,
                  height: 140,
                  boxSizing: 'border-box',
                  padding: '16px 18px',
                  borderRadius: 16,
                  ...glass(tokens, 0.7),
                  opacity: arrive * pile * (1 - fall),
                  transform: `translateY(${fall * (60 + index * 26)}px) rotate(${fall * (index - 1.5) * 5}deg)`,
                }}
              >
                <div style={{height: 13, width: '58%', borderRadius: 99, background: 'rgba(255,255,255,.22)'}} />
                <div style={{marginTop: 12, display: 'grid', gap: 8}}>
                  {[94, 88, 70].map((width, line) => (
                    <div key={line} style={{height: 9, width: `${width}%`, borderRadius: 99, background: 'rgba(255,255,255,.12)'}} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 0, bottom: -6, display: 'flex', alignItems: 'center', gap: 12, opacity: beat(collapse, 0.4, 0.9)}}>
            <Cross size={30} color={tokens.alert} progress={beat(collapse, 0.4, 0.9)} />
            <BoxedText text="Páginas que no dicen nada" width={column - 48} max={24} min={17} style={{fontWeight: 800, color: tokens.alert}} />
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0}}>
          <Reveal progress={kept} from="left">
            <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.1em', color: tokens.soft}}>LO QUE SÍ</div>
          </Reveal>
          <div style={{marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12}}>
            {QUALITIES.map((label, index) => {
              const arrive = land(p, 0.66 + stagger(index, 0.05), 0.78 + stagger(index, 0.05));
              return (
                <div
                  key={label}
                  style={{
                    boxSizing: 'border-box',
                    height: 132,
                    padding: '20px 12px',
                    borderRadius: 18,
                    textAlign: 'center',
                    background: `linear-gradient(155deg, ${tokens.confirm}2E, ${tokens.confirm}0F)`,
                    border: `2px solid ${tokens.confirm}66`,
                    opacity: arrive,
                    transform: `translateY(${(1 - arrive) * 24}px) scale(${0.92 + arrive * 0.08})`,
                  }}
                >
                  <div style={{display: 'grid', placeItems: 'center'}}>
                    <Tick size={30} color={tokens.confirm} progress={beat(arrive, 0.4, 1)} />
                  </div>
                  {/* Four columns across 752 with 12 of gap: each card is 179,
                      and 24 of padding leaves 155 for the word. */}
                  <BoxedText text={label} width={155} max={25} min={14} style={{marginTop: 12, fontWeight: 800, color: palette.white}} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 8 · An adjective cannot be quoted; a fact can
 * ------------------------------------------------------------------ */

const FACTS = [
  {label: 'REVISIÓN COMPLETA', value: '$35'},
  {label: 'TIEMPO ESTIMADO', value: '2 horas'},
  {label: 'INCLUYE', value: 'Frenos, aceite y luces'},
  {label: 'GARANTÍA DEL TRABAJO', value: '3 meses'},
];

export const AentsSeoDataSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The vague sentence does not fade politely: it lifts out of frame, and the
  // space it was occupying is taken by the four facts that belonged there.
  const leaving = settle(p, 0.16, 0.34);
  const quoted = land(p, 0.68, 0.82);
  const half = (STAGE - 14) / 2;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="LO QUE SE PUEDE CITAR" title="Un dato, no un adjetivo">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT, overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            boxSizing: 'border-box',
            padding: '22px 24px',
            borderRadius: 18,
            background: 'rgba(255,255,255,.05)',
            border: '2px dashed rgba(255,255,255,.22)',
            opacity: 1 - beat(p, 0.2, 0.34),
            transform: `translateY(${leaving * -150}px) scale(${1 - leaving * 0.06})`,
          }}
        >
          <BoxedText
            text="«Llevamos años en el mercado»"
            width={STAGE - 48}
            max={30}
            min={21}
            style={{fontWeight: 800, color: 'rgba(255,255,255,.7)'}}
          />
        </div>

        <div style={{position: 'absolute', left: 0, top: 0, width: STAGE, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
          {FACTS.map((fact, index) => {
            const arrive = land(p, 0.3 + stagger(index, 0.055), 0.44 + stagger(index, 0.055));
            return (
              <div
                key={fact.label}
                style={{
                  boxSizing: 'border-box',
                  height: 154,
                  padding: '20px 22px',
                  borderRadius: 20,
                  ...glass(tokens),
                  borderColor: `${tokens.accent}70`,
                  opacity: arrive,
                  transform: `translateY(${(1 - arrive) * 30}px) scale(${0.95 + arrive * 0.05})`,
                }}
              >
                <BoxedText text={fact.label} width={half - 44} max={19} min={13} style={{fontWeight: 800, letterSpacing: '.06em', color: tokens.soft}} />
                <BoxedText
                  text={fact.value}
                  width={half - 44}
                  max={40}
                  min={22}
                  lines={2}
                  style={{marginTop: 14, fontWeight: 800, color: palette.white, ...figures}}
                />
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            boxSizing: 'border-box',
            padding: '20px 22px',
            borderRadius: 20,
            background: `linear-gradient(140deg, ${tokens.confirm}2E, ${tokens.confirm}0F)`,
            border: `2px solid ${tokens.confirm}70`,
            opacity: quoted,
            transform: `translateY(${(1 - quoted) * 22}px)`,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
            <BoxedText
              text="Se entiende, se compara y se cita"
              width={STAGE - 330}
              max={26}
              min={18}
              lines={2}
              style={{fontWeight: 800, color: palette.white}}
            />
            <Source host="tuempresa.com" arrive={quoted} tokens={tokens} />
          </div>
        </div>

        <Example style={{position: 'absolute', right: 0, top: 336}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 9 · The same business, said the same way everywhere
 * ------------------------------------------------------------------ */

const PLACES = [
  {label: 'Tu web', angle: -90},
  {label: 'Ficha del negocio', angle: -32},
  {label: 'Productos', angle: 32},
  {label: 'Quién escribe', angle: 90},
  {label: 'Redes', angle: 148},
  {label: 'Menciones', angle: 212},
];

export const AentsSeoEntitySim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // Six places carry the same name, and the traces are drawn outward from the
  // business rather than appearing between them: the identity is the origin.
  const core = land(p, 0.02, 0.16);
  const agreed = beat(p, 0.62, 0.76);
  const centreX = STAGE / 2;
  const centreY = 250;
  const radiusX = 268;
  const radiusY = 178;
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="UNA SOLA IDENTIDAD" title="Que todo diga lo mismo">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <Halo color={`${agreed > 0 ? tokens.confirm : tokens.accent}77`} size={520} x={centreX} y={centreY} strength={0.35 + agreed * 0.3} />

        <svg viewBox={`0 0 ${STAGE} ${STAGE_HEIGHT}`} width={STAGE} height={STAGE_HEIGHT} style={{position: 'absolute', inset: 0}}>
          {PLACES.map((place, index) => {
            const radians = (place.angle * Math.PI) / 180;
            const x = centreX + Math.cos(radians) * radiusX;
            const y = centreY + Math.sin(radians) * radiusY;
            return (
              <Trace
                key={place.label}
                from={{x: centreX, y: centreY}}
                to={{x, y}}
                progress={glide(p, 0.16 + stagger(index, 0.045), 0.34 + stagger(index, 0.045))}
                color={agreed > 0.5 ? tokens.confirm : tokens.soft}
                width={3 + agreed * 1.6}
              />
            );
          })}
        </svg>

        {PLACES.map((place, index) => {
          const radians = (place.angle * Math.PI) / 180;
          const x = centreX + Math.cos(radians) * radiusX;
          const y = centreY + Math.sin(radians) * radiusY;
          const arrive = land(p, 0.24 + stagger(index, 0.045), 0.4 + stagger(index, 0.045));
          return (
            <div
              key={place.label}
              style={{
                position: 'absolute',
                left: x - 94,
                top: y - 40,
                width: 188,
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: 16,
                textAlign: 'center',
                ...glass(tokens, 0.7),
                borderColor: agreed > 0.5 ? `${tokens.confirm}8C` : `${tokens.soft}52`,
                opacity: arrive,
                transform: `scale(${0.84 + arrive * 0.16})`,
              }}
            >
              <BoxedText text={place.label} width={160} max={21} min={13} style={{fontWeight: 800, color: 'rgba(255,255,255,.92)'}} />
              <div style={{marginTop: 7, fontSize: 17, fontWeight: 800, color: agreed > 0.5 ? tokens.confirm : 'rgba(255,255,255,.42)'}}>Taller XYZ</div>
            </div>
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: centreX - 116,
            top: centreY - 66,
            width: 232,
            boxSizing: 'border-box',
            padding: '18px 16px',
            borderRadius: 24,
            textAlign: 'center',
            ...lit(tokens),
            opacity: core,
            transform: `scale(${0.78 + core * 0.22 + pulse(p, 0.62, 0.14) * 0.04})`,
          }}
        >
          <BoxedText text="Taller XYZ" width={200} max={28} min={20} style={{fontWeight: 800, color: palette.white}} />
          <div style={{marginTop: 5, fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.72)'}}>Cuenca · Mecánica</div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, display: 'grid', placeItems: 'center'}}>
          <Reveal progress={agreed}>
            <BoxedText
              text="Un solo negocio, entendido"
              width={STAGE}
              max={30}
              min={21}
              style={{fontWeight: 800, color: tokens.confirm, textAlign: 'center'}}
            />
          </Reveal>
        </div>

        <Example style={{position: 'absolute', left: 0, top: 0}} />
      </div>
    </Panel>
  );
};

/* ------------------------------------------------------------------ *
 * 10 · What the reader actually receives
 * ------------------------------------------------------------------ */

/**
 * The one composition in this file that describes real work.
 *
 * The empty root, the served markup, the three deliverables and the gate are
 * what `../../../Aents/scripts/prerender.mjs`, `packages/seo/src/index.ts` and
 * `scripts/check-seo.mjs` do: the build renders the app to static HTML, the
 * serializer writes the structured data, the `robots.txt` that names GPTBot,
 * ClaudeBot and PerplexityBot, and the `llms.txt`; and the check runs in CI
 * before the artefact is uploaded and exits non-zero when any of it is missing.
 */
const DELIVERED = ['Contenido en el código', 'Datos estructurados', 'Archivo para modelos'];

export const AentsSeoReadableSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  // The two panels arrive together: the gap between what a person sees and what
  // a reader receives is the whole subject, and it only exists side by side.
  const panels = land(p, 0.02, 0.16);
  const blank = beat(p, 0.14, 0.28);
  const served = beat(p, 0.4, 0.56);
  const gate = land(p, 0.74, 0.88);
  const column = 356;
  const panelHeight = 286;
  const code: React.CSSProperties = {fontFamily: codeFace};
  return (
    <Panel tokens={tokens} enter={enter} push={p} eyebrow="LO QUE RECIBE EL LECTOR" title="Que puedan leerte">
      <div style={{position: 'relative', marginTop: 24, height: STAGE_HEIGHT}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: column, opacity: panels, transform: `translateY(${(1 - panels) * 20}px)`}}>
          <div style={{fontSize: 19, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.52)'}}>EN EL NAVEGADOR</div>
          <div
            style={{
              marginTop: 12,
              height: panelHeight,
              boxSizing: 'border-box',
              padding: 18,
              borderRadius: 20,
              background: paper,
              overflow: 'hidden',
              boxShadow: '0 26px 60px rgba(0,0,0,.44)',
            }}
          >
            <div style={{height: 74, borderRadius: 12, background: `linear-gradient(140deg, ${tokens.accent}, #3B2E96)`}} />
            <div style={{marginTop: 16, height: 20, width: '66%', borderRadius: 99, background: '#DCE4EF'}} />
            <div style={{marginTop: 14, display: 'grid', gap: 10}}>
              {[94, 82, 88, 70].map((width, index) => (
                <div key={index} style={{height: 11, width: `${width}%`, borderRadius: 99, background: '#E6ECF4'}} />
              ))}
            </div>
            <div style={{marginTop: 18, height: 38, width: 132, borderRadius: 10, background: '#E1E8F2'}} />
          </div>
        </div>

        <div style={{position: 'absolute', right: 0, top: 0, width: column, opacity: panels, transform: `translateY(${(1 - panels) * 20}px)`}}>
          <div style={{fontSize: 19, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.52)'}}>LO QUE LEE UNA IA</div>
          <div
            style={{
              position: 'relative',
              marginTop: 12,
              height: panelHeight,
              boxSizing: 'border-box',
              padding: 18,
              borderRadius: 20,
              background: '#080D1A',
              border: `2px solid ${served > 0.5 ? `${tokens.confirm}5C` : 'rgba(255,255,255,.12)'}`,
              overflow: 'hidden',
            }}
          >
            <div style={{...code, fontSize: 19, fontWeight: 800, color: 'rgba(255,255,255,.44)', opacity: 1 - served}}>
              &lt;div id="root"&gt;&lt;/div&gt;
            </div>
            <div style={{position: 'absolute', left: 18, right: 18, top: 104, opacity: blank * (1 - served)}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <Cross size={32} color={tokens.alert} progress={beat(p, 0.16, 0.3)} />
                <BoxedText text="Una página en blanco" width={column - 100} max={25} min={17} lines={2} style={{fontWeight: 800, color: tokens.alert}} />
              </div>
            </div>
            {/* The same panel once the server sends the content already written. */}
            <div style={{position: 'absolute', left: 18, right: 18, top: 18, opacity: served}}>
              <div style={{display: 'grid', gap: 10, ...code, fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,.68)'}}>
                {['<h1>Taller XYZ · Cuenca</h1>', '<p>Revisión completa…</p>', '<script type="ld+json">'].map((line, index) => (
                  <Reveal key={line} progress={beat(served, stagger(index, 0.18), stagger(index, 0.18) + 0.4)} from="left">
                    <div style={{color: index === 2 ? tokens.confirm : undefined, whiteSpace: 'nowrap'}}>{line}</div>
                  </Reveal>
                ))}
              </div>
              <div style={{marginTop: 22, display: 'flex', alignItems: 'center', gap: 10}}>
                <Tick size={28} color={tokens.confirm} progress={beat(served, 0.6, 1)} />
                <BoxedText text="Lo lee sin ejecutar nada" width={column - 100} max={23} min={16} style={{fontWeight: 800, color: tokens.confirm}} />
              </div>
            </div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, top: 334, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14}}>
          {DELIVERED.map((label, index) => {
            const arrive = land(p, 0.5 + stagger(index, 0.05), 0.64 + stagger(index, 0.05));
            return (
              <div
                key={label}
                style={{
                  boxSizing: 'border-box',
                  height: 110,
                  padding: '16px 18px',
                  borderRadius: 18,
                  background: `linear-gradient(155deg, ${tokens.confirm}26, ${tokens.confirm}0D)`,
                  border: `2px solid ${tokens.confirm}5C`,
                  opacity: arrive,
                  transform: `translateY(${(1 - arrive) * 22}px)`,
                }}
              >
                <Tick size={24} color={tokens.confirm} progress={beat(arrive, 0.4, 1)} />
                {/* Three columns across 752 with 14 of gap: 241 a card, and 36
                    of padding leaves 205 for the label. */}
                <BoxedText text={label} width={205} max={22} min={14} lines={2} style={{marginTop: 10, fontWeight: 800, color: palette.white}} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            boxSizing: 'border-box',
            padding: '18px 22px',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            background: `${tokens.accent}2E`,
            border: `2px solid ${tokens.accent}7A`,
            opacity: gate,
            transform: `translateY(${(1 - gate) * 20}px)`,
          }}
        >
          <BoxedText text="Si algo de esto falta" width={STAGE - 340} max={25} min={18} style={{fontWeight: 800, color: palette.white}} />
          <span
            style={{
              padding: '12px 18px',
              borderRadius: 99,
              background: tokens.alert,
              color: '#1B1204',
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '.04em',
              whiteSpace: 'nowrap',
              transform: `scale(${1 + pulse(p, 0.88, 0.1) * 0.04})`,
              boxShadow: `0 18px 44px ${tokens.alert}4D`,
            }}
          >
            NO SE DESPLIEGA
          </span>
        </div>
      </div>
    </Panel>
  );
};
