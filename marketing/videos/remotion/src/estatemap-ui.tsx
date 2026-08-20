import React from 'react';
import {figures} from './system-kit';
import {font} from './theme';
import {PropertyArt, PropertyKind} from './property-art';
import {ArrowRight, Ban, Check, Home, MapPin, MousePointer2, Ruler, Tag, Trophy} from 'lucide-react';

/** The glyphs the living pages use, by the name the piece calls them. */
const ICONS = {
  pin: MapPin,
  ruler: Ruler,
  tag: Tag,
  trophy: Trophy,
  home: Home,
  arrow: ArrowRight,
  /** The pointer. Hand-drawing a cursor out of a polygon is the same mistake
      as hand-drawing a pin: there is a glyph for it and the product uses this
      set. */
  cursor: MousePointer2,
  /** What passed the check, and what did not. */
  check: Check,
  reject: Ban,
} as const;

export type EmIcon = keyof typeof ICONS;

/**
 * The portal's own interface, at canvas scale.
 *
 * `interface-kit.tsx` draws the dark, glass-panelled surface the Aents pieces
 * are built on. EstateMap is not that: it is a light product — white cards on
 * white, a hairline border, a shadow you have to look for, black text and one
 * green — and a Geo piece drawn in the dark kit shows a product that does not
 * exist. The first cut of `geo-015` made exactly that mistake, and it is
 * visible in one frame: the animation looked like the video factory instead of
 * looking like the thing being sold.
 *
 * Every value here is read from the running product, not matched by eye:
 * `frontend/app/aents-tokens.css` for the palette, radii and shadows,
 * `frontend/tailwind.config.js` for how they are named, and
 * `frontend/components/blog/LiveRankingPage.tsx` for the layout of a ranking
 * row. When a token moves in the product, it moves here.
 *
 * The one deliberate departure is scale. The canvas is 1080 px wide, roughly
 * twice a phone's logical width, so a card drawn at the product's literal 8 px
 * radius reads as a sharp rectangle on a phone. Sizes are doubled; proportions
 * are not touched.
 */

/** The product's tokens, copied from `frontend/app/aents-tokens.css`. */
export const em = {
  /** `--background-rgb`. The page. */
  background: '#FFFFFF',
  /** `--surface-rgb`. What a card sits on. */
  surface: '#F1F3F6',
  surfaceAlt: '#FAFAFB',
  /** `--text-rgb`, `--text-secondary-rgb`, `--text-muted-rgb`. */
  text: '#0B0D17',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  /** `--border-rgb` and `--border-subtle-rgb`. Hairlines, not outlines. */
  line: '#D1D5DB',
  lineSubtle: '#E5E7EB',
  /** `--primary-rgb`. Verde Vital. */
  primary: '#22C55E',
  /** `--primary-strong-rgb`. The green that is legible as text on white. */
  primaryStrong: '#1B8648',
  /** `--primary-soft-rgb`. Badge and pill fills. */
  primaryLight: '#E4F8EC',
  /** `--primary-pressed-rgb`. Río Turquesa. */
  teal: '#14B8A6',
  tealStrong: '#127D77',
  /** `--navy`. Where the hero gradient ends. */
  navy: '#0F1020',
  white: '#FFFFFF',
  /** `--warning-rgb`. The only non-brand colour the product allows. */
  warning: '#F59E0B',
} as const;

/**
 * Doubled from the product because the canvas is.
 *
 * `--radius-sm` is 8 px and `--shadow-1` is a one-pixel hairline: at canvas
 * scale both disappear, and a card with no shadow is a rectangle.
 */
export const emCard = {
  /** `--radius-sm` is 8 px on the page. */
  radius: 16,
  radiusPill: 999,
  /** `--shadow-1`: rgba(0,0,0,.05) 0 1px 2px. */
  shadow: '0 2px 4px rgba(0,0,0,.05)',
  /** `--shadow-3`: rgba(0,0,0,.10) 0 8px 16px. */
  shadowHover: '0 16px 32px rgba(0,0,0,.10)',
  /** A 1 px hairline in `--border-rgb`. */
  border: `2px solid ${em.line}`,
  borderSubtle: `2px solid ${em.lineSubtle}`,
} as const;

/** Type sizes that survive the platform re-encode. The floor is 22 px. */
export const emType = {
  display: 56,
  title: 44,
  price: 44,
  body: 34,
  label: 30,
  meta: 27,
  micro: 24,
} as const;

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/** The page a product scene happens on: light, not a dark stage. */
export const EmPage: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({children, style}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: em.background,
      color: em.text,
      fontFamily: font,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * The green band the living pages open with.
 *
 * `from-primary via-primaryHover to-[var(--navy)]`, exactly as
 * `LiveRankingPage.tsx` writes it.
 */
export const EmHeroBand: React.FC<{
  children?: React.ReactNode;
  height: number;
  enter?: number;
  style?: React.CSSProperties;
}> = ({children, height, enter = 1, style}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height,
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${em.primary} 0%, ${em.tealStrong} 46%, ${em.navy} 100%)`,
      borderBottom: `2px solid ${em.line}`,
      color: em.white,
      opacity: Math.min(1, enter * 1.6),
      ...style,
    }}
  >
    {children}
  </div>
);

/** A white card: hairline border, a shadow you have to look for. */
export const EmCard: React.FC<{
  children: React.ReactNode;
  width?: number | string;
  raised?: boolean;
  style?: React.CSSProperties;
}> = ({children, width = '100%', raised = false, style}) => (
  <div
    style={{
      position: 'relative',
      width,
      boxSizing: 'border-box',
      background: em.background,
      border: emCard.border,
      borderRadius: emCard.radius,
      boxShadow: raised ? emCard.shadowHover : emCard.shadow,
      fontFamily: font,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ *
 * Parts of a ranking row
 * ------------------------------------------------------------------ */

/** The position badge: a green-tinted circle with the number in green. */
export const EmRank: React.FC<{place: number; size?: number}> = ({place, size = 88}) => (
  <span
    style={{
      width: size,
      height: size,
      flex: 'none',
      borderRadius: '50%',
      background: em.primaryLight,
      color: em.primaryStrong,
      fontSize: size * 0.355,
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...figures,
    }}
  >
    {place}
  </span>
);

/**
 * The reason pill: why this listing holds this position.
 *
 * `bg-primaryLight … text-primary` on the real page. It is the one element of
 * the row that carries the argument of the whole piece, so it is never a
 * decoration and never abbreviated.
 */
export const EmReason: React.FC<{text: string; enter?: number}> = ({text, enter = 1}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      alignSelf: 'flex-start',
      padding: '8px 18px',
      borderRadius: emCard.radiusPill,
      background: em.primaryLight,
      color: em.primaryStrong,
      fontSize: emType.meta,
      fontWeight: 600,
      opacity: Math.min(1, enter * 1.6),
      transform: `translateY(${(1 - enter) * 10}px)`,
      maxWidth: '100%',
      boxSizing: 'border-box',
      lineHeight: 1.25,
    }}
  >
    {text}
  </span>
);

/** A pill on the green band: translucent white over the gradient. */
export const EmBandPill: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 20px',
      borderRadius: emCard.radiusPill,
      background: 'rgba(255,255,255,.14)',
      border: '2px solid rgba(255,255,255,.28)',
      color: em.white,
      fontSize: emType.meta,
      fontWeight: 700,
    }}
  >
    {children}
  </span>
);

/** The white call-to-action of the band: green text on white. */
export const EmBandButton: React.FC<{label: string; ghost?: boolean}> = ({label, ghost = false}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      height: 66,
      padding: '0 26px',
      borderRadius: emCard.radiusPill,
      background: ghost ? 'rgba(255,255,255,.12)' : em.white,
      border: ghost ? '2px solid rgba(255,255,255,.3)' : 'none',
      color: ghost ? em.white : em.primaryStrong,
      fontSize: emType.label,
      fontWeight: 800,
      boxShadow: ghost ? undefined : emCard.shadowHover,
    }}
  >
    {label}
    {ghost ? null : <EmArrow />}
  </span>
);

/** The arrow the product puts after its primary action. */
/** The arrow the product puts after its primary action. */
export const EmArrow: React.FC<{color?: string; size?: number}> = ({color = em.primaryStrong, size = 24}) => (
  <ArrowRight size={size} color={color} strokeWidth={2.4} absoluteStrokeWidth />
);

/**
 * A meta item of the row: the little green glyph and its value.
 *
 * The product uses lucide icons at 16 px — a pin for the address, a ruler for
 * the area. Drawn rather than imported so the piece carries no dependency the
 * renderer would have to resolve, but the shape, the weight and the green are
 * the product's.
 */
export const EmMeta: React.FC<{icon: EmIcon; text: string}> = ({icon, text}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: emType.meta, fontWeight: 400, color: em.textSecondary}}>
    <EmGlyph icon={icon} />
    {text}
  </span>
);

/**
 * An icon of the product, drawn by the product's own icon set.
 *
 * `LiveRankingPage.tsx` imports `ArrowRight, Home, MapPin, Ruler, Trophy` from
 * `lucide-react`, at 16 px with a 1.75 stroke. This file had hand-drawn
 * approximations of a pin and a ruler instead, which is the same mistake as
 * approximating a colour: an invented icon is not the product's icon, and it
 * looks invented. The factory now installs the same package at the same major
 * version and uses the same glyphs.
 */
export const EmGlyph: React.FC<{icon: EmIcon; size?: number; color?: string}> = ({
  icon,
  size = 26,
  color = em.primary,
}) => {
  const Glyph = ICONS[icon];
  // The product draws these at 16 px with stroke 1.75. At twice the scale the
  // stroke has to double too or the icon comes out spindly next to the type.
  return <Glyph size={size} color={color} strokeWidth={2.2} absoluteStrokeWidth />;
};

/**
 * The `EJEMPLO` badge.
 *
 * Not a product component: the product never labels a real listing as an
 * example. It belongs to the piece, and it is on screen for exactly as long as
 * an invented figure is, which is what the brief requires before a made-up
 * price may be shown at all. Drawn in the product's warning colour so it reads
 * as an annotation over the interface rather than as part of it.
 */
export const EmExample: React.FC<{scale?: number}> = ({scale = 1}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 34 * scale,
      padding: `0 ${14 * scale}px`,
      borderRadius: emCard.radiusPill,
      background: em.warning,
      border: `2px solid ${em.warning}`,
      color: '#3A2503',
      fontSize: 21 * scale,
      fontWeight: 900,
      letterSpacing: '.08em',
      flex: 'none',
    }}
  >
    EJEMPLO
  </span>
);

/**
 * A listing thumbnail: a lot with its fence, the road in front and a house
 * next door.
 *
 * The grey placeholder that was here is what the product falls back to when a
 * listing has no photo, and putting it in a piece meant every row showed an
 * empty box. That is not the product either — a real ranking is full of
 * photographs — and it is the single thing that made these scenes look cheap
 * next to `geo-013`, which draws a whole illustrated house.
 *
 * Drawn rather than photographed because the listings are invented: a real
 * photograph would be a real property, and this piece has no authorisation to
 * show one. It is illustrated at street level for the reason the lesson of
 * 14 August gives — a plot seen from above reads as a shape floating in the
 * sky, and nobody knows what it is.
 */
export const EmThumb: React.FC<{
  size?: number;
  height?: number;
  /** Kept as `tint` so callers do not have to change; it picks the palette. */
  tint?: number;
  kind?: PropertyKind;
  progress?: number;
}> = ({size = 168, height, tint = 0, kind = 'land', progress = 0}) => (
  <span
    style={{
      width: size,
      height: height ?? Math.round(size * 0.67),
      flex: 'none',
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      border: `2px solid ${em.lineSubtle}`,
      background: em.surface,
      display: 'block',
    }}
  >
    <PropertyArt kind={kind} variant={tint} progress={progress} />
  </span>
);

/**
 * One row of a living ranking, laid out as `LiveRankingPage.tsx` lays it out.
 *
 * Badge and thumbnail in a column on the left; title and measure on one
 * baseline with the measure pushed right in tabular figures; the meta line
 * under it; the reason pill under that; and the two text actions at the foot.
 */
export const EmRankRow: React.FC<{
  place: number;
  title: string;
  measure: string;
  address: string;
  area?: string;
  perM2?: string;
  reason?: string;
  reasonEnter?: number;
  actions?: boolean;
  enter?: number;
  raised?: boolean;
  width: number;
  /** Which illustration this row draws. Defaults to its own position, so a
      list never shows the same picture twice by omission. */
  tint?: number;
  /** What is being sold, so the drawing is of that. */
  kind?: PropertyKind;
  /** Dims the measure when the current recipe does not sort by it. */
  measureLive?: boolean;
}> = ({
  place,
  title,
  measure,
  address,
  area,
  perM2,
  reason,
  reasonEnter = 1,
  actions = true,
  enter = 1,
  raised = false,
  width,
  tint,
  kind = 'land',
  measureLive = true,
}) => (
  <EmCard
    width={width}
    raised={raised}
    style={{
      padding: '26px 28px',
      opacity: Math.min(1, enter * 1.5),
      transform: `translateY(${(1 - enter) * 24}px)`,
    }}
  >
    <div style={{display: 'flex', gap: 22, alignItems: 'flex-start'}}>
      <EmRank place={place} />
      <EmThumb size={208} height={96} tint={tint ?? place} kind={kind} />
      <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10}}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20}}>
          <span
            style={{
              fontSize: emType.body,
              fontWeight: 700,
              color: em.text,
              lineHeight: 1.18,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: emType.price,
              fontWeight: 900,
              flex: 'none',
              ...figures,
              color: measureLive ? em.primaryStrong : em.textMuted,
            }}
          >
            {measure}
          </span>
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px'}}>
          <EmMeta icon="pin" text={address} />
          {area ? <EmMeta icon="ruler" text={area} /> : null}
          {perM2 ? <EmMeta icon="tag" text={perM2} /> : null}
        </div>
        {reason ? <EmReason text={reason} enter={reasonEnter} /> : null}
        {actions ? (
          <div style={{display: 'flex', gap: 26, marginTop: 2}}>
            <span style={{fontSize: emType.meta, fontWeight: 600, color: em.primaryStrong}}>Ver ficha completa</span>
            <span style={{fontSize: emType.meta, fontWeight: 600, color: em.primaryStrong}}>Ver en el mapa</span>
          </div>
        ) : null}
      </div>
    </div>
  </EmCard>
);
