'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Wallet, TrendingUp, CheckCircle, XCircle, MapPin, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { apiErrMsg } from '@/lib/api';
import { getCachedSettings } from '@/lib/settings-cache';
import useIsMobile from '@/hooks/useIsMobile';
import CosmosBackground from '@/components/CosmosBackground';
import AnimatedNumber from '@/components/AnimatedNumber';
import UltraFiche from '@/components/solution-express/UltraFiche';
import type { SolutionExpress, Settings } from '@/types';
import { DEFAULT_SETTINGS, MOIS_FULL, STATUS_COLOR as STATUS_CLR, STATUS_LABEL as STATUS_LBL } from '@/types';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate  = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR',{year:'numeric',month:'short',day:'numeric'}) : '—';
const fmtMoney = (v: number) => `${(v||0).toFixed(2)} TND`;

/* ─── constantes ──────────────────────────────────────────── */
const COMM_PART_COLORS = ['#12b76a','#61DAFB','#3b6cf8','#a78bfa','#f59e0b'];

/* ─── interfaces ─── */
interface ChartBar { name:string; total:number; color?:string; count?:number; cPayee?:number; cAttente?:number; cAnnulee?:number; annulee?:boolean; fullNom?:string; motif?:string; payee?:boolean }
interface CommStats {
  totalGagne:number; totalPaye:number; enAttente:number; totalAnnule:number;
  maximum:number; minimum:number;
  objectif:number; objPct:number;
  nActives:number; nPayees:number; nAttente:number; nAnnulees:number;
  annees:number[]; chartData:ChartBar[];
  historique:SolutionExpress[]; histTotal:number;
}

/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════ */
export default function CommissionsPage() {
  const isMobile = useIsMobile();

  const [settings,    setSettings]    = useState<Settings>(DEFAULT_SETTINGS);
  const [annee,       setAnnee]       = useState<string>(String(new Date().getFullYear()));
  const [filtre,      setFiltre]      = useState<'tout'|'payee'|'non_payee'|'annulee'>('tout');
  const [selectedMois, setSelectedMois] = useState<number | null>(null);
  const [historique,     setHistorique]     = useState<SolutionExpress[]>([]);
  const [histTotal,      setHistTotal]      = useState(0);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [togglingId,  setTogglingId]  = useState<string | null>(null);
  const [resumeFiche, setResumeFiche] = useState<SolutionExpress|null>(null);
  const [ultraFiche,  setUltraFiche]  = useState<SolutionExpress|null>(null);
  const [loading,     setLoading]     = useState(true);

  const monthCache = useRef<Record<string, CommStats>>({});
  const ctrlRef    = useRef<AbortController | null>(null);

  /* ── fetch settings (labels uniquement) ── */
  useEffect(() => {
    getCachedSettings().then(s => { if (s) setSettings(s); });
  }, []);

  /* ── helpers labels ── */
  const commerceLbl = useMemo(() =>
    Object.fromEntries(settings.typeCommerce.map(t=>[t.key,t.label])),
    [settings.typeCommerce]);
  const qualifLbl = useMemo(() =>
    Object.fromEntries(settings.qualificationSysteme.map(q=>[q.key,q.label])),
    [settings.qualificationSysteme]);

  /* ── Stats depuis le backend ── */
  const [commStats, setCommStats] = useState<CommStats | null>(null);

  useEffect(() => { monthCache.current = {}; }, [annee, filtre]);
  useEffect(() => { setHistorique([]); setHistTotal(0); }, [annee, selectedMois, filtre]);

  const fetchStats = useCallback(async (force = false) => {
    const calAnnee = annee !== 'tout' ? Number(annee) : new Date().getFullYear();
    const key = `${annee}-${selectedMois ?? 'all'}`;
    if (!force && monthCache.current[key]) {
      const cached = monthCache.current[key];
      setCommStats(cached);
      setHistorique(cached.historique ?? []);
      setHistTotal(cached.histTotal ?? 0);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    let canceled = false;
    setLoading(true);
    try {
      const { data } = await api.get<CommStats>('/api/commissions/stats', {
        params: { annee, filtre, calAnnee, calMois: selectedMois ?? -1, histOffset: 0 },
        signal: ctrl.signal,
      });
      monthCache.current[key] = data;
      setCommStats(data);
      setHistorique(data.historique ?? []);
      setHistTotal(data.histTotal ?? 0);
    } catch (e) {
      if ((e as {name?:string}).name === 'CanceledError') { canceled = true; return; }
      toast.error(apiErrMsg(e, 'Erreur chargement'));
    } finally { if (!canceled) setLoading(false); }
  }, [annee, filtre, selectedMois]);

  useEffect(() => {
    fetchStats();
    const onVis = () => { if (!document.hidden) fetchStats(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      ctrlRef.current?.abort();
    };
  }, [fetchStats]);

  /* ── toggle paiement ── */
  const togglePaiement = async (f: SolutionExpress) => {
    if (togglingId) return;
    setTogglingId(f.id);
    try {
      await api.put(`/api/leads/${f.id}`, {
        commissionPayee: !f.commissionPayee,
        datePaiementCommission: !f.commissionPayee ? new Date().toISOString() : null,
      });
      toast.success(!f.commissionPayee ? '✓ Commission payée !' : 'Marquée non payée');
      fetchStats(true);
    } catch (e) { toast.error(apiErrMsg(e, 'Erreur paiement')); }
    finally { setTogglingId(null); }
  };

  /* ── charger plus d'historique ── */
  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const calAnnee = annee !== 'tout' ? Number(annee) : new Date().getFullYear();
    try {
      const { data } = await api.get<CommStats>('/api/commissions/stats', {
        params: { annee, filtre, calAnnee, calMois: selectedMois ?? -1, histOffset: historique.length },
      });
      setHistorique(prev => [...prev, ...(data.historique ?? [])]);
      setHistTotal(data.histTotal ?? 0);
    } catch (e) { toast.error(apiErrMsg(e, 'Erreur chargement')); }
    finally { setLoadingMore(false); }
  };

  /* ── raccourcis stats depuis backend ── */
  const annees        = useMemo(() => (commStats?.annees ?? []).map(String), [commStats?.annees]);
  const totalGagne    = commStats?.totalGagne  ?? 0;
  const totalPaye     = commStats?.totalPaye   ?? 0;
  const enAttente     = commStats?.enAttente   ?? 0;
  const totalAnnule   = commStats?.totalAnnule ?? 0;
  const maximum       = commStats?.maximum     ?? 0;
  const minimum       = commStats?.minimum     ?? 0;
  const objectif      = commStats?.objectif    ?? 0;
  const objPct        = commStats?.objPct      ?? 0;
  const nActives      = commStats?.nActives    ?? 0;
  const nPayees       = commStats?.nPayees     ?? 0;
  const nAttenteCount = commStats?.nAttente    ?? 0;
  const nAnnulees     = commStats?.nAnnulees   ?? 0;
  const chartData     = commStats?.chartData   ?? [];

  const todayLabel = useMemo(() =>
    new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
  []);

  const sortedHistorique = useMemo(() =>
    [...historique].sort((a, b) => {
      const ta = a.dateVente ? Date.parse(a.dateVente) : 0;
      const tb = b.dateVente ? Date.parse(b.dateVente) : 0;
      return tb - ta;
    }),
  [historique]);

  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{position:'relative',minHeight:'100vh',color:'#fff',overflow:'hidden'}}>

      {/* Cosmos vert/teal */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(18,183,106,0.12) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 90% 50%,rgba(97,218,251,0.07) 0%,transparent 50%),#06060f',zIndex:0,pointerEvents:'none'}}/>
      <CosmosBackground particleColors={COMM_PART_COLORS} />

      <div style={{position:'relative',zIndex:1,padding:isMobile?'16px 12px 40px':'28px 32px 40px'}}>

        {/* ════════════════════════════════════════
            HEADER
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:22,background:'linear-gradient(135deg,#ef444470,#dc262640,#a78bfa25)',marginBottom:20,animation:'fadeSlideUp 0.4s ease both'}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'20.5px',padding:isMobile?'18px 16px':'28px 32px',backdropFilter:'blur(40px)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-80,left:-60,width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(18,183,106,0.20) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-50,right:-30,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(97,218,251,0.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'relative',zIndex:1}}>

              {/* Titre + actions */}
              <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',flexDirection:isMobile?'column':'row',gap:isMobile?12:0}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#ef4444,#dc2626)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(239,68,68,0.55)',flexShrink:0}}>
                    <Wallet size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{margin:0,fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#ef4444)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                      Commissions
                    </h1>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {!isMobile&&(
                    <div style={{fontSize:12,color:'#fff',background:'rgba(255,255,255,0.05)',padding:'6px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',whiteSpace:'nowrap',fontWeight:700,textTransform:'capitalize'}}>
                      {todayLabel}
                    </div>
                  )}
                  <select value={annee} onChange={e=>{setAnnee(e.target.value);setFiltre('tout');setSelectedMois(null);}}
                    style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                    <option value="tout">Toutes les années</option>
                    {annees.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                  {annee!=='tout'&&(
                    <select value={selectedMois===null?'tout':String(selectedMois)} onChange={e=>setSelectedMois(e.target.value==='tout'?null:parseInt(e.target.value))}
                      style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                      <option value="tout">Tous les mois</option>
                      {MOIS_FULL.map((m,i)=><option key={i} value={String(i)}>{m}</option>)}
                    </select>
                  )}
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
          <div style={{gridColumn:isMobile?'1 / -1':'auto',padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#22c55e70,#16a34a35)',animation:'fadeSlideUp 0.4s 0.05s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px 18px':'22px 26px',backdropFilter:'blur(20px)',display:'flex',alignItems:'center',gap:14,height:'100%'}}>
              <div style={{width:isMobile?44:52,height:isMobile?44:52,borderRadius:14,background:'linear-gradient(135deg,#22c55e,#16a34a)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 4px 20px rgba(34,197,94,0.5)'}}>
                <TrendingUp size={isMobile?18:22} color="#fff"/>
              </div>
              <div>
                <div style={{fontSize:10,color:'#22c55e',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Total gagné</div>
                <div style={{fontSize:isMobile?20:26,fontWeight:900,color:'#22c55e',lineHeight:1}}>
                  <AnimatedNumber value={totalGagne} decimals={0} color="#22c55e" suffix=" TND"/>
                </div>
                <div style={{fontSize:11,color:'#fff',marginTop:5}}>
                  {nActives} vente{nActives!==1?'s':''} · moy. {fmtMoney(totalGagne/Math.max(nActives,1))}
                </div>
              </div>
            </div>
          </div>

          {/* Payé */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#3b6cf860,#3b82f620)',animation:'fadeSlideUp 0.4s 0.1s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#3b6cf8',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>✓ Payé</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={totalPaye} decimals={0} color="#3b6cf8" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'#fff',marginTop:5}}>{nPayees} ventes</div>
            </div>
          </div>

          {/* Attente */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#f7900960,#f0443820)',animation:'fadeSlideUp 0.4s 0.15s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#f79009',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>⏳ Attente</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={enAttente} decimals={0} color="#f79009" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'#fff',marginTop:5}}>{nAttenteCount} ventes</div>
            </div>
          </div>

          {/* Max */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#a78bfa60,#61DAFB20)',animation:'fadeSlideUp 0.4s 0.2s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#a78bfa',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>↑ Max</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={maximum} decimals={0} color="#a78bfa" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'#fff',marginTop:5}}>meilleure</div>
            </div>
          </div>

          {/* Min */}
          <div style={{padding:'1px',borderRadius:16,background:'linear-gradient(135deg,rgba(139,139,158,0.4),rgba(97,218,251,0.1))',animation:'fadeSlideUp 0.4s 0.25s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#8b8b9e',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>↓ Min</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={minimum} decimals={0} color="#8b8b9e" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'#fff',marginTop:5}}>plus petite</div>
            </div>
          </div>

          {/* Annulé */}
          <div style={{gridColumn:isMobile?'1 / -1':'auto',padding:'1px',borderRadius:16,background:'linear-gradient(135deg,#be123c60,#f0443820)',animation:'fadeSlideUp 0.4s 0.3s ease both'}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:15,padding:isMobile?'14px 12px':'18px 16px',backdropFilter:'blur(20px)',textAlign:'center',height:'100%'}}>
              <div style={{fontSize:10,color:'#be123c',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:8}}>✕ Annulé</div>
              <div style={{fontSize:isMobile?16:20,fontWeight:900,lineHeight:1}}>
                <AnimatedNumber value={totalAnnule} decimals={0} color="#be123c" suffix=" TND"/>
              </div>
              <div style={{fontSize:10,color:'#fff',marginTop:5}}>{nAnnulees} vente{nAnnulees!==1?'s':''}</div>
            </div>
          </div>
        </div>

        {/* Objectif annuel */}
        {annee!=='tout'&&objectif>0&&(
          <div style={{marginBottom:16,background:'rgba(18,183,106,0.05)',borderRadius:12,padding:'12px 18px',border:'1px solid rgba(18,183,106,0.15)'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#fff',marginBottom:4}}>
              <span style={{fontWeight:700}}>Objectif {selectedMois !== null ? MOIS_FULL[selectedMois] + ' ' : ''}{annee}</span>
              <span style={{fontSize:12}}>
                {totalPaye>0&&<span style={{color:'#3b6cf8',fontWeight:800}}>{totalPaye.toFixed(0)}</span>}
                {totalPaye>0&&(enAttente>0||totalAnnule>0)&&<span style={{color:'#fff'}}> + </span>}
                {enAttente>0&&<span style={{color:'#f79009',fontWeight:800}}>{enAttente.toFixed(0)}</span>}
                {enAttente>0&&totalAnnule>0&&<span style={{color:'#fff'}}> + </span>}
                {totalAnnule>0&&<span style={{color:'#be123c',fontWeight:800}}>{totalAnnule.toFixed(0)}</span>}
                {totalPaye===0&&enAttente===0&&totalAnnule===0&&<span style={{color:'#fff'}}>0</span>}
                <span style={{color:'#fff',fontWeight:800}}> / {objectif} TND — </span>
                <span style={{color:objPct>=100?'#22c55e':'#f79009',fontWeight:800}}>{objPct}%</span>
              </span>
            </div>
            <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.08)',overflow:'hidden',display:'flex'}}>
              {objectif>0&&(()=>{
                const cappedTotal = Math.min(totalGagne, objectif);
                const payePct    = cappedTotal > 0 ? (Math.min(totalPaye,   cappedTotal) / objectif) * 100 : 0;
                const attentePct = cappedTotal > 0 ? (Math.min(enAttente,   cappedTotal - Math.min(totalPaye, cappedTotal)) / objectif) * 100 : 0;
                return (<>
                  <div style={{height:'100%',background:'#3b6cf8',width:`${payePct}%`,   transition:'width 1.2s ease'}}/>
                  <div style={{height:'100%',background:'#f79009',width:`${attentePct}%`, transition:'width 1.2s ease'}}/>
                </>);
              })()}</div>
          </div>
        )}

        {/* ════════════════════════════════════════
            GRAPHIQUE
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a50,#61DAFB25,#a78bfa15)',marginBottom:20}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',padding:isMobile?'16px':'20px 24px',backdropFilter:'blur(20px)'}}>
            <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8,flexDirection:isMobile?'column':'row'}}>
              <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>
                Commissions par {annee==='tout'?'année':'mois'} {annee!=='tout'&&<span style={{color:'#22c55e'}}>{annee}</span>}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {([['tout','Tout','#22c55e'],['payee','✓ Payée','#3b6cf8'],['non_payee','⏳ Attente','#f79009'],['annulee','✕ Annulée','#be123c']] as const).map(([k,l,c])=>(
                  <button key={k} onClick={()=>setFiltre(k)}
                    style={{fontSize:10,padding:'4px 10px',borderRadius:7,border:`1px solid ${filtre===k?c:'rgba(255,255,255,0.1)'}`,background:filtre===k?`${c}25`:'transparent',color:filtre===k?c:'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:700,transition:'all 0.2s'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isMobile?120:160}>
              <BarChart data={chartData} barSize={isMobile?14:22} margin={{top:0,right:0,bottom:0,left:0}}>
                <XAxis dataKey="name" tick={{fill:'#fff',fontSize:isMobile?8:10}} axisLine={false} tickLine={false}/>
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
                        {annee!=='tout'&&<div style={{color:'#fff',fontWeight:700,marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.fullNom}</div>}
                        <div style={{color:d.color||'#22c55e',fontWeight:700,marginBottom:4}}>{fmtMoney(d.total)}</div>
                        {annee!=='tout'?(
                          <>
                            <div style={{color:d.annulee?'#be123c':'#22c55e'}}>{d.annulee?'❌ Annulée':'✅ Installé'}</div>
                            {d.annulee&&d.motif&&<div style={{color:'#be123c',fontSize:11,marginTop:2}}>✕ {d.motif}</div>}
                            {!d.annulee&&<div style={{color:d.payee?'#3b6cf8':'#f79009',fontSize:11,marginTop:2}}>{d.payee?'✓ Payée':'⏳ Non payée'}</div>}
                          </>
                        ):(
                          <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:2}}>
                            {d.cPayee>0&&<div style={{color:'#3b6cf8',fontSize:11}}>✓ {d.cPayee} payée{d.cPayee>1?'s':''}</div>}
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
            HISTORIQUE
            ════════════════════════════════════════ */}
        {annee!=='tout'&&(
          <>
            {/* ─── Historique ─── */}
            <div style={{padding:'1.5px',borderRadius:18,background:'linear-gradient(135deg,#12b76a40,#a78bfa20)'}}>
              <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'16.5px',overflow:'hidden',backdropFilter:'blur(20px)'}}>
                <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'linear-gradient(135deg,rgba(18,183,106,0.08),transparent)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>
                    Historique — {selectedMois!==null?MOIS_FULL[selectedMois]+' '+annee:'Année '+annee}
                  </div>
                  {histTotal>0&&(
                    <div style={{fontSize:11,color:'#fff',background:'rgba(255,255,255,0.04)',padding:'3px 12px',borderRadius:20,border:'1px solid rgba(255,255,255,0.08)',fontWeight:700}}>
                      <span style={{color:'#fff',fontWeight:800}}>{histTotal}</span> vente{histTotal!==1?'s':''}
                    </div>
                  )}
                </div>

                {loading?(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',border:'3px solid rgba(239,68,68,0.15)',borderTopColor:'#ef4444',animation:'spin 0.8s linear infinite'}}/>
                  </div>
                ):historique.length===0?(
                  <div style={{textAlign:'center',padding:'60px 20px'}}>
                    <div style={{width:60,height:60,borderRadius:18,background:'rgba(18,183,106,0.06)',border:'1px solid rgba(18,183,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                      <Wallet size={28} color="#12b76a" style={{opacity:0.4}}/>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:4}}>Aucune commission</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>
                      {selectedMois!==null?MOIS_FULL[selectedMois]+' '+annee:'Année '+annee}
                    </div>
                  </div>
                ):(
                  <div>
                    {sortedHistorique.map((c,i,arr)=>{
                        const annulee = c.status==='installation_annulee';
                        const color   = annulee?'#be123c':c.commissionPayee?'#3b6cf8':'#f79009';
                        return (
                          <div key={c.id} className="comm-row"
                            style={{display:'flex',alignItems:'center',gap:isMobile?10:14,padding:isMobile?'12px 14px':'14px 20px',borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.06)':'none',transition:'all 0.15s',background:annulee?'rgba(190,18,60,0.03)':'transparent'}}>
                            <div style={{width:isMobile?36:42,height:isMobile?36:42,borderRadius:12,background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${color}30`}}>
                              <Wallet size={isMobile?13:16} color={color}/>
                            </div>
                            <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>setResumeFiche(c)}>
                              <div style={{fontSize:isMobile?13:14,fontWeight:700,color:color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                {c.entreprise||`${c.prenom||''} ${c.nom||''}`.trim()||'Sans nom'}
                              </div>
                              {c.typeClient==='b2b'&&c.entreprise&&(`${c.prenom||''} ${c.nom||''}`.trim())&&(
                                <div style={{fontSize:11,color:'#fff',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                                  {`${c.prenom||''} ${c.nom||''}`.trim()}
                                </div>
                              )}
                              <div style={{fontSize:11,color:'#fff',marginTop:3,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                {c.ville&&<span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={9}/>{c.ville}</span>}
                                <span style={{display:'flex',alignItems:'center',gap:3}}><Calendar size={9}/>{fmtDate(c.dateVente)}</span>
                                {c.commissionPayee&&c.datePaiementCommission&&!isMobile&&(
                                  <span style={{color:'#3b6cf8',fontWeight:700}}>· Payée le {fmtDate(c.datePaiementCommission)}</span>
                                )}
                              </div>
                              {annulee&&c.motifAnnulation&&<div style={{fontSize:10,color:'#be123c',marginTop:3,fontWeight:700}}>✕ {c.motifAnnulation}</div>}
                            </div>
                            {!isMobile&&(c.commissionFixe>0||c.commissionExtra>0)&&(
                              <div style={{textAlign:'right',flexShrink:0}}>
                                {c.commissionFixe>0&&<div style={{fontSize:11,color:'#fff'}}>Fixe : <strong>{fmtMoney(c.commissionFixe)}</strong></div>}
                                {c.commissionExtra>0&&<div style={{fontSize:11,color:'#fff'}}>Extra : <strong>{fmtMoney(c.commissionExtra)}</strong></div>}
                              </div>
                            )}
                            <div style={{textAlign:'right',flexShrink:0,minWidth:isMobile?70:90}}>
                              <div style={{fontSize:isMobile?15:18,fontWeight:900,color,lineHeight:1}}>{fmtMoney(c.commissionTotale)}</div>
                              {annulee&&<div style={{fontSize:9,color:'#be123c',fontWeight:700,marginTop:2}}>ANNULÉE</div>}
                            </div>
                            {annulee?(
                              <div style={{display:'flex',alignItems:'center',gap:4,padding:isMobile?'6px 10px':'8px 14px',borderRadius:20,fontSize:11,fontWeight:700,flexShrink:0,border:'1px solid rgba(190,18,60,0.3)',background:'rgba(190,18,60,0.08)',color:'#be123c'}}>
                                ❌{!isMobile&&' Annulée'}
                              </div>
                            ):(
                              <button onClick={()=>togglePaiement(c)} disabled={!!togglingId}
                                style={{display:'flex',alignItems:'center',gap:isMobile?4:6,padding:isMobile?'6px 10px':'8px 16px',borderRadius:20,fontSize:11,fontWeight:700,cursor:togglingId?'wait':'pointer',flexShrink:0,transition:'all 0.2s',opacity:togglingId===c.id?0.6:1,
                                  border:`1px solid ${c.commissionPayee?'rgba(59,108,248,0.3)':'rgba(247,144,9,0.3)'}`,
                                  background:c.commissionPayee?'rgba(59,108,248,0.08)':'rgba(247,144,9,0.08)',
                                  color:c.commissionPayee?'#3b6cf8':'#f79009'}}
                                onMouseEnter={e=>{if(!togglingId)e.currentTarget.style.transform='scale(1.04)';}}
                                onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}>
                                {c.commissionPayee?<><CheckCircle size={13}/>{!isMobile&&' Payée'}</>:<><XCircle size={13}/>{!isMobile&&' Attente'}</>}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    {historique.length < histTotal && (
                      <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,0.06)',textAlign:'center'}}>
                        <button onClick={loadMore} disabled={loadingMore}
                          style={{padding:'9px 28px',borderRadius:10,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.04)',color:'#fff',fontSize:12,fontWeight:700,cursor:loadingMore?'not-allowed':'pointer',opacity:loadingMore?0.5:1}}>
                          {loadingMore ? 'Chargement…' : `Afficher plus (${histTotal - historique.length} restants)`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
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
                <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>
                  {resumeFiche.entreprise||`${resumeFiche.prenom||''} ${resumeFiche.nom||''}`.trim()||'Sans nom'}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:resumeFiche.typeClient==='b2b'?'rgba(59,108,248,0.15)':'rgba(167,139,250,0.15)',color:resumeFiche.typeClient==='b2b'?'#3b6cf8':'#a78bfa',border:`1px solid ${resumeFiche.typeClient==='b2b'?'rgba(59,108,248,0.3)':'rgba(167,139,250,0.3)'}`}}>
                    {resumeFiche.typeClient==='b2b'?'🏢 B2B':'👤 B2C'}
                  </span>
                  {resumeFiche.typeCommerce&&<span style={{fontSize:11,color:'#fff',fontWeight:700}}>{commerceLbl[resumeFiche.typeCommerce]||resumeFiche.typeCommerce}</span>}
                  {resumeFiche.ville&&<span style={{fontSize:11,color:'#fff'}}>· {resumeFiche.ville}</span>}
                </div>
                {resumeFiche.status&&(
                  <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,background:`${STATUS_CLR[resumeFiche.status]}20`,color:STATUS_CLR[resumeFiche.status],border:`1px solid ${STATUS_CLR[resumeFiche.status]}40`,display:'inline-block',width:'fit-content'}}>
                    {STATUS_LBL[resumeFiche.status]||resumeFiche.status}
                  </span>
                )}
                {resumeFiche.qualificationSysteme&&<div style={{fontSize:11,color:'#fff'}}><span style={{fontWeight:700}}>Système : </span>{qualifLbl[resumeFiche.qualificationSysteme]||resumeFiche.qualificationSysteme}</div>}
                {resumeFiche.dateVente&&<div style={{fontSize:11,color:'#fff'}}><span style={{fontWeight:700}}>Date de vente : </span>{fmtDate(resumeFiche.dateVente)}</div>}
              </div>
              <button onClick={()=>setResumeFiche(null)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#fff',fontSize:22,lineHeight:1,flexShrink:0}}
                onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.4)'}>×</button>
            </div>
            {/* Résumé */}
            <div style={{overflowY:'auto',flex:1,padding:20}}>
              {resumeFiche.summary
                ?<pre style={{fontFamily:'inherit',fontSize:13,color:'#fff',lineHeight:1.75,whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0}}>{resumeFiche.summary}</pre>
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

