'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users, TrendingUp, CheckCircle, AlertCircle, Clock, XCircle,
  MapPin, Zap, Building2, Shield, Wallet, Target, Star, Phone, Home,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { DEFAULT_SETTINGS, VALID_STATUTS, MOIS_FULL } from '@/types';

/* ─── couleurs statuts (MERN palette) ────────────────────── */
const STATUS_CLR: Record<StatusFiche, string> = {
  new:'#3b6cf8', contacted:'#f79009', proposal:'#a764f8',
  installation_en_cours:'#f97316', installe:'#22c55e', installation_annulee:'#be123c',
};
const STATUS_LBL: Record<StatusFiche, string> = {
  new:'Nouveau', contacted:'Contacté', proposal:'Soumission',
  installation_en_cours:'Installation en cours', installe:'Installé', installation_annulee:'Installation annulée',
};

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
          <div style={{fontSize:8,color:'#fff',fontWeight:600,textTransform:'uppercase',lineHeight:1.2}}>{label}</div>
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
  const [commFiltre,   setCommFiltre]   = useState<'tout'|'payee'|'non_payee'>('tout');
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
        api.get<SolutionExpress[]>('/api/solution-express'),
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
  const qualifLbl = useMemo(() =>
    Object.fromEntries(settings.qualificationSysteme.map(q=>[q.key,q.label])),
    [settings.qualificationSysteme]);
  const leadTypeLbl = useMemo(() =>
    Object.fromEntries(settings.typeLead.map(t=>[t.key,t.label])),
    [settings.typeLead]);
  const leadTypeClr = useMemo(() => {
    const m: Record<string,string> = {};
    settings.typeLead.forEach((t,i) => { m[t.key] = LEAD_PALETTE[i%LEAD_PALETTE.length]; });
    return m;
  }, [settings.typeLead]);
  const commerceLbl = useMemo(() =>
    Object.fromEntries(settings.typeCommerce.map(t=>[t.key,t.label])),
    [settings.typeCommerce]);
  const fournLbl = useMemo(() => {
    const m: Record<string,string> = {};
    settings.services.forEach(svc => {
      [...svc.actuel,...svc.propose].forEach(item => { if (item.key&&item.label) m[item.key]=item.label; });
    });
    return m;
  }, [settings.services]);

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
  const byCity     = useMemo(() => topN(fiches, 'ville'),    [fiches]);
  const byLeadType = useMemo(() => topN(fiches, 'leadType'), [fiches]);
  const byCommerce= useMemo(()=>{
    const m: Record<string,number>={};
    fiches.filter(f=>f.typeClient==='b2b'&&f.typeCommerce&&f.typeCommerce!=='autre').forEach(f=>{m[f.typeCommerce]=(m[f.typeCommerce]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches]);
  const byCommerceB2C= useMemo(()=>{
    const m: Record<string,number>={};
    fiches.filter(f=>f.typeClient==='b2c'&&f.typeCommerce&&f.typeCommerce!=='autre').forEach(f=>{m[f.typeCommerce]=(m[f.typeCommerce]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches]);
  const byQualif  = useMemo(()=>{
    const m: Record<string,number>={};
    fiches.forEach(f=>{if(f.qualificationSysteme&&f.qualificationSysteme!=='inconnu'&&f.qualificationSysteme!=='')m[f.qualificationSysteme]=(m[f.qualificationSysteme]||0)+1;});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches]);
  /* find matching service by id OR label */
  const findSvc = useCallback((p: string) =>
    settings.services.find(x=>x.id===p) ?? settings.services.find(x=>x.label===p),
    [settings.services]);

  const byFourn = useMemo(()=>
    settings.services.map(svc=>{
      const m: Record<string,number>={};
      fiches.forEach(f=>{
        if(!f.produits.some(p=>findSvc(p)?.id===svc.id)) return;
        const fv = f.fournisseurs as Record<string,{propose?:string}>;
        const p = fv?.[svc.id]?.propose;
        if(p&&!['inconnu','aucun',''].includes(p)) m[p]=(m[p]||0)+1;
      });
      return {svc, fourn:Object.entries(m).sort((a,b)=>b[1]-a[1])};
    }).filter(x=>x.fourn.length>0)
  ,[fiches,settings.services,findSvc]);

  const byProduit = useMemo(()=>{
    const m: Record<string,number>={};
    fiches.forEach(f=>f.produits.forEach(p=>{
      const svc=findSvc(p);
      if(!svc) return;           // ignore valeurs non reconnues
      m[svc.id]=(m[svc.id]||0)+1;
    }));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[fiches, findSvc]);
  const serviceCounts = useMemo(() => Object.fromEntries(byProduit), [byProduit]);

  /* ── commissions ── */
  const {
    commFiches, commActives, commAnnulees,
    commTotalGagne, commTotalPaye, commEnAttente,
    commMax, commMin,
  } = useMemo(() => {
    const hist     = fiches.filter(f=>(f.commissionTotale||0)>0||(f.commissionFixe||0)>0);
    const fiches_  = hist.filter(c=>commFiltre==='tout'?true:commFiltre==='payee'?c.commissionPayee:!c.commissionPayee);
    const actives  = fiches_.filter(c=>c.status!=='installation_annulee');
    const gained   = actives.reduce((s,c)=>s+(c.commissionTotale||0),0);
    const paid     = actives.filter(c=>c.commissionPayee).reduce((s,c)=>s+(c.commissionTotale||0),0);
    const vals     = actives.map(c=>c.commissionTotale||0).filter(v=>v>0);
    return {
      commFiches:      fiches_,
      commActives:     actives,
      commAnnulees:    fiches_.filter(c=>c.status==='installation_annulee').length,
      commTotalGagne:  gained,
      commTotalPaye:   paid,
      commEnAttente:   Math.max(0, gained-paid),
      commMax:         vals.length ? Math.max(...vals) : 0,
      commMin:         vals.length ? Math.min(...vals) : 0,
    };
  }, [fiches, commFiltre]);
  const objectif = anneeGlobal!=='tout'?(settings.objectifAnnuel?.[anneeGlobal]||0):0;
  const objPct   = objectif>0?Math.min(Math.round((commTotalGagne/objectif)*100),100):0;

  /* ── récents ── */
  const recent = useMemo(()=>[...fiches].sort((a,b)=>new Date(b.dateVente??b.createdAt).getTime()-new Date(a.dateVente??a.createdAt).getTime()).slice(0,6),[fiches]);

  /* ── pipeline chart ── */
  const pipelineData = useMemo(() => [
    { name: 'Nouveau',    value: counts.new                   || 0, color: '#3b6cf8' },
    { name: 'Contacté',   value: counts.contacted             || 0, color: '#f79009' },
    { name: 'Soumission', value: counts.proposal              || 0, color: '#a764f8' },
    { name: 'En cours',   value: counts.installation_en_cours || 0, color: '#f97316' },
    { name: 'Installé',   value: counts.installe              || 0, color: '#22c55e' },
    { name: 'Annulée',    value: counts.installation_annulee  || 0, color: '#be123c' },
  ].filter(x => x.value > 0), [counts]);

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
                    <p style={{color:'#fff',fontSize:13,margin:0,marginTop:2}}>
                      <span style={{color:'#12b76a',fontWeight:700}}>{totalSE}</span> <span style={{color:'#fff'}}>fiche{totalSE!==1?'s':''}</span>
                      {anneeGlobal!=='tout'&&<span style={{color:'#12b76a',fontWeight:700}}> · {anneeGlobal}</span>}
                    </p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {!isMobile&&(
                    <div style={{fontSize:12,color:'#fff',background:'rgba(255,255,255,0.05)',padding:'6px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',whiteSpace:'nowrap',textTransform:'capitalize'}}>
                      {new Date().toLocaleDateString('fr-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
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
                    {' '}fiche{totalSE!==1?'s':''}
                  </div>
                  <div style={{height:22,borderRadius:6,background:'rgba(255,255,255,0.08)',position:'relative'}}>
                    <div style={{height:'100%',borderRadius:6,background:'linear-gradient(90deg,#3b6cf8,#12b76a)',width:`${convRate}%`,transition:'width 1.2s ease',boxShadow:'0 0 12px rgba(18,183,106,0.4)',display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:6,overflow:'hidden'}}>
                      {convRate>8&&<span style={{fontSize:10,fontWeight:700,color:'#fff',whiteSpace:'nowrap'}}>{convRate}%</span>}
                    </div>
                    <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>100%</span>
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

              {settings.services.length>0&&(
                <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                    {settings.services.map(svc=>(
                      <div key={svc.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                        <div style={{width:44,height:44,borderRadius:'50%',border:`2.5px solid ${svc.color||'#8b8b9e'}`,background:`${svc.color||'#8b8b9e'}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{fontSize:15,fontWeight:800,color:svc.color||'#8b8b9e'}}>{serviceCounts[svc.id]||0}</span>
                        </div>
                        <span style={{fontSize:9,color:'#fff',fontWeight:600,textAlign:'center',maxWidth:64,lineHeight:1.2}}>{svc.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{height:100,marginTop:12}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={settings.services.map(svc=>({name:svc.label,value:serviceCounts[svc.id]||0}))} barSize={16} margin={{top:14,right:0,left:0,bottom:0}}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={(props)=>{ const svc=settings.services[props.index]; return <text x={props.x} y={props.y+4} textAnchor="middle" fontSize={8} fill={svc?.color||'#8b8b9e'}>{props.payload.value}</text>; }}/>
                        <Bar dataKey="value" radius={[4,4,0,0]} label={(props)=>{ const svc=settings.services[props.index]; return <text x={props.x+(props.width/2)} y={props.y-4} textAnchor="middle" fontSize={10} fontWeight={700} fill={svc?.color||'#8b8b9e'}>{props.value}</text>; }}>
                          {settings.services.map((svc,i)=><Cell key={i} fill={svc.color||'#8b8b9e'}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
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
          {/* ════════ TOTAL FICHES (pleine largeur) ═══════════════ */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#06b6d470,#06b6d425)',marginBottom:14,animation:'fadeSlideUp 0.4s 0.05s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px 18px':'20px 26px',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
              <div style={{display:'flex',alignItems:'center',gap:18}}>
                <div style={{width:52,height:52,borderRadius:15,background:'rgba(6,182,212,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 22px rgba(6,182,212,0.25)'}}>
                  <Users size={24} color="#06b6d4"/>
                </div>
                <div>
                  <div style={{fontSize:10,color:'#06b6d4',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:4}}>Total fiches</div>
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
                      <div style={{fontSize:11,color:c,fontWeight:600}}>{label}</div>
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
                        <div style={{fontSize:10,color,marginTop:5,fontWeight:600}}>{card.sub}</div>
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

          {/* ════════ COMMISSIONS ═════════════════════════════════ */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a40,#61DAFB20,#a78bfa10)',marginBottom:24,animation:'fadeSlideUp 0.4s 0.2s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'22px 26px',backdropFilter:'blur(20px)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <div style={{width:38,height:38,borderRadius:11,background:'rgba(18,183,106,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Wallet size={18} color="#12b76a"/>
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Mes commissions</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                    Solution Express · {anneeGlobal==='tout'?'historique complet':anneeGlobal}
                  </div>
                </div>
              </div>

              {/* Objectif annuel */}
              {anneeGlobal!=='tout'&&objectif>0&&(
                <div style={{marginBottom:16,background:'rgba(18,183,106,0.05)',borderRadius:12,padding:'12px 16px',border:'1px solid rgba(18,183,106,0.15)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:6}}>
                    <span style={{fontWeight:700}}>Objectif {anneeGlobal}</span>
                    <span style={{fontWeight:800,color:objPct>=100?'#12b76a':'#f79009'}}>{commTotalGagne.toFixed(0)} / {objectif} TND — {objPct}%</span>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:3,background:objPct>=100?'linear-gradient(90deg,#12b76a,#61DAFB)':'linear-gradient(90deg,#3b6cf8,#12b76a)',width:`${objPct}%`,transition:'width 1.2s ease'}}/>
                  </div>
                </div>
              )}

              {/* Stats ligne 1 */}
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:10}}>
                {[
                  {label:'Total gagné',  value:`${commTotalGagne.toFixed(2)} TND`,color:'#12b76a',bg:'rgba(18,183,106,0.06)',border:'rgba(18,183,106,0.15)',sub:'toutes commissions'},
                  {label:'✓ Payé',       value:`${commTotalPaye.toFixed(2)} TND`, color:'#3b6cf8',bg:'rgba(59,108,248,0.06)', border:'rgba(59,108,248,0.15)', sub:'commissions reçues'},
                  {label:'⏳ En attente',value:`${commEnAttente.toFixed(2)} TND`, color:'#f79009',bg:'rgba(247,144,9,0.06)',  border:'rgba(247,144,9,0.15)',  sub:'à recevoir'},
                ].map((s,i)=>(
                  <div key={i} style={{background:s.bg,borderRadius:12,padding:'14px 16px',border:`1px solid ${s.border}`,transition:'transform 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                    onMouseLeave={e=>e.currentTarget.style.transform=''}>
                    <div style={{fontSize:10,color:s.color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:isMobile?16:20,fontWeight:700,color:s.color,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:6}}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Stats ligne 2 */}
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:10,marginBottom:16}}>
                {[
                  {label:'Maximum',     value:`${commMax.toFixed(2)} TND`, color:'#a764f8',bg:'rgba(167,100,248,0.06)',border:'rgba(167,100,248,0.15)',emoji:'↑'},
                  {label:'Minimum',     value:`${commMin.toFixed(2)} TND`, color:'#8b8b9e',bg:'rgba(139,139,158,0.06)',border:'rgba(139,139,158,0.15)',emoji:'↓'},
                  {label:'Commissions', value:String(commActives.length),  color:'#12b76a',bg:'rgba(18,183,106,0.06)', border:'rgba(18,183,106,0.15)', emoji:'✅',sub:'Solution Express'},
                  {label:'Annulées',    value:String(commAnnulees),        color:'#be123c',bg:'rgba(190,18,60,0.06)',  border:'rgba(190,18,60,0.15)',  emoji:'❌',sub:'installations'},
                ].map((s,i)=>(
                  <div key={i} style={{background:s.bg,borderRadius:12,padding:'12px 14px',border:`1px solid ${s.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontSize:9,color:s.color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:isMobile?15:18,fontWeight:700,color:s.color}}>{s.value}</div>
                      {s.sub&&<div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:3}}>{s.sub}</div>}
                    </div>
                    <div style={{fontSize:22,opacity:0.15}}>{s.emoji}</div>
                  </div>
                ))}
              </div>

              {/* Historique */}
              <div style={{background:'rgba(255,255,255,0.03)',borderRadius:14,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}>
                <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'10px 16px',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  {([['tout','Tout'],['payee','✓ Payée'],['non_payee','⏳ Attente']] as const).map(([k,l])=>{
                    const active = commFiltre===k;
                    const ac = k==='payee'?'#12b76a':k==='non_payee'?'#f79009':'#3b6cf8';
                    return (
                      <button key={k} onClick={()=>setCommFiltre(k)}
                        style={{padding:'4px 14px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
                          border:`1px solid ${active?ac:'rgba(255,255,255,0.1)'}`,
                          background:active?`${ac}18`:'transparent',
                          color:active?ac:'rgba(255,255,255,0.4)'}}>
                        {l}
                      </button>
                    );
                  })}
                  <div style={{marginLeft:'auto',fontSize:11,color:'rgba(255,255,255,0.35)',display:'flex',alignItems:'center',gap:6}}>
                    <span>{commActives.length} active{commActives.length!==1?'s':''}</span>
                    {commAnnulees>0&&<span style={{color:'#be123c',fontWeight:700}}>· {commAnnulees} annulée{commAnnulees>1?'s':''}</span>}
                  </div>
                </div>
                <div style={{padding:'4px 0'}}>
                  {commFiches.length>0?[...commFiches].sort((a,b)=>new Date(b.dateVente??b.createdAt).getTime()-new Date(a.dateVente??a.createdAt).getTime()).map((c,i)=>{
                    const annulee = c.status==='installation_annulee';
                    const paid    = !annulee&&!!c.commissionPayee;
                    const color   = annulee?'#be123c':paid?'#12b76a':'#f79009';
                    const date    = new Date(c.dateVente??c.createdAt).toLocaleDateString('fr-CA');
                    return (
                      <div key={c.id} className="dash-row"
                        style={{display:'flex',alignItems:'center',gap:isMobile?10:12,padding:isMobile?'10px 14px':'10px 16px',borderBottom:i<commFiches.length-1?'1px solid rgba(255,255,255,0.06)':'none',transition:'all 0.15s',background:annulee?'rgba(190,18,60,0.04)':'transparent'}}>
                        <div style={{width:36,height:36,borderRadius:9,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Wallet size={14} color={color}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:annulee?'#be123c':'#c0c0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {c.entreprise||`${c.prenom||''} ${c.nom||''}`.trim()||'Sans nom'}
                          </div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:1}}>
                            {c.ville||'—'} · {date}
                            {annulee&&c.motifAnnulation&&<span style={{color:'#be123c',marginLeft:6}}>· {c.motifAnnulation}</span>}
                          </div>
                        </div>
                        {!isMobile&&(c.commissionFixe>0||c.commissionExtra>0)&&(
                          <div style={{textAlign:'right',flexShrink:0}}>
                            {c.commissionFixe>0&&<div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Fixe : <strong style={{color:'rgba(255,255,255,0.6)'}}>{c.commissionFixe.toFixed(2)} TND</strong></div>}
                            {c.commissionExtra>0&&<div style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Extra : <strong style={{color:'rgba(255,255,255,0.6)'}}>{c.commissionExtra.toFixed(2)} TND</strong></div>}
                          </div>
                        )}
                        <div style={{textAlign:'right',flexShrink:0,minWidth:isMobile?80:90}}>
                          <div style={{fontSize:isMobile?14:16,fontWeight:700,color}}>{(c.commissionTotale||0).toFixed(2)} TND</div>
                          <div style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:20,display:'inline-block',marginTop:2,background:`${color}18`,color}}>
                            {annulee?'❌ Annulée':paid?'✓ Payée':'⏳ Attente'}
                          </div>
                        </div>
                      </div>
                    );
                  }):(
                    <div style={{textAlign:'center',padding:'24px 0',color:'rgba(255,255,255,0.3)',fontSize:13}}>Aucune commission pour cette période</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ════════ PIPELINE + PRODUITS ═════════════════════════ */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,marginBottom:20}}>
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#3b6cf840,#a78bfa20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Pipeline global</div>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>{totalSE} fiches</span>
                </div>
                <ResponsiveContainer width="100%" height={isMobile?140:200}>
                  <BarChart data={pipelineData} barSize={isMobile?18:30} margin={{top:20,right:0,left:0,bottom:0}}>
                    <XAxis dataKey="name" tick={{fill:'rgba(255,255,255,0.35)',fontSize:isMobile?8:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'rgba(255,255,255,0.25)',fontSize:11}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:'rgba(2,8,16,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,fontSize:12}} cursor={{fill:'rgba(255,255,255,0.03)'}}/>
                    <Bar dataKey="value" radius={[6,6,0,0]} label={{position:'top',fill:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:700}}>
                      {pipelineData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#f7900940,#12b76a20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Produits d&apos;intérêt</div>
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
                              <span style={{fontSize:13,color:'rgba(255,255,255,0.7)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</span>
                              <span style={{fontSize:13,fontWeight:700,color,flexShrink:0}}>{count}</span>
                            </div>
                            <ProgressBar value={count} max={totalSE} color={color}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ):<div style={{color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun produit</div>}
              </div>
            </div>
          </div>

          {/* ════════ QUALIFICATION + FOURNISSEURS ════════════════ */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:16,marginBottom:20}}>
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#f0443840,#a78bfa20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Qualification système</div>
                  <Shield size={14} color="#a78bfa"/>
                </div>
                {byQualif.length?(
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {byQualif.map(([k, count], i)=>{
                      const QCOLORS=['#f04438','#f79009','#12b76a','#3b6cf8','#a764f8','#8b8b9e'];
                      const color=QCOLORS[i%QCOLORS.length];
                      return (
                        <div key={k} style={{display:'flex',alignItems:'center',gap:10,background:`${color}08`,borderRadius:9,padding:'8px 12px',border:`1px solid ${color}20`,transition:'transform 0.15s'}}
                          onMouseEnter={e=>e.currentTarget.style.transform='translateX(3px)'}
                          onMouseLeave={e=>e.currentTarget.style.transform=''}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                          <span style={{flex:1,fontSize:12,color:'rgba(255,255,255,0.6)'}}>{qualifLbl[k]||k}</span>
                          <span style={{fontSize:13,fontWeight:700,color}}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                ):<div style={{color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucune qualification</div>}
              </div>
            </div>

            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#3b6cf840,#61DAFB20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Fournisseurs proposés</div>
                  <TrendingUp size={14} color="#61DAFB"/>
                </div>
                {byFourn.length?(
                  <div style={{display:'flex',flexDirection:'column',gap:16}}>
                    {byFourn.map(({svc,fourn})=>(
                      <div key={svc.id}>
                        <div style={{fontSize:11,fontWeight:700,color:svc.color||'#8b8b9e',marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>{svc.label}</div>
                        {fourn.map(([k,count],i)=>(
                          <div key={k} style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                            <div style={{width:22,height:22,borderRadius:6,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:svc.color||'#8b8b9e',flexShrink:0}}>{i+1}</div>
                            <span style={{flex:1,fontSize:13,color:'#fff'}}>{fournLbl[k]||k}</span>
                            <span style={{fontSize:13,fontWeight:700,color:svc.color||'#8b8b9e'}}>{count}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ):<div style={{color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun fournisseur</div>}
              </div>
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
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {byLeadType.map(([k, count])=>{
                      const color=leadTypeClr[k]||'#8b8b9e';
                      return (
                        <div key={k} style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0,boxShadow:`0 0 6px ${color}80`}}/>
                          <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.65)'}}>{leadTypeLbl[k]||k}</span>
                          <span style={{fontSize:13,fontWeight:700,color}}>{count}</span>
                          <ProgressBar value={count} max={totalSE} color={color}/>
                        </div>
                      );
                    })}
                  </div>
                ):<div style={{color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun type</div>}
              </div>
            </div>

            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#61DAFB40,#a78bfa20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)',height:'100%'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Villes</div>
                  <MapPin size={14} color="#61DAFB"/>
                </div>
                {byCity.length?(
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {byCity.map(([ville,count],i)=>(
                      <div key={ville} style={{display:'flex',alignItems:'center',gap:12,transition:'transform 0.15s'}}
                        onMouseEnter={e=>e.currentTarget.style.transform='translateX(3px)'}
                        onMouseLeave={e=>e.currentTarget.style.transform=''}>
                        <div style={{width:22,height:22,borderRadius:6,background:'rgba(97,218,251,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#61DAFB',flexShrink:0}}>{i+1}</div>
                        <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.65)'}}>{ville}</span>
                        <span style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.8)'}}>{count}</span>
                        <ProgressBar value={count} max={totalSE} color="#61DAFB"/>
                      </div>
                    ))}
                  </div>
                ):<div style={{color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucune ville</div>}
              </div>
            </div>
          </div>

          {/* ════════ TYPES DE COMMERCE B2B ═══════════════════════ */}
          {byCommerce.length>0&&(
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#f7900940,#a78bfa20)',marginBottom:20}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px',backdropFilter:'blur(20px)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Types de commerce <span style={{fontSize:11,color:'#f79009',fontWeight:600,marginLeft:4}}>B2B</span></div>
                  <Target size={14} color="#f79009"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                  {byCommerce.map(([k, count], i)=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'rgba(247,144,9,0.06)',border:'1px solid rgba(247,144,9,0.12)',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(247,144,9,0.12)';e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(247,144,9,0.06)';e.currentTarget.style.transform='';}}>
                      <div style={{width:26,height:26,borderRadius:7,background:'rgba(247,144,9,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#f79009',flexShrink:0}}>{i+1}</div>
                      <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:1.3}}>{commerceLbl[k]||k}</span>
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
                  <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>Types de commerce <span style={{fontSize:11,color:'#12b76a',fontWeight:600,marginLeft:4}}>B2C</span></div>
                  <Target size={14} color="#12b76a"/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                  {byCommerceB2C.map(([k, count], i)=>(
                    <div key={k} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'rgba(18,183,106,0.06)',border:'1px solid rgba(18,183,106,0.12)',transition:'all 0.15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='rgba(18,183,106,0.12)';e.currentTarget.style.transform='translateY(-1px)';}}
                      onMouseLeave={e=>{e.currentTarget.style.background='rgba(18,183,106,0.06)';e.currentTarget.style.transform='';}}>
                      <div style={{width:26,height:26,borderRadius:7,background:'rgba(18,183,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#12b76a',flexShrink:0}}>{i+1}</div>
                      <span style={{flex:1,fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:1.3}}>{commerceLbl[k]||k}</span>
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
                <TrendingUp size={14} color="rgba(255,255,255,0.4)"/>
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
                          <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:annulee?'#be123c':'#c0c0e0'}}>{name}</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:1}}>{f.ville||'—'} · {new Date(f.dateVente??f.createdAt).toLocaleDateString('fr-CA')}</div>
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
              ):<div style={{color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0'}}>Aucun lead</div>}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
