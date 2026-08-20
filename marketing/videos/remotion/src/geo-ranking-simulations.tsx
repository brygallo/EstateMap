import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  anticipate,
  beat,
  figures,
  glide,
  land,
  settle,
  stagger,
  tokensFor,
} from './system-kit';
import {DEPTH, HERO_MOVES, HeroImpact, HeroPlane, heroBeats} from './hero-stage';
import {
  EmBandPill,
  EmCard,
  EmExample,
  EmGlyph,
  EmMeta,
  EmRankRow,
  EmThumb,
  em,
  emCard,
  emType,
} from './estatemap-ui';
import {font, palette, sideCrop} from './theme';
import type {SimulationProps} from './simulations';

/**
 * «El orden no lo compra nadie»: the living ranking pages, shown instead of
 * described.
 *
 * The argument is a mechanism, not a feature list: a page in the blog that
 * nobody wrote, assembled by applying a recipe to published inventory, sorted
 * on the server, with impossible values thrown out, with the reason for each
 * position visible, and with an order nobody can buy. Every scene makes one of
 * those claims literally visible — an animation that only resembles the voice
 * is not allowed to stand in for one that demonstrates it.
 *
 * **The interface is EstateMap's, not the factory's.** The first cut drew the
 * ranking in `interface-kit.tsx` — the dark glass surface the Aents pieces are
 * built on — and the result showed a product that does not exist: EstateMap is
 * a light product. Everything the viewer reads as «the page» now comes from
 * `estatemap-ui.tsx`, whose values are taken from `frontend/app/aents-tokens.css`
 * and `LiveRankingPage.tsx` rather than matched by eye. Nothing here touches
 * the Aents kit.
 *
 * The scenes still stand on the shared craft — the hero rig, the camera, the
 * physics, the safe areas — because that is technique and belongs to both
 * brands. What does not travel is the interface and the argument.
 *
 * A simulation receives no caption veil from `scene.tsx`; it draws its own. So
 * the page occupies the top of the frame and falls away into the dark ground
 * before `textFloor`, which is where the headline and the captions live.
 *
 * What is deliberately absent: any count of pages, listings, cities or people.
 * The hook says «uno por uno» rather than a number for exactly that reason, and
 * every invented price carries `EJEMPLO` for as long as it is on screen.
 */

/**
 * The page runs to the bottom of the frame, and the words sit on a long fade
 * over it.
 *
 * This is how every piece from geo-001 to geo-014 is built and it took two
 * wrong attempts here to see why. The first cut dissolved a white page into
 * black over 190 px, which is not a page ending — it is a lit white band across
 * the frame. The second gave the page an edge and a shadow, which replaced the
 * band with something worse: a hard horizontal line and a dead black rectangle
 * under it.
 *
 * What the map scenes do instead is let the picture fill all 1920 px and lay a
 * long gradient over it. The content keeps going underneath — in `geo-014` the
 * grid of the map is still visible through the shade — so the frame never has
 * an empty half, and the captions get their contrast without anything being
 * cut off. The shade is a light on the picture, not a lid on it.
 */
const PAGE_FADE_TOP = 1140;
/** Fixed, because scene 3 animates rows between numbered slots. */
const ROW_H = 172;
const CONTENT = {left: sideCrop, width: 1080 - sideCrop * 2};
const ROW_GAP = 18;
const ROWS_TOP = 572;

/**
 * The portal, filling the frame, with the caption shade over its lower half.
 *
 * Not `Panel` from `system-kit`: that is a dark card with a lit border, the
 * right frame for an Aents argument and the wrong one for showing a white
 * product.
 */
const EmStage: React.FC<{
  enter?: number;
  push?: number;
  children: React.ReactNode;
}> = ({enter = 1, push = 0, children}) => (
  <AbsoluteFill style={{background: em.surfaceAlt, overflow: 'hidden', fontFamily: font}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          `radial-gradient(120% 60% at 18% 8%, ${em.primaryLight} 0%, rgba(228,248,236,0) 58%), ` +
          `linear-gradient(180deg, ${em.background} 0%, ${em.surfaceAlt} 46%, ${em.surface} 100%)`,
        opacity: Math.min(1, enter * 1.6),
        transformOrigin: '50% 30%',
        transform: `scale(${0.985 + Math.min(1, enter) * 0.015 + push * 0.02}) translateY(${push * -10}px)`,
      }}
    >
      {children}
    </div>
    {/* The shade the words stand on. Long, and over the picture rather than
        instead of it. */}
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: PAGE_FADE_TOP,
        bottom: 0,
        background:
          // Gentle where the last row still lives, dark by the time the
          // headline needs it. The third listing keeps its contrast instead of
          // reading as disabled.
          `linear-gradient(180deg, rgba(241,243,246,0) 0%, rgba(30,34,52,.18) 22%, ` +
          `rgba(20,23,40,.62) 42%, rgba(12,14,26,.9) 58%, ${palette.ink} 72%)`,
        pointerEvents: 'none',
      }}
    />
  </AbsoluteFill>
);

/**
 * The green band the living pages open with, drawn as the product draws it:
 * the «Ranking en vivo» pill, the title and the recalculation note.
 */
const EmPageHead: React.FC<{
  title: string;
  note?: string;
  enter?: number;
  /** Turns the title over on its axis when the recipe changes. */
  flip?: number;
  height?: number;
}> = ({title, note, enter = 1, flip = 0, height = 540}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height,
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${em.primary} 0%, ${em.tealStrong} 46%, ${em.navy} 100%)`,
      color: em.white,
      fontFamily: font,
      opacity: Math.min(1, enter * 1.6),
    }}
  >
    {/* The wordmark and the brand tile are drawn over every scene by
        `scene.tsx`, anchored at y=205 and about 95 px tall. A band that starts
        its own title at 208 puts the domain pill straight through it, which is
        what the first cut did. */}
    <div style={{position: 'absolute', left: CONTENT.left, right: CONTENT.left, top: 318}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16}}>
        <EmBandPill>
          <EmGlyph icon="trophy" size={22} color={em.white} />
          Ranking en vivo
        </EmBandPill>
        <EmExample />
      </div>
      <div
        style={{
          fontSize: 46,
          fontWeight: 900,
          letterSpacing: '-.035em',
          lineHeight: 1.05,
          transform: `perspective(1100px) rotateX(${flip * 360}deg)`,
          transformOrigin: '50% 50%',
        }}
      >
        {title}
      </div>
      {note ? <div style={{marginTop: 14, fontSize: emType.meta, color: 'rgba(255,255,255,.84)'}}>{note}</div> : null}
    </div>
  </div>
);

/* ------------------------------------------------------------------ *
 * The illustrative listings
 *
 * Invented on purpose and marked `EJEMPLO` on screen: they are the example of
 * a listing, the way a photograph of a house that does not exist is. They are
 * plausible for their subject and the voice never turns one into a market fact.
 * ------------------------------------------------------------------ */

/**
 * Three listings, and the two orders the same three produce.
 *
 * Scene 3 used to swap one array for another halfway through, which on screen
 * is not a re-sort: for a beat the badges read 2, 3, 1 and the list looks
 * broken. The listings are one set now, each carrying the slot it takes under
 * each recipe, so a row travels from its old position to its new one and the
 * viewer watches the same card overtake the others.
 *
 * They are invented on purpose and marked `EJEMPLO` on screen: the example of a
 * listing, the way a photograph of a house that does not exist is. The prices
 * are plausible for a lot on the outskirts of Quito, the areas agree with them,
 * and the voice never turns one into a market fact.
 */
const LOTS = [
  {id: 'calderon', title: 'Terreno · Calderón', price: '$18.500', area: '240 m²', address: 'Calderón, Quito', perM2: '$77/m²', byPrice: 1, byArea: 3},
  {id: 'carcelen', title: 'Terreno · Carcelén', price: '$24.900', area: '300 m²', address: 'Carcelén, Quito', perM2: '$83/m²', byPrice: 2, byArea: 2},
  {id: 'chillogallo', title: 'Terreno · Chillogallo', price: '$31.200', area: '320 m²', address: 'Chillogallo, Quito', perM2: '$98/m²', byPrice: 3, byArea: 1},
];

/** The list as the other scenes show it: cheapest first. */
const BY_PRICE = [...LOTS]
  .sort((a, b) => a.byPrice - b.byPrice)
  .map((lot) => ({place: lot.byPrice, title: lot.title, measure: lot.price, address: lot.address, area: lot.area, perM2: lot.perM2}));

/** Phrased the way `reason()` phrases it in `LiveRankingPage.tsx`. */
const REASONS = [
  '78 % por debajo del precio por m² promedio de Quito',
  '54 % por debajo del precio por m² promedio de Quito',
  '31 % por debajo del precio por m² promedio de Quito',
];

/* ------------------------------------------------------------------ *
 * 1 · Hook — opening one listing at a time and losing the comparison
 *
 * Geo's first registered hook staging. `crane-down` rather than the `push-in`
 * Aents opens with: the standard forbids two consecutive pieces being shot the
 * same way, and the argument wants it — a camera descending onto a pile that
 * grows under it says the viewer is being buried, not approached.
 *
 * The subject is the product's own listing card, white on the lit stage. The
 * stage is dark because a hook needs depth and a light source; the product is
 * not.
 * ------------------------------------------------------------------ */

const HERO_STACK = 4;
/**
 * One card, held still, with four listings passing through it.
 *
 * Two earlier cuts animated four cards opening and folding away inside 3.8
 * seconds. On paper that is four events; on any given frame it means catching a
 * card halfway through a collapse, so the still that TikTok freezes on shows a
 * squashed white lozenge with its title cut off. A hook cannot afford a frame
 * that looks broken — every frame of it is the thumbnail.
 *
 * So the card stays where it is and the *listing* changes inside it: the photo,
 * the title and the price replace each other while a stack of the ones already
 * read grows underneath. Same argument — you are opening them one at a time —
 * with a subject that is legible in every frame, which is what `geo-013` gets
 * right and what makes it look expensive.
 */
const HERO_CARD = {width: 856, left: 112};
const HERO_TOP = 356;
const HERO_IMPACT_AT = 0.76;
const HERO_LISTINGS = [
  {title: 'Terreno en venta, norte de Quito', price: '$96.000', area: '240 m²', perM2: '$400/m²'},
  {title: 'Terreno en venta, valle de Tumbaco', price: '$104.500', area: '310 m²', perM2: '$337/m²'},
  {title: 'Terreno en venta, sur de Quito', price: '$99.900', area: '265 m²', perM2: '$377/m²'},
  {title: 'Terreno en venta, Calderón', price: '$102.000', area: '288 m²', perM2: '$354/m²'},
];

export const GeoRankingHookSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  // Four listings pass through the card, accelerating.
  const turns = heroBeats(p, HERO_STACK, {from: 0.05, to: 0.66, hold: 0.09});
  const shown = turns.reduce((acc, t) => (t.progress > 0.5 ? acc + 1 : acc), 0);
  const current = Math.min(HERO_STACK - 1, Math.max(0, shown - 1));
  const swap = turns[current]?.progress ?? 1;
  const gap = land(p, HERO_IMPACT_AT, 0.95);

  /**
   * The card answers every turn. A title changing is a small event on a
   * 1080 x 1920 canvas; the card flexing and the stack lurching under it is the
   * same event made visible.
   */
  const reaction = Math.max(
    0,
    ...turns.map((t) => Math.sin(beat(p, t.start, t.start + 0.05) * Math.PI)),
    Math.sin(beat(p, HERO_IMPACT_AT - 0.05, HERO_IMPACT_AT + 0.05) * Math.PI),
  );

  // The rig, kept: one camera, declared planes, a light with a source. What it
  // does not keep is `HeroStage`'s black ground — a white product standing on a
  // black stage comes out grey, which is exactly what happened.
  const camera = HERO_MOVES['hold-in'](p);
  const listing = HERO_LISTINGS[current];

  return (
    <AbsoluteFill style={{background: em.surfaceAlt, overflow: 'hidden', fontFamily: font}}>
      {/* The ground: light, with the key light behind the card. */}
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(88% 44% at 50% 30%, #FFFFFF 0%, rgba(255,255,255,0) 64%), ` +
            `radial-gradient(120% 56% at 14% 2%, ${em.primaryLight} 0%, rgba(228,248,236,0) 58%), ` +
            `linear-gradient(180deg, ${em.background} 0%, ${em.surfaceAlt} 54%, ${em.surface} 100%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: -200,
          opacity: 0.55,
          backgroundImage:
            `linear-gradient(${em.lineSubtle} 3px, transparent 3px),` +
            `linear-gradient(90deg, ${em.lineSubtle} 3px, transparent 3px)`,
          backgroundSize: '96px 96px',
          backgroundPosition: `${p * -170}px ${p * 120}px`,
          maskImage: 'radial-gradient(ellipse at 50% 40%, #000 10%, transparent 76%)',
        }}
      />

      {/* Context: the ones already read, piling up under the card.
          They are collapsed listings, not blank bars: two empty white
          rectangles read as a page still loading, which is the opposite of
          what the shot is saying. */}
      <HeroPlane camera={camera} depth={DEPTH.context}>
        {turns.map((turn, index) => {
          if (index >= shown || turn.progress <= 0) return null;
          const settled = settle(turn.progress, 0, 1);
          const depth = shown - index;
          const past = HERO_LISTINGS[index];
          return (
            <div
              key={`pile-${index}`}
              style={{
                position: 'absolute',
                left: HERO_CARD.left + 20 + (index % 2 ? 10 : -10),
                top: HERO_TOP + 468 + depth * 62 - settled * 52 + reaction * 5,
                width: HERO_CARD.width - 40,
                boxSizing: 'border-box',
                height: 88,
                padding: '0 22px',
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                borderRadius: emCard.radius,
                background: em.background,
                border: emCard.border,
                opacity: (0.45 + settled * 0.5) * Math.max(0, 1 - (depth - 1) * 0.22),
                boxShadow: `0 ${12 + reaction * 8}px ${30 + reaction * 18}px rgba(15,23,42,.14)`,
              }}
            >
              <EmThumb size={92} height={58} tint={index} />
              <span style={{flex: 1, minWidth: 0, fontSize: emType.meta, fontWeight: 700, color: em.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {past.title}
              </span>
              <span style={{fontSize: emType.meta + 4, fontWeight: 900, color: em.textMuted, flex: 'none', ...figures}}>
                {past.price}
              </span>
              <span style={{fontSize: emType.micro, fontWeight: 800, color: em.textMuted, flex: 'none'}}>visto</span>
            </div>
          );
        })}
      </HeroPlane>

      {/* Subject: one card, always whole, always legible. */}
      <HeroPlane camera={camera} depth={DEPTH.subject}>
        <div
          style={{
            position: 'absolute',
            left: HERO_CARD.left,
            top: HERO_TOP,
            width: HERO_CARD.width,
            // The card flexes on each turn instead of collapsing: it is never
            // caught halfway through disappearing.
            transform: `scale(${1 + reaction * 0.018}) translateY(${-reaction * 8}px)`,
            filter: 'drop-shadow(0 30px 60px rgba(15,23,42,.2))',
          }}
        >
          <EmCard raised style={{padding: '28px 32px'}}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20}}>
              <span style={{fontSize: emType.label, fontWeight: 800, color: em.primaryStrong, letterSpacing: '.06em'}}>
                ANUNCIO ABIERTO
              </span>
              <EmExample />
            </div>
            {/* The listing inside: it slides up as it is replaced, so the change
                is a movement rather than a dissolve. */}
            <div style={{marginTop: 24, display: 'flex', alignItems: 'flex-start', gap: 26, overflow: 'hidden'}}>
              <EmThumb size={264} height={186} tint={current} />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transform: `translateY(${(1 - settle(swap, 0, 1)) * 26}px)`,
                  opacity: 0.35 + settle(swap, 0, 1) * 0.65,
                }}
              >
                <div style={{fontSize: emType.body, fontWeight: 800, color: em.text, lineHeight: 1.18}}>
                  {listing.title}
                </div>
                <div style={{fontSize: 64, fontWeight: 900, color: em.primaryStrong, ...figures}}>{listing.price}</div>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px 22px'}}>
                  <EmMeta icon="ruler" text={listing.area} />
                  <EmMeta icon="tag" text={listing.perM2} />
                </div>
              </div>
            </div>
            {/* Where a position would go, if anything were sorting these. */}
            <div
              style={{
                marginTop: 24,
                height: 74,
                borderRadius: emCard.radius,
                border: `3px dashed ${gap > 0 ? em.primary : em.line}`,
                background: gap > 0 ? em.primaryLight : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: gap > 0 ? 'center' : 'flex-start',
                paddingLeft: gap > 0 ? 0 : 26,
                fontSize: gap > 0 ? 40 : emType.meta,
                fontWeight: gap > 0 ? 900 : 700,
                color: gap > 0 ? em.primaryStrong : em.textMuted,
                transform: `scale(${1 + gap * 0.03})`,
                boxShadow: gap > 0 ? `0 0 ${60 * gap}px ${em.primary}44` : undefined,
              }}
            >
              {gap > 0.35 ? '¿Cuál es el más barato?' : 'Posición —'}
            </div>
          </EmCard>
        </div>
      </HeroPlane>

      {/* Foreground: the pointer, on the card's lower edge, clear of every
          label. Drawn by `lucide`, not by a polygon. */}
      <HeroPlane camera={camera} depth={DEPTH.foreground}>
        <div
          style={{
            position: 'absolute',
            left: HERO_CARD.left + HERO_CARD.width - 112,
            top: HERO_TOP + 392 - reaction * 22,
            transform: `scale(${1 + reaction * 0.24})`,
            filter: 'drop-shadow(0 10px 16px rgba(15,23,42,.4))',
            opacity: 1 - gap,
          }}
        >
          <EmGlyph icon="cursor" size={54} color={em.text} />
        </div>
      </HeroPlane>

      <HeroImpact progress={p} at={HERO_IMPACT_AT} x={540} y={HERO_TOP + 480} color={em.primary} reach={720} />

      {/* The shade the words stand on, the same as every other scene. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: PAGE_FADE_TOP,
          bottom: 0,
          background:
            `linear-gradient(180deg, rgba(241,243,246,0) 0%, rgba(30,34,52,.18) 22%, ` +
            `rgba(20,23,40,.62) 42%, rgba(12,14,26,.9) 58%, ${palette.ink} 72%)`,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ *
 * 2 · The page that was already made
 *
 * The claim is that the answer exists already, so the list arrives finished —
 * sorted, numbered and legible — rather than being assembled by the viewer's
 * patience. This is the product's page, drawn as the product draws it.
 * ------------------------------------------------------------------ */

export const GeoOrderedPageSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const enter = land(p, 0.02, 0.18);
  const push = glide(p, 0.05, 1);
  const rows = BY_PRICE.map((_, index) => land(p, 0.16 + stagger(index, 0.09), 0.4 + stagger(index, 0.09)));
  const actions = land(p, 0.62, 0.82);

  return (
    <EmStage enter={enter} push={push}>
      <EmPageHead title="Los terrenos más baratos de Quito" note="Se recalcula con el inventario publicado" enter={enter} />
      <div
        style={{
          position: 'absolute',
          left: CONTENT.left,
          width: CONTENT.width,
          top: ROWS_TOP,
          display: 'flex',
          flexDirection: 'column',
          gap: ROW_GAP,
        }}
      >
        {BY_PRICE.map((item, index) => (
          <EmRankRow
            key={item.place}
            place={item.place}
            title={item.title}
            measure={item.measure}
            address={item.address}
            area={item.area}
            perM2={item.perM2}
            actions={index === 0 && actions > 0.3}
            raised={index === 0 && actions > 0.3}
            enter={rows[index]}
            width={CONTENT.width}
          />
        ))}
      </div>
    </EmStage>
  );
};

/* ------------------------------------------------------------------ *
 * 3 & 4 · The recipe
 *
 * One animation across two scenes, because it is one arc:
 * `renderer.AssetTimeline` carries it across the cut so the second half
 * continues rather than restarts.
 *
 * The first half re-sorts: the title turns over and the same inventory produces
 * a different order. The second half lifts the page and shows what it was built
 * from — listings rising into a band that refuses the impossible ones. That
 * band is `LIVE-003` made visible: a price of one dollar and an area a thousand
 * times too large are exactly the records that used to put a $3/m² lot at the
 * top of a ranking.
 * ------------------------------------------------------------------ */

const REJECTED = [
  {label: '$1', note: 'precio imposible', x: 40},
  {label: '96.000 m²', note: 'área imposible', x: 470},
];

export const GeoRecipeSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const enter = land(p, 0, 0.09);
  const push = glide(p, 0, 1);

  // First half: the recipe turns over and the rows travel to their new slots.
  const flip = beat(p, 0.1, 0.26);
  const resorted = settle(p, 0.18, 0.46);
  const byArea = flip > 0.5;

  // Second half: the list leaves and what built it takes the frame.
  const reveal = settle(p, 0.5, 0.68);
  const feed = Array.from({length: 5}, (_, index) => glide(p, 0.54 + stagger(index, 0.055), 0.88));
  const rejects = REJECTED.map((_, index) => beat(p, 0.6 + index * 0.1, 0.84 + index * 0.1));

  return (
    <EmStage enter={enter} push={push}>
      <EmPageHead
        title={byArea ? 'Los terrenos más grandes de Quito' : 'Los terrenos más baratos de Quito'}
        note={byArea ? 'Ordenado por área' : 'Ordenado por precio'}
        enter={enter}
        flip={flip}
        height={540}
      />

      {/* The same three listings, travelling between the slots the two recipes
          give them. Absolute inside a fixed-height box: a flex column cannot
          animate a row past its neighbours, and the version that swapped the
          array instead showed the badges as 2, 3, 1 for half a second. */}
      <div
        style={{
          position: 'absolute',
          left: CONTENT.left,
          width: CONTENT.width,
          top: ROWS_TOP - reveal * 520,
          height: ROW_H * LOTS.length + ROW_GAP * (LOTS.length - 1),
          opacity: 1 - Math.max(0, reveal - 0.2) * 1.7,
        }}
      >
        {LOTS.map((lot) => {
          // Where it sits now: its price slot, moving to its area slot.
          const slot = lot.byPrice + (lot.byArea - lot.byPrice) * resorted;
          const place = byArea ? lot.byArea : lot.byPrice;
          // Whichever row is overtaking crosses in front of the others.
          const travelling = Math.abs(lot.byArea - lot.byPrice) > 0;
          return (
            <div
              key={lot.id}
              style={{
                position: 'absolute',
                left: 0,
                width: CONTENT.width,
                top: (slot - 1) * (ROW_H + ROW_GAP),
                zIndex: travelling && resorted > 0 && resorted < 1 ? 5 : place === 1 ? 3 : 1,
              }}
            >
              <EmRankRow
                place={place}
                title={lot.title}
                measure={byArea ? lot.area : lot.price}
                address={lot.address}
                area={lot.area}
                perM2={lot.perM2}
                actions={false}
                raised={place === 1}
                width={CONTENT.width}
              />
            </div>
          );
        })}
      </div>

      {/* What the page was made from, once the list has left the frame.
          Laid out in bands with nothing sharing a band: the previous version
          put the label behind the rising cards and dropped the two refused ones
          on top of them, and the whole thing read as debris rather than as a
          filter. */}
      {reveal > 0.02 ? (
        <div
          style={{position: 'absolute', left: CONTENT.left, width: CONTENT.width, top: 520, height: 600, opacity: reveal}}
        >
          {/* Band 1: the label, alone on its line. */}
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 96,
              fontSize: emType.label,
              fontWeight: 900,
              color: em.primaryStrong,
              letterSpacing: '.06em',
            }}
          >
            LO QUE HAY PUBLICADO HOY
          </span>

          {/* Band 2: the line every listing has to cross. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 58,
              width: CONTENT.width,
              height: 8,
              borderRadius: 99,
              background: `linear-gradient(90deg, ${em.primary}00, ${em.primary}, ${em.primary}00)`,
              boxShadow: `0 0 28px ${em.primary}66`,
            }}
          />

          {/* Band 3: the listings rising into it. Four abreast, evenly spaced,
              each one big enough to be a listing rather than a chip. */}
          {feed.map((rise, index) => {
            if (index >= 4) return null;
            const w = (CONTENT.width - 3 * 22) / 4;
            return (
              <div
                key={`pass-${index}`}
                style={{
                  position: 'absolute',
                  left: index * (w + 22),
                  top: 540 - rise * 380,
                  width: w,
                  boxSizing: 'border-box',
                  padding: 14,
                  borderRadius: emCard.radius,
                  background: em.background,
                  border: emCard.border,
                  boxShadow: emCard.shadow,
                  opacity: Math.min(1, rise * 2.6) * (1 - Math.max(0, rise - 0.9) * 8),
                }}
              >
                <EmThumb size={w - 28} height={92} tint={index + 3} kind="land" />
                <div style={{marginTop: 10, display: 'flex', alignItems: 'center', gap: 8}}>
                  <EmGlyph icon="check" size={22} color={em.primaryStrong} />
                  <span style={{fontSize: emType.micro, fontWeight: 700, color: em.textSecondary}}>anuncio</span>
                </div>
              </div>
            );
          })}

          {/* Band 4: the two the line refuses, set aside on their own row below
              everything else so nothing of theirs lands on anything else. */}
          {REJECTED.map((item, index) => {
            const hit = rejects[index];
            if (hit <= 0) return null;
            const bounce = Math.sin(Math.min(1, hit * 2.4) * Math.PI * 2) * 20;
            const aside = settle(hit, 0.5, 1);
            return (
              <div
                key={item.label}
                style={{
                  position: 'absolute',
                  left: index === 0 ? 0 : CONTENT.width - 300,
                  top: 330 - Math.min(1, hit * 2.2) * 168 + bounce + aside * 268,
                  width: 300,
                  boxSizing: 'border-box',
                  padding: '16px 20px',
                  borderRadius: emCard.radius,
                  background: `${em.warning}1A`,
                  border: `3px solid ${em.warning}${aside > 0.6 ? '55' : 'FF'}`,
                  opacity: 1 - aside * 0.28,
                  filter: aside > 0.6 ? 'saturate(.55)' : undefined,
                  transform: `rotate(${aside * (index === 0 ? -8 : 8)}deg)`,
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                  <EmGlyph icon="reject" size={30} color="#8A5A08" />
                  <span style={{fontSize: 40, fontWeight: 900, color: '#8A5A08', ...figures}}>{item.label}</span>
                </div>
                <div style={{marginTop: 6, fontSize: emType.meta, fontWeight: 800, color: '#8A5A08'}}>
                  {aside > 0.6 ? 'descartado' : item.note}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </EmStage>
  );
};


/* ------------------------------------------------------------------ *
 * 5 · The reason, and the map
 *
 * `LIVE-006` has two halves and the scene demonstrates both: each row opens the
 * reason it holds its position — the real pill the page prints, phrased the way
 * `reason()` phrases it — and then the one that was touched leaves the list and
 * lands on the map as a priced pin. None of the reasons names views or a
 * promoted slot, because none of them can.
 * ------------------------------------------------------------------ */

export const GeoReasonSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  // Two rows, not three. The scene is about the reason and about the map, and
  // three rows with a two-line pill each ran straight into the headline. A shot
  // shows one thing; the list was already established two scenes ago.
  const shown = BY_PRICE.slice(0, 2);

  const enter = land(p, 0, 0.09);
  const push = glide(p, 0, 1);
  const opened = shown.map((_, index) => land(p, 0.1 + stagger(index, 0.12), 0.36 + stagger(index, 0.12)));
  const touch = beat(p, 0.46, 0.56);
  const travel = glide(p, 0.52, 0.8);
  const landed = land(p, 0.72, 0.95);

  return (
    <EmStage enter={enter} push={push}>
      <EmPageHead title="Cada anuncio dice su motivo" note="Y en qué parte del mapa queda" enter={enter} height={440} />

      <div
        style={{
          position: 'absolute',
          left: CONTENT.left,
          width: CONTENT.width,
          top: 470,
          display: 'flex',
          flexDirection: 'column',
          gap: ROW_GAP,
        }}
      >
        {shown.map((item, index) => (
          <div
            key={item.place}
            style={{
              opacity: index === 0 ? 1 - travel * 0.92 : 1,
              transform: index === 0 ? `translateX(${travel * 300}px) translateY(${travel * 300}px) scale(${1 - travel * 0.52})` : undefined,
              position: 'relative',
              zIndex: index === 0 ? 4 : 1,
            }}
          >
            <EmRankRow
              place={item.place}
              title={item.title}
              measure={item.measure}
              address={item.address}
              area={item.area}
              perM2={item.perM2}
              reason={opened[index] > 0.12 ? REASONS[index] : undefined}
              reasonEnter={opened[index]}
              actions={false}
              raised={index === 0}
              width={CONTENT.width}
              tint={index}
              kind="land"
            />
          </div>
        ))}
      </div>

      {/* The pointer that picks the first one. A hand, on the card's edge, so it
          reads as a tap and not as a black shard over the photograph. */}
      {touch > 0 && travel < 0.7 ? (
        <div
          style={{
            position: 'absolute',
            left: CONTENT.left + CONTENT.width - 108,
            top: 566 + Math.sin(touch * Math.PI) * 16,
            opacity: (1 - travel) * Math.min(1, touch * 2),
            transform: `scale(${0.9 + Math.sin(touch * Math.PI) * 0.35})`,
            filter: 'drop-shadow(0 8px 14px rgba(15,23,42,.35))',
            zIndex: 6,
          }}
        >
          <EmGlyph icon="cursor" size={58} color={em.primaryStrong} />
        </div>
      ) : null}

      {/* The map it lands on: the row does not open a page, it becomes a place. */}
      {travel > 0.03 ? (
        <div
          style={{
            position: 'absolute',
            left: CONTENT.left,
            width: CONTENT.width,
            top: 800,
            height: 290,
            borderRadius: emCard.radius,
            overflow: 'hidden',
            background: '#E8EEF3',
            border: emCard.border,
            boxShadow: emCard.shadowHover,
            opacity: Math.min(1, travel * 2.2),
          }}
        >
          {/* Blocks and streets, so it reads as a city and not as a grid. */}
          {[[0, 0, 46, 34], [54, 0, 46, 34], [0, 42, 30, 58], [38, 42, 62, 26], [38, 76, 62, 24]].map(
            ([x, y, w, h], i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  background: i % 2 ? '#F4F7FA' : '#EDF2F6',
                  border: '3px solid #FFFFFF',
                }}
              />
            ),
          )}
          <div style={{position: 'absolute', left: 0, right: 0, top: '38%', height: 10, background: '#FFFFFF'}} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: '34%', width: 10, background: '#FFFFFF'}} />
          {/* The zone lighting up under the pin. */}
          {landed > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: '20%',
                top: '30%',
                width: 260,
                height: 200,
                borderRadius: 18,
                background: `${em.primary}26`,
                border: `4px solid ${em.primary}`,
                opacity: landed,
                transform: `scale(${0.86 + landed * 0.14})`,
              }}
            />
          ) : null}
          {landed > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: '26%',
                top: 96 - (1 - landed) * 180,
                height: 70,
                padding: '0 24px',
                borderRadius: emCard.radiusPill,
                background: em.primaryStrong,
                color: em.white,
                fontSize: 34,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                ...figures,
                boxShadow: '0 16px 34px rgba(0,0,0,.3)',
                transform: `scale(${0.8 + landed * 0.2})`,
              }}
            >
              <EmGlyph icon="pin" size={30} color={em.white} />
              $18.500
            </div>
          ) : null}
        </div>
      ) : null}
    </EmStage>
  );
};

/* ------------------------------------------------------------------ *
 * 6 · The order nobody buys
 *
 * The objection, answered by refusal rather than by assertion. Three labels
 * that decide the order on most portals try twice each to attach themselves to
 * the first position and are pushed back; the list does not move. `LIVE-009` is
 * the rule underneath, and «lo más visto» appears here only as a label being
 * refused — never as a number on screen.
 * ------------------------------------------------------------------ */

const BUYERS = ['Destacado', 'Publicidad', 'Lo más visto'];

export const GeoNoPromotedSim: React.FC<SimulationProps> = ({frame, total}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;

  const enter = land(p, 0, 0.09);
  const push = glide(p, 0, 1);
  const attempts = BUYERS.map((_, index) => beat(p, 0.1 + index * 0.2, 0.38 + index * 0.2));
  const criterion = land(p, 0.76, 0.95);
  const confirm = Math.max(0, ...BUYERS.map((_, i) => Math.sin(beat(p, 0.3 + i * 0.2, 0.4 + i * 0.2) * Math.PI)));

  return (
    <EmStage enter={enter} push={push}>
      <EmPageHead title="El orden no lo compra nadie" note="Ordenado por el dato" enter={enter} height={452} />

      <div
        style={{
          position: 'absolute',
          left: CONTENT.left,
          width: CONTENT.width,
          top: 520,
          display: 'flex',
          flexDirection: 'column',
          gap: ROW_GAP,
        }}
      >
        {BY_PRICE.map((item, index) => (
          <div key={item.place} style={{position: 'relative', zIndex: index === 0 ? 5 : 1}}>
            <EmRankRow
              place={item.place}
              title={item.title}
              measure={item.measure}
              address={item.address}
              area={item.area}
              perM2={item.perM2}
              actions={false}
              raised={index === 0}
              width={CONTENT.width}
              measureLive={index !== 0 || confirm > 0.12}
            />
            {/* The first row is the one they try to buy.
                They arrive from the right edge of the card, not from outside
                the frame: anchoring them to the canvas put «Lo más visto» half
                off screen, so the label the objection is about never got read. */}
            {index === 0
              ? BUYERS.map((label, order) => {
                  const attempt = attempts[order];
                  if (attempt <= 0) return null;
                  const arrive = Math.min(1, attempt * 2.4);
                  const shove = Math.abs(Math.sin(Math.min(1, attempt * 1.6) * Math.PI * 2));
                  const gone = settle(attempt, 0.62, 1);
                  return (
                    <div
                      key={label}
                      style={{
                        position: 'absolute',
                        right: 18 - (1 - arrive) * 320 - gone * 360,
                        top: 24 + order * 58,
                        height: 56,
                        padding: '0 22px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: emCard.radiusPill,
                        background: em.warning,
                        border: '3px solid #B97C0A',
                        color: '#3A2503',
                        fontSize: 28,
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        textDecoration: gone > 0.25 ? 'line-through' : undefined,
                        opacity: arrive * (1 - gone * 0.9),
                        filter: gone > 0.25 ? 'saturate(.35)' : undefined,
                        transform: `translateX(${-shove * 30}px) rotate(${gone * 6}deg)`,
                        boxShadow: '0 10px 24px rgba(15,23,42,.22)',
                        zIndex: 8,
                      }}
                    >
                      {label}
                    </div>
                  );
                })
              : null}
          </div>
        ))}
      </div>

      {/* What does decide, said once and left standing. */}
      {criterion > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: CONTENT.left,
            width: CONTENT.width,
            top: 872,
            display: 'flex',
            justifyContent: 'center',
            opacity: criterion,
            transform: `translateY(${(1 - criterion) * 24}px)`,
          }}
        >
          <span
            style={{
              height: 78,
              padding: '0 34px',
              borderRadius: emCard.radiusPill,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 16,
              background: em.primaryLight,
              border: `3px solid ${em.primary}`,
              color: em.primaryStrong,
              fontSize: 36,
              fontWeight: 900,
            }}
          >
            <EmGlyph icon="trophy" size={30} color={em.primaryStrong} />
            Ordenado por el dato
          </span>
        </div>
      ) : null}
    </EmStage>
  );
};
