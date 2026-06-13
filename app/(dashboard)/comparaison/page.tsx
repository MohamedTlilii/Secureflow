'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BarChart2,
  Calendar, Wallet, CheckCircle, Target, XCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { SolutionExpress, Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

/* ─── cosmos ──────────────────────────────────────────────── */
const PART_COLORS = ['#12b76a','#3b6cf8','#61DAFB','#a78bfa','#34d399'];
interface Star     { x:number; y:number; s:number; o:number; d:number }
interface Particle { x:number; y:number; s:number; d:number; delay:number; color:string }

/* ─── mobile hook (SSR-safe) ──────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    h(); window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const getYear  = (f: SolutionExpress) => new Date(f.dateVente ?? f.createdAt).getFullYear();
const getMonth = (f: SolutionExpress) => new Date(f.dateVente ?? f.createdAt).getMonth();

/* ─── métriques ───────────────────────────────────────────── */
interface Metrics {
  gained:number; paid:number; pending:number; installe:number; annulee:number;
  commMax:number; commMin:number; payRate:number; total:number;
}
function calcMetrics(arr: SolutionExpress[]): Metrics {
  const actives  = arr.filter(f => f.status !== 'installation_annulee');
  const withComm = actives.filter(f => (f.commissionTotale||0)>0||(f.commissionFixe||0)>0);
  const gained   = actives.reduce((s,f)=>s+(f.commissionTotale||0), 0);
  const paid     = actives.filter(f=>f.commissionPayee).reduce((s,f)=>s+(f.commissionTotale||0), 0);
  const installe = actives.filter(f=>f.status==='installe').length;
  const annulee  = arr.filter(f=>f.status==='installation_annulee').length;
  const vals     = withComm.map(f=>f.commissionTotale||0).filter(v=>v>0);
  return {
    gained, paid, pending: Math.max(0, gained-paid), installe, annulee,
    commMax: vals.length?Math.max(...vals):0,
    commMin: vals.length?Math.min(...vals):0,
    payRate: gained>0?Math.round((paid/gained)*100):0,
    total: arr.length,
  };
}



/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════ */
export default function ComparaisonPage() {
  const isMobile = useIsMobile();

  const [fiches,          setFiches]          = useState<SolutionExpress[]>([]);
  const [settings,        setSettings]        = useState<Settings>(DEFAULT_SETTINGS);
  const [loading,         setLoading]         = useState(true);
  const [selectedYear,    setSelectedYear]    = useState(new Date().getFullYear());
  const [mounted,         setMounted]         = useState(false);
  const starsRef = useRef<Star[]>([]);
  const partsRef = useRef<Particle[]>([]);

  /* ── cosmos ── */
  useEffect(() => {
    starsRef.current = Array.from({length:60},()=>({
      x:Math.random()*100,y:Math.random()*100,
      s:Math.random()*2+0.4,o:Math.random()*0.5+0.08,d:Math.random()*5+2,
    }));
    partsRef.current = Array.from({length:18},()=>({
      x:Math.random()*100,y:Math.random()*100+100,
      s:Math.random()*5+2,d:Math.random()*18+10,delay:Math.random()*8,
      color:PART_COLORS[Math.floor(Math.random()*PART_COLORS.length)],
    }));
    setMounted(true);
  }, []);

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    try {
      const [{ data: leads }, { data: cfg }] = await Promise.all([
        api.get<SolutionExpress[]>('/api/leads'),
        api.get<Settings>('/api/settings'),
      ]);
      setFiches(Array.isArray(leads)?leads:[]);
      if (cfg) setSettings(cfg);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const onVis = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchAll]);

  const realYear = new Date().getFullYear();
  const currYear = selectedYear;
  const prevYear = selectedYear - 1;

  const minYear = fiches.length > 0
    ? Math.min(...fiches.map(f=>getYear(f)))
    : realYear;

  const fichesCurr = useMemo(()=>fiches.filter(f=>getYear(f)===currYear),[fiches,currYear]);
  const fichesPrev = useMemo(()=>fiches.filter(f=>getYear(f)===prevYear),[fiches,prevYear]);

  const mCurr = useMemo(()=>calcMetrics(fichesCurr),[fichesCurr]);
  const mPrev = useMemo(()=>calcMetrics(fichesPrev),[fichesPrev]);

  const hasPrevData = mPrev.total > 0;
  const hasCurrData = mCurr.total > 0;

  /* ── meilleur mois ── */
  const bestMonth = (arr: SolutionExpress[]) => {
    let best = { idx:-1, val:0 };
    MONTHS_FR.forEach((_,idx)=>{
      const val = arr.filter(f=>f.status!=='installation_annulee'&&getMonth(f)===idx)
                     .reduce((s,f)=>s+(f.commissionTotale||0), 0);
      if(val>best.val) best={idx,val};
    });
    return best.idx>=0&&best.val>0?`${MONTHS_FR[best.idx]} · ${best.val.toFixed(0)} TND`:'—';
  };

  /* ── score global ── */
  const globalScore: number|null = mPrev.gained===0&&mCurr.gained===0 ? null
    : mPrev.gained===0 ? 100
    : Math.round(((mCurr.gained-mPrev.gained)/Math.abs(mPrev.gained))*100);
  const scoreColor = globalScore===null?'#8b8b9e':globalScore>0?'#12b76a':globalScore<0?'#ef4444':'#8b8b9e';
  const scoreEmoji = globalScore===null?'📊':globalScore>20?'🚀':globalScore>0?'📈':globalScore===0?'➡️':'📉';

  /* ── KPI list ── */
  const kpis = [
    { label:'Commissions gagnées',     Icon:Wallet,      color:'#12b76a', curr:mCurr.gained,   prev:mPrev.gained,   suffix:' TND' },
    { label:'Commissions payées',      Icon:CheckCircle, color:'#3b6cf8', curr:mCurr.paid,     prev:mPrev.paid,     suffix:' TND' },
    { label:'En attente',              Icon:Target,      color:'#f79009', curr:mCurr.pending,  prev:mPrev.pending,  suffix:' TND' },
    { label:'Installations réalisées', Icon:BarChart2,   color:'#a764f8', curr:mCurr.installe, prev:mPrev.installe, suffix:''     },
    { label:'Installations annulées',  Icon:XCircle,     color:'#ef4444', curr:mCurr.annulee,  prev:mPrev.annulee,  suffix:''     },
  ];

  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{position:'relative',minHeight:'100vh',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes glowPulse    { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes twinkle-star { 0%,100%{opacity:.08} 50%{opacity:.55} }
        @keyframes particle-rise{ from{transform:translateY(0);opacity:.4} to{transform:translateY(-100vh);opacity:0} }
      `}</style>

      {/* Cosmos vert/bleu */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(18,183,106,0.1) 0%,transparent 60%),radial-gradient(ellipse 60% 60% at 90% 60%,rgba(59,108,248,0.07) 0%,transparent 50%),#06060f',zIndex:0,pointerEvents:'none'}}/>
      {mounted&&starsRef.current.map((s,i)=>(
        <div key={i} style={{position:'fixed',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:'50%',background:'#fff',opacity:s.o,pointerEvents:'none',zIndex:0,animation:`twinkle-star ${s.d}s ease-in-out infinite`,animationDelay:`${i*0.08}s`}}/>
      ))}
      {mounted&&partsRef.current.map((p,i)=>(
        <div key={i} style={{position:'fixed',left:`${p.x}%`,bottom:`-${p.y}px`,width:p.s,height:p.s,borderRadius:'50%',background:p.color,opacity:0.4,pointerEvents:'none',zIndex:0,animation:`particle-rise ${p.d}s linear infinite`,animationDelay:`${p.delay}s`}}/>
      ))}

      <div style={{position:'relative',zIndex:1,padding:isMobile?'16px 12px 40px':'28px 32px 40px'}}>

        {/* ════════════════════════════════════════
            HEADER SE
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:22,background:'linear-gradient(135deg,#12b76a60,#3b6cf830,#a78bfa25)',marginBottom:24,animation:'fadeSlideUp 0.4s ease both'}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'20.5px',padding:isMobile?'20px 16px':'28px 32px',position:'relative',overflow:'hidden',backdropFilter:'blur(40px)'}}>
            <div style={{position:'absolute',top:-60,right:-40,width:240,height:240,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,108,248,0.13) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-40,left:-20,width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(18,183,106,0.10) 0%,transparent 70%)',pointerEvents:'none'}}/>

            <div style={{position:'relative',display:'flex',flexDirection:isMobile?'column':'row',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',gap:16}}>
              {/* Titre */}
              <div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:6}}>
                  <div style={{width:48,height:48,borderRadius:15,background:'linear-gradient(135deg,#12b76a,#3b6cf8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(18,183,106,0.45)',flexShrink:0}}>
                    <BarChart2 size={24} color="#fff"/>
                  </div>
                  <h1 style={{margin:0,fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#34d399)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                    Comparaison Annuelle
                  </h1>
                </div>
              </div>

              {/* Navigateur années */}
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,flexWrap:'wrap'}}>
                <button onClick={()=>setSelectedYear(y=>y-1)} disabled={selectedYear<=minYear}
                  style={{width:36,height:36,borderRadius:10,border:`1px solid ${selectedYear<=minYear?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.14)'}`,background:'transparent',color:selectedYear<=minYear?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.55)',cursor:selectedYear<=minYear?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'}}
                  onMouseEnter={e=>{if(selectedYear>minYear){e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='#fff';}}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=selectedYear<=minYear?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.55)';}}>
                  <ChevronLeft size={16}/>
                </button>

                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{padding:'7px 15px',borderRadius:12,background:'rgba(59,108,248,0.12)',border:'1px solid rgba(59,108,248,0.3)',textAlign:'center',minWidth:72}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.9)',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Précédent</div>
                    <div style={{fontSize:isMobile?17:20,fontWeight:900,color:'#3b6cf8',lineHeight:1}}>{prevYear}</div>
                  </div>
                  <div style={{fontSize:13,color:'#fff',fontWeight:700}}>vs</div>
                  <div style={{padding:'7px 15px',borderRadius:12,background:'rgba(18,183,106,0.12)',border:'1px solid rgba(18,183,106,0.3)',textAlign:'center',minWidth:72}}>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.9)',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Actuel</div>
                    <div style={{fontSize:isMobile?17:20,fontWeight:900,color:'#12b76a',lineHeight:1}}>{currYear}</div>
                    {selectedYear===realYear&&(
                      <div style={{fontSize:8,color:'#12b76a',fontWeight:700,marginTop:4,letterSpacing:0.3,opacity:0.8}}>En cours</div>
                    )}
                  </div>
                </div>

                <button onClick={()=>setSelectedYear(y=>y+1)} disabled={selectedYear>=realYear}
                  style={{width:36,height:36,borderRadius:10,border:`1px solid ${selectedYear>=realYear?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.14)'}`,background:'transparent',color:selectedYear>=realYear?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.55)',cursor:selectedYear>=realYear?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.18s'}}
                  onMouseEnter={e=>{if(selectedYear<realYear){e.currentTarget.style.background='rgba(255,255,255,0.07)';e.currentTarget.style.color='#fff';}}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=selectedYear>=realYear?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.55)';}}>
                  <ChevronRight size={16}/>
                </button>

                {selectedYear!==realYear&&(
                  <button onClick={()=>setSelectedYear(realYear)}
                    style={{padding:'6px 12px',borderRadius:9,border:'1px solid rgba(247,144,9,0.35)',background:'rgba(247,144,9,0.1)',color:'#f79009',cursor:'pointer',fontSize:11,fontWeight:700,transition:'all 0.18s',whiteSpace:'nowrap'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(247,144,9,0.2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='rgba(247,144,9,0.1)'}>
                    Aujourd&apos;hui
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bandeau première année */}
        {!hasPrevData&&(
          <div style={{padding:'1px',borderRadius:14,background:'linear-gradient(135deg,#f7900940,#f7900908)',marginBottom:24}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:13,padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:34,height:34,borderRadius:9,background:'rgba(247,144,9,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Calendar size={15} color="#f79009"/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#f79009'}}>Première année de référence</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.75)',marginTop:2}}>
                  Aucune donnée pour {prevYear}. La comparaison complète sera disponible en {currYear+1}.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            LOADING
            ════════════════════════════════════════ */}
        {loading?(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'80px 0',flexDirection:'column',gap:16}}>
            <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(18,183,106,0.15)',borderTopColor:'#12b76a',animation:'spin 0.9s linear infinite'}}/>
          </div>
        ):(
          <>
            {/* ════════════════════════════════════════
                4 KPI CARDS
                ════════════════════════════════════════ */}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(5,1fr)',gap:14,marginBottom:24}}>
              {kpis.map(({label,Icon,color,curr,prev,suffix},i)=>(
                <div key={i} style={{padding:'1.5px',borderRadius:18,background:`linear-gradient(135deg,${color}45,${color}15)`,animation:`fadeSlideUp 0.4s ${0.05+i*0.05}s ease both`}}>
                  <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'14px 12px':'18px 20px',backdropFilter:'blur(20px)',height:'100%',display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:10,background:`${color}1a`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Icon size={15} color={color}/>
                    </div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.75)',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
                    <div style={{fontSize:isMobile?18:22,fontWeight:900,color,lineHeight:1}}>
                      <AnimatedNumber value={curr} decimals={0} color={color} suffix={suffix}/>
                    </div>
                    <div style={{paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:11,color:'rgba(255,255,255,0.65)',fontWeight:600}}>
                      {prevYear} : <span style={{color:prev>0?color:'rgba(255,255,255,0.7)',fontWeight:700}}>{prev.toFixed(0)}{suffix}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ════════════════════════════════════════
                INSIGHTS CÔTE À CÔTE
                ════════════════════════════════════════ */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:isMobile?8:16,marginBottom:20}}>
              {([
                { year:prevYear, m:mPrev, color:'#3b6cf8', arr:fichesPrev },
                { year:currYear, m:mCurr, color:'#12b76a', arr:fichesCurr },
              ] as const).map(({year,m,color,arr})=>{
                const row = (label:string, value:string|number, c:string) => (
                  <div style={{display:'flex',flexDirection:'column',padding:isMobile?'5px 7px':'9px 12px',borderRadius:8,background:`${c}08`,border:`1px solid ${c}25`,gap:1}}>
                    <span style={{fontSize:isMobile?9:11,color:'rgba(255,255,255,0.55)',fontWeight:600,lineHeight:1.2}}>{label}</span>
                    <span style={{fontSize:isMobile?11:13,fontWeight:800,color:c,lineHeight:1}}>{typeof value==='number'?value.toFixed(0):value}</span>
                  </div>
                );
                const sep = (label:string) => (
                  <div style={{fontSize:isMobile?8:10,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:1,marginTop:isMobile?6:10,marginBottom:2,paddingLeft:2}}>{label}</div>
                );
                return (
                  <div key={year} style={{padding:'1.5px',borderRadius:18,background:`linear-gradient(135deg,${color}40,${color}12)`}}>
                    <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'10px 8px':'22px',backdropFilter:'blur(20px)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:isMobile?5:8,marginBottom:isMobile?8:16}}>
                        <div style={{width:isMobile?7:9,height:isMobile?7:9,borderRadius:'50%',background:color,boxShadow:`0 0 10px ${color}99`,animation:'glowPulse 2s ease infinite'}}/>
                        <div style={{fontSize:isMobile?13:15,fontWeight:800,color}}>{year}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:isMobile?4:6}}>
                        {sep('Leads')}
                        {row('Total fiches',          m.total,                                                              '#a78bfa')}
                        {row('Installations',          m.installe,                                                           '#12b76a')}
                        {row('Installations annulées', m.annulee,                                                            '#ef4444')}
                        {row('Taux d\'installation',   m.total>0?`${Math.round((m.installe/m.total)*100)}%`:'0%',           '#22c55e')}
                        {sep('Commissions')}
                        {row('Total commissions',      m.gained>0?`${m.gained.toFixed(0)} TND`:'0 TND',                    '#12b76a')}
                        {row('Commissions payées',     m.paid>0?`${m.paid.toFixed(0)} TND`:'0 TND',                        '#3b6cf8')}
                        {row('En attente',             m.pending>0?`${m.pending.toFixed(0)} TND`:'0 TND',                  '#f79009')}
                        {row('Taux de paiement',       `${m.payRate}%`,                                                     '#38bdf8')}
                        {(()=>{const obj=settings.objectifAnnuel?.[String(year)]??0;const pct=obj>0?Math.round((m.gained/obj)*100):0;return(<>{row('Objectif',obj>0?`${obj.toFixed(0)} TND`:'—','#a78bfa')}{row('Atteinte objectif',obj>0?`${pct}%`:'—',pct>=100?'#12b76a':pct>=50?'#f79009':'#ef4444')}</>);})()}
                        {sep('Stats')}
                        {row('Commission Max',         m.commMax>0?`${m.commMax.toFixed(0)} TND`:'0 TND',                  '#f79009')}
                        {row('Commission Min',         m.commMin>0?`${m.commMin.toFixed(0)} TND`:'0 TND',                  '#fb7185')}
                        {row('Meilleur mois',          bestMonth(arr),                                                      '#facc15')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ════════════════════════════════════════
                SCORE GLOBAL
                ════════════════════════════════════════ */}
            {hasPrevData&&hasCurrData&&(
              <div style={{padding:'1.5px',borderRadius:18,background:`linear-gradient(135deg,${scoreColor}55,${scoreColor}15)`}}>
                <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'28px 20px':'40px 32px',textAlign:'center',position:'relative',overflow:'hidden',backdropFilter:'blur(20px)'}}>
                  <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:320,height:320,borderRadius:'50%',background:`radial-gradient(circle,${scoreColor}12 0%,transparent 70%)`,pointerEvents:'none'}}/>
                  <div style={{position:'relative'}}>
                    <div style={{fontSize:44,marginBottom:12}}>{scoreEmoji}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.7)',fontWeight:700,textTransform:'uppercase',letterSpacing:2,marginBottom:10}}>Performance globale</div>
                    <div style={{fontSize:isMobile?44:60,fontWeight:900,color:scoreColor,lineHeight:1,marginBottom:12,textShadow:`0 0 40px ${scoreColor}60`}}>
                      {globalScore===null?'—':`${globalScore>0?'+':''}${globalScore}%`}
                    </div>
                    <div style={{fontSize:13,color:'rgba(255,255,255,0.75)',fontWeight:700}}>
                      {globalScore===null?'Aucune donnée de référence':globalScore>20?'Excellente année !':globalScore>0?'Bonne progression':globalScore===0?'Stable par rapport à l\'année précédente':'En dessous de l\'année précédente'}
                    </div>
                    <div style={{marginTop:16,fontSize:12,color:'rgba(255,255,255,0.65)'}}>
                      de croissance en commissions entre {prevYear} et {currYear}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
