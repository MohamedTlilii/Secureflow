'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Target, ArrowRight, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import UltraFiche from '@/components/solution-express/UltraFiche';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { DEFAULT_SETTINGS, MOIS_FULL } from '@/types';

/* ─── Colonnes pipeline ───────────────────────────────────── */
const STAGES: { key: StatusFiche; label: string; color: string }[] = [
  { key:'new',                    label:'Nouveau',               color:'#3b6cf8' },
  { key:'contacted',              label:'Contacté',              color:'#f79009' },
  { key:'proposal',               label:'Soumission',            color:'#a764f8' },
  { key:'installation_en_cours',  label:'Installation en cours', color:'#f97316' },
  { key:'installe',               label:'Installé',              color:'#22c55e' },
  { key:'installation_annulee',   label:'Annulée',               color:'#be123c' },
];

/* ─── Cosmos ─────────────────────────────────────────────── */
const PART_COLORS = ['#3b6cf8','#a78bfa','#12b76a','#f97316','#06b6d4'];
interface Star     { x:number; y:number; s:number; o:number; d:number }
interface Particle { x:number; y:number; s:number; d:number; delay:number; color:string }

const AV_COLORS = ['#3b6cf8','#06b6d4','#f59e0b','#f97316','#a78bfa'];

const getYear  = (f: SolutionExpress) => new Date(f.dateVente ?? f.createdAt).getFullYear().toString();
const getMonth = (f: SolutionExpress) => new Date(f.dateVente ?? f.createdAt).getMonth();
const ini = (f: SolutionExpress) => {
  const name = f.entreprise || `${f.prenom||''} ${f.nom||''}`.trim() || '?';
  const p = name.split(' ');
  return ((p[0]?.[0]||'')+(p[1]?.[0]||'')).toUpperCase() || '?';
};
const dName = (f: SolutionExpress) =>
  f.entreprise || `${f.prenom||''} ${f.nom||''}`.trim() || 'Sans nom';

/* ─── Mobile hook ────────────────────────────────────────── */
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

/* ─── ScoreRing ──────────────────────────────────────────── */
function ScoreRing({ value, max, color, label }: { value:number; max:number; color:string; label:string }) {
  const [a, setA] = useState(0);
  const r = 34; const circ = 2 * Math.PI * r;
  useEffect(() => { const t = setTimeout(() => setA(max>0?value/max:0), 200); return () => clearTimeout(t); }, [value, max]);
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:86, height:86 }}>
        <svg width={86} height={86} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={43} cy={43} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/>
          <circle cx={43} cy={43} r={r} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={circ*(1-a)}
            strokeLinecap="round" style={{ transition:'stroke-dashoffset 1s ease', filter:`drop-shadow(0 0 4px ${color})` }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:18, fontWeight:800, color, lineHeight:1 }}>{value}</div>
        </div>
      </div>
      <span style={{ fontSize:10, color:'#fff', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>{label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════ */
export default function PipelinePage() {
  const isMobile = useIsMobile();

  const [items,       setItems]       = useState<SolutionExpress[]>([]);
  const [settings,    setSettings]    = useState<Settings>(DEFAULT_SETTINGS);
  const [annee,       setAnnee]       = useState<string>(String(new Date().getFullYear()));
  const [mois,        setMois]        = useState<string>('tout');
  const [filtreComm,  setFiltreComm]  = useState<'tout'|'payee'|'non_payee'|'annulee'>('tout');
  const [loading,     setLoading]     = useState(true);
  const [dragId,      setDragId]      = useState<string|null>(null);
  const [over,        setOver]        = useState<string|null>(null);
  const [motifModal,  setMotifModal]  = useState<{ id:string }|null>(null);
  const [motif,       setMotif]       = useState('');
  const [mounted,     setMounted]     = useState(false);
  const [viewFiche,   setViewFiche]   = useState<SolutionExpress|null>(null);

  const starsRef = useRef<Star[]>([]);
  const partsRef = useRef<Particle[]>([]);

  /* ── cosmos ── */
  useEffect(() => {
    starsRef.current = Array.from({length:60},()=>({
      x:Math.random()*100, y:Math.random()*100,
      s:Math.random()*2+0.4, o:Math.random()*0.5+0.08, d:Math.random()*5+2,
    }));
    partsRef.current = Array.from({length:18},()=>({
      x:Math.random()*100, y:Math.random()*100+100,
      s:Math.random()*5+2, d:Math.random()*18+10, delay:Math.random()*8,
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
      setItems(Array.isArray(f.data) ? f.data : []);
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

  const svcMap = useMemo(() =>
    Object.fromEntries(settings.services.map(s=>[s.id,{label:s.label,color:s.color}])),
    [settings.services]);

  const leadLbl = useMemo(() =>
    Object.fromEntries(settings.typeLead.map(t=>[t.key,t.label])),
    [settings.typeLead]);

  /* ── filtrage ── */
  const filtered = useMemo(() => {
    let r = annee === 'tout' ? items : items.filter(f => getYear(f) === annee);
    if (annee !== 'tout' && mois !== 'tout') r = r.filter(f => getMonth(f) === Number(mois));
    if (filtreComm === 'payee')     r = r.filter(f => f.commissionPayee);
    if (filtreComm === 'non_payee') r = r.filter(f => !f.commissionPayee && f.status !== 'installation_annulee');
    if (filtreComm === 'annulee')   r = r.filter(f => f.status === 'installation_annulee');
    return r;
  }, [items, annee, mois, filtreComm]);

  const annees = useMemo(() =>
    [...new Set(items.map(getYear))].sort().reverse(),
    [items]);

  /* ── stats ── */
  const total     = filtered.length;
  const b2b       = filtered.filter(f=>f.typeClient==='b2b').length;
  const b2c       = filtered.filter(f=>f.typeClient==='b2c').length;
  const installe  = filtered.filter(f=>f.status==='installe').length;
  const annulees  = filtered.filter(f=>f.status==='installation_annulee').length;
  const enCours   = filtered.filter(f=>f.status==='installation_en_cours').length;
  const proposals = filtered.filter(f=>f.status==='proposal').length;
  const convRate  = total>0 ? Math.round((installe/total)*100) : 0;

  const serviceCounts = useMemo(() => {
    const map: Record<string,number> = {};
    filtered.forEach(f=>(f.produits as string[]).forEach(p=>{ map[p]=(map[p]||0)+1; }));
    return map;
  }, [filtered]);
  const activeServices = useMemo(()=>settings.services.filter(svc=>(serviceCounts[svc.id]||0)>0),[settings.services,serviceCounts]);

  /* ── drag & drop ── */
  const updateStatus = async (id: string, status: StatusFiche, motifAnnulation?: string) => {
    try {
      await api.put(`/api/leads/${id}`, { status, ...(motifAnnulation&&{motifAnnulation}) });
      setItems(prev=>prev.map(i=>i.id===id?{...i,status,...(motifAnnulation&&{motifAnnulation})}:i));
      toast.success(`→ ${STAGES.find(s=>s.key===status)?.label}`);
    } catch { toast.error('Erreur mise à jour'); }
  };

  const onDrop = (targetKey: StatusFiche) => {
    if (!dragId) return;
    if (targetKey==='installation_annulee') { setMotifModal({id:dragId}); setMotif(''); }
    else updateStatus(dragId, targetKey);
    setDragId(null); setOver(null);
  };

  const advance = async (f: SolutionExpress, e: React.MouseEvent) => {
    e.stopPropagation();
    const order = STAGES.map(s=>s.key);
    const idx   = order.indexOf(f.status);
    if (idx<order.length-1) await updateStatus(f.id, order[idx+1] as StatusFiche);
  };

  const confirmMotif = () => {
    if (!motifModal) return;
    updateStatus(motifModal.id, 'installation_annulee', motif||'Non spécifié');
    setMotifModal(null);
  };

  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{position:'relative',minHeight:'100vh',color:'#fff',overflow:'hidden'}}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:.08} 50%{opacity:.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:.4} to{transform:translateY(-100vh);opacity:0} }
        .pip-card:hover { transform:translateY(-2px)!important; }
      `}</style>

      {/* Fond cosmos (bleu/violet comme SE) */}
      <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(59,108,248,0.12) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 90% 50%,rgba(167,139,250,0.07) 0%,transparent 50%),#06060f',zIndex:0,pointerEvents:'none'}}/>
      {mounted&&starsRef.current.map((s,i)=>(
        <div key={i} style={{position:'fixed',left:`${s.x}%`,top:`${s.y}%`,width:s.s,height:s.s,borderRadius:'50%',background:'#fff',opacity:s.o,pointerEvents:'none',zIndex:0,animation:`twinkle-star ${s.d}s ease-in-out infinite`,animationDelay:`${i*0.08}s`}}/>
      ))}
      {mounted&&partsRef.current.map((p,i)=>(
        <div key={i} style={{position:'fixed',left:`${p.x}%`,bottom:`-${p.y}px`,width:p.s,height:p.s,borderRadius:'50%',background:p.color,opacity:0.4,pointerEvents:'none',zIndex:0,animation:`particle-rise ${p.d}s linear infinite`,animationDelay:`${p.delay}s`}}/>
      ))}

      <div style={{position:'relative',zIndex:1,padding:isMobile?'16px 12px 40px':'28px 32px 40px'}}>

        {/* ════════════════════════════════════════
            HEADER glassmorphism (style Solution Express)
            ════════════════════════════════════════ */}
        <div style={{padding:'1.5px',borderRadius:22,background:'linear-gradient(135deg,#a78bfa70,#3b6cf840,#12b76a25)',marginBottom:20,animation:'fadeSlideUp 0.4s ease both'}}>
          <div style={{background:'rgba(2,8,16,0.97)',borderRadius:'20.5px',padding:isMobile?'18px 16px':'28px 32px',backdropFilter:'blur(40px)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-80,left:-60,width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(167,139,250,0.18) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:-50,right:-30,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(59,108,248,0.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'relative',zIndex:1}}>

              {/* Titre + filtres */}
              <div style={{display:'flex',alignItems:isMobile?'flex-start':'center',justifyContent:'space-between',flexDirection:isMobile?'column':'row',gap:isMobile?12:0,marginBottom:20}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#c084fc,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 6px 28px rgba(192,132,252,0.55)',flexShrink:0}}>
                    <Target size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{margin:0,fontSize:isMobile?20:26,fontWeight:900,letterSpacing:-0.5,background:'linear-gradient(135deg,#fff 30%,#c084fc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                      Pipeline
                    </h1>
                    <p style={{margin:0,marginTop:3,fontSize:13,color:'#a78bfa',fontWeight:700}}>
                      {total} lead{total!==1?'s':''}
                    </p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {!isMobile&&(
                    <div style={{fontSize:12,color:'#fff',background:'rgba(255,255,255,0.05)',padding:'6px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',whiteSpace:'nowrap',fontWeight:700,textTransform:'capitalize'}}>
                      {new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                    </div>
                  )}
<select value={annee} onChange={e=>{setAnnee(e.target.value);setMois('tout');}}
                    style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                    <option value="tout">Toutes les années</option>
                    {annees.map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                  {annee!=='tout'&&(
                    <select value={mois} onChange={e=>setMois(e.target.value)}
                      style={{fontSize:12,padding:'7px 14px',borderRadius:9,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.06)',color:'#fff',cursor:'pointer',outline:'none',fontWeight:700}}>
                      <option value="tout">Tous les mois</option>
                      {MOIS_FULL.map((m,i)=><option key={i} value={String(i)}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Stats cards compactes */}
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(6,1fr)',gap:10,marginBottom:16}}>
                {STAGES.map((s,i)=>{
                  const cnt=filtered.filter(f=>f.status===s.key).length;
                  return (
                    <div key={s.key} style={{background:`${s.color}10`,borderRadius:12,padding:'10px 14px',border:`1px solid ${s.color}25`,animation:`fadeSlideUp 0.4s ${i*0.05}s ease both`}}>
                      <div style={{fontSize:10,color:s.color,fontWeight:700,textTransform:'uppercase',letterSpacing:0.8,marginBottom:4}}>{s.label}</div>
                      <div style={{fontSize:isMobile?18:22,fontWeight:900,color:s.color,lineHeight:1}}>
                        <AnimatedNumber value={cnt} decimals={0} color={s.color}/>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            KANBAN
            ════════════════════════════════════════ */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {([['tout','Tout','#a78bfa'],['payee','✓ Payée','#12b76a'],['non_payee','⏳ Attente','#f79009'],['annulee','✕ Annulée','#be123c']] as const).map(([k,l,c])=>(
              <button key={k} onClick={()=>setFiltreComm(k)}
                style={{fontSize:10,padding:'4px 10px',borderRadius:7,border:`1px solid ${filtreComm===k?c:'rgba(255,255,255,0.1)'}`,background:filtreComm===k?`${c}25`:'transparent',color:filtreComm===k?c:'rgba(255,255,255,0.8)',cursor:'pointer',fontWeight:700,transition:'all 0.2s'}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:320,gap:16}}>
            <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(167,139,250,0.15)',borderTopColor:'#a78bfa',animation:'spin 0.8s linear infinite',boxShadow:'0 0 20px rgba(167,139,250,0.3)'}}/>
            <span style={{fontSize:14,color:'#fff'}}>Chargement…</span>
          </div>
        ):(
          <div style={{display:'flex',gap:12,alignItems:'flex-start',paddingBottom:24,overflowX:'auto',scrollSnapType:isMobile?'x mandatory':'none',WebkitOverflowScrolling:'touch'}}>
            {STAGES.map((stage,stageIdx)=>{
              const colItems = filtered
                .filter(f=>f.status===stage.key)
                .sort((a,b)=>new Date(b.dateVente??b.createdAt).getTime()-new Date(a.dateVente??a.createdAt).getTime());
              const isOver = over===stage.key;

              return (
                <div key={stage.key}
                  onDragOver={e=>{e.preventDefault();setOver(stage.key);}}
                  onDragLeave={()=>setOver(null)}
                  onDrop={()=>onDrop(stage.key)}
                  style={{scrollSnapAlign:isMobile?'start':'none',background:isOver?`${stage.color}10`:'rgba(2,8,16,0.97)',borderRadius:16,padding:12,border:isOver?`2px dashed ${stage.color}`:`1px solid ${stage.color}30`,display:'flex',flexDirection:'column',minWidth:isMobile?'85vw':colItems.length===0?140:240,maxWidth:isMobile?'85vw':colItems.length===0?160:280,transition:'all 0.2s',animation:`fadeSlideUp 0.4s ${stageIdx*0.06}s ease both`,flexShrink:0,backdropFilter:'blur(20px)',boxShadow:`0 4px 20px ${stage.color}15`}}>

                  {/* En-tête colonne */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:stage.color,boxShadow:`0 0 6px ${stage.color}80`}}/>
                      <span style={{fontSize:11,fontWeight:800,color:'#fff',textTransform:'uppercase',letterSpacing:0.6}}>{stage.label}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:800,background:colItems.length>0?`${stage.color}18`:'rgba(255,255,255,0.04)',color:colItems.length>0?stage.color:'#fff',borderRadius:20,padding:'2px 10px',border:`1px solid ${colItems.length>0?stage.color+'30':'rgba(255,255,255,0.08)'}`}}>
                      {colItems.length}
                    </span>
                  </div>

                  {/* Mini barre remplissage */}
                  <div style={{height:3,borderRadius:2,background:'rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:10}}>
                    <div style={{height:'100%',borderRadius:2,background:stage.color,width:`${total>0?Math.round((colItems.length/total)*100):0}%`,transition:'width 1s ease'}}/>
                  </div>

                  {/* Cards */}
                  <div style={{display:'flex',flexDirection:'column',gap:8,flex:1,maxHeight:560,overflowY:'auto'}}>
                    {colItems.map((f,i)=>{
                      const isDragging = dragId===f.id;
                      const dCurr  = new Date(f.dateVente??f.createdAt);
                      const dPrev  = i>0 ? new Date(colItems[i-1].dateVente??colItems[i-1].createdAt) : null;
                      const showSep = !dPrev || dCurr.getMonth()!==dPrev.getMonth() || dCurr.getFullYear()!==dPrev.getFullYear();
                      const avColor = AV_COLORS[i % AV_COLORS.length];

                      return (
                        <div key={f.id}>
                          {showSep&&(
                            <div style={{display:'flex',alignItems:'center',gap:6,margin:'4px 0 2px'}}>
                              <div style={{flex:1,height:1,background:`${stage.color}25`}}/>
                              <span style={{fontSize:9,fontWeight:700,color:stage.color,letterSpacing:0.8,textTransform:'uppercase'}}>
                                {MOIS_FULL[dCurr.getMonth()]} {dCurr.getFullYear()}
                              </span>
                              <div style={{flex:1,height:1,background:`${stage.color}25`}}/>
                            </div>
                          )}
                          <div
                            className="pip-card"
                            draggable
                            onDragStart={()=>setDragId(f.id)}
                            onDragEnd={()=>{setDragId(null);setOver(null);}}
                            onClick={()=>{ if(!dragId) setViewFiche(f); }}
                            style={{background:'rgba(4,10,24,0.97)',border:`1px solid ${stage.color}25`,borderLeft:`3px solid ${stage.color}`,borderRadius:12,padding:'12px 12px 10px',cursor:'grab',transition:'all 0.2s',opacity:isDragging?0.4:1,transform:isDragging?'scale(0.96)':'scale(1)',animation:`fadeSlideUp 0.3s ${Math.min(i*0.05,0.4)}s ease both`,boxShadow:`0 2px 12px rgba(0,0,0,0.2)`}}>

                            {/* Avatar + nom */}
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                              <div style={{width:32,height:32,borderRadius:9,background:`${avColor}20`,border:`1px solid ${avColor}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:11,fontWeight:800,color:avColor}}>
                                {ini(f)}
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:5}}>
                                  <div style={{fontSize:13,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:'#fff',flex:1,minWidth:0}}>
                                    {dName(f)}
                                  </div>
                                  {f.typeClient&&(
                                    <span style={{fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:20,flexShrink:0,background:f.typeClient==='b2b'?'rgba(59,108,248,0.15)':'rgba(18,183,106,0.15)',color:f.typeClient==='b2b'?'#3b6cf8':'#12b76a',border:`1px solid ${f.typeClient==='b2b'?'rgba(59,108,248,0.3)':'rgba(18,183,106,0.3)'}`}}>
                                      {f.typeClient==='b2b'?'🏢 B2B':'🏠 B2C'}
                                    </span>
                                  )}
                                </div>
                                {(f.prenom||f.nom)&&f.entreprise&&(
                                  <div style={{fontSize:11,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginTop:1}}>
                                    {`${f.prenom||''} ${f.nom||''}`.trim()}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ville */}
                            {f.ville&&(
                              <div style={{fontSize:11,color:'#fff',marginBottom:7,display:'flex',alignItems:'center',gap:4}}>
                                <MapPin size={9}/> {f.ville}
                              </div>
                            )}

                            {/* Lead type */}
                            {f.leadType&&(
                              <div style={{marginBottom:7}}>
                                <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'rgba(167,100,248,0.12)',color:'#a764f8',border:'1px solid rgba(167,100,248,0.25)'}}>
                                  🎯 {leadLbl[f.leadType]||f.leadType}
                                </span>
                              </div>
                            )}

                            {/* Produits */}
                            {(f.produits as string[]).length>0&&(
                              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:7}}>
                                {(f.produits as string[]).slice(0,3).map(code=>{
                                  const svc=svcMap[code];
                                  if(!svc) return null;
                                  return <span key={code} style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:20,background:`${svc.color}15`,color:svc.color,border:`1px solid ${svc.color}30`}}>{svc.label}</span>;
                                })}
                              </div>
                            )}

                            {/* Urgence */}
                            {(f.urgencyScore||0)>0&&(
                              <div style={{marginBottom:7}}>
                                <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:f.urgencyScore>=7?'rgba(240,68,56,0.1)':'rgba(247,144,9,0.1)',color:f.urgencyScore>=7?'#f04438':'#f79009',border:`1px solid ${f.urgencyScore>=7?'rgba(240,68,56,0.2)':'rgba(247,144,9,0.2)'}`}}>
                                  ⚡ {f.urgencyScore}/10
                                </span>
                              </div>
                            )}

                            {/* Commission */}
                            {(f.commissionTotale||0)>0&&(
                              <div style={{marginBottom:stage.key!=='installe'&&stage.key!=='installation_annulee'?8:0}}>
                                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'rgba(18,183,106,0.12)',color:'#12b76a',border:'1px solid rgba(18,183,106,0.25)'}}>
                                  💰 {f.commissionTotale} TND
                                </span>
                              </div>
                            )}

                            {/* Motif annulation */}
                            {stage.key==='installation_annulee'&&f.motifAnnulation&&(
                              <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 9px',borderRadius:8,background:'rgba(190,18,60,0.08)',border:'1px solid rgba(190,18,60,0.2)',marginBottom:0}}>
                                <span style={{fontSize:11,color:'#fff',fontWeight:700}}>Motif :</span>
                                <span style={{fontSize:11,color:'#be123c',fontWeight:700}}>{f.motifAnnulation}</span>
                              </div>
                            )}

                            {/* Bouton Avancer */}
                            {stage.key!=='installe'&&stage.key!=='installation_annulee'&&(
                              <button onClick={e=>advance(f,e)}
                                style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'6px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s',border:`1px solid ${stage.color}40`,background:`${stage.color}08`,color:stage.color,marginTop:8}}
                                onMouseEnter={e=>{e.currentTarget.style.background=`${stage.color}18`;e.currentTarget.style.transform='scale(1.02)';}}
                                onMouseLeave={e=>{e.currentTarget.style.background=`${stage.color}08`;e.currentTarget.style.transform='scale(1)';}}>
                                Avancer <ArrowRight size={11}/>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {colItems.length===0&&(
                      <div style={{textAlign:'center',padding:'24px 0',color:'#fff',fontSize:12,borderRadius:10,border:`2px dashed ${isOver?stage.color:'#fff'}`,transition:'border-color 0.2s',background:isOver?`${stage.color}04`:'transparent'}}>
                        {isOver?'Déposer ici':'Vide'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal motif annulation ── */}
      {motifModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'linear-gradient(135deg,rgba(11,11,34,0.98),rgba(8,8,24,0.98))',border:'1px solid rgba(190,18,60,0.3)',borderRadius:20,padding:'26px 28px',width:'100%',maxWidth:400,boxShadow:'0 40px 100px rgba(0,0,0,0.7)'}}>
            <div style={{fontSize:18,fontWeight:800,color:'#be123c',marginBottom:6}}>⚠️ Confirmer l'annulation</div>
            <p style={{fontSize:13,color:'#fff',marginBottom:18}}>Pourquoi cette installation a-t-elle été annulée ?</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
              {settings.motifsAnnulation.map(m=>(
                <button key={m} onClick={()=>{setMotif(m);}}
                  style={{padding:'11px 16px',borderRadius:10,border:`1px solid ${motif===m?'rgba(190,18,60,0.5)':'rgba(190,18,60,0.2)'}`,background:motif===m?'rgba(190,18,60,0.15)':'rgba(190,18,60,0.06)',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',textAlign:'left',transition:'all 0.15s'}}>
                  {m}
                </button>
              ))}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setMotifModal(null)} style={{flex:1,padding:'10px 0',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#fff',fontSize:13,cursor:'pointer'}}>Annuler</button>
              <button onClick={confirmMotif} style={{flex:1,padding:'10px 0',background:'#be123c',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 16px rgba(190,18,60,0.4)'}}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Détail fiche — lecture seule */}
      {viewFiche && (
        <UltraFiche
          fiche={viewFiche}
          settings={settings}
          readOnly
          onClose={() => setViewFiche(null)}
          onEdit={() => {}}
          onDelete={() => {}}
          onChangeStatus={() => {}}
          onTogglePaiement={() => {}}
          onAddNote={async () => {}}
          onDeleteNote={async () => {}}
        />
      )}
    </div>
  );
}

