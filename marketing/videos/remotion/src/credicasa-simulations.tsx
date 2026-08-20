import React from 'react';
import {EmCard, EmExample, EmGlyph, EmPage, em, emCard, emType} from './estatemap-ui';
import {DEPTH, HERO_CENTRE, HeroImpact, HeroPlane, HeroStage, HERO_MOVES} from './hero-stage';
import {PropertyArt} from './property-art';
import type {SimulationProps} from './simulations';
import {beat, figures, glide, land, tokensFor} from './system-kit';
import {font, sideCrop} from './theme';

const pOf = ({frame, total}: SimulationProps) => Math.min(1, Math.max(0, frame / Math.max(1, total - 1)));
const source = 'Fuente oficial BIESS · 20 ago 2026';

const Stage: React.FC<{children: React.ReactNode; footer?: string}> = ({children, footer = source}) => (
  <EmPage>
    <div style={{position: 'absolute', inset: '250px 120px 470px', fontFamily: font}}>{children}</div>
    <div style={{position: 'absolute', left: sideCrop, bottom: 432, color: em.textMuted, fontSize: 22, fontWeight: 600}}>{footer}</div>
  </EmPage>
);

const Title: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{fontSize: emType.title, fontWeight: 900, color: em.text, lineHeight: 1.08, marginBottom: 30}}>{children}</div>
);

const Pill: React.FC<{children: React.ReactNode; active?: boolean; warning?: boolean; style?: React.CSSProperties}> = ({children, active, warning, style}) => (
  <div style={{padding: '16px 22px', borderRadius: 999, border: `2px solid ${active ? em.primary : warning ? em.warning : em.line}`, background: active ? em.primaryLight : warning ? '#FFF6DE' : em.white, color: active ? em.primaryStrong : em.textSecondary, fontSize: 27, fontWeight: 800, boxShadow: emCard.shadow, ...style}}>{children}</div>
);

const Row: React.FC<{label: string; value: string; progress: number; icon?: 'home' | 'check' | 'reject' | 'ruler' | 'tag'}> = ({label, value, progress, icon = 'check'}) => (
  <EmCard style={{display: 'flex', alignItems: 'center', gap: 20, padding: 24, marginBottom: 18, transform: `translateX(${(1 - land(progress, 0, .28)) * 70}px)`, opacity: progress}}>
    <EmGlyph icon={icon} size={34} color={progress > .65 ? em.primary : em.textMuted} />
    <div style={{flex: 1, color: em.textSecondary, fontSize: 28, fontWeight: 700}}>{label}</div>
    <div style={{color: em.text, fontSize: 32, fontWeight: 900, ...figures}}>{value}</div>
  </EmCard>
);

export const CredicasaHeroSim: React.FC<SimulationProps> = (props) => {
  const p = pOf(props);
  const tokens = tokensFor(props.brandId, props.brandName);
  const camera = HERO_MOVES['pull-back'](p);
  const terms = [
    {text: '2,99%', x: 132, y: 360, at: .04},
    {text: 'Hasta 100%', x: 650, y: 410, at: .13},
    {text: 'Hasta $65.000', x: 355, y: 850, at: .22},
  ];
  const gates = ['VIVIENDA', 'INGRESOS', 'CAPACIDAD'];
  return (
    <HeroStage tokens={tokens} progress={p} camera={camera}>
      {(rig) => <>
        <HeroPlane camera={rig} depth={DEPTH.subject}>
          <div style={{position: 'absolute', left: 250, top: 520, width: 580, height: 260, borderRadius: 28, overflow: 'hidden', border: `3px solid ${em.primary}`, boxShadow: '0 30px 80px rgba(0,0,0,.45)'}}>
            <PropertyArt kind="house" variant={17} progress={p} style={{width: '100%', height: '100%'}} />
          </div>
        </HeroPlane>
        <HeroPlane camera={rig} depth={DEPTH.context}>
          {terms.map((term) => { const enter = land(p, term.at, term.at + .1); return <Pill key={term.text} active style={{position: 'absolute', left: term.x, top: term.y, transform: `scale(${.7 + enter * .3})`, opacity: enter}}>{term.text}</Pill>; })}
        </HeroPlane>
        <HeroPlane camera={rig} depth={DEPTH.foreground}>
          <div style={{position: 'absolute', left: 132, right: 132, top: 900, display: 'flex', gap: 12}}>
            {gates.map((gate, i) => { const enter = land(p, .48 + i * .08, .58 + i * .08); return <div key={gate} style={{flex: 1, padding: '22px 8px', textAlign: 'center', borderRadius: 16, background: '#101827', border: `2px solid ${tokens.alert}`, color: '#fff', fontSize: 23, fontWeight: 900, transform: `translateY(${(1 - enter) * -100}px)`, opacity: enter}}>{gate}</div>; })}
          </div>
        </HeroPlane>
        <div style={{position: 'absolute', left: sideCrop, top: 1160, color: '#D1FAE5', fontSize: 22, fontWeight: 700}}>{source}</div>
        <HeroImpact progress={p} at={.48} x={HERO_CENTRE.x} y={850} color={tokens.alert} />
      </>}
    </HeroStage>
  );
};

export const CredicasaFactCardSim: React.FC<SimulationProps> = (props) => {
  const p = pOf(props); const facts = [['Tasa nominal', '2,99%'], ['Tasa efectiva', '3,03%'], ['Financiamiento', 'Hasta $65.000'], ['Plazo', 'Hasta 30 años']];
  return <Stage><Title>Los números publicados</Title>{facts.map((f, i) => <Row key={f[0]} label={f[0]} value={f[1]} progress={beat(p, .08 + i * .12, .28 + i * .12)} />)}</Stage>;
};

export const CredicasaHomeGateSim: React.FC<SimulationProps> = (props) => {
  const p = pOf(props); const checks = ['Única', 'Nueva / primer uso', 'Sin fin comercial', 'Una o más habitaciones'];
  return <Stage><Title>No entra cualquier vivienda</Title><EmCard raised style={{height: 310, overflow: 'hidden', marginBottom: 24}}><PropertyArt kind="house" variant={9} progress={p} style={{width: '100%', height: '100%'}} /></EmCard><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>{checks.map((x, i) => <Pill key={x} active={p > .18 + i * .12}><span style={{display:'inline-flex', gap: 10, alignItems:'center'}}><EmGlyph icon="check" />{x}</span></Pill>)}</div></Stage>;
};

export const CredicasaThreeNumbersSim: React.FC<SimulationProps> = (props) => {
  const p = pOf(props); const items = [['Precio del vendedor', 'No lo fija el BIESS'], ['Avalúo máximo', '$71.504,70'], ['Crédito máximo', '$65.000 incl. gastos']];
  return <Stage><Title>Son tres números distintos</Title>{items.map((x, i) => <Row key={x[0]} label={x[0]} value={x[1]} icon={i === 0 ? 'tag' : i === 1 ? 'ruler' : 'home'} progress={beat(p, i * .18, .3 + i * .18)} />)}<div style={{height: 10, borderRadius: 99, background: em.lineSubtle, marginTop: 40, overflow:'hidden'}}><div style={{height:'100%', width:`${glide(p,.42,.9)*91}%`, background:em.primary}} /></div></Stage>;
};

export const CredicasaEntryExampleSim: React.FC<SimulationProps> = (props) => {
  const p = pOf(props); const shift = glide(p, .45, .72);
  return <Stage footer="Ejemplo matemático · no constituye aprobación"><div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}><Title>¿Qué cambia sin entrada?</Title><EmExample /></div><EmCard raised style={{padding:32}}><div style={{fontSize:28, fontWeight:800, marginBottom:25}}>Vivienda de ejemplo: $60.000</div><div style={{display:'flex', height:130, borderRadius:18, overflow:'hidden'}}><div style={{width:`${20*(1-shift)}%`, background:em.warning, display:'grid', placeItems:'center', fontWeight:900, fontSize:28, overflow:'hidden'}}>$12.000</div><div style={{flex:1, background:em.primary, color:'#fff', display:'grid', placeItems:'center', fontWeight:900, fontSize:34}}>{shift>.8 ? 'Hasta 100%' : '$48.000'}</div></div><div style={{display:'flex', justifyContent:'space-between', marginTop:20, fontSize:25, color:em.textSecondary}}><span>Entrada tradicional</span><span>Monto financiado</span></div></EmCard></Stage>;
};

export const CredicasaCapacitySim: React.FC<SimulationProps> = (props) => {
  const p=pOf(props); const values=['$38.000','$52.000','$65.000'];
  return <Stage footer="Montos ilustrativos · la aprobación depende del análisis BIESS"><div style={{display:'flex', justifyContent:'space-between'}}><Title>El máximo no es automático</Title><EmExample /></div>{values.map((v,i)=><Row key={v} label={`Solicitud ${i+1}`} value={v} progress={beat(p,.08+i*.16,.3+i*.16)} />)}<Pill active style={{textAlign:'center', marginTop:28, transform:`scale(${.9+.1*land(p,.62,.8)})`}}>PRECALIFÍCATE PRIMERO</Pill></Stage>;
};

const ApplicantGrid: React.FC<{p:number; rows:Array<[string,string]>}> = ({p,rows}) => <>{rows.map((x,i)=><Row key={x[0]} label={x[0]} value={x[1]} progress={beat(p,.08+i*.2,.34+i*.2)} />)}</>;
export const CredicasaApplicantsASim: React.FC<SimulationProps> = (props) => { const p=pOf(props); return <Stage><Title>Aportaciones requeridas</Title><ApplicantGrid p={p} rows={[["Relación de dependencia","36 total · últimas 13 seguidas"],["Afiliación voluntaria","36 consecutivas"]]} /></Stage>; };
export const CredicasaApplicantsBSim: React.FC<SimulationProps> = (props) => { const p=pOf(props); return <Stage><Title>Otros límites publicados</Title><ApplicantGrid p={p} rows={[["Jubilado","Pensión jubilar"],["Discapacidad","18 aportaciones"],["Ingreso familiar","Hasta $1.527,94 / mes"]]} /></Stage>; };

export const CredicasaPaymentExampleSim: React.FC<SimulationProps> = (props) => {
  const p=pOf(props); const extras=beat(p,.5,.78);
  return <Stage footer="Ejemplo aproximado · usa la simulación oficial"><div style={{display:'flex',justifyContent:'space-between'}}><Title>La cuota no es solo tasa</Title><EmExample /></div><EmCard raised style={{padding:34,textAlign:'center'}}><div style={{fontSize:28,color:em.textSecondary}}>$60.000 · 30 años · 2,99%</div><div style={{fontSize:72,fontWeight:900,color:em.primaryStrong,margin:'18px 0',...figures}}>$253 <span style={{fontSize:28}}>aprox.</span></div><div style={{display:'flex',gap:12,justifyContent:'center',transform:`translateY(${(1-extras)*50}px)`,opacity:extras}}><Pill warning>Seguros</Pill><Pill warning>Gastos</Pill></div></EmCard><Pill active style={{textAlign:'center',marginTop:28}}>SIMULA EN BIESS</Pill></Stage>;
};

export const CredicasaTotalEnvelopeSim: React.FC<SimulationProps> = (props) => {
  const p=pOf(props); const parts=[['Vivienda',78,em.primary],['Avalúo y legales',10,em.teal],['Notaría y registro',12,em.warning]];
  return <Stage><Title>Todo cabe en el mismo límite</Title><div style={{fontSize:64,fontWeight:900,...figures}}>$65.000</div><div style={{fontSize:26,color:em.textSecondary,marginBottom:35}}>incluidos los gastos financiados</div><div style={{display:'flex',height:180,borderRadius:22,overflow:'hidden',border:emCard.border}}>{parts.map((x,i)=><div key={String(x[0])} style={{width:`${Number(x[1])*glide(p,.08+i*.12,.38+i*.12)}%`,background:String(x[2]),color:i===0?'#fff':em.text,display:'grid',placeItems:'center',fontSize:24,fontWeight:900,textAlign:'center',padding:8,boxSizing:'border-box'}}>{x[0]}</div>)}</div><Pill warning style={{marginTop:30,textAlign:'center'}}>NO SON $65.000 + GASTOS</Pill></Stage>;
};

export const CredicasaRateResetSim: React.FC<SimulationProps> = (props) => {
  const p=pOf(props); const current=Math.min(5,Math.floor(p*6));
  return <Stage><Title>La tasa se revisa cada 180 días</Title><div style={{position:'relative',marginTop:130,height:160}}><div style={{position:'absolute',left:20,right:20,top:56,height:8,background:em.line}} />{Array.from({length:6},(_,i)=><div key={i} style={{position:'absolute',left:`${i*18}%`,top:25,width:70,textAlign:'center'}}><div style={{width:28,height:28,borderRadius:'50%',margin:'18px auto',background:i<=current?em.warning:em.line}}/><div style={{fontSize:22,fontWeight:800}}>180 d</div></div>)}</div><EmCard raised style={{padding:28,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:28,fontWeight:800}}>2,99% publicado</span><Pill warning>REVISA EL CONTRATO</Pill></EmCard></Stage>;
};

export const CredicasaReservationSim: React.FC<SimulationProps> = (props) => {
  const p=pOf(props); const checked=beat(p,.44,.68);
  return <Stage footer="Antes de entregar dinero, busca asesoría jurídica"><Title>La reserva debe decir qué pasa</Title><EmCard raised style={{padding:34}}><div style={{fontSize:34,fontWeight:900,marginBottom:30}}>Reserva / promesa</div>{['Sujeta a aprobación del crédito','Cuándo es reembolsable','Qué ocurre si no se financia'].map((x,i)=><div key={x} style={{display:'flex',gap:18,alignItems:'center',fontSize:28,fontWeight:700,padding:'18px 0',borderBottom:`2px solid ${em.lineSubtle}`,opacity:beat(p,.08+i*.1,.28+i*.1)}}><EmGlyph icon={checked>.2+i*.2?'check':'reject'} color={checked>.2+i*.2?em.primary:em.warning}/>{x}</div>)}</EmCard></Stage>;
};

const Process: React.FC<{p:number; steps:string[]; start:number}> = ({p,steps,start}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>{steps.map((x,i)=>{const n=start+i;const enter=beat(p,.06+i*.12,.28+i*.12);return <EmCard key={x} style={{padding:24,display:'flex',gap:18,alignItems:'center',opacity:enter,transform:`translateY(${(1-enter)*35}px)`}}><div style={{width:52,height:52,borderRadius:'50%',background:em.primaryLight,color:em.primaryStrong,display:'grid',placeItems:'center',fontSize:26,fontWeight:900}}>{n}</div><div style={{fontSize:25,fontWeight:800}}>{x}</div></EmCard>})}</div>;
export const CredicasaOrderASim: React.FC<SimulationProps> = (props) => {const p=pOf(props);return <Stage><Title>Primero ordena tus números</Title><Process p={p} start={1} steps={['Revisa requisitos','Precalifícate','Fija tu presupuesto','Busca vivienda elegible']} /></Stage>};
export const CredicasaOrderBSim: React.FC<SimulationProps> = (props) => {const p=pOf(props);return <Stage><Title>Después compara y verifica</Title><Process p={p} start={5} steps={['Compara ubicación','Confirma compatibilidad','Avalúo y revisión','Lee antes de firmar']} /></Stage>};
