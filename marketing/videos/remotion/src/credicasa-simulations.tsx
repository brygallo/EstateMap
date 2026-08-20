import React from 'react';
import {EmExample, EmGlyph, em} from './estatemap-ui';
import {DEPTH, HeroImpact, HeroPlane, HeroStage, HERO_MOVES} from './hero-stage';
import {PropertyArt} from './property-art';
import type {SimulationProps} from './simulations';
import {beat, figures, glide, land, tokensFor} from './system-kit';
import {font, palette, sideCrop} from './theme';

const SOURCE = 'BIESS · información verificada al 20 ago 2026';
const LEGAL = 'Contenido informativo · verifica condiciones vigentes con BIESS';
const INK = '#102137';
const PAPER = '#FFFDF7';
const LINE = '#CBD5E1';
const GREEN = '#16834B';
const AMBER = '#D97706';
const RED = '#B42318';

const progress = ({frame, total}: SimulationProps) => Math.max(0, Math.min(1, frame / Math.max(1, total - 1)));

// The words of the piece live between 1348 and 1580, and they are white. A
// light board underneath them is not a style choice: it is the caption
// disappearing. Every light Geo simulation therefore fades into the ink before
// the headline starts, the same way the ranking page does, and the class board
// stops above that fade instead of being swallowed by it.
const BOARD_BOTTOM = 790;
const FADE_TOP = 1130;

const Canvas: React.FC<{children: React.ReactNode; footer?: string; dark?: boolean}> = ({children, footer = SOURCE, dark = false}) => (
  <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: dark ? '#09291D' : '#E9F3ED', color: dark ? '#FFFFFF' : INK, fontFamily: font}}>
    <div style={{position: 'absolute', inset: `285px 120px ${BOARD_BOTTOM}px`}}>{children}</div>
    <div style={{position: 'absolute', left: sideCrop, right: sideCrop, top: 1136, borderTop: `2px solid ${dark ? '#FFFFFF55' : '#64748B55'}`, paddingTop: 14, fontSize: 26, lineHeight: 1.2, fontWeight: 800, textAlign: 'center', color: dark ? '#ECFDF5' : '#475569'}}>{footer}</div>
    <div style={{position: 'absolute', left: 0, right: 0, top: FADE_TOP, bottom: 0, pointerEvents: 'none', background: `linear-gradient(180deg, rgba(233,243,237,0) 0%, rgba(30,34,52,.12) 8%, rgba(20,23,40,.55) 22%, rgba(12,14,26,.92) 34%, ${palette.ink} 46%)`}} />
  </div>
);

const Folder: React.FC<{children: React.ReactNode; p: number; stamp?: string; tone?: 'green'|'amber'|'red'}> = ({children, p, stamp, tone = 'green'}) => {
  const color = tone === 'green' ? GREEN : tone === 'amber' ? AMBER : RED;
  return <div style={{position:'absolute', inset:'70px 0 0', borderRadius:30, background:PAPER, border:`4px solid ${LINE}`, boxShadow:'0 28px 70px rgba(15,35,28,.2)', padding:'72px 54px 48px', boxSizing:'border-box', transform:`translateY(${(1-land(p,0,.12))*70}px)`}}>
    <div style={{position:'absolute',left:36,top:-54,width:470,height:70,borderRadius:'22px 22px 0 0',background:'#D8B76C',border:`4px solid #B38C3C`,borderBottom:0,fontSize:27,fontWeight:900,letterSpacing:'.02em',whiteSpace:'nowrap',display:'grid',placeItems:'center'}}>EXPEDIENTE HIPOTECARIO</div>
    {/* The board is taller than most of its contents. Top-aligning them left
        a third of the card empty, which reads as a slide that failed to load. */}
    <div style={{height:'100%',display:'flex',flexDirection:'column',justifyContent:'center'}}>{children}</div>
    {stamp ? <div style={{position:'absolute',right:40,bottom:35,padding:'14px 22px',border:`7px solid ${color}`,borderRadius:16,color,fontSize:34,fontWeight:900,letterSpacing:'.035em',transform:`rotate(-6deg) scale(${land(p,.5,.64)})`,background:'#FFFFFFDD'}}>{stamp}</div> : null}
  </div>;
};

const BigFact: React.FC<{label:string; value:string; active?:boolean; p?:number}> = ({label,value,active=true,p=1}) => <div style={{flex:1,minHeight:210,borderRadius:24,border:`4px solid ${active?GREEN:LINE}`,background:active?'#E7F8EE':'#F8FAFC',padding:28,display:'flex',flexDirection:'column',justifyContent:'center',opacity:.35+.65*p,transform:`scale(${.94+.06*p})`,boxSizing:'border-box'}}><div style={{fontSize:36,fontWeight:800,color:'#475569',marginBottom:12}}>{label}</div><div style={{fontSize:58,lineHeight:1,fontWeight:900,color:active?GREEN:INK,...figures}}>{value}</div></div>;
const Stamp: React.FC<{text:string; ok?:boolean; p?:number}> = ({text,ok=true,p=1}) => <div style={{padding:'18px 24px',border:`6px solid ${ok?GREEN:RED}`,borderRadius:16,color:ok?GREEN:RED,fontSize:38,fontWeight:900,background:'#FFFFFF',transform:`rotate(-3deg) scale(${land(p,0,.2)})`,textAlign:'center'}}>{text}</div>;
const Heading: React.FC<{children:React.ReactNode}> = ({children}) => <div style={{fontSize:48,lineHeight:1.08,fontWeight:900,letterSpacing:'-.025em',marginBottom:28}}>{children}</div>;

// The opening shot stacks three layers that never touch: the house on its own
// plane, the three published figures on a rail underneath it, and the three
// checks the class is about in front. The earlier version dropped the amount
// card over the door of the house and pushed the country badge past the crop
// margin, which is exactly what the two rules it broke exist to prevent.
const HeroFact: React.FC<{label:string; value:string; p?:number}> = ({label,value,p=1}) => (
  <div style={{flex:1,minHeight:186,borderRadius:22,border:`4px solid ${GREEN}`,background:'#E7F8EEF2',padding:'22px 24px',display:'flex',flexDirection:'column',justifyContent:'center',boxSizing:'border-box',opacity:.25+.75*p,transform:`translateY(${(1-p)*26}px) scale(${.95+.05*p})`,boxShadow:'0 18px 44px rgba(0,0,0,.34)'}}>
    <div style={{fontSize:26,fontWeight:800,color:'#475569',marginBottom:10,letterSpacing:'.01em'}}>{label}</div>
    <div style={{fontSize:44,lineHeight:1.02,fontWeight:900,color:GREEN,...figures}}>{value}</div>
  </div>
);

export const CredicasaHeroSim: React.FC<SimulationProps> = (props) => {
  const p = progress(props);
  const tokens = tokensFor(props.brandId, props.brandName);
  const camera = HERO_MOVES['pull-back'](p);
  return <HeroStage tokens={tokens} progress={p} camera={camera}>{rig => <>
    <HeroPlane camera={rig} depth={DEPTH.subject}>
      <div style={{position:'absolute',left:120,top:300,width:840,height:470,borderRadius:34,overflow:'hidden',border:'5px solid #FFFFFF',boxShadow:'0 34px 90px rgba(0,0,0,.5)'}}>
        <PropertyArt kind="house" variant={17} progress={p} style={{width:'100%',height:'100%'}} />
      </div>
      <div style={{position:'absolute',left:636,top:322,display:'flex',alignItems:'center',gap:10,padding:'12px 22px',borderRadius:999,background:'rgba(8,9,21,.72)',border:'2px solid rgba(255,255,255,.22)',fontSize:30,fontWeight:900,color:'#FFFFFF'}}>
        <EmGlyph icon="pin" size={32} color="#FFFFFF" /> ECUADOR
      </div>
    </HeroPlane>
    <HeroPlane camera={rig} depth={DEPTH.context}>
      <div style={{position:'absolute',left:120,right:120,top:800,display:'flex',gap:14}}>
        <HeroFact label="TASA NOMINAL" value="2,99%" p={beat(p,.02,.14)} />
        <HeroFact label="FINANCIA" value="HASTA 100%" p={beat(p,.1,.22)} />
        <HeroFact label="MONTO" value="HASTA $65.000" p={beat(p,.18,.3)} />
      </div>
    </HeroPlane>
    <HeroPlane camera={rig} depth={DEPTH.foreground}>
      <div style={{position:'absolute',left:120,right:120,top:1010,display:'flex',gap:14}}>
        {['PERSONA','VIVIENDA','COSTO'].map((x,i) => <Stamp key={x} text={x} p={beat(p,.48+i*.07,.58+i*.07)} />)}
      </div>
    </HeroPlane>
    <div style={{position:'absolute',left:sideCrop,right:sideCrop,top:1165,borderTop:'2px solid #FFFFFF66',paddingTop:14,textAlign:'center',fontSize:27,fontWeight:800,color:'#ECFDF5'}}>{SOURCE}</div>
    <HeroImpact progress={p} at={.48} x={540} y={1052} color={tokens.alert} />
  </>}</HeroStage>;
};

export const CredicasaFactCardSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.3?0:p<.78?1:2; return <Canvas><Folder p={p} stamp={phase===0?'DOS TASAS':phase===1?'SON MÁXIMOS':'DEPENDE DE TU EDAD'}>
  {phase===0?<><Heading>La tasa tiene dos lecturas</Heading><div style={{display:'flex',gap:22}}><BigFact label="NOMINAL" value="2,99%"/><BigFact label="EFECTIVA" value="3,03%"/></div></>:phase===1?<><Heading>Tres máximos publicados</Heading><div style={{display:'grid',gap:18}}><BigFact label="FINANCIAMIENTO" value="HASTA 100%"/><div style={{display:'flex',gap:18}}><BigFact label="MONTO" value="$65.000"/><BigFact label="PLAZO" value="30 AÑOS"/></div></div></>:<><Heading>El plazo real cambia con el perfil</Heading><div style={{display:'flex',alignItems:'center',gap:28}}><div style={{fontSize:96,fontWeight:900,color:GREEN}}>360</div><div style={{fontSize:42,fontWeight:900}}>MESES<br/><span style={{color:'#64748B'}}>como máximo</span></div></div><div style={{marginTop:36,height:18,borderRadius:99,background:LINE}}><div style={{width:`${70+20*glide(p,.78,1)}%`,height:'100%',background:GREEN,borderRadius:99}}/></div></>}
  </Folder></Canvas> };

export const CredicasaHomeGateSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.34?0:p<.7?1:2; return <Canvas><div style={{position:'absolute',left:0,right:0,top:20,height:560,borderRadius:32,overflow:'hidden',boxShadow:'0 26px 60px rgba(15,35,28,.22)'}}><PropertyArt kind="house" variant={8} progress={p} style={{width:'100%',height:'100%'}}/></div><div style={{position:'absolute',left:24,right:24,top:500,background:PAPER,border:`4px solid ${LINE}`,borderRadius:26,padding:30}}>{phase===0?<><Heading>Un solo tope</Heading><BigFact label="VIVIENDA + GASTOS FINANCIADOS" value="$65.000"/></>:phase===1?<><Heading>La vivienda cruza tres sellos</Heading><div style={{display:'flex',gap:14}}>{['ÚNICA','NUEVA','PRIMER USO'].map((x,i)=><Stamp key={x} text={x} p={beat(p,.34+i*.08,.44+i*.08)}/>)}</div></>:<><Heading>Dos límites al financiar gastos</Heading><div style={{display:'flex',gap:18}}><BigFact label="NO SUPERAR" value="AVALÚO"/><BigFact label="NO SUPERAR" value="$65.000"/></div></>}</div></Canvas> };

export const CredicasaSuiteSim: React.FC<SimulationProps> = (props) => { const p=progress(props); return <Canvas><div style={{position:'absolute',inset:'20px 0 90px',borderRadius:34,overflow:'hidden',background:'#DCEAF2',border:`4px solid ${LINE}`}}><PropertyArt kind="apartment" variant={12} progress={p} style={{width:'100%',height:'58%'}}/><div style={{position:'absolute',left:30,right:30,bottom:28,background:PAPER,borderRadius:24,padding:30,display:'flex',alignItems:'center',gap:26}}><div style={{fontSize:94,fontWeight:900,color:GREEN}}>1</div><div style={{fontSize:42,fontWeight:900}}>HABITACIÓN<br/><span style={{fontSize:36,color:'#475569'}}>Una suite también puede aplicar</span></div><Stamp text="MISMAS CONDICIONES" p={beat(p,.42,.62)}/></div></div></Canvas> };

export const CredicasaThreeNumbersSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.38?0:p<.76?1:2; return <Canvas><Folder p={p} stamp={phase===1?'AVALÚO BIESS':phase===2?'NO SON IGUALES':'SEPARAR'}><Heading>{phase===2?'El vendedor no fija el avalúo':'Tres números, tres decisiones'}</Heading><div style={{display:'grid',gap:18}}><BigFact label="PRECIO · lo pide el vendedor" value={phase===2?'VENDEDOR':'PRECIO'} active={phase!==1}/><BigFact label="AVALÚO · lo determina BIESS" value={phase===1?'$71.504,70':'AVALÚO'} active={phase>=1}/><BigFact label="CRÉDITO · lo aprueban" value="HASTA $65.000" active={phase===0}/></div></Folder></Canvas> };

export const CredicasaEntryExampleSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.34?0:p<.68?1:2; return <Canvas footer="EJEMPLO pedagógico · no es aprobación"><div style={{position:'absolute',right:0,top:0}}><EmExample scale={1.5}/></div><div style={{position:'absolute',left:0,right:0,top:70,height:490,borderRadius:32,overflow:'hidden'}}><PropertyArt kind="house" variant={5} progress={p} style={{width:'100%',height:'100%'}}/></div><div style={{position:'absolute',left:18,right:18,top:510,background:PAPER,border:`4px solid ${LINE}`,borderRadius:28,padding:30}}>{phase===0?<BigFact label="VIVIENDA DE EJEMPLO" value="$60.000"/>:phase===1?<><Heading>Hipoteca al 80%</Heading><div style={{display:'flex',gap:18}}><BigFact label="FINANCIA" value="$48.000"/><BigFact label="ENTRADA 20%" value="$12.000"/></div></>:<><Heading>Credicasa</Heading><BigFact label="SI CALIFICAS" value="HASTA 100%"/><Stamp text="NO ES APROBACIÓN" ok={false} p={beat(p,.78,.9)}/></>}</div></Canvas> };

export const CredicasaCapacitySim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.34?0:p<.72?1:2; return <Canvas footer="Montos de ejemplo · la precalificación oficial define el monto"><Folder p={p} stamp={phase===2?'PRECALIFICA':'NO AUTOMÁTICO'}><Heading>Tu capacidad decide</Heading>{phase===0?<><div style={{fontSize:92,fontWeight:900,color:'#94A3B8',textDecoration:'line-through'}}>$65.000</div><div style={{fontSize:40,fontWeight:900}}>no se aprueban automáticamente</div></>:phase===1?<><div style={{position:'absolute',right:42,top:42}}><EmExample scale={1.4}/></div><div style={{display:'grid',gap:20}}>{['$38.000','$52.000','$65.000'].map((x,i)=><BigFact key={x} label={`PERFIL ${i+1}`} value={x} p={beat(p,.34+i*.08,.46+i*.08)}/>)}</div></>:<div style={{display:'grid',placeItems:'center',height:520}}><div style={{fontSize:64,fontWeight:900,textAlign:'center',color:GREEN}}>PRECALIFICACIÓN<br/>OFICIAL</div><EmGlyph icon="check" size={120}/></div>}</Folder></Canvas> };

export const CredicasaApplicantsASim: React.FC<SimulationProps> = (props) => { const p=progress(props); const income=p>.58; return <Canvas><Folder p={p} stamp={income?'LÍMITE FAMILIAR':'APORTACIONES'}>{income?<><Heading>Ingreso familiar máximo</Heading><BigFact label="PUBLICADO" value="$1.527,94 / MES"/><div style={{fontSize:40,fontWeight:800,marginTop:28}}>Se evalúa el ingreso de la familia.</div></>:<><Heading>Afiliado dependiente</Heading><div style={{display:'flex',alignItems:'end',gap:24}}><BigFact label="TOTAL" value="36 APORTES"/><BigFact label="ÚLTIMOS" value="13 SEGUIDOS"/></div><div style={{display:'flex',gap:7,marginTop:35}}>{Array.from({length:13},(_,i)=><div key={i} style={{height:70,width:42,borderRadius:8,background:i<Math.floor(beat(p,.18,.5)*13)?GREEN:LINE}}/>)}</div></>}</Folder></Canvas> };

export const CredicasaApplicantsBSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.5?0:1; return <Canvas><Folder p={p} stamp={phase===0?'DOS RUTAS':'18 EN TOTAL'}>{phase===0?<><Heading>Voluntario o jubilado</Heading><div style={{display:'flex',gap:22}}><BigFact label="VOLUNTARIO" value="36 SEGUIDOS"/><BigFact label="JUBILADO" value="CON PENSIÓN"/></div></>:<><Heading>Persona con discapacidad</Heading><BigFact label="APORTACIONES" value="18 EN TOTAL"/><div style={{fontSize:40,fontWeight:800,marginTop:28}}>No se presentan como consecutivas.</div></>}</Folder></Canvas> };

export const CredicasaAgeTermSim: React.FC<SimulationProps> = (props) => { const p=progress(props); return <Canvas><Folder p={p} stamp="LÍMITE OFICIAL" tone="amber"><Heading>Edad y plazo se cruzan</Heading><div style={{display:'flex',alignItems:'center',gap:32}}><div style={{fontSize:54,fontWeight:900}}>EDAD<br/><span style={{fontSize:38,color:'#64748B'}}>del solicitante</span></div><div style={{fontSize:74}}>＋</div><div style={{fontSize:54,fontWeight:900}}>PLAZO<br/><span style={{fontSize:38,color:'#64748B'}}>solicitado</span></div></div><div style={{marginTop:55,height:28,borderRadius:99,background:LINE,position:'relative'}}><div style={{width:`${glide(p,.1,.62)*78}%`,height:'100%',borderRadius:99,background:GREEN}}/><div style={{position:'absolute',left:'78%',top:-34,width:10,height:96,background:AMBER}}/></div><div style={{fontSize:38,fontWeight:900,marginTop:45}}>No supera la esperanza de vida oficial aplicable.</div></Folder></Canvas> };

export const CredicasaPaymentExampleSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const phase=p<.34?0:p<.7?1:2; return <Canvas footer="EJEMPLO aproximado · usa la simulación oficial BIESS"><div style={{position:'absolute',right:0}}><EmExample scale={1.5}/></div><Folder p={p} stamp={phase===2?'NO ES CUOTA FINAL':'EJEMPLO'}>{phase===0?<><Heading>Tres supuestos</Heading><div style={{display:'grid',gap:18}}><BigFact label="CRÉDITO" value="$60.000"/><div style={{display:'flex',gap:18}}><BigFact label="NOMINAL" value="2,99%"/><BigFact label="PLAZO" value="30 AÑOS"/></div></div></>:phase===1?<><Heading>Solo capital e intereses</Heading><div style={{fontSize:126,fontWeight:900,color:GREEN,...figures}}>≈ $253</div><div style={{fontSize:48,fontWeight:900}}>AL MES</div></>:<><Heading>Esta cifra no demuestra</Heading><Stamp text="CUOTA FINAL" ok={false}/><Stamp text="INGRESO SUFICIENTE" ok={false} p={beat(p,.76,.9)}/></>}</Folder></Canvas> };

export const CredicasaInsuranceCostsSim: React.FC<SimulationProps> = (props) => { const p=progress(props); return <Canvas><Folder p={p} stamp="SEGUROS"><Heading>El crédito suma coberturas</Heading><div style={{display:'grid',gap:24}}><BigFact label="SEGURO" value="DESGRAVAMEN" p={beat(p,.06,.2)}/><BigFact label="SEGURO" value="DEL INMUEBLE" p={beat(p,.18,.32)}/></div><div style={{fontSize:38,fontWeight:800,marginTop:32}}>El costo mensual puede diferir de una calculadora simple.</div></Folder></Canvas> };

export const CredicasaProcessCostsSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const excluded=p>.55; return <Canvas><Folder p={p} stamp={excluded?'NO SALEN AL INICIO':'COSTO DEL PROCESO'} tone="amber"><Heading>{excluded?'La simulación inicial está incompleta':'Gastos del trámite'}</Heading>{excluded?<div style={{display:'flex',gap:22}}><BigFact label="SIMULACIÓN INICIAL" value="CAPACIDAD"/><div style={{fontSize:80,fontWeight:900,color:RED,alignSelf:'center'}}>≠</div><BigFact label="DESPUÉS" value="GASTOS"/></div>:<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>{['AVALÚO','LEGALES','NOTARÍA','REGISTRO'].map((x,i)=><BigFact key={x} label={`RUBRO ${i+1}`} value={x} p={beat(p,.05+i*.08,.18+i*.08)}/>)}</div>}</Folder></Canvas> };

export const CredicasaExpenseRequestSim: React.FC<SimulationProps> = (props) => { const p=progress(props); return <Canvas><Folder p={p} stamp="A PETICIÓN"><Heading>Los gastos no entran solos</Heading><div style={{display:'flex',alignItems:'center',gap:20}}><BigFact label="SOLICITANTE" value="LO PIDE"/><div style={{fontSize:72,fontWeight:900}}>→</div><BigFact label="CRÉDITO" value="PUEDE INCLUIRLOS"/></div><div style={{display:'flex',gap:20,marginTop:26}}><Stamp text="≤ AVALÚO" p={beat(p,.38,.52)}/><Stamp text="≤ $65.000" p={beat(p,.5,.64)}/></div></Folder></Canvas> };

export const CredicasaEndedProcessSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const collection=p>.52; return <Canvas><Folder p={p} stamp={collection?'PUEDE HABER COBRO':'TRÁMITE TERMINADO'} tone="red">{collection?<><Heading>Los gastos incurridos pueden cobrarse</Heading><div style={{display:'flex',gap:22}}><BigFact label="COBRO" value="PLANILLA"/><BigFact label="COBRO" value="PAGO DIRECTO"/></div><div style={{display:'flex',gap:18,marginTop:26}}><Stamp text="MORA" ok={false}/><Stamp text="BLOQUEO DE OTRO PRÉSTAMO" ok={false} p={beat(p,.68,.82)}/></div></>:<><Heading>Cuatro finales con riesgo</Heading><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>{['DESISTE','ANULA','CADUCA','RECHAZADA'].map((x,i)=><Stamp key={x} text={x} ok={false} p={beat(p,.04+i*.08,.17+i*.08)}/>)}</div><div style={{fontSize:44,fontWeight:900,marginTop:42}}>Los gastos ya generados no desaparecen.</div></>}</Folder></Canvas> };

export const CredicasaRateResetSim: React.FC<SimulationProps> = (props) => { const p=progress(props); return <Canvas><Folder p={p} stamp="REVISAR" tone="amber"><Heading>La tasa se reajusta</Heading><div style={{fontSize:118,fontWeight:900,color:AMBER,...figures}}>180 DÍAS</div><div style={{height:30,borderRadius:99,background:LINE,margin:'42px 0'}}><div style={{height:'100%',width:`${glide(p,.08,.7)*100}%`,background:AMBER,borderRadius:99}}/></div><BigFact label="TARIFARIO DE AGOSTO 2026" value="REVISAR CONTRATO"/></Folder></Canvas> };

export const CredicasaReservationSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const checks=p>.48; return <Canvas footer="Antes de entregar dinero, busca asesoría jurídica"><Folder p={p} stamp={checks?'TODO POR ESCRITO':'ESPERA'} tone={checks?'green':'amber'}>{checks?<><Heading>Checklist antes de pagar</Heading><div style={{display:'grid',gap:16}}>{['DEVOLUCIÓN','GRAVÁMENES','REGISTRO','PROMESA + ASESORÍA'].map((x,i)=><Stamp key={x} text={x} p={beat(p,.48+i*.07,.58+i*.07)}/>)}</div></>:<><Heading>La reserva espera dos confirmaciones</Heading><BigFact label="PERSONA" value="SÍ CALIFICA"/><BigFact label="INMUEBLE" value="SÍ APLICA"/></>}</Folder></Canvas> };

const Steps: React.FC<{p:number; items:Array<[number,string]>}> = ({p,items}) => <div style={{display:'grid',gap:22}}>{items.map(([n,x],i)=><div key={n} style={{display:'flex',alignItems:'center',gap:24,background:PAPER,border:`4px solid ${GREEN}`,borderRadius:24,padding:24,transform:`translateX(${(1-land(p,.06+i*.15,.2+i*.15))*80}px)`}}><div style={{width:78,height:78,borderRadius:'50%',background:GREEN,color:'#fff',display:'grid',placeItems:'center',fontSize:42,fontWeight:900}}>{n}</div><div style={{fontSize:42,fontWeight:900}}>{x}</div></div>)}</div>;
export const CredicasaOrderASim: React.FC<SimulationProps> = (props) => {const p=progress(props);const late=p>.5;return <Canvas><Folder p={p} stamp="EN ORDEN"><Heading>Antes de buscar</Heading><Steps p={p} items={late?[[3,'DEFINE PRESUPUESTO'],[4,'BUSCA ELEGIBLES']]:[[1,'REVISA REQUISITOS'],[2,'PRECALIFÍCATE']]}/></Folder></Canvas>};
export const CredicasaOrderBSim: React.FC<SimulationProps> = (props) => {const p=progress(props);const late=p>.5;return <Canvas><Folder p={p} stamp="ANTES DE FIRMAR"><Heading>Antes de comprometer dinero</Heading><Steps p={p} items={late?[[7,'AVALÚO Y REVISIÓN'],[8,'LEE CONDICIONES']]:[[5,'COMPARA OPCIONES'],[6,'VERIFICA ANTES DE PAGAR']]}/></Folder></Canvas>};

export const CredicasaBudgetMapSim: React.FC<SimulationProps> = (props) => { const p=progress(props); const pins=[{x:180,y:300,v:'$52k',ok:true},{x:590,y:240,v:'$68k',ok:false},{x:520,y:590,v:'$59k',ok:true}]; return <Canvas footer="Propiedades ilustrativas · compara precio y ubicación en Geo"><div style={{position:'absolute',inset:'20px 0 30px',background:'#DCE9E2',borderRadius:32,border:`4px solid ${LINE}`,overflow:'hidden'}}><div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(25deg,transparent 46%,#FFFFFF 47%,#FFFFFF 53%,transparent 54%),linear-gradient(115deg,transparent 46%,#FFFFFF 47%,#FFFFFF 53%,transparent 54%)',backgroundSize:'260px 220px'}}/><div style={{position:'absolute',left:32,right:32,top:28,background:PAPER,borderRadius:22,padding:24,fontSize:42,fontWeight:900}}>PRESUPUESTO MÁXIMO <span style={{color:GREEN}}>$60.000</span></div>{pins.map((pin,i)=><div key={pin.v} style={{position:'absolute',left:pin.x,top:pin.y,opacity:pin.ok?1:1-beat(p,.42,.58),transform:pin.ok?'none':`translateY(${-60*beat(p,.42,.58)}px)`,padding:'16px 24px',borderRadius:999,background:pin.ok?GREEN:'#64748B',color:'#fff',fontSize:40,fontWeight:900,boxShadow:'0 12px 28px rgba(0,0,0,.25)'}}><EmGlyph icon="pin" size={34} color="#fff"/> {pin.v}</div>)}</div></Canvas> };

export const CredicasaRecapSim: React.FC<SimulationProps> = (props) => { const p=progress(props); return <Canvas footer={LEGAL}><Folder p={p} stamp="VERIFICA CON BIESS"><Heading>Antes de buscar, recuerda</Heading><div style={{display:'grid',gap:18}}>{[['TASA PUBLICADA','2,99%'],['FINANCIAMIENTO','HASTA 100%'],['TOPE CON GASTOS','$65.000'],['DECIDE TU MONTO','PRECALIFICACIÓN']].map((x,i)=><BigFact key={x[0]} label={x[0]} value={x[1]} p={beat(p,.04+i*.08,.16+i*.08)}/>)}</div></Folder></Canvas> };

// Compatibility exports kept registered while the 40-scene plan moves to the
// semantically exact IDs above.
export const CredicasaTotalEnvelopeSim = CredicasaProcessCostsSim;
