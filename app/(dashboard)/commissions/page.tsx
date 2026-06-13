'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Wallet, TrendingUp, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, MapPin, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import UltraFiche from '@/components/solution-express/UltraFiche';
import type { SolutionExpress, Settings } from '@/types';
import { DEFAULT_SETTINGS, MOIS_FULL, STATUS_COLOR as STATUS_CLR, STATUS_LABEL as STATUS_LBL } from '@/types';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate  = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR',{year:'numeric',month:'short',day:'numeric'}) : '—';
const fmtMoney = (v: number) => `${(v||0).toFixed(2)} TND`;

/* ─── constantes ──────────────────────────────────────────── */
const MOIS_COURT  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const YEAR_COLORS = ['#12b76a','#3b6cf8','#f79009','#a764f8','#f04438','#61DAFB','#f97316'];

/* ─── cosmos ──────────────────────────────────────────────── */
const PART_COLORS = ['#12b76a','#61DAFB','#3b6cf8','#a78bfa','#f59e0b'];
interface Star     { x:number; y:number; s:number; o:number; d:number }
interface Particle { x:number; y:number; s:number; d:number; delay:number; color:string }

/* ─── mobile hook ─────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    h(); window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

/* ─── CalendrierModerne ───────────────────────────────────── */
interface CalByDate {
  total: number; payee: number; attente: number; annulee: number; items: SolutionExpress[];
}
interface CalendarProps {
  commissions: SolutionExpress[];
  selectedDate: Date | null;
  onSelectDate: (d: Date | null, items: SolutionExpress[]) => void;
  onMonthChange?: (m: { year: number; month: number }) => void;
}
function CalendrierModerne({ commissions, selectedDate, onSelectDate, onMonthChange }: CalendarProps) {
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const prevMth = () => setCur(c=>({ year:c.month===0?c.year-1:c.year, month:c.month===0?11:c.month-1 }));
  const nextMth = () => setCur(c=>({ year:c.month===11?c.year+1:c.year, month:c.month===11?0:c.month+1 }));

  useEffect(() => { onMonthChange?.(cur); }, [cur, onMonthChange]);

  const daysInMonth = new Date(cur.year, cur.month+1, 0).getDate();
  const firstDay    = new Date(cur.year, cur.month, 1).getDay();
  const offset      = firstDay===0?6:firstDay-1;
  const monthName   = new Date(cur.year, cur.month).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});

  const byDate = useMemo(() => {
    const map: Record<string, CalByDate> = {};
    commissions.forEach(c => {
      const d   = new Date(c.dateVente ?? c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!map[key]) map[key] = { total:0, payee:0, attente:0, annulee:0, items:[] };
      if (c.status !== 'installation_annulee') map[key].total += c.commissionTotale||0;
      if (c.status === 'installation_annulee') map[key].annulee += 1;
      if (c.commissionPayee)                        map[key].payee  += c.commissionTotale||0;
      else if (c.status !== 'installation_annulee') map[key].attente += c.commissionTotale||0;
      map[key].items.push(c);
    });
    return map;
  }, [commissions]);

  const totalMois = Object.entries(byDate)
    .filter(([k])=>k.startsWith(`${cur.year}-${String(cur.month+1).padStart(2,'0')}`))
    .reduce((s,[,v])=>s+v.total, 0);

  return (
    <div style={{background:'rgba(255,255,255,0.03)',borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
      {/* Header */}
      <div style={{padding:'14px 18px',background:'linear-gradient(135deg,rgba(18,183,106,0.1),rgba(18,183,106,0.03))',borderBottom:'1px solid rgba(18,183,106,0.15)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={prevMth} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#c0c0e0'}}>
          <ChevronLeft size={15}/>
        </button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#c0c0e0',textTransform:'capitalize'}}>{monthName}</div>
          {totalMois>0&&(
            <div style={{fontSize:11,color:'#12b76a',fontWeight:700,marginTop:2,background:'rgba(18,183,106,0.1)',padding:'1px 10px',borderRadius:20,display:'inline-block'}}>
              {fmtMoney(totalMois)} ce mois
            </div>
          )}
        </div>
        <button onClick={nextMth} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#c0c0e0'}}>
          <ChevronRight size={15}/>
        </button>
      </div>
      {/* Grille */}
      <div style={{padding:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:6}}>
          {['L','M','M','J','V','S','D'].map((d,i)=>(
            <div key={i} style={{textAlign:'center',fontSize:10,color:'rgba(255,255,255,0.8)',fontWeight:700,padding:'3px 0'}}>{d}</div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {Array(offset).fill(null).map((_,i)=><div key={`e${i}`}/>)}
          {Array(daysInMonth).fill(null).map((_,i)=>{
            const day  = i+1;
            const date = new Date(cur.year, cur.month, day);
            const key  = `${cur.year}-${String(cur.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const data = byDate[key];
            const isToday = date.toDateString()===today.toDateString();
            const isSel   = selectedDate?.toDateString()===date.toDateString();
            const has     = !!data;
            return (
              <div key={day} onClick={()=>has?onSelectDate(date,data.items):onSelectDate(null,[])}
                style={{borderRadius:8,padding:'5px 3px',textAlign:'center',cursor:has?'pointer':'default',transition:'all 0.15s',minHeight:44,
                  background:isSel?'linear-gradient(135deg,#12b76a,#0e9558)':isToday?'rgba(59,108,248,0.12)':has?'rgba(18,183,106,0.07)':'transparent',
                  border:isSel?'2px solid #12b76a':isToday?'1px solid rgba(59,108,248,0.5)':has?'1px solid rgba(18,183,106,0.25)':'1px solid transparent',
                  transform:isSel?'scale(1.05)':'scale(1)'}}>
                <div style={{fontSize:12,fontWeight:has||isToday?700:400,color:isSel?'#fff':isToday?'#3b6cf8':'#c0c0e0'}}>{day}</div>
                {has&&(
                  <>
                    <div style={{fontSize:8,fontWeight:700,color:isSel?'rgba(255,255,255,0.9)':'#12b76a',marginTop:1,lineHeight:1}}>
                      {data.total>=1000?`${(data.total/1000).toFixed(1)}k`:data.total.toFixed(0)}
                    </div>
                    <div style={{display:'flex',justifyContent:'center',gap:2,marginTop:2}}>
                      {data.payee>0&&<div style={{width:3,height:3,borderRadius:'50%',background:isSel?'rgba(255,255,255,0.8)':'#12b76a'}}/>}
                      {data.attente>0&&<div style={{width:3,height:3,borderRadius:'50%',background:isSel?'rgba(255,255,255,0.6)':'#f79009'}}/>}
                      {data.annulee>0&&<div style={{width:3,height:3,borderRadius:'50%',background:isSel?'rgba(255,255,255,0.5)':'#be123c'}}/>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:12,marginTop:12,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.07)',fontSize:10,color:'rgba(255,255,255,0.8)',flexWrap:'wrap'}}>
          <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,borderRadius:'50%',background:'#12b76a',display:'inline-block'}}/> Payée</span>
          <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,borderRadius:'50%',background:'#f79009',display:'inline-block'}}/> En attente</span>
          <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,borderRadius:'50%',background:'#be123c',display:'inline-block'}}/> Annulée</span>
          <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:7,height:7,borderRadius:'50%',background:'#3b6cf8',display:'inline-block'}}/> Aujourd'hui</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════ */
export default function CommissionsPage() {
  const isMobile = useIsMobile();

  const [fiches,       setFiches]       = useState<SolutionExpress[]>([]);
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const [annee,        setAnnee]        = useState<string>(String(new Date().getFullYear()));
  const [filtre,       setFiltre]       = useState<'tout'|'payee'|'non_payee'|'annulee'>('tout');
  const [calMois,      setCalMois]      = useState({ year:new Date().getFullYear(), month:new Date().getMonth() });
  const [selDate,      setSelDate]      = useState<Date|null>(null);
  const [selVentes,    setSelVentes]    = useState<SolutionExpress[]>([]);
  const [resumeFiche,  setResumeFiche]  = useState<SolutionExpress|null>(null);
  const [ultraFiche,   setUltraFiche]   = useState<SolutionExpress|null>(null);
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
      setFiches(Array.isArray(f.data) ? f.data : []);
      setSettings(s.data ?? DEFAULT_SETTINGS);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const onVis = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchAll]);

  /* ── helpers labels ── */
  const commerceLbl = useMemo(() =>
    Object.fromEntries(settings.typeCommerce.map(t=>[t.key,t.label])),
    [settings.typeCommerce]);
  const qualifLbl = useMemo(() =>
    Object.fromEntries(settings.qualificationSysteme.map(q=>[q.key,q.label])),
    [settings.qualificationSysteme]);

  /* ── toggle paiement ── */
  const togglePaiement = async (f: SolutionExpress) => {
    try {
      await api.put(`/api/leads/${f.id}`, {
        commissionPayee: !f.commissionPayee,
        datePaiementCommission: !f.commissionPayee ? new Date().toISOString() : null,
      });
      toast.success(!f.commissionPayee?'✓ Commission payée !':'Marquée non payée');
      const res = await api.get<SolutionExpress[]>('/api/leads');
      const fresh = Array.isArray(res.data) ? res.data : [];
      setFiches(fresh);
      if (selVentes.length) {
        const ids = new Set(selVentes.map(v=>v.id));
        setSelVentes(fresh.filter(x=>ids.has(x.id)));
      }
    } catch { toast.error('Erreur'); }
  };

  /* ── computed ── */
  const withComm = fiches.filter(f=>(f.commissionTotale||0)>0||(f.commissionFixe||0)>0);

  const annees = useMemo(() => {
    const cur = new Date().getFullYear();
    return [...new Set([cur,...withComm.map(c=>new Date(c.dateVente??c.createdAt).getFullYear())])].sort((a,b)=>b-a);
  }, [withComm]);

  const byAnnee = annee==='tout' ? withComm : withComm.filter(c=>String(new Date(c.dateVente??c.createdAt).getFullYear())===annee);

  const filtered = byAnnee.filter(c=>{
    if (filtre==='payee')     return c.commissionPayee;
    if (filtre==='non_payee') return !c.commissionPayee && c.status !== 'installation_annulee';
    if (filtre==='annulee')   return c.status === 'installation_annulee';
    return true;
  });

  /* ── historique du mois calendrier ── */
  const filteredHistorique = filtered.filter(c=>{
    const d = new Date(c.dateVente??c.createdAt);
    return d.getFullYear()===calMois.year && d.getMonth()===calMois.month;
  });

  /* ── stats cartes : tout = toutes années, année = mois du calendrier ── */
  const baseStats       = annee==='tout' ? filtered : filteredHistorique;
  const activesForStats = baseStats.filter(c=>c.status!=='installation_annulee');
  const annuleeForStats = baseStats.filter(c=>c.status==='installation_annulee');
  const actives     = filtre==='annulee' ? annuleeForStats : activesForStats;
  const totalGagne  = filtre==='annulee' ? 0 : activesForStats.reduce((s,c)=>s+(c.commissionTotale||0), 0);
  const totalAnnule = annuleeForStats.reduce((s,c)=>s+(c.commissionTotale||0), 0);
  const totalPaye   = filtre==='annulee' ? 0 : activesForStats.filter(c=>c.commissionPayee).reduce((s,c)=>s+(c.commissionTotale||0), 0);
  const enAttente   = filtre==='annulee' ? 0 : Math.max(0, totalGagne-totalPaye);
  const vals        = actives.map(c=>c.commissionTotale||0).filter(v=>v>0);
  const maximum     = vals.length?Math.max(...vals):0;
  const minimum     = vals.length?Math.min(...vals):0;
  const pctPaye     = totalGagne>0?Math.round((totalPaye/totalGagne)*100):0;

  /* ── stats annuelles = objectif + badge graphique ── */
  const activesAll    = filtered.filter(c=>c.status!=='installation_annulee');
  const totalGagneAll = activesAll.reduce((s,c)=>s+(c.commissionTotale||0), 0);
  const objectif      = annee!=='tout'?(settings.objectifAnnuel?.[annee]||0):0;
  const objPct        = objectif>0?Math.min(Math.round((totalGagne/objectif)*100),100):0;

  /* ── chart data ── */
  const chartData = annee==='tout'
    ? annees.map((yr,i)=>{
        const yrF = filtered.filter(c=>String(new Date(c.dateVente??c.createdAt).getFullYear())===String(yr));
        const activeYrF = filtre === 'annulee' ? yrF : yrF.filter(c=>c.status!=='installation_annulee');
        const barColor = filtre==='payee'?'#12b76a':filtre==='non_payee'?'#f79009':filtre==='annulee'?'#be123c':YEAR_COLORS[i%YEAR_COLORS.length];
        const cPayee   = yrF.filter(c=>c.commissionPayee&&c.status!=='installation_annulee').length;
        const cAttente = yrF.filter(c=>!c.commissionPayee&&c.status!=='installation_annulee').length;
        const cAnnulee = yrF.filter(c=>c.status==='installation_annulee').length;
        return { name:String(yr), total:activeYrF.reduce((s,c)=>s+(c.commissionTotale||0),0), count:yrF.length, cPayee, cAttente, cAnnulee, color:barColor };
      })
    : [...filteredHistorique].sort((a,b)=>new Date(a.dateVente??a.createdAt).getTime()-new Date(b.dateVente??b.createdAt).getTime())
        .map(c=>{
          const d = new Date(c.dateVente??c.createdAt);
          const annulee = c.status==='installation_annulee';
          return { name:`${d.getDate()} ${MOIS_COURT[d.getMonth()]}`, total:c.commissionTotale||0, color:annulee?'#be123c':c.commissionPayee?'#12b76a':'#f79009', annulee, fullNom:c.entreprise||`${c.prenom||''} ${c.nom||''}`.trim()||'?', motif:c.motifAnnulation||'', payee:c.commissionPayee };
        });


  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{position:'relative',minHeight:'100vh',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:.08} 50%{opacity:.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:.4} to{transform:translateY(-100vh);opacity:0} }
        @keyframes comm-fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes comm-slide-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .comm-row:hover { background:rgba(255,255,255,0.03)!important; }
      `}</style>

      {/* Cosmos vert/teal */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(18,183,106,0.12) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 90% 50%,rgba(97,218,251,0.07) 0%,transparent 50%),#06060f',zIndex:0,pointerEvents:'none'}}/>
      {mounted&&starsRef.current.map((s,i)=>(
        <div key={i} style={{position:'fixed',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:'50%',background:'#fff',opacity:s.o,pointerEvents:'none',zIndex:0,animation:`twinkle-star ${s.d}s ease-in-out infinite`,animationDelay:`${i*0.08}s`}}/>
      ))}
      {mounted&&partsRef.current.map((p,i)=>(
        <div key={i} style={{position:'fixed',left:`${p.x}%`,bottom:`-${p.y}px`,width:p.s,height:p.s,borderRadius:'50%',background:p.color,opacity:0.4,pointerEvents:'none',zIndex:0,animation:`particle-rise ${p.d}s linear infinite`,animationDelay:`${p.delay}s`}}/>
      ))}

      <div style={{position:'relative',zIndex:1,padding:isMobile?'16px 12px 40px':'28px 32px 40px'}}>

        {/* ════════════════════════════════════════
            HEADER (style Solution Express)
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:22,background:'linear-gradient(135deg,#12b76a70,#61DAFB35,#a78bfa25)',marginBottom:20,animation:'fadeSlideUp 0.4s ease both'}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'20.5px',padding:isMobile?'18px 16px':'28px 32px',backdropFilter:'blur(40px)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-80,left:-60,width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(18,183,106,0.20) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-50,right:-30,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(97,218,251,0.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'relative',zIndex:1}}>

              {/* Titre + actions */}
              <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',flexDirection:isMobile?'column':'row',gap:isMobile?12:0,marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(245,158,11,0.55)',flexShrink:0}}>
                    <Wallet size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{margin:0,fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#f59e0b)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                      Commissions
                    </h1>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {!isMobile&&(
                    <div style={{fontSize:12,color:'#fff',background:'rgba(255,255,255,0.05)',padding:'6px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',whiteSpace:'nowrap',fontWeight:700,textTransform:'capitalize'}}>
                      {new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                    </div>
                  )}
                  <select value={annee} onChange={e=>{setAnnee(e.target.value);setFiltre('tout');}}
                    style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(18,183,106,0.25)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                    <option value="tout">Toutes les années</option>
                    {annees.map(y=><option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            STATS CARDS (6 cartes, style SE)
            ════════════════════════════════════════ */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'2fr 1fr 1fr 1fr 1fr 1fr',gap:isMobile?10:14,marginBottom:20}}>

          {/* Total gagné — grande carte */}
          <div style={{gridColumn:isMobile?'1 / -1':'auto',padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a70,#61DAFB35)',animation:'fadeSlideUp 0.4s 0.05s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px 18px':'22px 26px',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',gap:14,height:'100%'}}>
              <div style={{width:isMobile?44:52,height:isMobile?44:52,borderRadius:14,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 20px rgba(245,158,11,0.5)'}}>
                <TrendingUp size={isMobile?18:22} color="#fff"/>
              </div>
              <div>
                <div style={{fontSize:10,color:'#12b76a',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Total gagné</div>
                <div style={{fontSize:isMobile?20:26,fontWeight:900,color:'#12b76a',lineHeight:1}}>
                  <AnimatedNumber value={totalGagne} decimals={0} color="#12b76a" suffix=" TND"/>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:5}}>
                  {activesForStats.length} vente{activesForStats.length!==1?'s':''} · moy. {fmtMoney(totalGagne/Math.max(activesForStats.length,1))}
                </div>
              </div>
            </div>
          </div>

          {/* Payé */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#3b6cf860,#61DAFB20)',animation:'fadeSlideUp 0.4s 0.1s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#61DAFB',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>✓ Payé</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={totalPaye} decimals={0} color="#61DAFB" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:5}}>{activesForStats.filter(c=>c.commissionPayee).length} ventes</div>
            </div>
          </div>

          {/* Attente */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#f7900960,#f0443820)',animation:'fadeSlideUp 0.4s 0.15s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#f79009',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>⏳ Attente</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={enAttente} decimals={0} color="#f79009" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:5}}>{activesForStats.filter(c=>!c.commissionPayee).length} ventes</div>
            </div>
          </div>

          {/* Max */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#a78bfa60,#61DAFB20)',animation:'fadeSlideUp 0.4s 0.2s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#a78bfa',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>↑ Max</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={maximum} decimals={0} color="#a78bfa" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:5}}>meilleure</div>
            </div>
          </div>

          {/* Min */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,rgba(139,139,158,0.4),rgba(97,218,251,0.1))',animation:'fadeSlideUp 0.4s 0.25s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#8b8b9e',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>↓ Min</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={minimum} decimals={0} color="#8b8b9e" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:5}}>plus petite</div>
            </div>
          </div>

          {/* Annulé */}
          <div style={{gridColumn:isMobile?'1 / -1':'auto',padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#be123c60,#f0443820)',animation:'fadeSlideUp 0.4s 0.3s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#be123c',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>✕ Annulé</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={totalAnnule} decimals={0} color="#be123c" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:5}}>{annuleeForStats.length} vente{annuleeForStats.length!==1?'s':''}</div>
            </div>
          </div>
        </div>

        {/* Objectif annuel */}
        {annee!=='tout'&&objectif>0&&(
          <div style={{marginBottom:16,background:'rgba(18,183,106,0.05)',borderRadius:12,padding:'12px 18px',border:'1px solid rgba(18,183,106,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'rgba(255,255,255,0.5)',marginBottom:4}}>
              <span style={{fontWeight:700}}>Objectif {MOIS_FULL[calMois.month]} {annee}</span>
              <span style={{fontSize:12}}>
                {totalPaye>0&&<span style={{color:'#12b76a',fontWeight:800}}>{totalPaye.toFixed(0)}</span>}
                {totalPaye>0&&(enAttente>0||totalAnnule>0)&&<span style={{color:'#fff'}}> + </span>}
                {enAttente>0&&<span style={{color:'#f79009',fontWeight:800}}>{enAttente.toFixed(0)}</span>}
                {enAttente>0&&totalAnnule>0&&<span style={{color:'#fff'}}> + </span>}
                {totalAnnule>0&&<span style={{color:'#be123c',fontWeight:800}}>{totalAnnule.toFixed(0)}</span>}
                {totalPaye===0&&enAttente===0&&totalAnnule===0&&<span style={{color:'rgba(255,255,255,0.8)'}}>0</span>}
                <span style={{color:'#fff',fontWeight:800}}> / {objectif} TND — </span>
                <span style={{color:objPct>=100?'#12b76a':'#f79009',fontWeight:800}}>{objPct}%</span>
              </span>
            </div>
            <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.08)',overflow:'hidden',display:'flex'}}>
              <div style={{height:'100%',background:'#12b76a',width:`${objectif>0?Math.min((totalPaye/objectif)*100,100):0}%`,transition:'width 1.2s ease'}}/>
              <div style={{height:'100%',background:'#f79009',width:`${objectif>0?Math.min((enAttente/objectif)*100,100):0}%`,transition:'width 1.2s ease'}}/>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            GRAPHIQUE
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a50,#61DAFB25,#a78bfa15)',marginBottom:20}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px 24px',backdropFilter:'blur(20px)'}}>
            <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8,flexDirection:isMobile?'column':'row'}}>
              <div style={{fontSize:14,fontWeight:700,color:'#c0c0e0'}}>
                Commissions par {annee==='tout'?'année':'mois'} {annee!=='tout'&&<span style={{color:'#12b76a'}}>{annee}</span>}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {([['tout','Tout','#12b76a'],['payee','✓ Payée','#12b76a'],['non_payee','⏳ Attente','#f79009'],['annulee','✕ Annulée','#be123c']] as const).map(([k,l,c])=>(
                  <button key={k} onClick={()=>setFiltre(k)}
                    style={{fontSize:10,padding:'4px 10px',borderRadius:7,border:`1px solid ${filtre===k?c:'rgba(255,255,255,0.1)'}`,background:filtre===k?`${c}25`:'transparent',color:filtre===k?c:'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:700,transition:'all 0.2s'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isMobile?120:160}>
              <BarChart data={chartData} barSize={isMobile?14:22} margin={{top:0,right:0,bottom:0,left:0}}>
                <XAxis dataKey="name" tick={{fill:'rgba(255,255,255,0.4)',fontSize:isMobile?8:10}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip
                  cursor={{fill:'rgba(255,255,255,0.04)'}}
                  contentStyle={{background:'rgba(2,8,16,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,fontSize:12}}
                  content={({active,payload})=>{
                    if(!active||!payload?.length) return null;
                    const d=payload[0].payload;
                    if(!d.total) return null;
                    return (
                      <div style={{background:'rgba(2,8,16,0.97)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 14px',fontSize:12,maxWidth:200}}>
                        {annee!=='tout'&&<div style={{color:'#c0c0e0',fontWeight:700,marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.fullNom}</div>}
                        <div style={{color:d.color||'#12b76a',fontWeight:700,marginBottom:4}}>{fmtMoney(d.total)}</div>
                        {annee!=='tout'?(
                          <>
                            <div style={{color:d.annulee?'#be123c':'#12b76a'}}>{d.annulee?'❌ Annulée':'✅ Installé'}</div>
                            {d.annulee&&d.motif&&<div style={{color:'#be123c',fontSize:11,marginTop:2}}>✕ {d.motif}</div>}
                            {!d.annulee&&<div style={{color:d.payee?'#12b76a':'#f79009',fontSize:11,marginTop:2}}>{d.payee?'✓ Payée':'⏳ Non payée'}</div>}
                          </>
                        ):(
                          <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:2}}>
                            {d.cPayee>0&&<div style={{color:'#12b76a',fontSize:11}}>✓ {d.cPayee} payée{d.cPayee>1?'s':''}</div>}
                            {d.cAttente>0&&<div style={{color:'#f79009',fontSize:11}}>⏳ {d.cAttente} en attente</div>}
                            {d.cAnnulee>0&&<div style={{color:'#be123c',fontSize:11}}>✕ {d.cAnnulee} annulée{d.cAnnulee>1?'s':''}</div>}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" radius={[6,6,0,0]}>
                  {chartData.map((e,i)=><Cell key={i} fill={e.total>0?(e.color||'#12b76a'):'rgba(255,255,255,0.06)'}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CALENDRIER + HISTORIQUE (année seulement)
            ════════════════════════════════════════ */}
        {annee!=='tout'&&<div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'320px 1fr',gap:20,alignItems:'flex-start'}}>

          {/* Calendrier */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <CalendrierModerne
              commissions={filtered}
              selectedDate={selDate}
              onSelectDate={(d,items)=>{setSelDate(d);setSelVentes(items);}}
              onMonthChange={setCalMois}
            />
            {/* Détail jour sélectionné */}
            {selDate&&selVentes.length>0&&(
              <div style={{background:'rgba(255,255,255,0.03)',borderRadius:14,overflow:'hidden',border:'1px solid rgba(18,183,106,0.2)',animation:'fadeSlideUp 0.3s ease both'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'linear-gradient(135deg,rgba(18,183,106,0.08),transparent)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#c0c0e0',display:'flex',alignItems:'center',gap:6}}>
                    <Calendar size={12} color="#12b76a"/>
                    {selDate.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
                  </div>
                  <button onClick={()=>{setSelDate(null);setSelVentes([]);}} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.8)',fontSize:18,lineHeight:1}}>×</button>
                </div>
                <div style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}>
                  {selVentes.map(c=>{
                    const ann = c.status==='installation_annulee';
                    const clr = ann?'#be123c':c.commissionPayee?'#12b76a':'#f79009';
                    const bdr = ann?'rgba(190,18,60,0.2)':c.commissionPayee?'rgba(18,183,106,0.15)':'rgba(247,144,9,0.15)';
                    const lbl = ann?'✕ Annulée':c.commissionPayee?'✓ Payée':'⏳ Attente';
                    return (
                      <div key={c.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:ann?'rgba(190,18,60,0.04)':'rgba(255,255,255,0.03)',borderRadius:10,padding:'10px 12px',gap:8,border:`1px solid ${bdr}`}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:'#c0c0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {c.entreprise||`${c.prenom||''} ${c.nom||''}`.trim()||'Sans nom'}
                          </div>
                          {c.ville&&<div style={{fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:2}}>{c.ville}</div>}
                          {ann&&c.motifAnnulation&&<div style={{fontSize:9,color:'#be123c',marginTop:2,fontWeight:700}}>✕ {c.motifAnnulation}</div>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:clr}}>{fmtMoney(c.commissionTotale)}</div>
                          <div style={{fontSize:9,color:clr,fontWeight:700}}>{lbl}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}>Total du jour</span>
                    <span style={{fontSize:15,fontWeight:800,color:'#12b76a'}}>{fmtMoney(selVentes.filter(c=>c.status!=='installation_annulee').reduce((s,c)=>s+(c.commissionTotale||0),0))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Historique */}
          <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a40,#a78bfa20)'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',overflow:'hidden',backdropFilter:'blur(20px)'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'linear-gradient(135deg,rgba(18,183,106,0.08),transparent)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#c0c0e0'}}>Historique des commissions</div>
                {filteredHistorique.length>0&&(
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.04)',padding:'3px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,0.08)',fontWeight:700}}>
                    <span style={{color:'#c0c0e0',fontWeight:800}}>{filteredHistorique.length}</span> vente{filteredHistorique.length!==1?'s':''}
                  </div>
                )}
              </div>

              {loading?(
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:12}}>
                  <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid rgba(18,183,106,0.15)',borderTopColor:'#12b76a',animation:'spin 0.8s linear infinite'}}/>
                </div>
              ):filteredHistorique.length===0?(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{width:60,height:60,borderRadius:18,background:'rgba(18,183,106,0.06)',border:'1px solid rgba(18,183,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                    <Wallet size={28} color="#12b76a" style={{opacity:0.4}}/>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.5)',marginBottom:4}}>Aucune commission</div>
                  <div style={{fontSize:12,color:'#fff'}}>
                    {MOIS_FULL[calMois.month]} {calMois.year}
                  </div>
                </div>
              ):(
                <div>
                  {[...filteredHistorique].sort((a,b)=>new Date(b.dateVente??b.createdAt).getTime()-new Date(a.dateVente??a.createdAt).getTime())
                    .map((c,i,arr)=>{
                      const annulee = c.status==='installation_annulee';
                      const color   = annulee?'#be123c':c.commissionPayee?'#12b76a':'#f79009';
                      return (
                        <div key={c.id} className="comm-row"
                          style={{display:'flex',alignItems:'center',gap:isMobile?10:14,padding:isMobile?'12px 14px':'14px 20px',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.06)':'none',transition:'all 0.15s',background:annulee?'rgba(190,18,60,0.03)':'transparent'}}>
                          {/* Icon */}
                          <div style={{width:isMobile?36:42,height:isMobile?36:42,borderRadius:12,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${color}30`}}>
                            <Wallet size={isMobile?13:16} color={color}/>
                          </div>
                          {/* Info */}
                          <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>setResumeFiche(c)}>
                            <div style={{fontSize:isMobile?13:14,fontWeight:700,color:'#c0c0e0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                              {c.entreprise||`${c.prenom||''} ${c.nom||''}`.trim()||'Sans nom'}
                            </div>
                            {c.typeClient==='b2b'&&c.entreprise&&(`${c.prenom||''} ${c.nom||''}`.trim())&&(
                              <div style={{fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                {`${c.prenom||''} ${c.nom||''}`.trim()}
                              </div>
                            )}
                            <div style={{fontSize:11,color:'#fff',marginTop:3,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                              {c.ville&&<span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={9}/>{c.ville}</span>}
                              <span style={{display:'flex',alignItems:'center',gap:3}}><Calendar size={9}/>{fmtDate(c.dateVente??c.createdAt)}</span>
                              {c.commissionPayee&&c.datePaiementCommission&&!isMobile&&(
                                <span style={{color:'#12b76a',fontWeight:700}}>· Payée le {fmtDate(c.datePaiementCommission)}</span>
                              )}
                            </div>
                            {annulee&&c.motifAnnulation&&<div style={{fontSize:10,color:'#be123c',marginTop:3,fontWeight:700}}>✕ {c.motifAnnulation}</div>}
                          </div>
                          {/* Fixe + Extra desktop */}
                          {!isMobile&&!annulee&&(c.commissionFixe>0||c.commissionExtra>0)&&(
                            <div style={{textAlign:'right',flexShrink:0}}>
                              {c.commissionFixe>0&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}>Fixe : <strong style={{color:'rgba(255,255,255,0.7)'}}>{fmtMoney(c.commissionFixe)}</strong></div>}
                              {c.commissionExtra>0&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}>Extra : <strong style={{color:'rgba(255,255,255,0.7)'}}>{fmtMoney(c.commissionExtra)}</strong></div>}
                            </div>
                          )}
                          {/* Montant */}
                          <div style={{textAlign:'right',flexShrink:0,minWidth:isMobile?70:90}}>
                            <div style={{fontSize:isMobile?15:18,fontWeight:900,color,lineHeight:1}}>{fmtMoney(c.commissionTotale)}</div>
                            {annulee&&<div style={{fontSize:9,color:'#be123c',fontWeight:700,marginTop:2}}>ANNULÉE</div>}
                          </div>
                          {/* Toggle */}
                          {annulee?(
                            <div style={{display:'flex',alignItems:'center',gap:4,padding:isMobile?'6px 10px':'8px 14px',borderRadius:20,fontSize:11,fontWeight:700,flexShrink:0,border:'1px solid rgba(190,18,60,0.3)',background:'rgba(190,18,60,0.08)',color:'#be123c'}}>
                              ❌{!isMobile&&' Annulée'}
                            </div>
                          ):(
                            <button onClick={()=>togglePaiement(c)}
                              style={{display:'flex',alignItems:'center',gap:isMobile?4:6,padding:isMobile?'6px 10px':'8px 16px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0,transition:'all 0.2s',
                                border:`1px solid ${c.commissionPayee?'rgba(18,183,106,0.3)':'rgba(247,144,9,0.3)'}`,
                                background:c.commissionPayee?'rgba(18,183,106,0.08)':'rgba(247,144,9,0.08)',
                                color:c.commissionPayee?'#12b76a':'#f79009'}}
                              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.04)'}
                              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                              {c.commissionPayee?<><CheckCircle size={13}/>{!isMobile&&' Payée'}</>:<><XCircle size={13}/>{!isMobile&&' Attente'}</>}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>}
      </div>

      {/* ════ ULTRAFICHE (readOnly) ════ */}
      {ultraFiche&&(
        <UltraFiche
          fiche={ultraFiche} settings={settings} readOnly
          onClose={()=>setUltraFiche(null)}
          onEdit={()=>{}} onDelete={async ()=>{}}
          onChangeStatus={()=>{}} onTogglePaiement={async ()=>{}}
          onAddNote={async ()=>{}} onDeleteNote={async ()=>{}}
        />
      )}

      {/* ════ MODAL RÉSUMÉ ════ */}
      {resumeFiche&&(
        <div onClick={()=>setResumeFiche(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(8px)',animation:'comm-fade-in 0.15s ease'}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:'rgba(2,8,16,0.98)',borderRadius:20,width:'100%',maxWidth:620,maxHeight:'85vh',display:'flex',flexDirection:'column',border:'1px solid rgba(18,183,106,0.2)',boxShadow:'0 24px 80px rgba(0,0,0,0.7)',animation:'comm-slide-up 0.2s ease'}}>
            {/* Header modal */}
            <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexShrink:0}}>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <div style={{fontSize:15,fontWeight:800,color:'#c0c0e0'}}>
                  {resumeFiche.entreprise||`${resumeFiche.prenom||''} ${resumeFiche.nom||''}`.trim()||'Sans nom'}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:resumeFiche.typeClient==='b2b'?'rgba(59,108,248,0.15)':'rgba(167,139,250,0.15)',color:resumeFiche.typeClient==='b2b'?'#3b6cf8':'#a78bfa',border:`1px solid ${resumeFiche.typeClient==='b2b'?'rgba(59,108,248,0.3)':'rgba(167,139,250,0.3)'}`}}>
                    {resumeFiche.typeClient==='b2b'?'🏢 B2B':'👤 B2C'}
                  </span>
                  {resumeFiche.typeCommerce&&<span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:700}}>{commerceLbl[resumeFiche.typeCommerce]||resumeFiche.typeCommerce}</span>}
                  {resumeFiche.ville&&<span style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}>· {resumeFiche.ville}</span>}
                </div>
                {resumeFiche.status&&(
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,background:`${STATUS_CLR[resumeFiche.status]}20`,color:STATUS_CLR[resumeFiche.status],border:`1px solid ${STATUS_CLR[resumeFiche.status]}40`,display:'inline-block',width:'fit-content'}}>
                    {STATUS_LBL[resumeFiche.status]||resumeFiche.status}
                  </span>
                )}
                {resumeFiche.qualificationSysteme&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}><span style={{fontWeight:700}}>Système : </span>{qualifLbl[resumeFiche.qualificationSysteme]||resumeFiche.qualificationSysteme}</div>}
                {resumeFiche.dateVente&&<div style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}><span style={{fontWeight:700}}>Date de vente : </span>{fmtDate(resumeFiche.dateVente)}</div>}
              </div>
              <button onClick={()=>setResumeFiche(null)}
                style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.8)',fontSize:22,lineHeight:1,flexShrink:0}}
                onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>×</button>
            </div>
            {/* Résumé */}
            <div style={{overflowY:'auto',flex:1,padding:20}}>
              {resumeFiche.summary
                ?<pre style={{fontFamily:'inherit',fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.75,whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0}}>{resumeFiche.summary}</pre>
                :<div style={{textAlign:'center',color:'#fff',fontSize:13,padding:'40px 0'}}>Aucun résumé</div>
              }
            </div>
            {/* Footer */}
            <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
              <button onClick={()=>{setUltraFiche(resumeFiche);setResumeFiche(null);}}
                style={{padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#12b76a,#61DAFB)',border:'none',color:'#030a16',fontSize:12,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 16px rgba(18,183,106,0.35)'}}>
                Voir la fiche complète →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

