'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Trash2, Database as DbIcon, MapPin, HardDrive, Building2, Filter, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { SolutionExpress, DbStats, Settings, StatusFiche } from '@/types';
import { STATUS_LABEL, STATUS_COLOR, VALID_STATUTS, MOIS_FULL } from '@/types';
import UltraFiche from '@/components/solution-express/UltraFiche';

/* ─── Cosmos ─── */
const PART_COLORS = ['#06b6d4','#3b6cf8','#a78bfa','#12b76a','#f59e0b'];
interface Star       { x:number; y:number; s:number; o:number; d:number }
interface Particle   { x:number; y:number; s:number; d:number; delay:number; color:string }

/* ─── Mobile hook ─── */
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

/* ─── Input style (thead filters) ─── */
const inpSt: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)',
  color: '#fff', fontSize: 12, outline: 'none', transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};

export default function DatabasePage() {
  const isMobile = useIsMobile();

  const [leads,    setLeads]    = useState<SolutionExpress[]>([]);
  const [dbStats,  setDbStats]  = useState<DbStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [anneeFiltre, setAnneeFiltre] = useState(String(new Date().getFullYear()));
  const [moisFiltre,  setMoisFiltre]  = useState<string>('tout');
  const [selected, setSelected] = useState<SolutionExpress | null>(null);
  const [filters, setFilters] = useState({
    prenom:'', nom:'', email:'', telephone:'', entreprise:'', ville:'', typeClient:'', status:'',
  });
  const [mounted, setMounted] = useState(false);
  const starsRef = useRef<Star[]>([]);
  const partsRef = useRef<Particle[]>([]);

  /* ── Cosmos init ── */
  useEffect(() => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random()*100, y: Math.random()*100,
      s: Math.random()*2+0.4, o: Math.random()*0.5+0.08, d: Math.random()*5+2,
    }));
    partsRef.current = Array.from({ length: 18 }, () => ({
      x: Math.random()*100, y: Math.random()*100+100,
      s: Math.random()*5+2, d: Math.random()*18+10, delay: Math.random()*8,
      color: PART_COLORS[Math.floor(Math.random()*PART_COLORS.length)],
    }));
    setMounted(true);
  }, []);

  /* ── Fetch ── */
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get<SolutionExpress[]>('/api/leads');
      setLeads(Array.isArray(r.data) ? r.data : []);
    } catch { setLeads([]); }
    finally { setLoading(false); }
  }, []);

  const fetchDbStats = useCallback(async () => {
    try {
      const r = await api.get<DbStats>('/api/database/stats');
      setDbStats(r.data);
    } catch { setDbStats(null); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const r = await api.get<Settings>('/api/settings');
      setSettings(r.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchDbStats();
    fetchSettings();
    const onVis = () => { if (!document.hidden) { fetchLeads(); fetchDbStats(); fetchSettings(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchLeads, fetchDbStats, fetchSettings]);

  /* ── Computed ── */
  const getYear = (f: SolutionExpress) =>
    String(new Date(f.dateVente ?? f.createdAt ?? Date.now()).getFullYear());

  const annees = useMemo(() =>
    [...new Set(leads.map(getYear))].sort().reverse(), [leads]);

  const fichesByAnnee = useMemo(() => {
    let r = anneeFiltre === 'tout' ? leads : leads.filter(f => getYear(f) === anneeFiltre);
    if (anneeFiltre !== 'tout' && moisFiltre !== 'tout')
      r = r.filter(f => new Date(f.dateVente ?? f.createdAt ?? Date.now()).getMonth() === Number(moisFiltre));
    return r;
  }, [leads, anneeFiltre, moisFiltre]);

  const villesDispos = useMemo(() =>
    settings?.villes?.length ? [...settings.villes].sort() :
    [...new Set(leads.map(f => f.ville).filter(Boolean))].sort(),
  [settings, leads]);

  const setF = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }));

  const displayData = useMemo(() => fichesByAnnee.filter(item =>
    (item.prenom     ||'').toLowerCase().includes(filters.prenom.toLowerCase()) &&
    (item.nom        ||'').toLowerCase().includes(filters.nom.toLowerCase()) &&
    (item.email      ||'').toLowerCase().includes(filters.email.toLowerCase()) &&
    (item.telephone  ||'').includes(filters.telephone) &&
    (item.entreprise ||'').toLowerCase().includes(filters.entreprise.toLowerCase()) &&
    (!filters.ville      || item.ville      === filters.ville) &&
    (!filters.typeClient || item.typeClient === filters.typeClient) &&
    (!filters.status     || item.status     === filters.status)
  ).sort((a,b) => new Date(b.dateVente ?? b.createdAt ?? 0).getTime() - new Date(a.dateVente ?? a.createdAt ?? 0).getTime()),
  [fichesByAnnee, filters]);

  const hasFilters = Object.values(filters).some(Boolean);

  const clearFilters = () => setFilters({ prenom:'', nom:'', email:'', telephone:'', entreprise:'', ville:'', typeClient:'', status:'' });

  /* ── Delete ── */
  const handleDelete = async (item: SolutionExpress) => {
    const name = item.entreprise || `${item.prenom||''} ${item.nom||''}`.trim() || 'cette fiche';
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try {
      await api.delete(`/api/leads/${item.id}`);
      setLeads(prev => prev.filter(l => l.id !== item.id));
      toast.success('Supprimé');
      fetchDbStats();
    } catch { toast.error('Erreur de suppression'); }
  };

  /* ── Storage bar color ── */
  const pct        = dbStats?.storagePercent ?? 0;
  const barColor   = pct >= 80 ? '#f04438' : pct >= 50 ? '#f79009' : '#12b76a';

  /* ── Column header style ── */
  const thSt: React.CSSProperties = {
    padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.05em', textTransform: 'uppercase',
    background: 'rgba(2,8,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#c0c0e0', whiteSpace: 'nowrap',
  };
  const tdSt: React.CSSProperties = {
    padding: '13px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#c0c0e0',
  };

  return (
    <div style={{ position:'relative', minHeight:'100vh', color:'#fff', overflow:'hidden' }}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:0.08} 50%{opacity:0.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:0.4} to{transform:translateY(-100vh);opacity:0} }
        .db-inp:focus { border-color:#3b6cf8 !important; }
        .db-sel:focus { border-color:#3b6cf8 !important; }
      `}</style>

      {/* ── Cosmos background ── */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(6,182,212,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 90% 60%, rgba(59,108,248,0.07) 0%, transparent 50%), #06060f', zIndex:0, pointerEvents:'none' }}/>
      {mounted && starsRef.current.map((s,i) => (
        <div key={i} style={{ position:'fixed', left:`${s.x}%`, top:`${s.y}%`, width:s.s, height:s.s, borderRadius:'50%', background:'#fff', opacity:s.o, pointerEvents:'none', zIndex:0, animation:`twinkle-star ${s.d}s ease-in-out infinite`, animationDelay:`${i*0.08}s` }}/>
      ))}
      {mounted && partsRef.current.map((p,i) => (
        <div key={i} style={{ position:'fixed', left:`${p.x}%`, bottom:`-${p.y}px`, width:p.s, height:p.s, borderRadius:'50%', background:p.color, opacity:0.4, pointerEvents:'none', zIndex:0, animation:`particle-rise ${p.d}s linear infinite`, animationDelay:`${p.delay}s` }}/>
      ))}

      <div style={{ position:'relative', zIndex:1, padding: isMobile ? '16px 12px 40px' : '28px 32px 40px' }}>

        {/* ════════════════════════════════════════
            HEADER glassmorphism
            ════════════════════════════════════════ */}
        <div style={{ padding:'1.5px', borderRadius:22, background:'linear-gradient(135deg,#06b6d460,#3b6cf830,#a78bfa25)', marginBottom:20, animation:'fadeSlideUp 0.4s ease both' }}>
          <div style={{ background:'rgba(2,8,16,0.97)', borderRadius:'20.5px', padding: isMobile ? '18px 16px' : '28px 32px', backdropFilter:'blur(40px)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, left:-60, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(6,182,212,0.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-50, right:-30, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,108,248,0.10) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'relative', zIndex:1 }}>

              {/* Titre + sélecteur année */}
              <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#06b6d4,#0891b2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 28px rgba(6,182,212,0.5)', flexShrink:0 }}>
                    <DbIcon size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{ margin:0, fontSize: isMobile ? 20 : 26, fontWeight:900, letterSpacing:-0.5, background:'linear-gradient(135deg,#fff 30%,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                      Base de Données
                    </h1>
                    <p style={{ margin:0, marginTop:3, fontSize:13, color:'#12b76a', fontWeight:700 }}>
                      {fichesByAnnee.length} lead{fichesByAnnee.length !== 1 ? 's' : ''} · {anneeFiltre === 'tout' ? 'Toutes les années' : moisFiltre !== 'tout' ? `${MOIS_FULL[Number(moisFiltre)]} ${anneeFiltre}` : anneeFiltre}
                    </p>
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  {!isMobile && (
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', background:'rgba(255,255,255,0.05)', padding:'6px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.08)', whiteSpace:'nowrap', textTransform:'capitalize' }}>
                      {new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                    </div>
                  )}
                  <select value={anneeFiltre} onChange={e => { setAnneeFiltre(e.target.value); setMoisFiltre('tout'); }}
                    style={{ fontSize:12, padding:'7px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', outline:'none', fontWeight:700 }}>
                    <option value="tout">Toutes les années</option>
                    {annees.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {anneeFiltre !== 'tout' && (
                    <select value={moisFiltre} onChange={e => setMoisFiltre(e.target.value)}
                      style={{ fontSize:12, padding:'7px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', outline:'none', fontWeight:700 }}>
                      <option value="tout">Tous les mois</option>
                      {MOIS_FULL.map((m,i) => <option key={i} value={String(i)}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Stats cards */}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap:10 }}>
                {[
                  { label:'Total fiches',  value:fichesByAnnee.length,                       color:'#06b6d4' },
                  { label:'Résultats',     value:displayData.length,                          color:'#12b76a' },
                  { label:'Filtrés',       value:fichesByAnnee.length - displayData.length,   color:'#f79009' },
                ].map((s,i) => (
                  <div key={i} style={{ background:`${s.color}12`, borderRadius:12, padding:'12px 16px', border:`1px solid ${s.color}25`, animation:`fadeSlideUp 0.4s ${i*0.06}s ease both` }}>
                    <div style={{ fontSize:10, color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize: isMobile ? 20 : 24, fontWeight:900, lineHeight:1 }}>
                      <AnimatedNumber value={s.value} decimals={0} color={s.color}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            STOCKAGE — card moderne
            ════════════════════════════════════════ */}
        {dbStats && (
          <div style={{ padding:'1.5px', borderRadius:18, background:`linear-gradient(135deg,${barColor}50,#06b6d425,#a78bfa15)`, marginBottom:20, animation:'fadeSlideUp 0.4s 0.1s ease both' }}>
            <div style={{ background:'rgba(2,8,16,0.97)', borderRadius:'16.5px', padding: isMobile ? '16px' : '20px 24px', backdropFilter:'blur(20px)' }}>

              {/* Header storage */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:`${barColor}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <HardDrive size={18} color={barColor}/>
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#e0e0f0' }}>Stockage PostgreSQL</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Plan actuel — {dbStats.storageLimit} MB</div>
                </div>
                <div style={{ marginLeft:'auto', fontSize:22, fontWeight:900, color:barColor }}>{pct}%</div>
              </div>

              {/* Barre animée */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                  <span style={{ color:'rgba(255,255,255,0.5)' }}>{dbStats.storageMB} MB utilisés</span>
                  <span style={{ fontWeight:700, color:barColor }}>{pct}% / {dbStats.storageLimit} MB</span>
                </div>
                <div style={{ height:10, borderRadius:6, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:6, background:`linear-gradient(90deg,${barColor},${barColor}cc)`, width:`${pct}%`, transition:'width 1s ease', boxShadow:`0 0 10px ${barColor}60` }}/>
                </div>
                {pct >= 80 && (
                  <div style={{ fontSize:11, color:'#f04438', marginTop:8, background:'rgba(240,68,56,0.08)', padding:'7px 12px', borderRadius:8, border:'1px solid rgba(240,68,56,0.2)' }}>
                    ⚠️ Stockage presque plein — supprime des anciennes fiches ou upgrade PostgreSQL
                  </div>
                )}
              </div>

              {/* Compteurs collections */}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:8 }}>
                {[
                  { label:'Leads',            value:dbStats.solutionExpress, color:'#12b76a', Icon:Building2, suffix:''      },
                  { label:'Utilisateurs',     value:dbStats.users,           color:'#3b6cf8', Icon:DbIcon,    suffix:''      },
                  { label:`Essence reçu ${new Date().getFullYear()}`, value:dbStats.essenceRecu, color:'#f59e0b', Icon:HardDrive, suffix:' TND' },
                ].map(({ label, value, color, Icon, suffix },i) => (
                  <div key={i} style={{ background:`${color}08`, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, border:`1px solid ${color}18`, transition:'transform 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform='translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
                    <div style={{ width:32, height:32, borderRadius:9, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={15} color={color}/>
                    </div>
                    <div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.6 }}>{label}</div>
                      <div style={{ fontSize:18, fontWeight:900, color, lineHeight:1.2 }}>
                        <AnimatedNumber value={value} decimals={0} color={color} suffix={suffix}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            TABLEAU avec filtres inline dans <thead>
            ════════════════════════════════════════ */}
        <div style={{ padding:'1.5px', borderRadius:18, background:'linear-gradient(135deg,#06b6d440,#3b6cf825,#a78bfa15)', animation:'fadeSlideUp 0.4s 0.15s ease both' }}>
          <div style={{ background:'rgba(2,8,16,0.97)', borderRadius:'16.5px', overflow:'hidden', backdropFilter:'blur(20px)' }}>

            {/* Header tableau */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, background:'linear-gradient(135deg,rgba(6,182,212,0.06),transparent)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Filter size={13} color="#06b6d4"/>
                <span style={{ fontSize:13, fontWeight:700, color:'#e0e0f0' }}>Tous les leads</span>
                <span style={{ fontSize:11, background:'rgba(6,182,212,0.12)', color:'#06b6d4', padding:'2px 10px', borderRadius:20, fontWeight:700 }}>
                  {displayData.length} résultat{displayData.length !== 1 ? 's' : ''}
                </span>
              </div>
              {hasFilters && (
                <button onClick={clearFilters}
                  style={{ fontSize:11, color:'#ef4444', background:'rgba(240,68,56,0.08)', border:'1px solid rgba(240,68,56,0.2)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontWeight:700, transition:'background 0.15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(240,68,56,0.15)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='rgba(240,68,56,0.08)')}>
                  ✕ Effacer filtres
                </button>
              )}
            </div>

            {/* Tableau scrollable */}
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth: isMobile ? 700 : 0 }}>
                <thead>
                  <tr>
                    {/* Prénom */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>PRÉNOM</div>
                      <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.prenom} onChange={e => setF('prenom', e.target.value)}/>
                    </th>
                    {/* Nom */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>NOM</div>
                      <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.nom} onChange={e => setF('nom', e.target.value)}/>
                    </th>
                    {/* Email */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>EMAIL</div>
                      <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.email} onChange={e => setF('email', e.target.value)}/>
                    </th>
                    {/* Téléphone */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>TÉLÉPHONE</div>
                      <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.telephone} onChange={e => setF('telephone', e.target.value)}/>
                    </th>
                    {/* Entreprise */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>ENTREPRISE</div>
                      <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.entreprise} onChange={e => setF('entreprise', e.target.value)}/>
                    </th>
                    {/* Ville */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>VILLE</div>
                      <select className="db-sel" style={{ ...inpSt, cursor:'pointer' }} value={filters.ville} onChange={e => setF('ville', e.target.value)}>
                        <option value="">Toutes</option>
                        {villesDispos.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </th>
                    {/* Type */}
                    <th style={thSt}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>TYPE</div>
                      <select className="db-sel" style={{ ...inpSt, cursor:'pointer' }} value={filters.typeClient} onChange={e => setF('typeClient', e.target.value)}>
                        <option value="">Tous</option>
                        <option value="b2b">B2B</option>
                        <option value="b2c">B2C</option>
                      </select>
                    </th>
                    {/* Statut */}
                    <th style={{ ...thSt, minWidth:140 }}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>STATUT</div>
                      <select className="db-sel" style={{ ...inpSt, cursor:'pointer' }} value={filters.status} onChange={e => setF('status', e.target.value)}>
                        <option value="">Tous</option>
                        {VALID_STATUTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                    </th>
                    {/* Actions */}
                    <th style={{ ...thSt, textAlign:'center', minWidth:80 }}>
                      <div style={{ fontSize:10, marginBottom:6, letterSpacing:0.8 }}>ACTIONS</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding:60, textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, color:'rgba(255,255,255,0.5)' }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', border:'2px solid rgba(6,182,212,0.15)', borderTopColor:'#06b6d4', animation:'spin 0.9s linear infinite' }}/>
                          Chargement…
                        </div>
                      </td>
                    </tr>
                  ) : displayData.length > 0 ? displayData.map((item, i) => (
                    <tr key={item.id}
                      style={{ transition:'background 0.15s', animation:`fadeSlideUp 0.3s ${Math.min(i*0.03,0.5)}s ease both` }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(6,182,212,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>

                      <td style={tdSt}>
                        <div style={{ fontWeight:600 }}>{item.prenom || '—'}</div>
                      </td>
                      <td style={tdSt}>{item.nom || '—'}</td>
                      <td style={{ ...tdSt, color:'rgba(255,255,255,0.5)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.email || '—'}
                      </td>
                      <td style={{ ...tdSt, color:'rgba(255,255,255,0.5)' }}>
                        {item.telephone || '—'}
                      </td>
                      <td style={tdSt}>
                        {item.entreprise ? (
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <Building2 size={11} color="#12b76a"/>
                            <span style={{ fontWeight:600, color:'#e0e0f0', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.entreprise}</span>
                          </div>
                        ) : (
                          <span style={{ color:'rgba(255,255,255,0.3)', fontStyle:'italic', fontSize:12 }}>Particulier</span>
                        )}
                      </td>
                      <td style={tdSt}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'rgba(255,255,255,0.5)' }}>
                          <MapPin size={11} color="#3b6cf8"/> {item.ville || '—'}
                        </div>
                      </td>
                      <td style={tdSt}>
                        <span style={{ background: item.typeClient==='b2b' ? 'rgba(59,108,248,0.18)' : 'rgba(167,139,250,0.18)', color: item.typeClient==='b2b' ? '#3b6cf8' : '#a78bfa', borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:800, textTransform:'uppercase' }}>
                          {item.typeClient}
                        </span>
                      </td>
                      <td style={tdSt}>
                        <span style={{ background:`${STATUS_COLOR[item.status]}20`, color:STATUS_COLOR[item.status], borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:800, boxShadow:`0 0 6px ${STATUS_COLOR[item.status]}20`, whiteSpace:'nowrap' }}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td style={{ ...tdSt, textAlign:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          <button onClick={() => setSelected(item)}
                            style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background='rgba(6,182,212,0.12)'; t.style.borderColor='rgba(6,182,212,0.4)'; t.style.transform='scale(1.1)'; }}
                            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background='rgba(255,255,255,0.04)'; t.style.borderColor='rgba(255,255,255,0.08)'; t.style.transform='scale(1)'; }}
                            title="Voir">
                            <Eye size={13} color="#06b6d4"/>
                          </button>
                          <button onClick={() => handleDelete(item)}
                            style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}
                            onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background='rgba(240,68,56,0.12)'; t.style.borderColor='rgba(240,68,56,0.4)'; t.style.transform='scale(1.1)'; }}
                            onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background='rgba(255,255,255,0.04)'; t.style.borderColor='rgba(255,255,255,0.08)'; t.style.transform='scale(1)'; }}
                            title="Supprimer">
                            <Trash2 size={13} color="#ef4444"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={9} style={{ padding:'52px 0', textAlign:'center', color:'rgba(255,255,255,0.35)' }}>
                        <div style={{ width:52, height:52, borderRadius:14, background:'rgba(6,182,212,0.06)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', border:'1px solid rgba(6,182,212,0.1)' }}>
                          <DbIcon size={24} color="#06b6d4" style={{ opacity:0.4 }}/>
                        </div>
                        <div style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>
                          {hasFilters ? 'Aucun résultat' : 'Aucun lead'}
                        </div>
                        <div style={{ fontSize:12 }}>
                          {hasFilters ? 'Modifie ou efface les filtres' : 'Ajoute des leads via la page Leads'}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer compteur */}
            {displayData.length > 0 && (
              <div style={{ padding:'10px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                  <span style={{ fontWeight:700, color:'#e0e0f0' }}>{displayData.length}</span> lead{displayData.length !== 1 ? 's' : ''} affichés sur <span style={{ fontWeight:700 }}>{fichesByAnnee.length}</span> au total
                </span>
                {hasFilters && (
                  <span style={{ fontSize:11, background:'rgba(247,144,9,0.1)', color:'#f79009', padding:'2px 10px', borderRadius:20, fontWeight:600 }}>
                    Filtres actifs
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {selected && settings && (
        <UltraFiche
          fiche={selected}
          settings={settings}
          readOnly
          onClose={() => setSelected(null)}
          onEdit={() => {}}
          onDelete={() => setSelected(null)}
          onChangeStatus={() => {}}
          onTogglePaiement={() => {}}
          onAddNote={async () => {}}
          onDeleteNote={async () => {}}
        />
      )}
    </div>
  );
}

