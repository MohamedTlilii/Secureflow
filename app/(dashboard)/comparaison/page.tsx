'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2,
  Calendar, Wallet, CheckCircle, Target, XCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrMsg } from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, MOIS_LABELS } from '@/types';

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


/* ─── métriques ───────────────────────────────────────────── */
interface Metrics {
  gained:number; paid:number; pending:number; installe:number; annulee:number;
  commMax:number; commMin:number; payRate:number; total:number;
}



/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════ */
export default function ComparaisonPage() {
  const isMobile = useIsMobile();

  interface CompStats {
    metricsA: Metrics; metricsB: Metrics;
    currYear: number; prevYear: number;
    bestMonthCurr: number; bestMonthCurrVal: number;
    bestMonthPrev: number; bestMonthPrevVal: number;
    globalScore: number | null; monthlyChartData: {name:string;curr:number;prev:number}[]; allYears: number[]; minYear: number;
  }

  const [settings,        setSettings]        = useState<Settings>(DEFAULT_SETTINGS);
  const [loading,         setLoading]         = useState(true);
  const [selectedYear,    setSelectedYear]    = useState(new Date().getFullYear());
  const [compStats,       setCompStats]       = useState<CompStats | null>(null);
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

  /* ── fetch settings ── */
  useEffect(() => {
    api.get<Settings>('/api/settings').then(r => { if (r.data) setSettings(r.data); }).catch(() => {});
  }, []);

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CompStats>('/api/comparaison/stats', {
        params: { annee: selectedYear },
      });
      setCompStats(data);
    } catch (e) { toast.error(apiErrMsg(e, 'Erreur chargement')); }
    finally { setLoading(false); }
  }, [selectedYear]);

  useEffect(() => {
    fetchStats();
    const onVis = () => { if (!document.hidden) fetchStats(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchStats]);

  const realYear = new Date().getFullYear();
  const currYear = selectedYear;
  const prevYear = selectedYear - 1;

  const mCurr = compStats?.metricsA ?? { gained:0, paid:0, pending:0, installe:0, annulee:0, commMax:0, commMin:0, payRate:0, total:0 };
  const mPrev = compStats?.metricsB ?? { gained:0, paid:0, pending:0, installe:0, annulee:0, commMax:0, commMin:0, payRate:0, total:0 };
  const minYear    = compStats?.minYear ?? realYear;
  const globalScore = compStats?.globalScore ?? null;
  const hasPrevData = mPrev.total > 0;
  const hasCurrData = mCurr.total > 0;

  const bestMonthStr = (idx: number, val: number) =>
    idx >= 0 && val > 0 ? `${MOIS_LABELS[idx]} · ${val.toFixed(0)} TND` : '—';

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
                  <div style={{width:48,height:48,borderRadius:15,background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(59,130,246,0.45)',flexShrink:0}}>
                    <BarChart2 size={24} color="#fff"/>
                  </div>
                  <h1 style={{margin:0,fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#3b82f6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
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
                    <div style={{fontSize:9,color:'#fff',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Précédent</div>
                    <div style={{fontSize:isMobile?17:20,fontWeight:900,color:'#3b6cf8',lineHeight:1}}>{prevYear}</div>
                  </div>
                  <div style={{fontSize:13,color:'#fff',fontWeight:700}}>vs</div>
                  <div style={{padding:'7px 15px',borderRadius:12,background:'rgba(18,183,106,0.12)',border:'1px solid rgba(18,183,106,0.3)',textAlign:'center',minWidth:72}}>
                    <div style={{fontSize:9,color:'#fff',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Actuel</div>
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
                <div style={{fontSize:12,color:'#fff',marginTop:2}}>
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
            <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(59,130,246,0.15)',borderTopColor:'#3b82f6',animation:'spin 0.9s linear infinite'}}/>
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
                    <div style={{fontSize:10,color:'#fff',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
                    <div style={{fontSize:isMobile?18:22,fontWeight:900,color,lineHeight:1}}>
                      <AnimatedNumber value={curr} decimals={0} color={color} suffix={suffix}/>
                    </div>
                    <div style={{paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)',fontSize:11,color:'#fff',fontWeight:600}}>
                      {prevYear} : <span style={{color:prev>0?color:'#fff',fontWeight:700}}>{prev.toFixed(0)}{suffix}</span>
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
                { year:prevYear, m:mPrev, color:'#3b6cf8', bestMth:bestMonthStr(compStats?.bestMonthPrev??-1, compStats?.bestMonthPrevVal??0) },
                { year:currYear, m:mCurr, color:'#12b76a', bestMth:bestMonthStr(compStats?.bestMonthCurr??-1, compStats?.bestMonthCurrVal??0) },
              ] as const).map(({year,m,color,bestMth})=>{
                const row = (label:string, value:string|number, c:string) => (
                  <div style={{display:'flex',flexDirection:'column',padding:isMobile?'5px 7px':'9px 12px',borderRadius:8,background:`${c}08`,border:`1px solid ${c}25`,gap:1}}>
                    <span style={{fontSize:isMobile?9:11,color:'#fff',fontWeight:600,lineHeight:1.2}}>{label}</span>
                    <span style={{fontSize:isMobile?11:13,fontWeight:800,color:c,lineHeight:1}}>{typeof value==='number'?value.toFixed(0):value}</span>
                  </div>
                );
                const sep = (label:string) => (
                  <div style={{fontSize:isMobile?8:10,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:1,marginTop:isMobile?6:10,marginBottom:2,paddingLeft:2}}>{label}</div>
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
                        {row('Meilleur mois',          bestMth,                                                             '#facc15')}
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
                    <div style={{fontSize:11,color:'#fff',fontWeight:700,textTransform:'uppercase',letterSpacing:2,marginBottom:10}}>Performance globale</div>
                    <div style={{fontSize:isMobile?44:60,fontWeight:900,color:scoreColor,lineHeight:1,marginBottom:12,textShadow:`0 0 40px ${scoreColor}60`}}>
                      {globalScore===null?'—':`${globalScore>0?'+':''}${globalScore}%`}
                    </div>
                    <div style={{fontSize:13,color:'#fff',fontWeight:700}}>
                      {globalScore===null?'Aucune donnée de référence':globalScore>20?'Excellente année !':globalScore>0?'Bonne progression':globalScore===0?'Stable par rapport à l\'année précédente':'En dessous de l\'année précédente'}
                    </div>
                    <div style={{marginTop:16,fontSize:12,color:'#fff'}}>
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
