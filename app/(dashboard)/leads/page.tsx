'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Search, X, Filter, ChevronUp, ChevronDown,
  TrendingUp, Building2, CheckCircle, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { VALID_STATUTS, STATUS_LABEL, DEFAULT_SETTINGS, MOIS_FULL } from '@/types';
import AnimatedNumber from '@/components/AnimatedNumber';
import FicheCard from '@/components/solution-express/FicheCard';
import UltraFiche from '@/components/solution-express/UltraFiche';
import FicheModal, { type FormState, EMPTY_FORM } from '@/components/solution-express/FicheModal';

/* ─── Types ─── */
type ModalMode = 'add' | 'edit' | null;
type SortKey   = 'date_desc' | 'date_asc' | 'urgency_desc' | 'commission_desc' | 'entreprise' | 'status';
interface Filters {
  status: string; typeClient: string; leadType: string; ville: string;
  typeCommerce: string; commission: string; service: string; qualifSysteme: string;
}
const EMPTY_FILTERS: Filters = {
  status: '', typeClient: '', leadType: '', ville: '',
  typeCommerce: '', commission: '', service: '', qualifSysteme: '',
};
const SECTION_COLORS = [
  '#3b6cf8','#a78bfa','#12b76a','#f97316',
  '#06b6d4','#f59e0b','#ef4444','#ec4899','#84cc16',
];

/* ─── Cosmos ─── */
interface Star     { x: number; y: number; s: number; o: number; d: number }
interface Particle { x: number; y: number; s: number; d: number; delay: number; color: string }
const PART_COLORS = ['#3b6cf8','#a78bfa','#12b76a','#f97316','#06b6d4'];

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

/* ─── Select helper ─── */
function Sel({ val, onChange, opts, placeholder }: {
  val: string; onChange: (v: string) => void;
  opts: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <select value={val} onChange={e => onChange(e.target.value)}
      style={{ padding:'7px 12px', borderRadius:9, fontSize:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', color:'#fff', outline:'none', cursor:'pointer', backdropFilter:'blur(4px)', minWidth:130 }}>
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════ */
export default function SolutionExpressPage() {
  const isMobile = useIsMobile();

  /* ── États ── */
  const [fiches,       setFiches]       = useState<SolutionExpress[]>([]);
  const [settings,     setSettings]     = useState<Settings>(DEFAULT_SETTINGS);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [searchFocused,setSearchFocused]= useState(false);
  const [filters,      setFilters]      = useState<Filters>(EMPTY_FILTERS);
  const [sortBy,       setSortBy]       = useState<SortKey>('date_desc');
  const [annee,        setAnnee]        = useState(String(new Date().getFullYear()));
  const [showFilt,     setShowFilt]     = useState(true);
  const [modal,        setModal]        = useState<ModalMode>(null);
  const [editing,      setEditing]      = useState<SolutionExpress | null>(null);
  const [selected,     setSelected]     = useState<SolutionExpress | null>(null);
  const [form,         setForm]         = useState<FormState>({ ...EMPTY_FORM });
  const [saving,       setSaving]       = useState(false);
  const [motifPending, setMotifPending] = useState<{ fiche: SolutionExpress } | null>(null);
  const [motifChoice,  setMotifChoice]  = useState('');
  const [mounted,      setMounted]      = useState(false);

  const starsRef  = useRef<Star[]>([]);
  const partsRef  = useRef<Particle[]>([]);
  const toggleRef = useRef(new Set<string>());

  /* ── Cosmos ── */
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
  const fetchAll = useCallback(async () => {
    try {
      const [f, s] = await Promise.all([
        api.get<SolutionExpress[]>('/api/leads'),
        api.get<Settings>('/api/settings'),
      ]);
      setFiches(Array.isArray(f.data) ? f.data : []);
      setSettings(s.data ?? DEFAULT_SETTINGS);
    } catch { toast.error('Erreur chargement des données'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const onVis = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchAll]);

  /* ── Modals ── */
  const openAdd = () => {
    setEditing(null);
    const fournisseurs = Object.fromEntries(settings.services.map(s => [s.id, { actuel: '', propose: '' }]));
    const fixe  = settings.commissionFixeDefaut  || 0;
    const extra = settings.commissionExtraDefaut || 0;
    setForm({ ...EMPTY_FORM, fournisseurs, commissionFixe: fixe, commissionExtra: extra, commissionTotale: fixe + extra });
    setModal('add');
  };

  const openEdit = (fiche: SolutionExpress) => {
    setEditing(fiche);
    setForm({
      ...EMPTY_FORM, ...fiche,
      fournisseurs: fiche.fournisseurs as FormState['fournisseurs'],
      dateVente:              fiche.dateVente?.slice(0,10)              ?? '',
      datePaiementCommission: fiche.datePaiementCommission?.slice(0,10) ?? '',
      notes: fiche.notes ?? [],
    });
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { commissionTotale: _ct, ...rest } = form;
      const payload = {
        ...rest,
        commissionTotale: form.commissionFixe + form.commissionExtra,
        dateVente:              form.dateVente              ? new Date(form.dateVente+'T12:00:00').toISOString()              : null,
        datePaiementCommission: form.datePaiementCommission ? new Date(form.datePaiementCommission+'T12:00:00').toISOString() : null,
      };
      if (editing) {
        await api.put(`/api/leads/${editing.id}`, payload);
        if (selected?.id === editing.id) setSelected(s => s ? { ...s, ...payload } : null);
        toast.success('Fiche modifiée');
      } else {
        await api.post('/api/leads', payload);
        toast.success('Fiche créée !');
      }
      setModal(null); fetchAll();
    } catch { toast.error('Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette fiche définitivement ?')) return;
    try {
      await api.delete(`/api/leads/${id}`);
      if (selected?.id === id) setSelected(null);
      toast.success('Fiche supprimée'); fetchAll();
    } catch { toast.error('Erreur suppression'); }
  };

  const togglePaiement = async (fiche: SolutionExpress) => {
    if (toggleRef.current.has(fiche.id)) return;
    toggleRef.current.add(fiche.id);
    const next = !fiche.commissionPayee;
    const optimistic = { ...fiche, commissionPayee: next, datePaiementCommission: next ? new Date().toISOString() : null };
    setFiches(prev => prev.map(f => f.id === fiche.id ? optimistic : f));
    if (selected?.id === fiche.id) setSelected(optimistic);
    try {
      await api.put(`/api/leads/${fiche.id}`, { commissionPayee: next, datePaiementCommission: next ? new Date().toISOString() : null });
      fetchAll();
    } catch { toast.error('Erreur paiement'); fetchAll(); }
    finally { toggleRef.current.delete(fiche.id); }
  };

  const changeStatus = (fiche: SolutionExpress, newStatus: StatusFiche) => {
    if (newStatus === 'installation_annulee') { setMotifPending({ fiche }); setMotifChoice(''); return; }
    api.put(`/api/leads/${fiche.id}`, { status: newStatus })
      .then(() => {
        setFiches(prev => prev.map(f => f.id === fiche.id ? { ...f, status: newStatus } : f));
        if (selected?.id === fiche.id) setSelected(s => s ? { ...s, status: newStatus } : null);
        toast.success('Statut mis à jour'); fetchAll();
      })
      .catch(() => toast.error('Erreur statut'));
  };

  const confirmAnnulation = async () => {
    if (!motifPending) return;
    try {
      await api.put(`/api/leads/${motifPending.fiche.id}`, { status: 'installation_annulee', motifAnnulation: motifChoice });
      setFiches(prev => prev.map(f => f.id === motifPending.fiche.id ? { ...f, status: 'installation_annulee', motifAnnulation: motifChoice } : f));
      if (selected?.id === motifPending.fiche.id) setSelected(s => s ? { ...s, status: 'installation_annulee', motifAnnulation: motifChoice } : null);
      toast.success('Annulation confirmée'); fetchAll();
    } catch { toast.error('Erreur annulation'); }
    finally { setMotifPending(null); }
  };

  const addNote = useCallback(async (fiche: SolutionExpress, note: string) => {
    const updated = [...(fiche.notes ?? []), note];
    try {
      await api.put(`/api/leads/${fiche.id}`, { notes: updated });
      setFiches(prev => prev.map(f => f.id === fiche.id ? { ...f, notes: updated } : f));
      if (selected?.id === fiche.id) setSelected(s => s ? { ...s, notes: updated } : null);
    } catch { toast.error('Erreur ajout note'); }
  }, [selected]);

  const deleteNote = useCallback(async (fiche: SolutionExpress, idx: number) => {
    const updated = (fiche.notes ?? []).filter((_, i) => i !== idx);
    try {
      await api.put(`/api/leads/${fiche.id}`, { notes: updated });
      setFiches(prev => prev.map(f => f.id === fiche.id ? { ...f, notes: updated } : f));
      if (selected?.id === fiche.id) setSelected(s => s ? { ...s, notes: updated } : null);
    } catch { toast.error('Erreur suppression note'); }
  }, [selected]);

  /* ── Filtrage + Tri ── */
  const filtered = useMemo(() => fiches.filter(f => {
    if (filters.status        && f.status              !== filters.status)        return false;
    if (filters.typeClient    && f.typeClient           !== filters.typeClient)    return false;
    if (filters.leadType      && f.leadType             !== filters.leadType)      return false;
    if (filters.ville         && f.ville                !== filters.ville)         return false;
    if (filters.typeCommerce  && f.typeCommerce         !== filters.typeCommerce)  return false;
    if (filters.qualifSysteme && f.qualificationSysteme !== filters.qualifSysteme) return false;
    if (filters.service && !(f.produits as string[]).includes(filters.service)) return false;
    if (filters.commission === 'payee'      && !f.commissionPayee)                               return false;
    if (filters.commission === 'en_attente' && (f.commissionPayee || !(f.commissionTotale > 0))) return false;
    if (filters.commission === 'avec'       && !(f.commissionTotale > 0))                        return false;
    if (filters.commission === 'annulee'    && f.status !== 'installation_annulee')              return false;
    if (search) {
      const q = search.toLowerCase();
      return [f.entreprise, f.prenom, f.nom, f.telephone, f.email, f.ville, f.summary]
        .some(v => (v ?? '').toLowerCase().includes(q));
    }
    return true;
  }), [fiches, filters, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':        return new Date(a.dateVente ?? a.createdAt).getTime() - new Date(b.dateVente ?? b.createdAt).getTime();
      case 'urgency_desc':    return (b.urgencyScore || 0) - (a.urgencyScore || 0);
      case 'commission_desc': return (b.commissionTotale || 0) - (a.commissionTotale || 0);
      case 'entreprise':      return (a.entreprise || '').localeCompare(b.entreprise || '');
      case 'status':          return VALID_STATUTS.indexOf(a.status) - VALID_STATUTS.indexOf(b.status);
      default:                return new Date(b.dateVente ?? b.createdAt).getTime() - new Date(a.dateVente ?? a.createdAt).getTime();
    }
  }), [filtered, sortBy]);

  const allYears = useMemo(() =>
    [...new Set(fiches.map(f => String(new Date(f.dateVente ?? f.createdAt).getFullYear())))].sort((a, b) => Number(b) - Number(a)),
  [fiches]);

  const usedServiceIds = useMemo(() => {
    const s = new Set<string>();
    fiches.forEach(f => (f.produits as string[]).forEach(id => s.add(id)));
    return s;
  }, [fiches]);

  const fichesByAnnee = useMemo(() =>
    annee === 'tout' ? fiches : fiches.filter(f => String(new Date(f.dateVente ?? f.createdAt).getFullYear()) === annee),
  [fiches, annee]);

  const groups = useMemo(() => {
    const inYear = annee === 'tout' ? sorted : sorted.filter(f => String(new Date(f.dateVente ?? f.createdAt).getFullYear()) === annee);
    if (annee === 'tout') {
      const map: Record<string, SolutionExpress[]> = {};
      inYear.forEach(f => { const y = String(new Date(f.dateVente ?? f.createdAt).getFullYear()); if (!map[y]) map[y] = []; map[y].push(f); });
      return Object.keys(map).sort((a, b) => Number(b) - Number(a)).map((y, i) => ({ label: y, color: SECTION_COLORS[i % SECTION_COLORS.length], items: map[y] }));
    }
    const map: Record<number, SolutionExpress[]> = {};
    inYear.forEach(f => { const m = new Date(f.dateVente ?? f.createdAt).getMonth(); if (!map[m]) map[m] = []; map[m].push(f); });
    return Object.keys(map).map(Number).sort((a, b) => b - a).map((m, i) => ({ label: MOIS_FULL[m], color: SECTION_COLORS[i % SECTION_COLORS.length], items: map[m] ?? [] }));
  }, [sorted, annee]);

  /* ── Stats ── */
  const totalFiches   = fichesByAnnee.length;
  const totalInstalle = fichesByAnnee.filter(f => f.status === 'installe').length;
  const totalAnnule   = fichesByAnnee.filter(f => f.status === 'installation_annulee').length;
  const totalPipeline = fichesByAnnee.filter(f => ['contacted','proposal','installation_en_cours'].includes(f.status)).length;

  const filtersActive  = Object.values(filters).some(Boolean) || !!search;
  const villesDispos   = useMemo(() => {
    const all = [...(settings.villes ?? []), ...fiches.map(f => f.ville).filter(Boolean)];
    return [...new Set(all)].sort();
  }, [fiches, settings.villes]);
  const totalVisible   = groups.reduce((n, g) => n + g.items.length, 0);

  /* ─────────────────────────────── RENDER ──────────────────────────────── */
  return (
    <div style={{ position:'relative', minHeight:'100vh', color:'#fff', overflow:'hidden' }}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:0.08} 50%{opacity:0.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:0.4} to{transform:translateY(-100vh);opacity:0} }
      `}</style>

      {/* ── Fond cosmos ── */}
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(59,108,248,0.12) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 90% 50%, rgba(167,139,250,0.07) 0%, transparent 50%), #06060f', zIndex:0, pointerEvents:'none' }}/>
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
        <div style={{ padding:'1.5px', borderRadius:22, background:'linear-gradient(135deg,#2215d470,#a78bfa40,#12b76a25)', marginBottom:20, animation:'fadeSlideUp 0.4s ease both' }}>
          <div style={{ background:'rgba(2,8,16,0.97)', borderRadius:'20.5px', padding: isMobile ? '18px 16px' : '28px 32px', backdropFilter:'blur(40px)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, left:-60, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,21,212,0.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.14) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'relative', zIndex:1 }}>

              {/* Titre + actions */}
              <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#818cf8,#a5b4fc)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 28px rgba(129,140,248,0.55)', flexShrink:0 }}>
                    <Building2 size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{ margin:0, fontSize: isMobile ? 20 : 26, fontWeight:900, letterSpacing:-0.5, background:'linear-gradient(135deg,#fff 30%,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                      Leads
                    </h1>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  {!isMobile && (
                    <div style={{ fontSize:12, color:'#fff', background:'rgba(255,255,255,0.05)', padding:'6px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', textTransform:'capitalize', whiteSpace:'nowrap', fontWeight:700 }}>
                      {new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                    </div>
                  )}
                  <select value={annee} onChange={e => setAnnee(e.target.value)}
                    style={{ fontSize:12, padding:'7px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#fff', cursor:'pointer', outline:'none', fontWeight:700 }}>
                    <option value="tout">Toutes les années</option>
                    {allYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <button onClick={openAdd}
                    style={{ display:'flex', alignItems:'center', gap:8, padding: isMobile ? '9px 16px' : '10px 22px', borderRadius:13, border:'none', background:'linear-gradient(135deg,#2215d4,#a78bfa)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(34,21,212,0.45)', transition:'all 0.2s', whiteSpace:'nowrap' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform='scale(1.04)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform='scale(1)')}>
                    <Plus size={16}/> Nouveau lead
                  </button>
                </div>
              </div>

              {/* Stats cards */}
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Total leads',  value:totalFiches,   color:'#a78bfa', Icon:Building2,  },
                  { label:'En cours',     value:totalPipeline, color:'#f79009', Icon:TrendingUp,  },
                  { label:'Installés',    value:totalInstalle, color:'#12b76a', Icon:CheckCircle, },
                  { label:'Annulés',      value:totalAnnule,   color:'#ef4444', Icon:XCircle,     },
                ].map((s,i) => (
                  <div key={i} style={{ background:`${s.color}12`, borderRadius:12, padding:'12px 16px', border:`1px solid ${s.color}25`, animation:`fadeSlideUp 0.4s ${i*0.06}s ease both` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div style={{ fontSize:10, color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{s.label}</div>
                      <div style={{ background:`${s.color}18`, borderRadius:7, padding:'4px 5px', display:'flex' }}>
                        <s.Icon size={12} color={s.color}/>
                      </div>
                    </div>
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
            FILTRES
            ════════════════════════════════════════ */}
        <div style={{ padding:'1px', borderRadius:18, background:'linear-gradient(135deg,#2215d430,#a78bfa20,#12b76a10)', marginBottom:16 }}>
          <div style={{ background:'rgba(2,8,16,0.97)', borderRadius:17, padding:14, backdropFilter:'blur(20px)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: showFilt ? 14 : 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Filter size={13} color="rgba(255,255,255,0.5)"/>
                <span style={{ fontSize:11, color:'#fff', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>Filtres</span>
                {filtersActive && <span style={{ fontSize:10, background:'rgba(167,139,250,0.12)', color:'#a78bfa', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>Actifs</span>}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {filtersActive && (
                  <button onClick={() => { setFilters(EMPTY_FILTERS); setSearch(''); }}
                    style={{ fontSize:11, color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:20, padding:'3px 10px', cursor:'pointer', fontWeight:700 }}>
                    ✕ Effacer
                  </button>
                )}
                <button onClick={() => setShowFilt(p => !p)}
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, cursor:'pointer', color:'#fff', padding:'5px 8px', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700 }}>
                  {showFilt ? <><ChevronUp size={14}/> Cacher</> : <><ChevronDown size={14}/> Afficher</>}
                </button>
              </div>
            </div>

            {showFilt && (
              <div style={{ animation:'fadeSlideUp 0.2s ease both' }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                  <Sel val={filters.status}       onChange={v => setFilters(p => ({...p, status:v}))}       opts={VALID_STATUTS.map(s => ({ value:s, label:STATUS_LABEL[s] }))} placeholder="Statut"/>
                  <Sel val={filters.typeClient}   onChange={v => setFilters(p => ({...p, typeClient:v}))}   opts={[{value:'b2b',label:'🏢 B2B'},{value:'b2c',label:'🏠 B2C'}]} placeholder="B2B / B2C"/>
                  <Sel val={filters.leadType}     onChange={v => setFilters(p => ({...p, leadType:v}))}     opts={settings.typeLead.map(t => ({value:t.key,label:t.label}))} placeholder="Type lead"/>
                  <Sel val={filters.ville}        onChange={v => setFilters(p => ({...p, ville:v}))}        opts={villesDispos.map(v => ({value:v,label:v}))} placeholder="Ville"/>
                  <Sel val={filters.typeCommerce}  onChange={v => setFilters(p => ({...p, typeCommerce:v}))}  opts={settings.typeCommerce.map(t => ({value:t.key,label:t.label}))} placeholder="Commerce"/>
                  <Sel val={filters.qualifSysteme} onChange={v => setFilters(p => ({...p, qualifSysteme:v}))} opts={settings.qualificationSysteme.map(t => ({value:t.key,label:t.label}))} placeholder="Système actuel"/>
                  <Sel val={filters.commission}    onChange={v => setFilters(p => ({...p, commission:v}))}    opts={[{value:'payee',label:'✓ Payée'},{value:'en_attente',label:'⏳ En attente'},{value:'avec',label:'Avec commission'},{value:'annulee',label:'✕ Annulée'}]} placeholder="Commission"/>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
                    style={{ padding:'7px 12px', borderRadius:9, fontSize:12, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', color:'#fff', outline:'none', cursor:'pointer' }}>
                    <option value="date_desc">Plus récent</option>
                    <option value="date_asc">Plus ancien</option>
                    <option value="urgency_desc">Urgence ↓</option>
                    <option value="commission_desc">Commission ↓</option>
                    <option value="entreprise">A → Z</option>
                    <option value="status">Statut</option>
                  </select>
                </div>
                {/* Pills services */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontSize:10, color:'#fff', fontWeight:700, textTransform:'uppercase' }}>Service :</span>
                  {settings.services.filter(sv => usedServiceIds.has(sv.id)).map(sv => (
                    <button key={sv.id} onClick={() => setFilters(p => ({...p, service: p.service===sv.id ? '' : sv.id}))}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 13px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                        border:`1px solid ${filters.service===sv.id ? sv.color : 'rgba(255,255,255,0.12)'}`,
                        background: filters.service===sv.id ? `${sv.color}22` : 'transparent',
                        color: filters.service===sv.id ? sv.color : 'rgba(255,255,255,0.5)' }}>
                      {sv.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            BARRE DE RECHERCHE
            ════════════════════════════════════════ */}
        <div style={{ position:'relative', marginBottom:16 }}>
          <Search size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color: searchFocused ? '#a78bfa' : 'rgba(255,255,255,0.3)', transition:'color 0.2s', pointerEvents:'none' }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            placeholder="Rechercher — entreprise, nom, téléphone, email, ville..."
            style={{ width:'100%', padding:'12px 42px', borderRadius:13, fontSize:14, background:'rgba(255,255,255,0.05)', border:`1px solid ${searchFocused ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.08)'}`, color:'#fff', outline:'none', transition:'all 0.2s', boxShadow: searchFocused ? '0 0 0 3px rgba(167,139,250,0.1)' : 'none', boxSizing:'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, cursor:'pointer', color:'#fff', padding:'3px 6px', display:'flex', alignItems:'center' }}>
              <X size={12}/>
            </button>
          )}
        </div>

        {/* Compteur résultats */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontSize:13, color:'#fff', fontWeight:700 }}>
            <span style={{ color:'#fff', fontWeight:800, fontSize:15 }}>{totalVisible}</span> fiche{totalVisible !== 1 ? 's' : ''}{filtersActive ? ' trouvée' : ' au total'}
          </span>
          {filtersActive && <span style={{ fontSize:11, background:'rgba(167,139,250,0.1)', color:'#a78bfa', padding:'2px 12px', borderRadius:20, fontWeight:700 }}>Filtres actifs</span>}
        </div>

        {/* ════════════════════════════════════════
            GROUPES DE CARDS
            ════════════════════════════════════════ */}
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, gap:16 }}>
            <div style={{ width:48, height:48, borderRadius:'50%', border:'3px solid rgba(167,139,250,0.15)', borderTopColor:'#a78bfa', animation:'spin 0.8s linear infinite', boxShadow:'0 0 20px rgba(167,139,250,0.3)' }}/>
            <span style={{ fontSize:14, color:'#fff', letterSpacing:0.3 }}>Chargement des fiches…</span>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:72, height:72, borderRadius:20, background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 0 30px rgba(167,139,250,0.15)' }}>
              <Building2 size={32} color="#a78bfa" style={{ opacity:0.6 }}/>
            </div>
            <p style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Aucun lead trouvé</p>
            <p style={{ fontSize:13, color:'#fff', marginBottom:20 }}>Essayez d'ajuster vos filtres</p>
            <button onClick={openAdd}
              style={{ padding:'10px 24px', borderRadius:12, background:'linear-gradient(135deg,#2215d4,#a78bfa)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7 }}>
              <Plus size={14}/> Créer un lead
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
            {groups.map(group => (
              <div key={group.label}>
                {/* Section header — style MERN avec séparateurs */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
                  <span style={{ fontSize:12, fontWeight:700, color:group.color, textTransform:'uppercase', letterSpacing:1, padding:'4px 14px', borderRadius:20, background:`${group.color}15`, border:`1px solid ${group.color}30`, whiteSpace:'nowrap' }}>
                    {group.label}
                  </span>
                  <span style={{ fontSize:11, color:'#fff', background:'rgba(255,255,255,0.05)', padding:'2px 10px', borderRadius:20, border:'1px solid rgba(255,255,255,0.07)', fontWeight:700, whiteSpace:'nowrap' }}>
                    {group.items.length} fiche{group.items.length!==1?'s':''} · <span style={{ color:group.color }}>{group.items.filter(f=>f.status!=='installation_annulee').reduce((s,f) => s+(f.commissionTotale||0), 0).toFixed(0)} TND</span>
                  </span>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
                </div>

                {/* Cards grid */}
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(300px,1fr))', gap: isMobile ? 12 : 16 }}>
                  {group.items.map((fiche, i) => (
                    <FicheCard
                      key={fiche.id}
                      fiche={fiche}
                      settings={settings}
                      index={i}
                      onOpen={f => setSelected(f)}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onTogglePaiement={togglePaiement}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ MODALS ══════════════════════════════════ */}
      {selected && (
        <UltraFiche
          fiche={selected} settings={settings}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={handleDelete}
          onChangeStatus={changeStatus}
          onTogglePaiement={togglePaiement}
          onAddNote={addNote}
          onDeleteNote={deleteNote}
        />
      )}

      {modal && (
        <FicheModal
          mode={modal} form={form} setForm={setForm}
          settings={settings} saving={saving}
          onSave={handleSave} onClose={() => setModal(null)}
        />
      )}

      {motifPending && (
        <div onClick={e => { if (e.target===e.currentTarget) setMotifPending(null); }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'linear-gradient(135deg,rgba(11,11,34,0.98),rgba(8,8,24,0.98))', border:'1px solid rgba(239,68,68,0.25)', borderRadius:20, width:'100%', maxWidth:400, padding:'26px 28px', boxShadow:'0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(239,68,68,0.1)' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'#ef4444', marginBottom:6 }}>Confirmer l'annulation</div>
            <p style={{ fontSize:13, color:'#fff', marginBottom:18 }}>
              {motifPending.fiche.entreprise || [motifPending.fiche.prenom, motifPending.fiche.nom].filter(Boolean).join(' ')}
            </p>
            <label style={{ fontSize:11, color:'#fff', fontWeight:700, letterSpacing:0.4, marginBottom:7, display:'block' }}>Motif d'annulation</label>
            <select value={motifChoice} onChange={e => setMotifChoice(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', borderRadius:10, fontSize:13, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.09)', color:'#fff', outline:'none', marginBottom:20 }}>
              <option value="">— Sélectionner —</option>
              {settings.motifsAnnulation.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setMotifPending(null)}
                style={{ padding:'9px 16px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'#fff', fontSize:13, cursor:'pointer' }}>
                Annuler
              </button>
              <button onClick={confirmAnnulation}
                style={{ padding:'9px 20px', borderRadius:10, background:'#ef4444', border:'none', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 16px rgba(239,68,68,0.4)' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

