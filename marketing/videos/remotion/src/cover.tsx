import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {fit, useFontReady} from './layout';
import {font, palette, safe} from './theme';
import type {CoverProps} from './types';

const LocationGlyph = ({accent}: {accent: string}) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 21S5 16.2 5 10.5a7 7 0 0 1 14 0C19 16.2 12 21 12 21Z"/><circle cx="12" cy="10" r="2.2"/>
  </svg>
);

const PremiumHouse: React.FC<{accent: string}> = ({accent}) => (
  <svg width="100%" height="100%" viewBox="0 0 620 340" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="cover-house-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D6F0F7"/><stop offset="1" stopColor="#54768E"/></linearGradient>
      <filter id="cover-house-shadow" x="-25%" y="-25%" width="150%" height="180%"><feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#000" floodOpacity=".35"/></filter>
    </defs>
    <ellipse cx="310" cy="304" rx="270" ry="24" fill="#000" opacity=".25" />
    <g filter="url(#cover-house-shadow)">
      <rect x="68" y="96" width="486" height="194" rx="9" fill="#F0ECE5" />
      <rect x="50" y="72" width="524" height="34" rx="7" fill="#283A4A" />
      <rect x="98" y="126" width="202" height="86" rx="5" fill="url(#cover-house-glass)" />
      <path d="M199 126 V212" stroke="#FFF" strokeWidth="9" opacity=".76" />
      <rect x="344" y="126" width="166" height="112" rx="5" fill="url(#cover-house-glass)" />
      <path d="M427 126 V238" stroke="#FFF" strokeWidth="9" opacity=".72" />
      <rect x="262" y="210" width="72" height="80" rx="5" fill="#A87555" />
      <rect x="82" y="226" width="148" height="64" fill="#D2BDA5" />
      <path d="M78 290 H542" stroke="#E7ECEF" strokeWidth="15" strokeLinecap="round" />
      <rect x="110" y="264" width="94" height="17" rx="9" fill="#66B8C9" />
      <g fill="#3E7C55"><circle cx="42" cy="252" r="37"/><circle cx="578" cy="250" r="40"/></g>
    </g>
    <g transform="translate(500 106)">
      <path d="M0 -54 C34 -54 58 -30 58 2 C58 40 0 84 0 84 S-58 40 -58 2 C-58 -30 -34 -54 0 -54Z" fill={accent} stroke="#FFF" strokeWidth="7" />
      <circle cy="1" r="18" fill="#FFF" />
    </g>
  </svg>
);

const FilterMapCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', position: 'relative', borderRadius: 38, overflow: 'hidden', background: '#E8EEF5', border: '2px solid rgba(255,255,255,.16)', boxShadow: '0 34px 100px rgba(0,0,0,.38)'}}>
    <svg width="100%" height="100%" viewBox="0 0 920 590" preserveAspectRatio="none">
      <rect width="920" height="590" fill="#E8EEF5" />
      {[90, 245, 405, 565, 730, 865].map((x) => <path key={`v-${x}`} d={`M${x} -40 V640`} stroke="#D2DBE8" strokeWidth="18" />)}
      {[75, 210, 360, 510].map((y) => <path key={`h-${y}`} d={`M-30 ${y} H950`} stroke="#D2DBE8" strokeWidth="15" />)}
      <path d="M-40 295 C180 245 320 355 520 300 S760 230 960 270 L960 365 C740 335 630 400 470 385 S170 350 -40 405 Z" fill="#D9E8DF" />
      {[
        {x: 155, y: 145, p: '$74k', keep: false}, {x: 430, y: 180, p: '$122k', keep: true},
        {x: 745, y: 125, p: '$230k', keep: false}, {x: 250, y: 340, p: '$98k', keep: true},
        {x: 635, y: 330, p: '$145k', keep: true},
      ].map((pin) => (
        <g key={pin.p} transform={`translate(${pin.x} ${pin.y})`} opacity={pin.keep ? 1 : .28}>
          <rect x="-66" y="-27" width="132" height="47" rx="24" fill="#FFFFFF" stroke={pin.keep ? accent : '#98A2B3'} strokeWidth="4" />
          <text x="0" y="5" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="25" fill={palette.ink}>{pin.p}</text>
          <path d="M0 20 L10 35 L-10 35 Z" fill={pin.keep ? accent : '#98A2B3'} />
        </g>
      ))}
    </svg>
    <div style={{position: 'absolute', left: 26, top: 24, padding: '11px 18px', borderRadius: 99, background: '#FFFFFF', border: `2px solid ${accent}55`, color: accent, fontFamily: font, fontWeight: 800, fontSize: 22}}>Precio: $80k – $160k ×</div>
    <div style={{position: 'absolute', left: 34, right: 34, bottom: 30, padding: '24px 28px', borderRadius: 28, background: 'rgba(255,255,255,.97)', boxShadow: '0 22px 55px rgba(8,9,21,.22)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: font}}><span style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>Rango de precio</span><span style={{fontSize: 20, fontWeight: 800, color: accent}}>$80k – $160k</span></div>
      <div style={{height: 11, marginTop: 24, borderRadius: 99, background: '#DDE4EF', position: 'relative'}}><div style={{position: 'absolute', left: 70, right: 160, height: 11, borderRadius: 99, background: accent}}/><div style={{position: 'absolute', right: 140, top: -12, width: 35, height: 35, borderRadius: 20, background: '#FFFFFF', border: `6px solid ${accent}`}}/></div>
      <div style={{marginTop: 22, borderRadius: 16, padding: '12px 18px', textAlign: 'center', background: accent, color: '#FFFFFF', fontFamily: font, fontWeight: 800, fontSize: 22}}>3 opciones en esta zona</div>
    </div>
  </div>
);

const PublishCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', padding: 34, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>Publica tu propiedad</div><div style={{padding: '10px 16px', borderRadius: 99, background: `${accent}20`, color: accent, fontSize: 20, fontWeight: 800}}>PASO 3 DE 5</div></div>
    <div style={{marginTop: 22, height: 10, borderRadius: 99, background: '#DFE6EF'}}><div style={{width: '62%', height: '100%', borderRadius: 99, background: accent}}/></div>
    <div style={{marginTop: 30, display: 'grid', gridTemplateColumns: '1fr 210px', gap: 22}}><div>{['Datos de la propiedad','Ubicación exacta','Precio y fotos'].map(label => <div key={label} style={{marginBottom: 16, padding: '17px 20px', borderRadius: 17, background: '#EDF2F7', color: palette.ink, fontSize: 22, fontWeight: 800}}>✓ &nbsp; {label}</div>)}</div><div style={{borderRadius: 28, background: accent, color: '#FFF', display: 'grid', placeItems: 'center', textAlign: 'center'}}><div><div style={{fontSize: 74, fontWeight: 800, letterSpacing: '-.06em'}}>$0</div><div style={{fontSize: 20, fontWeight: 800}}>SIN COMISIÓN</div></div></div></div>
  </div>
);

const ReviewChecklistCover: React.FC<{accent: string; heading?: string; labels?: string[]}> = ({
  accent,
  heading = 'Antes de contactar',
  labels = ['Fotos y datos', 'Precio ÷ área', 'Ubicación'],
}) => (
  <div style={{width: '100%', height: '100%', padding: 34, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>{heading}</div><div style={{padding: '10px 16px', borderRadius: 99, background: `${accent}20`, color: accent, fontSize: 20, fontWeight: 800}}>3 COMPROBACIONES</div></div>
    <div style={{marginTop: 25, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15}}>{labels.map((label, index) => {
      const number = String(index + 1).padStart(2, '0');
      return <div key={number} style={{height: 235, padding: '25px 22px', borderRadius: 26, background: number === '01' ? `${accent}18` : '#EDF2F7', border: `2px solid ${number === '01' ? `${accent}40` : '#E2E8F0'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}><div style={{fontSize: 24, fontWeight: 800, color: accent}}>{number}</div><div style={{fontSize: 28, lineHeight: 1.05, fontWeight: 800, color: palette.ink}}>{label}</div><div style={{width: 42, height: 42, borderRadius: 14, background: accent, color: '#FFF', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800}}>✓</div></div>;
    })}</div>
  </div>
);

/**
 * The whole purchase as a ladder, so the thumbnail promises the same six steps
 * the piece walks. The last tile carries the accent because the transfer is
 * only finished when it is registered.
 */
const PURCHASE_COVER_STEPS = ['Buscar', 'Verificar', 'Negociar', 'Promesa', 'Escritura', 'Inscripción'];

const ProcessCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', padding: 34, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>De la búsqueda al registro</div><div style={{padding: '10px 16px', borderRadius: 99, background: `${accent}20`, color: accent, fontSize: 20, fontWeight: 800}}>6 PASOS</div></div>
    <div style={{marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15}}>{PURCHASE_COVER_STEPS.map((label, index) => {
      const last = index === PURCHASE_COVER_STEPS.length - 1;
      return <div key={label} style={{height: 108, padding: '18px 20px', borderRadius: 22, background: last ? `${accent}18` : '#EDF2F7', border: `2px solid ${last ? `${accent}40` : '#E2E8F0'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}><div style={{fontSize: 22, fontWeight: 800, color: accent}}>{String(index + 1).padStart(2, '0')}</div><div style={{fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: palette.ink}}>{label}</div></div>;
    })}</div>
  </div>
);

const AentsCaseCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', padding: 30, borderRadius: 38, background: 'linear-gradient(145deg,#211B52,#0F1020)', border: '2px solid rgba(167,139,250,.3)', boxShadow: '0 34px 100px rgba(0,0,0,.48)', fontFamily: font, color: '#FFF'}}>
    <div style={{height: 48, display: 'flex', alignItems: 'center', gap: 9, padding: '0 16px', borderRadius: '18px 18px 0 0', background: '#FFF'}}>{['#FF6B6B','#FFD166','#22C55E'].map(c=><i key={c} style={{width:11,height:11,borderRadius:99,background:c}}/>)}<div style={{marginLeft:12,flex:1,padding:'7px 16px',borderRadius:99,background:'#F1F3F6',fontSize:16,fontWeight:800,color:'#59627A'}}>geopropiedadesecuador.com</div></div>
    <div style={{position:'relative',height:255,borderRadius:'0 0 24px 24px',overflow:'hidden',background:'#E7EDF4'}}><svg width="100%" height="100%" viewBox="0 0 860 255">{[90,240,390,540,690,830].map(x=><path key={x} d={`M${x} 0V255`} stroke="#CDD7E4" strokeWidth="13"/>)}{[80,190].map(y=><path key={y} d={`M0 ${y}H860`} stroke="#CDD7E4" strokeWidth="13"/>)}{[[220,100],[470,145],[680,85]].map(([x,y],i)=><g key={x} transform={`translate(${x} ${y})`}><rect x="-55" y="-25" width="110" height="44" rx="22" fill="#FFF" stroke="#22C55E" strokeWidth="4"/><text y="5" textAnchor="middle" fontFamily={font} fontSize="21" fontWeight="800" fill="#080915">{['$122k','$85k','$230k'][i]}</text></g>)}</svg><div style={{position:'absolute',right:20,bottom:18,display:'flex',alignItems:'center',gap:12,padding:'12px 17px',borderRadius:19,background:accent,boxShadow:`0 16px 38px ${accent}55`}}><Img src={staticFile('brand/aents-brand-tile-1024.png')} style={{width:48,height:48,borderRadius:14}}/><div><div style={{fontSize:15,fontWeight:800,opacity:.72}}>CONSTRUIDO POR</div><div style={{fontSize:29,fontWeight:800}}>Aents</div></div></div></div>
  </div>
);

/**
 * The cover of the search piece: what an invented company ranks with, and the
 * row that stays empty.
 *
 * The surface is a generic result list — a field, a magnifier and rows — rather
 * than an imitation of a search engine's marks. Every line belongs to
 * `tuempresa.com`, which is why the badge sits on it: the drawing shows a
 * situation, it does not report anyone's rankings.
 */
const AentsSearchCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', fontFamily: font, color: palette.white, position: 'relative'}}>
    <div style={{height: 76, display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', borderRadius: 99, background: palette.white, boxShadow: '0 18px 44px rgba(0,0,0,.34)'}}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="#67718A" strokeWidth="2.6" />
        <path d="M15.4 15.4L20 20" stroke="#67718A" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <span style={{fontSize: 31, fontWeight: 800, color: palette.ink, letterSpacing: '-.02em'}}>Tu Empresa</span>
    </div>

    <div style={{marginTop: 16, display: 'grid', gap: 10}}>
      {[
        ['Perfil de Instagram', 'instagram.com'],
        ['Página de Facebook', 'facebook.com'],
        ['Ficha en un directorio', 'directorio-de-empresas.ec'],
      ].map(([kind, host]) => (
        <div key={kind} style={{height: 62, boxSizing: 'border-box', padding: '0 22px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.07)', border: '2px solid rgba(255,255,255,.12)'}}>
          <span style={{fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.82)'}}>{kind}</span>
          <span style={{fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,.4)'}}>{host}</span>
        </div>
      ))}
      <div style={{height: 74, boxSizing: 'border-box', padding: '0 22px', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 16, border: '3px dashed #F59E0B', background: 'rgba(245,158,11,.09)'}}>
        <span style={{width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#F59E0B', color: '#1B1204', fontSize: 25, fontWeight: 800, lineHeight: 1}}>✕</span>
        <span style={{fontSize: 27, fontWeight: 800}}>Tu página web</span>
        <span style={{marginLeft: 'auto', fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: '#F59E0B'}}>NO APARECE</span>
      </div>
    </div>

    <div style={{position: 'absolute', right: 0, bottom: -30, display: 'flex', alignItems: 'center', gap: 12}}>
      <span style={{width: 10, height: 10, borderRadius: 99, background: accent}} />
      <span style={{padding: '7px 13px', borderRadius: 9, background: 'rgba(8,9,21,.72)', fontWeight: 800, fontSize: 20, letterSpacing: '.08em', color: 'rgba(255,255,255,.8)'}}>EJEMPLO</span>
    </div>
  </div>
);

/**
 * The cover of the transformation piece: one page twice.
 *
 * The two halves are the same company, so they are drawn at the same size and
 * in the same frame; only the density changes. The left is cramped and grey,
 * the right breathes and has one thing to press. The divider between them is
 * the piece in one image, and it is the only element allowed to use the accent.
 */
/**
 * The cover of the lesson about being found: an answer written by a reader,
 * and the sources under it.
 *
 * The empty slot is the whole promise of the piece — the business that is not
 * among the sources — so it carries the accent while the two that are cited
 * stay neutral. Nobody's mark appears: the surface is drawn as the pattern the
 * viewer recognises and the hosts belong to an invented example.
 */
const AentsCitedCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', fontFamily: font, color: palette.white, position: 'relative'}}>
    <div style={{boxSizing: 'border-box', height: '100%', padding: '24px 26px', borderRadius: 30, background: 'linear-gradient(160deg,#1D1D3C,#0C0D1E)', border: `2px solid ${accent}44`, boxShadow: '0 24px 60px rgba(0,0,0,.44)'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: `linear-gradient(140deg, ${accent}, #5A46E0)`, fontSize: 21, fontWeight: 800}}>IA</span>
        <span style={{fontSize: 25, fontWeight: 800, color: 'rgba(255,255,255,.62)'}}>¿A quién me recomiendan?</span>
      </div>
      <div style={{marginTop: 22, display: 'grid', gap: 12}}>
        {[100, 92, 74].map((width, index) => (
          <div key={index} style={{height: 15, width: `${width}%`, borderRadius: 99, background: 'rgba(255,255,255,.3)'}} />
        ))}
      </div>
      <div style={{marginTop: 26, paddingTop: 20, borderTop: '2px solid rgba(255,255,255,.12)'}}>
        <div style={{fontSize: 19, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.42)'}}>FUENTES</div>
        <div style={{marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
          {['otro-sitio.ec', 'directorio.ec'].map((host) => (
            <span key={host} style={{padding: '10px 16px', borderRadius: 99, background: 'rgba(255,255,255,.1)', border: '2px solid rgba(255,255,255,.14)', fontSize: 21, fontWeight: 800, color: 'rgba(255,255,255,.6)'}}>{host}</span>
          ))}
          <span style={{padding: '10px 16px', borderRadius: 99, border: `3px dashed ${accent}`, fontSize: 21, fontWeight: 800, color: accent}}>¿tu empresa?</span>
        </div>
      </div>
    </div>

    <div style={{position: 'absolute', right: 0, bottom: -30, display: 'flex', alignItems: 'center', gap: 12}}>
      <span style={{width: 10, height: 10, borderRadius: 99, background: accent}} />
      <span style={{padding: '7px 13px', borderRadius: 9, background: 'rgba(8,9,21,.72)', fontWeight: 800, fontSize: 20, letterSpacing: '.08em', color: 'rgba(255,255,255,.8)'}}>EJEMPLO</span>
    </div>
  </div>
);

const AentsTransformCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', fontFamily: font, color: palette.white, position: 'relative', display: 'flex', gap: 22}}>
    <div style={{flex: 1, borderRadius: 26, overflow: 'hidden', background: '#E9EBF0', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,.34)'}}>
      <div style={{height: 34, background: '#C9CED8'}} />
      <div style={{padding: '16px 18px'}}>
        <div style={{height: 11, width: '78%', background: '#A9B0BE'}} />
        <div style={{marginTop: 9, height: 7, width: '92%', background: '#BDC3CE'}} />
        <div style={{marginTop: 6, height: 7, width: '86%', background: '#BDC3CE'}} />
        <div style={{marginTop: 6, height: 7, width: '68%', background: '#BDC3CE'}} />
        <div style={{marginTop: 16, height: 26, width: 96, borderRadius: 4, background: '#B0B6C2'}} />
        <div style={{marginTop: 18, display: 'flex', gap: 8}}>
          {[0, 1, 2, 3].map((box) => (
            <div key={box} style={{flex: 1, height: 44, background: '#D6DAE3'}} />
          ))}
        </div>
      </div>
      <span style={{position: 'absolute', left: 16, bottom: 14, padding: '6px 12px', borderRadius: 8, background: '#8A909E', fontSize: 19, fontWeight: 800, letterSpacing: '.14em', color: '#FFFFFF'}}>ANTES</span>
    </div>

    <div style={{width: 4, alignSelf: 'stretch', borderRadius: 99, background: accent, boxShadow: `0 0 36px 8px ${accent}55`}} />

    <div style={{flex: 1, borderRadius: 26, overflow: 'hidden', background: 'linear-gradient(160deg,#1D1D3C,#0C0D1E)', border: `2px solid ${accent}44`, position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,.44)'}}>
      <div style={{height: 34, background: 'rgba(255,255,255,.08)'}} />
      <div style={{padding: '20px 20px'}}>
        <div style={{fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.14}}>Construimos espacios que permanecen.</div>
        <div style={{marginTop: 16, display: 'inline-block', padding: '11px 20px', borderRadius: 13, background: accent, fontSize: 20, fontWeight: 800}}>Solicitar cotización</div>
      </div>
      <span style={{position: 'absolute', left: 20, bottom: 14, padding: '6px 12px', borderRadius: 8, background: palette.green, fontSize: 19, fontWeight: 800, letterSpacing: '.14em', color: '#06210F'}}>DESPUÉS</span>
    </div>

    <div style={{position: 'absolute', right: 0, bottom: -30, display: 'flex', alignItems: 'center', gap: 12}}>
      <span style={{width: 10, height: 10, borderRadius: 99, background: accent}} />
      <span style={{padding: '7px 13px', borderRadius: 9, background: 'rgba(8,9,21,.72)', fontWeight: 800, fontSize: 20, letterSpacing: '.08em', color: 'rgba(255,255,255,.8)'}}>EJEMPLO</span>
    </div>
  </div>
);

/**
 * The cover of the mobile-first lesson: one phone, cut down the middle.
 *
 * Both halves are the same screen on the same device, which is the whole
 * argument — the difference is not the size of the glass, it is what was
 * decided first. The left half is a desktop page multiplied by a small number:
 * grey, dense, illegible. The right half is one column with one thing to press,
 * and the pale disc over it is a fingertip drawn to the same scale, so the
 * cover shows the target problem rather than describing it.
 */
const AentsMobileCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', fontFamily: font, color: palette.white, position: 'relative', display: 'flex', alignItems: 'center', gap: 26}}>
    <div style={{flex: 1}}>
      <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.46)'}}>SOLO ADAPTADA</div>
      {['Todo se encoge igual', 'Botones para cursor', 'Cabe, pero incomoda'].map((line) => (
        <div key={line} style={{marginTop: 13, display: 'flex', alignItems: 'center', gap: 11}}>
          <span style={{width: 9, height: 9, borderRadius: 99, background: '#8A909E'}} />
          <span style={{fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.7)'}}>{line}</span>
        </div>
      ))}
    </div>

    <div style={{width: 268, height: 380, boxSizing: 'border-box', padding: 10, borderRadius: 40, background: '#1A1B32', border: `2px solid ${accent}55`, boxShadow: '0 28px 76px rgba(0,0,0,.5)', position: 'relative'}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 31, overflow: 'hidden', background: '#F4F7FB'}}>
        {/* Left half: the desktop page, multiplied down. */}
        <div style={{position: 'absolute', inset: 0, clipPath: 'inset(0 50% 0 0)', background: '#E9EBF0', padding: 9, boxSizing: 'border-box'}}>
          <div style={{display: 'flex', gap: 3}}>
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} style={{flex: 1, height: 5, background: '#B6BCC8'}} />
            ))}
          </div>
          <div style={{marginTop: 8, height: 7, width: '86%', background: '#A9B0BE'}} />
          <div style={{marginTop: 4, height: 4, width: '94%', background: '#C2C8D3'}} />
          <div style={{marginTop: 3, height: 4, width: '78%', background: '#C2C8D3'}} />
          <div style={{marginTop: 8, height: 13, width: 48, borderRadius: 2, background: '#9AA1AE'}} />
          <div style={{marginTop: 10, display: 'flex', gap: 4}}>
            {[0, 1, 2, 3].map((item) => (
              <div key={item} style={{flex: 1, height: 34, background: '#D6DAE3'}} />
            ))}
          </div>
          <div style={{marginTop: 8, display: 'grid', gap: 3}}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div key={item} style={{height: 4, width: `${92 - item * 5}%`, background: '#CFD4DE'}} />
            ))}
          </div>
        </div>

        {/* Right half: one column, one action, room around it. The column is
            anchored to both edges of its half rather than sized in percentages
            of the whole screen, which is what pushed `Contactar` under the
            bezel and cut the word in two. */}
        <div style={{position: 'absolute', left: '50%', right: 0, top: 0, bottom: 0, overflow: 'hidden', padding: '14px 12px 14px 10px', boxSizing: 'border-box'}}>
          <div style={{height: 68, borderRadius: 11, background: '#DCE3EE'}} />
          <div style={{marginTop: 11, height: 9, width: '84%', borderRadius: 99, background: '#E1E6EF'}} />
          <div style={{marginTop: 7, height: 9, width: '58%', borderRadius: 99, background: '#E9EDF4'}} />
          <div style={{marginTop: 16, height: 46, borderRadius: 13, background: accent, display: 'grid', placeItems: 'center', color: palette.white, fontSize: 17, fontWeight: 800}}>
            Contactar
          </div>
        </div>

        {/* The fingertip, to scale, over the target it is meant to hit. It sits
            on the right half's button: 124 px of screen plus the button's own
            centre, which is where a thumb would actually land. */}
        <div style={{position: 'absolute', left: 152, top: 150, width: 68, height: 68, borderRadius: 99, background: 'rgba(255,255,255,.26)', border: '3px solid rgba(255,255,255,.74)'}} />

        <div style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, marginLeft: -1.5, background: accent, boxShadow: `0 0 30px 6px ${accent}66`}} />
      </div>
    </div>

    <div style={{flex: 1}}>
      <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.14em', color: accent}}>DISEÑADA PARA MÓVIL</div>
      {['Primero la necesidad', 'Botones para dedos', 'Carga solo lo que usa'].map((line) => (
        <div key={line} style={{marginTop: 13, display: 'flex', alignItems: 'center', gap: 11}}>
          <span style={{width: 9, height: 9, borderRadius: 99, background: palette.green}} />
          <span style={{fontSize: 24, fontWeight: 800, color: palette.white}}>{line}</span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * The cover of the brand story: the tangle on the left, the system on the
 * right, and the arrow that is the whole piece in one image.
 *
 * The chips are the channels a business is actually run from, so the drawing
 * makes a claim about nothing: it shows work arriving from everywhere and a
 * built system taking it over.
 */
const AentsSystemCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', display: 'flex', alignItems: 'center', gap: 22, fontFamily: font, color: palette.white}}>
    <div style={{position: 'relative', width: 330, height: '100%'}}>
      <svg width="330" height="390" viewBox="0 0 330 390" style={{position: 'absolute', inset: 0}}>
        {[[52, 58, 250, 196], [268, 62, 60, 210], [48, 330, 262, 128], [258, 336, 62, 70], [56, 196, 262, 336]].map(
          ([x1, y1, x2, y2]) => (
            <path key={`${x1}-${y1}`} d={`M${x1} ${y1} Q165 ${(y1 + y2) / 2} ${x2} ${y2}`} fill="none" stroke="#F59E0B" strokeWidth="3" opacity=".5" />
          ),
        )}
      </svg>
      {[
        ['WhatsApp', 8, 32],
        ['Hojas', 178, 36],
        ['Correos', 0, 170],
        ['Facturas', 176, 172],
        ['Pedidos', 12, 306],
        ['Cobros', 180, 310],
      ].map(([label, left, top]) => (
        <div
          key={label as string}
          style={{
            position: 'absolute',
            left: left as number,
            top: top as number,
            width: 146,
            height: 52,
            borderRadius: 17,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,.08)',
            border: '2px solid rgba(167,139,250,.3)',
            fontWeight: 800,
            fontSize: 21,
          }}
        >
          {label}
        </div>
      ))}
    </div>

    <div style={{fontSize: 52, fontWeight: 800, color: accent}}>→</div>

    <div
      style={{
        flex: 1,
        height: '100%',
        boxSizing: 'border-box',
        padding: '24px 24px 22px',
        borderRadius: 30,
        background: 'linear-gradient(150deg,#241E5C,#0F1020)',
        border: `2px solid ${accent}55`,
        boxShadow: `0 30px 80px ${accent}2E`,
      }}
    >
      <div style={{fontSize: 19, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.6)'}}>TU SISTEMA</div>
      <div style={{marginTop: 14, display: 'grid', gap: 11}}>
        {['Clientes', 'Ventas', 'Inventario', 'Pagos'].map((module) => (
          <div
            key={module}
            style={{
              height: 54,
              padding: '0 18px',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: 'rgba(255,255,255,.07)',
              border: '2px solid rgba(167,139,250,.22)',
              fontSize: 23,
              fontWeight: 800,
            }}
          >
            <span style={{width: 11, height: 11, borderRadius: 99, background: accent}} />
            {module}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 14,
          height: 56,
          borderRadius: 17,
          display: 'grid',
          placeItems: 'center',
          background: accent,
          color: palette.ink,
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        Automatización
      </div>
    </div>
  </div>
);

const AentsServicesCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
    {[
      ['Webs', 'Rápidas y adaptables'],
      ['Apps', 'iOS y Android'],
      ['Sistemas', 'Roles y procesos'],
      ['Automatización', 'Datos e integraciones'],
    ].map(([title, detail], index) => (
      <div key={title} style={{padding: '28px 25px', borderRadius: 28, background: index === 0 ? `linear-gradient(145deg, ${accent}, #392C8F)` : 'rgba(255,255,255,.08)', border: '2px solid rgba(255,255,255,.14)', boxShadow: index === 0 ? `0 24px 60px ${accent}42` : 'none'}}>
        <div style={{fontFamily: font, fontWeight: 800, fontSize: 34, color: palette.white}}>{title}</div>
        <div style={{marginTop: 12, fontFamily: font, fontWeight: 800, fontSize: 21, lineHeight: 1.2, color: 'rgba(255,255,255,.62)'}}>{detail}</div>
      </div>
    ))}
  </div>
);

/** A drawn stand-in for the kit's QR: finder squares and a stable field. */
const QrGlyph: React.FC<{size: number; colour: string}> = ({size, colour}) => {
  const modules = 17;
  const cell = size / modules;
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      const corner = [[0, 0], [0, 11], [11, 0]].find(
        ([r0, c0]) => row >= r0 && row < r0 + 6 && column >= c0 && column < c0 + 6
      );
      const filled = corner
        ? (() => {
            const r = row - corner[0];
            const c = column - corner[1];
            return r === 0 || r === 5 || c === 0 || c === 5 || (r >= 2 && r <= 3 && c >= 2 && c <= 3);
          })()
        : (row * 7 + column * 13 + row * column) % 5 < 2;
      if (!filled) continue;
      cells.push(<rect key={`${row}-${column}`} x={column * cell} y={row * cell} width={cell} height={cell} fill={colour} />);
    }
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{cells}</svg>;
};

/**
 * What the agent sends instead of loose photos: one listing, its short link and
 * the answer the client keeps asking for. Sits in the same slot as the other
 * cover illustrations so the grid still reads as one series.
 */
const LinkCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', padding: 30, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>Casa en Cumbayá</div>
      <div style={{padding: '10px 16px', borderRadius: 99, background: `${accent}20`, color: accent, fontSize: 20, fontWeight: 800}}>EN VENTA</div>
    </div>
    <div style={{marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 250px', gap: 20}}>
      <div>
        <div style={{fontSize: 52, fontWeight: 800, letterSpacing: '-.05em', color: palette.ink}}>$122.000</div>
        <div style={{marginTop: 10, display: 'flex', alignItems: 'center', gap: 10}}>
          <LocationGlyph accent={accent} />
          <span style={{fontSize: 22, fontWeight: 800, color: '#5C6480'}}>Cumbayá, Quito · en el mapa</span>
        </div>
        <div style={{marginTop: 18, fontSize: 19, fontWeight: 800, letterSpacing: '.06em', color: '#8A93AB'}}>ENLACE CORTO DEL ANUNCIO</div>
        <div style={{marginTop: 10, padding: '15px 18px', borderRadius: 16, border: `3px solid ${accent}`, background: `${accent}12`, fontSize: 21, fontWeight: 800, color: palette.ink}}>
          geopropiedadesecuador.com/p/XK4T2
        </div>
      </div>
      <div style={{borderRadius: 26, background: '#FFFFFF', border: '3px solid #E4EAF3', display: 'grid', placeItems: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <QrGlyph size={112} colour={palette.ink} />
          <div style={{marginTop: 10, fontSize: 19, fontWeight: 800, color: '#8A93AB'}}>QR LISTO</div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * The flat is one lit unit inside a building that comes with it.
 *
 * Same reading as `sim:que-compras` and `sim:propiedad-horizontal`: façade on
 * the left, the building opened on the right so the slabs, the shaft and the
 * tank are visible, and one unit picked out in the accent. A single house on a
 * lawn — the generic illustration — says the opposite of what this piece says.
 *
 * The listing beside it is an example, not a market figure, and it carries the
 * `EJEMPLO` badge that authorises it: same marker the animations paint in
 * `FieldShell`, at a size that survives a phone. Its magnitudes are a flat's,
 * not a plot's.
 */
const FlatCover: React.FC<{accent: string}> = ({accent}) => {
  const floors = [88, 134, 180, 226];
  const columns = [46, 116];
  const rows = [52, 98, 144, 190];
  const legend: Array<[string, string, string]> = [
    ['Tu departamento', '78 m²', accent],
    ['Áreas comunes', 'Del edificio', '#98A2B3'],
  ];
  return (
    <div style={{width: '100%', height: '100%', padding: 30, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font, display: 'grid', gridTemplateRows: 'auto 1fr'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18}}>
        <div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>Departamento en Cumbayá</div>
        <div style={{padding: '9px 16px', borderRadius: 99, background: `${accent}20`, border: `2px solid ${accent}45`, color: accent, fontSize: 22, fontWeight: 800, letterSpacing: '.08em'}}>EJEMPLO</div>
      </div>
      <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 22, alignItems: 'center'}}>
        <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cover-flat-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D6F0F7"/><stop offset="1" stopColor="#7C97AE"/></linearGradient>
          </defs>
          <ellipse cx="150" cy="286" rx="140" ry="9" fill="#0B1220" opacity=".12" />
          {/* the building, and the third of it that is drawn open */}
          <rect x="30" y="42" width="240" height="238" rx="6" fill="#E9EEF5" stroke="#D3DCE8" strokeWidth="2" />
          <rect x="186" y="42" width="84" height="238" fill="#D5DEEA" />
          <path d="M186 42 V280" stroke="#93A4B8" strokeWidth="3" strokeDasharray="10 8" />
          <rect x="22" y="26" width="256" height="16" rx="5" fill="#2E4055" />
          {/* the tank on the roof, standing over the shaft it feeds */}
          <rect x="200" y="0" width="54" height="24" rx="5" fill="#8FA2B5" />
          <path d="M212 24 V30 M242 24 V30" stroke="#8FA2B5" strokeWidth="6" />
          {floors.map((y) => (
            <g key={`floor-${y}`}>
              <path d={`M30 ${y} H186`} stroke="#CBD6E4" strokeWidth="4" />
              <rect x="186" y={y - 5} width="84" height="10" fill="#A9B8C9" />
            </g>
          ))}
          {/* the shaft: the part of the building nobody photographs */}
          <rect x="222" y="42" width="30" height="188" fill="#BAC7D7" />
          <path d="M237 42 V144" stroke="#8B9CB0" strokeWidth="3" />
          <rect x="224" y="144" width="26" height="36" rx="3" fill="#6E8398" />
          {rows.map((y) => columns.map((x) => (
            <rect key={`w-${x}-${y}`} x={x} y={y} width="58" height="32" rx="4" fill="url(#cover-flat-glass)" />
          )))}
          {/* one lit unit: the flat */}
          <rect x="40" y="138" width="78" height="44" rx="6" fill={accent} stroke="#FFFFFF" strokeWidth="5" />
          <rect x="52" y="148" width="54" height="24" rx="3" fill="#FFFFFF" opacity=".38" />
          <rect x="30" y="230" width="240" height="50" fill="#DCE4EE" />
          <path d="M30 230 H270" stroke="#C3CEDD" strokeWidth="4" />
          <rect x="70" y="240" width="46" height="40" rx="4" fill="#35485E" />
          <rect x="130" y="242" width="40" height="30" rx="3" fill="url(#cover-flat-glass)" />
          <path d="M10 280 H290" stroke="#CBD5E3" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div>
          <div style={{fontSize: 52, fontWeight: 800, letterSpacing: '-.05em', color: palette.ink}}>$122.000</div>
          <div style={{marginTop: 8, fontSize: 23, fontWeight: 800, color: '#5C6480'}}>2 hab. · 2 baños · 78 m²</div>
          <div style={{marginTop: 12, display: 'flex', alignItems: 'center', gap: 10}}>
            <LocationGlyph accent={accent} />
            <span style={{fontSize: 22, fontWeight: 800, color: '#5C6480'}}>Ubicación en el mapa</span>
          </div>
          <div style={{marginTop: 16}}>
            {legend.map(([label, value, swatch]) => (
              <div key={label} style={{marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '15px 18px', borderRadius: 16, background: '#EDF2F7'}}>
                <span style={{display: 'flex', alignItems: 'center', gap: 11, fontSize: 22, fontWeight: 800, color: '#5D667E'}}>
                  <i style={{width: 18, height: 18, borderRadius: 5, background: swatch}} />
                  {label}
                </span>
                <span style={{fontSize: 24, fontWeight: 800, color: swatch === accent ? accent : '#5D667E', whiteSpace: 'nowrap'}}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * The origin story in one image: the listing the way it arrived — a photo, a
 * price and nothing where the place should be — next to the same property put
 * on the map. It is the whole piece condensed, the problem and the answer side
 * by side.
 */
const OriginCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 88px 1fr', alignItems: 'center', fontFamily: font}}>
    <div style={{height: '100%', padding: 24, borderRadius: 32, background: 'rgba(255,255,255,.07)', border: '2px solid rgba(255,255,255,.13)'}}>
      <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.42)'}}>ANTES</div>
      <div style={{marginTop: 14, height: 132, borderRadius: 18, overflow: 'hidden'}}>
        <svg width="100%" height="100%" viewBox="0 0 300 140" preserveAspectRatio="xMidYMid slice">
          <rect width="300" height="140" fill="#3A4356" />
          <rect x="46" y="62" width="208" height="66" rx="5" fill="#5A6478" />
          <path d="M28 68L150 22l122 46" fill="#6C7789" />
          <rect x="126" y="86" width="50" height="42" fill="#48526613" />
        </svg>
      </div>
      <div style={{marginTop: 16, fontSize: 40, fontWeight: 800, letterSpacing: '-.04em', color: palette.white}}>$122.000</div>
      <div style={{marginTop: 14, display: 'flex', alignItems: 'center', gap: 12}}>
        <span style={{width: 30, height: 30, borderRadius: 99, border: '3px dashed rgba(255,255,255,.34)'}} />
        <span style={{fontSize: 23, fontWeight: 800, color: 'rgba(255,255,255,.44)'}}>Ubicación —</span>
      </div>
    </div>
    <div style={{display: 'grid', placeItems: 'center', fontSize: 52, fontWeight: 800, color: accent}}>→</div>
    <div style={{height: '100%', borderRadius: 32, overflow: 'hidden', border: `3px solid ${accent}5C`, boxShadow: `0 26px 70px ${accent}30`}}>
      <svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
        <rect width="300" height="300" fill="#E7EDF4" />
        <g stroke="#CDD7E4" strokeWidth="9" fill="none">
          <path d="M70 0V300" /><path d="M196 0V300" /><path d="M0 96H300" /><path d="M0 214H300" />
        </g>
        <path d="M-10 224 C60 200 130 246 200 220 S280 198 310 214 L310 310 L-10 310 Z" fill="#D8E8DE" />
        <polygon points="96,108 208,96 224,176 112,190" fill={`${accent}3D`} stroke={accent} strokeWidth="7" strokeLinejoin="round" />
        <g transform="translate(160 118)">
          <circle r="46" fill={accent} opacity=".14" />
          <path d="M0-30c17 0 30 13 30 29 0 20-30 45-30 45S-30 19-30-1c0-16 13-29 30-29Z" fill={accent} stroke="#FFFFFF" strokeWidth="5" />
          <circle cy="-2" r="9" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  </div>
);

/**
 * The listing an owner published, and the question it produces.
 *
 * The thumbnail has to state the problem without a word of the title: a card
 * with photo, price and features, an empty location row, and the messages that
 * always follow. The price is an example of a listing and says so.
 */
const QuestionCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', position: 'relative', padding: 34, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>Tu anuncio publicado</div>
      <div style={{padding: '10px 16px', borderRadius: 99, border: '2px solid #D8DFE9', color: '#7A849C', fontSize: 20, fontWeight: 800, letterSpacing: '.08em'}}>EJEMPLO</div>
    </div>
    <div style={{marginTop: 22, display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20}}>
      <div style={{height: 208, borderRadius: 22, overflow: 'hidden', border: '2px solid #E2E8F0'}}>
        <svg width="100%" height="100%" viewBox="0 0 250 208" preserveAspectRatio="xMidYMid slice">
          <rect width="250" height="208" fill="#CDE7F5" />
          <rect y="150" width="250" height="58" fill="#8EB696" />
          <rect x="46" y="86" width="158" height="66" rx="5" fill="#F7F3EA" />
          <path d="M30 92L126 44l100 48" fill="#26364A" />
          <rect x="108" y="112" width="34" height="40" rx="3" fill="#26364A" />
          <rect x="62" y="106" width="36" height="28" rx="3" fill="#8FC4DA" />
          <rect x="154" y="106" width="36" height="28" rx="3" fill="#8FC4DA" />
        </svg>
      </div>
      <div>
        <div style={{fontSize: 44, fontWeight: 800, letterSpacing: '-.04em', color: palette.ink}}>$122.000</div>
        <div style={{marginTop: 8, fontSize: 22, fontWeight: 800, color: '#7A849C'}}>3 hab. · 2 baños · fotos ✓</div>
        <div style={{marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 16, background: '#FFF3F1', border: '2px solid #F7D9D3'}}>
          <span style={{width: 26, height: 26, borderRadius: 99, border: '3px dashed #C64E3D'}} />
          <span style={{fontSize: 24, fontWeight: 800, color: '#A74335'}}>Ubicación —</span>
        </div>
      </div>
    </div>
    {/* One bubble, not a stack: two of them reached up into the card and the
        second one covered the row this cover exists to show. */}
    <div
      style={{
        position: 'absolute',
        right: 26,
        bottom: 20,
        padding: '14px 24px',
        borderRadius: '22px 22px 6px 22px',
        background: accent,
        color: palette.ink,
        fontSize: 32,
        fontWeight: 800,
        letterSpacing: '-.02em',
        boxShadow: '0 18px 44px rgba(8,9,21,.28)',
      }}
    >
      ¿Dónde queda?
    </div>
  </div>
);

/**
 * The search the other way round: one zone circled on the map, and inside it
 * the properties with their price. The pins outside stay grey because the point
 * is the choice, not the inventory — and nothing here counts anything.
 */
const ZoneCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', position: 'relative', borderRadius: 38, overflow: 'hidden', background: '#E8EEF5', border: '2px solid rgba(255,255,255,.16)', boxShadow: '0 34px 100px rgba(0,0,0,.38)'}}>
    <svg width="100%" height="100%" viewBox="0 0 920 420" preserveAspectRatio="none">
      <rect width="920" height="420" fill="#E8EEF5" />
      {[90, 245, 405, 565, 730, 865].map((x) => <path key={`v-${x}`} d={`M${x} -40 V470`} stroke="#D2DBE8" strokeWidth="18" />)}
      {[70, 200, 330].map((y) => <path key={`h-${y}`} d={`M-30 ${y} H950`} stroke="#D2DBE8" strokeWidth="15" />)}
      <path d="M-40 300 C180 258 320 356 520 306 S760 242 960 276 L960 460 L-40 460 Z" fill="#D9E8DF" />
      <circle cx="452" cy="210" r="176" fill={accent} fillOpacity=".1" />
      <circle cx="452" cy="210" r="176" fill="none" stroke={accent} strokeWidth="7" strokeDasharray="20 16" />
      {[
        {x: 132, y: 108, p: '$74k', inside: false},
        {x: 812, y: 128, p: '$230k', inside: false},
        {x: 176, y: 336, p: '$61k', inside: false},
        {x: 372, y: 148, p: '$68k', inside: true},
        {x: 556, y: 214, p: '$54k', inside: true},
        {x: 430, y: 292, p: '$96k', inside: true},
      ].map((pin) => (
        <g key={pin.p} transform={`translate(${pin.x} ${pin.y})`} opacity={pin.inside ? 1 : 0.26}>
          <rect x="-66" y="-27" width="132" height="47" rx="24" fill="#FFFFFF" stroke={pin.inside ? accent : '#98A2B3'} strokeWidth="4" />
          <text x="0" y="5" textAnchor="middle" fontFamily={font} fontWeight="800" fontSize="25" fill={palette.ink}>{pin.p}</text>
          <path d="M0 20 L10 35 L-10 35 Z" fill={pin.inside ? accent : '#98A2B3'} />
        </g>
      ))}
    </svg>
    {/* Top right, where no pin lives: on the left it sat on top of one. */}
    <div style={{position: 'absolute', right: 26, top: 24, padding: '12px 20px', borderRadius: 99, background: palette.ink, color: '#FFFFFF', fontFamily: font, fontWeight: 800, fontSize: 24}}>Tu zona</div>
    <div style={{position: 'absolute', right: 26, bottom: 24, padding: '9px 15px', borderRadius: 10, background: 'rgba(8,9,21,.72)', color: '#FFFFFF', fontFamily: font, fontWeight: 800, fontSize: 21, letterSpacing: '.08em'}}>EJEMPLO</div>
  </div>
);

/**
 * The owner's offer, priced. Everything on this card is in
 * `frontend/lib/help-faqs.ts`: publishing is free, there is no commission on a
 * sale or a rental, and there is no cap on listings.
 */
const OfferCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{width: '100%', height: '100%', padding: 34, borderRadius: 38, background: '#F7F9FC', boxShadow: '0 34px 100px rgba(0,0,0,.38)', fontFamily: font}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontSize: 25, fontWeight: 800, color: palette.ink}}>Tu terreno o tu casa</div>
      <div style={{padding: '10px 16px', borderRadius: 99, background: `${accent}20`, color: accent, fontSize: 20, fontWeight: 800}}>EN VENTA O ARRIENDO</div>
    </div>
    <div style={{marginTop: 24, display: 'grid', gridTemplateColumns: '230px 1fr', gap: 22}}>
      <div style={{borderRadius: 28, background: `linear-gradient(145deg, ${accent}, #6D4FD6)`, color: '#FFFFFF', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: `0 22px 52px ${accent}44`}}>
        <div>
          <div style={{fontSize: 82, fontWeight: 800, letterSpacing: '-.07em'}}>$0</div>
          <div style={{fontSize: 20, fontWeight: 800, opacity: .88}}>PUBLICAR</div>
        </div>
      </div>
      <div>
        {[['Comisión al vender o arrendar', '0 %'], ['Propiedades que publicas', 'Sin límite'], ['Cuenta para empezar', 'No hace falta']].map(([label, value]) => (
          <div key={label} style={{marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '17px 20px', borderRadius: 18, background: '#EDF2F7'}}>
            <span style={{fontSize: 21, fontWeight: 700, color: '#5D667E'}}>{label}</span>
            <span style={{fontSize: 27, fontWeight: 800, color: accent, whiteSpace: 'nowrap'}}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * The lesson about building software with AI, in one frame: the screen that
 * already runs, and everything nobody decided sitting next to it, unticked.
 *
 * Nothing here is a figure. The boxes are the layers the piece names one by
 * one, and the only mark of state is the tick over «Funciona», which is exactly
 * the confusion the video exists to undo.
 */
const AentsAiCover: React.FC<{accent: string}> = ({accent}) => (
  <div style={{height: '100%', fontFamily: font, color: palette.white, display: 'flex', alignItems: 'center', gap: 26}}>
    <div style={{width: 330, borderRadius: 26, background: '#F4F7FB', border: '2px solid #CBD3E1', overflow: 'hidden', boxShadow: '0 28px 76px rgba(0,0,0,.5)'}}>
      <div style={{height: 44, background: accent, display: 'flex', alignItems: 'center', padding: '0 16px'}}>
        <span style={{fontSize: 20, fontWeight: 800, color: palette.white}}>Sistema de ventas</span>
      </div>
      <div style={{padding: 16, display: 'grid', gap: 10}}>
        {[0, 1, 2].map((row) => (
          <div key={row} style={{display: 'flex', gap: 9, alignItems: 'center'}}>
            <span style={{width: 34, height: 14, borderRadius: 4, background: '#E3E9F2'}} />
            <span style={{flex: 1, height: 14, borderRadius: 4, background: '#EDF1F7'}} />
            <span style={{width: 54, height: 14, borderRadius: 4, background: '#E3E9F2'}} />
          </div>
        ))}
        <div style={{marginTop: 6, display: 'flex', alignItems: 'center', gap: 10}}>
          <span style={{padding: '11px 18px', borderRadius: 12, background: accent, color: palette.white, fontSize: 18, fontWeight: 800}}>Nueva venta</span>
          <span style={{display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 99, background: 'rgba(34,197,94,.16)', border: `2px solid ${palette.green}`, color: '#14532D', fontSize: 18, fontWeight: 800}}>
            <svg width={19} height={19} viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5L10 17.5L19 7" stroke="#15803D" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Funciona
          </span>
        </div>
      </div>
    </div>

    <div style={{flex: 1, display: 'grid', gap: 11}}>
      <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.5)'}}>NADIE DECIDIÓ</div>
      {['Seguridad', 'Permisos', 'Reglas del negocio', 'Pruebas', 'Respaldos'].map((line) => (
        <div key={line} style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{width: 22, height: 22, borderRadius: 6, border: '3px solid #F59E0B'}} />
          <span style={{fontSize: 25, fontWeight: 800, color: 'rgba(255,255,255,.82)'}}>{line}</span>
        </div>
      ))}
    </div>
  </div>
);

export const EstateMapCover: React.FC<CoverProps> = ({coverText, coverArt, cta, audience, url, brandTile, brandId = 'geo', brandName = 'Geo Propiedades Ecuador', brandTagline = 'Un producto de Aents', brandSymbol = 'brand/aents-symbol-negative.png', accent: inputAccent}) => {
  const ready = useFontReady();
  const normalizedCoverText = coverText.toLocaleLowerCase('es');
  // The plan names its illustration; the keyword tests below are the fallback
  // for covers written before `cover_art` existed.
  const isOriginStory = coverArt === 'origen';
  const isOfferStory = coverArt === 'oferta';
  const isFlatStory = coverArt === 'departamento';
  const isDecisionStory = coverArt === 'decision';
  const isProcessStory = coverArt === 'proceso';
  const isQuestionStory = coverArt === 'pregunta';
  const isZoneStory = coverArt === 'zona';
  const isAgentStory = coverArt === 'agente' || (!coverArt && audience === 'profesional');
  const isAentsBrand = brandId === 'aents';
  const isAentsSystem = coverArt === 'aents-sistema';
  const isAentsSearch = coverArt === 'aents-buscador';
  const isAentsTransform = coverArt === 'aents-transformacion';
  const isAentsMobile = coverArt === 'aents-movil';
  const isAentsCited = coverArt === 'aents-citado';
  const isAentsAi = coverArt === 'aents-ia';
  const isAentsStory = coverArt === 'aents' || (!coverArt && normalizedCoverText.includes('aents') && !isAentsBrand);
  const accent = isAentsBrand || isAentsStory ? palette.violet : inputAccent;
  // A named `cover_art` decides on its own. The keyword tests stay for the
  // covers written before the field existed, but they may no longer steal a
  // cover whose plan already said what it wants to draw.
  const isFilterStory = !coverArt && normalizedCoverText.includes('ciegas');
  const isReviewStory = !coverArt
    && (normalizedCoverText.includes('revisa') || normalizedCoverText.includes('contactar'));
  const isPublishStory = !coverArt
    && /publica(?:r)?/.test(normalizedCoverText)
    && (normalizedCoverText.includes('gratis') || normalizedCoverText.includes('$0') || normalizedCoverText.includes('sin comisión'));
  // The title is measured against the box it is actually painted in. Measuring
  // against a wider one is what broke geo-010: `fit` returned two lines that
  // the 840 px column then wrapped into four, and the illustration — placed at
  // a fixed height — sat on top of the last two.
  const titleWidth = 1080 - safe.left * 2;
  const {fontSize, lines} = ready
    ? fit(coverText, {maxWidth: titleWidth - 4, maxLines: 2, max: 116, min: 64, letterSpacing: '-0.05em'})
    : {fontSize: 92, lines: [coverText]};
  // Where the title block ends: badge (24 px text in an 11 px padded pill with
  // a 2 px border) plus the 27 px gap plus the fitted lines.
  const titleBottom = 370 + 55 + 27 + lines.length * fontSize * 0.96;
  // `CLAUDE.md` asks for 48 px clear below the title; 72 pays for the
  // descenders the line box does not count. Illustrations that already clear it
  // keep the height their composition was drawn for.
  const artTop = (top: number) => Math.max(top, Math.ceil(titleBottom + 72));
  return (
    <AbsoluteFill style={{backgroundColor: palette.ink, overflow: 'hidden'}}>
      <style>{`@font-face { font-family: 'EstateMap Display'; src: url('${staticFile('fonts/PlusJakartaSans-ExtraBold.ttf')}') format('truetype'); font-weight: 800; font-style: normal; font-display: block; }`}</style>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 37%, rgba(107,92,246,.34) 0%, rgba(34,197,94,.08) 27%, rgba(8,9,21,0) 62%)'}} />

      {ready ? <>
        <div style={{position: 'absolute', left: safe.left, right: safe.left, top: safe.top, display: 'flex', alignItems: 'center', gap: 22}}>
          {brandTile ? <Img src={staticFile(brandTile)} style={{width: 92, height: 92, borderRadius: 26, boxShadow: '0 20px 60px rgba(107,92,246,.44)'}} /> : null}
          <div>
            <div style={{fontFamily: font, fontWeight: 800, fontSize: 38, letterSpacing: '-0.035em', color: palette.white}}>{brandName}</div>
            <div style={{marginTop: 5, fontFamily: font, fontWeight: 800, fontSize: 23, color: 'rgba(255,255,255,.52)'}}>{url}</div>
          </div>
        </div>

        <div style={{position: 'absolute', left: safe.left, right: safe.left, top: 370}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderRadius: 99, color: accent, backgroundColor: `${accent}18`, border: `2px solid ${accent}45`, fontFamily: font, fontWeight: 800, fontSize: 24}}>{isOfferStory ? 'PARA PROPIETARIOS' : isOriginStory ? 'CÓMO NACIÓ ESTO' : isFlatStory ? 'PROPIEDAD HORIZONTAL' : isAentsSearch ? 'LO QUE ENCUENTRA TU CLIENTE' : isAentsTransform ? 'ANTES Y DESPUÉS' : isAentsMobile ? 'RESPONSIVE Y MOBILE FIRST' : isAentsAi ? 'SI PROGRAMAS CON IA' : isAentsCited ? 'BUSCADORES E INTELIGENCIA ARTIFICIAL' : isAentsStory ? 'CASO REAL · SOFTWARE A MEDIDA' : isAentsBrand ? 'SOFTWARE PARA PERSONAS' : isPublishStory ? 'PUBLICA GRATIS' : isProcessStory ? 'ASÍ ES LA COMPRAVENTA' : isDecisionStory ? 'ANTES DE DECIDIR' : isQuestionStory ? 'PARA PROPIETARIOS' : isZoneStory ? <><LocationGlyph accent={accent}/> EMPIEZA POR LA ZONA</> :isReviewStory ? 'ANTES DE CONTACTAR' : isAgentStory ? <><LocationGlyph accent={accent}/> PARA AGENTES</> : <><LocationGlyph accent={accent}/> UBICACIÓN PRIMERO</>}</div>
          <div style={{marginTop: 27, fontFamily: font, fontWeight: 800, fontSize, lineHeight: .96, letterSpacing: '-0.05em', color: palette.white}}>{lines.map((line, index) => <div key={index}>{line}</div>)}</div>
        </div>

        {isOriginStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(760), height: 410}}><OriginCover accent={accent}/></div>
        ) : isOfferStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(750), height: 420}}><OfferCover accent={accent}/></div>
        ) : isFlatStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(750), height: 420}}><FlatCover accent={accent}/></div>
        ) : isAentsSearch ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsSearchCover accent={accent}/></div>
        ) : isAentsTransform ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsTransformCover accent={accent}/></div>
        ) : isAentsCited ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsCitedCover accent={accent}/></div>
        ) : isAentsMobile ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsMobileCover accent={accent}/></div>
        ) : isAentsAi ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsAiCover accent={accent}/></div>
        ) : isAentsSystem ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsSystemCover accent={accent}/></div>
        ) : isAentsStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsCaseCover accent={accent}/></div>
        ) : isAentsBrand ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(790), height: 390}}><AentsServicesCover accent={accent}/></div>
        ) : isPublishStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(750), height: 420}}><PublishCover accent={accent}/></div>
        ) : isProcessStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(815), height: 360}}><ProcessCover accent={accent}/></div>
        ) : isQuestionStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(750), height: 420}}><QuestionCover accent={accent}/></div>
        ) : isZoneStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(760), height: 410}}><ZoneCover accent={accent}/></div>
        ) : isDecisionStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(815), height: 360}}><ReviewChecklistCover accent={accent} heading="Antes de decidir" labels={['Ubicación', 'Documentos', 'Medidas']} /></div>
        ) : isReviewStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(815), height: 360}}><ReviewChecklistCover accent={accent}/></div>
        ) : isAgentStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(750), height: 420}}><LinkCover accent={accent}/></div>
        ) : isFilterStory ? (
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: artTop(750), height: 420}}><FilterMapCover accent={accent}/></div>
        ) : <>
          {/* The house and the card below it are one drawing 400 px apart, and
              the pair reaches the strip at y=1248: it cannot be pushed down to
              clear a long title. A cover whose title needs the room names its
              own illustration instead of landing here. */}
          <div style={{position: 'absolute', left: 156, top: 560, width: 768, height: 422, opacity: .98}}><PremiumHouse accent={accent} /></div>
          <div style={{position: 'absolute', left: safe.left, right: safe.left, top: 960, padding: '27px 30px', borderRadius: 30, background: 'linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.06))', border: '2px solid rgba(255,255,255,.14)', boxShadow: '0 28px 80px rgba(0,0,0,.34)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'center'}}>
          <div style={{flex: 1}}>
            {/* The price and the features below are an example of a listing, so
                they carry the same badge the animations paint in `FieldShell`. */}
            <div style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: font, fontWeight: 800, fontSize: 22, color: 'rgba(255,255,255,.5)'}}>
              <span>{isFilterStory ? 'OPCIÓN EN TU ZONA' : 'CASA EN CUMBAYÁ'}</span>
              <span style={{padding: '5px 12px', borderRadius: 99, border: '2px solid rgba(255,255,255,.28)', color: 'rgba(255,255,255,.78)', fontSize: 22, letterSpacing: '.08em'}}>EJEMPLO</span>
            </div>
            <div style={{marginTop: 7, fontFamily: font, fontWeight: 800, fontSize: 47, color: palette.white, letterSpacing: '-0.04em'}}>$122.000</div>
            <div style={{marginTop: 7, fontFamily: font, fontWeight: 800, fontSize: 23, color: 'rgba(255,255,255,.65)'}}>3 hab. · 2 baños · 400 m²</div>
          </div>
          <div style={{width: 2, height: 92, backgroundColor: 'rgba(255,255,255,.12)', margin: '0 28px'}} />
          <div style={{display: 'flex', alignItems: 'center', gap: 14}}><LocationGlyph accent={accent}/><div><div style={{fontFamily: font, fontWeight: 800, fontSize: 28, color: palette.white}}>{isFilterStory ? 'Precio filtrado' : 'Ubicación exacta'}</div><div style={{marginTop: 7, fontFamily: font, fontWeight: 800, fontSize: 21, color: 'rgba(255,255,255,.55)'}}>{isFilterStory ? 'Dentro de tu rango' : 'Visible en el mapa'}</div></div></div>
          </div>
        </>}

        <div style={{position: 'absolute', left: safe.left, right: safe.left, top: 1248, display: 'flex', alignItems: 'center', gap: 18}}>
          <div style={{width: 112, height: 9, borderRadius: 99, backgroundColor: accent, boxShadow: `0 0 30px ${accent}`}} />
          <div style={{fontFamily: font, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,.68)'}}>{isOfferStory ? 'Sin comisión, sin límite y sin crear cuenta' : isOriginStory ? 'De un anuncio sin lugar a un lugar en el mapa' : isFlatStory ? 'Compras una parte de un edificio entero' : isAentsSearch ? 'Una web rápida, clara y hecha para el celular' : isAentsTransform ? 'La misma empresa, con otra presencia digital' : isAentsMobile ? 'Que quepa no es lo mismo que estar pensada para el dedo' : isAentsCited ? 'Que te encuentren, y que puedan citarte' : isAentsStory || isAentsBrand ? 'Webs · apps · sistemas · automatización' : isPublishStory ? 'Un proceso corto, claro y guiado' : isProcessStory ? 'De encontrarla a inscribirla a tu nombre' : isQuestionStory ? 'La ubicación es parte del anuncio' : isZoneStory ? 'Elige la zona y mira lo que hay ahí' : isDecisionStory ? 'Ubica, revisa y confirma' :isReviewStory ? 'Llega sabiendo qué preguntar' : isAgentStory ? 'Una ficha responde dónde queda' : isFilterStory ? 'Ciudad, zona y precio sobre el mapa' : 'Fotos, precio y detalles en un solo lugar'}</div>
        </div>

        <div style={{position: 'absolute', left: safe.left, right: safe.left, top: 1435, padding: '24px 30px', borderRadius: 28, backgroundColor: accent, color: palette.ink, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: `0 24px 70px ${accent}2E`}}>
            <div style={{fontFamily: font, fontWeight: 800, fontSize: fit(cta, {maxWidth: 1080 - safe.left * 2 - 60 - 68, maxLines: 1, max: 38, min: 24, letterSpacing: '-0.035em'}).fontSize, letterSpacing: '-0.035em'}}>{cta}</div>
          <div style={{fontFamily: font, fontWeight: 800, fontSize: 48}}>→</div>
        </div>

        <div style={{position: 'absolute', left: 0, right: 0, bottom: 165, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13, color: 'rgba(255,255,255,.48)'}}>
          <span style={{fontFamily: font, fontWeight: 800, fontSize: 20, letterSpacing: '.12em'}}>{isAentsBrand ? brandTagline.toUpperCase() : 'UN PRODUCTO DE'}</span>
          <div style={{width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(140deg, #7C6BF8, #5A46E0)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{brandSymbol ? <Img src={staticFile(brandSymbol)} style={{width: 34, height: 34}} /> : null}</div>
          {isAentsBrand ? null : <span style={{fontFamily: font, fontWeight: 800, fontSize: 23, letterSpacing: '.08em'}}>AENTS</span>}
        </div>
      </> : null}
    </AbsoluteFill>
  );
};
