import React from 'react';
import {figures} from './system-kit';
import {font} from './theme';

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
      whiteSpace: 'nowrap',
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
export const EmArrow: React.FC<{color?: string; size?: number}> = ({color = em.primaryStrong, size = 22}) => (
  <span
    style={{
      width: size,
      height: size,
      flex: 'none',
      position: 'relative',
      display: 'inline-block',
    }}
  >
    <span style={{position: 'absolute', left: 0, top: size / 2 - 1.5, width: size, height: 3, background: color, borderRadius: 2}} />
    <span
      style={{
        position: 'absolute',
        right: 1,
        top: size / 2 - size * 0.3,
        width: size * 0.55,
        height: size * 0.55,
        borderTop: `3px solid ${color}`,
        borderRight: `3px solid ${color}`,
        transform: 'rotate(45deg)',
      }}
    />
  </span>
);

/**
 * A meta item of the row: the little green glyph and its value.
 *
 * The product uses lucide icons at 16 px — a pin for the address, a ruler for
 * the area. Drawn rather than imported so the piece carries no dependency the
 * renderer would have to resolve, but the shape, the weight and the green are
 * the product's.
 */
export const EmMeta: React.FC<{icon: 'pin' | 'ruler' | 'tag'; text: string}> = ({icon, text}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: emType.meta, fontWeight: 400, color: em.textSecondary}}>
    <EmGlyph icon={icon} />
    {text}
  </span>
);

export const EmGlyph: React.FC<{icon: 'pin' | 'ruler' | 'tag'; size?: number}> = ({icon, size = 24}) => {
  if (icon === 'pin') {
    return (
      <span style={{width: size, height: size, flex: 'none', position: 'relative', display: 'inline-block'}}>
        <span
          style={{
            position: 'absolute',
            left: size * 0.16,
            top: 0,
            width: size * 0.68,
            height: size * 0.68,
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            border: `3px solid ${em.primary}`,
          }}
        />
      </span>
    );
  }
  if (icon === 'ruler') {
    return (
      <span style={{width: size, height: size, flex: 'none', position: 'relative', display: 'inline-block'}}>
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: size * 0.28,
            width: size,
            height: size * 0.44,
            border: `3px solid ${em.primary}`,
            borderRadius: 3,
          }}
        />
        {[0.34, 0.52, 0.7].map((at) => (
          <span
            key={at}
            style={{position: 'absolute', left: size * at, top: size * 0.28, width: 3, height: size * 0.18, background: em.primary}}
          />
        ))}
      </span>
    );
  }
  return (
    <span style={{width: size, height: size, flex: 'none', position: 'relative', display: 'inline-block'}}>
      <span
        style={{
          position: 'absolute',
          inset: size * 0.12,
          border: `3px solid ${em.primary}`,
          borderRadius: 4,
          transform: 'rotate(45deg)',
        }}
      />
    </span>
  );
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
export const EmThumb: React.FC<{size?: number; height?: number; tint?: number}> = ({
  size = 168,
  height,
  tint = 0,
}) => {
  const h = height ?? Math.round(size * 0.67);
  const sky = ['#D7E9F8', '#DFF0FA', '#D2E5F6'][tint % 3];
  const wallA = ['#F0E3D2', '#EDE2DA', '#F2E9DA'][tint % 3];
  const wallB = ['#E5D7C6', '#E2D6CE', '#E8DECE'][tint % 3];
  const roof = ['#2F3B52', '#3B3346', '#27384A'][tint % 3];
  const houseW = size * 0.26;
  const houseH = h * 0.42;
  const groundTop = h * 0.58;
  return (
    <span
      style={{
        width: size,
        height: h,
        flex: 'none',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(180deg, ${sky} 0%, #F2F7FC 58%)`,
        border: `2px solid ${em.lineSubtle}`,
      }}
    >
      {/* Sun. */}
      <span
        style={{
          position: 'absolute',
          right: size * 0.1,
          top: h * 0.1,
          width: size * 0.13,
          height: size * 0.13,
          borderRadius: '50%',
          background: '#FBE39B',
        }}
      />
      {/* The two neighbours the empty lot sits between. */}
      {[
        {x: -size * 0.02, wall: wallA},
        {x: size * 0.76, wall: wallB},
      ].map((house, i) => (
        <span key={i}>
          <span
            style={{
              position: 'absolute',
              left: house.x,
              top: groundTop - houseH,
              width: houseW,
              height: houseH,
              background: house.wall,
            }}
          />
          {/* Roof: a real pitch, so it reads as a house and not as a block. */}
          <span
            style={{
              position: 'absolute',
              left: house.x - houseW * 0.12,
              top: groundTop - houseH - h * 0.16,
              width: 0,
              height: 0,
              borderLeft: `${(houseW * 1.24) / 2}px solid transparent`,
              borderRight: `${(houseW * 1.24) / 2}px solid transparent`,
              borderBottom: `${h * 0.16}px solid ${roof}`,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: house.x + houseW * 0.28,
              top: groundTop - houseH * 0.62,
              width: houseW * 0.44,
              height: houseH * 0.34,
              background: sky,
            }}
          />
        </span>
      ))}
      {/* The lot: grass, and a fence along the front. */}
      <span style={{position: 'absolute', left: 0, right: 0, top: groundTop, bottom: 0, background: '#E9EEF3'}} />
      <span
        style={{
          position: 'absolute',
          left: size * 0.26,
          width: size * 0.48,
          top: groundTop - h * 0.16,
          height: h * 0.28,
          background: '#CDE9D3',
        }}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span
          key={`post-${i}`}
          style={{
            position: 'absolute',
            left: size * (0.26 + i * 0.096),
            top: groundTop - h * 0.02,
            width: 3,
            height: h * 0.13,
            background: em.primary,
          }}
        />
      ))}
      <span
        style={{
          position: 'absolute',
          left: size * 0.26,
          width: size * 0.48,
          top: groundTop + h * 0.02,
          height: 3,
          background: em.primary,
        }}
      />
      {/* The road in front. */}
      <span style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.2, background: '#C4CED8'}} />
      <span
        style={{position: 'absolute', left: size * 0.08, right: size * 0.08, bottom: h * 0.09, height: 3, background: '#EEF2F6'}}
      />
    </span>
  );
};

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
  /** Which of the three illustrations this row shows. */
  tint?: number;
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
  tint = 0,
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
      <EmThumb size={182} height={140} tint={tint} />
      <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10}}>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20}}>
          <span
            style={{
              fontSize: emType.body,
              fontWeight: 700,
              color: em.text,
              lineHeight: 1.18,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
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
