import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {font, palette, sideCrop, textFloor} from './theme';
import {AentsContactSim, AentsIdeaSim, AentsProcessSim, AentsRevealSim, AentsServicesSim, AentsWorkflowSim} from './aents-simulations';
import {
  AentsWebBeforeAfterSim,
  AentsWebClosingSim,
  AentsWebContrastSim,
  AentsWebCredibilitySim,
  AentsWebDatedSim,
  AentsWebFunnelSim,
  AentsWebRebootSim,
  AentsWebRebuildSim,
  AentsWebRequestSim,
  AentsWebResponsiveSim,
  AentsWebSearchSim,
  AentsWebSlowSim,
} from './aents-web-simulations';
import {
  AentsArchitectureSim,
  AentsAutomationSim,
  AentsGrowthSim,
  AentsOverloadSim,
  AentsPanelSim,
  AentsPositioningSim,
  AentsScaleSim,
  AentsSignOffSim,
  AentsTurnSim,
} from './aents-brand-simulations';
import {
  AentsCustomFitSim,
  AentsDisconnectedSim,
  AentsProblemToSoftwareSim,
  AentsScatteredSim,
  AentsSolutionsSim,
  AentsStagesSim,
  AentsUnderstandSim,
} from './aents-system-simulations';
import {
  GeoNoPromotedSim,
  GeoOrderedPageSim,
  GeoRankingHookSim,
  GeoReasonSim,
  GeoRecipeSim,
} from './geo-ranking-simulations';
import {GeoLocationHeroSim, GeoNearbyContextSim, GeoPropertyDetailSim} from './geo-intro-simulations';
import {
  CredicasaApplicantsASim,
  CredicasaApplicantsBSim,
  CredicasaCapacitySim,
  CredicasaEntryExampleSim,
  CredicasaFactCardSim,
  CredicasaHeroSim,
  CredicasaHomeGateSim,
  CredicasaOrderASim,
  CredicasaOrderBSim,
  CredicasaPaymentExampleSim,
  CredicasaRateResetSim,
  CredicasaReservationSim,
  CredicasaThreeNumbersSim,
  CredicasaTotalEnvelopeSim,
} from './credicasa-simulations';
import {
  AentsBounceSim,
  AentsQuerySim,
  AentsRebuildSim,
  AentsSlowSiteSim,
  AentsWebProofSim,
} from './aents-buscador-simulations';
import {
  AentsSeoAnswerSim,
  AentsSeoDataSim,
  AentsSeoEntitySim,
  AentsSeoFoundSim,
  AentsSeoIntentSim,
  AentsSeoNetworkSim,
  AentsSeoNoTrickSim,
  AentsSeoReadableSim,
  AentsSeoSignalsSim,
  AentsSeoUnderstandSim,
} from './aents-seo-simulations';
import {
  AentsMobileCardsSim,
  AentsMobileFitsSim,
  AentsMobileGesturesSim,
  AentsMobilePortalDesktopSim,
  AentsMobilePortalPhoneSim,
  AentsMobileQuestionSim,
  AentsMobileShrinkSim,
  AentsMobileSymptomsSim,
  AentsMobileTouchSim,
  AentsMobileTwoPathsSim,
  AentsMobileUpwardSim,
  AentsMobileUseItSim,
  AentsMobileWeightSim,
} from './aents-mobile-simulations';
import {
  AentsAiClosingSim,
  AentsAiContextSim,
  AentsAiDependenciesSim,
  AentsAiGitSim,
  AentsAiHappyPathSim,
  AentsAiJudgementSim,
  AentsAiOrderSim,
  AentsAiPartsSim,
  AentsAiReviewSim,
  AentsAiRulesSim,
  AentsAiSecretsSim,
  AentsAiSecuritySim,
  AentsAiTestsSim,
  AentsAiWorksSim,
} from './aents-ia-simulations';

/**
 * Animated recreations of the product.
 *
 * These replace screen recordings as the main visual. A recording of a live
 * site repaints when the browser feels like it and forces a camera that cannot
 * move; here every frame is drawn on purpose, so the motion is continuous and
 * the lower quarter of the frame can be kept clear for the words.
 *
 * They are illustrations, not imitations: flat brand shapes with real product
 * labels. The factory must never present one as a screenshot.
 */

const ease = (frame: number, from: number, to: number, a: number, b: number) =>
  interpolate(frame, [from, to], [a, b], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/**
 * A move that uses the whole interval it was given.
 *
 * `ease` is the series' gesture curve: it spends four fifths of its distance in
 * the first fifth of its time, which is right for a chip settling and wrong for
 * anything that has to last. A nine-second crane written with it lands in two
 * seconds and leaves seven standing still, and the same curve driving a stagger
 * fires every element of the group almost at once. `ramp` keeps its speed —
 * soft ends, even middle — so a long travel, a tour or a sequence of arrivals
 * actually occupies the time the scene gives it.
 */
const ramp = (value: number, from: number, to: number, a: number, b: number) =>
  interpolate(value, [from, to], [a, b], {
    easing: Easing.bezier(0.35, 0.12, 0.28, 0.92),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Everything below this line stays empty so the captions never cover content. */
const CLEAR = 940;

const BLOCKS: Array<[number, number, number, number]> = [];
for (let row = 0; row < 14; row += 1) {
  for (let column = 0; column < 8; column += 1) {
    const x = -180 + column * 175 + ((row % 2) * 28);
    const y = -180 + row * 165 + ((column % 3) * 22);
    BLOCKS.push([x, y, 128 + ((row * 7 + column * 11) % 40), 104 + ((row * 5 + column * 13) % 44)]);
  }
}

const Grid: React.FC<{opacity: number}> = ({opacity}) => (
  <g opacity={opacity}>
    <rect x={-400} y={-400} width={1880} height={2720} fill="#E7ECF4" />
    {BLOCKS.map(([x, y, width, height], index) => (
      <rect key={index} x={x} y={y} width={width} height={height} rx={10} fill="#F4F7FB" stroke="#DDE4EF" strokeWidth={3} />
    ))}
    <path d="M-200 600 C220 520 420 700 720 620 S1080 520 1400 580 L1400 760 C1080 700 780 800 720 800 S220 700 -200 780 Z" fill="#DEEAE3" />
    <g stroke="#D2DAE8" fill="none" strokeLinecap="round">
      <path d="M-200 520 H1400" strokeWidth={30} />
      <path d="M-200 1020 H1400" strokeWidth={22} />
      <path d="M-200 1460 H1400" strokeWidth={18} />
      <path d="M300 -200 V2200" strokeWidth={28} />
      <path d="M760 -200 V2200" strokeWidth={20} />
    </g>
    <path d="M120 -200 C200 300 60 700 200 1100 S120 1700 260 2200" stroke="#C6D8E8" strokeWidth={26} fill="none" />
  </g>
);

/**
 * A cluster on the map.
 *
 * `count` is optional and city bubbles go without it. The real map does show a
 * total per cluster, but it changes every day and a video does not: the numbers
 * that used to be painted here — 8719 in Quito, 3779 in Guayaquil — came from
 * nowhere and stayed frozen in the piece for ever, which is exactly the kind of
 * figure the brief forbids inventing.
 */
const Bubble: React.FC<{x: number; y: number; size: number; label: string; count?: string; accent: string; pop: number}> = ({
  x,
  y,
  size,
  label,
  count,
  accent,
  pop,
}) => (
  <g transform={`translate(${x} ${y}) scale(${pop})`} opacity={pop}>
    <circle r={size * 1.35} fill={accent} opacity={0.14} />
    <circle r={size} fill={accent} />
    <circle r={size} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.85} />
    {count ? (
      <>
        <text
          textAnchor="middle"
          y={label ? -size * 0.06 : size * 0.2}
          fill="#FFFFFF"
          fontFamily={font}
          fontWeight={800}
          fontSize={size * (label ? 0.5 : 0.62)}
        >
          {count}
        </text>
        {label ? (
          <text textAnchor="middle" y={size * 0.46} fill="#FFFFFF" fontFamily={font} fontWeight={800} fontSize={size * 0.24} opacity={0.9}>
            {label}
          </text>
        ) : null}
      </>
    ) : (
      // A name has to fit the circle, and a circle is narrower than its
      // diameter at the height of the text. "Cumbayá" and "Conocoto" spilled
      // out of the bubble at the old fixed size, which was set for four digits.
      <text
        textAnchor="middle"
        y={size * 0.16}
        fill="#FFFFFF"
        fontFamily={font}
        fontWeight={800}
        fontSize={Math.min(size * 0.42, (size * 1.6) / Math.max(1, label.length * 0.58))}
      >
        {label}
      </text>
    )}
  </g>
);

/**
 * Country to neighbourhood in one continuous camera move: the national bubbles
 * give way to city bubbles, then to individual homes with their price.
 */
export const MapSim: React.FC<{frame: number; total: number; accent: string}> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  // The whole approach — country, city, houses — is stretched over however long
  // the map is on screen, so four scenes read as one continuous camera move.
  const ARC = 5.6;
  const t = (frame / Math.max(1, total)) * ARC;
  // The camera is the viewBox, not a CSS transform: that way the target stays
  // framed instead of being pushed out of shot as the zoom grows, and the
  // action sits in the upper part where nothing covers it.
  const zoom = interpolate(t, [0, 1.2, 3.0, 5.4], [1, 1.15, 2.6, 3.4], {
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const centreX = ease(t, 0.9, 3.4, 540, 320);
  const centreY = ease(t, 0.9, 3.4, 620, 440);
  const width = 1080 / zoom;
  const height = 1920 / zoom;
  const viewBox = `${centreX - width / 2} ${centreY - height * 0.36} ${width} ${height}`;
  const marker = 1 / zoom;
  const detail = 4.6;
  const country = interpolate(t, [0, 0.4, 2.0, 2.7], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
  const city = interpolate(t, [1.7, 2.5, 3.8, 4.4], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const homes = interpolate(t, [4.0, 4.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7'}}>
      <AbsoluteFill>
        <svg width="1080" height="1920" viewBox={viewBox}>
          <path d="M-200 1180 C160 1100 420 1260 700 1180 S1020 1060 1280 1120 L1280 2320 L-200 2320 Z" fill="#DCE8E1" />
          <Grid opacity={0.9} />
          {country > 0.01
            ? [
                {x: 300, y: 430, size: 104, label: 'Quito'},
                {x: 660, y: 250, size: 58, label: 'Ibarra'},
                {x: 230, y: 830, size: 78, label: 'Guayaquil'},
                {x: 640, y: 880, size: 56, label: 'Cuenca'},
                {x: 520, y: 620, size: 48, label: 'Ambato'},
              ].map((bubble, index) => (
                <Bubble
                  key={bubble.label}
                  {...bubble}
                  size={bubble.size * marker}
                  accent={accent}
                  pop={country * spring({frame: frame - index * 4, fps, config: {damping: 14}})}
                />
              ))
            : null}
          {city > 0.01
            ? [
                {x: 300, y: 420, size: 46, label: 'Cumbayá'},
                {x: 218, y: 350, size: 38, label: 'Nayón'},
                {x: 372, y: 352, size: 32, label: 'Tumbaco'},
                {x: 250, y: 500, size: 30, label: 'Conocoto'},
                {x: 386, y: 470, size: 26, label: 'Calderón'},
              ].map((bubble, index) => (
                <Bubble
                  key={`${bubble.label}-${index}`}
                  {...bubble}
                  size={bubble.size * marker * 1.9}
                  accent={accent}
                  pop={city * spring({frame: frame - fps * 1.7 - index * 3, fps, config: {damping: 14}})}
                />
              ))
            : null}
          {homes > 0.01
            ? [
                {x: 286, y: 396, price: '$122k'},
                {x: 372, y: 452, price: '$230k'},
                {x: 240, y: 476, price: '$85k'},
                {x: 356, y: 356, price: '$1.2M'},
              ].map((pin, index) => {
                const pop = homes * spring({frame: frame - fps * 4.0 - index * 4, fps, config: {damping: 13}});
                return (
                  <g key={pin.price} transform={`translate(${pin.x} ${pin.y}) scale(${pop * marker * 2.5})`} opacity={pop}>
                    <rect x={-52} y={-30} width={104} height={44} rx={22} fill="#FFFFFF" stroke={accent} strokeWidth={4} />
                    <text textAnchor="middle" y={2} fill={palette.ink} fontFamily={font} fontWeight={800} fontSize={26}>
                      {pin.price}
                    </text>
                    <path d="M0 14 L10 30 L-10 30 Z" fill={accent} />
                  </g>
                );
              })
            : null}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          top: CLEAR,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The full listing: photo, price, where it is, the numbers that matter, and the
 * public price check against the rest of the zone. Everything lands in order so
 * the eye has something new every few frames.
 */
const ListingGalleryArt: React.FC<{shot: number; frame: number; accent: string}> = ({shot, frame, accent}) => {
  const variant = (shot - 1) % 3;
  const drift = Math.sin(frame / 18) * 7;
  if (variant === 2) {
    return (
      <svg width="100%" height="100%" viewBox="0 0 916 300" preserveAspectRatio="xMidYMid slice">
        <rect width="916" height="300" fill="#E8DFD3" />
        <rect x="0" y="0" width="916" height="64" fill="#F7F2EB" />
        <rect x="72" y="58" width="360" height="190" rx="8" fill="#C9E2EA" />
        <path d="M252 58 V248 M72 154 H432" stroke="#FFFFFF" strokeWidth="10" />
        <rect x="520" y="116" width="250" height="102" rx="18" fill="#AF7D63" />
        <rect x="548" y="90" width="192" height="58" rx="18" fill="#C9977A" />
        <ellipse cx="646" cy="244" rx="178" ry="30" fill="#C9B9A5" />
        <rect x="454" y="46" width="18" height="202" rx="9" fill="#48614D" />
        <circle cx="463" cy="52" r="56" fill="#6E9875" />
        <circle cx="496" cy="78" r="38" fill="#80A884" />
        <rect x="790" y="48" width="76" height="176" rx="6" fill="#FFFFFF" opacity="0.78" />
      </svg>
    );
  }
  return (
    <svg width="100%" height="100%" viewBox="0 0 916 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`gallery-sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={variant === 0 ? '#B9DFF1' : '#F2D6C5'} />
          <stop offset="1" stopColor="#F7F9FC" />
        </linearGradient>
        <linearGradient id={`gallery-glass-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D7F0F7" />
          <stop offset="1" stopColor="#668AA0" />
        </linearGradient>
      </defs>
      <rect width="916" height="300" fill={`url(#gallery-sky-${variant})`} />
      <circle cx={760 + drift} cy="56" r="34" fill="#FFF3C7" />
      <rect x="0" y="226" width="916" height="74" fill="#6F9E7D" />
      <g transform={`translate(${drift} 0)`}>
        <rect x="132" y="72" width="650" height="190" rx="8" fill={variant === 0 ? '#F2EEE7' : '#EAE3DB'} />
        <rect x="112" y="54" width="694" height="30" rx="5" fill={variant === 0 ? '#26394A' : '#754A3B'} />
        <rect x="160" y="88" width="280" height="88" rx="4" fill={`url(#gallery-glass-${variant})`} />
        <path d="M300 88 V176" stroke="rgba(255,255,255,.78)" strokeWidth="8" />
        <rect x="472" y="102" width="256" height="120" rx="5" fill={`url(#gallery-glass-${variant})`} />
        <path d="M600 102 V222" stroke="rgba(255,255,255,.75)" strokeWidth="8" />
        <rect x="340" y="184" width="104" height="78" rx="4" fill={variant === 0 ? '#A97555' : '#8C5943'} />
        <rect x="132" y="176" width="180" height="86" fill={variant === 0 ? '#D5C2AA' : '#CDB6A5'} />
        <path d="M146 262 H772" stroke="#E7EBEE" strokeWidth="14" strokeLinecap="round" />
        <rect x="186" y="238" width="112" height="18" rx="9" fill="#66B7C8" opacity="0.9" />
        <g fill="#3F7D55"><circle cx="98" cy="216" r="38"/><circle cx="828" cy="214" r="42"/></g>
        <g fill="#8FC29A"><circle cx="70" cy="232" r="24"/><circle cx="862" cy="230" r="26"/></g>
      </g>
      <rect x="0" y="270" width="916" height="30" fill="#6D7885" />
      <path d="M20 282 H220 M270 282 H470 M520 282 H720 M770 282 H896" stroke="#DDE3E8" strokeWidth="5" strokeLinecap="round" />
      <rect x="0" y="0" width="12" height="300" fill={accent} opacity="0.72" />
    </svg>
  );
};

/** The listing this card invents, so the figures live in one place. */
const EXAMPLE_CARD_PRICE = '$122.000';

export const CardSim: React.FC<{frame: number; total?: number; accent: string; photo?: string | null}> = ({
  frame,
  accent,
  photo,
}) => {
  const {fps} = useVideoConfig();
  const rise = spring({frame, fps, config: {damping: 16, mass: 0.8}});
  const t = frame / fps;
  // The gallery advances while the facts land, so the card is never still.
  const shot = Math.min(4, 1 + Math.floor(Math.max(0, t - 0.5) / 0.7));
  const shotClock = Math.max(0, t - 0.5) / 0.7;
  const shotPhase = shotClock >= 4 ? 1 : shotClock - Math.floor(shotClock);
  const galleryReveal = ease(shotPhase, 0, 0.28, 0, 1);
  const contact = spring({frame: frame - fps * 1.9, fps, config: {damping: 17}});
  const shape = interpolate(t, [1.5, 2.3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const stats: Array<[string, string]> = [
    ['400 m²', 'terreno'],
    ['10', 'habitaciones'],
    ['7', 'baños'],
  ];
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7'}}>
      {/* The gallery stops on the fourth photo on purpose, so after that the
          only thing keeping the shot alive is this move. At the house ease it
          was spent in the first second and a longer take — the bought voice is
          slower than the draft — held for three seconds; at a constant rate it
          carries the whole scene, however long the line turns out to be. */}
      <AbsoluteFill style={{transform: `scale(${interpolate(frame, [0, fps * 8], [1.02, 1.1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}) translateY(${interpolate(frame, [0, fps * 8], [0, -26], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`, transformOrigin: '50% 26%'}}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          <Grid opacity={0.5} />
        </svg>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: sideCrop,
          right: sideCrop,
          top: 92,
          borderRadius: 36,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 44px 100px rgba(8,9,21,.34)',
          border: '2px solid rgba(255,255,255,.88)',
          fontFamily: font,
          color: palette.ink,
          transform: `perspective(1200px) translateY(${interpolate(rise, [0, 1], [90, 0]) - interpolate(frame, [0, fps * 8], [0, 22], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px) rotateX(${(1 - rise) * 5}deg) scale(${0.97 + rise * 0.03 + interpolate(frame, [0, fps * 8], [0, 0.03], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})})`,
          opacity: rise,
        }}
      >
        <div style={{height: 300, position: 'relative', backgroundColor: '#0F1020'}}>
          {photo ? (
            <Img src={staticFile(photo)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          ) : (
            <div style={{width: '100%', height: '100%', opacity: galleryReveal, transform: `scale(${1.035 - galleryReveal * 0.035}) translateX(${(1 - galleryReveal) * 18}px)`}}>
              <ListingGalleryArt shot={shot} frame={frame} accent={accent} />
            </div>
          )}
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, background: 'linear-gradient(180deg, transparent, rgba(8,9,21,.42))'}} />
          <div style={{position: 'absolute', left: 24, top: 24, padding: '10px 22px', borderRadius: 99, backgroundColor: '#FFFFFF', fontSize: 26, fontWeight: 800}}>
            En venta
          </div>
          <div
            style={{
              position: 'absolute',
              right: 24,
              bottom: 24,
              padding: '10px 20px',
              borderRadius: 99,
              backgroundColor: 'rgba(8,9,21,.7)',
              color: '#FFFFFF',
              fontSize: 24,
              fontWeight: 800,
              opacity: ease(frame, fps * 0.9, fps * 1.2, 0, 1),
            }}
          >
            {shot} / 10 fotos
          </div>
          <div style={{position: 'absolute', left: '50%', bottom: 25, transform: 'translateX(-50%)', display: 'flex', gap: 8}}>
            {[1, 2, 3, 4].map((dot) => (
              <div key={dot} style={{width: dot === shot ? 28 : 8, height: 8, borderRadius: 99, backgroundColor: dot === shot ? '#FFFFFF' : 'rgba(255,255,255,.55)', boxShadow: dot === shot ? '0 0 12px rgba(255,255,255,.7)' : 'none'}} />
            ))}
          </div>
        </div>
        <div style={{padding: '30px 32px 34px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16}}>
            {/* Printed, not counted: a price that climbs from zero states a
                different figure in every frame but the last. And the badge is
                what licenses an invented price and area on screen at all. */}
            <div style={{fontSize: 62, fontWeight: 800, letterSpacing: '-0.04em', color: accent}}>
              {EXAMPLE_CARD_PRICE}
            </div>
            <div style={{padding: '7px 14px', borderRadius: 99, border: '2px solid #DDE4EF', fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#8A93AB'}}>
              EJEMPLO
            </div>
          </div>
          <div style={{marginTop: 6, fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em'}}>Casa en Cumbayá</div>
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 27,
              fontWeight: 700,
              color: '#5C6480',
              opacity: ease(frame, fps * 0.35, fps * 0.65, 0, 1),
            }}
          >
            <span style={{color: accent, fontSize: 30}}>◉</span> Cumbayá, Quito · ubicación en el mapa
          </div>
          <div style={{marginTop: 24, display: 'flex', gap: 12}}>
            {stats.map(([value, label], index) => {
              const appear = ease(frame, fps * (0.6 + index * 0.16), fps * (0.9 + index * 0.16), 0, 1);
              return (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    padding: '18px 14px',
                    borderRadius: 20,
                    backgroundColor: '#F2F5FA',
                    textAlign: 'center',
                    opacity: appear,
                    transform: `translateY(${(1 - appear) * 18}px)`,
                  }}
                >
                  <div style={{fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em'}}>{value}</div>
                  <div style={{marginTop: 4, fontSize: 22, fontWeight: 700, color: '#8A93AB'}}>{label}</div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 20px',
              borderRadius: 20,
              backgroundColor: '#F2F5FA',
              opacity: shape,
              transform: `translateY(${(1 - shape) * 16}px)`,
            }}
          >
            <svg width={74} height={64} viewBox="-34 -30 68 60">
              <path
                d="M-24 -18 L22 -18 L24 18 L-22 20 Z"
                fill={`${accent}33`}
                stroke={accent}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={shape}
              />
            </svg>
            <div>
              <div style={{fontSize: 27, fontWeight: 800}}>Forma del terreno</div>
              <div style={{marginTop: 2, fontSize: 22, fontWeight: 700, color: '#8A93AB'}}>dibujada por quien publica</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              padding: '18px 20px',
              borderRadius: 20,
              backgroundColor: '#EAF7EF',
              border: `2px solid ${accent}44`,
              opacity: ease(frame, fps * 1.25, fps * 1.6, 0, 1),
            }}
          >
            {/* This block used to print «La zona va de $511 a $905 · 2120
                comparables» and call the example «dentro del rango». Both
                figures were invented, they contradicted each other — $305 is
                not inside $511–$905 — and a range of zone prices is exactly the
                market claim the brief forbids without a dated source. What is
                left is arithmetic the viewer can redo: the example price
                divided by the declared area. */}
            <div style={{fontSize: 22, fontWeight: 800, color: '#4A5270', letterSpacing: '0.05em'}}>
              PRECIO POR METRO
            </div>
            <div style={{marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
              <span style={{fontSize: 38, fontWeight: 800}}>$305/m²</span>
              <span style={{fontSize: 25, fontWeight: 800, color: '#6B7391'}}>precio ÷ área</span>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              gap: 12,
              opacity: contact,
              transform: `translateY(${(1 - contact) * 20}px)`,
            }}
          >
            <div style={{flex: 1, padding: '18px 0', borderRadius: 18, border: '2px solid #DDE4EF', textAlign: 'center', fontSize: 27, fontWeight: 800}}>
              Llamar
            </div>
            <div style={{flex: 2, padding: '18px 0', borderRadius: 18, backgroundColor: '#128C4A', color: '#FFFFFF', textAlign: 'center', fontSize: 27, fontWeight: 800}}>
              WhatsApp
            </div>
          </div>
        </div>
      </div>
      <AbsoluteFill
        style={{
          top: CLEAR,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Price per square metre counting up against the range of its own zone. */
export const PriceSim: React.FC<{frame: number; total?: number; accent: string}> = ({frame, accent}) => {
  const {fps} = useVideoConfig();
  const value = Math.round(ease(frame, fps * 0.2, fps * 1.8, 0, 305));
  const bar = ease(frame, fps * 1.6, fps * 3.4, 0, 1);
  const marker = ease(frame, fps * 2.6, fps * 4.2, 0, 1);
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7', fontFamily: font, color: palette.ink}}>
      <AbsoluteFill style={{transform: `scale(${ease(frame / fps, 0, 6, 1.03, 1.09)})`, transformOrigin: '50% 34%'}}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          <rect x={-400} y={-400} width={1880} height={2720} fill="#E4EAF3" />
          <Grid opacity={0.45} />
        </svg>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 96, right: 96, top: 300}}>
        <div style={{fontSize: 30, fontWeight: 800, color: '#5C6480', letterSpacing: '0.06em'}}>PRECIO POR M²</div>
        <div style={{fontSize: 168, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 1, color: accent}}>
          ${value}
        </div>
        <div style={{marginTop: 46, fontSize: 30, fontWeight: 800, color: '#5C6480', letterSpacing: '0.06em'}}>
          RANGO HABITUAL DE LA ZONA
        </div>
        <div style={{marginTop: 22, height: 26, borderRadius: 99, backgroundColor: '#D7DEEA', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${bar * 100}%`, background: `linear-gradient(90deg, ${accent}55, ${accent})`}} />
        </div>
        <div style={{marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 800}}>
          <span>$511</span>
          <span>$905</span>
        </div>
        <div style={{marginTop: 34, opacity: marker, transform: `translateY(${(1 - marker) * 20}px)`}}>
          <span style={{display: 'inline-block', padding: '16px 28px', borderRadius: 20, backgroundColor: '#FFFFFF', fontSize: 32, fontWeight: 800, boxShadow: '0 18px 44px rgba(8,9,21,.18)'}}>
            2120 comparables en la zona
          </span>
        </div>
      </div>
      <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)'}} />
    </AbsoluteFill>
  );
};

/** The five steps of publishing, ticking off one after another. */
export const FormSim: React.FC<{frame: number; total?: number; accent: string}> = ({frame, accent}) => {
  const {fps} = useVideoConfig();
  const steps = ['Datos', 'Ubicación en el mapa', 'Características', 'Precio', 'Fotos'];
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7', fontFamily: font, color: palette.ink}}>
      <AbsoluteFill style={{transform: `scale(${ease(frame / fps, 0, 6, 1.02, 1.08)})`, transformOrigin: '50% 32%'}}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          <rect x={-400} y={-400} width={1880} height={2720} fill="#E4EAF3" />
          <Grid opacity={0.45} />
        </svg>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          top: 280,
          padding: '44px 40px',
          borderRadius: 34,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 40px 90px rgba(8,9,21,.3)',
        }}
      >
        <div style={{fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em'}}>Publica tu propiedad</div>
        <div style={{marginTop: 10, fontSize: 28, color: '#5C6480', fontWeight: 700}}>Sin cuenta para empezar</div>
        <div style={{marginTop: 34, display: 'grid', gap: 20}}>
          {steps.map((label, index) => {
            const done = spring({frame: frame - fps * (0.35 + index * 0.42), fps, config: {damping: 17}});
            return (
              <div key={label} style={{display: 'flex', alignItems: 'center', gap: 20}}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 15,
                    backgroundColor: done > 0.45 ? accent : '#E3E8F1',
                    color: '#FFFFFF',
                    fontSize: 30,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `scale(${0.86 + done * 0.14})`,
                  }}
                >
                  {done > 0.45 ? '✓' : ''}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 66,
                    borderRadius: 18,
                    backgroundColor: '#F2F5FA',
                    border: `2px solid ${done > 0.45 ? `${accent}66` : '#E3E8F1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 24,
                    fontSize: 30,
                    fontWeight: 700,
                    color: '#4A5270',
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)'}} />
    </AbsoluteFill>
  );
};


/**
 * The pile of listings the hook talks about: photo, price, and where the
 * location should be there is nothing. Cards keep dropping in so the stack
 * feels endless without any number being claimed.
 */
const PropertyThumbnail: React.FC<{variant: number; progress: number}> = ({variant, progress}) => {
  const skies = ['#CDE7F5', '#F5D7C8', '#D5E6D7', '#DDD8F3'];
  const walls = ['#F7F3EA', '#E7D5C7', '#E9EEE6', '#ECE8F4'];
  const roofs = ['#26364A', '#8A4E3B', '#365C4A', '#514A70'];
  const index = variant % skies.length;
  const shift = progress * (variant % 2 === 0 ? 14 : -14);
  return (
    <svg width="100%" height="100%" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skies[index]} />
          <stop offset="1" stopColor="#F7F9FC" />
        </linearGradient>
        <linearGradient id={`glass-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#BFE5F4" />
          <stop offset="1" stopColor="#5D7891" />
        </linearGradient>
      </defs>
      <rect width="440" height="190" fill={`url(#sky-${variant})`} />
      <circle cx={350 + shift * 0.25} cy="40" r="24" fill="#FFF7D6" opacity="0.9" />
      <rect x="0" y="138" width="440" height="52" fill="#8EB696" />
      <g transform={`translate(${shift} 0)`}>
        <rect x="88" y="78" width="258" height="92" rx="5" fill={walls[index]} />
        {index % 2 === 0 ? (
          <path d="M64 88 L204 28 L368 88 Z" fill={roofs[index]} />
        ) : (
          <rect x="74" y="58" width="292" height="28" rx="4" fill={roofs[index]} />
        )}
        <rect x="112" y="102" width="68" height="46" rx="3" fill={`url(#glass-${variant})`} />
        <rect x="254" y="102" width="68" height="46" rx="3" fill={`url(#glass-${variant})`} />
        <rect x="196" y="108" width="42" height="62" rx="3" fill={roofs[index]} />
        <path d="M82 166 H352" stroke="#D9DFE6" strokeWidth="8" strokeLinecap="round" />
        <g fill="#4E8B62">
          <circle cx="70" cy="143" r="15" />
          <circle cx="370" cy="146" r="17" />
        </g>
        <g stroke="#667589" strokeWidth="3">
          <path d="M52 164 V132 M52 144 H82 M82 164 V132" />
          <path d="M354 164 V132 M354 144 H388 M388 164 V132" />
        </g>
      </g>
      <rect x="0" y="170" width="440" height="20" fill="#758292" />
      <path d="M0 172 H440" stroke="#F4F6F8" strokeWidth="4" />
      <path d="M18 184 H120 M160 184 H262 M302 184 H420" stroke="#DDE3E8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export const ListingsSim: React.FC<{frame: number; total?: number; accent: string}> = ({frame, total}) => {
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cards = [
    {price: '$122.000', kind: 'Casa', details: '3 hab. · 2 baños', column: 0},
    {price: '$86.500', kind: 'Departamento', details: '2 hab. · 1 baño', column: 1},
    {price: '$230.000', kind: 'Casa', details: '4 hab. · 3 baños', column: 0},
    {price: '$54.900', kind: 'Departamento', details: '1 hab. · 1 baño', column: 1},
    {price: '$310.000', kind: 'Casa', details: '4 hab. · 4 baños', column: 0},
    {price: '$71.000', kind: 'Casa', details: '2 hab. · 2 baños', column: 1},
    {price: '$149.000', kind: 'Departamento', details: '3 hab. · 2 baños', column: 0},
    {price: '$92.400', kind: 'Casa', details: '3 hab. · 2 baños', column: 1},
    {price: '$268.000', kind: 'Casa', details: '4 hab. · 3 baños', column: 0},
    {price: '$63.900', kind: 'Departamento', details: '2 hab. · 1 baño', column: 1},
  ];
  const step = 404;
  // An endless scroll that accelerates: the longer it runs, the more it costs.
  const travel = interpolate(t, [0, 1.2, 6], [0, 120, 1500], {
    easing: Easing.bezier(0.3, 0, 0.5, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'extend',
  });
  void total;
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7'}}>
      <AbsoluteFill style={{transform: `translateY(${-travel}px)`}}>
        {cards.map((card, index) => {
          const top = 164 + Math.floor(index / 2) * step + (card.column === 1 ? 74 : 0);
          const enter = spring({frame: frame - index * 4, fps, config: {damping: 18, mass: 0.76, stiffness: 170}});
          const tilt = (card.column === 0 ? -1 : 1) * (1 - enter) * 3.5;
          const photoProgress = Math.min(1, Math.max(0, (frame - index * 4) / (fps * 1.2)));
          return (
            <div
              key={card.price}
              style={{
                position: 'absolute',
                left: card.column === 0 ? 48 : 592,
                top,
                width: 440,
                borderRadius: 28,
                overflow: 'hidden',
                backgroundColor: '#FFFFFF',
                border: '1px solid rgba(255,255,255,.8)',
                boxShadow: '0 30px 70px rgba(8,9,21,.2), 0 4px 12px rgba(8,9,21,.08)',
                fontFamily: font,
                color: palette.ink,
                opacity: Math.min(1, enter),
                transform: `translateY(${(1 - enter) * 84}px) scale(${0.94 + enter * 0.06}) rotate(${tilt}deg)`,
              }}
            >
              <div style={{height: 190, position: 'relative', overflow: 'hidden'}}>
                <PropertyThumbnail variant={index} progress={photoProgress} />
                <div style={{position: 'absolute', left: 16, top: 16, padding: '8px 14px', borderRadius: 99, backgroundColor: 'rgba(8,9,21,.78)', color: '#FFFFFF', fontSize: 20, fontWeight: 800, backdropFilter: 'blur(8px)'}}>
                  {card.kind}
                </div>
                <div style={{position: 'absolute', right: 16, top: 16, width: 38, height: 38, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 16px rgba(8,9,21,.14)'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#26364A" strokeWidth="2.2"><path d="M12 20.4S5 15.8 5 10.2A7 7 0 0 1 19 10.2C19 15.8 12 20.4 12 20.4Z"/><circle cx="12" cy="10" r="2.2"/></svg>
                </div>
              </div>
              <div style={{padding: '18px 20px 20px'}}>
                <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10}}>
                  <div style={{fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em'}}>{card.price}</div>
                  <div style={{fontSize: 19, fontWeight: 800, color: '#7A849C'}}>{card.details}</div>
                </div>
                <div style={{marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, backgroundColor: '#FFF3F1', border: '1px solid #F7D9D3'}}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C64E3D" strokeWidth="2.2" strokeLinecap="round"><path d="M12 21S5 16.2 5 10.5a7 7 0 0 1 14 0C19 16.2 12 21 12 21Z"/><path d="M9.5 8.5l5 5m0-5l-5 5"/></svg>
                  <div style={{fontSize: 23, fontWeight: 800, color: '#A74335'}}>Ubicación no indicada</div>
                </div>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          top: CLEAR,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The turn of the story: the pile of listings is swept aside and the map takes
 * the frame with the brand mark. This is the beat where the voice says the
 * product's name, so the picture has to say it too.
 */
export const ArrivalSim: React.FC<{frame: number; total?: number; accent: string}> = ({frame, accent}) => {
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const leave = ease(t, 0.1, 1.0, 0, 1);
  const arrive = spring({frame: frame - fps * 0.55, fps, config: {damping: 18, mass: 0.9}});
  const badge = spring({frame: frame - fps * 0.95, fps, config: {damping: 14}});
  const settle = ease(t, 1.0, 4.5, 1.14, 1.0);
  const cards = [
    {x: 60, y: 250, rotate: -3, away: -720},
    {x: 520, y: 190, rotate: 2, away: 760},
    {x: 120, y: 640, rotate: 2.5, away: -820},
    {x: 560, y: 600, rotate: -2, away: 880},
  ];
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7'}}>
      <AbsoluteFill style={{opacity: arrive, transform: `scale(${settle})`, transformOrigin: '50% 34%'}}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920">
          <Grid opacity={0.95} />
          {[
            {x: 300, y: 430, size: 104, label: 'Quito'},
            {x: 660, y: 250, size: 58, label: 'Ibarra'},
            {x: 230, y: 830, size: 78, label: 'Guayaquil'},
            {x: 640, y: 880, size: 56, label: 'Cuenca'},
          ].map((bubble, index) => (
            <Bubble
              key={bubble.label}
              {...bubble}
              accent={accent}
              pop={spring({frame: frame - fps * 0.8 - index * 5, fps, config: {damping: 14}})}
            />
          ))}
        </svg>
      </AbsoluteFill>
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: card.x,
            top: card.y,
            width: 470,
            height: 330,
            borderRadius: 26,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 26px 60px rgba(8,9,21,.18)',
            opacity: 1 - leave,
            transform: `translateX(${card.away * leave}px) rotate(${card.rotate + card.away * leave * 0.02}deg)`,
          }}
        />
      ))}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: 560}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            padding: '18px 34px 18px 20px',
            borderRadius: 99,
            backgroundColor: palette.ink,
            color: palette.white,
            fontFamily: font,
            fontWeight: 800,
            fontSize: 46,
            letterSpacing: '-0.02em',
            opacity: badge,
            transform: `translateY(${(1 - badge) * 30}px) scale(${0.9 + badge * 0.1})`,
            boxShadow: '0 24px 60px rgba(8,9,21,.35)',
          }}
        >
          <Img src={staticFile('brand/aents-brand-tile-1024.png')} style={{width: 58, height: 58, borderRadius: 18}} />
          Geo Propiedades Ecuador
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          top: CLEAR,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)',
        }}
      />
    </AbsoluteFill>
  );
};



/** Small mark telling a house from a plot, drawn inside the price pill. */
const TypeGlyph: React.FC<{kind: 'casa' | 'terreno' | 'departamento'; colour: string}> = ({kind, colour}) => {
  if (kind === 'terreno') {
    return <path d="M-13 6 L-8 -8 L10 -10 L14 4 L2 10 Z" fill="none" stroke={colour} strokeWidth={3} strokeLinejoin="round" />;
  }
  if (kind === 'departamento') {
    return (
      <g fill={colour}>
        <rect x={-12} y={-10} width={11} height={20} rx={2} />
        <rect x={2} y={-4} width={11} height={14} rx={2} />
      </g>
    );
  }
  return (
    <g fill="none" stroke={colour} strokeWidth={3} strokeLinejoin="round">
      <path d="M-12 0 L0 -10 L12 0" />
      <path d="M-8 0 L-8 9 L8 9 L8 0" />
    </g>
  );
};

/**
 * Opening a zone: the cluster is there first, the camera closes in on it, and
 * then it bursts into the individual homes with their price. This is the beat
 * where the voice says you see what there is in your area.
 */
export const ZoneSim: React.FC<{frame: number; total?: number; accent: string}> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const t = (frame / span) * 5.6;
  const zoom = interpolate(t, [0, 1.3, 2.4, 3.4, 5.6], [1.9, 2.3, 3.9, 4.4, 7.4], {
    easing: Easing.bezier(0.35, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const width = 1080 / zoom;
  const height = 1920 / zoom;
  const focus = interpolate(t, [3.2, 4.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const centreX = 430 + (402 - 430) * focus;
  const centreY = 392 + (366 - 392) * focus;
  const viewBox = `${centreX - width / 2} ${centreY - height * 0.34} ${width} ${height}`;
  const marker = 1 / zoom;
  // The cluster holds the frame, then hands over to the individual homes.
  const cluster = interpolate(t, [0, 0.4, 1.9, 2.4], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
  const neighbours = interpolate(t, [0, 0.5, 2.0, 2.5], [0, 1, 1, 0], {extrapolateRight: 'clamp'});
  const homes = interpolate(t, [2.2, 2.9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const burst = interpolate(t, [2.2, 3.0], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // The lot outline: an irregular parcel, drawn stroke by stroke.
  const parcel = 'M266 370 L310 368 L312 416 L268 418 Z';
  const draw = interpolate(t, [3.6, 4.9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const label = interpolate(t, [4.6, 5.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pins: Array<{x: number; y: number; price: string; kind: 'casa' | 'terreno' | 'departamento'; plot: string}> = [
    {x: 402, y: 366, price: '$122k', kind: 'casa', plot: 'M-18 11 L18 11 L19 35 L-17 35 Z'},
    {x: 468, y: 414, price: '$230k', kind: 'casa', plot: 'M-17 11 L18 10 L19 34 L-16 35 Z'},
    {x: 356, y: 440, price: '$85k', kind: 'terreno', plot: 'M-19 11 L17 10 L19 35 L-18 36 Z'},
    {x: 476, y: 336, price: '$1.2M', kind: 'departamento', plot: 'M-16 11 L16 11 L17 33 L-15 34 Z'},
    {x: 372, y: 306, price: '$74k', kind: 'terreno', plot: 'M-18 11 L17 10 L19 34 L-17 35 Z'},
  ];
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7'}}>
      <AbsoluteFill>
        <svg width="1080" height="1920" viewBox={viewBox}>
          <Grid opacity={0.95} />
          {neighbours > 0.01
            ? [
                {x: 352, y: 330, size: 38, label: 'Nayón'},
                {x: 500, y: 344, size: 32, label: 'Tumbaco'},
                {x: 366, y: 452, size: 30, label: 'Conocoto'},
                {x: 496, y: 440, size: 26, label: 'Calderón'},
              ].map((bubble, index) => (
                <Bubble
                  key={`${bubble.label}-${index}`}
                  {...bubble}
                  size={bubble.size * marker * 1.9}
                  accent={accent}
                  pop={neighbours * spring({frame: frame - index * 4, fps, config: {damping: 15}})}
                />
              ))
            : null}
          {cluster > 0.01 ? (
            <Bubble
              x={430}
              y={392}
              size={54 * marker * 1.9}
              label="Cumbayá"
              accent={accent}
              pop={cluster * spring({frame, fps, config: {damping: 14}})}
            />
          ) : null}
          {draw > 0.001
            ? pins.map((pin, index) => {
                const own = interpolate(draw, [index * 0.12, index * 0.12 + 0.5], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                if (own <= 0.001) return null;
                return (
                  <g key={`plot-${pin.price}`} transform={`translate(${pin.x} ${pin.y})`}>
                    <path d={pin.plot} fill={accent} opacity={0.2 * own} />
                    <path
                      d={pin.plot}
                      fill="none"
                      stroke={accent}
                      strokeWidth={3.2 * marker}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity={own}
                    />
                  </g>
                );
              })
            : null}
          {homes > 0.01
            ? pins.map((pin, index) => {
                // The chosen one stays; the rest step back once the lot is drawn.
                const dim = index === 0 ? 1 : 1 - draw * 0.75;
                const pop = homes * dim * spring({frame: frame - fps * 0.1 * index, fps, config: {damping: 13}});
                // They fly out from where the cluster was, so the burst reads as
                // the group opening rather than new markers appearing.
                const x = 300 + (pin.x - 300) * burst;
                const y = 430 + (pin.y - 430) * burst;
                return (
                  <g key={pin.price} transform={`translate(${x} ${y}) scale(${pop * marker * 2.5})`} opacity={pop}>
                    <rect x={-72} y={-30} width={144} height={46} rx={23} fill="#FFFFFF" stroke={accent} strokeWidth={4} />
                    <g transform="translate(-46 -7) scale(0.78)">
                      <TypeGlyph kind={pin.kind} colour={accent} />
                    </g>
                    <text textAnchor="middle" x={14} y={3} fill={palette.ink} fontFamily={font} fontWeight={800} fontSize={27}>
                      {pin.price}
                    </text>
                    <path d="M0 16 L11 32 L-11 32 Z" fill={accent} />
                  </g>
                );
              })
            : null}
        </svg>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 190,
          display: 'flex',
          justifyContent: 'center',
          gap: 14,
          opacity: label,
          fontFamily: font,
        }}
      >
        {[
          {kind: 'casa' as const, text: 'casas'},
          {kind: 'departamento' as const, text: 'departamentos'},
          {kind: 'terreno' as const, text: 'terrenos'},
        ].map((item) => (
          <div
            key={item.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              borderRadius: 99,
              backgroundColor: palette.ink,
              color: '#FFFFFF',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            <svg width={26} height={26} viewBox="-16 -16 32 32">
              <TypeGlyph kind={item.kind} colour={accent} />
            </svg>
            {item.text}
          </div>
        ))}
      </div>
      <AbsoluteFill
        style={{
          top: CLEAR,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * A purpose-built price-filter interaction based on EstateMap's MapFilters
 * RangeSlider and the MapActiveFilters chip shown after the mobile sheet is
 * lowered. The map remains recognisably part of the same product world while
 * the price range removes only the homes outside it. This is intentionally a new scene,
 * not a renamed ZoneSim: the motion must prove the sentence it accompanies.
 */
export const FiltersSim: React.FC<{frame: number; total?: number; accent: string}> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const sheet = spring({frame: frame - fps * 0.15, fps, config: {damping: 18, mass: 0.85}});
  // The knob is dragged by a hand, at the speed of a hand: with the house
  // ease-out it snapped to the end of the rail in the first half second and the
  // rest of the scene was a photograph.
  const filtering = pace(progress, 0.16, 0.58, 0, 1);
  const result = pace(progress, 0.56, 0.82, 0, 1);
  const knobX = 226 + filtering * 330;
  // The knob is a 44 px dot on a 1080 px canvas, so dragging it is not motion
  // anyone can see from across a room — the master froze for three seconds in
  // the middle of the drag. The map answers the drag by closing in on the
  // properties that survive it: one continuous move, in one direction, for the
  // whole scene.
  const approach = pace(progress, 0.05, 0.98, 0, 1);
  const pins = [
    {x: 190, y: 240, price: '$74k', keep: false},
    {x: 430, y: 330, price: '$122k', keep: true},
    {x: 745, y: 220, price: '$230k', keep: false},
    {x: 260, y: 570, price: '$98k', keep: true},
    {x: 650, y: 520, price: '$145k', keep: true},
    {x: 850, y: 650, price: '$310k', keep: false},
  ];
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7'}}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920">
        <g transform={`translate(${-approach * 44} ${-approach * 18}) scale(${1 + approach * 0.06})`} style={{transformOrigin: '540px 420px'}}>
        <Grid opacity={0.95} />
        {pins.map((pin, index) => {
          const visible = pin.keep ? 1 : 1 - result;
          const pop = spring({frame: frame - index * 3, fps, config: {damping: 15}});
          return (
            <g
              key={pin.price}
              transform={`translate(${pin.x} ${pin.y + result * (pin.keep ? -8 : 18)}) scale(${pop * (0.92 + (pin.keep ? result * 0.08 : 0))})`}
              opacity={visible}
            >
              <rect x={-76} y={-34} width={152} height={54} rx={27} fill="#FFFFFF" stroke={accent} strokeWidth={4} />
              <g transform="translate(-49 -7) scale(.72)"><TypeGlyph kind="casa" colour={accent} /></g>
              <text x={15} y={3} textAnchor="middle" fill={palette.ink} fontFamily={font} fontWeight={800} fontSize={28}>{pin.price}</text>
              <path d="M0 20 L11 36 L-11 36 Z" fill={accent} />
            </g>
          );
        })}
        </g>
      </svg>
      <div
        style={{
          position: 'absolute', left: 42, top: 48, display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 20px', borderRadius: 99, border: `2px solid ${accent}55`,
          background: 'rgba(255,255,255,.96)', color: accent, fontFamily: font,
          fontSize: 23, fontWeight: 800, boxShadow: '0 12px 28px rgba(8,9,21,.14)',
          opacity: result, transform: `translateY(${(1 - result) * -18}px)`,
        }}
      >
        Precio: $80k – $160k <span style={{fontSize: 28, lineHeight: 1}}>×</span>
      </div>
      <div
        style={{
          position: 'absolute', left: 70, right: 70, top: 620,
          padding: '34px 38px 30px', borderRadius: 34,
          background: 'rgba(255,255,255,.97)', boxShadow: '0 28px 80px rgba(8,9,21,.22)',
          fontFamily: font, transform: `translateY(${(1 - sheet) * 90}px)`, opacity: sheet,
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{fontSize: 31, fontWeight: 800, color: palette.ink}}>Rango de precio</div>
          <div style={{padding: '9px 16px', borderRadius: 18, background: `${accent}18`, color: accent, fontSize: 24, fontWeight: 800}}>
            $80k – $160k
          </div>
        </div>
        <div style={{position: 'relative', height: 76, marginTop: 22}}>
          <div style={{position: 'absolute', left: 44, right: 44, top: 31, height: 12, borderRadius: 99, background: '#DDE4EF'}} />
          <div style={{position: 'absolute', left: 44, top: 31, width: knobX - 44, height: 12, borderRadius: 99, background: accent}} />
          <div style={{position: 'absolute', left: knobX - 22, top: 15, width: 44, height: 44, borderRadius: 22, background: '#FFFFFF', border: `7px solid ${accent}`, boxShadow: '0 8px 18px rgba(8,9,21,.18)'}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 22, fontWeight: 700}}><span>$40k</span><span>$400k</span></div>
        <div style={{marginTop: 22, height: 58, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent, color: '#FFFFFF', fontSize: 25, fontWeight: 800}}>
          {result > 0.6 ? '3 opciones en esta zona' : 'Aplicar filtro'}
        </div>
      </div>
      <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.55) 14%, rgba(8,9,21,.93) 28%, rgba(8,9,21,1) 40%)'}} />
    </AbsoluteFill>
  );
};

/**
 * What every animation receives.
 *
 * The brand block is optional and carries identity, not styling decisions: a
 * composition that only needs a panel, a rail or a fitted label works for both
 * brands without knowing which one is rendering it, and the few that must show
 * a mark or a domain read it from here instead of hardcoding one account's
 * files. An animation that hardcodes `aents-brand-tile-1024.png` cannot be
 * reused by Geo, and duplicating it is how the same panel drifts into two
 * slightly different panels.
 */
export type SimulationProps = {
  frame: number;
  total: number;
  accent: string;
  photo?: string | null;
  brandId?: string;
  brandName?: string;
  brandTile?: string | null;
  brandSymbol?: string | null;
  brandDomain?: string;
};

/**
 * The panel the series shows the product in: one subject, lifted off a light
 * ground, with the eyebrow, the title and a live status on the line the product
 * itself uses. Every new animation is built on this, so the grid keeps reading
 * as one account rather than a folder of separate experiments.
 */
const PublishShell: React.FC<{
  children: React.ReactNode;
  accent: string;
  title: string;
  eyebrow: string;
  status?: string;
  // The status line is small by design, and long eyebrows already fill the
  // header row. A scene that needs it readable on a phone raises it here with
  // a short status instead of pushing every older piece's header out of line.
  statusSize?: number;
  lift?: number;
  // 0..1 along the scene, like `FieldShell`'s. A panel that plays its beats and
  // then holds is read as a photograph with captions by `MotionDefectAudit` and
  // by a person; this gives it a slow push that never stops until the cut.
  // Scenes that leave it out keep exactly the framing they were built with.
  camera?: number;
}> = ({children, accent, title, eyebrow, status = 'Borrador guardado', statusSize = 19, lift = 1, camera = 0}) => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, #E9EEF5 0%, #DCE4EE 58%, #AEB9C8 100%)', fontFamily: font, color: palette.ink}}>
    <div style={{position: 'absolute', left: -110 + camera * 30, top: 235, width: 430, height: 430, borderRadius: 999, background: `${accent}24`, filter: 'blur(85px)'}} />
    <div style={{position: 'absolute', right: -150 + camera * 24, top: 650, width: 460, height: 460, borderRadius: 999, background: `${accent}1F`, filter: 'blur(95px)'}} />
    <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 305, minHeight: 720, padding: '40px 44px 46px', borderRadius: 40, background: 'linear-gradient(145deg, rgba(255,255,255,.99) 0%, rgba(249,251,254,.98) 100%)', border: '2px solid rgba(255,255,255,.95)', boxShadow: `0 48px 130px rgba(8,9,21,.3), 0 0 70px ${accent}16, 0 2px 0 rgba(255,255,255,.95) inset`, opacity: lift, transform: `translateY(${(1 - lift) * 70 - camera * 20}px) scale(${0.96 + lift * 0.04 + camera * 0.05})`, transformOrigin: '50% 28%'}}>
      <div style={{position: 'absolute', left: 42, right: 42, top: 0, height: 7, borderRadius: '0 0 99px 99px', background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 8px 26px ${accent}50`}} />
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
        <div style={{fontSize: 23, fontWeight: 800, letterSpacing: '.08em', color: accent}}>{eyebrow}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 9, fontSize: statusSize, fontWeight: 800, color: '#667085'}}>
          <span style={{width: 10, height: 10, borderRadius: 99, background: accent, boxShadow: `0 0 0 6px ${accent}18`}} />
          {status}
        </div>
      </div>
      <div style={{marginTop: 10, fontSize: 44, fontWeight: 800, letterSpacing: '-.04em'}}>{title}</div>
      {children}
    </div>
    <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.58) 16%, rgba(8,9,21,.96) 32%)'}} />
  </AbsoluteFill>
);

export const PublishFreeSim: React.FC<SimulationProps> = ({frame, accent}) => {
  const {fps} = useVideoConfig();
  const pop = spring({frame: frame - fps * .2, fps, config: {damping: 16}});
  return <PublishShell accent={accent} eyebrow="PUBLICACIÓN" title="Tu propiedad, lista para publicar">
    <div style={{marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 260px', gap: 26}}>
      <div style={{padding: '30px 32px', borderRadius: 28, background: '#F2F5FA', border: '2px solid #E8EDF4'}}>
        {['Datos del inmueble', 'Ubicación en el mapa', 'Precio y fotos'].map((label, i) => <div key={label} style={{display: 'flex', alignItems: 'center', gap: 17, marginTop: i ? 22 : 0}}><div style={{width: 46, height: 46, borderRadius: 15, background: accent, color: '#FFF', display: 'grid', placeItems: 'center', fontSize: 25, fontWeight: 800, boxShadow: `0 10px 24px ${accent}35`}}>✓</div><span style={{fontSize: 26, fontWeight: 800}}>{label}</span></div>)}
      </div>
      <div style={{borderRadius: 30, background: `linear-gradient(145deg, ${accent}, #16A34A)`, color: '#FFF', display: 'grid', placeItems: 'center', textAlign: 'center', transform: `scale(${.8 + pop * .2})`, boxShadow: `0 24px 54px ${accent}48`}}><div><div style={{fontSize: 94, fontWeight: 800, letterSpacing: '-.07em'}}>$0</div><div style={{fontSize: 24, fontWeight: 800}}>SIN COMISIÓN</div></div></div>
    </div>
    <div style={{marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12}}>
      {['1 · Completa', '2 · Ubica', '3 · Publica'].map((label, i) => <div key={label} style={{height: 76, borderRadius: 21, display: 'grid', placeItems: 'center', background: i === 0 ? `${accent}18` : '#F5F7FA', color: i === 0 ? accent : '#667085', fontSize: 22, fontWeight: 800, border: `2px solid ${i === 0 ? `${accent}30` : '#E8EDF4'}`, boxShadow: i === 0 ? `0 14px 34px ${accent}20` : 'none'}}>{label}</div>)}
    </div>
  </PublishShell>;
};

export const PublicationFormSim: React.FC<SimulationProps> = ({frame, accent}) => {
  const {fps} = useVideoConfig();
  const progress = ease(frame / fps, 0, 3.2, 12, 58);
  const typed = frame > fps * 1.1;
  return <PublishShell accent={accent} eyebrow="PASO 1 DE 5 · AUTOGUARDADO ACTIVO" title="Cuéntanos sobre tu propiedad">
    <div style={{marginTop: 28, height: 12, borderRadius: 99, background: '#E3E8F1'}}><div style={{width: `${progress}%`, height: '100%', borderRadius: 99, background: accent}} /></div>
    {[['Tipo de propiedad', typed ? 'Casa' : 'Selecciona una opción'], ['Estado', typed ? 'En venta' : 'Selecciona una opción']].map(([label, value], i) => <div key={label} style={{marginTop: 25}}><div style={{fontSize: 23, fontWeight: 800, color: '#5D667E'}}>{label}</div><div style={{marginTop: 10, padding: '20px 22px', borderRadius: 18, border: `3px solid ${typed && i === 0 ? accent : '#DCE3ED'}`, fontSize: 27, fontWeight: 700, color: typed ? palette.ink : '#98A2B3'}}>{value}<span style={{float: 'right'}}>⌄</span></div></div>)}
    <div style={{marginTop: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px', borderRadius: 22, background: '#F4F7FB', border: '2px solid #E8EDF4'}}>
      <div style={{fontSize: 21, fontWeight: 800, color: '#667085'}}>Puedes volver y editar después</div>
      <div style={{padding: '17px 28px', borderRadius: 18, background: accent, color: '#FFF', fontSize: 23, fontWeight: 800, boxShadow: `0 14px 30px ${accent}35`}}>Continuar →</div>
    </div>
  </PublishShell>;
};

/**
 * Step two of the real form, and the only step that has two answers.
 *
 * It used to flip from the pin to the plot outline at a fixed second and then
 * hold whatever it had landed on, which left four fifths of the scene without a
 * change of state. Now the map keeps drifting for the whole take, the pin
 * breathes while it is the answer, and the outline is drawn corner by corner
 * once the choice changes.
 */
export const PublicationLocationSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const polygon = progress > 0.44;
  const appear = spring({frame: frame - fps * .5, fps, config: {damping: 18}});
  const trace = pace(progress, 0.46, 0.84, 0, 1);
  const drift = ramp(progress, 0, 1, 0, 1);
  const breath = 1 + Math.sin(frame / 13) * 0.03;
  const CORNERS: Array<[number, number]> = [[245, 105], [595, 82], [675, 275], [305, 315]];
  return <PublishShell accent={accent} eyebrow="PASO 2 DE 5" title="¿Cómo quieres ubicarla?" camera={progress}>
    <div style={{marginTop: 25, display: 'flex', gap: 12}}>{['Solo ubicación', 'Forma del terreno'].map((label, i) => <div key={label} style={{padding: '14px 18px', borderRadius: 16, background: (polygon ? i === 1 : i === 0) ? accent : '#EFF3F8', color: (polygon ? i === 1 : i === 0) ? '#FFF' : '#667085', fontSize: 22, fontWeight: 800, transition: 'none'}}>{label}</div>)}</div>
    <div style={{marginTop: 20, height: 470, overflow: 'hidden', borderRadius: 29, background: '#E7EDF4', border: '2px solid #DCE4EE', boxShadow: `0 20px 50px rgba(40,55,80,.16) inset, 0 18px 42px ${accent}16`}}><svg width="100%" height="100%" viewBox="0 0 860 390"><g transform={`translate(${-38 * drift} ${-16 * drift}) scale(${1 + drift * 0.12})`}><g stroke="#CDD7E4" strokeWidth="13">{[80,220,360,500,640,780].map(x => <path key={x} d={`M${x} -60V450`}/>)}{[70,180,290,400].map(y => <path key={y} d={`M-60 ${y}H920`}/>)}</g>{polygon ? <g style={{opacity: appear}}><polygon points="245,105 595,82 675,275 305,315" fill={`${accent}38`} fillOpacity={trace} stroke={accent} strokeWidth="9" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - trace}/>{CORNERS.map(([x,y], index) => {
      const set = smooth((trace - index * 0.25) / 0.25);
      return <circle key={`${x}-${y}`} cx={x} cy={y} r={13 * set} fill="#FFF" stroke={accent} strokeWidth="7" opacity={set}/>;
    })}</g> : <g transform={`translate(445 188) scale(${breath})`} style={{opacity: appear}}><circle r="112" fill={accent} opacity=".12"/><circle r={84 * breath} fill={accent} opacity=".12"/><path d="M0-72c41 0 72 31 72 70 0 49-72 108-72 108S-72 47-72-2c0-39 31-70 72-70Z" fill={accent} stroke="#FFF" strokeWidth="8"/><circle cy="-4" r="22" fill="#FFF"/></g>}</g></svg></div>
  </PublishShell>;
};

export const PublicationPhotosSim: React.FC<SimulationProps> = ({frame, accent}) => {
  const {fps} = useVideoConfig();
  const reveal = spring({frame: frame - fps * .8, fps, config: {damping: 18}});
  return <PublishShell accent={accent} eyebrow="PASOS 4 Y 5" title="Precio y fotos claras">
    <div style={{marginTop: 26, padding: '18px 22px', borderRadius: 18, border: `3px solid ${accent}`, fontSize: 31, fontWeight: 800}}>$ 122.000 <span style={{float: 'right', fontSize: 21, color: '#667085'}}>USD</span></div>
    <div style={{marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15}}>{['#CDE7F5','#F1D5C5','#D9E8DF'].map((sky, i) => <div key={sky} style={{height: 215, borderRadius: 24, overflow: 'hidden', border: i === 0 ? `4px solid ${accent}` : '3px solid #E0E6EF', transform: `translateY(${(1-reveal) * (35+i*12)}px)`, opacity: reveal, boxShadow: i === 0 ? `0 18px 42px ${accent}30` : '0 12px 28px rgba(8,9,21,.08)'}}><svg width="100%" height="100%" viewBox="0 0 220 150"><rect width="220" height="150" fill={sky}/><rect x="35" y="68" width="150" height="70" rx="5" fill="#F7F3EA"/><path d="M22 74L110 28l88 46" fill="#34465A"/><rect x="92" y="92" width="38" height="46" fill="#A87555"/><rect x="48" y="85" width="34" height="28" fill="#7DB4C8"/></svg></div>)}</div>
    <div style={{marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '19px 22px', borderRadius: 20, background: `${accent}18`, color: accent, fontSize: 24, fontWeight: 800}}><span>Fotos ordenadas · portada elegida</span><span style={{fontSize: 28}}>✓</span></div>
  </PublishShell>;
};

/*
 * The phone and the thread are reusable on purpose.
 *
 * `PhoneFrame` draws the device and nothing else: rails, buttons, island,
 * status bar and the glass. Anything can be rendered inside it — a chat, the
 * portal, a listing — and it will look like the same phone across the series.
 * `ChatScreen` is one such screen: pass it messages and it lays out the thread.
 *
 * Both are drawn at DESIGN size and shrunk by `scale`. The device keeps a real
 * 19.5:9 body, which at a size that fits the frame would leave any interface
 * inside it too small to draw comfortably; drawing at twice the size and
 * halving it keeps the proportions honest and the code readable.
 */

/** Time, signal, wifi and battery, in the tone the screen underneath needs. */
const StatusBar: React.FC<{tone: 'dark' | 'light'}> = ({tone}) => {
  const colour = tone === 'dark' ? palette.ink : palette.white;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 64px', color: colour, zIndex: 4}}>
      <div style={{fontSize: 40, fontWeight: 800, letterSpacing: '-.01em'}}>9:41</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <svg width="46" height="34" viewBox="0 0 30 22">
          {[0, 1, 2, 3].map((bar) => (
            <rect key={bar} x={bar * 8} y={16 - bar * 5} width="5.5" height={6 + bar * 5} rx="2" fill={colour} />
          ))}
        </svg>
        <svg width="40" height="34" viewBox="0 0 26 22" fill="none" stroke={colour} strokeWidth="2.6" strokeLinecap="round">
          <path d="M2.5 8.5a15 15 0 0 1 21 0" />
          <path d="M7 13a9 9 0 0 1 12 0" />
          <circle cx="13" cy="17.5" r="1.8" fill={colour} stroke="none" />
        </svg>
        <svg width="56" height="31" viewBox="0 0 36 20">
          <rect x="0.9" y="0.9" width="30" height="18" rx="6" fill="none" stroke={colour} strokeOpacity=".4" strokeWidth="1.8" />
          <rect x="3.4" y="3.4" width="22" height="13" rx="3.6" fill={colour} />
          <path d="M33.4 7v6a3.4 3.4 0 0 0 0-6Z" fill={colour} fillOpacity=".4" />
        </svg>
      </div>
    </div>
  );
};

const RAIL = 'linear-gradient(145deg, #E4E7EC 0%, #A7ACB6 18%, #6E737E 46%, #43474F 66%, #9AA0AB 86%, #D9DCE2 100%)';

/** A real 19.5:9 body, drawn at design size and shrunk by `scale`. */
export const PHONE_DESIGN = {width: 620, height: 1344};

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  enter?: number;
  frame?: number;
  left?: number;
  top?: number;
  scale?: number;
  statusTone?: 'dark' | 'light';
}> = ({children, enter = 1, frame = 0, left = 382, top = 262, scale = 0.51, statusTone = 'dark'}) => {
  // A device that is perfectly still reads as a picture of a phone.
  const float = Math.sin(frame / 26) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: PHONE_DESIGN.width,
        height: PHONE_DESIGN.height,
        opacity: enter,
        transformOrigin: '0 0',
        transform: `translateY(${(1 - enter) * 90 + float}px) scale(${scale * (0.96 + enter * 0.04)}) rotate(${(1 - enter) * 1.6}deg)`,
      }}
    >
      <div style={{position: 'absolute', left: -11, top: 250, width: 11, height: 74, borderRadius: '5px 0 0 5px', background: RAIL}} />
      <div style={{position: 'absolute', left: -11, top: 366, width: 11, height: 140, borderRadius: '5px 0 0 5px', background: RAIL}} />
      <div style={{position: 'absolute', left: -11, top: 534, width: 11, height: 140, borderRadius: '5px 0 0 5px', background: RAIL}} />
      <div style={{position: 'absolute', right: -11, top: 440, width: 11, height: 226, borderRadius: '0 5px 5px 0', background: RAIL}} />
      {/* The device casts a shadow on the ground it floats over. */}
      <div style={{position: 'absolute', left: 40, right: 40, bottom: -46, height: 90, borderRadius: 999, background: 'rgba(8,9,21,.28)', filter: 'blur(34px)'}} />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 96,
          padding: 15,
          background: RAIL,
          boxShadow: '0 60px 140px rgba(8,9,21,.45), 0 0 0 1px rgba(255,255,255,.35) inset',
        }}
      >
        <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 82, overflow: 'hidden', background: '#EFE7DE', boxShadow: '0 0 0 4px #0B0C16'}}>
          {children}
          <StatusBar tone={statusTone} />
          <div style={{position: 'absolute', left: '50%', top: 34, transform: 'translateX(-50%)', width: 196, height: 54, borderRadius: 99, background: '#05060C', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 18}}>
            <div style={{width: 24, height: 24, borderRadius: 99, background: '#12141F', boxShadow: 'inset 0 0 0 2px rgba(80,110,160,.55)'}} />
          </div>
          {/* The home indicator, so the body reads as the whole device. */}
          <div style={{position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', width: 196, height: 9, borderRadius: 99, background: 'rgba(8,9,21,.42)', zIndex: 5}} />
          <div style={{position: 'absolute', left: -200, top: -80, width: 320, height: 1600, background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent)', transform: 'rotate(14deg)', zIndex: 6, pointerEvents: 'none'}} />
        </div>
      </div>
    </div>
  );
};

/** The doodled wallpaper every one of these threads has behind it. */
const ChatWallpaper: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 600 1200" preserveAspectRatio="xMidYMid slice" style={{position: 'absolute', inset: 0}}>
    <rect width="600" height="1200" fill="#EFE7DE" />
    <g stroke="#C9BDB0" strokeWidth="2.4" fill="none" opacity=".55" strokeLinecap="round">
      {Array.from({length: 55}).map((_, index) => {
        const x = 30 + (index % 5) * 128 + ((index % 2) * 26);
        const y = 40 + Math.floor(index / 5) * 112;
        const kind = index % 5;
        if (kind === 0) return <path key={index} d={`M${x} ${y}h30a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-18l-12 10v-10a8 8 0 0 1-8-8V${y + 8}a8 8 0 0 1 8-8Z`} />;
        if (kind === 1) return <path key={index} d={`M${x} ${y + 14}c0-8 7-14 15-14s15 6 15 14-15 22-15 22-15-14-15-22Z`} />;
        if (kind === 2) return <g key={index}><circle cx={x + 14} cy={y + 14} r="12" /><path d={`M${x + 14} ${y + 6}v9l6 5`} /></g>;
        if (kind === 3) return <path key={index} d={`M${x} ${y + 22}h32M${x + 4} ${y + 6}h24l-4 16h-16Z`} />;
        return <g key={index}><path d={`M${x} ${y + 20}c6-14 26-14 32 0`} /><circle cx={x + 16} cy={y + 8} r="6" /></g>;
      })}
    </g>
  </svg>
);

/** Sent, delivered and read, the way the thread reports it. */
const ReadTicks: React.FC = () => (
  <svg width="60" height="32" viewBox="0 0 34 18" fill="none" stroke="#34B7F1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10.5 7 15 17 3.5" />
    <path d="M13 10.5 18 15 28 3.5" />
  </svg>
);

/**
 * One message. `media` takes any node, so a thread can carry a photo, a listing
 * preview or a link card without this component knowing what it is.
 */
export type ChatMessage = {
  side: 'sent' | 'received';
  time: string;
  enter?: number;
  text?: string;
  textSize?: number;
  media?: React.ReactNode;
  /** The red strip under the media: what the message fails to answer. */
  alert?: string;
  read?: boolean;
};

const ChatBubble: React.FC<{message: ChatMessage}> = ({message}) => {
  const sent = message.side === 'sent';
  const enter = message.enter ?? 1;
  const skin = sent ? '#E7FFDB' : '#FFFFFF';
  return (
    <div
      style={{
        position: 'relative',
        alignSelf: sent ? 'flex-end' : 'flex-start',
        maxWidth: message.media ? 470 : 520,
        padding: message.media ? 11 : '26px 30px 18px',
        borderRadius: 26,
        background: skin,
        boxShadow: '0 4px 10px rgba(8,9,21,.14)',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 46}px) scale(${0.95 + enter * 0.05})`,
        transformOrigin: sent ? '100% 100%' : '0% 100%',
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        style={{position: 'absolute', bottom: 0, [sent ? 'right' : 'left']: -14, transform: sent ? 'none' : 'scaleX(-1)'}}
      >
        <path d="M0 0c0 14 8 24 24 26H0Z" fill={skin} />
      </svg>
      {message.media ? (
        <div style={{borderRadius: 18, overflow: 'hidden'}}>
          {message.media}
          {message.alert ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', background: '#FFF3F1'}}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#C64E3D" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 21S5 16.2 5 10.5a7 7 0 0 1 14 0C19 16.2 12 21 12 21Z" />
                <path d="M9.5 8.5l5 5m0-5l-5 5" />
              </svg>
              <div style={{fontSize: 42, fontWeight: 800, color: '#A74335'}}>{message.alert}</div>
            </div>
          ) : null}
        </div>
      ) : null}
      {message.text ? (
        <span style={{fontSize: message.textSize ?? 54, fontWeight: 800, letterSpacing: '-0.02em', color: palette.ink, lineHeight: 1.18}}>
          {message.text}
          <span style={{display: 'inline-block', width: sent && message.read ? 150 : 92}} />
        </span>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 11,
          ...(message.media
            ? {padding: '12px 8px 2px'}
            : {position: 'absolute' as const, right: 30, bottom: 16}),
        }}
      >
        <span style={{fontSize: 32, fontWeight: 700, color: sent ? '#7A8B76' : '#98A2B3'}}>{message.time}</span>
        {sent && message.read ? <ReadTicks /> : null}
      </div>
    </div>
  );
};

/**
 * A thread inside `PhoneFrame`: header, wallpaper and the messages it is given.
 * `scroll` is the caller's, because only the scene knows when the conversation
 * should ride up.
 */
export const ChatScreen: React.FC<{
  contact: string;
  accent: string;
  messages: ChatMessage[];
  scroll?: number;
  status?: string;
  typing?: number;
  frame?: number;
}> = ({contact, accent, messages, scroll = 0, status = 'en línea', typing = 0, frame = 0}) => (
  <>
    <ChatWallpaper />
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 230, background: '#F6F6F6', borderBottom: '2px solid #DCD9D4', zIndex: 3}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 100, height: 130, display: 'flex', alignItems: 'center', gap: 18, padding: '0 28px', zIndex: 4}}>
      <div style={{fontSize: 58, fontWeight: 800, color: '#128C4A'}}>‹</div>
      <div style={{width: 84, height: 84, borderRadius: 99, background: '#D9DDE3', color: '#8A93A5', display: 'grid', placeItems: 'center'}}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z" /></svg>
      </div>
      <div style={{flex: 1}}>
        <div style={{fontSize: 46, fontWeight: 800, color: palette.ink}}>{contact}</div>
        <div style={{marginTop: 3, fontSize: 32, fontWeight: 700, color: '#8A93A5'}}>{status}</div>
      </div>
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#128C4A" strokeWidth="2.2" strokeLinecap="round"><path d="M6.5 4.5c1 0 1.6.4 2 1.4l.9 2c.3.8.1 1.4-.5 1.9l-1 .8a12 12 0 0 0 4.5 4.5l.8-1c.5-.6 1.1-.8 1.9-.5l2 .9c1 .4 1.4 1 1.4 2v1.6c0 1.2-.9 2-2.1 1.9C9.6 19.4 4.6 14.4 4 6.6 3.9 5.4 4.7 4.5 6 4.5Z" /></svg>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 230, bottom: 0, transform: `translateY(${-scroll}px)`}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 30, padding: '30px 26px'}}>
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}
        {typing > 0.01 ? (
          <div style={{alignSelf: 'flex-start', display: 'flex', gap: 14, padding: '32px 36px', borderRadius: '26px 26px 26px 7px', background: '#FFFFFF', boxShadow: '0 4px 10px rgba(8,9,21,.14)', opacity: typing}}>
            {[0, 1, 2].map((dot) => (
              <div key={dot} style={{width: 22, height: 22, borderRadius: 99, background: '#B6C0D0', transform: `translateY(${Math.sin(frame / 4 - dot) * 5}px)`}} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 0, background: accent}} />
  </>
);

/**
 * The mistake the hook names, shown on the device and in the thread where it
 * happens: the agent sends photo after photo, and under every one of them the
 * field that would answer the client's question is empty. Neither the device
 * nor the conversation carries a manufacturer or application mark.
 */
export const AgentChatSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  // Timed against the scene it is given, not against seconds: the voice decides
  // how long a scene lasts, and an arc written in seconds either runs out early
  // or never reaches its point.
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const arrive = spring({frame, fps, config: {damping: 19, mass: 0.9}});
  // The thread rides up as messages land, the way a real conversation does, so
  // the question ends up in the middle of the screen instead of off it.
  const scroll = interpolate(progress, [0.12, 0.4, 0.72], [0, 200, 470], {
    easing: Easing.bezier(0.3, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const typing = spring({frame: frame - span * 0.5, fps, config: {damping: 18}});
  const asking = spring({frame: frame - span * 0.66, fps, config: {damping: 17, mass: 0.8}});
  const photo = (index: number) => (
    <div style={{height: 300, overflow: 'hidden'}}>
      <PropertyThumbnail variant={index + 1} progress={Math.min(1, Math.max(0, (frame - span * index * 0.2) / (fps * 1.6)))} />
    </div>
  );
  const messages: ChatMessage[] = [0, 1].map((index) => ({
    side: 'sent',
    time: `10:3${index + 2}`,
    read: true,
    alert: 'Ubicación —',
    media: photo(index),
    enter: spring({frame: frame - span * (0.1 + index * 0.2), fps, config: {damping: 18, mass: 0.82}}),
  }));
  if (asking > 0.01) {
    messages.push({side: 'received', time: '10:35', text: '¿Dónde queda?', enter: asking});
  }
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #E9EEF5 0%, #DCE4EE 58%, #AEB9C8 100%)', fontFamily: font, color: palette.ink}}>
      <div style={{position: 'absolute', left: -110, top: 235, width: 430, height: 430, borderRadius: 999, background: `${accent}24`, filter: 'blur(85px)'}} />
      <div style={{position: 'absolute', right: -150, top: 650, width: 460, height: 460, borderRadius: 999, background: `${accent}1F`, filter: 'blur(95px)'}} />
      <PhoneFrame enter={arrive} frame={frame}>
        <ChatScreen
          contact="Cliente"
          accent={accent}
          messages={messages}
          scroll={scroll}
          typing={asking > 0.01 ? 0 : typing}
          frame={frame}
        />
      </PhoneFrame>
      <AbsoluteFill
        style={{
          top: CLEAR,
          background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.58) 16%, rgba(8,9,21,.96) 32%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** One inventory card, at the size the series draws a product card. */
const InventoryCard: React.FC<{price: string; kind: string; state: string; variant: number; accent: string; progress: number}> = ({
  price,
  kind,
  state,
  variant,
  accent,
  progress,
}) => (
  <div
    style={{
      width: 356,
      flex: '0 0 356px',
      borderRadius: 30,
      overflow: 'hidden',
      backgroundColor: '#FFFFFF',
      border: '2px solid #E8EDF4',
      boxShadow: '0 26px 60px rgba(8,9,21,.16)',
    }}
  >
    <div style={{height: 176, position: 'relative', overflow: 'hidden'}}>
      <PropertyThumbnail variant={variant} progress={progress} />
      <div style={{position: 'absolute', left: 16, top: 16, padding: '9px 18px', borderRadius: 99, backgroundColor: 'rgba(8,9,21,.8)', color: '#FFFFFF', fontSize: 23, fontWeight: 800}}>
        {state}
      </div>
    </div>
    <div style={{padding: '20px 24px 24px'}}>
      <div style={{fontSize: 42, fontWeight: 800, letterSpacing: '-.04em', color: palette.ink}}>{price}</div>
      <div style={{marginTop: 6, fontSize: 24, fontWeight: 700, color: '#7A849C'}}>{kind}</div>
    </div>
    <div style={{height: 6, background: `linear-gradient(90deg, ${accent}, transparent)`}} />
  </div>
);

/**
 * The agent's own inventory inside the product panel of the series: a strip of
 * listings that keeps moving, so it reads as a whole inventory without claiming
 * a number, and the two facts that answer the objection. No visit counters, no
 * contact details, no administrative screens.
 */
export const AgentInventorySim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const cards = [
    {price: '$122.000', state: 'En venta', kind: 'Casa · Cumbayá'},
    {price: '$480/mes', state: 'En alquiler', kind: 'Departamento · Quito'},
    {price: '$230.000', state: 'En venta', kind: 'Casa · Samborondón'},
    {price: '$85.000', state: 'En venta', kind: 'Terreno · Ambato'},
    {price: '$650/mes', state: 'En alquiler', kind: 'Local · Cuenca'},
  ];
  // The strip never stops: an inventory that scrolls says "all of them" better
  // than any counter, and it keeps the frame alive while the voice talks price.
  const travel = interpolate(progress, [0.20, 0.34, 0.50, 0.64], [0, 378, 378, 756], {
    easing: Easing.bezier(0.3, 0, 0.2, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const facts = spring({frame: frame - span * 0.5, fps, config: {damping: 16}});
  return (
    <PublishShell accent={accent} eyebrow="TU INVENTARIO" title="Mis propiedades" status="Publicar es gratis" lift={lift}>
      <div style={{marginTop: 24, display: 'flex', gap: 12}}>
        {['Todas', 'En venta', 'En alquiler'].map((chip, index) => (
          <div
            key={chip}
            style={{
              padding: '13px 24px',
              borderRadius: 99,
              fontSize: 25,
              fontWeight: 800,
              backgroundColor: index === 0 ? accent : '#EFF3F8',
              color: index === 0 ? '#FFFFFF' : '#667085',
            }}
          >
            {chip}
          </div>
        ))}
      </div>
      <div style={{position: 'relative', marginTop: 26, height: 300, overflow: 'hidden'}}>
        <div style={{display: 'flex', gap: 22, transform: `translateX(${-travel}px)`}}>
          {cards.map((card, index) => (
            <InventoryCard
              key={card.price}
              {...card}
              variant={index}
              accent={accent}
              progress={Math.min(1, Math.max(0, (frame - index * 5) / (fps * 1.8)))}
            />
          ))}
        </div>
        <div style={{position: 'absolute', left: -4, top: 0, bottom: 0, width: 70, background: 'linear-gradient(270deg, rgba(255,255,255,0), #FFFFFF)'}} />
        <div style={{position: 'absolute', right: -4, top: 0, bottom: 0, width: 90, background: 'linear-gradient(90deg, rgba(255,255,255,0), #FFFFFF)'}} />
      </div>
      <div style={{marginTop: 30, display: 'flex', gap: 20, opacity: facts, transform: `translateY(${(1 - facts) * 36}px)`}}>
        <div style={{flex: 1, padding: '26px 30px', borderRadius: 30, background: `linear-gradient(145deg, ${palette.violet}, #5B4BE0)`, color: '#FFFFFF', boxShadow: `0 26px 60px ${palette.violet}45`}}>
          <div style={{fontSize: 76, fontWeight: 800, letterSpacing: '-.07em', lineHeight: 1}}>$0</div>
          <div style={{marginTop: 8, fontSize: 25, fontWeight: 800, letterSpacing: '.04em'}}>POR PUBLICAR</div>
        </div>
        <div style={{flex: 1, padding: '26px 30px', borderRadius: 30, background: `linear-gradient(145deg, ${palette.teal}, #0D9488)`, color: '#FFFFFF', boxShadow: `0 26px 60px ${palette.teal}45`}}>
          <div style={{fontSize: 76, fontWeight: 800, letterSpacing: '-.07em', lineHeight: 1}}>0 %</div>
          <div style={{marginTop: 8, fontSize: 25, fontWeight: 800, letterSpacing: '.04em'}}>DE COMISIÓN</div>
        </div>
      </div>
    </PublishShell>
  );
};

/** A stand-in QR: the finder squares plus a stable field, drawn, never scanned. */
const QrArt: React.FC<{size: number; colour: string}> = ({size, colour}) => {
  const modules = 21;
  const cell = size / modules;
  const squares: React.ReactNode[] = [];
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      const corner = [[0, 0], [0, 14], [14, 0]].find(
        ([r0, c0]) => row >= r0 && row < r0 + 7 && column >= c0 && column < c0 + 7
      );
      let filled: boolean;
      if (corner) {
        const r = row - corner[0];
        const c = column - corner[1];
        filled = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      } else {
        filled = (row * 7 + column * 13 + row * column) % 5 < 2;
      }
      if (!filled) continue;
      squares.push(
        <rect key={`${row}-${column}`} x={column * cell} y={row * cell} width={cell} height={cell} fill={colour} />
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {squares}
    </svg>
  );
};

/**
 * The kit turned into the thing an agent can actually send: the short link and
 * the QR of one listing, copied, and then the preview the client opens. Both
 * beats live in the same panel and hand over with a crossfade, so the scene
 * never sits on an empty frame between them. Nothing here posts to a network.
 */
export const ShortLinkSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const copied = progress > 0.34;
  // One beat leaves as the next arrives: the frame always has a subject.
  const handover = ease(progress, 0.46, 0.62, 0, 1);
  const link = 'geopropiedadesecuador.com/p/XK4T2';
  return (
    <PublishShell accent={accent} eyebrow="KIT DEL ANUNCIO" title="Enlace corto y QR" status="Listo para enviar" lift={lift}>
      <div style={{position: 'relative', marginTop: 30, height: 470}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            display: 'flex',
            gap: 28,
            opacity: 1 - handover,
            transform: `translateY(${handover * -46}px)`,
          }}
        >
          <div style={{flex: 1}}>
            <div style={{fontSize: 24, fontWeight: 800, letterSpacing: '.06em', color: '#5D667E'}}>ENLACE CORTO DEL ANUNCIO</div>
            <div
              style={{
                marginTop: 16,
                padding: '26px 28px',
                borderRadius: 24,
                border: `3px solid ${copied ? accent : '#DCE3ED'}`,
                background: copied ? `${accent}12` : '#F7F9FC',
                fontSize: 26,
                fontWeight: 800,
                color: palette.ink,
              }}
            >
              {link}
            </div>
            <div
              style={{
                marginTop: 22,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 36px',
                borderRadius: 22,
                background: copied ? accent : '#EFF3F8',
                color: copied ? '#FFFFFF' : '#4A5270',
                fontSize: 30,
                fontWeight: 800,
                boxShadow: copied ? `0 18px 40px ${accent}45` : 'none',
              }}
            >
              {copied ? 'Copiado ✓' : 'Copiar enlace'}
            </div>
            <div style={{marginTop: 26, fontSize: 25, fontWeight: 700, color: '#7A849C'}}>
              Se lo mandas tú, por donde ya hablas con tu cliente.
            </div>
          </div>
          <div style={{padding: 22, borderRadius: 30, background: '#FFFFFF', border: '3px solid #E8EDF4', alignSelf: 'flex-start', boxShadow: '0 22px 50px rgba(8,9,21,.14)'}}>
            <QrArt size={176} colour={palette.ink} />
            <div style={{marginTop: 14, textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#8A93AB'}}>CÓDIGO QR</div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            opacity: handover,
            transform: `translateY(${(1 - handover) * 70}px) scale(${0.95 + handover * 0.05})`,
          }}
        >
          <div style={{fontSize: 24, fontWeight: 800, letterSpacing: '.06em', color: '#5D667E'}}>LO QUE ABRE TU CLIENTE</div>
          <div style={{marginTop: 18, borderRadius: '32px 32px 32px 12px', overflow: 'hidden', backgroundColor: '#FFFFFF', border: '2px solid #E8EDF4', boxShadow: '0 34px 80px rgba(8,9,21,.24)'}}>
            <div style={{padding: '20px 28px 16px', fontSize: 26, fontWeight: 800, color: accent}}>{link}</div>
            <div style={{height: 214, overflow: 'hidden'}}>
              <PropertyThumbnail variant={0} progress={Math.min(1, Math.max(0, (frame - span * 0.46) / (fps * 1.4)))} />
            </div>
            <div style={{padding: '24px 28px 28px'}}>
              <div style={{fontSize: 38, fontWeight: 800, letterSpacing: '-.04em', color: palette.ink}}>Casa en Cumbayá · $122.000</div>
              <div style={{marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700, color: '#5C6480'}}>
                <span style={{color: accent, fontSize: 30}}>◉</span> Ubicación en el mapa
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublishShell>
  );
};

const CheckMark: React.FC<{progress: number; accent: string}> = ({progress, accent}) => (
  <svg width="42" height="42" viewBox="0 0 42 42">
    <circle cx="21" cy="21" r="18" fill={accent} opacity={0.12 + progress * 0.88} />
    <path
      d="M12 21.5l6 6L31 14"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - progress}
    />
  </svg>
);

/** A continuous pass from the cover photo into the declared listing facts. */
export const BuyerDetailsSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const galleryProgress = ease(progress, 0.08, 0.58, 0, 3);
  const shot = Math.min(4, 1 + Math.floor(galleryProgress));
  const photoShift = (galleryProgress - Math.floor(galleryProgress)) * -56;
  const scan = ease(progress, 0.08, 0.48, -30, 100);
  const facts: Array<[string, string]> = [
    ['3', 'habitaciones'],
    ['2', 'baños'],
    ['400 m²', 'área declarada'],
  ];
  return (
    <PublishShell accent={accent} eyebrow="PASO 1 · REVISA" title="Más allá de la portada" status="Datos declarados" lift={lift}>
      <div style={{marginTop: 24, height: 330, borderRadius: 32, overflow: 'hidden', position: 'relative', border: `3px solid ${accent}28`, boxShadow: '0 24px 54px rgba(8,9,21,.17)'}}>
        <div style={{width: '108%', height: '100%', transform: `translateX(${photoShift}px) scale(1.04)`}}>
          <PropertyThumbnail variant={shot} progress={galleryProgress / 3} />
        </div>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 48%, rgba(8,9,21,.7) 100%)'}} />
        <div style={{position: 'absolute', left: `${scan}%`, top: 0, width: 120, height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.48), transparent)', transform: 'skewX(-12deg)'}} />
        <div style={{position: 'absolute', left: 20, top: 20, padding: '10px 18px', borderRadius: 99, background: '#FFFFFF', color: palette.ink, fontSize: 21, fontWeight: 800, boxShadow: '0 8px 22px rgba(8,9,21,.18)'}}>
          Ficha pública
        </div>
        <div style={{position: 'absolute', right: 20, bottom: 20, padding: '12px 22px', borderRadius: 99, background: 'rgba(8,9,21,.8)', color: '#FFFFFF', fontSize: 24, fontWeight: 800}}>
          {shot} / 10 fotos
        </div>
        <div style={{position: 'absolute', left: 22, bottom: 24, display: 'flex', gap: 8}}>
          {[1, 2, 3, 4].map((dot) => <div key={dot} style={{width: dot === shot ? 34 : 9, height: 9, borderRadius: 99, background: dot === shot ? accent : 'rgba(255,255,255,.58)'}} />)}
        </div>
      </div>
      <div style={{marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14}}>
        {facts.map(([value, label], index) => {
          const appear = spring({frame: frame - span * (0.38 + index * 0.11), fps, config: {damping: 16, stiffness: 180}});
          return (
            <div
              key={label}
              style={{
                position: 'relative',
                padding: '22px 18px 18px',
                borderRadius: 24,
                background: appear > 0.75 ? `${accent}12` : '#F2F5FA',
                border: `2px solid ${appear > 0.75 ? `${accent}4A` : '#E8EDF4'}`,
                opacity: appear,
                transform: `translateY(${(1 - appear) * 38}px) scale(${0.92 + appear * 0.08})`,
              }}
            >
              <div style={{position: 'absolute', right: 8, top: 8}}><CheckMark progress={appear} accent={accent} /></div>
              <div style={{fontSize: 40, fontWeight: 800, letterSpacing: '-.04em', color: palette.ink}}>{value}</div>
              <div style={{marginTop: 5, fontSize: 20, fontWeight: 700, color: '#69738B'}}>{label}</div>
            </div>
          );
        })}
      </div>
    </PublishShell>
  );
};

/** The public intelligence block: calculated unit price and comparable context. */
export const BuyerPriceAreaSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const unitPrice = spring({frame: frame - span * 0.08, fps, config: {damping: 16, stiffness: 175}});
  const comparison = spring({frame: frame - span * 0.25, fps, config: {damping: 16, stiffness: 175}});
  const range = spring({frame: frame - span * 0.43, fps, config: {damping: 17}});
  const sample = spring({frame: frame - span * 0.58, fps, config: {damping: 17}});
  const value = Math.round(ease(progress, 0.08, 0.32, 0, 305));
  const marker = ease(progress, 0.44, 0.74, 0, 0.58);
  return (
    <PublishShell accent={accent} eyebrow="PASO 2 · COMPARA" title="Inteligencia del anuncio" status="Inventario activo" lift={lift}>
      <div style={{marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        <div style={{padding: '24px 26px', borderRadius: 28, background: `linear-gradient(145deg, ${accent}, #0F8F6B)`, color: '#FFFFFF', boxShadow: `0 22px 52px ${accent}3D`, opacity: unitPrice, transform: `translateY(${(1 - unitPrice) * 38}px) scale(${0.92 + unitPrice * 0.08})`}}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19V5m0 11h16M8 8h8M8 12h5" /></svg>
          <div style={{marginTop: 12, fontSize: 19, fontWeight: 800, letterSpacing: '.07em', opacity: 0.82}}>PRECIO POR M²</div>
          <div style={{marginTop: 5, fontSize: 64, fontWeight: 800, letterSpacing: '-.06em'}}>${value}<span style={{fontSize: 25, letterSpacing: '-.02em'}}>/m²</span></div>
        </div>
        <div style={{padding: '24px 26px', borderRadius: 28, background: '#F2F5FA', border: `2px solid ${accent}38`, opacity: comparison, transform: `translateY(${(1 - comparison) * 38}px) scale(${0.92 + comparison * 0.08})`}}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18l5-5 4 3 7-9"/><path d="M15 7h5v5"/></svg>
          <div style={{marginTop: 12, fontSize: 19, fontWeight: 800, letterSpacing: '.07em', color: '#69738B'}}>FRENTE A SIMILARES</div>
          <div style={{marginTop: 5, fontSize: 58, fontWeight: 800, letterSpacing: '-.06em', color: palette.ink}}>+4,8%</div>
        </div>
      </div>
      <div style={{marginTop: 18, padding: '24px 26px 22px', borderRadius: 28, background: '#FFFFFF', border: '2px solid #E4EAF2', boxShadow: '0 18px 42px rgba(8,9,21,.10)', opacity: range, transform: `translateY(${(1 - range) * 32}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <div><div style={{fontSize: 23, fontWeight: 800}}>Rango habitual</div><div style={{marginTop: 4, fontSize: 19, fontWeight: 700, color: '#69738B'}}>mismo tipo, operación y ciudad</div></div>
          <div style={{fontSize: 28, fontWeight: 800, color: accent}}>$280–$330/m²</div>
        </div>
        <div style={{position: 'relative', marginTop: 22, height: 18, borderRadius: 99, background: '#E3E9F1'}}>
          <div style={{position: 'absolute', left: '24%', width: '52%', height: '100%', borderRadius: 99, background: `${accent}42`}} />
          <div style={{position: 'absolute', left: `${marker * 100}%`, top: -9, width: 36, height: 36, borderRadius: 99, background: accent, border: '6px solid #FFFFFF', boxShadow: `0 7px 20px ${accent}55`, transform: 'translateX(-50%)'}} />
        </div>
      </div>
      <div style={{marginTop: 17, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '17px 22px', borderRadius: 22, background: `${accent}10`, border: `2px solid ${accent}2E`, opacity: sample, transform: `translateY(${(1 - sample) * 22}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}><CheckMark progress={sample} accent={accent} /><span style={{fontSize: 22, fontWeight: 800}}>12 propiedades comparables</span></div>
        <span style={{fontSize: 18, fontWeight: 800, color: '#69738B'}}>EJEMPLO</span>
      </div>
    </PublishShell>
  );
};

/** Where it is, and the shape of the plot when the advertiser drew one. */
export const BuyerLocationSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const pin = spring({frame: frame - span * 0.08, fps, config: {damping: 15, stiffness: 165}});
  const switchMode = ease(progress, 0.42, 0.55, 0, 1);
  const draw = ease(progress, 0.52, 0.82, 0, 1);
  const camera = ease(progress, 0.08, 0.84, 1, 1.07);
  const pulse = 1 + Math.sin(frame / 7) * 0.045;
  const corners = [[245, 105], [595, 82], [675, 275], [305, 315]];
  return (
    <PublishShell accent={accent} eyebrow="PASO 3 · UBICA" title="Ubicación y terreno" status="En la ficha pública" lift={lift}>
      <div style={{marginTop: 22, display: 'flex', gap: 12}}>
        {['Solo ubicación', 'Forma del terreno'].map((label, index) => {
          const active = index === 0 ? 1 - switchMode : switchMode;
          return <div key={label} style={{position: 'relative', flex: 1, padding: '15px 18px', borderRadius: 18, overflow: 'hidden', background: active > 0.5 ? accent : '#EFF3F8', color: active > 0.5 ? '#FFFFFF' : '#667085', fontSize: 22, fontWeight: 800, textAlign: 'center', boxShadow: active > 0.5 ? `0 14px 34px ${accent}35` : 'none'}}>
            {label}
            <div style={{position: 'absolute', left: 20, right: 20, bottom: 0, height: 4, borderRadius: 99, background: '#FFFFFF', opacity: active}} />
          </div>;
        })}
      </div>
      <div style={{marginTop: 18, height: 505, borderRadius: 30, overflow: 'hidden', position: 'relative', background: '#E7EDF4', border: '2px solid #DCE4EE', boxShadow: `0 20px 50px rgba(40,55,80,.16) inset, 0 22px 48px ${accent}18`}}>
        <svg width="100%" height="100%" viewBox="0 0 860 420">
          <g transform={`translate(430 210) scale(${camera}) translate(-430 -210)`}>
            <rect width="860" height="420" fill="#E7EDF4" />
            <g stroke="#CDD7E4" strokeWidth="13" fill="none">
              {[80, 220, 360, 500, 640, 780].map((x) => <path key={x} d={`M${x} 0V420`} />)}
              {[70, 180, 290, 400].map((y) => <path key={y} d={`M0 ${y}H860`} />)}
            </g>
            <path d="M-20 320 C170 270 310 360 510 315 S760 270 900 305 L900 440 L-20 440 Z" fill="#D8E8DE" />
            <g opacity={pin * (1 - switchMode)} transform={`translate(445 190) scale(${pin * pulse})`}>
              <circle r="116" fill={accent} opacity=".11" />
              <circle r="84" fill={accent} opacity=".12" />
              <path d="M0-72c41 0 72 31 72 70 0 49-72 108-72 108S-72 47-72-2c0-39 31-70 72-70Z" fill={accent} stroke="#FFFFFF" strokeWidth="8" />
              <circle cy="-4" r="22" fill="#FFFFFF" />
            </g>
            <g opacity={switchMode}>
              <polygon points="245,105 595,82 675,275 305,315" fill={`${accent}38`} stroke={accent} strokeWidth="9" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - draw} />
              {corners.map(([x, y], index) => {
                const point = ease(draw, index * 0.16, index * 0.16 + 0.3, 0, 1);
                return <circle key={`${x}-${y}`} cx={x} cy={y} r={13 * point} fill="#FFFFFF" stroke={accent} strokeWidth="7" />;
              })}
            </g>
          </g>
        </svg>
        <div style={{position: 'absolute', left: 22, top: 22, padding: '11px 20px', borderRadius: 99, background: 'rgba(255,255,255,.94)', fontSize: 21, fontWeight: 800, color: switchMode > 0.5 ? accent : palette.ink, boxShadow: '0 9px 24px rgba(8,9,21,.14)'}}>{switchMode > 0.5 ? 'Forma del terreno disponible' : 'Ubicación en el mapa'}</div>
        <div style={{position: 'absolute', right: 18, bottom: 18, display: 'grid', gap: 8}}>{['+', '−'].map((label) => <div key={label} style={{width: 50, height: 50, borderRadius: 15, background: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800, boxShadow: '0 8px 20px rgba(8,9,21,.16)'}}>{label}</div>)}</div>
      </div>
    </PublishShell>
  );
};

/**
 * The last step of a listing: writing to whoever published it.
 *
 * Drawn from the listing page's own contact block — "Teléfono del anunciante",
 * "Elige cómo comunicarte", the Llamar and WhatsApp pair and the reveal that
 * hides the number until it is asked for — and then the message the product
 * pre-fills, which names Geo Propiedades and carries the listing's link. The
 * number stays masked on purpose: a legible one would read as a real
 * advertiser's phone.
 */
export const BuyerContactSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const publisher = spring({frame: frame - span * 0.06, fps, config: {damping: 17, stiffness: 170}});
  const revealed = progress > 0.26;
  const reveal = spring({frame: frame - span * 0.26, fps, config: {damping: 16, stiffness: 180}});
  // The finger lands on WhatsApp, and the message the product wrote takes over
  // the same space, so the two beats read as one gesture.
  const tap = ease(progress, 0.46, 0.56, 0, 1);
  const handover = ease(progress, 0.54, 0.72, 0, 1);
  const ticks = spring({frame: frame - span * 0.82, fps, config: {damping: 18}});
  const ripple = tap > 0 && tap < 1 ? tap : 0;
  const whatsapp = '#25D366';
  return (
    <PublishShell accent={accent} eyebrow="EN LA FICHA" title="Escribe a quien publica" status="Contacto directo" lift={lift}>
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '20px 24px',
          borderRadius: 26,
          background: '#F2F5FA',
          border: '2px solid #E8EDF4',
          opacity: publisher,
          transform: `translateY(${(1 - publisher) * 30}px)`,
        }}
      >
        <div style={{width: 66, height: 66, borderRadius: 99, background: `${accent}1F`, color: accent, display: 'grid', placeItems: 'center'}}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z" /></svg>
        </div>
        <div style={{flex: 1}}>
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: '#69738B'}}>PUBLICADO POR</div>
          <div style={{marginTop: 4, fontSize: 40, fontWeight: 800, letterSpacing: '-.04em'}}>El anunciante</div>
        </div>
        <span style={{fontSize: 18, fontWeight: 800, color: '#69738B'}}>EJEMPLO</span>
      </div>

      <div style={{position: 'relative', marginTop: 18, height: 452}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, opacity: 1 - handover, transform: `translateY(${handover * -54}px)`}}>
          <div style={{borderRadius: 30, overflow: 'hidden', background: '#FFFFFF', border: '2px solid #E4EAF2', boxShadow: '0 20px 46px rgba(8,9,21,.12)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '22px 26px', background: `${accent}14`, borderBottom: '2px solid #E8EDF4'}}>
              <span style={{width: 56, height: 56, borderRadius: 99, background: accent, color: '#FFFFFF', display: 'grid', placeItems: 'center', boxShadow: `0 10px 24px ${accent}38`}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"><path d="M6.5 4.5c1 0 1.6.4 2 1.4l.9 2c.3.8.1 1.4-.5 1.9l-1 .8a12 12 0 0 0 4.5 4.5l.8-1c.5-.6 1.1-.8 1.9-.5l2 .9c1 .4 1.4 1 1.4 2v1.6c0 1.2-.9 2-2.1 1.9C9.6 19.4 4.6 14.4 4 6.6 3.9 5.4 4.7 4.5 6 4.5Z" /></svg>
              </span>
              <div>
                <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.03em'}}>Teléfono del anunciante</div>
                <div style={{marginTop: 3, fontSize: 22, fontWeight: 700, color: '#69738B'}}>Elige cómo comunicarte</div>
              </div>
            </div>
            <div style={{padding: '24px 26px 26px'}}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderRadius: 22,
                  border: `3px solid ${revealed ? `${accent}55` : '#DCE3ED'}`,
                  background: revealed ? `${accent}0F` : '#F7F9FC',
                }}
              >
                <span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: '#69738B'}}>TELÉFONO</span>
                <span style={{position: 'relative', fontSize: 44, fontWeight: 800, letterSpacing: '-.03em', color: revealed ? palette.ink : accent}}>
                  <span style={{opacity: 1 - reveal, position: revealed ? 'absolute' : 'static', right: 0, whiteSpace: 'nowrap', fontSize: 30}}>Ver teléfono</span>
                  <span style={{opacity: reveal}}>{revealed ? '09•• ••• •••' : ''}</span>
                </span>
              </div>
              <div style={{marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '22px 0', borderRadius: 22, border: '3px solid #DCE3ED', background: '#FFFFFF', fontSize: 28, fontWeight: 800}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={palette.ink} strokeWidth="2.2" strokeLinecap="round"><path d="M6.5 4.5c1 0 1.6.4 2 1.4l.9 2c.3.8.1 1.4-.5 1.9l-1 .8a12 12 0 0 0 4.5 4.5l.8-1c.5-.6 1.1-.8 1.9-.5l2 .9c1 .4 1.4 1 1.4 2v1.6c0 1.2-.9 2-2.1 1.9C9.6 19.4 4.6 14.4 4 6.6 3.9 5.4 4.7 4.5 6 4.5Z" /></svg>
                  Llamar
                </div>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '22px 0',
                    borderRadius: 22,
                    background: whatsapp,
                    color: '#FFFFFF',
                    fontSize: 28,
                    fontWeight: 800,
                    boxShadow: `0 16px 36px ${whatsapp}4D`,
                    transform: `scale(${1 - tap * 0.04})`,
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.5A8.4 8.4 0 1 1 21 11.5Z" /></svg>
                  WhatsApp
                  {ripple ? (
                    <span style={{position: 'absolute', left: '50%', top: '50%', width: 40 + ripple * 240, height: 40 + ripple * 240, borderRadius: 999, background: '#FFFFFF', opacity: 0.32 * (1 - ripple), transform: 'translate(-50%, -50%)'}} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, top: 0, opacity: handover, transform: `translateY(${(1 - handover) * 78}px) scale(${0.95 + handover * 0.05})`}}>
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: '#5D667E'}}>EL MENSAJE YA VA ESCRITO</div>
          <div style={{marginTop: 16, borderRadius: 30, overflow: 'hidden', background: '#EFE7DE', border: '2px solid #E0DAD1', boxShadow: '0 26px 60px rgba(8,9,21,.20)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', background: '#F6F6F6', borderBottom: '2px solid #DCD9D4'}}>
              <span style={{width: 52, height: 52, borderRadius: 99, background: '#D9DDE3', color: '#8A93A5', display: 'grid', placeItems: 'center'}}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z" /></svg>
              </span>
              <div>
                <div style={{fontSize: 27, fontWeight: 800}}>El anunciante</div>
                <div style={{marginTop: 2, fontSize: 20, fontWeight: 700, color: '#8A93A5'}}>en línea</div>
              </div>
            </div>
            <div style={{padding: '26px 22px 28px', display: 'flex', justifyContent: 'flex-end'}}>
              <div style={{maxWidth: 620, padding: '22px 26px 12px', borderRadius: '20px 20px 6px 20px', background: '#E7FFDB', boxShadow: '0 4px 12px rgba(8,9,21,.14)'}}>
                <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: palette.ink}}>
                  Hola, vi este anuncio en Geo Propiedades: Casa en Cumbayá
                </div>
                <div style={{marginTop: 10, fontSize: 25, fontWeight: 800, color: '#1F7A4D'}}>geopropiedadesecuador.com</div>
                <div style={{marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, opacity: ticks}}>
                  <span style={{fontSize: 20, fontWeight: 700, color: '#7A8B76'}}>10:41</span>
                  <ReadTicks />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublishShell>
  );
};

/**
 * The four animations of the owner offer.
 *
 * They are drawn from what `frontend/lib/help-faqs.ts` actually promises —
 * publishing is free, there is no commission on a sale or a rental, there is no
 * cap on listings, the draft is kept before you register, and the interested
 * party calls or writes to you directly. Nothing here states a figure the FAQ
 * does not.
 */

/** What the owner has: a plot or a house, and the decision to sell or rent it. */
export const OwnerSellSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // The subject alternates so both audiences — plot and house — see themselves.
  const swap = ease(progress, 0.44, 0.58, 0, 1);
  const sign = spring({frame: frame - span * 0.16, fps, config: {damping: 13, stiffness: 150}});
  const sway = Math.sin(frame / 18) * 1.6;
  const kinds: Array<{title: string; caption: string}> = [
    {title: 'Terreno', caption: '400 m² · Cumbayá'},
    {title: 'Casa', caption: '3 hab. · 2 baños'},
  ];
  return (
    <PublishShell accent={accent} eyebrow="LO QUE TIENES" title="Un terreno. Una casa." status="Listo para publicar" lift={lift}>
      <div style={{position: 'relative', marginTop: 26, height: 470, borderRadius: 34, overflow: 'hidden', border: '2px solid #E2E8F1', background: 'linear-gradient(180deg, #DDEAF6 0%, #EEF3F8 62%, #E4EAE2 100%)', boxShadow: `0 26px 62px ${accent}1E`}}>
        <svg width="100%" height="100%" viewBox="0 0 720 470" preserveAspectRatio="xMidYMid slice">
          {/* Months pass while nothing happens: the sun crosses, the clouds
              drift and the light warms. The stillness of the property is the
              point, so the world around it is what carries the time. */}
          <circle cx={90 + progress * 520} cy={128 - Math.sin(progress * Math.PI) * 58} r="34" fill="#FFD98A" opacity=".85" />
          {[{y: 84, r: 30, speed: 210, offset: 0}, {y: 148, r: 22, speed: 320, offset: 0.45}].map((cloud) => {
            const x = ((progress + cloud.offset) * cloud.speed + 40) % 860 - 70;
            return (
              <g key={cloud.y} opacity=".8" transform={`translate(${x} ${cloud.y})`}>
                <ellipse rx={cloud.r * 1.7} ry={cloud.r * 0.72} fill="#FFFFFF" />
                <ellipse cx={-cloud.r * 0.8} rx={cloud.r} ry={cloud.r * 0.6} fill="#FFFFFF" />
                <ellipse cx={cloud.r * 0.9} rx={cloud.r * 0.86} ry={cloud.r * 0.52} fill="#FFFFFF" />
              </g>
            );
          })}
          {/* Ground, then the street the whole scene is seen from. Everything
              stands on the same line so the plot and the house occupy exactly
              the same slot and one really replaces the other. */}
          <path d="M-20 352 C140 330 300 366 460 344 S680 320 740 336 L740 490 L-20 490 Z" fill="#CFE0CE" />
          <rect x="-20" y="392" width="760" height="16" fill="#C3CBB8" />
          <rect x="-20" y="408" width="760" height="82" fill="#9EA5AE" />
          {[40, 190, 340, 490, 640].map((x) => (
            <rect key={`lane-${x}`} x={x} y={444} width="86" height="9" rx="4" fill="#E6E9EC" opacity=".75" />
          ))}

          {/* The neighbours. They never change, and that is the point: the slot
              between them is either an empty lot or a house. */}
          {[{x: 24, w: 168}, {x: 528, w: 168}].map((n) => (
            <g key={`neighbour-${n.x}`} opacity=".62">
              <rect x={n.x} y={286} width={n.w} height={106} rx="6" fill="#DED8CE" />
              <path d={`M${n.x - 14} 286L${n.x + n.w / 2} 214L${n.x + n.w + 14} 286Z`} fill="#5C6C7E" />
              <rect x={n.x + n.w / 2 - 24} y={330} width="48" height="62" rx="4" fill="#B99C7F" />
              <rect x={n.x + 22} y={312} width="42" height="34" rx="4" fill="#AFC9D6" />
              <rect x={n.x + n.w - 64} y={312} width="42" height="34" rx="4" fill="#AFC9D6" />
            </g>
          ))}

          {/* The empty lot: grass in the gap, a picket fence across its front,
              and the neighbours' walls closing it at both sides. */}
          <g opacity={1 - swap}>
            <polygon points="216,300 504,300 520,392 200,392" fill="#BBD3A6" />
            <polygon points="216,300 504,300 520,392 200,392" fill={`${accent}1A`} />
            {[[248, 330], [330, 316], [420, 344], [470, 322], [292, 366], [396, 374]].map(([x, y], index) => (
              <path
                key={`tuft-${index}`}
                d={`M${x} ${y}c-3-10 2-17 2-17s4 8 1 17M${x} ${y}c-8-6-8-15-8-15s9 4 11 13M${x} ${y}c8-6 9-14 9-14s-3 9-6 13`}
                stroke="#7F9A62"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            ))}
            <path d="M198 392 L200 356 M518 392 L516 356" stroke="#9A7A55" strokeWidth="9" strokeLinecap="round" />
            {Array.from({length: 17}, (_, index) => {
              const x = 204 + index * 19.5;
              return <rect key={`picket-${index}`} x={x} y={352} width="9" height="42" rx="4" fill="#EDE6DA" stroke="#B9A88F" strokeWidth="2" />;
            })}
            <rect x="198" y="360" width="322" height="7" rx="3" fill="#D8CCB8" />
            <rect x="198" y="380" width="322" height="7" rx="3" fill="#D8CCB8" />
          </g>

          {/* The same slot, filled. */}
          <g opacity={swap} transform="translate(360 392)">
            <rect x="-158" y="-108" width="316" height="108" rx="6" fill="#F2EEE7" />
            <path d="M-176-112L0-206 176-112Z" fill="#33455A" />
            <rect x="-38" y="-72" width="76" height="72" rx="4" fill="#A87555" />
            <rect x="-128" y="-84" width="62" height="48" rx="4" fill="#8FC0D4" />
            <rect x="66" y="-84" width="62" height="48" rx="4" fill="#8FC0D4" />
          </g>
        </svg>
        {/* The sign is planted in the ground and the board hangs off its post,
            so it swings from the top rather than floating in the sky. */}
        <div style={{position: 'absolute', left: 268, top: 248, width: 13, height: 158, borderRadius: 4, background: 'linear-gradient(90deg,#7A5A3E,#A07A55,#7A5A3E)', opacity: sign}} />
        <div
          style={{
            position: 'absolute',
            left: 212,
            top: 194,
            padding: '15px 24px',
            borderRadius: 14,
            background: '#FFFFFF',
            border: `4px solid ${accent}`,
            boxShadow: '0 16px 38px rgba(8,9,21,.24)',
            fontFamily: font,
            fontWeight: 800,
            fontSize: 32,
            color: palette.ink,
            opacity: sign,
            transform: `translateY(${(1 - sign) * -30}px) rotate(${-1.5 + sway}deg)`,
            transformOrigin: '50% 0%',
          }}
        >
          SE VENDE
          <div style={{marginTop: 3, fontSize: 21, fontWeight: 800, color: '#69738B'}}>o se arrienda</div>
        </div>
      </div>
      <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
        {kinds.map((kind, index) => {
          const active = index === 0 ? 1 - swap : swap;
          return (
            <div
              key={kind.title}
              style={{
                padding: '20px 24px',
                borderRadius: 24,
                background: active > 0.5 ? accent : '#F2F5FA',
                color: active > 0.5 ? '#FFFFFF' : '#69738B',
                border: `2px solid ${active > 0.5 ? accent : '#E8EDF4'}`,
                boxShadow: active > 0.5 ? `0 16px 38px ${accent}35` : 'none',
              }}
            >
              <div style={{fontSize: 40, fontWeight: 800, letterSpacing: '-.04em'}}>{kind.title}</div>
              <div style={{marginTop: 5, fontSize: 22, fontWeight: 700, opacity: active > 0.5 ? 0.86 : 1}}>{kind.caption}</div>
            </div>
          );
        })}
      </div>
    </PublishShell>
  );
};

/** The whole price of the offer, and the three things it is not. */
export const OwnerOfferSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const zero = spring({frame: frame - span * 0.06, fps, config: {damping: 14, stiffness: 170}});
  const pulse = 1 + Math.sin(frame / 9) * 0.02;
  const rows: Array<[string, string]> = [
    ['Publicar', '$0'],
    ['Comisión al vender o arrendar', '0 %'],
    ['Propiedades que puedes publicar', 'Sin límite'],
  ];
  const nots = ['una suscripción', 'una prueba gratis'];
  return (
    <PublishShell accent={accent} eyebrow="LO QUE CUESTA" title="Cero, de principio a fin" status="Publicar es gratis" lift={lift}>
      <div
        style={{
          marginTop: 26,
          padding: '30px 34px',
          borderRadius: 32,
          background: `linear-gradient(145deg, ${accent}, #6D4FD6)`,
          color: '#FFFFFF',
          boxShadow: `0 26px 64px ${accent}45`,
          opacity: zero,
          transform: `translateY(${(1 - zero) * 44}px) scale(${(0.92 + zero * 0.08) * pulse})`,
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', opacity: 0.82}}>PRECIO DE PUBLICAR</div>
        <div style={{marginTop: 2, fontSize: 118, fontWeight: 800, letterSpacing: '-.07em', lineHeight: 1}}>$0</div>
      </div>
      <div style={{marginTop: 18}}>
        {rows.map(([label, value], index) => {
          const appear = spring({frame: frame - span * (0.22 + index * 0.12), fps, config: {damping: 16, stiffness: 175}});
          return (
            <div
              key={label}
              style={{
                marginTop: index ? 12 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '20px 24px',
                borderRadius: 22,
                background: '#F2F5FA',
                border: `2px solid ${accent}2E`,
                opacity: appear,
                transform: `translateX(${(1 - appear) * -34}px)`,
              }}
            >
              <span style={{fontSize: 24, fontWeight: 700, color: '#5D667E'}}>{label}</span>
              <span style={{fontSize: 44, fontWeight: 800, letterSpacing: '-.04em', color: accent}}>{value}</span>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'}}>
        <span style={{fontSize: 24, fontWeight: 800, color: '#69738B'}}>No es</span>
        {nots.map((item, index) => {
          const strike = ease(progress, 0.56 + index * 0.11, 0.72 + index * 0.11, 0, 1);
          return (
            <span key={item} style={{position: 'relative', padding: '12px 18px', borderRadius: 16, background: '#EFF3F8', fontSize: 24, fontWeight: 800, color: '#8A93AB'}}>
              {item}
              <span style={{position: 'absolute', left: 14, top: '52%', width: `calc((100% - 28px) * ${strike})`, height: 4, borderRadius: 99, background: '#C64E3D'}} />
            </span>
          );
        })}
      </div>
    </PublishShell>
  );
};

/**
 * The map as it already is, and the hole in it.
 *
 * The pins are the catalogue's real inventory — the figure the piece speaks is
 * the one geopropiedadesecuador.com/estadisticas-inmobiliarias publishes — and
 * the dashed outline is the viewer's property, the one that is not there yet.
 * No count is painted: the number lives in the narration, where its source is
 * recorded, and not frozen into a drawing.
 */
export const OwnerAlreadyThereSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const camera = ease(progress, 0.04, 0.92, 1.14, 1.02);
  const gap = spring({frame: frame - span * 0.58, fps, config: {damping: 15, stiffness: 160}});
  const dash = Math.round(frame * 0.9) % 40;
  // Scattered evenly and deterministically. Modular strides put every pin on a
  // diagonal; the R2 low-discrepancy sequence fills the frame instead, and it is
  // reproducible, which `Math.random` would not be. The gap keeps a clear
  // radius: a pin sitting inside the very hole the scene is about would
  // contradict the whole point.
  const GAP = {x: 352, y: 236, clear: 132};
  const R2 = [0.7548776662466927, 0.5698402909980532];
  const pins = Array.from({length: 38}, (_, index) => ({
    x: 40 + ((0.5 + R2[0] * index) % 1) * 644,
    y: 38 + ((0.5 + R2[1] * index) % 1) * 404,
    size: 15 + ((index * 7) % 9),
    at: (index % 13) / 13,
  })).filter((pin) => Math.hypot(pin.x - GAP.x, pin.y - GAP.y) > GAP.clear);
  return (
    <PublishShell accent={accent} eyebrow="EL MAPA HOY" title="Ya están casi todas" status="Inventario en venta" lift={lift}>
      <div style={{position: 'relative', marginTop: 26, height: 500, borderRadius: 32, overflow: 'hidden', border: '2px solid #DCE4EE', background: '#E7EDF4', boxShadow: `0 24px 56px ${accent}1A`}}>
        <svg width="100%" height="100%" viewBox="0 0 720 500" preserveAspectRatio="xMidYMid slice">
          <g transform={`translate(360 250) scale(${camera}) translate(-360 -250)`}>
            <rect width="720" height="500" fill="#E7EDF4" />
            <g stroke="#CDD7E4" strokeWidth="14" fill="none">
              {[90, 260, 440, 610].map((x) => <path key={x} d={`M${x} 0V500`} />)}
              {[100, 250, 400].map((y) => <path key={y} d={`M0 ${y}H720`} />)}
            </g>
            <path d="M-20 392 C160 360 300 416 460 386 S680 352 740 372 L740 520 L-20 520 Z" fill="#D8E8DE" />
            {pins.map((pin, index) => {
              const pop = spring({frame: frame - span * pin.at * 0.66, fps, config: {damping: 14, stiffness: 190}});
              return (
                <g key={index} transform={`translate(${pin.x} ${pin.y}) scale(${pop})`} opacity={pop * 0.95}>
                  <circle r={pin.size * 1.7} fill={accent} opacity="0.13" />
                  <path
                    d={`M0 ${-pin.size * 1.5}c${pin.size * 0.85} 0 ${pin.size * 1.5} ${pin.size * 0.65} ${pin.size * 1.5} ${pin.size * 1.45} 0 ${pin.size} -${pin.size * 1.5} ${pin.size * 2.25} -${pin.size * 1.5} ${pin.size * 2.25}s-${pin.size * 1.5} -${pin.size * 1.25} -${pin.size * 1.5} -${pin.size * 2.25}c0 -${pin.size * 0.8} ${pin.size * 0.65} -${pin.size * 1.45} ${pin.size * 1.5} -${pin.size * 1.45}Z`}
                    fill={accent}
                    stroke="#FFFFFF"
                    strokeWidth="4"
                  />
                </g>
              );
            })}
            <g opacity={gap} transform={`translate(352 236) scale(${0.8 + gap * 0.2})`}>
              <circle r="86" fill="#C64E3D" opacity="0.08" />
              <circle r="62" fill="none" stroke="#C64E3D" strokeWidth="7" strokeDasharray="22 18" strokeDashoffset={dash} />
              <text textAnchor="middle" y="12" fontFamily={font} fontWeight="800" fontSize="34" fill="#A74335">?</text>
            </g>
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 24,
            bottom: 24,
            padding: '15px 26px',
            borderRadius: 99,
            background: '#FFFFFF',
            border: '4px solid #C64E3D',
            fontFamily: font,
            fontWeight: 800,
            fontSize: 30,
            color: palette.ink,
            boxShadow: '0 14px 34px rgba(8,9,21,.24)',
            opacity: gap,
            transform: `translateY(${(1 - gap) * 24}px)`,
          }}
        >
          Aquí falta la tuya
        </div>
      </div>
    </PublishShell>
  );
};

/** Where the listing ends up: on the map, drawn, with its price on it. */
export const OwnerListingOnMapSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // The card travels from the form into its place on the map, so the two halves
  // of the promise are one movement rather than two shots.
  const travel = ease(progress, 0.08, 0.42, 0, 1);
  const draw = ease(progress, 0.44, 0.72, 0, 1);
  const price = spring({frame: frame - span * 0.6, fps, config: {damping: 15, stiffness: 170}});
  const camera = ease(progress, 0.05, 0.9, 1.12, 1);
  return (
    <PublishShell accent={accent} eyebrow="DÓNDE QUEDA" title="En el mapa, no en una lista" status="Ficha publicada" lift={lift} camera={progress}>
      <div style={{position: 'relative', marginTop: 26, height: 500, borderRadius: 32, overflow: 'hidden', border: '2px solid #DCE4EE', background: '#E7EDF4', boxShadow: `0 24px 56px ${accent}1A`}}>
        <svg width="100%" height="100%" viewBox="0 0 720 500" preserveAspectRatio="xMidYMid slice">
          <g transform={`translate(360 250) scale(${camera}) translate(-360 -250)`}>
            <rect width="720" height="500" fill="#E7EDF4" />
            <g stroke="#CDD7E4" strokeWidth="14" fill="none">
              {[80, 250, 430, 620].map((x) => <path key={x} d={`M${x} 0V500`} />)}
              {[110, 270, 420].map((y) => <path key={y} d={`M0 ${y}H720`} />)}
            </g>
            <path d="M-20 372 C160 340 300 396 460 366 S680 332 740 352 L740 520 L-20 520 Z" fill="#D8E8DE" />
            <g opacity={draw}>
              <polygon
                points="236,196 470,178 502,300 268,320"
                fill={`${accent}33`}
                stroke={accent}
                strokeWidth="9"
                strokeLinejoin="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - draw}
              />
            </g>
            {/* The final beat: the neighbours appear, so the listing is not
                alone on the map but part of what is already there. */}
            {[[110, 130], [598, 152], [156, 402], [640, 386], [388, 92], [512, 424]].map(([x, y], index) => {
              const pop = spring({frame: frame - span * (0.74 + index * 0.035), fps, config: {damping: 14, stiffness: 190}});
              return (
                <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${pop})`} opacity={pop * 0.9}>
                  <circle r="30" fill={accent} opacity=".13" />
                  <path d="M0-26c15 0 26 11 26 25 0 17-26 39-26 39s-26-22-26-39c0-14 11-25 26-25Z" fill={accent} stroke="#FFFFFF" strokeWidth="5" />
                  <circle cy="-2" r="8" fill="#FFFFFF" />
                </g>
              );
            })}
          </g>
        </svg>
        {/* The card lands clear of the plot, and the price sits on the plot
            itself. They used to share the same corner and the price covered the
            card's own label. */}
        <div
          style={{
            position: 'absolute',
            left: 250 - travel * 210,
            top: 320 - travel * 196,
            width: 268,
            borderRadius: 22,
            overflow: 'hidden',
            background: '#FFFFFF',
            border: '3px solid #FFFFFF',
            boxShadow: '0 22px 50px rgba(8,9,21,.3)',
            transform: `scale(${1 - travel * 0.14})`,
            transformOrigin: '0% 0%',
          }}
        >
          <div style={{height: 122, overflow: 'hidden'}}>
            <PropertyThumbnail variant={0} progress={Math.min(1, frame / (fps * 1.4))} />
          </div>
          <div style={{padding: '13px 16px 16px'}}>
            <div style={{fontSize: 28, fontWeight: 800, letterSpacing: '-.03em', color: palette.ink}}>Tu propiedad</div>
            <div style={{marginTop: 5, fontSize: 23, fontWeight: 700, color: '#69738B'}}>Tus fotos · tu precio</div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 322,
            top: 224,
            padding: '15px 26px',
            borderRadius: 99,
            background: '#FFFFFF',
            border: `4px solid ${accent}`,
            fontFamily: font,
            fontWeight: 800,
            fontSize: 38,
            color: palette.ink,
            boxShadow: '0 14px 34px rgba(8,9,21,.28)',
            opacity: price,
            transform: `translateY(${(1 - price) * 26}px) scale(${0.86 + price * 0.14})`,
          }}
        >
          $122.000
        </div>
        <div style={{position: 'absolute', left: 26, bottom: 24, padding: '13px 22px', borderRadius: 99, background: 'rgba(8,9,21,.8)', color: '#FFFFFF', fontFamily: font, fontSize: 23, fontWeight: 800}}>
          Forma del terreno
        </div>
      </div>
    </PublishShell>
  );
};

/** The point of all of it: the interested person reaches you, and only you. */
export const OwnerIncomingSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const arrive = spring({frame, fps, config: {damping: 19, mass: 0.9}});
  // The call comes first and the message lands after it, the way it happens.
  const handover = ease(progress, 0.42, 0.56, 0, 1);
  const ring = 1 + Math.sin(frame / 5) * 0.03;
  // The device buzzes while it rings and goes still once the call is over.
  const buzz = handover > 0.5 ? 0 : Math.sin(frame / 1.6) * 5 * (1 - ease(progress, 0.3, 0.44, 0, 1));
  const messages: ChatMessage[] = [
    {
      side: 'received',
      time: '10:04',
      text: 'Hola, vi su terreno en Geo Propiedades. ¿Sigue disponible?',
      textSize: 42,
      enter: spring({frame: frame - span * 0.58, fps, config: {damping: 18, mass: 0.82}}),
    },
    {
      side: 'received',
      time: '10:04',
      text: '¿Podemos verlo el sábado?',
      textSize: 42,
      enter: spring({frame: frame - span * 0.78, fps, config: {damping: 18, mass: 0.82}}),
    },
  ];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #E9EEF5 0%, #DCE4EE 58%, #AEB9C8 100%)', fontFamily: font, color: palette.ink}}>
      <div style={{position: 'absolute', left: -110, top: 235, width: 430, height: 430, borderRadius: 999, background: `${accent}24`, filter: 'blur(85px)'}} />
      <div style={{position: 'absolute', right: -150, top: 650, width: 460, height: 460, borderRadius: 999, background: `${accent}1F`, filter: 'blur(95px)'}} />
      {/* Bigger than the shared default: this scene has no second subject, and
          at 0.51 the phone left two thirds of the frame empty. */}
      <PhoneFrame enter={arrive} frame={frame} left={340 + buzz} top={252} scale={0.58} statusTone={handover > 0.5 ? 'dark' : 'light'}>
        {handover > 0.5 ? (
          <ChatScreen contact="Interesado" accent={accent} messages={messages} frame={frame} status="en línea" />
        ) : (
          <AbsoluteFill style={{background: 'linear-gradient(180deg, #16233C 0%, #0A0F1C 100%)', color: '#FFFFFF', alignItems: 'center', paddingTop: 190}}>
            <div style={{fontSize: 26, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.6)'}}>LLAMADA ENTRANTE</div>
            <div style={{marginTop: 34, width: 168, height: 168, borderRadius: 999, background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', transform: `scale(${ring})`, boxShadow: `0 0 0 ${12 + (ring - 1) * 400}px rgba(255,255,255,.05)`}}>
              <svg width="86" height="86" viewBox="0 0 24 24" fill="rgba(255,255,255,.8)"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7Z" /></svg>
            </div>
            <div style={{marginTop: 30, fontSize: 46, fontWeight: 800, letterSpacing: '-.03em'}}>Interesado</div>
            <div style={{marginTop: 10, fontSize: 25, fontWeight: 700, color: 'rgba(255,255,255,.58)'}}>móvil · Ecuador</div>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 92, display: 'flex', justifyContent: 'center', gap: 90}}>
              <div style={{width: 108, height: 108, borderRadius: 999, background: '#E5484D', display: 'grid', placeItems: 'center', transform: 'rotate(133deg)'}}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"><path d="M6.5 4.5c1 0 1.6.4 2 1.4l.9 2c.3.8.1 1.4-.5 1.9l-1 .8a12 12 0 0 0 4.5 4.5l.8-1c.5-.6 1.1-.8 1.9-.5l2 .9c1 .4 1.4 1 1.4 2v1.6c0 1.2-.9 2-2.1 1.9C9.6 19.4 4.6 14.4 4 6.6 3.9 5.4 4.7 4.5 6 4.5Z" /></svg>
              </div>
              <div style={{width: 108, height: 108, borderRadius: 999, background: '#2BB673', display: 'grid', placeItems: 'center', transform: `scale(${ring})`, boxShadow: '0 14px 40px rgba(43,182,115,.5)'}}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"><path d="M6.5 4.5c1 0 1.6.4 2 1.4l.9 2c.3.8.1 1.4-.5 1.9l-1 .8a12 12 0 0 0 4.5 4.5l.8-1c.5-.6 1.1-.8 1.9-.5l2 .9c1 .4 1.4 1 1.4 2v1.6c0 1.2-.9 2-2.1 1.9C9.6 19.4 4.6 14.4 4 6.6 3.9 5.4 4.7 4.5 6 4.5Z" /></svg>
              </div>
            </div>
          </AbsoluteFill>
        )}
      </PhoneFrame>
      <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.58) 16%, rgba(8,9,21,.96) 32%)'}} />
    </AbsoluteFill>
  );
};

/**
 * The card for everything that happens away from the portal.
 *
 * Deliberately not `PublishShell`: that panel is how the series draws the
 * product, and a registry certificate or a municipal sheet rendered inside it
 * would read as a screen of the app. This one is paper, and its badge says
 * where you actually are — the registry, the town hall, the plot itself.
 */
const FieldShell: React.FC<{
  children: React.ReactNode;
  accent: string;
  where: string;
  // A node, not only a string: a scene that changes what it is looking at has
  // to be able to cross-fade its own title instead of leaving the first beat's
  // words over the second beat's picture.
  title: React.ReactNode;
  lift?: number;
  // 0..1 along the scene. A card that only plays its beats and then holds is
  // read by `MotionDefectAudit` — and by a person — as a photograph with
  // captions. Passing the scene's own progress here gives the paper a slow,
  // single-direction push that never stops until the cut. Older scenes that
  // carry their motion inside the card leave it out and are unaffected.
  camera?: number;
}> = ({children, accent, where, title, lift = 1, camera = 0}) => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, #EDEAE3 0%, #DFDACE 58%, #B4AE9F 100%)', fontFamily: font, color: palette.ink}}>
    <div style={{position: 'absolute', left: -110 + camera * 26, top: 235, width: 430, height: 430, borderRadius: 999, background: `${accent}1E`, filter: 'blur(85px)'}} />
    <div style={{position: 'absolute', right: -150 + camera * 22, top: 650, width: 460, height: 460, borderRadius: 999, background: '#8A7A5A1A', filter: 'blur(95px)'}} />
    <div
      style={{
        position: 'absolute',
        left: sideCrop,
        right: sideCrop,
        top: 305,
        minHeight: 720,
        padding: '38px 42px 44px',
        borderRadius: 26,
        background: 'linear-gradient(150deg, #FFFDF8 0%, #FAF6ED 100%)',
        border: '2px solid #E6DFCE',
        boxShadow: '0 46px 120px rgba(40,32,16,.32), 0 2px 0 rgba(255,255,255,.9) inset',
        opacity: lift,
        transform: `translateY(${(1 - lift) * 70 - camera * 16}px) scale(${0.96 + lift * 0.04 + camera * 0.045})`,
        transformOrigin: '50% 30%',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
        <div style={{padding: '10px 18px', borderRadius: 8, background: `${accent}18`, border: `2px solid ${accent}45`, fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: accent}}>{where}</div>
        {/* This word is what allows an invented price or area on screen, so it
            has to survive a phone: below 22 px the permission exists in the
            code and not on the screen. */}
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#9A8F79'}}>EJEMPLO</div>
      </div>
      <div style={{marginTop: 14, fontSize: 44, fontWeight: 800, letterSpacing: '-.04em'}}>{title}</div>
      {children}
    </div>
    <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.58) 16%, rgba(8,9,21,.96) 32%)'}} />
  </AbsoluteFill>
);

/**
 * The four animations of the flat-buying guide. Same paper card as the plot
 * guide: none of this happens in any portal.
 */

/**
 * You are not buying the flat. You are buying a share of the building.
 *
 * The only scene of the four that is not paper: the claim is about a place,
 * so it is drawn as the place. The camera starts low and close, on the
 * pavement by the gate, and rises while it widens: one window steps out of the
 * volume — that is the flat — the façade answers floor by floor, the lift
 * shaft fills and the roof tank arrives last, when the camera has finally got
 * high enough to see it. The proof is the last frame: one lit window inside a
 * whole lit building, tank and pavement included.
 *
 * The camera is a scale plus a focal point, and the callouts are drawn outside
 * it: a label that rides a moving camera either drifts off the safe margin or
 * gets cropped, which is what happened to «Sus deudas» before. Only the tip of
 * each connector is projected, so the line keeps pointing at its object while
 * the words stay put.
 *
 * Two rules the first master broke. The flat you are buying is the only object
 * painted in the accent, and it never moves: the lift car used to be drawn in
 * the same colour and climbed the shaft, so a viewer saw «the lit window» jump
 * from the middle of the façade to the top right. And the picture no longer
 * runs into the caption scrim — it ends above it and dissolves into the ground,
 * so the pavement is not sliced in half by a gradient it knows nothing about.
 */
const BUILDING_CENTRE_X = 500;

/** Two hex colours blended by `t`, so a façade lights up instead of switching. */
const mixHex = (from: string, to: string, t: number) => {
  const clamped = Math.min(1, Math.max(0, t));
  const channel = (offset: number) => {
    const a = parseInt(from.slice(offset, offset + 2), 16);
    const b = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * clamped)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
};

/**
 * An unlit window is a hole, not a pale tile.
 *
 * The first pass painted them almost the colour of the façade, so the sweep
 * that lights the building floor by floor was invisible on a phone — and a
 * camera moving over a picture with no dark values reads as a still frame.
 */
const WINDOW_DARK = '#8397AB';
const WINDOW_LIT = '#F6D79A';

export const WhatYouBuySim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  // A crane that stops where the voice is pointing. It starts tight on the
  // entrance and ends on the whole volume, always rising, but it climbs in
  // moves of about a second and a quarter separated by pauses of two thirds of
  // a second — long enough to read what was just named, short enough that the
  // picture is never parked. A single even nine-second glide reads as a still
  // frame: the eye needs the change to arrive, not to seep.
  const camera = interpolate(
    progress,
    [0, 0.15, 0.18, 0.33, 0.36, 0.51, 0.54, 0.69, 0.72, 0.87, 1],
    [0, 0.2, 0.2, 0.4, 0.4, 0.6, 0.6, 0.8, 0.8, 1, 1],
    {easing: Easing.bezier(0.45, 0.05, 0.55, 0.95), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // The rise ends wide enough for the whole volume — roof tank included — to
  // sit inside the picture box, above the caption scrim.
  const camScale = 1.5 - camera * 0.62;
  const panX = 540 - BUILDING_CENTRE_X * camScale;
  const panY = -390 + camera * 384;
  const project = (x: number, y: number): [number, number] => [x * camScale + panX, y * camScale + panY];
  const single = ease(progress, 0.15, 0.23, 0, 1);
  // The façade answers floor by floor across most of the scene, so the windows
  // are still lighting up while the last callout is being read.
  const sweep = ramp(progress, 0.32, 0.86, 0, 1);
  const shaft = ramp(progress, 0.5, 0.66, 0, 1);
  const tank = ramp(progress, 0.68, 0.78, 0, 1);
  const columns = [300, 420, 540];
  const rows = [122, 186, 250, 314, 378];
  // Low enough to be inside the frame while the camera is still close, so the
  // flat you are buying is on screen from the first beat to the last.
  const mine = {x: columns[1], y: rows[3]};
  const tags: Array<{label: string; at: number; x: number; y: number; to: [number, number]}> = [
    {label: 'Sus vecinos', at: 0.33, x: 132, y: 196, to: [columns[0] + 50, rows[3] + 23]},
    {label: 'Sus deudas', at: 0.52, x: 744, y: 96, to: [616, 70]},
    {label: 'Sus reglas', at: 0.8, x: 132, y: 352, to: [465, 449]},
  ];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #E6EDF5 0%, #EFEAE0 62%, #DFDACE 100%)', fontFamily: font, color: palette.ink}}>
      <div style={{position: 'absolute', left: sideCrop, top: 305, right: sideCrop}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
          <div style={{padding: '10px 18px', borderRadius: 8, background: `${accent}18`, border: `2px solid ${accent}45`, fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: accent}}>ANTES DE COMPRAR</div>
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#9A8F79'}}>EJEMPLO</div>
        </div>
        <div style={{marginTop: 14, fontSize: 44, fontWeight: 800, letterSpacing: '-.04em'}}>No compras solo el departamento</div>
      </div>
      {/* The picture starts below the title's line box and stops short of the
          caption scrim: the viewBox matches the box, so nothing is cropped by
          an aspect ratio nobody chose. */}
      <div style={{position: 'absolute', left: 0, top: 436, width: 1080, height: 464, overflow: 'hidden'}}>
        <svg width="1080" height="464" viewBox="0 0 1080 464" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="wyb-ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E9E7DF" stopOpacity="0" />
              <stop offset="70%" stopColor="#E9E7DF" stopOpacity="1" />
              <stop offset="100%" stopColor="#E9E7DF" stopOpacity="1" />
            </linearGradient>
          </defs>
          <g transform={`translate(${panX} ${panY}) scale(${camScale})`}>
            <rect x="-260" y="470" width="1600" height="30" fill="#CFCABA" />
            <rect x="-260" y="500" width="1600" height="200" fill="#9EA5AE" />
            {[-140, 60, 260, 460, 660, 860, 1060].map((x) => (
              <rect key={`lane-${x}`} x={x} y={534} width="110" height="9" rx="4" fill="#E6E9EC" opacity=".7" />
            ))}
            {/* The neighbours carry their own storeys and windows. Flat pale
                blocks read as fog at phone size, and a camera moving over fog
                is a camera that appears not to move at all. */}
            <g opacity=".72">
              {[[60, 230, 190, 240], [760, 200, 220, 270]].map(([x, y, width, height]) => (
                <g key={`block-${x}`}>
                  <rect x={x} y={y} width={width} height={height} rx="6" fill="#DAD4C7" stroke="#A79E8B" strokeWidth="3" />
                  {[0, 1, 2, 3].map((floor) =>
                    [0, 1, 2].map((slot) => (
                      <rect
                        key={`${floor}-${slot}`}
                        x={x + 18 + slot * ((width - 36) / 3)}
                        y={y + 26 + floor * ((height - 40) / 4)}
                        width={(width - 36) / 3 - 14}
                        height="30"
                        rx="3"
                        fill="#8E9DAD"
                      />
                    )),
                  )}
                </g>
              ))}
            </g>
            <rect x="280" y="114" width="440" height="356" rx="8" fill="#F3EFE7" stroke="#3E4A5C" strokeWidth="5" />
            {/* One slab line per storey: the façade is a stack of homes, and the
                lines are what makes the climb legible while the camera moves. */}
            {rows.map((y) => (
              <rect key={`slab-${y}`} x="282" y={y + 52} width="436" height="7" fill="#CDC3AC" />
            ))}
            <rect x="272" y="100" width="456" height="20" rx="6" fill="#4A5768" />
            <g opacity={tank}>
              <rect x="560" y="48" width="112" height="44" rx="10" fill="#B9C3CE" stroke="#8D99A7" strokeWidth="3" />
              <rect x="584" y="34" width="12" height="16" rx="4" fill="#8D99A7" />
              <rect x="572" y="62" width="88" height="8" rx="4" fill="#8FA8C4" />
            </g>
            <rect x="636" y="120" width="64" height="350" rx="6" fill="#E4DFD2" stroke="#D0C8B6" strokeWidth="2" />
            {/* The lift car is machinery, not a home: painting it in the accent
                made it read as a second lit flat that changed floors. */}
            <g opacity={0.3 + shaft * 0.7}>
              <line x1="668" y1="126" x2="668" y2={ramp(shaft, 0, 1, 400, 140)} stroke="#C0B8A6" strokeWidth="3" />
              <rect x="640" y={ramp(shaft, 0, 1, 400, 140)} width="56" height="66" rx="4" fill="#9AA6B4" stroke="#7C8896" strokeWidth="3" />
              <line x1="668" y1={ramp(shaft, 0, 1, 400, 140)} x2="668" y2={ramp(shaft, 0, 1, 466, 206)} stroke="#7C8896" strokeWidth="2" />
            </g>
            {rows.map((y, row) =>
              columns.map((x, column) => {
                const isMine = x === mine.x && y === mine.y;
                // The sweep climbs the façade from the ground up, one floor at
                // a time, so the building answers instead of switching on.
                const floor = ramp(sweep, (rows.length - 1 - row) * 0.17, (rows.length - 1 - row) * 0.17 + 0.34, 0, 1);
                if (isMine) {
                  return (
                    <g key={`${row}-${column}`} transform={`translate(${-single * 16} ${-single * 12})`}>
                      <rect x={x - 6} y={y - 6} width="112" height="58" rx="8" fill={accent} opacity={single * 0.22} />
                      <rect x={x} y={y} width="100" height="46" rx="5" fill={accent} />
                      <rect x={x} y={y} width="100" height="46" rx="5" fill="#FFFFFF" opacity={0.18 + single * 0.1} />
                    </g>
                  );
                }
                return (
                  <rect
                    key={`${row}-${column}`}
                    x={x}
                    y={y}
                    width="100"
                    height="46"
                    rx="5"
                    // A window warms up; it does not change colour on one
                    // frame the way a threshold made it.
                    fill={mixHex(WINDOW_DARK, WINDOW_LIT, floor)}
                    stroke="#5F6E80"
                    strokeWidth="2.5"
                  />
                );
              }),
            )}
            <rect x="400" y="428" width="130" height="42" rx="4" fill="#5C6C7E" />
            {[0, 1, 2, 3].map((bar) => (
              <rect key={`gate-${bar}`} x={412 + bar * 32} y={434} width="10" height="36" rx="3" fill="#8794A5" />
            ))}
            <g>
              <rect x="210" y="396" width="18" height="74" rx="6" fill="#8A6A4A" />
              <circle cx="219" cy="372" r="52" fill="#8FAE79" />
              <circle cx="183" cy="394" r="33" fill="#7E9E6B" />
              <circle cx="254" cy="392" r="29" fill="#9BBB86" />
            </g>
          </g>
          {/* The asphalt dissolves into the page instead of ending on a hard
              line the caption gradient then cuts again. Drawn under the
              callouts, so no label is washed out by it. */}
          <rect x="0" y="400" width="1080" height="64" fill="url(#wyb-ground)" />
          {tags.map((tag) => {
            // The leader is drawn, not switched on: it leaves the pill and
            // travels to the part of the building it is naming.
            const show = ramp(progress, tag.at, tag.at + 0.12, 0, 1);
            const width = tag.label.length * 15 + 34;
            const [targetX, targetY] = project(tag.to[0], tag.to[1]);
            const anchorX = tag.x < targetX ? tag.x + width : tag.x;
            const anchorY = tag.y - 12;
            return (
              <g key={tag.label} opacity={show}>
                <line
                  x1={anchorX}
                  y1={anchorY}
                  x2={anchorX + (targetX - anchorX) * show}
                  y2={anchorY + (targetY - anchorY) * show}
                  stroke={accent}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx={targetX} cy={targetY} r={5 * show} fill={accent} />
                <rect x={tag.x} y={tag.y - 34} width={width} height="46" rx="12" fill="#FFFDF8" stroke="#E6DFCE" strokeWidth="2" />
                <text x={tag.x + 17} y={tag.y - 2} fontFamily={font} fontSize="26" fontWeight="800" fill={palette.ink}>
                  {tag.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.58) 16%, rgba(8,9,21,.96) 32%)'}} />
    </AbsoluteFill>
  );
};

/**
 * What the deed actually lists as yours, and what it only lends you.
 *
 * One sheet, read from the top down. The camera goes where the voice goes: the
 * heading of the declaratoria, the section of the block with the flats that
 * are private and the parts that belong to everybody, the reglamento, and at
 * the foot the two lines every buyer assumes — the parking space and the
 * storage room — printed with their numbers. Beside them a chalk sign says the
 * same thing and is rubbed out, and the camera goes back up to the printed
 * line that is still there. That return is the argument of the scene.
 *
 * It was two pages that turned in the middle, and both of them stood still:
 * the paper was drawn in a single frame and then nothing moved for three
 * seconds at a time. A sheet the camera reads down carries its own rhythm —
 * the reading is the movement — and the ink is dark enough for that movement
 * to be legible on a phone, which a pale block sliding over cream never was.
 */
/** Top of the reading window, in the sheet's own coordinates, at each stop. */
const DEED_STATIONS = [0, 280, 520, 760];
/** The section of the block, drawn once inside the sheet. */
const DEED_SECTION = {left: 28, right: 728, top: 260, bottom: 790};
const DEED_STOREYS = [296, 400, 504, 608];
const DEED_ROWS = [
  {name: 'Parqueadero', code: 'Nº 12', y: 990},
  {name: 'Bodega', code: 'Nº 7', y: 1082},
];

export const HorizontalPropertySim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // Three moves of about a second and three quarters, three pauses of half a
  // second, and then the sign. Nothing waits: what is arriving into view is
  // being inked while the sheet travels.
  const lens = interpolate(
    progress,
    [0, 0.07, 0.2, 0.25, 0.37, 0.41, 0.62, 1],
    [
      DEED_STATIONS[0], DEED_STATIONS[0],
      DEED_STATIONS[1], DEED_STATIONS[1],
      DEED_STATIONS[2], DEED_STATIONS[2],
      DEED_STATIONS[3], DEED_STATIONS[3],
    ],
    {easing: Easing.bezier(0.45, 0.05, 0.55, 0.95), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const intro = (index: number) => ease(progress, 0.01 + index * 0.02, 0.06 + index * 0.02, 0, 1);
  // Each flat is inked as the reading reaches its storey.
  const flat = (index: number) => ease(progress, 0.06 + index * 0.02, 0.12 + index * 0.02, 0, 1);
  const shared = (index: number) => ease(progress, 0.26 + index * 0.04, 0.33 + index * 0.04, 0, 1);
  const mineMark = ease(progress, 0.19, 0.25, 0, 1);
  const yours = ease(progress, 0.21, 0.27, 0, 1);
  // The pill belongs to the section: it leaves when the reading does, instead
  // of hanging at the top edge of a page it no longer explains.
  const common = ease(progress, 0.38, 0.44, 0, 1) * (1 - ease(progress, 0.5, 0.55, 0, 1));
  const rules = (index: number) => ease(progress, 0.47 + index * 0.035, 0.53 + index * 0.035, 0, 1);
  const row = (index: number) => ease(progress, 0.56 + index * 0.045, 0.63 + index * 0.045, 0, 1);
  // The sign is a thing, not a layer: it lands on the paper, is written, is
  // rubbed out, and is taken away again — and the printed line is still there
  // underneath. Two of the largest movements of the scene are its arrival and
  // its exit, and they are the argument.
  // It arrives already written — a sign that exists — and everything that
  // happens to it afterwards is permanent: rubbed out, then taken away. A
  // change that undoes itself leaves the frame exactly as it found it, and
  // both the eye and `freezedetect` read those seconds as a still image.
  const sign = ease(progress, 0.65, 0.72, 0, 1);
  const wipe = ramp(progress, 0.735, 0.84, 0, 1);
  const away = ramp(progress, 0.855, 0.925, 0, 1);
  const verdict = ease(progress, 0.9, 0.95, 0, 1);
  const title = (
    <span style={{position: 'relative', display: 'block', height: 54}}>
      <span style={{position: 'absolute', left: 0, top: 0, opacity: 1 - sign}}>¿Qué es tuyo de verdad?</span>
      <span style={{position: 'absolute', left: 0, top: 0, opacity: sign}}>Y que conste por escrito</span>
    </span>
  );
  return (
    <FieldShell accent={accent} where="DECLARATORIA Y REGLAMENTO" title={title} lift={lift}>
      <div style={{position: 'relative', marginTop: 24, height: 452, borderRadius: 16, overflow: 'hidden', border: '2px solid #E8E1D0', background: '#FFFFFF'}}>
        <svg width="100%" height="100%" viewBox="0 0 756 452" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="ph-common" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="14" height="14" fill="#E7DFCC" />
              <rect width="5" height="14" fill="#B5A784" />
            </pattern>
          </defs>
          <g transform={`translate(0 ${-lens})`}>
            <rect x="0" y="-60" width="756" height="1420" fill="#FFFFFF" />
            <text x="28" y="56" fontFamily={font} fontSize="31" fontWeight="800" fill={palette.ink}>
              DECLARATORIA DE
            </text>
            <text x="28" y="96" fontFamily={font} fontSize="31" fontWeight="800" fill={palette.ink}>
              PROPIEDAD HORIZONTAL
            </text>
            {[130, 158, 186, 214].map((y, index) => (
              <rect key={`intro-${y}`} x="28" y={y} width={[700, 660, 700, 520][index] * intro(index)} height="13" rx="4" fill="#9C917A" />
            ))}

            <rect
              x={DEED_SECTION.left}
              y={DEED_SECTION.top}
              width={DEED_SECTION.right - DEED_SECTION.left}
              height={DEED_SECTION.bottom - DEED_SECTION.top}
              fill="#F6F2E9"
              stroke="#3E4A5C"
              strokeWidth="5"
            />
            {/* What belongs to everybody: the roof, the riser that runs through
                the block, the stairs and the hall, hatched as they are read. */}
            {[
              {key: 'roof', x: 28, y: 260, width: 700, height: 32},
              {key: 'riser', x: 478, y: 292, width: 110, height: 428},
              {key: 'stairs', x: 598, y: 292, width: 110, height: 428},
              {key: 'hall', x: 28, y: 720, width: 700, height: 70},
            ].map((zone, index) => (
              <g key={zone.key} opacity={shared(Math.min(2, index))}>
                <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill="url(#ph-common)" />
                <rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill="none" stroke="#7C725D" strokeWidth="3" />
              </g>
            ))}
            {/* The slabs. A section without them is a grid of pale boxes: they
                are the ink that makes the storeys count while the sheet moves. */}
            {[292, 396, 500, 604, 708].map((y) => (
              <rect key={`slab-${y}`} x="28" y={y} width="700" height="10" fill="#3E4A5C" />
            ))}
            {/* Flights of stairs, so the shared column reads as a stairwell. */}
            <g opacity={shared(1)}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
                <rect key={`step-${step}`} x={612 + (step % 2) * 42} y={312 + step * 50} width="56" height="12" rx="3" fill="#8D99A7" />
              ))}
            </g>
            {DEED_STOREYS.map((y, floor) =>
              [0, 1].map((unit) => {
                const index = floor * 2 + unit;
                const isMine = floor === 1 && unit === 0;
                const arrive = flat(index);
                return (
                  <g key={`${floor}-${unit}`} opacity={arrive}>
                    <rect x={48 + unit * 214} y={y} width="200" height="88" rx="4" fill={isMine ? accent : '#CBD9E6'} opacity={isMine ? 0.32 + mineMark * 0.68 : 0.9} />
                    <rect x={48 + unit * 214} y={y} width="200" height="88" rx="4" fill="none" stroke="#5F6E80" strokeWidth="3" />
                    <rect x={68 + unit * 214} y={y + 22} width="72" height="44" rx="3" fill="#FFFFFF" opacity=".55" />
                  </g>
                );
              }),
            )}
            <g opacity={yours}>
              <rect x="48" y="400" width="200" height="88" rx="4" fill="none" stroke={accent} strokeWidth="6" />
              <line x1="148" y1="488" x2="148" y2={ramp(yours, 0, 1, 488, 528)} stroke={accent} strokeWidth="4" strokeLinecap="round" />
              <rect x="60" y="528" width="152" height="50" rx="12" fill="#FFFDF8" stroke={accent} strokeWidth="3" />
              <text x="80" y="562" fontFamily={font} fontSize="28" fontWeight="800" fill={accent}>
                Tuyo
              </text>
            </g>
            <g opacity={common}>
              <line x1="640" y1="700" x2={ramp(common, 0, 1, 640, 640)} y2={ramp(common, 0, 1, 700, 812)} stroke="#7C725D" strokeWidth="4" strokeLinecap="round" />
              <rect x="548" y="812" width="176" height="50" rx="12" fill="#FFFDF8" stroke="#C6BCA4" strokeWidth="3" />
              <text x="570" y="846" fontFamily={font} fontSize="28" fontWeight="800" fill="#7C725D">
                Común
              </text>
            </g>

            <text x="28" y="900" fontFamily={font} fontSize="28" fontWeight="800" fill={palette.ink}>
              REGLAMENTO INTERNO
            </text>
            {[924, 952].map((y, index) => (
              <rect key={`rule-${y}`} x="28" y={y} width={[700, 600][index] * rules(index)} height="13" rx="4" fill="#9C917A" />
            ))}

            {DEED_ROWS.map((line, index) => {
              const arrive = row(index);
              return (
                <g key={line.name} opacity={arrive} transform={`translate(${(1 - arrive) * 420} 0)`}>
                  <text x="28" y={line.y + 40} fontFamily={font} fontSize="34" fontWeight="800" fill={palette.ink}>
                    {line.name}
                  </text>
                  <text x="300" y={line.y + 40} fontFamily={font} fontSize="28" fontWeight="800" fill="#8A7F69">
                    {line.code}
                  </text>
                  <rect x="424" y={line.y + 6} width="302" height="48" rx="10" fill={`${accent}22`} stroke={accent} strokeWidth="3" />
                  <text x="444" y={line.y + 40} fontFamily={font} fontSize="25" fontWeight="800" fill={accent}>
                    EN LA ESCRITURA
                  </text>
                  <rect x="28" y={line.y + 70} width="698" height="3" fill="#E2DACA" />
                </g>
              );
            })}
          </g>
        </svg>

        {/* The sign that was only ever a promise. It lands on the paper,
            is written from the left and rubbed out from the left — one box,
            one direction, never two states of the same words at once — and
            then it is taken away and the printed line is still underneath. */}
        <div
          style={{
            position: 'absolute',
            left: 46,
            top: 78,
            width: 664,
            height: 320,
            borderRadius: 18,
            background: '#3B4A44',
            border: '12px solid #8A6A4A',
            boxShadow: '0 26px 60px rgba(30,24,12,.4)',
            overflow: 'hidden',
            transform: `translateY(${(1 - sign) * 470 + away * 500}px) rotate(${(1 - sign) * 3 - away * 4}deg)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              alignContent: 'center',
              gap: 10,
              clipPath: `inset(0 0 0 ${wipe * 100}%)`,
            }}
          >
            <span style={{fontSize: 30, fontWeight: 800, color: '#CFDDD3', letterSpacing: '.14em'}}>PARQUEADERO</span>
            <span style={{fontSize: 92, fontWeight: 800, color: '#F2EFE6', letterSpacing: '.04em'}}>P-12</span>
            <span style={{fontSize: 26, fontWeight: 800, color: '#9FB3A6', letterSpacing: '.06em'}}>ASIGNADO DE PALABRA</span>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 34,
              left: `${wipe * 74}%`,
              width: 178,
              height: 244,
              borderRadius: 14,
              background: '#E9E2D2',
              border: '5px solid #C9BFA6',
              boxShadow: '0 10px 24px rgba(0,0,0,.35)',
              opacity: wipe > 0.02 && wipe < 0.98 ? 1 : 0,
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 18,
            right: 18,
            bottom: 16,
            padding: '16px 22px',
            borderRadius: 16,
            background: '#FFFDF8',
            border: `3px solid ${accent}55`,
            boxShadow: '0 18px 40px rgba(40,32,16,.18)',
            opacity: verdict,
            transform: `translateY(${(1 - verdict) * 70}px)`,
          }}
        >
          <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.02em'}}>De palabra se borra. </span>
          <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.02em', color: accent}}>La escritura no.</span>
        </div>
      </div>
    </FieldShell>
  );
};

/**
 * The monthly fee, and the paper that says the seller does not owe it.
 *
 * One bill in the hand first, so the thing is recognisable; then the same bill
 * arriving month after month, which is the part that surprises a buyer; and
 * last the certificate landing on the pile with the seal coming down on it.
 *
 * The amount used to be a hatched block, which read as a form still loading.
 * It is a figure now, and a declared one: an example monthly fee for an
 * example building, tagged `EJEMPLO` beside the number as well as in the
 * card's header. It is the same permission the piece already uses for a price
 * and an area — what stays forbidden is claiming what a fee costs anywhere.
 */
const SERVICE_CHARGE_EXAMPLE = {monthly: 85};
export const ServiceChargeSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
  const covers = ['Limpieza', 'Guardianía', 'Agua común', 'Ascensor'];
  // The single bill reads at full size, then it becomes the first sheet of a
  // pile: same object, new meaning. The months then arrive one at a time,
  // spread over the middle of the scene rather than crowded into a second and
  // a half, because the point of the pile is that it keeps coming.
  const open = ramp(progress, 0.01, 0.12, 0, 1);
  const settle = ease(progress, 0.16, 0.28, 0, 1);
  // Each month crosses the card at the speed of a hand putting it down. With
  // the series' gesture curve the flight was over in three frames and the
  // second between one bill and the next was a still image.
  const arrival = (index: number) => ramp(progress, 0.13 + index * 0.083, 0.245 + index * 0.083, 0, 1);
  // The front bill is the top of the pile: it says the month of the last one
  // that landed, counted from the arrivals themselves.
  const landed = months.slice(1).filter((_, index) => arrival(index) > 0.5).length;
  const cert = ramp(progress, 0.68, 0.79, 0, 1);
  const stamp = ease(progress, 0.82, 0.89, 0, 1);
  const ring = ease(progress, 0.87, 0.96, 0, 1);
  return (
    <FieldShell accent={accent} where="A LA ADMINISTRACIÓN" title="La alícuota, cada mes" lift={lift}>
      <div style={{position: 'relative', marginTop: 24, height: 452}}>
        {/* The bill owns the box instead of hiding in a corner of it. */}
        <div style={{position: 'absolute', left: 0, top: 6, width: 452, height: 424, opacity: open, transform: `translate(${settle * 6}px, ${(1 - open) * 300 + settle * 12}px) scale(${1 - settle * 0.06})`, transformOrigin: '0% 100%'}}>
          {months.map((month, index) => {
            if (index === 0) {
              return null;
            }
            const arrive = arrival(index - 1);
            return (
              <div
                key={month}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  border: '2px solid #E8E1D0',
                  boxShadow: '0 12px 26px rgba(40,32,16,.16)',
                  opacity: arrive > 0.001 ? 1 : 0,
                  transform: `translate(${(1 - arrive) * 620 + index * 26}px, ${index * 5}px) rotate(${(1 - arrive) * 7 + (index % 2 ? -1.2 : 1)}deg)`,
                }}
              >
                {/* A bill you can see arriving. A white sheet crossing a cream
                    card is a movement nobody registers, on a phone or in a
                    difference metric: the month rides in on its own dark band. */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 24px', borderRadius: '12px 12px 0 0', background: '#3E4A5C'}}>
                  <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '.06em', color: '#FFFFFF'}}>{month.toUpperCase()}</span>
                  <span style={{fontSize: 25, fontWeight: 800, letterSpacing: '.06em', color: '#C8D3E0'}}>ALÍCUOTA</span>
                </div>
                <div style={{padding: '22px 24px', fontSize: 46, fontWeight: 800, letterSpacing: '-.03em', color: palette.ink}}>${SERVICE_CHARGE_EXAMPLE.monthly}</div>
              </div>
            );
          })}
          <div style={{position: 'absolute', inset: 0, borderRadius: 14, background: '#FFFFFF', border: '2px solid #E8E1D0', boxShadow: '0 18px 40px rgba(40,32,16,.16)', overflow: 'hidden'}}>
            {/* Every month's bill is the same object, and it is recognisable
                from across the room: dark masthead, month, amount. */}
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '26px 24px', background: '#3E4A5C'}}>
              <span style={{fontSize: 25, fontWeight: 800, letterSpacing: '.06em', color: '#C8D3E0'}}>ALÍCUOTA</span>
              <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '.06em', color: '#FFFFFF'}}>{months[landed].toUpperCase()}</span>
            </div>
            <div style={{margin: '18px 24px 0', display: 'flex', alignItems: 'baseline', gap: 12}}>
              <span style={{fontSize: 62, fontWeight: 800, letterSpacing: '-.04em', fontVariantNumeric: 'tabular-nums'}}>${SERVICE_CHARGE_EXAMPLE.monthly}</span>
              <span style={{fontSize: 26, fontWeight: 800, color: '#8A7F69'}}>al mes</span>
              <span style={{marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, background: '#F3EFE4', border: '2px solid #E0D8C4', fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#9A8F79'}}>EJEMPLO</span>
            </div>
            <div style={{margin: '16px 24px 0', height: 3, background: '#EDE6D6'}} />
            <div style={{margin: '16px 24px 0', fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>QUÉ CUBRE</div>
            <div style={{margin: '12px 24px 0'}}>
              {covers.map((item, index) => {
                const show = ease(progress, 0.07 + index * 0.025, 0.14 + index * 0.025, 0, 1);
                return (
                  <div key={item} style={{marginTop: index ? 14 : 0, display: 'flex', alignItems: 'center', gap: 12, opacity: show, transform: `translateX(${(1 - show) * -18}px)`}}>
                    <span style={{width: 12, height: 12, borderRadius: 99, background: accent}} />
                    <span style={{fontSize: 27, fontWeight: 800, letterSpacing: '-.02em'}}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 140,
            width: 336,
            padding: '22px 22px 26px',
            borderRadius: 16,
            background: '#FFFDF8',
            border: `3px solid ${accent}55`,
            boxShadow: '0 22px 52px rgba(40,32,16,.2)',
            opacity: cert > 0.001 ? 1 : 0,
            transform: `translate(${(1 - cert) * 520}px, ${(1 - cert) * -40}px) rotate(${(1 - cert) * 8 - 1.4}deg)`,
          }}
        >
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: '#9A8F79'}}>CERTIFICADO</div>
          <div style={{marginTop: 8, fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.14}}>
            El vendedor
            <br />
            está al día
          </div>
          <div style={{marginTop: 10, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Firmado por la administración</div>
          <div style={{position: 'relative', marginTop: 18, height: 104}}>
            <div
              style={{
                position: 'absolute',
                right: 4,
                top: 0,
                width: 104,
                height: 104,
                borderRadius: 999,
                border: `5px solid ${accent}`,
                color: accent,
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: '.06em',
                opacity: stamp,
                transform: `scale(${2.4 - stamp * 1.4}) rotate(${-16 + stamp * 8}deg)`,
              }}
            >
              AL DÍA
            </div>
            <div
              style={{
                position: 'absolute',
                right: 4,
                top: 0,
                width: 104,
                height: 104,
                borderRadius: 999,
                border: `3px solid ${accent}`,
                opacity: ring * (1 - ring) * 3.4,
                transform: `scale(${1 + ring * 0.5})`,
              }}
            />
            <div style={{position: 'absolute', left: 0, bottom: 4, width: 140, height: 3, background: '#DED6C4'}} />
          </div>
        </div>
      </div>
    </FieldShell>
  );
};

/**
 * The minutes first, then the building they were talking about.
 *
 * One idea in two beats joined by a cause: the assembly approved an
 * extraordinary fee because something big has to be fixed, so you go and look
 * at the things that break. The sheet is read, one line of the agenda is
 * highlighted, the approval answers underneath, and then the paper is set down
 * — it slides out of frame downwards — leaving the section of the building
 * behind it. From there the camera never cuts: it descends from the roof tank
 * to the lift, to the pump room, to the damp corner of a corridor, stopping at
 * each one long enough to read its label. The proof is the last frame: the
 * four stops walked, marked on the rail, with the fee that started it still
 * pinned in the corner.
 *
 * Continuity with scene one is deliberate: same ink for the roof slab, same
 * paper for the walls, same pavement and asphalt at the bottom of the descent,
 * so the two scenes read as the same building seen from outside and from
 * inside.
 *
 * Every milestone is a fraction of the run, camera included, so the arc lands
 * whether the line takes six seconds or twenty.
 *
 * The word on screen is «cuota extraordinaria»: «derrama» is Spain's word for
 * it and nobody says it in Ecuador.
 */

/** The section of the building, drawn once in world coordinates. */
const BUILDING_WORLD = {
  wallLeft: 48,
  wallRight: 708,
  roof: 118,
  ground: 1390,
  slabs: [118, 300, 482, 664, 846, 1028, 1210, 1390],
  shaft: {x: 560, width: 100, top: 118, bottom: 1210},
};

/**
 * Air above the roof.
 *
 * The tour's first stop is the water tank, and with the camera pinned at world
 * zero the tank's inlet pipe touched the top edge of the panel: the thing the
 * callout points at was being cropped by the frame. Every world coordinate is
 * pushed down by this much instead of being retyped one by one.
 */
const BUILDING_SKY = 60;

type BuildingStop = {
  label: string;
  note: string;
  /** Top of the visible window, in world coordinates. */
  camera: number;
  /** Where the callout sits and what it points at, in world coordinates. */
  pill: [number, number];
  target: [number, number];
  from: number;
  to: number;
};

const BUILDING_STOPS: BuildingStop[] = [
  {label: 'Cisterna', note: 'De dónde sale el agua', camera: 0, pill: [96, 190], target: [440, 96], from: 0, to: 0.2},
  {label: 'Ascensor', note: 'Que abra y cierre', camera: 330, pill: [180, 560], target: [560, 585], from: 0.26, to: 0.48},
  {label: 'Bomba', note: 'El cuarto de máquinas', camera: 700, pill: [396, 800], target: [300, 905], from: 0.54, to: 0.76},
  {label: 'Humedades', note: 'En los pasillos', camera: 1060, pill: [96, 1230], target: [500, 1288], from: 0.82, to: 1.4},
];

/**
 * The walk, written as time rather than as distance.
 *
 * Each entry is where the camera is at that point of the tour: it descends for
 * about two seconds and stands still for half a one, which is what a person
 * walking a building does. The curve matters as much as the numbers — the
 * series' gesture ease covers four fifths of a descent in its first quarter
 * and then creeps, so the tour used to arrive early and wait, and a stop of
 * two and a half seconds is a still image with a caption over it.
 */
const BUILDING_TOUR: Array<[number, number]> = [
  [0, 0], [0.06, 0], [0.28, 1], [0.34, 1], [0.56, 2], [0.62, 2], [0.84, 3], [1, 3],
];

export const BuildingStateSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});

  // Beat one: the minutes of the last meetings — three of them, arriving one
  // on top of another, because that is what the voice asks for — and then the
  // line that costs money, marked on the one on top.
  const sheet = (index: number) => ramp(progress, 0.01 + index * 0.07, 0.12 + index * 0.07, 0, 1);
  const agenda = (index: number) => ease(progress, 0.17 + index * 0.025, 0.24 + index * 0.025, 0, 1);
  const highlight = ramp(progress, 0.25, 0.31, 0, 1);
  // The camera closes on the line that costs money: the beat that carries the
  // middle of the sheet, where four staggered rules of grey never could.
  const focusLine = ramp(progress, 0.28, 0.38, 0, 1);
  const approved = ramp(progress, 0.33, 0.4, 0, 1);
  // The handoff lands on «Y camina el edificio»: the sheets are set down
  // exactly when the voice stops talking about them.
  const handoff = ramp(progress, 0.41, 0.49, 0, 1);

  // Beat two: the walk down. Milestones are fractions of the tour, and the
  // tour is a fraction of the run, so no stop is ever cut in half.
  const tourAt = (t: number) => 0.47 + 0.51 * t;
  const camera = interpolate(
    progress,
    BUILDING_TOUR.map(([at]) => tourAt(at)),
    BUILDING_TOUR.map(([, stop]) => BUILDING_STOPS[stop].camera),
    {easing: Easing.bezier(0.45, 0.05, 0.55, 0.95), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // What the panel is actually looking at, once the roof has been given air.
  const lens = camera - BUILDING_SKY;
  const focus = BUILDING_STOPS.map((stop) =>
    Math.max(0, ease(progress, tourAt(stop.from), tourAt(stop.from + 0.05), 0, 1) - ease(progress, tourAt(stop.to), tourAt(stop.to + 0.05), 0, 1)),
  );
  const reached = BUILDING_STOPS.map((stop) => ease(progress, tourAt(stop.from - 0.02), tourAt(stop.from + 0.04), 0, 1));

  // Micro answers, each one owned by the stop it belongs to.
  const water = focus[0];
  // The car climbs while the camera is watching the shaft, not before it.
  const cab = ramp(progress, tourAt(0.28), tourAt(0.46), 180, 530);
  const doors = ramp(progress, tourAt(0.46), tourAt(0.54), 0, 1);
  const impeller = frame * 3.4;
  const pulse = ease(progress, tourAt(0.58), tourAt(0.7), 0, 1);
  const damp = ramp(progress, tourAt(0.86), tourAt(0.99), 0, 1);

  const title = (
    <span style={{position: 'relative', display: 'block', height: 54}}>
      {/* Disjoint windows, never a crossfade: two titles at half opacity in
          the same box read as one garbled line, not as a change of subject. */}
      <span style={{position: 'absolute', left: 0, top: 0, opacity: 1 - ramp(progress, 0.41, 0.45, 0, 1)}}>Lo que ya se decidió</span>
      <span style={{position: 'absolute', left: 0, top: 0, opacity: ramp(progress, 0.45, 0.49, 0, 1)}}>Y camina el edificio</span>
    </span>
  );

  return (
    <FieldShell accent={accent} where="ACTAS Y EDIFICIO" title={title} lift={lift}>
      <div style={{position: 'relative', marginTop: 22, height: 452, borderRadius: 18, overflow: 'hidden', border: '2px solid #E8E1D0', background: '#F0EDE4'}}>
        <svg width="100%" height="100%" viewBox="0 0 756 452" preserveAspectRatio="xMidYMid slice">
          <g transform={`translate(0 ${-lens})`}>
            <rect x="-40" y="-200" width="840" height="1800" fill="#EDEAE1" />
            <rect x="-40" y={BUILDING_WORLD.ground} width="840" height="30" fill="#CFCABA" />
            <rect x="-40" y={BUILDING_WORLD.ground + 30} width="840" height="200" fill="#9EA5AE" />
            {[20, 240, 460, 680].map((x) => (
              <rect key={`asphalt-${x}`} x={x} y={BUILDING_WORLD.ground + 78} width="96" height="9" rx="4" fill="#E6E9EC" opacity=".7" />
            ))}

            {/* The envelope first. Without a dark outline, a roof cap and slabs
                you can actually see, the section read as a pale grid of
                rectangles rather than as a building. */}
            <rect
              x={BUILDING_WORLD.wallLeft}
              y={BUILDING_WORLD.roof}
              width={BUILDING_WORLD.wallRight - BUILDING_WORLD.wallLeft}
              height={BUILDING_WORLD.ground - BUILDING_WORLD.roof}
              fill="#F8F4EB"
              stroke="#3E4A5C"
              strokeWidth="6"
            />
            <rect x={BUILDING_WORLD.wallLeft} y={BUILDING_WORLD.roof} width="30" height={BUILDING_WORLD.ground - BUILDING_WORLD.roof} fill="#E2DACA" />
            <rect x={BUILDING_WORLD.wallRight - 30} y={BUILDING_WORLD.roof} width="30" height={BUILDING_WORLD.ground - BUILDING_WORLD.roof} fill="#E2DACA" />
            {/* Same ink as the roof slab of scene one: it is the same building. */}
            <rect x="32" y="92" width="692" height="26" rx="4" fill="#4A5768" />
            {/* The slabs are the ink of the section: pale bands made the walk
                down read as a still picture of beige boxes, on a phone and in
                the difference between one frame and the next. */}
            {BUILDING_WORLD.slabs.map((y) => (
              <g key={`slab-${y}`}>
                <rect x={BUILDING_WORLD.wallLeft} y={y} width={BUILDING_WORLD.wallRight - BUILDING_WORLD.wallLeft} height="18" fill="#3E4A5C" />
                <rect x={BUILDING_WORLD.wallLeft} y={y + 18} width={BUILDING_WORLD.wallRight - BUILDING_WORLD.wallLeft} height="5" fill="#9A8C6E" />
              </g>
            ))}
            {BUILDING_WORLD.slabs.slice(0, 6).map((y) => (
              <g key={`rooms-${y}`}>
                {/* Partitions, rooms and the windows of the façade, so each
                    storey reads as a home and not as an empty cell. */}
                <rect x="250" y={y + 16} width="10" height="166" fill="#A99C82" />
                <rect x="430" y={y + 16} width="10" height="166" fill="#A99C82" />
                <rect x="96" y={y + 112} width="90" height="70" rx="4" fill="#E2DBCB" stroke="#8D99A7" strokeWidth="3" />
                <rect x="300" y={y + 112} width="90" height="70" rx="4" fill="#E2DBCB" stroke="#8D99A7" strokeWidth="3" />
                <rect x={BUILDING_WORLD.wallLeft + 7} y={y + 52} width="16" height="60" rx="3" fill="#8397AB" />
                <rect x={BUILDING_WORLD.wallRight - 23} y={y + 52} width="16" height="60" rx="3" fill="#8397AB" />
                <rect x={BUILDING_WORLD.wallLeft - 20} y={y + 156} width="20" height="10" rx="3" fill="#CFC5AE" />
                <rect x={BUILDING_WORLD.wallRight} y={y + 156} width="20" height="10" rx="3" fill="#CFC5AE" />
              </g>
            ))}

            {/* The riser: the pump downstairs is what fills the tank upstairs. */}
            <path d="M104 1000 V138 H520 V96" stroke="#C6CFDA" strokeWidth="10" fill="none" strokeLinejoin="round" />
            <path
              d="M104 1000 V138 H520 V96"
              stroke={accent}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="80 3000"
              strokeDashoffset={-pulse * 1040}
              opacity={focus[2] * 0.9}
            />

            <rect x="430" y="22" width="190" height="74" rx="12" fill="#B9C3CE" stroke="#8D99A7" strokeWidth="3" />
            <rect x="470" y="6" width="16" height="18" rx="4" fill="#8D99A7" />
            <rect x="442" y={90 - (10 + water * 26)} width="166" height={10 + water * 26} rx="4" fill={accent} opacity=".72" />

            <rect x={BUILDING_WORLD.shaft.x} y={BUILDING_WORLD.shaft.top} width={BUILDING_WORLD.shaft.width} height={BUILDING_WORLD.shaft.bottom - BUILDING_WORLD.shaft.top} fill="#EAE3D4" stroke="#C8BFA9" strokeWidth="3" />
            {BUILDING_WORLD.slabs.slice(0, 6).map((y) => (
              <rect key={`landing-${y}`} x={BUILDING_WORLD.shaft.x - 14} y={y + 96} width="14" height="86" fill="#DDD5C3" />
            ))}
            <g>
              <rect x="568" y={cab} width="84" height="110" rx="6" fill={`${accent}2E`} stroke={accent} strokeWidth="3" />
              <rect x={568 - doors * 38} y={cab + 8} width="40" height="94" rx="3" fill={accent} opacity=".9" />
              <rect x={612 + doors * 38} y={cab + 8} width="40" height="94" rx="3" fill={accent} opacity=".9" />
            </g>

            <g>
              <rect x="96" y="966" width="320" height="18" rx="4" fill="#C8C0AE" />
              {[170, 330].map((cx) => (
                <g key={`pump-${cx}`}>
                  <rect x={cx + 40} y="898" width="86" height="46" rx="10" fill="#9AA6B4" />
                  <circle cx={cx} cy="920" r="44" fill="#B9C3CE" stroke="#8D99A7" strokeWidth="3" />
                  <g transform={`rotate(${impeller} ${cx} 920)`} opacity={0.35 + focus[2] * 0.55}>
                    {[0, 45, 90, 135].map((angle) => (
                      <rect key={angle} x={cx - 2.5} y="892" width="5" height="56" rx="2" fill="#6F7D8C" transform={`rotate(${angle} ${cx} 920)`} />
                    ))}
                  </g>
                  <path d={`M${cx} 876 V856 H104`} stroke="#C6CFDA" strokeWidth="8" fill="none" />
                </g>
              ))}
            </g>

            <g>
              <rect x="96" y="1226" width="96" height="164" rx="4" fill="#E4DFD2" stroke="#D0C8B6" strokeWidth="3" />
              <circle cx="176" cy="1310" r="6" fill="#8D99A7" />
              <rect x="250" y="1226" width="330" height="164" fill="#F5F1E8" />
              <rect x="250" y="1226" width="330" height="8" fill="#E4DFD2" />
              {[266, 356].map((x) => (
                <g key={`door-${x}`}>
                  <rect x={x} y="1250" width="66" height="140" rx="3" fill="#E9E2D3" stroke="#D3CAB7" strokeWidth="3" />
                  <circle cx={x + 56} cy="1322" r="5" fill="#A99C82" />
                </g>
              ))}
              {/* Damp climbs a corner, it does not float in the middle of a
                  corridor: the stain hangs off the partition and spreads down. */}
              <g opacity={damp} transform={`translate(${(1 - damp) * 12} 0)`}>
                <path
                  d="M580 1226C530 1226 486 1232 474 1256C462 1280 490 1296 486 1318C482 1340 508 1352 530 1348C552 1344 562 1326 580 1326Z"
                  fill="#B9926E"
                  opacity=".45"
                />
                <path
                  d="M580 1240C544 1240 514 1246 508 1268C502 1290 524 1300 524 1316C524 1330 542 1334 556 1328C568 1323 568 1312 580 1310Z"
                  fill="#8E6A46"
                  opacity=".42"
                />
              </g>
              <rect x="620" y="1240" width="80" height="150" rx="4" fill="#D9D3C6" stroke="#C4BCA9" strokeWidth="3" />
            </g>
          </g>

          {BUILDING_STOPS.map((stop, index) => {
            const show = focus[index];
            if (show <= 0.001) return null;
            const width = Math.max(stop.label.length * 15, stop.note.length * 12) + 34;
            const [px, py] = stop.pill;
            const [tx, ty] = stop.target;
            const anchorX = px < tx ? px + width : px;
            const anchorY = py - lens + 16;
            return (
              <g key={stop.label} opacity={show}>
                <line
                  x1={anchorX}
                  y1={anchorY}
                  x2={anchorX + (tx - anchorX) * show}
                  y2={anchorY + (ty - lens - anchorY) * show}
                  stroke={accent}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx={tx} cy={ty - lens} r={5 * show} fill={accent} />
                <rect x={px} y={py - lens - 16} width={width} height="80" rx="14" fill="#FFFDF8" stroke="#E6DFCE" strokeWidth="2" />
                <text x={px + 18} y={py - lens + 16} fontFamily={font} fontSize="28" fontWeight="800" fill={palette.ink}>
                  {stop.label}
                </text>
                <text x={px + 18} y={py - lens + 48} fontFamily={font} fontSize="22" fontWeight="700" fill="#8A7F69">
                  {stop.note}
                </text>
              </g>
            );
          })}
        </svg>

        {/* The four dots used to float on the right edge with nothing to say
            what they counted. They are the walk, and now they say so. */}
        <div
          style={{
            position: 'absolute',
            right: 18,
            bottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '11px 18px',
            borderRadius: 99,
            background: '#FFFDF8',
            border: '2px solid #E6DFCE',
            opacity: handoff,
            transform: `translateY(${(1 - handoff) * 18}px)`,
          }}
        >
          <span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: '#9A8F79'}}>RECORRIDO</span>
          <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
            {BUILDING_STOPS.map((stop, index) => (
              <span
                key={`walk-${stop.label}`}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 99,
                  background: reached[index] > 0.5 ? accent : 'transparent',
                  border: `3px solid ${reached[index] > 0.5 ? accent : '#D6CCB6'}`,
                }}
              />
            ))}
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 20px',
            borderRadius: 99,
            background: '#FFFDF8',
            border: '2px solid #E0B584',
            opacity: handoff,
            transform: `translateY(${(1 - handoff) * 18}px)`,
          }}
        >
          <span style={{width: 12, height: 12, borderRadius: 99, background: '#C08A3E'}} />
          <span style={{fontSize: 22, fontWeight: 800, color: '#8A5A22', letterSpacing: '.02em'}}>Cuota extraordinaria aprobada</span>
        </div>

        {/* «Las actas de las últimas asambleas»: three of them, arriving one on
            top of another. Each sheet is the size of the panel, so the reading
            starts with three movements a phone can see instead of a page that
            was simply already there. */}
        {[0, 1].map((index) => {
          const arrive = sheet(index);
          return (
            <div
              key={`minutes-${index}`}
              style={{
                position: 'absolute',
                inset: 0,
                background: '#FFFDF8',
                border: '2px solid #EFE7D6',
                boxShadow: '0 16px 34px rgba(40,32,16,.16)',
                transform: `translate(${(1 - arrive) * 700 + (2 - index) * 30}px, ${handoff * 500 - (2 - index) * 38}px) rotate(${(1 - arrive) * 5 + (index % 2 ? 2.4 : -2.6)}deg)`,
              }}
            >
              <div style={{padding: '22px 28px', background: '#3E4A5C', fontSize: 24, fontWeight: 800, letterSpacing: '.07em', color: '#FFFFFF'}}>ACTA DE ASAMBLEA</div>
              <div style={{padding: '26px 28px'}}>
                <div style={{height: 14, width: 420, borderRadius: 99, background: '#A99C82'}} />
                <div style={{marginTop: 16, height: 14, width: 340, borderRadius: 99, background: '#A99C82'}} />
                <div style={{marginTop: 16, height: 14, width: 386, borderRadius: 99, background: '#A99C82'}} />
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#FFFDF8',
            border: '2px solid #EFE7D6',
            boxShadow: '0 18px 40px rgba(40,32,16,.18)',
            // The push has to keep the levy inside the frame: at 34% and an
            // origin above it, the closing line — the one the voice is saying —
            // was pushed past the bottom of the card and cut in half.
            transformOrigin: '14% 58%',
            transform: `translate(${(1 - sheet(2)) * 700}px, ${handoff * 500}px) rotate(${(1 - sheet(2)) * 5}deg) scale(${1 + focusLine * 0.2})`,
          }}
        >
          <div style={{padding: '22px 28px', background: '#3E4A5C', fontSize: 24, fontWeight: 800, letterSpacing: '.07em', color: '#FFFFFF'}}>ACTA DE ASAMBLEA</div>
          <div style={{padding: '24px 28px 0'}}>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 16, marginTop: index ? 14 : 0, height: 36}}>
                <span style={{fontSize: 22, fontWeight: 800, color: '#B7AD97', width: 22}}>{index + 1}</span>
                {index === 2 ? (
                  <span style={{position: 'relative'}}>
                    <span style={{position: 'absolute', left: -8, top: 0, height: 32, width: `${highlight * 372}px`, borderRadius: 6, background: `${accent}33`}} />
                    <span style={{position: 'relative', fontSize: 28, fontWeight: 800, opacity: agenda(index)}}>Cambio de la bomba de agua</span>
                  </span>
                ) : (
                  <span style={{height: 14, width: `${[420, 350, 0, 300][index] * agenda(index)}px`, borderRadius: 99, background: '#A99C82'}} />
                )}
              </div>
            ))}
            {/* The decision that costs money is the one thing on the sheet that
                is not printed in grey: it arrives as a solid band, because it
                is the beat the voice is naming. */}
            <div
              style={{
                marginTop: 20,
                padding: '18px 24px',
                borderRadius: 14,
                background: '#C08A3E',
                border: '3px solid #A2712C',
                // It used to slide in from the left, and the card clips: for
                // half a second the viewer saw a growing orange rectangle with
                // no text on it. It rises into place with its words already on.
                opacity: approved,
                transform: `translateY(${(1 - approved) * 18}px)`,
              }}
            >
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.06em', color: '#FFF1DC'}}>CUOTA EXTRAORDINARIA</div>
              <div style={{marginTop: 6, fontSize: 30, fontWeight: 800, color: '#FFFFFF'}}>Aprobada por la asamblea</div>
            </div>
            {/* The signature line yields its space to the levy: the sheet is
                taller than the card once both are on it, and what got cut was
                the sentence the voice is saying. */}
            <div style={{marginTop: 20 * (1 - approved), height: 34 * (1 - approved), opacity: 1 - approved, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', gap: 16}}>
              <span style={{fontSize: 22, fontWeight: 800, color: '#B7AD97'}}>Firmas</span>
              <svg width="220" height="34" viewBox="0 0 220 34" fill="none">
                <path d="M4 26c18-18 26 4 40-6s16-16 30-6 20 18 34 8 22-18 36-10 26 14 40 6" stroke="#C9C0AA" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </FieldShell>
  );
};

/** 95000 → "95.000", the way an amount is written in Ecuador. */
const grouped = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Two listings, and the metres each one is counting.
 *
 * The division itself is the easy part; the trap is the area you divide by.
 * Listing A publishes the total it was sold with, common areas included, so
 * its price per metre comes out low and it looks like the bargain. The tap
 * opens that area up — the same bar splits into what you actually live in and
 * what is shared — and the number is worked out again over the usable part.
 * The proof is the reversal: the one that looked cheaper is the dearer of the
 * two, and both cards now measure the same thing.
 *
 * Every figure here is an example, and the card says so: the price, the total
 * and the usable area belong to an illustrative flat, sized like a flat. The
 * piece teaches the division; it never claims what a metre costs in any city.
 *
 * No figure is ever interpolated. A number that counts up from zero states a
 * different amount on every frame, and all of them except the last are false —
 * the master shipped with «$0/m²» readable on screen for the better part of a
 * second. Amounts arrive already correct, as a unit, by opacity and offset.
 *
 * For the same reason nothing here cross-fades text. Two different strings
 * blended in one box produced «95 útiles de útiles declarados» and «POR M²
 * ÚTILARADO»: the old words now leave completely before the new ones start.
 */
const USABLE_AREA_EXAMPLE = {
  price: 95000,
  declared: 95,
  usable: 68,
  rival: {price: 92000, usable: 68},
};

/**
 * A swap of one string for another in a fixed box, with no overlap.
 *
 * `out` and `in` are separate windows with a gap between them, so at every
 * frame at most one of the two is painted. The exiting words lift and fade,
 * the arriving ones rise into place: a replacement, never a blend.
 */
const Swap: React.FC<{
  out: number;
  enter: number;
  height: number;
  before: React.ReactNode;
  after: React.ReactNode;
}> = ({out, enter, height, before, after}) => (
  <div style={{position: 'relative', height}}>
    {out < 1 ? (
      <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - out, transform: `translateY(${out * -12}px)`}}>{before}</div>
    ) : null}
    {enter > 0 ? (
      <div style={{position: 'absolute', left: 0, top: 0, opacity: enter, transform: `translateY(${(1 - enter) * 14}px)`}}>{after}</div>
    ) : null}
  </div>
);

/**
 * A price per metre, revealed whole.
 *
 * The box keeps its size from the first frame — the division is set up and
 * visible — and only the result arrives, already correct.
 */
const UnitPrice: React.FC<{amount: number; accent: string; enter: number}> = ({amount, accent, enter}) => (
  <span
    style={{
      display: 'inline-block',
      fontSize: 38,
      fontWeight: 800,
      letterSpacing: '-.04em',
      color: accent,
      fontVariantNumeric: 'tabular-nums',
      opacity: enter,
      transform: `translateY(${(1 - enter) * 12}px)`,
    }}
  >
    ${grouped(amount)}
    <span style={{fontSize: 24}}>/m²</span>
  </span>
);

export const UsableAreaSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const example = USABLE_AREA_EXAMPLE;
  const common = example.declared - example.usable;
  // The three amounts, worked out once. They are only ever shown finished.
  const unitDeclared = example.price / example.declared;
  const unitUsable = example.price / example.usable;
  const unitRival = example.rival.price / example.rival.usable;

  // Beat one: both listings land and each one shows its own division.
  const cardA = ease(progress, 0.02, 0.14, 0, 1);
  const cardB = ease(progress, 0.08, 0.2, 0, 1);
  const showUnitA = ease(progress, 0.17, 0.23, 0, 1);
  const showUnitB = ease(progress, 0.24, 0.3, 0, 1);
  const seemsCheaper = Math.max(0, ease(progress, 0.33, 0.39, 0, 1) - ease(progress, 0.6, 0.65, 0, 1));
  // Beat two: the tap that opens the declared area. The area line is replaced,
  // not blended: it leaves before the split wording arrives.
  const tap = Math.max(0, ease(progress, 0.4, 0.45, 0, 1) - ease(progress, 0.47, 0.52, 0, 1));
  const ripple = ease(progress, 0.43, 0.54, 0, 1);
  const areaOut = ease(progress, 0.44, 0.485, 0, 1);
  const areaIn = ease(progress, 0.5, 0.57, 0, 1);
  const split = ease(progress, 0.46, 0.6, 0, 1);
  // Beat three: the same price over the usable metres. Label and amount are
  // swapped with a gap between the exit and the entrance.
  const unitOut = ease(progress, 0.63, 0.672, 0, 1);
  const unitIn = ease(progress, 0.686, 0.75, 0, 1);
  const verdict = ease(progress, 0.76, 0.83, 0, 1);
  const closing = ease(progress, 0.8, 0.88, 0, 1);

  // One scale for both bars: 320 px is the declared area, so the usable part of
  // A and the whole of B come out exactly the same length when they are equal.
  const barWidth = 320;
  const usableWidth = (example.usable / example.declared) * barWidth;
  const commonWidth = barWidth - usableWidth;
  const hatch = 'repeating-linear-gradient(45deg, #C9C3B4 0 6px, #E4DECF 6px 12px)';

  const cardStyle = (enter: number): React.CSSProperties => ({
    position: 'relative',
    padding: 18,
    borderRadius: 22,
    background: '#FFFFFF',
    border: '2px solid #E8E1D0',
    boxShadow: '0 14px 32px rgba(40,32,16,.10)',
    opacity: enter,
    transform: `translateY(${(1 - enter) * 26}px)`,
  });

  // The winner is marked by a ring that fades in over the card, so the border
  // does not jump from one colour to another on a single frame.
  const ring = (strength: number): React.CSSProperties => ({
    position: 'absolute',
    inset: -2,
    borderRadius: 22,
    border: `2px solid ${accent}66`,
    boxShadow: `0 18px 40px ${accent}22`,
    opacity: strength,
    pointerEvents: 'none',
  });

  const unitLabel = (text: string) => (
    <span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.04em', color: '#8A7F69', whiteSpace: 'nowrap'}}>{text}</span>
  );

  return (
    <FieldShell accent={accent} where="COMPARANDO ANUNCIOS" title="¿Qué metros te cuentan?" lift={lift}>
      <div style={{marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch'}}>
        <div style={cardStyle(cardA)}>
          <div style={ring(1 - verdict)} />
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>ANUNCIO A</div>
          <div style={{marginTop: 6, fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums'}}>${grouped(example.price)}</div>
          <div style={{position: 'relative', marginTop: 8}}>
            <Swap
              out={areaOut}
              enter={areaIn}
              height={32}
              before={<span style={{fontSize: 24, fontWeight: 700, color: '#8A7F69', whiteSpace: 'nowrap'}}>{example.declared} m² declarados</span>}
              after={
                <span style={{fontSize: 24, fontWeight: 700, color: '#8A7F69', whiteSpace: 'nowrap'}}>
                  <span style={{color: accent, fontWeight: 800}}>{example.usable} útiles</span> + {common} comunes
                </span>
              }
            />
            <div
              style={{
                position: 'absolute',
                left: 214,
                top: -4,
                width: 40,
                height: 40,
                borderRadius: 99,
                border: `3px solid ${accent}`,
                background: `${accent}22`,
                opacity: tap,
                transform: `scale(${0.7 + tap * 0.3})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 214,
                top: -4,
                width: 40,
                height: 40,
                borderRadius: 99,
                border: `3px solid ${accent}`,
                opacity: ripple * (1 - ripple) * 3.6,
                transform: `scale(${1 + ripple * 1.4})`,
              }}
            />
          </div>
          <div style={{position: 'relative', marginTop: 12, height: 26}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: usableWidth, height: 26, borderRadius: 8, background: accent}} />
            <div style={{position: 'absolute', left: usableWidth + split * 8, top: 0, width: commonWidth, height: 26, borderRadius: 8, background: accent, opacity: 1 - split}} />
            <div style={{position: 'absolute', left: usableWidth + split * 8, top: 0, width: commonWidth, height: 26, borderRadius: 8, background: hatch, opacity: split}} />
          </div>
          <div style={{marginTop: 14, padding: '12px 16px', borderRadius: 16, background: '#F3EFE4', border: '2px solid #E8E1D0'}}>
            <Swap out={unitOut} enter={unitIn} height={28} before={unitLabel('POR M² DECLARADO')} after={unitLabel('POR M² ÚTIL')} />
            <div style={{position: 'relative', height: 46}}>
              {unitOut < 1 ? (
                <div style={{position: 'absolute', left: 0, top: 0, opacity: 1 - unitOut, transform: `translateY(${unitOut * -12}px)`}}>
                  <UnitPrice amount={unitDeclared} accent={accent} enter={showUnitA} />
                </div>
              ) : null}
              {unitIn > 0 ? (
                <div style={{position: 'absolute', left: 0, top: 0}}>
                  <UnitPrice amount={unitUsable} accent={accent} enter={unitIn} />
                </div>
              ) : null}
            </div>
          </div>
          <div style={{marginTop: 8, padding: '8px 14px', borderRadius: 99, background: '#FFF6EA', border: '2px solid #E0B584', fontSize: 22, fontWeight: 800, color: '#8A5A22', opacity: seemsCheaper}}>
            Parece más barato
          </div>
        </div>

        <div style={cardStyle(cardB)}>
          <div style={ring(verdict)} />
          <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>ANUNCIO B</div>
          <div style={{marginTop: 6, fontSize: 38, fontWeight: 800, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums'}}>${grouped(example.rival.price)}</div>
          <div style={{marginTop: 8, height: 32, fontSize: 24, fontWeight: 700, color: '#8A7F69', whiteSpace: 'nowrap'}}>
            <span style={{color: accent, fontWeight: 800}}>{example.rival.usable} útiles</span> declarados
          </div>
          <div style={{position: 'relative', marginTop: 12, height: 26}}>
            <div style={{position: 'absolute', left: 0, top: 0, width: usableWidth, height: 26, borderRadius: 8, background: accent}} />
          </div>
          <div style={{marginTop: 14, padding: '12px 16px', borderRadius: 16, background: '#F3EFE4', border: '2px solid #E8E1D0'}}>
            <div style={{height: 28}}>{unitLabel('POR M² ÚTIL')}</div>
            <div style={{height: 46}}>
              <UnitPrice amount={unitRival} accent={accent} enter={showUnitB} />
            </div>
          </div>
          <div style={{marginTop: 8, padding: '8px 14px', borderRadius: 99, background: `${accent}14`, border: `2px solid ${accent}45`, fontSize: 22, fontWeight: 800, color: accent, opacity: verdict}}>
            Más barato por m² útil
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 18,
          padding: '18px 22px',
          borderRadius: 18,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          fontSize: 28,
          fontWeight: 800,
          opacity: closing,
          transform: `translateY(${(1 - closing) * 20}px)`,
        }}
      >
        Divide siempre por los metros útiles
      </div>
    </FieldShell>
  );
};

/**
 * The building, marked on the map, with the city it sits in around it.
 *
 * This is the one claim of the piece about the product, so it shows exactly
 * what the product does and nothing else: the basemap of streets the portal
 * mounts (`carto-base` in `frontend/components/maps/maplibre-style.ts`), the
 * property drawn with the real marker — the type teardrop of `mapMarkers.ts`,
 * with the flat icon and the «Seleccionada» chip the detail map paints — and
 * the fly-to that centres a selected listing (`MapLibreMap.tsx`). There is no
 * annotation layer in the product, so nothing here names an avenue or traces a
 * route: the fabric of streets and blocks is what you actually see, and it is
 * enough to read the zone before going.
 *
 * Only one marker is drawn. Filling the map with listings would be painting
 * inventory, which no piece may claim.
 */
const CITY_COLUMNS = [-60, 140, 330, 520, 690, 820];
const CITY_ROWS = [-60, 90, 250, 390, 530];
const CITY_FOOTPRINTS: Array<[number, number, number, number]> = [];
for (let row = 0; row < CITY_ROWS.length - 1; row += 1) {
  for (let column = 0; column < CITY_COLUMNS.length - 1; column += 1) {
    const x0 = CITY_COLUMNS[column] + 16;
    const y0 = CITY_ROWS[row] + 16;
    const x1 = CITY_COLUMNS[column + 1] - 16;
    const y1 = CITY_ROWS[row + 1] - 16;
    for (let slot = 0; slot < 4; slot += 1) {
      const width = 42 + ((row * 7 + column * 11 + slot * 5) % 30);
      const height = 34 + ((row * 5 + column * 13 + slot * 3) % 26);
      const x = x0 + (slot % 2) * ((x1 - x0) / 2) + ((slot * 9 + column * 4) % 14);
      const y = y0 + Math.floor(slot / 2) * ((y1 - y0) / 2) + ((slot * 7 + row * 6) % 12);
      if (x + width < x1 && y + height < y1) CITY_FOOTPRINTS.push([x, y, width, height]);
    }
  }
}

const MAP_MARKER: [number, number] = [420, 180];
/** The flat icon of the product, `TYPE_ICON_PATHS.apartment` in `mapMarkers.ts`. */
const FLAT_ICON =
  'M3 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v4h7a1 1 0 0 1 1 1v12zM6 6v2h2V6zm4 0v2h2V6zM6 10v2h2v-2zm4 0v2h2v-2zM6 14v2h2v-2zm4 0v2h2v-2zm6-2v2h2v-2zm0 4v2h2v-2z';

export const BuildingSurroundingsSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const liftIn = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // The tiles settle first, the way a basemap arrives before its data.
  const tiles = ease(progress, 0.02, 0.12, 0, 1);
  // The marker lands early: this is the one scene that shows the product, and
  // a basemap on its own is not the product. The first master left a still
  // grid on screen for four seconds before anything happened.
  const drop = interpolate(progress, [0.1, 0.2, 0.25], [-96, 10, 0], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pin = ease(progress, 0.1, 0.19, 0, 1);
  const land = ease(progress, 0.19, 0.32, 0, 1);
  // Selecting a listing flies the map to it: a real approach, with one damped
  // overshoot at the end so the camera reads as arriving rather than drifting.
  const zoom = interpolate(progress, [0.24, 0.74, 0.87], [0.92, 2.16, 2.02], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const camX = ease(progress, 0.24, 0.8, 376, MAP_MARKER[0]);
  const camY = ease(progress, 0.24, 0.8, 235, MAP_MARKER[1]);
  const detail = ease(progress, 0.26, 0.62, 0, 1);
  const chip = ease(progress, 0.74, 0.83, 0, 1);
  const offsetX = 376 - camX * zoom;
  const offsetY = 235 - camY * zoom;
  // The marker keeps its size while the map grows underneath, as a real one does.
  const markerX = offsetX + MAP_MARKER[0] * zoom;
  const markerY = offsetY + MAP_MARKER[1] * zoom;

  return (
    <PublishShell accent={accent} eyebrow="EN GEO PROPIEDADES" title="El edificio, sobre el mapa" status="La zona, antes de ir" statusSize={22} lift={liftIn}>
      <div style={{position: 'relative', marginTop: 26, height: 470, borderRadius: 32, overflow: 'hidden', border: '2px solid #DCE4EE', background: '#F4F1E9', boxShadow: `0 24px 56px ${accent}1A`}}>
        <svg width="100%" height="100%" viewBox="0 0 752 470" preserveAspectRatio="xMidYMid slice">
          <defs>
            {/* A soft contact shadow. The hard little ellipse it replaces read
                as a grey smudge of text under the pin at phone size. */}
            <radialGradient id="pin-shadow">
              <stop offset="0%" stopColor="#0F172A" stopOpacity="0.26" />
              <stop offset="60%" stopColor="#0F172A" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform={`translate(${offsetX} ${offsetY}) scale(${zoom})`}>
            <rect x="-120" y="-120" width="1100" height="800" fill="#F4F1E9" />
            <g opacity={tiles}>
              <rect x={CITY_COLUMNS[1] + 16} y={CITY_ROWS[2] + 16} width={CITY_COLUMNS[2] - CITY_COLUMNS[1] - 32} height={CITY_ROWS[3] - CITY_ROWS[2] - 32} rx="10" fill="#DCE9CF" />
              {[[196, 300], [252, 336], [300, 292]].map(([x, y]) => (
                <circle key={`tree-${x}`} cx={x} cy={y} r="14" fill="#BED4A8" />
              ))}
              <g opacity={detail}>
                {CITY_FOOTPRINTS.map(([x, y, width, height], index) => (
                  <rect key={index} x={x} y={y} width={width} height={height} rx="3" fill="#E7E1D4" stroke="#DBD3C2" strokeWidth="1.5" />
                ))}
              </g>
              <g stroke="#E4DED0" strokeLinecap="round" fill="none">
                {CITY_ROWS.slice(1, -1).map((y) => (
                  <path key={`hc-${y}`} d={`M-120 ${y} H980`} strokeWidth={y === CITY_ROWS[2] ? 44 : 26} />
                ))}
                {CITY_COLUMNS.slice(1, -1).map((x) => (
                  <path key={`vc-${x}`} d={`M${x} -120 V680`} strokeWidth={x === CITY_COLUMNS[3] ? 38 : 22} />
                ))}
              </g>
              <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
                {CITY_ROWS.slice(1, -1).map((y) => (
                  <path key={`h-${y}`} d={`M-120 ${y} H980`} strokeWidth={y === CITY_ROWS[2] ? 34 : 18} />
                ))}
                {CITY_COLUMNS.slice(1, -1).map((x) => (
                  <path key={`v-${x}`} d={`M${x} -120 V680`} strokeWidth={x === CITY_COLUMNS[3] ? 28 : 15} />
                ))}
              </g>
              <path d={`M-120 ${CITY_ROWS[2]} H980`} stroke="#EBD9A8" strokeWidth="8" strokeDasharray="30 26" fill="none" opacity={detail * 0.9} />
            </g>
          </g>

          {/* The impact of the landing, on the ground and gone. */}
          <ellipse
            cx={markerX}
            cy={markerY + 4}
            rx={26 + land * 52}
            ry={7 + land * 14}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            opacity={land * (1 - land) * 3.4}
          />
          <g transform={`translate(${markerX} ${markerY + drop})`} opacity={pin}>
            <ellipse cx="0" cy="8" rx={30 * pin} ry={9 * pin} fill="url(#pin-shadow)" />
            <path
              d="M0 0C-10 -22 -36 -28 -36 -50A36 36 0 1 1 36 -50C36 -28 10 -22 0 0Z"
              fill={accent}
              stroke="#FFFFFF"
              strokeWidth="6"
            />
            <g transform="translate(-19 -69) scale(1.6)">
              <path d={FLAT_ICON} fill="#FFFFFF" />
            </g>
            <g opacity={chip} transform={`translate(0 ${-104 - chip * 6})`}>
              <rect x="-88" y="-34" width="176" height="46" rx="23" fill="#FFFFFF" stroke="rgba(8,9,21,.14)" strokeWidth="2" />
              <text textAnchor="middle" y="-2" fontFamily={font} fontSize="24" fontWeight="800" fill={accent}>
                Seleccionada
              </text>
            </g>
          </g>
        </svg>
      </div>
    </PublishShell>
  );
};

/** The deed, and the name on it matching the person selling. */
export const DeedSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const stamp = spring({frame: frame - span * 0.34, fps, config: {damping: 12, stiffness: 150}});
  const match = spring({frame: frame - span * 0.66, fps, config: {damping: 16, stiffness: 175}});
  const lines = [0.94, 0.78, 0.88, 0.62];
  return (
    <FieldShell accent={accent} where="REGISTRO DE LA PROPIEDAD" title="¿Quién es el dueño?" lift={lift}>
      <div style={{marginTop: 24, padding: '26px 28px', borderRadius: 14, background: '#FFFFFF', border: '2px solid #E8E1D0', boxShadow: '0 16px 38px rgba(40,32,16,.12)'}}>
        <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.08em', color: '#9A8F79'}}>ESCRITURA PÚBLICA</div>
        {lines.map((width, index) => {
          const draw = ease(progress, 0.06 + index * 0.05, 0.24 + index * 0.05, 0, 1);
          return <div key={index} style={{marginTop: index ? 14 : 18, height: 11, width: `${width * 100 * draw}%`, borderRadius: 99, background: '#DED6C4'}} />;
        })}
        <div style={{marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
          <div>
            <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>PROPIETARIO INSCRITO</div>
            <div style={{marginTop: 5, fontSize: 40, fontWeight: 800, letterSpacing: '-.03em'}}>El dueño registrado</div>
          </div>
          <div style={{transform: `rotate(-14deg) scale(${0.6 + stamp * 0.4})`, opacity: stamp}}>
            <div style={{padding: '12px 20px', borderRadius: 10, border: `5px solid ${accent}`, color: accent, fontSize: 26, fontWeight: 800, letterSpacing: '.06em'}}>INSCRITO</div>
          </div>
        </div>
      </div>
      <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 16, padding: '22px 26px', borderRadius: 20, background: match > 0.6 ? `${accent}12` : '#F3EFE4', border: `2px solid ${match > 0.6 ? `${accent}4A` : '#E8E1D0'}`, opacity: Math.max(0.15, match)}}>
        <CheckMark progress={match} accent={accent} />
        <div>
          <div style={{fontSize: 27, fontWeight: 800}}>Que coincida con quien te vende</div>
          <div style={{marginTop: 4, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Mismo nombre, misma cédula</div>
        </div>
      </div>
    </FieldShell>
  );
};

/** What the property still owes, and who reads it for you.
 *
 * The subject is a prop because the same registry check applies to a flat, and
 * a piece about flats cannot ask "¿Debe algo el terreno?". The default is the
 * plot wording geo-009 shipped with, so its master stays exactly as signed.
 */
export const EncumbrancesSim: React.FC<SimulationProps & {subject?: string}> = ({frame, total, accent, subject = 'el terreno'}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const rows = ['Hipoteca', 'Embargo', 'Demanda', 'Impuesto predial'];
  const lawyer = spring({frame: frame - span * 0.72, fps, config: {damping: 17}});
  return (
    <FieldShell accent={accent} where="REGISTRO Y MUNICIPIO" title={`¿Debe algo ${subject}?`} lift={lift}>
      <div style={{marginTop: 24}}>
        {rows.map((row, index) => {
          const read = ease(progress, 0.08 + index * 0.13, 0.24 + index * 0.13, 0, 1);
          return (
            <div
              key={row}
              style={{
                marginTop: index ? 13 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '22px 26px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: '2px solid #E8E1D0',
                opacity: 0.28 + read * 0.72,
              }}
            >
              <span style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.02em'}}>{row}</span>
              <span style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <span style={{width: 132, height: 12, borderRadius: 99, background: '#EDE6D6', overflow: 'hidden'}}>
                  <span style={{display: 'block', width: `${read * 100}%`, height: '100%', background: accent}} />
                </span>
                <span style={{fontSize: 22, fontWeight: 800, color: '#9A8F79', letterSpacing: '.06em'}}>{read > 0.95 ? 'LEÍDO' : 'LEYENDO'}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 20, padding: '22px 26px', borderRadius: 20, background: `${accent}12`, border: `2px solid ${accent}40`, opacity: lawyer, transform: `translateY(${(1 - lawyer) * 26}px)`}}>
        <div style={{fontSize: 28, fontWeight: 800}}>Un abogado te dice qué significa</div>
        <div style={{marginTop: 5, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Antes de que firmes nada</div>
      </div>
    </FieldShell>
  );
};

/** What the town hall lets you build there. */
export const LandUseSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const rise = ease(progress, 0.34, 0.72, 0, 1);
  const rules: Array<[string, string]> = [['Uso', 'Residencial'], ['Pisos', 'Hasta 2'], ['Retiro frontal', '3 m']];
  return (
    <FieldShell accent={accent} where="EN EL MUNICIPIO" title="¿Qué se puede construir?" lift={lift}>
      <div style={{marginTop: 24, height: 268, borderRadius: 16, overflow: 'hidden', border: '2px solid #E8E1D0', background: '#F7F3E8'}}>
        <svg width="100%" height="100%" viewBox="0 0 660 268" preserveAspectRatio="xMidYMid slice">
          <g stroke="#E2D9C6" strokeWidth="2">
            {Array.from({length: 14}, (_, i) => <path key={`v${i}`} d={`M${i * 48} 0V268`} />)}
            {Array.from({length: 6}, (_, i) => <path key={`h${i}`} d={`M0 ${i * 48}H660`} />)}
          </g>
          <polygon points="196,74 468,74 468,214 196,214" fill={`${accent}1E`} stroke={accent} strokeWidth="5" strokeDasharray="12 8" />
          <g opacity={rise}>
            <rect x={232} y={214 - 108 * rise} width="200" height={108 * rise} rx="4" fill="#D9CDB4" />
            <rect x={232} y={214 - 108 * rise} width="200" height="6" fill={accent} />
          </g>
          <path d="M196 236 H468" stroke="#B7A98A" strokeWidth="3" />
          <path d="M196 230 V242 M468 230 V242" stroke="#B7A98A" strokeWidth="3" />
          <text x="332" y="258" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="21" fill="#8A7F69">frente del lote</text>
        </svg>
      </div>
      <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12}}>
        {rules.map(([label, value], index) => {
          const appear = spring({frame: frame - span * (0.42 + index * 0.1), fps, config: {damping: 16, stiffness: 180}});
          return (
            <div key={label} style={{padding: '20px 18px', borderRadius: 16, background: '#FFFFFF', border: '2px solid #E8E1D0', opacity: appear, transform: `translateY(${(1 - appear) * 26}px)`}}>
              <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.06em', color: '#9A8F79'}}>{label.toUpperCase()}</div>
              <div style={{marginTop: 6, fontSize: 34, fontWeight: 800, letterSpacing: '-.03em'}}>{value}</div>
            </div>
          );
        })}
      </div>
    </FieldShell>
  );
};

/** Walking the boundary, and the side that does not match the paper. */
export const BoundariesSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const corners = [[150, 96], [500, 84], [524, 232], [174, 244]];
  const walk = ease(progress, 0.08, 0.58, 0, corners.length);
  const gapShown = spring({frame: frame - span * 0.62, fps, config: {damping: 15, stiffness: 165}});
  const surveyor = spring({frame: frame - span * 0.8, fps, config: {damping: 17}});
  const index = Math.min(corners.length - 1, Math.floor(walk));
  const next = corners[(index + 1) % corners.length];
  const here = corners[index];
  const t = walk - Math.floor(walk);
  const walker = [here[0] + (next[0] - here[0]) * t, here[1] + (next[1] - here[1]) * t];
  return (
    <FieldShell accent={accent} where="EN EL TERRENO" title="Camina los linderos" lift={lift}>
      <div style={{marginTop: 24, height: 300, borderRadius: 16, overflow: 'hidden', border: '2px solid #E8E1D0', background: '#F2F5EA'}}>
        <svg width="100%" height="100%" viewBox="0 0 660 300" preserveAspectRatio="xMidYMid slice">
          <rect width="660" height="300" fill="#EAF0E0" />
          <polygon points={corners.map((c) => c.join(',')).join(' ')} fill={`${accent}1C`} stroke={accent} strokeWidth="6" strokeLinejoin="round" strokeDasharray="14 10" />
          {corners.map(([x, y], cornerIndex) => (
            <g key={`${x}-${y}`} opacity={walk > cornerIndex ? 1 : 0.35}>
              <rect x={x - 7} y={y - 26} width="14" height="30" rx="3" fill="#B08A5E" />
              <circle cx={x} cy={y} r="9" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
            </g>
          ))}
          <g transform={`translate(${walker[0]} ${walker[1] - 22})`}>
            <circle cy="-16" r="11" fill="#3E4A5C" />
            <path d="M0 -6 V16 M0 16 L-10 34 M0 16 L10 34 M-13 2 H13" stroke="#3E4A5C" strokeWidth="6" strokeLinecap="round" fill="none" />
          </g>
          <g opacity={gapShown}>
            <path d="M174 268 H524" stroke="#C64E3D" strokeWidth="5" />
            <path d="M174 258 V278 M524 258 V278" stroke="#C64E3D" strokeWidth="5" />
            <rect x="272" y="248" width="156" height="40" rx="10" fill="#FFFFFF" stroke="#C64E3D" strokeWidth="4" />
            <text x="350" y="276" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="25" fill="#A74335">¿20 m o 19?</text>
          </g>
        </svg>
      </div>
      <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 16, padding: '22px 26px', borderRadius: 20, background: '#FFFFFF', border: '2px solid #E8E1D0', opacity: surveyor, transform: `translateY(${(1 - surveyor) * 26}px)`}}>
        <CheckMark progress={surveyor} accent={accent} />
        <div>
          <div style={{fontSize: 28, fontWeight: 800}}>Si no cuadra, un topógrafo mide</div>
          <div style={{marginTop: 4, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Un metro es mucha plata</div>
        </div>
      </div>
    </FieldShell>
  );
};

/** What reaches the plot, and how you get in when it rains. */
export const UtilitiesSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const rain = ease(progress, 0.6, 0.78, 0, 1);
  const services = [
    {label: 'Agua', d: 'M12 3c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13Z'},
    {label: 'Luz', d: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z'},
    {label: 'Alcantarillado', d: 'M4 8h16M4 16h16M8 8v8M16 8v8'},
  ];
  return (
    <FieldShell accent={accent} where="EN EL TERRENO" title="¿Qué llega hasta ahí?" lift={lift}>
      <div style={{marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14}}>
        {services.map((service, index) => {
          const reach = ease(progress, 0.08 + index * 0.11, 0.3 + index * 0.11, 0, 1);
          return (
            <div key={service.label} style={{padding: '22px 18px', borderRadius: 18, background: '#FFFFFF', border: '2px solid #E8E1D0', textAlign: 'center', opacity: 0.3 + reach * 0.7, transform: `translateY(${(1 - reach) * 24}px)`}}>
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={service.d} /></svg>
              <div style={{marginTop: 10, fontSize: 24, fontWeight: 800, letterSpacing: '-.02em'}}>{service.label}</div>
              <div style={{marginTop: 8, height: 9, borderRadius: 99, background: '#EDE6D6', overflow: 'hidden'}}>
                <div style={{width: `${reach * 100}%`, height: '100%', background: accent}} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop: 20, height: 224, borderRadius: 18, overflow: 'hidden', border: '2px solid #E8E1D0', position: 'relative', background: '#EAF0E0'}}>
        <svg width="100%" height="100%" viewBox="0 0 660 224" preserveAspectRatio="xMidYMid slice">
          <rect width="660" height="224" fill={rain > 0.5 ? '#C9D2C4' : '#EAF0E0'} />
          <path d="M-20 176 C160 150 320 196 480 168 S660 140 700 156 L700 244 L-20 244 Z" fill={rain > 0.5 ? '#8E8A72' : '#CFC3A4'} />
          <path d="M-20 200 H700" stroke={rain > 0.5 ? '#6F6A57' : '#B7A98A'} strokeWidth="26" />
          {rain > 0.05
            ? Array.from({length: 26}, (_, i) => {
                const x = (i * 61 + Math.round(frame * 5)) % 700 - 20;
                const y = ((i * 37 + Math.round(frame * 13)) % 224);
                return <path key={i} d={`M${x} ${y}l-5 16`} stroke="#7FA8C9" strokeWidth="3" opacity={rain * 0.8} strokeLinecap="round" />;
              })
            : null}
        </svg>
        <div style={{position: 'absolute', left: 20, bottom: 18, padding: '12px 22px', borderRadius: 99, background: 'rgba(8,9,21,.82)', color: '#FFFFFF', fontFamily: font, fontSize: 24, fontWeight: 800}}>
          {rain > 0.5 ? '¿Y en invierno?' : 'El día que fuiste'}
        </div>
      </div>
    </FieldShell>
  );
};

/**
 * The five animations of the plot-buying guide.
 *
 * Each one shows the thing the sentence over it names, at the scale a phone can
 * read, and each runs a full arc: it starts moving, changes state halfway and
 * lands on a closing beat. The guide teaches what the public listing already
 * shows and where it stops — the measurements disclosure in
 * `specs/ui/visibility-rules.yaml`, the unit price in
 * `specs/calculations/pricing.yaml` — so nothing here claims more than the
 * product does.
 */

/** What surrounds the plot, and the road you reach it by. */
export const PlotSurroundingsSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // The camera pulls back: first the plot alone, then everything around it.
  const zoom = ease(progress, 0.05, 0.62, 2.1, 1);
  const route = ease(progress, 0.5, 0.88, 0, 1);
  const labels: Array<{x: number; y: number; text: string; at: number}> = [
    {x: 96, y: 96, text: 'Vía principal', at: 0.42},
    {x: 470, y: 92, text: 'Calle lateral', at: 0.52},
    {x: 430, y: 396, text: 'Quebrada', at: 0.62},
  ];
  return (
    <PublishShell accent={accent} eyebrow="EN GEO PROPIEDADES" title="Mira qué hay alrededor" status="Antes de ir" lift={lift}>
      <div style={{position: 'relative', marginTop: 26, height: 508, borderRadius: 32, overflow: 'hidden', border: '2px solid #DCE4EE', background: '#E7EDF4', boxShadow: `0 24px 56px ${accent}1A`}}>
        <svg width="100%" height="100%" viewBox="0 0 720 508" preserveAspectRatio="xMidYMid slice">
          <g transform={`translate(360 254) scale(${zoom}) translate(-360 -254)`}>
            <rect width="720" height="508" fill="#E7EDF4" />
            <path d="M-40 120 H760" stroke="#B9C6D6" strokeWidth="34" />
            <path d="M-40 120 H760" stroke="#EEF2F7" strokeWidth="5" strokeDasharray="26 22" />
            <path d="M470 -20 V540" stroke="#C6D2E0" strokeWidth="22" />
            <path d="M-40 400 C140 380 300 424 470 402 S680 372 760 388" stroke="#BBD3C6" strokeWidth="30" fill="none" />
            <g stroke="#D3DCE8" strokeWidth="10" fill="none">
              <path d="M120 -20 V540" /><path d="M-40 300 H760" />
            </g>
            {[[168, 186], [252, 176], [560, 200], [604, 300], [176, 352], [268, 358]].map(([x, y]) => (
              <g key={`${x}-${y}`} opacity=".55">
                <rect x={x - 26} y={y - 20} width="52" height="40" rx="4" fill="#DED8CE" />
                <path d={`M${x - 32} ${y - 20}L${x} ${y - 44}L${x + 32} ${y - 20}Z`} fill="#5C6C7E" />
              </g>
            ))}
            <polygon points="320,214 452,206 466,292 332,300" fill={`${accent}3A`} stroke={accent} strokeWidth="8" strokeLinejoin="round" />
            <path
              d="M392 120 L392 168 L392 206"
              stroke={accent}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="90"
              strokeDashoffset={90 * (1 - route)}
              fill="none"
            />
            <circle cx="392" cy="120" r={11 * route} fill={accent} stroke="#FFFFFF" strokeWidth="4" />
          </g>
        </svg>
        {labels.map((label) => {
          const appear = spring({frame: frame - span * label.at, fps, config: {damping: 16, stiffness: 175}});
          return (
            <div
              key={label.text}
              style={{
                position: 'absolute',
                left: label.x,
                top: label.y,
                padding: '11px 20px',
                borderRadius: 99,
                background: 'rgba(8,9,21,.82)',
                color: '#FFFFFF',
                fontFamily: font,
                fontWeight: 800,
                fontSize: 24,
                opacity: appear,
                transform: `translateY(${(1 - appear) * 18}px)`,
              }}
            >
              {label.text}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: 24,
            bottom: 22,
            padding: '13px 24px',
            borderRadius: 99,
            background: '#FFFFFF',
            border: `4px solid ${accent}`,
            fontFamily: font,
            fontWeight: 800,
            fontSize: 26,
            color: palette.ink,
            opacity: route,
            transform: `translateY(${(1 - route) * 22}px)`,
          }}
        >
          Por dónde se llega
        </div>
      </div>
    </PublishShell>
  );
};

/** Who drew the outline, and what it is not. */
export const PlotShapeOriginSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const corners = [[212, 178], [488, 162], [516, 300], [238, 320]];
  // The outline is drawn corner by corner, by hand, in front of the viewer.
  const drawn = ease(progress, 0.1, 0.6, 0, corners.length + 1);
  const limit = spring({frame: frame - span * 0.68, fps, config: {damping: 17}});
  const cursor = corners[Math.min(corners.length - 1, Math.floor(drawn))];
  const path = corners.slice(0, Math.max(1, Math.floor(drawn))).map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ');
  return (
    <PublishShell accent={accent} eyebrow="PASO 2 · LA FORMA" title="La dibujó quien publica" status="Forma del terreno" lift={lift}>
      <div style={{position: 'relative', marginTop: 26, height: 470, borderRadius: 32, overflow: 'hidden', border: '2px solid #DCE4EE', background: '#E7EDF4', boxShadow: `0 24px 56px ${accent}1A`}}>
        <svg width="100%" height="100%" viewBox="0 0 720 470" preserveAspectRatio="xMidYMid slice">
          <rect width="720" height="470" fill="#E7EDF4" />
          <g stroke="#CDD7E4" strokeWidth="13" fill="none">
            {[100, 300, 520].map((x) => <path key={x} d={`M${x} 0V470`} />)}
            {[120, 300].map((y) => <path key={y} d={`M0 ${y}H720`} />)}
          </g>
          <path d="M-20 356 C160 330 300 380 470 352 S680 322 740 340 L740 490 L-20 490 Z" fill="#D8E8DE" />
          {drawn >= corners.length ? (
            <polygon points={corners.map((c) => c.join(',')).join(' ')} fill={`${accent}33`} stroke={accent} strokeWidth="9" strokeLinejoin="round" />
          ) : (
            <path d={path} stroke={accent} strokeWidth="9" fill="none" strokeLinecap="round" />
          )}
          {corners.slice(0, Math.floor(drawn) + 1).map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="13" fill="#FFFFFF" stroke={accent} strokeWidth="7" />
          ))}
          {drawn < corners.length ? (
            <g transform={`translate(${cursor[0] + 16} ${cursor[1] + 14})`}>
              <path d="M0 0 L0 34 L9 26 L15 40 L23 36 L17 23 L28 22 Z" fill="#FFFFFF" stroke={palette.ink} strokeWidth="3" strokeLinejoin="round" />
            </g>
          ) : null}
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 22,
            right: 22,
            bottom: 20,
            padding: '20px 24px',
            borderRadius: 24,
            background: '#FFF3F1',
            border: '3px solid #E7B4AA',
            opacity: limit,
            transform: `translateY(${(1 - limit) * 26}px)`,
          }}
        >
          <div style={{fontFamily: font, fontSize: 27, fontWeight: 800, color: '#A74335'}}>No es un plano legal</div>
          <div style={{marginTop: 5, fontFamily: font, fontSize: 23, fontWeight: 700, color: '#8A5B51'}}>Ni un levantamiento topográfico</div>
        </div>
      </div>
    </PublishShell>
  );
};

/** The measurements row, and what its label is admitting. */
export const PlotMeasurementsSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const rows: Array<[string, string]> = [
    ['Área', '400 m²'],
    ['Tipo', 'Terreno'],
    ['Medidas', 'Referencia aproximada'],
  ];
  // The eye runs down the rows and stops on the third.
  const scan = ease(progress, 0.12, 0.5, 0, 2);
  const warn = spring({frame: frame - span * 0.56, fps, config: {damping: 16, stiffness: 170}});
  const note = spring({frame: frame - span * 0.76, fps, config: {damping: 17}});
  return (
    <PublishShell accent={accent} eyebrow="PASO 3 · LAS MEDIDAS" title="Lee esta línea despacio" status="Datos declarados" lift={lift}>
      <div style={{marginTop: 26}}>
        {rows.map(([label, value], index) => {
          const focused = Math.round(scan) === index;
          const isWarning = index === 2;
          const appear = spring({frame: frame - span * (0.06 + index * 0.09), fps, config: {damping: 16, stiffness: 180}});
          return (
            <div
              key={label}
              style={{
                marginTop: index ? 14 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '24px 26px',
                borderRadius: 24,
                background: focused && isWarning ? '#FFF3F1' : focused ? `${accent}12` : '#F2F5FA',
                border: `3px solid ${focused && isWarning ? '#E7B4AA' : focused ? `${accent}55` : '#E8EDF4'}`,
                opacity: appear,
                transform: `translateX(${(1 - appear) * -28}px) scale(${focused ? 1.02 : 1})`,
              }}
            >
              <span style={{fontSize: 26, fontWeight: 700, color: '#5D667E'}}>{label}</span>
              <span style={{fontSize: isWarning ? 32 : 42, fontWeight: 800, letterSpacing: '-.03em', color: isWarning && focused ? '#A74335' : palette.ink}}>{value}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 22,
          padding: '22px 26px',
          borderRadius: 26,
          background: '#FFFFFF',
          border: '3px solid #E4EAF2',
          boxShadow: '0 18px 42px rgba(8,9,21,.10)',
          opacity: warn,
          transform: `translateY(${(1 - warn) * 30}px)`,
        }}
      >
        <div style={{fontSize: 27, fontWeight: 800, color: palette.ink}}>Quien publicó no las respalda</div>
        <div style={{marginTop: 8, fontSize: 24, fontWeight: 700, color: '#69738B', opacity: note}}>Compruébalas en el terreno</div>
      </div>
    </PublishShell>
  );
};

/** The division the buyer does, and why it makes two plots comparable. */
export const PlotUnitPriceSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const divide = spring({frame: frame - span * 0.16, fps, config: {damping: 16, stiffness: 175}});
  const result = ease(progress, 0.34, 0.58, 0, 305);
  // The closing beat: two plots of different size, side by side, comparable.
  const compare = spring({frame: frame - span * 0.66, fps, config: {damping: 17}});
  const others = [
    {label: '400 m²', price: '$122.000', unit: '$305/m²'},
    {label: '800 m²', price: '$248.000', unit: '$310/m²'},
  ];
  return (
    <FieldShell accent={accent} where="COMPARANDO OPCIONES" title="Saca tu propio número" lift={lift}>
      <div style={{marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 56px 1fr', alignItems: 'center', gap: 12}}>
        {[['PRECIO TOTAL', '$122.000'], ['ÁREA DECLARADA', '400 m²']].map(([label, value], index) => (
          <React.Fragment key={label}>
            {index === 1 ? <div style={{fontSize: 50, fontWeight: 800, color: accent, textAlign: 'center', opacity: divide}}>÷</div> : null}
            <div style={{padding: '22px 24px', borderRadius: 26, background: '#F2F5FA', border: '2px solid #E8EDF4'}}>
              <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.07em', color: '#69738B'}}>{label}</div>
              <div style={{marginTop: 6, fontSize: 46, fontWeight: 800, letterSpacing: '-.04em', color: palette.ink}}>{value}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          padding: '26px 30px',
          borderRadius: 30,
          background: `linear-gradient(145deg, ${accent}, #0F8F6B)`,
          color: '#FFFFFF',
          boxShadow: `0 24px 56px ${accent}42`,
          opacity: divide,
          transform: `translateY(${(1 - divide) * 34}px)`,
        }}
      >
        <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.07em', opacity: .84}}>PRECIO POR METRO CUADRADO</div>
        <div style={{marginTop: 4, fontSize: 70, fontWeight: 800, letterSpacing: '-.06em'}}>${Math.round(result)}<span style={{fontSize: 28}}>/m²</span></div>
      </div>
      <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, opacity: compare, transform: `translateY(${(1 - compare) * 26}px)`}}>
        {others.map((plot) => (
          <div key={plot.label} style={{padding: '18px 22px', borderRadius: 22, background: '#FFFFFF', border: `2px solid ${accent}38`, boxShadow: '0 14px 32px rgba(8,9,21,.08)'}}>
            <div style={{fontSize: 24, fontWeight: 800, color: palette.ink}}>{plot.label}</div>
            <div style={{marginTop: 4, fontSize: 21, fontWeight: 700, color: '#69738B'}}>{plot.price}</div>
            <div style={{marginTop: 8, fontSize: 30, fontWeight: 800, color: accent}}>{plot.unit}</div>
          </div>
        ))}
      </div>
    </FieldShell>
  );
};

/**
 * The hook: a photograph of a plot, and everything a photograph cannot tell
 * you. Nothing here belongs to any portal — these are the things anyone buying
 * land in Ecuador has to find out, whoever they are buying from.
 */
export const PlotQuestionsSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const unknowns = ['Escrituras', 'Deudas', 'Uso de suelo', 'Linderos', 'Servicios'];
  const drift = Math.sin(frame / 34) * 8;
  const closing = spring({frame: frame - span * 0.76, fps, config: {damping: 17}});
  return (
    <FieldShell accent={accent} where="ANTES DE COMPRAR" title="Lo que ninguna foto dice" lift={lift}>
      <div style={{position: 'relative', marginTop: 24, height: 300, borderRadius: 16, overflow: 'hidden', border: '2px solid #E8E1D0'}}>
        <svg width="100%" height="100%" viewBox="0 0 660 300" preserveAspectRatio="xMidYMid slice">
          <g transform={`translate(${drift} 0)`}>
            <rect x="-20" y="0" width="700" height="300" fill="#CFE0EC" />
            <circle cx="546" cy="62" r="34" fill="#FFE39A" />
            <path d="M-20 176 C140 150 300 196 470 168 S680 140 700 156 L700 320 L-20 320 Z" fill="#BFD3A4" />
            <path d="M-20 246 H700" stroke="#C3B08A" strokeWidth="30" />
            <g stroke="#9BAF7E" strokeWidth="4" strokeLinecap="round" fill="none">
              {[60, 190, 330, 470, 610].map((x) => <path key={x} d={`M${x} 214c-6-16 3-28 3-28s7 14 2 28`} />)}
            </g>
          </g>
        </svg>
        <div style={{position: 'absolute', left: 18, top: 16, padding: '10px 18px', borderRadius: 8, background: 'rgba(255,253,248,.94)', fontFamily: font, fontSize: 22, fontWeight: 800, color: '#8A7F69'}}>
          La foto del anuncio
        </div>
      </div>
      <div style={{marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12}}>
        {unknowns.map((item, index) => {
          const appear = spring({frame: frame - span * (0.1 + index * 0.1), fps, config: {damping: 15, stiffness: 180}});
          return (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 22px',
                borderRadius: 12,
                background: '#FFFFFF',
                border: '2px solid #E8E1D0',
                boxShadow: '0 12px 26px rgba(40,32,16,.10)',
                opacity: appear,
                transform: `translateY(${(1 - appear) * 26}px) rotate(${(index % 2 ? 1 : -1) * 1.4}deg)`,
              }}
            >
              <span style={{width: 34, height: 34, borderRadius: 99, background: '#FFF3F1', color: '#C64E3D', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800}}>?</span>
              <span style={{fontSize: 27, fontWeight: 800, letterSpacing: '-.02em'}}>{item}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 20,
          padding: '20px 26px',
          borderRadius: 18,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: closing,
          transform: `translateY(${(1 - closing) * 24}px)`,
        }}
      >
        <div style={{fontSize: 28, fontWeight: 800}}>Esto es lo que se revisa</div>
      </div>
    </FieldShell>
  );
};

/** The same registry check, said about the flat the piece is about. */
export const FlatEncumbrancesSim: React.FC<SimulationProps> = (props) => (
  <EncumbrancesSim {...props} subject="el departamento" />
);

/* ---------------------------------------------------------------------------
 * Buying a property, step by step.
 *
 * Six animations for the piece that follows a purchase from the listing to the
 * registry. Only the first step happens inside the portal, so all six share
 * `FieldShell`: the paper card the series uses for everything that happens
 * away from the product, with the `EJEMPLO` badge that licenses the invented
 * prices. Every figure below is a printed constant — none of them is
 * interpolated on its way to a value, because a number that climbs is false in
 * every frame but the last.
 * ------------------------------------------------------------------------- */

const EXAMPLE_LISTED_PRICE = '$75.000';
const EXAMPLE_OFFER_PRICE = '$70.000';

/**
 * Constant-rate progress, for a movement the eye is supposed to follow.
 *
 * `ease` is the house curve for entrances, and it is deliberately front-loaded:
 * `bezier(0.22, 1, 0.36, 1)` has spent 90 % of its distance in the first third
 * of its window. That is right for a card that lands, and wrong for a lens
 * walking down a list — the first master of this piece resolved every scene in
 * its opening second and then held, which `MotionDefectAudit` reported as 83 to
 * 89 % stillness. A pass that is the content of the scene runs at one speed.
 */
const pace = (frame: number, from: number, to: number, a: number, b: number) =>
  interpolate(frame, [from, to], [a, b], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/** Smoothstep, for progress that is already clamped to 0..1. */
const smooth = (value: number) => {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
};

const VERIFICATION_CHECKS: Array<[string, string]> = [
  ['Propietario', 'Que sea quien te vende'],
  ['Documentos', 'Escritura inscrita'],
  ['Gravámenes', 'Certificado del registro'],
];

/** Distance between two rows of the checklist, in the card's own pixels. */
const CHECK_ROW_PITCH = 135;

/**
 * Who is selling, and what the property still owes.
 *
 * The lens makes the causality explicit: nothing is ticked before something
 * visibly looked at it, and it parks on the last row while that row answers.
 * The closing strip is the honest limit of the piece — the portal does not
 * verify any of this, a lawyer does.
 */
export const VerificationSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // One unhurried pass, and then the lens leaves to the right instead of
  // parking on the last row: the scene keeps moving while the closing strip
  // rises, and nothing ends up sitting on top of it.
  const lens = pace(progress, 0.04, 0.94, 0, VERIFICATION_CHECKS.length + 0.6);
  const lensDown = Math.min(lens, VERIFICATION_CHECKS.length - 1) * CHECK_ROW_PITCH;
  const lensOut = Math.max(0, lens - (VERIFICATION_CHECKS.length - 0.8)) * 150;
  const lensFade = 1 - smooth((lens - VERIFICATION_CHECKS.length + 0.4) / 1.2);
  const lawyer = spring({frame: frame - span * 0.56, fps, config: {damping: 17}});
  const breath = Math.sin(frame / 29) * 2.5;
  return (
    <FieldShell accent={accent} where="ANTES DE PAGAR" title="¿Quién vende y qué debe?" lift={lift} camera={progress}>
      <div style={{position: 'relative', marginTop: 26, transform: `translateY(${breath}px)`}}>
        {VERIFICATION_CHECKS.map(([label, detail], index) => {
          const reached = smooth(lens - index + 0.6);
          const answered = smooth((lens - index - 0.1) / 0.4);
          return (
            <div
              key={label}
              style={{
                marginTop: index ? 14 : 0,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '22px 26px',
                borderRadius: 16,
                background: '#FFFFFF',
                border: `2px solid ${answered > 0.5 ? `${accent}66` : '#E8E1D0'}`,
                boxShadow: `0 ${10 + reached * 8}px ${24 + reached * 16}px rgba(40,32,16,${0.08 + reached * 0.06})`,
                transform: `translateX(${(1 - reached) * -16}px)`,
                opacity: 0.34 + reached * 0.66,
              }}
            >
              <CheckMark progress={answered} accent={accent} />
              <div style={{flex: 1}}>
                <div style={{fontSize: 31, fontWeight: 800, letterSpacing: '-.02em'}}>{label}</div>
                <div style={{marginTop: 4, fontSize: 24, fontWeight: 700, color: '#8A7F69'}}>{detail}</div>
                {/* The row is read, not ticked: the bar advances while the lens
                    is over it, so the time the scene spends here is time the
                    composition is visibly doing something. */}
                <div style={{marginTop: 10, height: 8, borderRadius: 99, background: '#EDE6D6', overflow: 'hidden'}}>
                  <div style={{width: `${smooth((lens - index + 0.25) / 0.75) * 100}%`, height: '100%', borderRadius: 99, background: accent}} />
                </div>
              </div>
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            right: -4,
            top: 8,
            width: 96,
            height: 96,
            opacity: lensFade,
            transform: `translate(${lensOut}px, ${lensDown}px)`,
          }}
        >
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="42" cy="42" r="28" fill="rgba(255,255,255,.42)" stroke={accent} strokeWidth="6" />
            <circle cx="42" cy="42" r="28" fill="none" stroke="rgba(40,32,16,.14)" strokeWidth="2" />
            <path d="M62 62 L84 84" stroke={accent} strokeWidth="10" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div
        style={{
          marginTop: 20,
          padding: '22px 26px',
          borderRadius: 20,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: lawyer,
          transform: `translateY(${(1 - lawyer) * 26}px)`,
        }}
      >
        <div style={{fontSize: 28, fontWeight: 800}}>Un abogado lo revisa contigo</div>
        <div style={{marginTop: 5, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Antes de entregar dinero</div>
      </div>
    </FieldShell>
  );
};

/**
 * The published price, an offer, and the agreement between them.
 *
 * Both figures are printed constants under the `EJEMPLO` badge: they teach what
 * negotiating looks like, and say nothing about any market. The strike is the
 * action, the offer card is the response, and the band at the bottom is the
 * proof — an agreement is two people accepting, not a discount granted.
 */
export const NegotiationSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const strike = pace(progress, 0.14, 0.38, 0, 1);
  const offer = spring({frame: frame - span * 0.3, fps, config: {damping: 16, stiffness: 170}});
  const deal = spring({frame: frame - span * 0.62, fps, config: {damping: 15, stiffness: 155}});
  // The two cards keep closing the gap between them until the last frame, so
  // the agreement is something the composition arrives at rather than states.
  const converge = pace(progress, 0.36, 1, 0, 1);
  // The chevron crosses the gap at a constant rate: it is what carries the eye
  // from the crossed-out price to the offer while both cards settle.
  const pointer = pace(progress, 0.3, 0.94, -1, 1);
  return (
    <FieldShell accent={accent} where="LA NEGOCIACIÓN" title="Del precio publicado al acuerdo" lift={lift} camera={progress}>
      <div
        style={{
          marginTop: 24,
          padding: '22px 28px',
          borderRadius: 18,
          background: '#FFFFFF',
          border: '2px solid #E8E1D0',
          boxShadow: '0 14px 32px rgba(40,32,16,.10)',
          opacity: 1 - strike * 0.32,
          transform: `translateY(${converge * 10}px) scale(${1 - strike * 0.03})`,
          transformOrigin: 'left center',
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>PRECIO PUBLICADO</div>
        <div style={{position: 'relative', display: 'inline-block', marginTop: 2}}>
          <span style={{fontSize: 74, fontWeight: 800, letterSpacing: '-.05em'}}>{EXAMPLE_LISTED_PRICE}</span>
          <span
            style={{
              position: 'absolute',
              left: -8,
              right: -8,
              top: '54%',
              height: 8,
              borderRadius: 99,
              background: '#C64E3D',
              transformOrigin: 'left center',
              transform: `scaleX(${strike})`,
            }}
          />
        </div>
      </div>
      <div style={{height: 46, display: 'grid', placeItems: 'center', opacity: Math.min(1, offer * 1.4), transform: `translateY(${pointer * 13}px)`}}>
        <svg width="44" height="30" viewBox="0 0 44 30">
          <path d="M6 6 L22 22 L38 6" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div
        style={{
          padding: '22px 28px',
          borderRadius: 18,
          background: '#FFFFFF',
          border: `3px solid ${accent}`,
          boxShadow: `0 20px 44px ${accent}2E`,
          opacity: offer,
          transform: `translateY(${(1 - offer) * 46 - converge * 10}px)`,
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: accent}}>TU OFERTA</div>
        <div style={{fontSize: 74, fontWeight: 800, letterSpacing: '-.05em', marginTop: 2}}>{EXAMPLE_OFFER_PRICE}</div>
      </div>
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '22px 26px',
          borderRadius: 20,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: deal,
          transform: `translateY(${(1 - deal) * 26}px)`,
        }}
      >
        <CheckMark progress={deal} accent={accent} />
        <div>
          <div style={{fontSize: 28, fontWeight: 800}}>Acuerdo</div>
          <div style={{marginTop: 4, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Cuando las dos partes aceptan</div>
        </div>
      </div>
    </FieldShell>
  );
};

/** Two hands, two different rhythms: the signatures are drawn, never pasted. */
const SIGNATURE_STROKES = [
  'M10 46 C34 8 48 66 76 28 S120 10 152 44',
  'M10 40 C28 14 56 62 88 24 S128 18 154 48',
];

/**
 * The reservation or the promise: the first paper of the purchase.
 *
 * The document arrives from below and is signed by both sides in turn — the
 * order matters, because the piece is about an agreement, not a form. What the
 * paper contains is spelled out at the bottom: what is sold, for how much and
 * until when.
 */
export const PromiseContractSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const rise = spring({frame: frame - fps * 0.1, fps, config: {damping: 19, mass: 0.95}});
  // A pen moves at the speed of a hand, not of an entrance: both signatures are
  // drawn at a constant rate and they cover the whole middle of the scene.
  const signatures = [pace(progress, 0.28, 0.55, 0, 1), pace(progress, 0.55, 0.82, 0, 1)];
  const bound = spring({frame: frame - span * 0.78, fps, config: {damping: 17}});
  const settle = Math.sin(frame / 31) * 2;
  return (
    <FieldShell accent={accent} where="RESERVA O PROMESA" title="El acuerdo se pone por escrito" lift={lift} camera={progress}>
      <div
        style={{
          marginTop: 24,
          padding: '26px 28px 28px',
          borderRadius: 14,
          background: '#FFFFFF',
          border: '2px solid #E8E1D0',
          boxShadow: '0 18px 42px rgba(40,32,16,.14)',
          opacity: rise,
          transform: `translateY(${(1 - rise) * 150 + settle}px)`,
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#9A8F79'}}>PROMESA DE COMPRAVENTA</div>
        {[0.92, 0.74, 0.84].map((width, index) => (
          <div
            key={index}
            style={{
              marginTop: index ? 12 : 16,
              height: 10,
              borderRadius: 99,
              background: '#DED6C4',
              width: `${width * 100 * ease(progress, 0.1 + index * 0.06, 0.3 + index * 0.06, 0, 1)}%`,
            }}
          />
        ))}
        <div style={{marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
          {['Comprador', 'Vendedor'].map((who, index) => (
            <div key={who}>
              <svg width="100%" height="72" viewBox="0 0 164 72" preserveAspectRatio="xMidYMid meet">
                <path
                  d={SIGNATURE_STROKES[index]}
                  fill="none"
                  stroke={accent}
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - signatures[index]}
                />
              </svg>
              <div style={{height: 3, borderRadius: 99, background: '#DED6C4'}} />
              <div style={{marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
                <span style={{fontSize: 24, fontWeight: 800, color: '#8A7F69', letterSpacing: '.04em'}}>{who}</span>
                {/* The signature is thin ink; the chip is what makes the state
                    change readable at phone size and from across the room. */}
                <span
                  style={{
                    padding: '6px 12px',
                    borderRadius: 99,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: '.04em',
                    color: signatures[index] > 0.98 ? '#FFFFFF' : '#B3A78D',
                    background: signatures[index] > 0.98 ? accent : '#F1EADA',
                  }}
                >
                  {signatures[index] > 0.98 ? 'FIRMÓ' : '···'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          marginTop: 18,
          padding: '22px 26px',
          borderRadius: 20,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: bound,
          transform: `translateY(${(1 - bound) * 24}px)`,
        }}
      >
        <div style={{fontSize: 28, fontWeight: 800}}>Qué se vende, en cuánto y hasta cuándo</div>
      </div>
    </FieldShell>
  );
};

/**
 * The deed of sale, signed before a notary.
 *
 * Deliberately not `DeedSim`: that one reads an existing deed at the registry
 * to find out who owns the property. This one is the act itself, so the seal is
 * the hero — it drops, presses and stays, and the two parties appear under it.
 */
export const PublicDeedSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  const seal = spring({frame: frame - span * 0.32, fps, config: {damping: 13, stiffness: 150}});
  const press = 1.9 - seal * 0.9;
  const parties = pace(progress, 0.5, 0.86, 0, 1);
  const notary = spring({frame: frame - span * 0.76, fps, config: {damping: 17}});
  const paper = Math.sin(frame / 33) * 2;
  // The stamp keeps settling under the hand that pressed it.
  const sealDrift = Math.sin(frame / 41) * 0.7;
  return (
    <FieldShell accent={accent} where="EN LA NOTARÍA" title="La escritura de compraventa" lift={lift} camera={progress}>
      <div
        style={{
          position: 'relative',
          marginTop: 24,
          padding: '26px 28px 30px',
          borderRadius: 14,
          background: '#FFFFFF',
          border: '2px solid #E8E1D0',
          boxShadow: '0 18px 42px rgba(40,32,16,.13)',
          transform: `translateY(${paper}px)`,
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#9A8F79'}}>ESCRITURA PÚBLICA</div>
        {[0.9, 0.96, 0.68].map((width, index) => (
          <div
            key={index}
            style={{
              marginTop: index ? 12 : 16,
              height: 10,
              borderRadius: 99,
              background: '#DED6C4',
              width: `${width * 100 * ease(progress, 0.08 + index * 0.06, 0.28 + index * 0.06, 0, 1)}%`,
            }}
          />
        ))}
        <div style={{marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, opacity: 0.25 + parties * 0.75}}>
          {[['VENDE', 'El dueño inscrito'], ['COMPRA', 'Tú']].map(([role, who], index) => (
            <div
              key={role}
              style={{
                padding: '18px 20px',
                borderRadius: 14,
                background: '#F7F3E8',
                border: '2px solid #E8E1D0',
                transform: `translateY(${(1 - parties) * (index ? 24 : 16)}px)`,
              }}
            >
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>{role}</div>
              <div style={{marginTop: 5, fontSize: 32, fontWeight: 800, letterSpacing: '-.03em'}}>{who}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            // On the ruled body of the deed, not on the parties: a stamp
            // belongs on the page, and this one was landing on top of the box
            // that says who is buying.
            right: 26,
            top: 34,
            width: 168,
            height: 168,
            opacity: Math.min(1, seal * 1.6),
            transform: `rotate(${-16 + (1 - seal) * 22 + sealDrift}deg) scale(${press})`,
          }}
        >
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle cx="84" cy="84" r="74" fill="none" stroke={accent} strokeWidth="7" opacity="0.9" />
            <circle cx="84" cy="84" r="60" fill="none" stroke={accent} strokeWidth="3" opacity="0.65" />
            <text x="84" y="74" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="26" fill={accent} letterSpacing="2">
              NOTARÍA
            </text>
            <path d="M40 92 H128" stroke={accent} strokeWidth="4" opacity="0.6" />
            <text x="84" y="122" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="24" fill={accent}>
              FIRMADA
            </text>
          </svg>
        </div>
      </div>
      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '22px 26px',
          borderRadius: 20,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: notary,
          transform: `translateY(${(1 - notary) * 24}px)`,
        }}
      >
        <CheckMark progress={notary} accent={accent} />
        <div style={{fontSize: 28, fontWeight: 800}}>Las dos partes firman ante el notario</div>
      </div>
    </FieldShell>
  );
};

/**
 * The transfer entering the registry, and the name that changes because of it.
 *
 * The proof of this scene is the last row: the deed travels into the building
 * and the registered owner stops being the seller. Nothing else in the piece
 * changes a state, which is why this one is drawn as a swap and not as a badge.
 */
export const RegistrationSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // The deed crosses the frame at a constant rate — it is the whole first half
  // of the scene, and a front-loaded curve turned it into a jump followed by a
  // held frame.
  const travel = pace(progress, 0.04, 0.58, 0, 1);
  const inside = pace(progress, 0.5, 0.66, 0, 1);
  const swap = pace(progress, 0.6, 0.8, 0, 1);
  const done = spring({frame: frame - span * 0.74, fps, config: {damping: 16, stiffness: 160}});
  const glow = 0.25 + Math.abs(Math.sin(frame / 24)) * 0.2;
  // A slow drift across the whole shot, so the building is never a still photo.
  const camera = Math.sin(frame / 46) * 6;
  return (
    <FieldShell accent={accent} where="REGISTRO DE LA PROPIEDAD" title="La transferencia se inscribe" lift={lift} camera={progress}>
      <div style={{marginTop: 24, height: 326, borderRadius: 16, overflow: 'hidden', border: '2px solid #E8E1D0', background: '#F7F3E8'}}>
        <svg width="100%" height="100%" viewBox="0 0 660 326" preserveAspectRatio="xMidYMid slice">
          <rect width="660" height="326" fill="#F7F3E8" />
          <path d="M0 286 H660" stroke="#E0D7C3" strokeWidth="8" />
          <g transform={`translate(${358 - camera} 62)`}>
            <path d="M-8 46 L124 -8 L256 46 Z" fill="#D9CDB4" />
            <rect x="-8" y="46" width="264" height="16" fill="#C9BC9F" />
            {[0, 1, 2, 3].map((column) => (
              <rect key={column} x={16 + column * 64} y={62} width={38} height={128} rx={6} fill="#E4DAC6" />
            ))}
            <rect x="-8" y="190" width="264" height="20" fill="#C9BC9F" />
            {/* The door, not a slab: it reads as an entrance the deed goes
                through, and it only lights once the deed is inside. */}
            <path d="M96 190 V132 a28 28 0 0 1 56 0 V190 Z" fill="#CFC2A5" />
            <path d="M96 190 V132 a28 28 0 0 1 56 0 V190 Z" fill={accent} opacity={inside * (0.35 + glow * 0.9)} />
            <rect x="-24" y="210" width="296" height="12" fill="#D9CDB4" />
          </g>
          <g
            opacity={1 - inside}
            transform={`translate(${34 + travel * 392 - camera * 0.4} ${142 - travel * 8}) scale(${1 - travel * 0.34}) rotate(${travel * -6})`}
          >
            <rect x="0" y="0" width="126" height="152" rx="8" fill="#FFFFFF" stroke="#E0D7C3" strokeWidth="4" />
            <rect x="18" y="24" width="76" height="9" rx="4" fill="#DED6C4" />
            <rect x="18" y="46" width="90" height="9" rx="4" fill="#DED6C4" />
            <rect x="18" y="68" width="62" height="9" rx="4" fill="#DED6C4" />
            <circle cx="90" cy="116" r="24" fill="none" stroke={accent} strokeWidth="5" />
          </g>
        </svg>
      </div>
      <div
        style={{
          marginTop: 18,
          padding: '20px 26px',
          borderRadius: 16,
          background: '#FFFFFF',
          border: '2px solid #E8E1D0',
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.07em', color: '#9A8F79'}}>PROPIETARIO INSCRITO</div>
        {/* One name is replaced by the other inside a window that clips them:
            crossfading them in place read as a printing error at phone size. */}
        <div style={{position: 'relative', height: 54, marginTop: 6, overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: 0, fontSize: 42, fontWeight: 800, letterSpacing: '-.03em', color: '#B3A78D', opacity: 1 - smooth(swap * 1.6), transform: `translateY(${-swap * 54}px)`}}>
            El vendedor
          </div>
          <div style={{position: 'absolute', inset: 0, fontSize: 42, fontWeight: 800, letterSpacing: '-.03em', color: accent, opacity: smooth(swap * 1.4), transform: `translateY(${(1 - swap) * 54}px)`}}>
            Tu nombre
          </div>
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '20px 26px',
          borderRadius: 20,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: done,
          transform: `translateY(${(1 - done) * 22}px)`,
        }}
      >
        <CheckMark progress={done} accent={accent} />
        <div style={{fontSize: 28, fontWeight: 800}}>Ahí termina la transferencia</div>
      </div>
    </FieldShell>
  );
};

const PURCHASE_STEPS = ['Buscar', 'Verificar', 'Negociar', 'Promesa', 'Escritura', 'Inscripción'];

/**
 * The whole road in one frame, filled in the order it was walked.
 *
 * Two rails of three so six steps stay readable on a phone: the rail grows,
 * each step lights as the rail reaches it, and the chevron hands the movement
 * over to the second column. The proof is the last card — the piece ends where
 * the registry left it.
 */
export const PurchaseStepsSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // Six steps at one speed: the rail is the clock of the scene, so it has to
  // keep growing until the proof card arrives.
  const walked = pace(progress, 0.04, 0.78, 0, PURCHASE_STEPS.length);
  const handover = smooth((walked - 3) / 0.6);
  const keys = spring({frame: frame - span * 0.78, fps, config: {damping: 16, stiffness: 165}});
  const drift = Math.sin(frame / 30) * 2;
  return (
    <FieldShell accent={accent} where="EL PROCESO COMPLETO" title="Seis pasos, en este orden" lift={lift} camera={progress}>
      <div style={{position: 'relative', marginTop: 26, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 34, transform: `translateY(${drift}px)`}}>
        {[0, 1].map((column) => {
          const filled = smooth((walked - column * 3) / 3);
          return (
            <div key={column} style={{position: 'relative', paddingLeft: 6}}>
              <div style={{position: 'absolute', left: 32, top: 30, bottom: 30, width: 5, borderRadius: 99, background: '#E4DBC8'}} />
              <div style={{position: 'absolute', left: 32, top: 30, height: `calc((100% - 60px) * ${filled})`, width: 5, borderRadius: 99, background: accent}} />
              {PURCHASE_STEPS.slice(column * 3, column * 3 + 3).map((label, row) => {
                const index = column * 3 + row;
                const on = smooth(walked - index);
                return (
                  <div
                    key={label}
                    style={{
                      position: 'relative',
                      marginTop: row ? 34 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      opacity: 0.3 + on * 0.7,
                      transform: `translateX(${(1 - on) * -10}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 66,
                        height: 66,
                        borderRadius: 99,
                        display: 'grid',
                        placeItems: 'center',
                        background: on > 0.5 ? accent : '#F1EADA',
                        color: on > 0.5 ? '#FFFFFF' : '#9A8F79',
                        border: `3px solid ${on > 0.5 ? accent : '#E4DBC8'}`,
                        boxShadow: on > 0.5 ? `0 12px 26px ${accent}33` : 'none',
                        fontSize: 28,
                        fontWeight: 800,
                        transform: `scale(${0.86 + on * 0.14})`,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{fontSize: 31, fontWeight: 800, letterSpacing: '-.02em'}}>{label}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div style={{position: 'absolute', left: '50%', top: '50%', marginLeft: -14, marginTop: -18, opacity: handover, transform: `translateX(${(1 - handover) * -14}px)`}}>
          <svg width="28" height="36" viewBox="0 0 28 36">
            <path d="M6 6 L20 18 L6 30" fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div
        style={{
          marginTop: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '22px 26px',
          borderRadius: 20,
          background: `${accent}12`,
          border: `2px solid ${accent}40`,
          opacity: keys,
          transform: `translateY(${(1 - keys) * 26}px)`,
        }}
      >
        <svg width="54" height="54" viewBox="0 0 54 54">
          <path d="M8 26 L27 9 L46 26" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 26 V44 H40 V26" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div style={{fontSize: 28, fontWeight: 800}}>Inscrita a tu nombre</div>
          <div style={{marginTop: 4, fontSize: 23, fontWeight: 700, color: '#8A7F69'}}>Ahí termina la compra</div>
        </div>
      </div>
    </FieldShell>
  );
};

/**
 * What the listing an owner published does carry. Three rows, none of which is
 * the one the person writing actually needs.
 */
const LISTING_ROWS: Array<[string, string]> = [
  ['Fotos', 'La casa, la sala y el patio'],
  ['Precio', 'Publicado en la ficha'],
  ['Descripción', '3 hab. · 2 baños'],
];

/** What arrives when the listing does not say where it is — and instead of it. */
const ASKING = ['¿Dónde queda?', '¿Me manda la ubicación?'];
const KNOWING = ['¿Sigue disponible?', '¿Podemos verla el sábado?'];

/**
 * The listing an owner already published, and the messages it produces.
 *
 * One component, two states, because the piece asks a question in its hook and
 * answers it in its result: the same card, the same thread, and the only thing
 * that changed is whether the location row is empty. Drawing the payoff as a
 * different picture would have hidden that it is the same listing.
 *
 * The causality is the point and it is drawn, not implied: the rows are read at
 * a constant pace, the location row answers in the middle of the scene, and the
 * connector at the end ties the questions back to the row that produced them.
 */
const OwnerLocationAskSim: React.FC<SimulationProps & {resolved?: boolean}> = ({
  frame,
  total,
  accent,
  resolved = false,
}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  const lift = spring({frame, fps, config: {damping: 18, mass: 0.85}});
  // A hand going down the list, not a card that appeared and stopped.
  const read = pace(progress, 0.06, 0.44, 0, LISTING_ROWS.length + 0.3);
  // The state change, in the middle: the location row answers.
  const answer = smooth((progress - 0.42) / 0.16);
  const draw = pace(progress, 0.48, 0.72, 0, 1);
  const messages = resolved ? KNOWING : ASKING;
  const drift = ramp(progress, 0, 1, 0, 1);
  const breath = Math.sin(frame / 31) * 2.4;
  // Every message that lands hits the row that caused it: the reaction is the
  // causality, and it cannot cover a word the way a drawn connector did.
  const jolt = Math.min(
    1,
    Math.max(0, smooth((progress - 0.34) / 0.03) - smooth((progress - 0.42) / 0.07))
      + Math.max(0, smooth((progress - 0.56) / 0.03) - smooth((progress - 0.64) / 0.07)),
  );
  const alarm = resolved ? 0 : 0.5 + Math.sin(frame / 7) * 0.5;
  // Somebody is writing before each message lands, and stops when it does.
  const typing = Math.min(
    1,
    Math.max(0, smooth((progress - 0.14) / 0.08) - smooth((progress - 0.3) / 0.05))
      + Math.max(0, smooth((progress - 0.42) / 0.06) - smooth((progress - 0.52) / 0.05)),
  );
  return (
    <PublishShell
      accent={accent}
      eyebrow={resolved ? 'TU ANUNCIO CON UBICACIÓN' : 'TU ANUNCIO PUBLICADO'}
      title={resolved ? 'Con su punto en el mapa' : 'Fotos, precio y descripción'}
      status={resolved ? 'Ubicación en el mapa' : 'Publicado'}
      lift={lift}
      camera={progress}
    >
      <div style={{position: 'relative', marginTop: 20, transform: `translateY(${breath - drift * 9}px)`}}>
        <div style={{display: 'flex', gap: 18}}>
          <div style={{position: 'relative', width: 236, height: 188, borderRadius: 18, overflow: 'hidden', border: '2px solid #E4EAF3', boxShadow: '0 14px 32px rgba(8,9,21,.12)'}}>
            {/* The photo pans for the whole scene, not for its first two
                seconds: a block this size holding still is most of what makes
                the frame read as a photograph of a card. */}
            <PropertyThumbnail variant={0} progress={progress} />
            {/* The card carries invented facts, so it says so on screen. */}
            <div style={{position: 'absolute', left: 10, top: 10, padding: '5px 11px', borderRadius: 8, background: 'rgba(8,9,21,.74)', color: '#FFFFFF', fontSize: 22, fontWeight: 800, letterSpacing: '.06em'}}>
              EJEMPLO
            </div>
          </div>
          <div style={{flex: 1}}>
            {LISTING_ROWS.map(([label, detail], index) => {
              const done = smooth(read - index);
              return (
                <div
                  key={label}
                  style={{
                    marginTop: index ? 10 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '10px 16px',
                    borderRadius: 14,
                    background: '#F4F7FB',
                    border: `2px solid ${done > 0.5 ? `${accent}44` : '#E8EDF4'}`,
                    opacity: 0.4 + done * 0.6,
                    transform: `translateX(${(1 - done) * -16}px)`,
                  }}
                >
                  <CheckMark progress={done} accent={accent} />
                  <div style={{fontSize: 26, fontWeight: 800, letterSpacing: '-.02em'}}>{label}</div>
                  <div style={{marginLeft: 'auto', fontSize: 22, fontWeight: 700, color: '#7B8598', whiteSpace: 'nowrap'}}>{detail}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* The row the whole piece is about. */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            height: 104,
            padding: '0 20px',
            borderRadius: 18,
            background: resolved ? `${accent}10` : '#FFF3F1',
            border: `3px solid ${resolved ? `${accent}${answer > 0.5 ? '80' : '30'}` : `rgba(199,78,61,${Math.min(1, 0.25 + answer * 0.55 + jolt * 0.4)})`}`,
            boxShadow: resolved
              ? `0 16px ${38 + jolt * 26}px ${accent}${jolt > 0.4 ? '44' : '22'}`
              : `0 0 0 ${jolt * 10}px rgba(199,78,61,${jolt * 0.12})`,
            transform: resolved
              ? `scale(${1 + jolt * 0.02})`
              : `translateX(${Math.sin(frame / 1.5) * 7 * jolt}px)`,
          }}
        >
          {resolved ? (
            <div style={{width: 150, height: 76, borderRadius: 12, overflow: 'hidden', border: '2px solid #DCE4EE', background: '#E7EDF4'}}>
              <svg width="100%" height="100%" viewBox="0 0 150 76">
                <rect width="150" height="76" fill="#E7EDF4" />
                <g stroke="#CDD7E4" strokeWidth="6" fill="none">
                  <path d="M42 0V76" />
                  <path d="M104 0V76" />
                  <path d="M0 30H150" />
                </g>
                <path d="M0 58 C36 50 72 64 110 54 L150 50 V76 H0 Z" fill="#D8E8DE" />
                <g transform="translate(75 40)" opacity={draw}>
                  <circle r={22 * draw} fill={accent} opacity="0.16" />
                  <path d="M0-17c9.4 0 17 7.2 17 16 0 11-17 25-17 25s-17-14-17-25c0-8.8 7.6-16 17-16Z" fill={accent} stroke="#FFFFFF" strokeWidth="3.4" />
                  <circle cy="-1" r="5.4" fill="#FFFFFF" />
                </g>
              </svg>
            </div>
          ) : (
            <div style={{width: 54, height: 54, display: 'grid', placeItems: 'center', borderRadius: 99, background: `rgba(199,78,61,${0.1 + alarm * 0.14})`}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C64E3D" strokeWidth="2.3" strokeLinecap="round">
                <path d="M12 21S5 16.2 5 10.5a7 7 0 0 1 14 0C19 16.2 12 21 12 21Z" />
                <path d="M9.5 8.5l5 5m0-5l-5 5" />
              </svg>
            </div>
          )}
          <div>
            <div style={{fontSize: 28, fontWeight: 800, letterSpacing: '-.02em'}}>Ubicación</div>
            <div style={{marginTop: 3, fontSize: 24, fontWeight: 800, color: resolved ? accent : '#A74335'}}>
              {resolved ? 'En el mapa, con su punto' : 'No indicada'}
            </div>
          </div>
          <div style={{marginLeft: 'auto', width: 190, height: 10, borderRadius: 99, background: resolved ? `${accent}22` : '#F3D9D4', overflow: 'hidden'}}>
            <div style={{width: `${(resolved ? draw : answer) * 100}%`, height: '100%', borderRadius: 99, background: resolved ? accent : '#C64E3D'}} />
          </div>
        </div>

        {/* The consequence, arriving one message at a time. Somebody is typing
            between them, so the half of the card that is waiting for the next
            message is never a blank rectangle. */}
        <div style={{position: 'relative', marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12}}>
          {messages.map((text, index) => {
            const enter = spring({frame: frame - span * (0.34 + index * 0.22), fps, config: {damping: 17, mass: 0.82}});
            return (
              <div
                key={text}
                style={{
                  position: 'relative',
                  maxWidth: 560,
                  padding: '16px 24px',
                  borderRadius: '22px 22px 6px 22px',
                  background: '#FFFFFF',
                  border: '2px solid #E4EAF3',
                  boxShadow: '0 16px 36px rgba(8,9,21,.16)',
                  fontSize: 34,
                  fontWeight: 800,
                  letterSpacing: '-.02em',
                  opacity: enter,
                  transform: `translate(${(1 - enter) * 70}px, ${(1 - enter) * 14}px) scale(${0.94 + enter * 0.06})`,
                }}
              >
                {text}
              </div>
            );
          })}
          <div
            style={{
              display: 'flex',
              gap: 12,
              padding: '22px 26px',
              borderRadius: '22px 22px 6px 22px',
              background: '#FFFFFF',
              border: '2px solid #E4EAF3',
              boxShadow: '0 12px 28px rgba(8,9,21,.12)',
              opacity: typing,
              transform: `scale(${0.9 + typing * 0.1})`,
              transformOrigin: '100% 50%',
            }}
          >
            {[0, 1, 2].map((dot) => (
              <div key={dot} style={{width: 18, height: 18, borderRadius: 99, background: '#B6C0D0', transform: `translateY(${Math.sin(frame / 4 - dot) * 5}px)`}} />
            ))}
          </div>
        </div>
      </div>
    </PublishShell>
  );
};

export const OwnerLocationQuestionSim: React.FC<SimulationProps> = (props) => <OwnerLocationAskSim {...props} />;

export const OwnerLocationAnsweredSim: React.FC<SimulationProps> = (props) => <OwnerLocationAskSim {...props} resolved />;

/**
 * The street grid of the zone scene. Dense enough that a block is a block: at
 * the first pass the streets were 190 units apart and, once the camera closed
 * in, four white bands crossed the frame and nothing read as a city.
 */
const STREETS_X = Array.from({length: 22}, (_, index) => ({
  at: -400 + index * 96 + (index % 3) * 7,
  major: index % 4 === 2,
}));

const STREETS_Y = Array.from({length: 30}, (_, index) => ({
  at: -400 + index * 104 - (index % 3) * 6,
  major: index % 5 === 3,
}));

/**
 * Buildings inside the blocks. A street grid alone reads as graph paper: what
 * makes a map look like a city at this zoom is that the ground between the
 * streets is built on, unevenly.
 */
const CITY_BLOCKS: Array<[number, number, number, number]> = [];
for (let row = 0; row < 9; row += 1) {
  for (let column = 0; column < 11; column += 1) {
    const x = -330 + column * 96;
    const y = 130 + row * 104;
    const seed = (row * 7 + column * 13) % 5;
    CITY_BLOCKS.push([x + 16, y + 14, 30 + seed * 8, 24 + ((seed * 3) % 4) * 9]);
    CITY_BLOCKS.push([x + 16, y + 52, 22 + ((seed * 5) % 4) * 7, 26 + (seed % 3) * 6]);
    if (seed % 2 === 0) {
      CITY_BLOCKS.push([x + 50 + seed * 4, y + 50, 24 + (seed % 3) * 8, 22 + ((seed + 1) % 3) * 8]);
    }
  }
}

/** The three listings that stop being a list and become places on the map. */
const ZONE_MOVES: Array<{price: string; kind: string; target: [number, number]}> = [
  // Left to right, and the targets keep that order: crossed paths meant a card
  // in flight parked on top of a price that had already landed.
  {price: '$68.000', kind: 'Casa', target: [372, 528]},
  {price: '$54.000', kind: 'Departamento', target: [428, 712]},
  {price: '$96.000', kind: 'Casa', target: [566, 616]},
];

/**
 * Searching the other way round: the place first, the listings after it.
 *
 * The scene is one continuous move on one subject. The map is dragged — by a
 * finger, so the camera has a cause — until the zone the person cares about is
 * in frame; the zone is circled; and only then do the listings that were
 * floating above as a list drop into it and become prices with a location.
 * The last beat is the zone closing around them.
 *
 * The prices are an example of what a listing shows, which is why the badge is
 * on screen: nothing here says anything about a market.
 */
export const SearchOrderSim: React.FC<SimulationProps> = ({frame, total, accent}) => {
  const {fps} = useVideoConfig();
  const span = Math.max(1, total ?? frame + 1);
  const progress = frame / span;
  // The camera is dragged for the first third and keeps closing in afterwards,
  // so the frame is never parked.
  const zoom = ramp(progress, 0.04, 0.92, 1.02, 1.5);
  const centreX = ramp(progress, 0.04, 0.52, 690, 470);
  const centreY = ramp(progress, 0.04, 0.52, 792, 640);
  const width = 1080 / zoom;
  const height = 1920 / zoom;
  const viewX = centreX - width / 2;
  const viewY = centreY - height * 0.36;
  const unit = 1080 / width;
  const project = (x: number, y: number) => ({left: (x - viewX) * unit, top: (y - viewY) * unit});
  const ring = pace(progress, 0.22, 0.56, 0, 1);
  const hand = smooth((progress - 0.04) / 0.1) * (1 - smooth((progress - 0.44) / 0.12));
  const tap = smooth((progress - 0.3) / 0.06) * (1 - smooth((progress - 0.4) / 0.08));
  const label = spring({frame: frame - span * 0.66, fps, config: {damping: 16, stiffness: 170}});
  const close = smooth((progress - 0.84) / 0.16);
  const touchAt = {
    x: ramp(progress, 0.06, 0.34, 812, 556),
    y: ramp(progress, 0.06, 0.34, 812, 648),
  };
  return (
    <AbsoluteFill style={{backgroundColor: '#EDF1F7', fontFamily: font, color: palette.ink}}>
      <svg width="1080" height="1920" viewBox={`${viewX} ${viewY} ${width} ${height}`} style={{position: 'absolute', inset: 0}}>
        {/* A street map, drawn as a map is drawn: the ground is the blocks and
            the streets are cut out of it in white. The shared `Grid` is built
            for the country-wide shot of `sim:mapa`; at this zoom its pieces are
            the size of a building and it reads as loose rectangles. */}
        <rect x={-400} y={-400} width={2000} height={3000} fill="#D3DCE9" />
        <path d="M-120 330 C40 300 190 316 268 372 C330 418 316 500 250 528 C160 566 20 552 -120 520 Z" fill="#BFDCC6" />
        <path d="M700 700 C820 674 940 706 1060 690 L1060 880 C930 892 800 856 700 866 Z" fill="#B7D2E6" />
        <g fill="#C4CEDE">
          {CITY_BLOCKS.map(([x, y, w, h], index) => (
            <rect key={index} x={x} y={y} width={w} height={h} rx={4} />
          ))}
        </g>
        <g stroke="#F7F9FC" strokeLinecap="square" fill="none">
          {STREETS_X.map(({at, major}) => (
            <path key={`v-${at}`} d={`M${at} -400 V2600`} strokeWidth={major ? 34 : 15} />
          ))}
          {STREETS_Y.map(({at, major}) => (
            <path key={`h-${at}`} d={`M-400 ${at} H1600`} strokeWidth={major ? 32 : 15} />
          ))}
        </g>
        {/* The kerb line: without it the streets are gaps and the ground reads
            as a grid of panels rather than as blocks with roads between them. */}
        <g stroke="#AFBBCD" strokeWidth="3" fill="none" opacity="0.8">
          {STREETS_X.map(({at, major}) => (
            <React.Fragment key={`vc-${at}`}>
              <path d={`M${at - (major ? 19 : 9)} -400 V2600`} />
              <path d={`M${at + (major ? 19 : 9)} -400 V2600`} />
            </React.Fragment>
          ))}
          {STREETS_Y.map(({at, major}) => (
            <React.Fragment key={`hc-${at}`}>
              <path d={`M-400 ${at - (major ? 18 : 9)} H1600`} />
              <path d={`M-400 ${at + (major ? 18 : 9)} H1600`} />
            </React.Fragment>
          ))}
        </g>
        <g opacity={ring}>
          <circle cx="470" cy="620" r="214" fill={accent} fillOpacity={0.06 + close * 0.08} />
          <circle
            cx="470"
            cy="620"
            r="214"
            fill="none"
            stroke={accent}
            strokeWidth={7 / unit + 4}
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - ring}
            transform="rotate(-90 470 620)"
          />
        </g>
        {ZONE_MOVES.map((move, index) => {
          const land = spring({frame: frame - span * (0.46 + index * 0.15), fps, config: {damping: 15, stiffness: 180}});
          const settle = 1 + Math.sin(Math.max(0, progress - 0.86) * 34 - index) * 0.03 * close;
          const [x, y] = move.target;
          return (
            <g key={move.price} transform={`translate(${x} ${y}) scale(${(land * settle) / unit})`} opacity={land}>
              <circle r="46" fill={accent} opacity="0.14" />
              <rect x="-84" y="-34" width="168" height="60" rx="30" fill="#FFFFFF" stroke={accent} strokeWidth="5" />
              <text textAnchor="middle" y="8" fill={palette.ink} fontFamily={font} fontWeight={800} fontSize="34">
                {move.price}
              </text>
              <path d="M0 26 L12 44 L-12 44 Z" fill="#FFFFFF" stroke={accent} strokeWidth="5" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>

      {/* The list, before it becomes a place. */}
      {ZONE_MOVES.map((move, index) => {
        const travel = pace(progress, 0.22 + index * 0.15, 0.48 + index * 0.15, 0, 1);
        // The card gives way before it reaches its pin: arriving on top of a
        // price and then dissolving hides the very thing it turns into.
        const fade = 1 - smooth((travel - 0.58) / 0.28);
        const start = {left: 138 + index * 268, top: 318 + (index % 2) * 26};
        const destination = project(...move.target);
        const enter = spring({frame: frame - index * 5, fps, config: {damping: 18, mass: 0.8}});
        return (
          <div
            key={move.price}
            style={{
              position: 'absolute',
              left: start.left + (destination.left - 130 - start.left) * travel,
              top: start.top + (destination.top - 78 - start.top) * travel,
              width: 260,
              borderRadius: 22,
              overflow: 'hidden',
              background: '#FFFFFF',
              border: '2px solid #FFFFFF',
              boxShadow: '0 26px 60px rgba(8,9,21,.22)',
              opacity: Math.min(enter, fade) * (1 - travel * 0.3),
              transform: `translateY(${(1 - enter) * 60}px) scale(${(0.94 + enter * 0.06) * (1 - travel * 0.66)}) rotate(${(index - 1) * 2.4 * (1 - travel)}deg)`,
              transformOrigin: '50% 50%',
            }}
          >
            <div style={{height: 118, overflow: 'hidden'}}>
              <PropertyThumbnail variant={index + 1} progress={Math.min(1, frame / (fps * 1.5))} />
            </div>
            <div style={{padding: '12px 14px 14px'}}>
              <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.03em'}}>{move.price}</div>
              <div style={{marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 12, background: '#FFF3F1', border: '1px solid #F7D9D3'}}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C64E3D" strokeWidth="2.3" strokeLinecap="round">
                  <path d="M12 21S5 16.2 5 10.5a7 7 0 0 1 14 0C19 16.2 12 21 12 21Z" />
                  <path d="M9.5 8.5l5 5m0-5l-5 5" />
                </svg>
                <div style={{fontSize: 22, fontWeight: 800, color: '#A74335'}}>Sin lugar</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* The touch that moved the map and then chose the zone. A drawn hand at
          this size reads as a white blob; a contact point does not. */}
      <div style={{position: 'absolute', left: touchAt.x, top: touchAt.y, opacity: hand}}>
        <div style={{position: 'absolute', left: -60, top: -60, width: 120, height: 120, borderRadius: 999, border: `5px solid ${accent}`, opacity: tap * 0.8, transform: `scale(${0.45 + tap * 1.15})`}} />
        <div style={{position: 'absolute', left: -38, top: -38, width: 76, height: 76, borderRadius: 999, background: 'rgba(8,9,21,.5)', border: '5px solid rgba(255,255,255,.9)', boxShadow: '0 12px 30px rgba(8,9,21,.34)'}} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: project(470, 620).left - 82,
          top: project(470, 620).top - 214 * unit + 34,
          padding: '13px 26px',
          borderRadius: 99,
          background: palette.ink,
          color: '#FFFFFF',
          fontSize: 30,
          fontWeight: 800,
          opacity: label,
          transform: `translateY(${(1 - label) * -22}px) scale(${0.86 + label * 0.14})`,
          boxShadow: '0 18px 40px rgba(8,9,21,.34)',
        }}
      >
        Tu zona
      </div>

      <div style={{position: 'absolute', left: sideCrop, top: 862, padding: '6px 12px', borderRadius: 8, background: 'rgba(8,9,21,.72)', color: '#FFFFFF', fontSize: 22, fontWeight: 800, letterSpacing: '.06em'}}>
        EJEMPLO
      </div>

      <AbsoluteFill style={{top: CLEAR, background: 'linear-gradient(180deg, rgba(8,9,21,0) 0%, rgba(8,9,21,.58) 16%, rgba(8,9,21,.96) 32%)'}} />
    </AbsoluteFill>
  );
};

export const SIMULATIONS: Record<string, React.FC<SimulationProps>> = {
  'sim:geo-location-hero': GeoLocationHeroSim,
  'sim:geo-nearby-context': GeoNearbyContextSim,
  'sim:geo-property-detail': GeoPropertyDetailSim,
  'sim:credicasa-hero': CredicasaHeroSim,
  'sim:credicasa-fact-card': CredicasaFactCardSim,
  'sim:credicasa-home-gate': CredicasaHomeGateSim,
  'sim:credicasa-three-numbers': CredicasaThreeNumbersSim,
  'sim:credicasa-entry-example': CredicasaEntryExampleSim,
  'sim:credicasa-capacity': CredicasaCapacitySim,
  'sim:credicasa-applicants-a': CredicasaApplicantsASim,
  'sim:credicasa-applicants-b': CredicasaApplicantsBSim,
  'sim:credicasa-payment-example': CredicasaPaymentExampleSim,
  'sim:credicasa-total-envelope': CredicasaTotalEnvelopeSim,
  'sim:credicasa-rate-reset': CredicasaRateResetSim,
  'sim:credicasa-reservation': CredicasaReservationSim,
  'sim:credicasa-order-a': CredicasaOrderASim,
  'sim:credicasa-order-b': CredicasaOrderBSim,
  'sim:que-compras': WhatYouBuySim,
  'sim:propiedad-horizontal': HorizontalPropertySim,
  'sim:alicuota': ServiceChargeSim,
  'sim:edificio': BuildingStateSim,
  'sim:metros-utiles': UsableAreaSim,
  'sim:entorno-mapa': BuildingSurroundingsSim,
  'sim:escrituras': DeedSim,
  'sim:gravamenes': EncumbrancesSim,
  'sim:gravamenes-departamento': FlatEncumbrancesSim,
  'sim:uso-suelo': LandUseSim,
  'sim:linderos': BoundariesSim,
  'sim:servicios': UtilitiesSim,
  'sim:alrededor': PlotSurroundingsSim,
  'sim:forma-dibujada': PlotShapeOriginSim,
  'sim:medidas': PlotMeasurementsSim,
  'sim:dividir': PlotUnitPriceSim,
  'sim:preguntas': PlotQuestionsSim,
  'sim:anuncios': ListingsSim,
  'sim:llegada': ArrivalSim,
  'sim:mapa': MapSim,
  'sim:zona': ZoneSim,
  'sim:filtros': FiltersSim,
  'sim:ficha': CardSim,
  'sim:precio': PriceSim,
  'sim:publicar': FormSim,
  'sim:publicar-gratis': PublishFreeSim,
  'sim:formulario': PublicationFormSim,
  'sim:ubicacion-publicacion': PublicationLocationSim,
  'sim:fotos-publicacion': PublicationPhotosSim,
  'sim:chat-agente': AgentChatSim,
  'sim:inventario-agente': AgentInventorySim,
  'sim:enlace-corto': ShortLinkSim,
  'sim:revisar-fotos': BuyerDetailsSim,
  'sim:precio-area': BuyerPriceAreaSim,
  'sim:ubicacion-ficha': BuyerLocationSim,
  'sim:contacto': BuyerContactSim,
  'sim:vender': OwnerSellSim,
  'sim:cero-comision': OwnerOfferSim,
  'sim:ya-estan': OwnerAlreadyThereSim,
  'sim:anuncio-en-mapa': OwnerListingOnMapSim,
  'sim:te-contactan': OwnerIncomingSim,
  'sim:donde-queda': OwnerLocationQuestionSim,
  'sim:ya-lo-saben': OwnerLocationAnsweredSim,
  'sim:elige-zona': SearchOrderSim,
  'sim:verificar': VerificationSim,
  'sim:negociar': NegotiationSim,
  'sim:promesa': PromiseContractSim,
  'sim:escritura-publica': PublicDeedSim,
  'sim:inscripcion': RegistrationSim,
  'sim:pasos-compra': PurchaseStepsSim,
  'sim:aents-reveal': AentsRevealSim,
  'sim:aents-idea': AentsIdeaSim,
  'sim:aents-flujo': AentsWorkflowSim,
  'sim:aents-proceso': AentsProcessSim,
  'sim:aents-servicios': AentsServicesSim,
  'sim:aents-contacto': AentsContactSim,
  'sim:geo-ranking-hero': GeoRankingHookSim,
  'sim:pagina-ordenada': GeoOrderedPageSim,
  'sim:recetas-ranking': GeoRecipeSim,
  'sim:razon-posicion': GeoReasonSim,
  'sim:sin-destacado': GeoNoPromotedSim,
  'sim:aents-problema-software': AentsProblemToSoftwareSim,
  'sim:aents-disperso': AentsScatteredSim,
  'sim:aents-desconectado': AentsDisconnectedSim,
  'sim:aents-entender': AentsUnderstandSim,
  'sim:aents-soluciones': AentsSolutionsSim,
  'sim:aents-etapas': AentsStagesSim,
  'sim:aents-medida': AentsCustomFitSim,
  'sim:aents-web-busqueda': AentsWebSearchSim,
  'sim:aents-web-lenta': AentsWebSlowSim,
  'sim:aents-web-nueva': AentsWebRebuildSim,
  'sim:aents-web-conversion': AentsWebFunnelSim,
  'sim:aents-web-cierre': AentsWebClosingSim,
  'sim:aents-crecimiento': AentsGrowthSim,
  'sim:aents-carga': AentsOverloadSim,
  'sim:aents-giro': AentsTurnSim,
  'sim:aents-arquitectura': AentsArchitectureSim,
  'sim:aents-automatizacion': AentsAutomationSim,
  'sim:aents-panel': AentsPanelSim,
  'sim:aents-escala': AentsScaleSim,
  'sim:aents-posicionamiento': AentsPositioningSim,
  'sim:aents-cierre': AentsSignOffSim,
  'sim:aents-busqueda': AentsQuerySim,
  'sim:aents-lenta': AentsSlowSiteSim,
  'sim:aents-rebote': AentsBounceSim,
  'sim:aents-rearmado': AentsRebuildSim,
  'sim:aents-prueba-web': AentsWebProofSim,
  'sim:aents-antes': AentsWebDatedSim,
  'sim:aents-contraste': AentsWebContrastSim,
  'sim:aents-reconstruccion': AentsWebRebootSim,
  'sim:aents-credibilidad': AentsWebCredibilitySim,
  'sim:aents-cotizacion': AentsWebRequestSim,
  'sim:aents-adaptacion': AentsWebResponsiveSim,
  'sim:aents-comparacion': AentsWebBeforeAfterSim,
  'sim:aents-seo-encontrar': AentsSeoFoundSim,
  'sim:aents-seo-entender': AentsSeoUnderstandSim,
  'sim:aents-seo-intencion': AentsSeoIntentSim,
  'sim:aents-seo-senales': AentsSeoSignalsSim,
  'sim:aents-seo-red': AentsSeoNetworkSim,
  'sim:aents-seo-respuesta': AentsSeoAnswerSim,
  'sim:aents-seo-sin-truco': AentsSeoNoTrickSim,
  'sim:aents-seo-datos': AentsSeoDataSim,
  'sim:aents-seo-entidad': AentsSeoEntitySim,
  'sim:aents-seo-lectores': AentsSeoReadableSim,
  'sim:aents-encoge': AentsMobileShrinkSim,
  'sim:aents-sintomas': AentsMobileSymptomsSim,
  'sim:aents-dos-caminos': AentsMobileTwoPathsSim,
  'sim:aents-cabe': AentsMobileFitsSim,
  'sim:aents-pregunta': AentsMobileQuestionSim,
  'sim:aents-portal-escritorio': AentsMobilePortalDesktopSim,
  'sim:aents-portal-movil': AentsMobilePortalPhoneSim,
  'sim:aents-dedo': AentsMobileTouchSim,
  'sim:aents-tarjetas': AentsMobileCardsSim,
  'sim:aents-gestos': AentsMobileGesturesSim,
  'sim:aents-peso': AentsMobileWeightSim,
  'sim:aents-hacia-arriba': AentsMobileUpwardSim,
  'sim:aents-usala': AentsMobileUseItSim,
  'sim:aents-ia-funciona': AentsAiWorksSim,
  'sim:aents-ia-contexto': AentsAiContextSim,
  'sim:aents-ia-partes': AentsAiPartsSim,
  'sim:aents-ia-reglas': AentsAiRulesSim,
  'sim:aents-ia-camino-feliz': AentsAiHappyPathSim,
  'sim:aents-ia-revision': AentsAiReviewSim,
  'sim:aents-ia-dependencias': AentsAiDependenciesSim,
  'sim:aents-ia-seguridad': AentsAiSecuritySim,
  'sim:aents-ia-secretos': AentsAiSecretsSim,
  'sim:aents-ia-pruebas': AentsAiTestsSim,
  'sim:aents-ia-git': AentsAiGitSim,
  'sim:aents-ia-orden': AentsAiOrderSim,
  'sim:aents-ia-criterio': AentsAiJudgementSim,
  'sim:aents-ia-cierre': AentsAiClosingSim,
};
