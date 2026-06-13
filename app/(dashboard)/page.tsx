'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users, CheckCircle, AlertCircle, Clock, XCircle,
  MapPin, Zap, Building2, Target, Star, Phone, Home,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { DEFAULT_SETTINGS, VALID_STATUTS, MOIS_FULL, STATUS_COLOR as STATUS_CLR, STATUS_LABEL as STATUS_LBL } from '@/types';

const LEAD_PALETTE = ['#12b76a','#0077b5','#f79009','#a764f8','#f04438','#61DAFB','#8b8b9e'];
const PART_COLORS  = ['#12b76a','#3b6cf8','#61DAFB','#a78bfa','#34d399'];
const AV_COLORS    = ['#3b6cf8','#12b76a','#f79009','#be123c','#a764f8'];

const getDateObj = (f: SolutionExpress) => new Date(f.dateVente ?? f.createdAt);

const topN = (arr: SolutionExpress[], key: keyof SolutionExpress): [string, number][] => {
  const m: Record<string, number> = {};
  arr.forEach(f => { const v = f[key] as string; if (v) m[v] = (m[v] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

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

/* ─── ProgressBar ─────────────────────────────────────────── */
function ProgressBar({ value, max, color }: { value:number; max:number; color?:string }) {
  const pct = max > 0 ? Math.round((value/max)*100) : 0;
  return (
    <div style={{flex:1,height:5,borderRadius:3,background:'rgba(255,255,255,0.07)',overflow:'hidden'}}>
      <div style={{height:'100%',borderRadius:3,background:color||'#12b76a',width:`${pct}%`,transition:'width 0.8s ease'}}/>
    </div>
  );
}

/* ─── ScoreRing ───────────────────────────────────────────── */
function ScoreRing({ value, max, color, label }: { value:number; max:number; color:string; label:string }) {
  const [animated, setAnimated] = useState(0);
  const pct  = max > 0 ? value / max : 0;
  const r    = 36;
  const circ = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setAnimated(pct), 200); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
      <div style={{position:'relative',width:90,height:90}}>
        <svg width={90} height={90} style={{transform:'rotate(-90deg)'}}>
          <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={7}/>
          <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${circ*animated} ${circ}`} strokeLinecap="round"
            style={{transition:'stroke-dasharray 1s ease'}}/>
        </svg>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
          <div style={{fontSize:18,fontWeight:800,color,lineHeight:1}}>{value}</div>
          <div style={{fontSize:8,color:'#fff',fontWeight:700,textTransform:'uppercase',lineHeight:1.2}}>{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const isMobile = useIsMobile();

  const [seFiches,     setSeFiches]     = useState<SolutionExpress[]>([]);
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const [anneeGlobal,  setAnneeGlobal]  = useState<string>(String(new Date().getFullYear()));
  const [dashMois,     setDashMois]     = useState<string>('tout');
  const [chartFiltre,  setChartFiltre]  = useState<'total'|'installe'|'encours'|'annule'|'paye'>('total');
  const [loading,      setLoading]      = useState(true);
  const [mounted,      setMounted]      = useState(false);
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
      const [f, s] = await Promise.all([
        api.get<SolutionExpress[]>('/api/leads'),
        api.get<Settings>('/api/settings'),
      ]);
      setSeFiches(Array.isArray(f.data)?f.data:[]);
      setSettings(s.data??DEFAULT_SETTINGS);
    } catch { toast.error('Impossible de charger les données'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const onVis = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchAll]);

  /* ── lookups ── */
  const leadTypeLbl = useMemo(() =>
    Object.fromEntries(settings.typeLead.map(t=>[t.key,t.label])),
    [settings.typeLead]);
  const leadTypeClr = useMemo(() => {
    const m: Record<string,string> = {};
    settings.typeLead.forEach((t,i) => { m[t.key] = LEAD_PALETTE[i%LEAD_PALETTE.length]; });
    return m;
  }, [settings.typeLead]);

  /* ── filter ── */
  const fiches = useMemo(() => {
    let r = anneeGlobal === 'tout' ? seFiches : seFiches.filter(f => String(getDateObj(f).getFullYear()) === anneeGlobal);
    if (anneeGlobal !== 'tout' && dashMois !== 'tout') r = r.filter(f => getDateObj(f).getMonth() === Number(dashMois));
    return r;
  }, [seFiches, anneeGlobal, dashMois]);

  const annees = useMemo(() => {
    const cur = new Date().getFullYear();
    return [...new Set([cur, ...seFiches.map(f => getDateObj(f).getFullYear())])].sort((a, b) => b - a);
  }, [seFiches]);

  /* ── statuts ── */
  const counts = useMemo(() =>
    Object.fromEntries(VALID_STATUTS.map(s => [s, fiches.filter(f => f.status === s).length])) as Record<StatusFiche, number>,
    [fiches]);
  const totalSE  = fiches.length;
  const b2b      = fiches.filter(f=>f.typeClient==='b2b').length;
  const b2c      = fiches.filter(f=>f.typeClient==='b2c').length;
  const won      = counts.installe;
  const convRate = totalSE>0?Math.round((won/totalSE)*100):0;

  /* ── top lists ── */
  const byCity       = useMemo(() => topN(fiches, 'ville'),    [fiches]);
  const byLeadType   = useMemo(() => topN(fiches, 'leadType'), [fiches]);
  const commerceLbl  = useMemo(() =>
    Object.fromEntries(settings.typeCommerce.map(t=>[t.key,t.label])),
    [settings.typeCommerce]);
  const byCommerce   = useMemo(()=>{
    const m: Record<string,number>={};
    fiches.filter(f=>f.typeClient==='b2b'&&f.typeCommerce&&f.typeCommerce!=='autre').forEach(f=>{m[f.typeCommerce]=(m[f.typeCommerce]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches]);
  const byCommerceB2C= useMemo(()=>{
    const m: Record<string,number>={};
    fiches.filter(f=>f.typeClient==='b2c'&&f.typeCommerce&&f.typeCommerce!=='autre').forEach(f=>{m[f.typeCommerce]=(m[f.typeCommerce]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches]);
  /* find matching service by id OR label */
  const findSvc = useCallback((p: string) =>
    settings.services.find(x=>x.id===p) ?? settings.services.find(x=>x.label===p),
    [settings.services]);

  const byProduit = useMemo(()=>{
    const m: Record<string,number>={};
    fiches.forEach(f=>f.produits.forEach(p=>{
      const svc=findSvc(p);
      if(!svc) return;
      m[svc.id]=(m[svc.id]||0)+1;
    }));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches, findSvc]);


  /* ── récents ── */
  const recent = useMemo(()=>[...fiches].sort((a,b)=>new Date(b.dateVente??b.createdAt).getTime()-new Date(a.dateVente??a.createdAt).getTime()).slice(0,6),[fiches]);

  /* ── évolution (par année ou par mois) ── */
  const evolutionData = useMemo(()=>{
    const fn=(f:SolutionExpress)=>
      chartFiltre==='installe' ? f.status==='installe' :
      chartFiltre==='encours'  ? f.status==='installation_en_cours' :
      chartFiltre==='annule'   ? f.status==='installation_annulee' :
      chartFiltre==='paye'     ? !!f.commissionPayee&&f.status!=='installation_annulee' :
      true;
    if(anneeGlobal==='tout'){
      return annees.map(yr=>{
        const yf=seFiches.filter(f=>getDateObj(f).getFullYear()===yr);
        return {name:String(yr),value:yf.filter(fn).length,installes:chartFiltre==='total'?yf.filter(f=>f.status==='installe').length:0};
      });
    }
    const yf=seFiches.filter(f=>String(getDateObj(f).getFullYear())===anneeGlobal);
    const moisList = dashMois!=='tout'
      ? [Number(dashMois)]
      : MOIS_FULL.map((_,i)=>i);
    return moisList.map(i=>{
      const mf=yf.filter(f=>getDateObj(f).getMonth()===i);
      return {name:MOIS_FULL[i].slice(0,3),value:mf.filter(fn).length,installes:chartFiltre==='total'?mf.filter(f=>f.status==='installe').length:0};
    });
  },[seFiches,anneeGlobal,annees,dashMois,chartFiltre]);


  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{position:'relative',minHeight:'100vh',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:.08} 50%{opacity:.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:.4} to{transform:translateY(-100vh);opacity:0} }
        .dash-row:hover{background:rgba(255,255,255,0.03)!important;}
      `}</style>

      {/* Cosmos */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(18,183,106,0.1) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 90% 50%,rgba(59,108,248,0.07) 0%,transparent 50%),#06060f',zIndex:0,pointerEvents:'none'}}/>
      {mounted&&starsRef.current.map((s,i)=>(
        <div key={i} style={{position:'fixed',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:'50%',background:'#fff',opacity:s.o,pointerEvents:'none',zIndex:0,animation:`twinkle-star ${s.d}s ease-in-out infinite`,animationDelay:`${i*0.08}s`}}/>
      ))}
      {mounted&&partsRef.current.map((p,i)=>(
        <div key={i} style={{position:'fixed',left:`${p.x}%`,bottom:`-${p.y}px`,width:p.s,height:p.s,borderRadius:'50%',background:p.color,opacity:0.4,pointerEvents:'none',zIndex:0,animation:`particle-rise ${p.d}s linear infinite`,animationDelay:`${p.delay}s`}}/>
      ))}

      <div style={{position:'relative',zIndex:1,padding:isMobile?'16px 12px 40px':'28px 32px 40px'}}>

        {/* ════════ HEADER (SE style) ════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:22,background:'linear-gradient(135deg,#12b76a60,#61DAFB30,#a78bfa25)',marginBottom:24,animation:'fadeSlideUp 0.4s ease both'}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'20.5px',padding:isMobile?'20px 16px':'28px 32px',backdropFilter:'blur(40px)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-80,left:-60,width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(18,183,106,0.18) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:-20,right:-40,width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(97,218,251,0.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-60,right:100,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(167,139,250,0.10) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'relative',zIndex:1}}>

              {/* Titre + filtres */}
              <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',flexDirection:isMobile?'column':'row',gap:isMobile?12:0,marginBottom:22}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#12b76a,#61DAFB)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(18,183,106,0.5)',flexShrink:0}}>
                    <Target size={26} color="#030a16"/>
                  </div>
                  <div>
                    <h1 style={{margin:0,fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#12b76a)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                      Dashboard
                    </h1>
                    <p style={{color:'#12b76a',fontSize:13,margin:0,marginTop:2,fontWeight:700}}>
                      {totalSE} lead{totalSE!==1?'s':''} · {anneeGlobal==='tout'?'Toutes les années':anneeGlobal}
                    </p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {!isMobile&&(
                    <div style={{fontSize:12,color:'#fff',background:'rgba(255,255,255,0.05)',padding:'6px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',whiteSpace:'nowrap',textTransform:'capitalize'}}>
                      {new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                    </div>
                  )}
                  <select value={anneeGlobal} onChange={e=>{setAnneeGlobal(e.target.value);setDashMois('tout');}}
                    style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                    <option value="tout">Toutes les années</option>
                    {annees.map(y=><option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  {anneeGlobal!=='tout'&&(
                    <select value={dashMois} onChange={e=>setDashMois(e.target.value)}
                      style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                      <option value="tout">Tous les mois</option>
                      {MOIS_FULL.map((m,i)=><option key={i} value={String(i)}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Taux d'installation + ScoreRings */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexDirection:isMobile?'column':'row',gap:20}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:isMobile?18:24,fontWeight:800,color:'#c0c0e0',marginBottom:4}}>
                    Taux d&apos;installation{' '}
                    <span style={{color:'#12b76a'}}><AnimatedNumber value={convRate} decimals={0} suffix="%" color="#12b76a"/></span>
                  </div>
                  <div style={{fontSize:12,color:'#fff',marginBottom:12}}>
                    <span style={{color:'#12b76a',fontWeight:700}}>{won}</span>
                    {' '}installé{won!==1?'s':''} sur{' '}
                    <span style={{color:'#12b76a',fontWeight:700}}>{totalSE}</span>
                    {' '}lead{totalSE!==1?'s':''}
                  </div>
                  <div style={{height:22,borderRadius:6,background:'rgba(255,255,255,0.08)',position:'relative'}}>
                    <div style={{height:'100%',borderRadius:6,background:'linear-gradient(90deg,#3b6cf8,#12b76a)',width:`${convRate}%`,transition:'width 1.2s ease',boxShadow:'0 0 12px rgba(18,183,106,0.4)',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:6,overflow:'hidden'}}>
                      {convRate>8&&<span style={{fontSize:10,fontWeight:700,color:'#fff',whiteSpace:'nowrap'}}>{convRate}%</span>}
                    </div>
                    <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,fontWeight:700,color:'#fff'}}>100%</span>
                  </div>
                </div>
                {!isMobile&&(
                  <div style={{display:'flex',gap:24,flexShrink:0}}>
                    <ScoreRing value={counts.proposal||0}                max={totalSE||1} color="#a764f8" label="Soumission"/>
                    <ScoreRing value={counts.installation_en_cours||0}   max={totalSE||1} color="#f97316" label="En cours"/>
                    <ScoreRing value={won}                               max={totalSE||1} color="#22c55e" label="Installé"/>
                    <ScoreRing value={counts.installation_annulee||0}    max={totalSE||1} color="#be123c" label="Annulée"/>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* ════════ LOADING ════════════════════════════════════════ */}
        {loading?(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'80px 0',flexDirection:'column',gap:16}}>
            <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(18,183,106,0.15)',borderTopColor:'#12b76a',animation:'spin 0.9s linear infinite'}}/>
          </div>
        ):(
          <>
          {/* ════════ ÉVOLUTION MENSUELLE ══════════════════════════ */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#3b6cf840,#12b76a20)',marginBottom:24,animation:'fadeSlideUp 0.4s 0.15s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px 26px',backdropFilter:'blur(20px)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:isMobile?'flex-start':'center',flexDirection:isMobile?'column':'row',gap:isMobile?10:0,marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>
                  Évolution {anneeGlobal==='tout'?'par année':`mensuelle ${anneeGlobal}`}
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {([
                    {key:'total'   as const,label:'Total',   color:'#3b6cf8'},
                    {key:'installe'as const,label:'Installé',color:'#22c55e'},
                    {key:'encours' as const,label:'En cours',color:'#f97316'},
                    {key:'annule'  as const,label:'Annulé',  color:'#be123c'},
                    {key:'paye'    as const,label:'Payé',    color:'#3b6cf8'},
                  ]).map(f=>(
                    <button key={f.key} onClick={()=>setChartFiltre(f.key)}
                      style={{fontSize:10,padding:'4px 10px',borderRadius:7,border:`1px solid ${chartFiltre===f.key?f.color:'#fff'}`,background:chartFiltre===f.key?`${f.color}25`:'transparent',color:chartFiltre===f.key?f.color:'#fff',cursor:'pointer',fontWeight:700,transition:'all 0.2s'}}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={isMobile?120:160}>
                <BarChart data={evolutionData} barSize={isMobile?8:14} barGap={2} margin={{top:16,right:0,left:-20,bottom:0}}>
                  <XAxis dataKey="name" tick={{fill:'#fff',fontSize:isMobile?8:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#fff',fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{background:'rgba(2,8,16,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:12}} cursor={{fill:'rgba(255,255,255,0.04)'}}
                    formatter={(v:unknown,n:string)=>[v as number,n]}/>
                  {chartFiltre==='total'?(
                    <>
                      <Bar dataKey="value" name="Leads" fill="#3b6cf8" radius={[3,3,0,0]}/>
                      <Bar dataKey="installes" name="Installés" fill="#12b76a" radius={[3,3,0,0]}/>
                    </>
                  ):(
                    <Bar dataKey="value"
                      name={chartFiltre==='installe'?'Installé':chartFiltre==='encours'?'En cours':chartFiltre==='annule'?'Annulé':'Payé'}
                      fill={chartFiltre==='installe'?'#22c55e':chartFiltre==='encours'?'#f97316':chartFiltre==='annule'?'#be123c':'#12b76a'}
                      radius={[3,3,0,0]}/>
                  )}
                </BarChart>
              </ResponsiveContainer>
              {chartFiltre==='total'&&(
                <div style={{display:'flex',gap:14,marginTop:6,justifyContent:'flex-end'}}>
                  <span style={{fontSize:11,color:'#3b6cf8',fontWeight:700}}>● Leads</span>
                  <span style={{fontSize:11,color:'#12b76a',fontWeight:700}}>● Installés</span>
                </div>
              )}
            </div>
          </div>

          {/* ════════ TOTAL FICHES (pleine largeur) ═══════════════ */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#06b6d470,#06b6d425)',marginBottom:14,animation:'fadeSlideUp 0.4s 0.05s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px 18px':'20px 26px',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div style={{display:'flex',alignItems:'center',gap:18}}>
                <div style={{width:52,height:52,borderRadius:15,background:'rgba(6,182,212,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 22px rgba(6,182,212,0.25)'}}>
                  <Users size={24} color="#06b6d4"/>
                </div>
                <div>
                  <div style={{fontSize:10,color:'#06b6d4',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:4}}>Total leads</div>
                  <div style={{fontSize:isMobile?28:40,fontWeight:900,color:'#06b6d4',lineHeight:1}}>
                    <AnimatedNumber value={totalSE} decimals={0} color="#06b6d4"/>
                  </div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:isMobile?18:28}}>
                {[{val:b2b,label:'B2B',c:'#06b6d4',Icon:Building2},{val:b2c,label:'B2C',c:'#12b76a',Icon:Home}].map(({val,label,c,Icon})=>(
                  <div key={label} style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{width:30,height:30,borderRadius:9,background:`${c}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Icon size={14} color={c}/>
                    </div>
                    <div>
                      <div style={{fontSize:isMobile?18:22,fontWeight:900,color:c,lineHeight:1}}>{val}</div>
                      <div style={{fontSize:11,color:c,fontWeight:700}}>{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ════════ 6 STATUTS ═══════════════════════════════════ */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:isMobile?10:14,marginBottom:24}}>
            {([
              {label:'Nouveau',               value:counts.new||0,                  sub:'nouvelles fiches',       Icon:Star,        s:'new'                    },
              {label:'Contacté',              value:counts.contacted||0,            sub:'clients contactés',      Icon:Phone,       s:'contacted'              },
              {label:'Soumissions',           value:counts.proposal||0,             sub:'soumissions envoyées',   Icon:Clock,       s:'proposal'               },
              {label:'Installation en cours', value:counts.installation_en_cours||0,sub:'installations en cours', Icon:AlertCircle, s:'installation_en_cours'  },
              {label:'Installés',             value:won,                            sub:'installations réussies', Icon:CheckCircle, s:'installe'               },
              {label:'Annulées',              value:counts.installation_annulee||0, sub:'installations annulées', Icon:XCircle,     s:'installation_annulee'   },
            ] as {label:string;value:number;sub:string;Icon:LucideIcon;s:StatusFiche}[]).map((card,i)=>{
              const color = STATUS_CLR[card.s as StatusFiche];
              return (
                <div key={card.s} style={{padding:'1.5px',borderRadius:16,background:`linear-gradient(135deg,${color}65,${color}22)`,animation:`fadeSlideUp 0.4s ${0.05+i*0.06}s ease both`}}>
                  <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'14.5px',padding:isMobile?'14px 14px':'18px 20px',height:'100%',backdropFilter:'blur(20px)',transition:'transform 0.2s,box-shadow 0.2s'}}
                    onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 32px ${color}25`; }}
                    onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontSize:10,color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>{card.label}</div>
                        <div style={{fontSize:isMobile?24:32,fontWeight:900,color,lineHeight:1}}>
                          <AnimatedNumber value={card.value} decimals={0} color={color}/>
                        </div>
                        <div style={{fontSize:10,color,marginTop:5,fontWeight:700}}>{card.sub}</div>
                      </div>
                      <div style={{width:38,height:38,borderRadius:11,background:`${color}20`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 0 18px ${color}30`}}>
                        <card.Icon size={18} color={color}/>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ════════ PRODUITS D'INTÉRÊT ════════════════════════════ */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#f7900940,#12b76a20)',marginBottom:20}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Produits</div>
                  <Zap size={14} color="#f79009"/>
                </div>
                {byProduit.length?(
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {byProduit.map(([id,count])=>{
                      const svc   = settings.services.find(x=>x.id===id);
                      const label = svc?.label || id.replace(/_/g,' ').replace(/^\w/, c=>c.toUpperCase());
                      const color = svc?.color||'#8b8b9e';
                      return (
                        <div key={id} style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:30,height:30,borderRadius:8,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <Zap size={13} color={color}/>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4,gap:8}}>
                              <span style={{fontSize:13,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</span>
                              <span style={{fontSize:13,fontWeight:700,color,flexShrink:0}}>{count}</span>
                            </div>
                            <ProgressBar value={count} max={totalSE} color={color}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ):<div style={{color:'#fff',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun produit</div>}
              </div>
            </div>

          {/* ════════ TYPES DE LEAD + TOP VILLES ════════════════ */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,marginBottom:20}}>
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a40,#f7900920)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Types de leads</div>
                  <Building2 size={14} color="#12b76a"/>
                </div>
                {byLeadType.length?(
                  <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:260,overflowY:'auto'}}>
                    {byLeadType.map(([k, count])=>{
                      const color=leadTypeClr[k]||'#8b8b9e';
                      return (
                        <div key={k} style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0,boxShadow:`0 0 6px ${color}80`}}/>
                          <span style={{flex:1,fontSize:13,color:'#fff'}}>{leadTypeLbl[k]||k}</span>
                          <span style={{fontSize:13,fontWeight:700,color}}>{count}</span>
                          <ProgressBar value={count} max={totalSE} color={color}/>
                        </div>
                      );
                    })}
                  </div>
                ):<div style={{color:'#fff',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun type</div>}
              </div>
            </div>

            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#61DAFB40,#a78bfa20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Villes</div>
                  <MapPin size={14} color="#61DAFB"/>
                </div>
                {byCity.length?(
                  <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:260,overflowY:'auto'}}>
                    {byCity.map(([ville,count],i)=>(
                      <div key={ville} style={{display:'flex',alignItems:'center',gap:12,transition:'transform 0.15s'}}
                        onMouseEnter={e=>e.currentTarget.style.transform='translateX(3px)'}
                        onMouseLeave={e=>e.currentTarget.style.transform=''}>
                        <div style={{width:22,height:22,borderRadius:6,background:'rgba(97,218,251,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#61DAFB',flexShrink:0}}>{i+1}</div>
                        <span style={{flex:1,fontSize:13,color:'#fff'}}>{ville}</span>
                        <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{count}</span>
                        <ProgressBar value={count} max={totalSE} color="#61DAFB"/>
                      </div>
                    ))}
                  </div>
                ):<div style={{color:'#fff',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucune ville</div>}
              </div>
            </div>
          </div>



          {/* ════════ TYPES DE COMMERCE B2B ═══════════════════════ */}
          {byCommerce.length>0&&(
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#f7900940,#a78bfa20)',marginBottom:20}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#f79009'}}>B2B</div>
                  <Target size={14} color="#f79009"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                  {byCommerce.map(([k,count],i)=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'rgba(247,144,9,0.06)',border:'1px solid rgba(247,144,9,0.12)',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(247,144,9,0.12)';e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(247,144,9,0.06)';e.currentTarget.style.transform='';}}>
                      <div style={{width:26,height:26,borderRadius:7,background:'rgba(247,144,9,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#f79009',flexShrink:0}}>{i+1}</div>
                      <span style={{flex:1,fontSize:13,color:'#fff',lineHeight:1.3}}>{commerceLbl[k]||k}</span>
                      <span style={{fontSize:15,fontWeight:700,color:'#f79009',flexShrink:0}}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════ TYPES DE COMMERCE B2C ═══════════════════════ */}
          {byCommerceB2C.length>0&&(
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a40,#61DAFB20)',marginBottom:20}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#12b76a'}}>B2C</div>
                  <Target size={14} color="#12b76a"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                  {byCommerceB2C.map(([k,count],i)=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'rgba(18,183,106,0.06)',border:'1px solid rgba(18,183,106,0.12)',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(18,183,106,0.12)';e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(18,183,106,0.06)';e.currentTarget.style.transform='';}}>
                      <div style={{width:26,height:26,borderRadius:7,background:'rgba(18,183,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#12b76a',flexShrink:0}}>{i+1}</div>
                      <span style={{flex:1,fontSize:13,color:'#fff',lineHeight:1.3}}>{commerceLbl[k]||k}</span>
                      <span style={{fontSize:15,fontWeight:700,color:'#12b76a',flexShrink:0}}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════ LEADS RÉCENTS ════════════════════════════════ */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a40,#61DAFB25,#a78bfa15)'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'22px',backdropFilter:'blur(20px)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Leads récents</div>
              </div>
              {recent.length?(
                <div style={{display:'flex',flexDirection:'column'}}>
                  {recent.map((f,i)=>{
                    const name     = f.entreprise||`${f.prenom||''} ${f.nom||''}`.trim()||'Sans nom';
                    const ini      = (name[0]||'?').toUpperCase();
                    const statClr  = STATUS_CLR[f.status];
                    const annulee  = f.status==='installation_annulee';
                    const bgColor  = AV_COLORS[i%AV_COLORS.length];
                    return (
                      <div key={f.id} className="dash-row"
                        style={{display:'flex',alignItems:'center',gap:isMobile?10:12,padding:'10px 0',borderBottom:i<recent.length-1?'1px solid rgba(255,255,255,0.06)':'none',transition:'all 0.15s',background:annulee?'rgba(190,18,60,0.04)':'transparent',borderRadius:annulee?8:0}}>
                        <div style={{width:36,height:36,borderRadius:10,background:`${bgColor}25`,border:`1.5px solid ${bgColor}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:bgColor,flexShrink:0}}>
                          {ini}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:annulee?'#be123c':'#c0c0e0'}}>{name}</div>
                          <div style={{fontSize:11,color:'#fff',marginTop:1}}>{f.ville||'—'} · {new Date(f.dateVente??f.createdAt).toLocaleDateString('fr-FR')}</div>
                          {annulee&&f.motifAnnulation&&<div style={{fontSize:10,color:'#be123c',marginTop:1}}>✕ {f.motifAnnulation}</div>}
                        </div>
                        <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'rgba(59,108,248,0.12)',color:f.typeClient==='b2b'?'#3b6cf8':'#12b76a',flexShrink:0}}>
                          {f.typeClient==='b2b'?'🏢 B2B':'👤 B2C'}
                        </span>
                        <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${statClr}15`,color:statClr,flexShrink:0,whiteSpace:'nowrap'}}>
                          {STATUS_LBL[f.status]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ):<div style={{color:'#fff',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun lead</div>}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
