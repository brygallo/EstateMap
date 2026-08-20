import React from 'react';
import {BrandTokens, beat, figures, glide, land} from './system-kit';
import {palette} from './theme';

/**
 * Interface drawn the way an interface is actually built.
 *
 * These pieces sell software, so the software on screen is the portfolio: a
 * viewer who builds products reads spacing, alignment, states and touch targets
 * before they read the claim. A composition that improvises rectangles is
 * telling them what the supplier's work looks like, and no script recovers
 * from that.
 *
 * So the interface rules live here as code instead of as advice. A scene asks
 * for a window, a rail, a row in a state; it gets the spacing scale, the type
 * scale, the elevation, the minimum target size and the requirement that a
 * state is never signalled by colour alone. What a scene still decides is what
 * the product is doing and why — the part no kit can know.
 *
 * Nothing here may invent a capability. These are the shapes of a product; the
 * words inside them come from the plan, which is what `verification_notes` is
 * for.
 */

/* ------------------------------------------------------------------ *
 * The rules, as numbers
 * ------------------------------------------------------------------ */

/** Every gap, padding and offset is a multiple of this. */
const UNIT = 8;

export const ui = {
  /** `ui.space(3)` is 24 px. Arbitrary gaps are how a layout stops aligning. */
  space: (steps: number) => steps * UNIT,
  radius: {row: 14, card: 22, window: 30, pill: 999},
  /**
   * The smallest thing a finger can hit, at canvas scale.
   *
   * 44 CSS px is the accepted floor on a phone; the canvas is roughly twice a
   * phone's logical width, so a control drawn smaller than this is showing an
   * interface nobody could use.
   */
  touch: 88,
  /**
   * Type sizes, largest first. The floor matches the review's own text gate:
   * anything under it does not survive the platform's re-encode.
   */
  type: {display: 56, title: 40, body: 30, label: 26, micro: 22},
  /** Depth as a single scale, so two cards on one plane cast the same shadow. */
  elevation: (level: number) =>
    `0 ${level * 10}px ${level * 26}px rgba(0,0,0,.${Math.min(9, 2 + level * 2)}), inset 0 2px 0 rgba(255,255,255,.14)`,
} as const;

/* ------------------------------------------------------------------ *
 * States
 * ------------------------------------------------------------------ */

export type RowState = 'idle' | 'working' | 'done' | 'blocked';

/**
 * What a state looks like, and it is never only a colour.
 *
 * Colour-blind viewers, a phone in sunlight and the platform's compression all
 * take the same thing away first. Every state therefore carries a shape and a
 * word as well, which is also why these live in one place: a scene that invents
 * its own green tick invents its own accessibility failure.
 */
const stateStyles = (tokens: BrandTokens): Record<RowState, {color: string; glyph: string; label: string}> => ({
  idle: {color: 'rgba(255,255,255,.34)', glyph: '·', label: 'En espera'},
  working: {color: tokens.alert, glyph: '◐', label: 'En curso'},
  done: {color: tokens.confirm, glyph: '✓', label: 'Listo'},
  blocked: {color: '#F87171', glyph: '!', label: 'Detenido'},
});

/* ------------------------------------------------------------------ *
 * Surfaces
 * ------------------------------------------------------------------ */

/**
 * A window of the product: chrome, a name, and a body that is not the chrome.
 *
 * The controls are neutral dots rather than any platform's own: this is a
 * drawing of software, and borrowing a vendor's window furniture would be
 * quoting a brand the piece does not carry.
 */
export const AppWindow: React.FC<{
  tokens: BrandTokens;
  title: string;
  /** The second line of the title bar: where the viewer is inside the product. */
  breadcrumb?: string;
  width: number;
  height: number;
  /** 0 → 1: the window assembling. Drives the chrome before the content. */
  enter?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({tokens, title, breadcrumb, width, height, enter = 1, style, children}) => (
  <div
    style={{
      position: 'absolute',
      width,
      height,
      boxSizing: 'border-box',
      borderRadius: ui.radius.window,
      overflow: 'hidden',
      background: 'linear-gradient(160deg, rgba(28,27,58,.98), rgba(10,11,26,.99))',
      border: `2px solid ${tokens.soft}3D`,
      boxShadow: ui.elevation(4),
      opacity: Math.min(1, enter * 1.6),
      transform: `scale(${0.94 + Math.min(1, enter) * 0.06})`,
      ...style,
    }}
  >
    <div
      style={{
        height: ui.space(9),
        display: 'flex',
        alignItems: 'center',
        gap: ui.space(2),
        padding: `0 ${ui.space(3)}px`,
        borderBottom: `2px solid ${tokens.soft}26`,
        background: 'rgba(255,255,255,.045)',
      }}
    >
      <div style={{display: 'flex', gap: ui.space(1)}}>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            style={{
              width: 12,
              height: 12,
              borderRadius: ui.radius.pill,
              background: 'rgba(255,255,255,.24)',
            }}
          />
        ))}
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div
          style={{
            fontSize: ui.type.label,
            fontWeight: 800,
            color: palette.white,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
      </div>
      {breadcrumb ? (
        <div style={{fontSize: ui.type.micro, fontWeight: 700, color: tokens.soft, whiteSpace: 'nowrap'}}>
          {breadcrumb}
        </div>
      ) : null}
    </div>
    <div style={{position: 'relative', height: `calc(100% - ${ui.space(9)}px)`}}>{children}</div>
  </div>
);

/**
 * The navigation rail, with exactly one active destination.
 *
 * Two highlighted items is not a style choice, it is a product that cannot say
 * where you are, so the active item is an index rather than a flag per row.
 */
export const NavRail: React.FC<{
  tokens: BrandTokens;
  items: string[];
  active: number;
  width?: number;
  /** 0 → 1 across the rail's own arrival, so its items land in order. */
  enter?: number;
}> = ({tokens, items, active, width = 232, enter = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width,
      padding: ui.space(2),
      boxSizing: 'border-box',
      borderRight: `2px solid ${tokens.soft}1F`,
      background: 'rgba(0,0,0,.22)',
      // The rail arrives as a rail and then fills. Fading four items in on a
      // surface that was already there is not an event; a column sliding into
      // place is, and it is also how navigation actually appears in a product.
      transform: `translateX(${(1 - glide(enter, 0, 0.34)) * -width}px)`,
    }}
  >
    {items.map((item, index) => {
      const arrived = land(enter, index * 0.08, index * 0.08 + 0.34);
      const selected = index === active;
      return (
        <div
          key={item}
          style={{
            height: ui.touch * 0.62,
            marginBottom: ui.space(1),
            paddingLeft: ui.space(2),
            display: 'flex',
            alignItems: 'center',
            gap: ui.space(1.5),
            borderRadius: ui.radius.row,
            background: selected ? `${tokens.accent}2E` : 'transparent',
            boxShadow: selected ? `inset 3px 0 0 ${tokens.accent}` : 'none',
            color: selected ? palette.white : 'rgba(255,255,255,.58)',
            fontSize: ui.type.micro,
            fontWeight: 800,
            opacity: arrived,
            transform: `translateX(${(1 - arrived) * -18}px)`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: selected ? tokens.accent : 'rgba(255,255,255,.3)',
            }}
          />
          {item}
        </div>
      );
    })}
  </div>
);

/**
 * One line of a list: what it is, what it says, and what state it is in.
 *
 * The meta column uses tabular figures so a value that changes does not make
 * the rest of the row shift — the cheapest tell that an interface was drawn
 * rather than built.
 */
export const Row: React.FC<{
  tokens: BrandTokens;
  label: string;
  meta?: string;
  state?: RowState;
  /** 0 → 1 across this row's own arrival. */
  enter?: number;
  width?: number | string;
}> = ({tokens, label, meta, state = 'idle', enter = 1, width = '100%'}) => {
  const look = stateStyles(tokens)[state];
  return (
    <div
      style={{
        width,
        height: ui.touch * 0.72,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: ui.space(2),
        padding: `0 ${ui.space(2)}px`,
        marginBottom: ui.space(1.5),
        borderRadius: ui.radius.row,
        background: 'rgba(255,255,255,.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1)',
        opacity: Math.min(1, enter * 1.4),
        transform: `translateY(${(1 - Math.min(1, enter)) * 14}px)`,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: ui.radius.pill,
          display: 'grid',
          placeItems: 'center',
          fontSize: 20,
          fontWeight: 800,
          color: state === 'idle' ? look.color : palette.ink,
          background: state === 'idle' ? 'rgba(255,255,255,.12)' : look.color,
          boxShadow: state === 'idle' ? 'none' : `0 0 16px ${look.color}`,
        }}
      >
        {look.glyph}
      </span>
      <span style={{flex: 1, fontSize: ui.type.label, fontWeight: 700, color: palette.white}}>{label}</span>
      {meta ? (
        <span style={{fontSize: ui.type.micro, fontWeight: 700, color: look.color, ...figures}}>{meta}</span>
      ) : null}
    </div>
  );
};

/** A short, high-contrast statement of state. Never the only signal. */
export const Pill: React.FC<{tokens: BrandTokens; text: string; tone?: 'accent' | 'confirm' | 'neutral'}> = ({
  tokens,
  text,
  tone = 'neutral',
}) => {
  const background =
    tone === 'accent' ? tokens.accent : tone === 'confirm' ? tokens.confirm : 'rgba(255,255,255,.14)';
  return (
    <span
      style={{
        padding: `${ui.space(1)}px ${ui.space(2)}px`,
        borderRadius: ui.radius.pill,
        background,
        color: tone === 'neutral' ? palette.white : palette.ink,
        fontSize: ui.type.micro,
        fontWeight: 800,
        letterSpacing: '.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
};

/**
 * A pointer that arrives before it acts and leaves after the feedback.
 *
 * An indicator that is simply present, or that vanishes on the frame it
 * touches, shows a result without showing a cause — which is the difference
 * between demonstrating a product and asserting one.
 */
export const Cursor: React.FC<{
  progress: number;
  from: {x: number; y: number};
  to: {x: number; y: number};
  /** When the contact happens, as a fraction of the scene's arc. */
  at: number;
  color: string;
  travel?: number;
}> = ({progress, from, to, at, color, travel = 0.18}) => {
  const approach = glide(progress, at - travel, at);
  const visible = beat(progress, at - travel - 0.05, at - travel) * (1 - beat(progress, at + 0.12, at + 0.2));
  if (visible <= 0) return null;
  const press = Math.sin(beat(progress, at, at + 0.08) * Math.PI);
  return (
    <div
      style={{
        position: 'absolute',
        left: from.x + (to.x - from.x) * approach,
        top: from.y + (to.y - from.y) * approach,
        width: 44,
        height: 44,
        marginLeft: -22,
        marginTop: -22,
        borderRadius: ui.radius.pill,
        border: `3px solid ${color}`,
        background: `${color}3D`,
        opacity: visible,
        transform: `scale(${1 - press * 0.24})`,
        boxShadow: `0 0 ${18 + press * 26}px ${color}`,
      }}
    />
  );
};
