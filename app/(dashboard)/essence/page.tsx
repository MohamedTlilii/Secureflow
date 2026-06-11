'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Fuel, TrendingUp, AlertCircle, CheckCircle, Clock,
  MessageSquare, Download, BarChart2, Activity,
  Edit3, X, Check, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { EssenceMois } from '@/types';
import { MOIS_LABELS, MOIS_FULL } from '@/types';

/* ─── types ──────────────────────────────────────────── */
interface EssenceStats {
  totalAttendu:number; totalRecu:number; totalManquant:number;
  pctRecu:number; moisRecus:number; moisTotal:number;
}
interface ToggleRes { nextAnnee?:number }
const DEF:EssenceStats = { totalAttendu:0,totalRecu:0,totalManquant:0,pctRecu:0,moisRecus:0,moisTotal:0 };

/* ─── cosmos ─────────────────────────────────────────── */
const PART_COLORS = ['#f59e0b','#f97316','#fbbf24','#3b6cf8','#12b76a'];
interface Star     { x:number;y:number;s:number;o:number;d:number }
interface Particle { x:number;y:number;s:number;d:number;delay:number;color:string }

/* ─── helpers ────────────────────────────────────────── */
const pctCol = (p:number) => p>=80?'#12b76a':p>=40?'#f59e0b':'#ef4444';

/* ─── NoteModal ──────────────────────────────────────── */
function NoteModal({ doc, anneeLabel, onClose, onSave }:{
  doc:EssenceMois; anneeLabel:string;
  onClose:()=>void; onSave:(n:string)=>void;
}) {
  const [txt, setTxt] = useState(doc.note||'');
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'linear-gradient(135deg,rgba(11,11,34,0.98),rgba(8,8,24,0.98))',border:'1px solid rgba(245,158,11,0.3)',borderRadius:22,padding:'28px 30px',width:400,boxShadow:'0 40px 80px rgba(0,0,0,0.7)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#f59e0b',margin:0}}>
            💬 Note — {MOIS_FULL[doc.mois]} {anneeLabel}
          </h3>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#8b8b9e'}}>
            <X size={14}/>
          </button>
        </div>
        <textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={4} placeholder="Ajouter une note…"
          style={{width:'100%',padding:'10px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'#fff',fontSize:13,resize:'vertical',outline:'none',boxSizing:'border-box'}}/>
        <div style={{display:'flex',gap:10,marginTop:18}}>
          <button onClick={onClose} style={{flex:1,padding:'10px 0',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#8b8b9e',fontSize:13,cursor:'pointer'}}>Annuler</button>
          <button onClick={()=>onSave(txt)} style={{flex:1,padding:'10px 0',background:'linear-gradient(135deg,#f59e0b,#d97706)',border:'none',borderRadius:10,color:'#000',fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 16px rgba(245,158,11,0.4)'}}>Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════ */
export default function EssencePage() {
  const [data,      setData]      = useState<EssenceMois[]>([]);
  const [annees,    setAnnees]    = useState<number[]>([]);
  const [annee,     setAnnee]     = useState<string>(String(new Date().getFullYear()));
  const [loading,   setLoading]   = useState(true);
  const [chartType, setChartType] = useState<'bar'|'area'>('bar');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editVal,   setEditVal]   = useState('');
  const [noteModal, setNoteModal] = useState<EssenceMois|null>(null);
  const [mounted,   setMounted]   = useState(false);

  const starsRef  = useRef<Star[]>([]);
  const partsRef  = useRef<Particle[]>([]);
  const anneesRef = useRef<number[]>([]);

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
  },[]);

  /* ── fetch annees ── */
  const fetchAnnees = useCallback(async()=>{
    try {
      const r = await api.get<number[]>('/api/essence/annees');
      setAnnees(r.data);
      anneesRef.current = r.data;
    } catch {
      toast.error('Erreur chargement des années');
      setLoading(false);
    }
  },[]);

  /* ── fetch data ── */
  const fetchData = useCallback(async(yr:string)=>{
    setLoading(true);
    try {
      if(yr==='tout'){
        const yrs = anneesRef.current;
        if(!yrs.length){ setLoading(false); return; }
        const results = await Promise.all(yrs.map(y=>api.get<EssenceMois[]>(`/api/essence?annee=${y}`)));
        const allData = results.flatMap(r=>r.data).sort((a,b)=>b.annee-a.annee||b.mois-a.mois);
        setData(allData);
      } else {
        const rd = await api.get<EssenceMois[]>(`/api/essence?annee=${yr}`);
        setData(rd.data);
      }
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ fetchAnnees().then(()=>fetchData(annee)); },[fetchAnnees]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{
    const h=()=>{ if(!document.hidden) fetchData(annee); };
    document.addEventListener('visibilitychange',h);
    return ()=>document.removeEventListener('visibilitychange',h);
  },[fetchData,annee]);

  const handleAnneeChange=(yr:string)=>{ setAnnee(yr); fetchData(yr); };

  const deleteAnnee=async(yr:number)=>{
    if(!confirm(`Supprimer toutes les données ${yr} ?`)) return;
    try {
      await api.delete(`/api/essence/annees/${yr}`);
      const newAnnees=annees.filter(y=>y!==yr);
      setAnnees(newAnnees);
      anneesRef.current=newAnnees;
      toast.success(`Année ${yr} supprimée`);
      const newSel=String(new Date().getFullYear());
      setAnnee(newSel); fetchData(newSel);
    } catch { toast.error('Erreur suppression'); }
  };

  const patchData = (id:string, patch:Partial<EssenceMois>) =>
    setData(prev=>prev.map(m=>m.id===id?{...m,...patch}:m));

  /* ── toggle reçu ── */
  const toggleRecu=async(doc:EssenceMois)=>{
    if(doc.mois===11&&!doc.recu){
      if(!confirm(`Marquer Décembre comme reçu va clôturer l'année ${doc.annee}. Continuer ?`)) return;
    }
    try {
      const newRecu = !doc.recu;
      const res = await api.put<ToggleRes>(`/api/essence/${doc.id}`,{recu:newRecu});
      patchData(doc.id,{recu:newRecu,dateReception:newRecu?new Date().toISOString():null});
      toast.success(newRecu?'✅ Marqué reçu !':'Marqué en attente');
      if(res.data?.nextAnnee&&annee!=='tout'){
        toast.success(`🎉 Passage à ${res.data.nextAnnee}`);
        await fetchAnnees();
        const yr=String(res.data.nextAnnee);
        setAnnee(yr); fetchData(yr);
      }
    } catch { toast.error('Erreur'); }
  };

  /* ── save note ── */
  const saveNote=async(note:string)=>{
    if(!noteModal) return;
    try {
      await api.put(`/api/essence/${noteModal.id}`,{note});
      patchData(noteModal.id,{note});
      setNoteModal(null);
      toast.success('Note sauvegardée');
    } catch { toast.error('Erreur'); }
  };

  /* ── inline montant ── */
  const saveMontant=async(doc:EssenceMois)=>{
    const v=parseFloat(editVal);
    if(isNaN(v)||v<0){ setEditingId(null); return; }
    try {
      await api.put(`/api/essence/${doc.id}`,{montantAttendu:+v.toFixed(3)});
      patchData(doc.id,{montantAttendu:+v.toFixed(3)});
      setEditingId(null);
      toast.success('Montant mis à jour');
    } catch {
      toast.error('Erreur — montant non sauvegardé');
      setEditingId(null);
    }
  };

  /* ── export CSV ── */
  const exportCSV=()=>{
    const rows=[
      ['Année','Mois','Montant','Reçu','Date réception','Note'],
      ...data.map(m=>[m.annee,MOIS_FULL[m.mois],m.montantAttendu.toFixed(3),m.recu?'Oui':'Non',m.dateReception??'',m.note??'']),
    ];
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');
    a.href=url; a.download=`essence-${annee==='tout'?'toutes':annee}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  /* ── alerte ── */
  const alertMois=useMemo(()=>{
    if(annee==='tout'||!data.length) return null;
    const now=new Date();
    const prev=now.getMonth()===0?{mois:11,annee:now.getFullYear()-1}:{mois:now.getMonth()-1,annee:now.getFullYear()};
    if(String(prev.annee)!==annee) return null;
    const doc=data.find(m=>m.mois===prev.mois);
    return doc&&!doc.recu?doc:null;
  },[data,annee]);

  /* ── chart data ── */
  const chartData=useMemo(()=>{
    if(annee==='tout') return [];
    let ca=0,cr=0;
    return [...data].sort((a,b)=>a.mois-b.mois).map(m=>{
      ca+=m.montantAttendu;
      cr+=m.recu?m.montantAttendu:0;
      return { name:MOIS_LABELS[m.mois], Attendu:+m.montantAttendu.toFixed(2), Reçu:m.recu?+m.montantAttendu.toFixed(2):0, cumAtt:+ca.toFixed(2), cumRec:+cr.toFixed(2) };
    });
  },[data,annee]);

  const stats = useMemo<EssenceStats>(()=>{
    if(!data.length) return DEF;
    const totalAttendu  = data.reduce((s,m)=>s+m.montantAttendu,0);
    const totalRecu     = data.filter(m=>m.recu).reduce((s,m)=>s+m.montantAttendu,0);
    const totalManquant = Math.max(0,totalAttendu-totalRecu);
    const moisRecus     = data.filter(m=>m.recu).length;
    const moisTotal     = data.length;
    const pctRecu       = totalAttendu>0?Math.round((totalRecu/totalAttendu)*100):0;
    return {totalAttendu,totalRecu,totalManquant,pctRecu,moisRecus,moisTotal};
  },[data]);

  const pc=pctCol(stats.pctRecu);
  const curYear=new Date().getFullYear();
  const anneesFiltre=[...new Set([curYear,...annees.filter(y=>y<=curYear)])].sort((a,b)=>b-a);
  const now = new Date();
  const dataVisible = data.filter(m =>
    annee === 'tout'
      ? (m.annee < now.getFullYear() || m.mois <= now.getMonth())
      : (Number(annee) !== now.getFullYear() || m.mois <= now.getMonth())
  );

  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{position:'relative',minHeight:'100vh',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:.08} 50%{opacity:.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:.4} to{transform:translateY(-100vh);opacity:0} }
        .ess-row:hover { background:rgba(255,255,255,0.035)!important; }
      `}</style>

      {/* Fond cosmos */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(245,158,11,0.12) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 90% 50%,rgba(249,115,22,0.07) 0%,transparent 50%),#06060f',zIndex:0,pointerEvents:'none'}}/>
      {mounted&&starsRef.current.map((s,i)=>(
        <div key={i} style={{position:'fixed',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:'50%',background:'#fff',opacity:s.o,pointerEvents:'none',zIndex:0,animation:`twinkle-star ${s.d}s ease-in-out infinite`,animationDelay:`${i*0.08}s`}}/>
      ))}
      {mounted&&partsRef.current.map((p,i)=>(
        <div key={i} style={{position:'fixed',left:`${p.x}%`,bottom:`-${p.y}px`,width:p.s,height:p.s,borderRadius:'50%',background:p.color,opacity:0.4,pointerEvents:'none',zIndex:0,animation:`particle-rise ${p.d}s linear infinite`,animationDelay:`${p.delay}s`}}/>
      ))}

      <div style={{position:'relative',zIndex:1,padding:'28px 32px 40px'}}>

        {/* ── Alerte ── */}
        {alertMois&&(
          <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:14,padding:'13px 18px',marginBottom:16,animation:'fadeSlideUp .4s ease both'}}>
            <AlertCircle size={16} color="#ef4444"/>
            <span style={{fontSize:13,fontWeight:600}}>
              ⚠️ <strong>{MOIS_FULL[alertMois.mois]} {alertMois.annee}</strong> n&apos;a pas encore été marqué comme reçu.
            </span>
          </div>
        )}

        {/* ════════════════════════════════════════
            HEADER glassmorphism
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:22,background:'linear-gradient(135deg,#f59e0b70,#d9770640,#12b76a25)',marginBottom:20,animation:'fadeSlideUp 0.4s ease both'}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'20.5px',padding:'28px 32px',backdropFilter:'blur(40px)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-80,left:-60,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,0.18) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-40,right:-20,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(217,119,6,0.14) 0%,transparent 70%)',pointerEvents:'none'}}/>

            <div style={{position:'relative',zIndex:1}}>
              {/* Titre + actions */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(245,158,11,0.55)',flexShrink:0}}>
                    <Fuel size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{margin:0,fontSize:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#f59e0b)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                      Essence
                    </h1>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                      <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Indemnité carburant</span>
                      <span style={{fontSize:13,color:'rgba(255,255,255,0.35)'}}>· <span style={{color:'#f59e0b',fontWeight:700}}>{data.length}</span> mois</span>
                    </div>
                  </div>
                </div>

                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.05)',padding:'6px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.08)',whiteSpace:'nowrap'}}>
                    {new Date().toLocaleDateString('fr-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                  </div>
                  <select value={annee} onChange={e=>handleAnneeChange(e.target.value)}
                    style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                    <option value="tout">Toutes les années</option>
                    {anneesFiltre.map(y=><option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  {annee!=='tout'&&Number(annee)!==curYear&&(
                    <button onClick={()=>deleteAnnee(Number(annee))}
                      title={`Supprimer ${annee}`}
                      style={{display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,borderRadius:9,border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#ef4444',cursor:'pointer',flexShrink:0}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,0.2)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='rgba(239,68,68,0.08)')}>
                      <Trash2 size={14}/>
                    </button>
                  )}
                  <button onClick={exportCSV}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'10px 22px',borderRadius:13,border:'none',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 20px rgba(245,158,11,0.45)',whiteSpace:'nowrap'}}
                    onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.04)')}
                    onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
                    <Download size={16}/> Export CSV
                  </button>
                </div>
              </div>

              {/* Stats cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                {[
                  {label:'En attente',    value:stats.totalManquant, color:'#f59e0b', Icon:TrendingUp,  decimals:0},
                  {label:'Total reçu',    value:stats.totalRecu,     color:'#12b76a', Icon:CheckCircle, decimals:0},
                  {label:'Total annuel',  value:stats.totalAttendu,  color:'#6366f1', Icon:AlertCircle, decimals:0},
                ].map((s,i)=>(
                  <div key={i} style={{background:`${s.color}12`,borderRadius:12,padding:'12px 16px',border:`1px solid ${s.color}25`,animation:`fadeSlideUp 0.4s ${i*0.06}s ease both`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <div style={{fontSize:10,color:s.color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.8}}>{s.label}</div>
                      <div style={{background:`${s.color}18`,borderRadius:7,padding:'4px 5px',display:'flex'}}>
                        <s.Icon size={12} color={s.color}/>
                      </div>
                    </div>
                    <div style={{fontSize:24,fontWeight:900,lineHeight:1}}>
                      <AnimatedNumber value={s.value} decimals={s.decimals} color={s.color}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* Barre progression */}
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                  <span>Mois reçus · {stats.moisRecus} / {stats.moisTotal}</span>
                  <span style={{fontWeight:700,color:pc}}>{stats.pctRecu}%</span>
                </div>
                <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.07)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,background:`linear-gradient(90deg,#f59e0b,${pc})`,width:`${stats.pctRecu}%`,transition:'width 1.2s ease',boxShadow:`0 0 12px rgba(245,158,11,0.4)`}}/>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            CHARTS
            ════════════════════════════════════════ */}
        {annee!=='tout'&&chartData.length>0&&(
          <div style={{padding:'1px',borderRadius:18,background:'linear-gradient(135deg,#f59e0b30,#d9770620)',marginBottom:16}}>
            <div style={{background:'rgba(2,8,16,0.97)',borderRadius:17,padding:'18px 22px',backdropFilter:'blur(20px)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
                <span style={{fontWeight:800,fontSize:14,color:'rgba(255,255,255,0.8)'}}>Visualisation {annee}</span>
                <div style={{display:'flex',gap:8}}>
                  {([['bar','Barres',BarChart2],['area','Cumulatif',Activity]] as const).map(([t,label,Icon])=>(
                    <button key={t} onClick={()=>setChartType(t)}
                      style={{display:'flex',alignItems:'center',gap:5,padding:'6px 14px',borderRadius:9,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
                        background:chartType===t?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.05)',
                        color:chartType===t?'#f59e0b':'rgba(255,255,255,0.4)'}}>
                      <Icon size={13}/>{label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                {chartType==='bar'?(
                  <BarChart data={chartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" tick={{fill:'rgba(255,255,255,0.35)',fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'rgba(255,255,255,0.35)',fontSize:11}} axisLine={false} tickLine={false} width={50} tickFormatter={v=>`${v}`}/>
                    <Tooltip contentStyle={{background:'rgba(2,8,16,0.97)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,fontSize:12}} labelStyle={{color:'#f59e0b',fontWeight:700}} formatter={(v:number)=>[`${v.toFixed(2)} TND`]}/>
                    <Bar dataKey="Attendu" fill="rgba(245,158,11,0.25)" radius={[4,4,0,0]}/>
                    <Bar dataKey="Reçu"    fill="#12b76a"              radius={[4,4,0,0]}/>
                  </BarChart>
                ):(
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#12b76a" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#12b76a" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" tick={{fill:'rgba(255,255,255,0.35)',fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'rgba(255,255,255,0.35)',fontSize:11}} axisLine={false} tickLine={false} width={50}/>
                    <Tooltip contentStyle={{background:'rgba(2,8,16,0.97)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,fontSize:12}} labelStyle={{color:'#f59e0b',fontWeight:700}} formatter={(v:number)=>[`${v.toFixed(2)} TND`]}/>
                    <Area type="monotone" dataKey="cumAtt" name="Attendu cumulé" stroke="#f59e0b" fill="url(#gAtt)" strokeWidth={2}/>
                    <Area type="monotone" dataKey="cumRec" name="Reçu cumulé"    stroke="#12b76a" fill="url(#gRec)" strokeWidth={2}/>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            LISTE MENSUELLE
            ════════════════════════════════════════ */}
        {loading?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:320,gap:16}}>
            <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(245,158,11,0.15)',borderTopColor:'#f59e0b',animation:'spin 0.8s linear infinite',boxShadow:'0 0 20px rgba(245,158,11,0.3)'}}/>
            <span style={{fontSize:14,color:'rgba(255,255,255,0.35)',letterSpacing:0.3}}>Chargement…</span>
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {dataVisible.map((m,i)=>(
              <div key={m.id} className="ess-row"
                style={{display:'flex',alignItems:'center',gap:14,
                  background:m.recu?'rgba(18,183,106,0.05)':'rgba(255,255,255,0.02)',
                  backdropFilter:'blur(12px)',
                  border:`1px solid ${m.recu?'rgba(18,183,106,0.2)':'rgba(255,255,255,0.06)'}`,
                  borderRadius:14,padding:'14px 18px',transition:'all 0.15s',
                  animation:`fadeSlideUp 0.35s ${i*0.04}s ease both`}}>

                {/* Icon */}
                <div style={{flexShrink:0,width:40,height:40,borderRadius:12,
                  background:m.recu?'rgba(18,183,106,0.15)':'rgba(245,158,11,0.08)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  border:`1px solid ${m.recu?'rgba(18,183,106,0.25)':'rgba(245,158,11,0.15)'}`}}>
                  <Fuel size={15} color={m.recu?'#12b76a':'#f59e0b'}/>
                </div>

                {/* Mois */}
                <div style={{minWidth:150}}>
                  <div style={{fontWeight:800,fontSize:14,color:m.recu?'#12b76a':'rgba(255,255,255,0.9)'}}>
                    {MOIS_FULL[m.mois]}{annee==='tout'?` ${m.annee}`:''}
                  </div>
                  {m.dateReception&&(
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:3}}>
                      Reçu le {new Date(m.dateReception).toLocaleDateString('fr-CA')}
                    </div>
                  )}
                </div>

                {/* Montant éditable */}
                <div style={{flex:1}}>
                  {editingId===m.id?(
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <input type="number" value={editVal} onChange={e=>setEditVal(e.target.value)}
                        autoFocus step="0.001"
                        style={{width:120,padding:'6px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:8,color:'#fff',fontSize:13,outline:'none'}}
                        onKeyDown={e=>{ if(e.key==='Enter') saveMontant(m); if(e.key==='Escape') setEditingId(null); }}/>
                      <button onClick={()=>saveMontant(m)} style={{background:'rgba(18,183,106,0.15)',border:'1px solid rgba(18,183,106,0.3)',borderRadius:7,padding:'5px 7px',cursor:'pointer',color:'#12b76a',display:'flex'}}><Check size={13}/></button>
                      <button onClick={()=>setEditingId(null)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:7,padding:'5px 7px',cursor:'pointer',color:'#ef4444',display:'flex'}}><X size={13}/></button>
                    </div>
                  ):(
                    <div style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer'}}
                      onClick={()=>{ setEditingId(m.id); setEditVal(String(m.montantAttendu)); }}>
                      <span style={{fontSize:17,fontWeight:900,color:'#f59e0b',letterSpacing:-0.5}}>
                        {Math.round(m.montantAttendu)} TND
                      </span>
                      <Edit3 size={12} color="rgba(255,255,255,0.25)"/>
                    </div>
                  )}
                  {m.note&&(
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontStyle:'italic',marginTop:3}}>💬 {m.note}</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setNoteModal(m)}
                    style={{display:'flex',alignItems:'center',gap:5,background:'rgba(59,108,248,0.1)',border:'1px solid rgba(59,108,248,0.2)',borderRadius:9,padding:'7px 12px',color:'#3b6cf8',cursor:'pointer',fontSize:12,fontWeight:700}}>
                    <MessageSquare size={13}/> Note
                  </button>
                  <button onClick={()=>toggleRecu(m)}
                    style={{display:'flex',alignItems:'center',gap:5,
                      background:m.recu?'rgba(18,183,106,0.15)':'rgba(255,255,255,0.05)',
                      border:`1px solid ${m.recu?'rgba(18,183,106,0.25)':'rgba(255,255,255,0.09)'}`,
                      borderRadius:9,padding:'7px 14px',
                      color:m.recu?'#12b76a':'rgba(255,255,255,0.5)',
                      cursor:'pointer',fontSize:12,fontWeight:800,transition:'all 0.15s'}}>
                    {m.recu?<><CheckCircle size={13}/> Reçu</>:<><Clock size={13}/> En attente</>}
                  </button>
                </div>
              </div>
            ))}
            {data.length===0&&(
              <div style={{textAlign:'center',padding:'80px 0',color:'rgba(255,255,255,0.3)',fontSize:14}}>
                Aucune donnée pour {annee==='tout'?'toutes les années':annee}
              </div>
            )}
          </div>
        )}

      </div>

      {noteModal&&(
        <NoteModal doc={noteModal} anneeLabel={annee==='tout'?String(noteModal.annee):annee} onClose={()=>setNoteModal(null)} onSave={saveNote}/>
      )}
    </div>
  );
}
