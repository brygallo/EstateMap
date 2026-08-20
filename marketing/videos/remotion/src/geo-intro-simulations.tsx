import React from 'react';
import {AbsoluteFill} from 'remotion';
import {beat, glide, land, settle} from './system-kit';
import {DEPTH, HERO_MOVES, HeroImpact, HeroPlane} from './hero-stage';
import {EmCard, EmExample, EmGlyph, EmMeta, em, emCard, emType} from './estatemap-ui';
import {PropertyArt} from './property-art';
import {font, palette, sideCrop} from './theme';
import type {SimulationProps} from './simulations';

const fadeTop = 1120;

const CaptionShade: React.FC = () => (
  <div style={{position: 'absolute', inset: `${fadeTop}px 0 0`, background: `linear-gradient(180deg, transparent, rgba(20,23,40,.62) 38%, ${palette.ink} 72%)`}} />
);

const MapBlocks: React.FC<{progress: number; selected?: number}> = ({progress, selected = 0}) => {
  const blocks = [
    {x: 150, y: 360, w: 310, h: 250}, {x: 530, y: 340, w: 360, h: 270},
    {x: 120, y: 690, w: 350, h: 260}, {x: 550, y: 680, w: 330, h: 270},
  ];
  const pins = [{x: 300, y: 505}, {x: 705, y: 495}, {x: 720, y: 835}];
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - glide(progress, 0, 1)) * 90}px) scale(${0.96 + progress * 0.04})`}}>
      {blocks.map((b, index) => <div key={index} style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: 34, background: index === selected ? em.primaryLight : '#E8EDF2', border: `3px solid ${index === selected ? em.primary : '#D5DDE5'}`, boxShadow: 'inset 0 0 0 12px rgba(255,255,255,.46)'}} />)}
      <div style={{position: 'absolute', left: 0, right: 0, top: 635, height: 62, background: '#FFFFFF', boxShadow: '0 0 0 3px #D5DDE5'}} />
      <div style={{position: 'absolute', top: 250, bottom: 0, left: 485, width: 64, background: '#FFFFFF', boxShadow: '0 0 0 3px #D5DDE5'}} />
      {pins.map((pin, index) => {
        const enter = land(progress, 0.2 + index * 0.13, 0.52 + index * 0.13);
        return <div key={index} style={{position: 'absolute', left: pin.x - 56, top: pin.y - 76, transform: `scale(${enter * (index === selected ? 1.1 : 1)})`, transformOrigin: '50% 100%'}}><div style={{padding: '12px 20px', borderRadius: 999, background: index === selected ? em.primary : em.background, color: index === selected ? em.white : em.text, border: emCard.border, boxShadow: emCard.shadowHover, fontSize: 25, fontWeight: 900}}>EJEMPLO</div><div style={{width: 5, height: 34, background: em.primary, margin: '0 auto', borderRadius: 6}} /></div>;
      })}
    </div>
  );
};

export const GeoLocationHeroSim: React.FC<SimulationProps> = ({frame, total}) => {
  const p = frame / Math.max(1, total);
  const camera = HERO_MOVES['track-side'](p);
  const cardIn = land(p, 0.02, 0.2);
  const question = land(p, 0.24, 0.42);
  const mapReveal = settle(p, 0.5, 0.88);
  const tap = Math.sin(beat(p, 0.43, 0.56) * Math.PI);
  return (
    <AbsoluteFill style={{background: em.surfaceAlt, overflow: 'hidden', fontFamily: font}}>
      <AbsoluteFill style={{background: `radial-gradient(90% 42% at 70% 22%, ${em.primaryLight}, transparent 68%), linear-gradient(180deg, ${em.background}, ${em.surface})`}} />
      <HeroPlane camera={camera} depth={DEPTH.context}><MapBlocks progress={mapReveal} selected={1} /></HeroPlane>
      <HeroPlane camera={camera} depth={DEPTH.subject}>
        <div style={{position: 'absolute', left: sideCrop + 24 - mapReveal * 920, top: 360 - mapReveal * 70, width: 720, opacity: cardIn, transform: `scale(${0.88 + cardIn * 0.12 - mapReveal * 0.12}) rotateY(${mapReveal * -8}deg)`}}>
          <EmCard raised style={{padding: 28}}>
            <EmExample />
            <PropertyArt kind="house" variant={18} progress={p} style={{height: 270, marginTop: 18, borderRadius: 14, overflow: 'hidden'}} />
            <div style={{fontSize: emType.title, fontWeight: 900, marginTop: 18}}>Casa en venta</div>
            <div style={{fontSize: emType.price, fontWeight: 900, color: em.primaryStrong, marginTop: 10}}>$ —</div>
            <div style={{marginTop: 18, display: 'flex', gap: 24}}><EmMeta icon="home" text="3 habitaciones" /><EmMeta icon="pin" text="Ver en el mapa" /></div>
          </EmCard>
        </div>
      </HeroPlane>
      <HeroPlane camera={camera} depth={DEPTH.foreground}>
        <div style={{position: 'absolute', left: 610 + mapReveal * 760, top: 810 - tap * 20, opacity: question, transform: `scale(${0.8 + question * 0.2 + tap * 0.16})`, padding: '22px 30px', borderRadius: 999, background: em.navy, color: em.white, fontSize: 38, fontWeight: 900, boxShadow: '0 24px 54px rgba(15,16,32,.3)'}}>¿Dónde queda?</div>
        <div style={{position: 'absolute', left: 790 + mapReveal * 760, top: 900 - tap * 26, opacity: question}}><EmGlyph icon="cursor" size={62} color={em.text} /></div>
      </HeroPlane>
      <HeroImpact progress={p} at={0.51} x={720} y={760} color={em.primary} reach={690} />
      <CaptionShade />
    </AbsoluteFill>
  );
};

export const GeoNearbyContextSim: React.FC<SimulationProps> = ({frame, total}) => {
  const p = frame / Math.max(1, total);
  const selected = settle(p, 0.06, 0.3);
  const compare = settle(p, 0.36, 0.78);
  return (
    <AbsoluteFill style={{background: em.surfaceAlt, overflow: 'hidden', fontFamily: font}}>
      <MapBlocks progress={p} selected={0} />
      <div style={{position: 'absolute', left: sideCrop + 18, top: 340, width: 430, transform: `translateX(${(1 - selected) * -520 - compare * 160}px) scale(${1 - compare * 0.12})`, opacity: selected}}>
        <EmCard raised style={{padding: 22}}><EmExample /><PropertyArt kind="house" variant={21} progress={p} style={{height: 190, marginTop: 14, borderRadius: 12, overflow: 'hidden'}} /><div style={{fontSize: 31, fontWeight: 900, marginTop: 12}}>Tu opción</div><div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, color: em.primaryStrong, fontSize: 26, fontWeight: 800}}><EmGlyph icon="pin" size={28} color={em.primaryStrong} />En el mapa</div></EmCard>
      </div>
      <div style={{position: 'absolute', left: 545, top: 270, opacity: compare, transform: `translateY(${(1 - compare) * 80}px)`}}><div style={{fontSize: 30, fontWeight: 900, color: em.text}}>PROPIEDADES CERCANAS</div><div style={{marginTop: 14, padding: '14px 20px', borderRadius: 999, background: em.primaryLight, color: em.primaryStrong, fontSize: 26, fontWeight: 800}}>Compara por ubicación</div></div>
      <div style={{position: 'absolute', left: 594, top: 430, width: 280, opacity: compare, transform: `translateY(${(1 - compare) * 70}px) scale(${0.9 + compare * 0.1})`}}><EmCard raised style={{padding: 14}}><EmExample /><PropertyArt kind="apartment" variant={24} progress={p} style={{height: 120, marginTop: 8, borderRadius: 10, overflow: 'hidden'}} /><div style={{fontSize: 25, fontWeight: 900, marginTop: 8}}>Departamento</div><div style={{fontSize: 22, color: em.textMuted, marginTop: 4}}>Cerca de tu opción</div></EmCard></div>
      <div style={{position: 'absolute', left: 610, top: 760, width: 260, opacity: settle(p, 0.55, 0.9), transform: `translateX(${(1 - compare) * 90}px)`}}><EmCard style={{padding: 12}}><EmExample /><PropertyArt kind="house" variant={27} progress={p} style={{height: 105, marginTop: 7, borderRadius: 10, overflow: 'hidden'}} /><div style={{fontSize: 24, fontWeight: 900, marginTop: 7}}>Casa</div><div style={{fontSize: 22, color: em.textMuted}}>Otra ubicación</div></EmCard></div>
      <CaptionShade />
    </AbsoluteFill>
  );
};

export const GeoPropertyDetailSim: React.FC<SimulationProps> = ({frame, total}) => {
  const p = frame / Math.max(1, total);
  const map = glide(p, 0, 0.3);
  const open = land(p, 0.2, 0.52);
  const details = settle(p, 0.48, 0.88);
  return (
    <AbsoluteFill style={{background: em.surfaceAlt, overflow: 'hidden', fontFamily: font}}>
      <MapBlocks progress={map} selected={1} />
      <div style={{position: 'absolute', left: sideCrop + 18, top: 300, width: 840, transform: `translateY(${(1 - open) * 180}px) scale(${0.82 + open * 0.18})`, opacity: open}}>
        <EmCard raised style={{padding: 26}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{fontSize: 27, fontWeight: 900, color: em.primaryStrong}}>FICHA PÚBLICA</div><EmExample /></div>
          <PropertyArt kind="house" variant={22} progress={p} style={{height: 260, marginTop: 18, borderRadius: 14, overflow: 'hidden'}} />
          <div style={{fontSize: 42, fontWeight: 900, marginTop: 18}}>Casa en venta</div>
          <div style={{display: 'flex', gap: 24, marginTop: 14, opacity: details}}><EmMeta icon="home" text="3 habitaciones" /><EmMeta icon="pin" text="Ubicación en mapa" /></div>
          <div style={{height: 64, marginTop: 20, borderRadius: emCard.radius, background: em.primary, color: em.white, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: 28, fontWeight: 900, transform: `scale(${0.96 + details * 0.04})`}}><EmGlyph icon="pin" size={30} color={em.white} />Ver ubicación</div>
        </EmCard>
      </div>
      <CaptionShade />
    </AbsoluteFill>
  );
};
