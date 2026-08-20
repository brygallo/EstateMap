import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useVideoConfig} from 'remotion';
import {fit} from './layout';
import {Ambient, Field, Halo, Reveal, Sweep, land, metronome, tokensFor} from './system-kit';
import {font, sideCrop} from './theme';
import type {SimulationProps} from './simulations';

const violet = '#6B5CF6';
const lavender = '#A78BFA';
// Usable width inside a 210 px option card with 14 px of horizontal padding.
const CARD_TEXT_WIDTH = 182;
const reveal = (value: number, start: number, end: number) => interpolate(value, [start, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/**
 * The panel these older compositions draw inside.
 *
 * It is a hand-copy of `Panel` from the shared kit, made before that kit
 * existed, and the copy has already rotted exactly the way the contract says it
 * would: `Field` grew an ambient layer that keeps a frame alive while its
 * subject rests, every composition built on the kit got it, and this one did
 * not — so `sim:aents-reveal` measured 77 % of its shot as the same picture.
 *
 * The ambient layer is wired in here as the immediate fix. The real repair is
 * to delete this component and let these scenes use `Panel`, which is recorded
 * as a lesson rather than done on the way to a paid render.
 */
export const Shell: React.FC<{frame: number; eyebrow: string; title: string; push?: number; children: React.ReactNode}> = ({frame, eyebrow, title, push = 0, children}) => {
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, mass: .8}});
  return <AbsoluteFill style={{background: 'radial-gradient(circle at 72% 15%, #392D8C 0%, #15152E 36%, #080915 74%)', fontFamily: font, color: '#FFF'}}>
    <Ambient tokens={tokensFor('aents')} push={push} />
    <div style={{position: 'absolute', inset: 0, opacity: .13, backgroundImage: 'linear-gradient(rgba(167,139,250,.5) 2px,transparent 2px),linear-gradient(90deg,rgba(167,139,250,.5) 2px,transparent 2px)', backgroundSize: '64px 64px', maskImage: 'linear-gradient(#000,transparent 76%)'}} />
    <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 305, height: 750, boxSizing: 'border-box', overflow: 'hidden', padding: '40px 44px 48px', borderRadius: 42, background: 'linear-gradient(145deg,rgba(30,28,61,.97),rgba(11,12,28,.98))', border: '2px solid rgba(167,139,250,.25)', boxShadow: '0 48px 130px rgba(0,0,0,.5),0 0 80px rgba(107,92,246,.18)', opacity: enter, transform: `scale(${.98+enter*.02})`}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><span style={{fontSize: 22, fontWeight: 800, letterSpacing: '.1em', color: lavender}}>{eyebrow}</span><span style={{fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.6)'}}>● &nbsp; AENTS</span></div>
      <div style={{marginTop: 12, fontSize: 48, fontWeight: 800, letterSpacing: '-.05em'}}>{title}</div>{children}
    </div>
    <AbsoluteFill style={{top: 980, background: 'linear-gradient(transparent,rgba(8,9,21,.94) 32%,#080915 48%)'}} />
  </AbsoluteFill>;
};

/**
 * A drawing of the map, with its prices marked as what they are.
 *
 * The three figures on the pins are invented, and that is the correct way to
 * show what a listing looks like — but only while the piece says so. This card
 * is titled «CASO REAL» and points at a live product, so unmarked prices on it
 * read as real listings at real prices, which is a claim about a market nobody
 * verified. The `EJEMPLO` tag is the rule from `animation-standard.md` §6, and
 * it stays on screen for exactly as long as the figures do.
 */
const BrowserMap: React.FC<{progress: number}> = ({progress}) => <div style={{height: 455, borderRadius: 30, overflow: 'hidden', background: '#E7EDF4', boxShadow: '0 26px 70px rgba(0,0,0,.4)', position: 'relative'}}>
  <div style={{position: 'absolute', left: 18, bottom: 18, zIndex: 2, padding: '8px 16px', borderRadius: 99, background: 'rgba(8,9,21,.82)', color: '#FFF', fontFamily: font, fontSize: 22, fontWeight: 800, letterSpacing: '.12em', opacity: reveal(progress, .08, .2)}}>EJEMPLO</div>
  <div style={{height: 54, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#FFF'}}>{['#FF6B6B','#FFD166','#22C55E'].map(c=><i key={c} style={{width: 12,height:12,borderRadius:99,background:c}}/>)}<div style={{marginLeft:14,flex:1,padding:'9px 18px',borderRadius:99,background:'#F1F3F6',color:'#59627A',fontSize:18,fontWeight:800}}>geopropiedadesecuador.com</div></div>
  <svg width="100%" height="401" viewBox="0 0 860 401"><rect width="860" height="401" fill="#E7EDF4"/>{[90,240,390,540,690,830].map(x=><path key={x} d={`M${x} 0V401`} stroke="#CDD7E4" strokeWidth="13"/>)}{[85,210,335].map(y=><path key={y} d={`M0 ${y}H860`} stroke="#CDD7E4" strokeWidth="13"/>)}<path d="M-20 290C180 250 340 335 530 290S760 240 900 280V420H-20Z" fill="#D7E8DD"/>{[[230,130],[445,190],[640,112]].map(([x,y],i)=><g key={x} transform={`translate(${x} ${y}) scale(${.5+reveal(progress,.1+i*.12,.32+i*.12)*.5})`} opacity={reveal(progress,.1+i*.12,.32+i*.12)}><rect x="-60" y="-28" width="120" height="50" rx="25" fill="#FFF" stroke="#22C55E" strokeWidth="4"/><text textAnchor="middle" y="6" fontFamily={font} fontSize="23" fontWeight="800" fill="#080915">{['$122k','$85k','$230k'][i]}</text><path d="M0 22l11 17h-22z" fill="#22C55E"/></g>)}</svg>
</div>;

export const AentsIdeaSim: React.FC<SimulationProps> = ({frame,total}) => {
  const span=Math.max(1,total??frame+1);
  const p=frame/span;
  const {fps}=useVideoConfig();
  const idea=spring({frame:frame-fps*.12,fps,config:{damping:15,mass:.7}});
  const options=[
    {title:'APP',detail:'Producto móvil',left:16,top:28,path:'M281 220 L226 122'},
    {title:'WEB',detail:'Plataforma',left:526,top:28,path:'M471 220 L526 122'},
    {title:'AUTOMATIZACIÓN',detail:'Procesos',left:16,top:378,path:'M281 330 L226 378'},
    {title:'SISTEMA',detail:'Operación',left:526,top:378,path:'M471 330 L526 378'},
  ];
  return <Shell frame={frame} eyebrow="DE UNA NECESIDAD" title="¿En qué puede convertirse?">
    <div style={{position:'relative',height:500,marginTop:24}}>
      <svg viewBox="0 0 752 500" width="100%" height="500" style={{position:'absolute',inset:0,overflow:'visible'}}>
        {options.map((option,i)=>{const a=reveal(p,.16+i*.1,.34+i*.1);return <path key={option.title} d={option.path} fill="none" stroke={lavender} strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1-a} opacity={a*.85}/>})}
      </svg>
      <div style={{position:'absolute',left:281,top:180,width:190,height:190,borderRadius:56,display:'grid',placeItems:'center',background:'linear-gradient(145deg,#7C6BF8,#392C8F)',boxShadow:'0 26px 80px rgba(107,92,246,.5)',fontSize:40,fontWeight:800,opacity:idea,transform:`scale(${.72+idea*.28})`}}>IDEA</div>
      {options.map((option,i)=>{
        const a=reveal(p,.16+i*.1,.34+i*.1);
        // The card is 210 wide with 14 of padding on each side, so the label has
        // 182 to live in. «AUTOMATIZACIÓN» is wider than that at any size the
        // card used to hardcode, and it printed straight over both borders.
        const title=fit(option.title,{maxWidth:CARD_TEXT_WIDTH,maxLines:1,max:29,min:16});
        return <div key={option.title} style={{position:'absolute',left:option.left,top:option.top,width:210,minHeight:94,padding:'17px 14px',borderRadius:22,textAlign:'center',background:'rgba(255,255,255,.09)',border:'2px solid rgba(167,139,250,.3)',opacity:a,transform:`scale(${.82+a*.18})`}}><div style={{fontSize:title.fontSize,fontWeight:800,lineHeight:1.05}}>{title.lines.join(' ')}</div><div style={{marginTop:6,fontSize:18,fontWeight:700,color:'rgba(255,255,255,.58)'}}>{option.detail}</div></div>})}
    </div>
  </Shell>;
};

export const AentsWorkflowSim: React.FC<SimulationProps> = ({frame,total}) => {
  const span=Math.max(1,total??frame+1);
  const p=frame/span;
  const sources=[['DOCUMENTOS','#F59E0B'],['HOJAS','#22C55E'],['MENSAJES','#14B8A6']];
  const joined=reveal(p,.5,.76);
  const outputLine=reveal(p,.64,.82);
  return <Shell frame={frame} eyebrow="MENOS PASOS SUELTOS" title="Un proceso conectado">
    <div style={{position:'relative',height:500,marginTop:28}}>
      <svg viewBox="0 0 752 500" width="100%" height="500" style={{position:'absolute',inset:0,overflow:'visible'}}>
        {sources.map(([label,color],i)=>{const y=72+i*126;const a=reveal(p,.28+i*.05,.55+i*.05);return <path key={label} d={`M282 ${y} L350 ${y} Q370 ${y} 370 233`} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1-a}/>})}
        <circle cx="370" cy="233" r={10+joined*4} fill={violet} opacity={joined}/>
        <path d="M370 233 L434 233" fill="none" stroke={lavender} strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1-outputLine}/>
      </svg>
      {sources.map(([label,color],i)=>{const a=reveal(p,.05+i*.1,.24+i*.1);const y=26+i*126;return <div key={label} style={{position:'absolute',left:16,top:y,width:266,height:92,borderRadius:24,display:'grid',placeItems:'center',background:'rgba(255,255,255,.08)',border:`2px solid ${color}66`,fontSize:27,fontWeight:800,opacity:a,transform:`scale(${.96+a*.04})`}}>{label}</div>})}
      <div style={{position:'absolute',left:434,top:103,width:284,height:260,borderRadius:42,display:'grid',placeItems:'center',textAlign:'center',background:'linear-gradient(145deg,#7C6BF8,#392C8F)',boxShadow:'0 30px 85px rgba(107,92,246,.45)',opacity:joined,transform:`scale(${.92+joined*.08})`}}><div><div style={{fontSize:25,fontWeight:800,color:'rgba(255,255,255,.65)'}}>TU SISTEMA</div><div style={{marginTop:12,fontSize:40,fontWeight:800,lineHeight:1.04}}>UN SOLO<br/>FLUJO</div><div style={{marginTop:18,fontSize:27,fontWeight:800,color:'#A7F3D0'}}>CONECTADO ✓</div></div></div>
    </div>
  </Shell>;
};

export const AentsRevealSim: React.FC<SimulationProps> = ({frame,total}) => {const span=Math.max(1,total??frame+1);const p=frame/span;const {fps}=useVideoConfig();const stamp=spring({frame:frame-span*.38,fps,config:{damping:13,stiffness:170}});return <Shell frame={frame} push={p} eyebrow="CASO REAL" title="Geo Propiedades Ecuador"><div style={{marginTop:28,position:'relative'}}><BrowserMap progress={p}/><div style={{position:'absolute',right:26,bottom:24,display:'flex',alignItems:'center',gap:16,padding:'17px 22px',borderRadius:26,background:'linear-gradient(135deg,#7C6BF8,#503DCE)',boxShadow:'0 24px 60px rgba(107,92,246,.52)',opacity:stamp,transform:`translateY(${(1-stamp)*38}px) rotate(${(1-stamp)*-5}deg) scale(${.8+stamp*.2})`}}><Img src={staticFile('brand/aents-brand-tile-1024.png')} style={{width:68,height:68,borderRadius:19}}/><div><div style={{fontSize:21,fontWeight:800,opacity:.7}}>CONSTRUIDO POR</div><div style={{fontSize:40,fontWeight:800}}>Aents</div></div></div></div></Shell>};

export const AentsProcessSim: React.FC<SimulationProps> = ({frame,total}) => {const span=Math.max(1,total??frame+1);const p=frame/span;return <Shell frame={frame} eyebrow="DE LA IDEA AL PRODUCTO" title="Un equipo para todo el proceso"><div style={{marginTop:32,display:'grid',gap:15}}>{['Estrategia','Diseño','Desarrollo','Lanzamiento'].map((label,i)=>{const a=reveal(p,.06+i*.16,.25+i*.16);return <div key={label} style={{height:105,padding:'0 28px',borderRadius:26,display:'flex',alignItems:'center',gap:22,background:a>.72?'linear-gradient(90deg,#6B5CF6,#392C8F)':'rgba(255,255,255,.06)',border:'2px solid rgba(167,139,250,.2)',opacity:a,transform:`scale(${.98+a*.02})`}}><span style={{fontSize:23,fontWeight:800,color:lavender}}>0{i+1}</span><span style={{fontSize:37,fontWeight:800}}>{label}</span><b style={{marginLeft:'auto',width:46,height:46,borderRadius:15,display:'grid',placeItems:'center',background:'#FFF',color:violet,fontSize:25}}>✓</b></div>})}</div></Shell>};

export const AentsServicesSim: React.FC<SimulationProps> = ({frame,total}) => {const span=Math.max(1,total??frame+1);const p=frame/span;const services=[['Webs','Rápidas, adaptables y listas para crecer'],['Apps','iPhone y Android'],['Sistemas','Gestión, paneles, roles y flujos'],['Automatización','Datos, procesos e integraciones']];const active=Math.min(3,Math.floor(p*4));return <Shell frame={frame} eyebrow="SOFTWARE A MEDIDA" title="¿Qué construimos contigo?"><div style={{marginTop:26,display:'grid',gap:12}}>{services.map(([title,detail],i)=>{const a=reveal(p,.04+i*.11,.18+i*.11);return <div key={title} style={{height:105,boxSizing:'border-box',padding:'17px 24px',borderRadius:24,background:i===active?'linear-gradient(135deg,#7C6BF8,#4C39C4)':'rgba(255,255,255,.07)',border:'2px solid rgba(255,255,255,.13)',boxShadow:i===active?'0 20px 50px rgba(107,92,246,.32)':'none',opacity:a,transform:`scale(${.98+a*.02})`}}><div style={{fontSize:31,fontWeight:800,lineHeight:1}}>{title}</div><div style={{marginTop:7,fontSize:19,fontWeight:700,color:'rgba(255,255,255,.72)',whiteSpace:'nowrap'}}>{detail}</div></div>})}</div></Shell>};

/**
 * The closing card: the only screen a viewer is asked to act on.
 *
 * The version this replaces had three separate faults, and all three are the
 * kind a still frame hides. It printed «AENTS · SOFTWARE FOR PEOPLE» at
 * `bottom: 230`, which is below `textFloor` — under TikTok's own caption and
 * username, so the signature of the piece was invisible on a phone. It reached
 * its final layout in half a second and then held it, and the review measured
 * the last shot as the same picture for 4.8 of its 5.9 seconds. And it loaded
 * the brand tile by filename instead of taking `brandTile` from its props, so it
 * could only ever belong to one account.
 *
 * A closing card does have to settle — a call to action that keeps moving is
 * one nobody can read. Settling is not freezing: the layout stops, the light
 * does not.
 */
const CONTACT = {
  tile: 196,
  column: 1080 - sideCrop * 2,
  top: 356,
};

export const AentsContactSim: React.FC<SimulationProps> = ({frame, total, brandId, brandName, brandTile, brandDomain}) => {
  const span = Math.max(1, total ?? frame + 1);
  const p = frame / span;
  const tokens = tokensFor(brandId, brandName);
  const {fps} = useVideoConfig();
  const mark = spring({frame, fps, config: {damping: 15, mass: 0.7}});
  const invitation = land(p, 0.08, 0.3);
  const reach = land(p, 0.2, 0.44);
  const ways = [0, 1].map((index) => land(p, 0.34 + index * 0.07, 0.56 + index * 0.07));
  const signature = land(p, 0.52, 0.72);
  // The light that keeps the finished card alive without moving it.
  const breath = 0.5 + Math.sin(p * Math.PI * 3) * 0.5;
  const tile = brandTile ? staticFile(brandTile) : null;
  return (
    <Field tokens={tokens} push={p}>
      <Halo color={`${tokens.accent}7A`} size={880} x={540} y={CONTACT.top + 190} strength={0.45 + breath * 0.3} />
      <div
        style={{
          position: 'absolute',
          left: sideCrop,
          width: CONTACT.column,
          top: CONTACT.top,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {tile ? (
          <Img
            src={tile}
            style={{
              width: CONTACT.tile,
              height: CONTACT.tile,
              borderRadius: 54,
              boxShadow: `0 34px ${88 + breath * 44}px ${tokens.accent}8C`,
              opacity: mark,
              transform: `scale(${0.82 + mark * 0.18})`,
            }}
          />
        ) : null}
        <Reveal progress={invitation} style={{marginTop: 30}}>
          <div style={{fontSize: 64, fontWeight: 800, letterSpacing: '-.055em'}}>Agenda tu idea</div>
        </Reveal>
        <Reveal progress={invitation} style={{marginTop: 12}}>
          <div style={{fontSize: 32, fontWeight: 700, color: 'rgba(255,255,255,.72)'}}>Construyamos tu software.</div>
        </Reveal>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            marginTop: 34,
            padding: '16px 40px 20px',
            borderRadius: 28,
            background: tokens.confirm,
            color: '#07140B',
            boxShadow: `0 24px ${58 + breath * 30}px ${tokens.confirm}59`,
            opacity: Math.min(1, reach * 1.4),
            transform: `translateY(${(1 - reach) * 26}px) scale(${0.94 + reach * 0.06})`,
          }}
        >
          <div style={{fontSize: 21, fontWeight: 800, letterSpacing: '.14em'}}>WHATSAPP</div>
          <div style={{marginTop: 4, fontSize: 43, fontWeight: 800}}>+593 98 373 8151</div>
          {reach >= 1 ? <Sweep progress={metronome(p, 1.4)} color="rgba(255,255,255,.34)" width={150} span={520} /> : null}
        </div>
        <div style={{marginTop: 26, display: 'flex', gap: 18}}>
          {[
            {label: 'Escríbenos', background: 'rgba(255,255,255,.1)'},
            {label: brandDomain ?? 'aents.net', background: tokens.accent},
          ].map((way, index) => (
            <div
              key={way.label}
              style={{
                padding: '16px 26px',
                borderRadius: 99,
                background: way.background,
                fontSize: 26,
                fontWeight: 800,
                opacity: Math.min(1, ways[index] * 1.5),
                transform: `translateY(${(1 - ways[index]) * 18}px)`,
              }}
            >
              {way.label}
            </div>
          ))}
        </div>
        {/* Above `textFloor`, where a phone can actually see it. */}
        <Reveal progress={signature} style={{marginTop: 34}}>
          <div style={{fontSize: 24, fontWeight: 800, letterSpacing: '.13em', color: 'rgba(255,255,255,.55)'}}>
            {tokens.label} · SOFTWARE FOR PEOPLE
          </div>
        </Reveal>
      </div>
    </Field>
  );
};
