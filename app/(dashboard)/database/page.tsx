'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Trash2, Database as DbIcon, MapPin, HardDrive, Building2, Filter, Eye, Phone, Mail,
  FileDown, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrMsg } from '@/lib/api';
import { getCachedSettings } from '@/lib/settings-cache';
import useIsMobile from '@/hooks/useIsMobile';
import CosmosBackground from '@/components/CosmosBackground';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { SolutionExpress, DbStats, Settings } from '@/types';
import { STATUS_LABEL, STATUS_COLOR, VALID_STATUTS, MOIS_FULL, DEFAULT_SETTINGS } from '@/types';
import UltraFiche from '@/components/solution-express/UltraFiche';

const DB_PART_COLORS = ['#06b6d4', '#3b6cf8', '#a78bfa', '#12b76a', '#f59e0b'];

/* ─── Input style (thead filters) — module-level, never recreated ─── */
const inpSt: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)',
  color: '#fff', fontSize: 12, outline: 'none', transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};

/* ─── Table styles — module-level ─── */
const thSt: React.CSSProperties = {
  padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  letterSpacing: '0.05em', textTransform: 'uppercase',
  background: 'rgba(2,8,16,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: '#c0c0e0', whiteSpace: 'nowrap',
};
const thStatusSt: React.CSSProperties = { ...thSt, minWidth: 140 };
const thActionSt: React.CSSProperties = { ...thSt, textAlign: 'center', minWidth: 80 };
const tdSt: React.CSSProperties = {
  padding: '13px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#fff',
};
const tdEmailSt: React.CSSProperties = {
  ...tdSt, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const tdActionSt: React.CSSProperties = { ...tdSt, textAlign: 'center' };

export default function DatabasePage() {
  const isMobile = useIsMobile();

  const [leads,       setLeads]       = useState<SolutionExpress[]>([]);
  const [total,       setTotal]       = useState(0);
  const [dbStats,     setDbStats]     = useState<DbStats | null>(null);
  const [settings,    setSettings]    = useState<Settings>(DEFAULT_SETTINGS);
  const [loading,     setLoading]     = useState(true);
  const [anneeFiltre, setAnneeFiltre] = useState('tout');
  const [moisFiltre,  setMoisFiltre]  = useState<string>('tout');
  const [selected,    setSelected]    = useState<SolutionExpress | null>(null);
  const [filters, setFilters] = useState({
    prenom: '', nom: '', email: '', telephone: '', entreprise: '', ville: '', typeClient: '', status: '',
  });
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [confirmItem, setConfirmItem] = useState<SolutionExpress | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);

  const leadsCtrlRef = useRef<AbortController | null>(null);
  const statsCtrlRef = useRef<AbortController | null>(null);

  /* ── Fetch leads ── */
  const fetchLeads = useCallback(async () => {
    leadsCtrlRef.current?.abort();
    const ctrl = new AbortController();
    leadsCtrlRef.current = ctrl;
    let canceled = false;
    setLoading(true);
    try {
      const r = await api.get<{ fiches: SolutionExpress[]; total: number }>('/api/leads', {
        params: { limit: 5000 },
        signal: ctrl.signal,
      });
      setLeads(r.data.fiches ?? []);
      setTotal(r.data.total ?? 0);
    } catch (e) {
      if ((e as { name?: string }).name === 'CanceledError') { canceled = true; return; }
      setLeads([]);
      toast.error('Erreur lors du chargement des leads');
    } finally { if (!canceled) setLoading(false); }
  }, []);

  const fetchDbStats = useCallback(async () => {
    statsCtrlRef.current?.abort();
    const ctrl = new AbortController();
    statsCtrlRef.current = ctrl;
    try {
      const r = await api.get<DbStats>('/api/database/stats', { signal: ctrl.signal });
      setDbStats(r.data);
    } catch (e) {
      if ((e as { name?: string }).name !== 'CanceledError') setDbStats(null);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const s = await getCachedSettings();
      if (s) setSettings(s);
    } catch { /* ignore — DEFAULT_SETTINGS utilisé en fallback */ }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchDbStats();
    fetchSettings();
    const onVis = () => { if (!document.hidden) { fetchLeads(); fetchDbStats(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      leadsCtrlRef.current?.abort();
      statsCtrlRef.current?.abort();
    };
  }, [fetchLeads, fetchDbStats, fetchSettings]);

  /* ── Computed — ISO string ops, no new Date() ── */
  const annees = useMemo(() =>
    [...new Set(leads.filter(f => f.dateVente).map(f => f.dateVente!.slice(0, 4)))].sort().reverse(),
  [leads]);

  const fichesByAnnee = useMemo(() => {
    if (anneeFiltre === 'tout') return leads;
    const yr = leads.filter(f => f.dateVente?.slice(0, 4) === anneeFiltre);
    if (moisFiltre === 'tout') return yr;
    const mo = String(Number(moisFiltre) + 1).padStart(2, '0');
    return yr.filter(f => f.dateVente?.slice(5, 7) === mo);
  }, [leads, anneeFiltre, moisFiltre]);

  const villesDispos = useMemo(() =>
    settings?.villes?.length
      ? [...settings.villes].sort()
      : [...new Set(leads.map(f => f.ville).filter(Boolean))].sort(),
  [settings, leads]);

  const setF = useCallback((k: string, v: string) => setFilters(p => ({ ...p, [k]: v })), []);

  const displayData = useMemo(() => {
    const prenomQ     = filters.prenom.toLowerCase();
    const nomQ        = filters.nom.toLowerCase();
    const emailQ      = filters.email.toLowerCase();
    const entrepriseQ = filters.entreprise.toLowerCase();

    return fichesByAnnee.filter(item =>
      (!filters.prenom ||
        (item.prenom || '').toLowerCase().includes(prenomQ) ||
        (item.nom    || '').toLowerCase().includes(prenomQ)) &&
      (!filters.nom        || (item.nom        || '').toLowerCase().includes(nomQ)) &&
      (!filters.email      || (item.email      || '').toLowerCase().includes(emailQ)) &&
      (!filters.telephone  || (item.telephone  || '').includes(filters.telephone)) &&
      (!filters.entreprise || (item.entreprise || '').toLowerCase().includes(entrepriseQ)) &&
      (!filters.ville      || item.ville      === filters.ville) &&
      (!filters.typeClient || item.typeClient === filters.typeClient) &&
      (!filters.status     || item.status     === filters.status)
    ).sort((a, b) => {
      if (!a.dateVente && !b.dateVente) return 0;
      if (!a.dateVente) return 1;
      if (!b.dateVente) return -1;
      return a.dateVente < b.dateVente ? 1 : a.dateVente > b.dateVente ? -1 : 0;
    });
  }, [fichesByAnnee, filters]);

  const hasFilters   = useMemo(() => Object.values(filters).some(Boolean), [filters]);
  const clearFilters = useCallback(() =>
    setFilters({ prenom: '', nom: '', email: '', telephone: '', entreprise: '', ville: '', typeClient: '', status: '' }),
  []);

  const todayLabel = useMemo(() =>
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  []);

  /* ── PDF ── */
  const handlePDF = async (openInTab: boolean) => {
    if (displayData.length === 0) return toast.error('Aucun lead à exporter');
    setPdfLoading(true);
    try {
      const { pdf }           = await import('@react-pdf/renderer');
      const { buildLeadsDoc } = await import('@/components/LeadsPDF');
      const label = anneeFiltre === 'tout'
        ? 'Toutes les années'
        : moisFiltre !== 'tout'
          ? `${MOIS_FULL[Number(moisFiltre)]} ${anneeFiltre}`
          : anneeFiltre;
      const blob = await pdf(buildLeadsDoc(displayData, label)).toBlob();
      const url  = URL.createObjectURL(blob);
      if (openInTab) {
        const tab = window.open(url, '_blank');
        if (!tab) toast.error('Popup bloqué — autorise les popups pour ouvrir le PDF');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const periodSlug = anneeFiltre === 'tout' ? 'toutes-annees'
          : moisFiltre !== 'tout' ? `${MOIS_FULL[Number(moisFiltre)].toLowerCase()}-${anneeFiltre}`
          : anneeFiltre;
        const a = document.createElement('a');
        a.href     = url;
        a.download = `leads-${periodSlug}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erreur génération PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = (item: SolutionExpress) => setConfirmItem(item);

  const doDelete = async () => {
    if (!confirmItem) return;
    setDeletingId(confirmItem.id);
    try {
      await api.delete(`/api/leads/${confirmItem.id}`);
      setLeads(prev => prev.filter(l => l.id !== confirmItem.id));
      setTotal(prev => Math.max(0, prev - 1));
      toast.success('Supprimé');
      fetchDbStats();
      setConfirmItem(null);
    } catch (e) {
      toast.error(apiErrMsg(e, 'Erreur de suppression'));
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Storage bar color ── */
  const pct      = dbStats?.storagePercent ?? 0;
  const barColor = pct >= 80 ? '#f04438' : pct >= 50 ? '#f79009' : '#12b76a';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: '#fff', overflow: 'hidden' }}>

      {/* ── Cosmos background ── */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(6,182,212,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 90% 60%, rgba(59,108,248,0.07) 0%, transparent 50%), #06060f', zIndex: 0, pointerEvents: 'none' }}/>
      <CosmosBackground particleColors={DB_PART_COLORS} />

      <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '16px 12px 40px' : '28px 32px 40px' }}>

        {/* ════════ HEADER ════════ */}
        <div style={{ padding: '1.5px', borderRadius: 22, background: 'linear-gradient(135deg,#f472b670,#ec489940,#a78bfa25)', marginBottom: 20, animation: 'fadeSlideUp 0.4s ease both' }}>
          <div style={{ background: 'rgba(2,8,16,0.97)', borderRadius: '20.5px', padding: isMobile ? '18px 16px' : '28px 32px', backdropFilter: 'blur(40px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,0.15) 0%,transparent 70%)', pointerEvents: 'none' }}/>
            <div style={{ position: 'absolute', bottom: -50, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,108,248,0.10) 0%,transparent 70%)', pointerEvents: 'none' }}/>
            <div style={{ position: 'relative', zIndex: 1 }}>

              <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#f472b6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 28px rgba(244,114,182,0.5)', flexShrink: 0 }}>
                    <DbIcon size={26} color="#fff"/>
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, letterSpacing: -0.5, background: 'linear-gradient(135deg,#fff 30%,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Base de Données
                    </h1>
                    <p style={{ margin: 0, marginTop: 3, fontSize: 13, color: '#12b76a', fontWeight: 700 }}>
                      {fichesByAnnee.length} lead{fichesByAnnee.length !== 1 ? 's' : ''} · {anneeFiltre === 'tout' ? 'Toutes les années' : moisFiltre !== 'tout' ? `${MOIS_FULL[Number(moisFiltre)]} ${anneeFiltre}` : anneeFiltre}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {!isMobile && (
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, background: 'rgba(255,255,255,0.07)', padding: '6px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                      {todayLabel}
                    </div>
                  )}
                  <select value={anneeFiltre} onChange={e => { setAnneeFiltre(e.target.value); setMoisFiltre('tout'); }}
                    style={{ fontSize: 12, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', outline: 'none', fontWeight: 700 }}>
                    <option value="tout">Toutes les années</option>
                    {annees.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {anneeFiltre !== 'tout' && (
                    <select value={moisFiltre} onChange={e => setMoisFiltre(e.target.value)}
                      style={{ fontSize: 12, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer', outline: 'none', fontWeight: 700 }}>
                      <option value="tout">Tous les mois</option>
                      {MOIS_FULL.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ ALERTE TRONCATURE ════════ */}
        {!loading && total > leads.length && (
          <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 12, background: 'rgba(247,144,9,0.08)', border: '1px solid rgba(247,144,9,0.25)', fontSize: 12, color: '#f79009', fontWeight: 600 }}>
            ⚠️ {total.toLocaleString('fr-FR')} leads en base — {leads.length.toLocaleString('fr-FR')} chargés. Utilise les filtres pour naviguer.
          </div>
        )}

        {/* ════════ STOCKAGE ════════ */}
        {dbStats && (
          <div style={{ padding: '1.5px', borderRadius: 18, background: `linear-gradient(135deg,${barColor}50,#06b6d425,#a78bfa15)`, marginBottom: 20, animation: 'fadeSlideUp 0.4s 0.1s ease both' }}>
            <div style={{ background: 'rgba(2,8,16,0.97)', borderRadius: '16.5px', padding: isMobile ? '16px' : '20px 24px', backdropFilter: 'blur(20px)' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: `${barColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HardDrive size={18} color={barColor}/>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#e0e0f0' }}>Stockage PostgreSQL</div>
                  <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>Plan actuel — {dbStats.storageLimit} MB</div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 900, color: barColor }}>{pct}%</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: '#fff', fontWeight: 700 }}>{dbStats.storageMB} MB utilisés</span>
                  <span style={{ fontWeight: 700, color: barColor }}>{pct}% / {dbStats.storageLimit} MB</span>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 6, background: `linear-gradient(90deg,${barColor},${barColor}cc)`, width: `${pct}%`, transition: 'width 1s ease', boxShadow: `0 0 10px ${barColor}60` }}/>
                </div>
                {pct >= 80 && (
                  <div style={{ fontSize: 11, color: '#f04438', marginTop: 8, background: 'rgba(240,68,56,0.08)', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(240,68,56,0.2)' }}>
                    ⚠️ Stockage presque plein — supprime des anciennes fiches ou upgrade ton plan PostgreSQL
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 8 }}>
                {[
                  { label: 'Leads',        value: fichesByAnnee.length, color: '#12b76a', Icon: Building2 },
                  { label: 'Utilisateurs', value: dbStats.users,        color: '#3b6cf8', Icon: DbIcon    },
                ].map(({ label, value, color, Icon }) => (
                  <div key={label} className="db-stat-card" style={{ background: `${color}08`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${color}18` }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color={color}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1.2 }}>
                        <AnimatedNumber value={value} decimals={0} color={color} suffix=""/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════ LISTE / TABLEAU ════════ */}
        <div style={{ padding: '1.5px', borderRadius: 18, background: 'linear-gradient(135deg,#06b6d440,#3b6cf825,#a78bfa15)', animation: 'fadeSlideUp 0.4s 0.15s ease both' }}>
          <div style={{ background: 'rgba(2,8,16,0.97)', borderRadius: '16.5px', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>

            {/* Header barre */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: 'linear-gradient(135deg,rgba(6,182,212,0.06),transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter size={13} color="#06b6d4"/>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0f0' }}>Tous les leads</span>
                <span style={{ fontSize: 11, background: 'rgba(6,182,212,0.12)', color: '#06b6d4', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                  {displayData.length} résultat{displayData.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {hasFilters && (
                  <button onClick={clearFilters} className="db-clear-btn"
                    style={{ fontSize: 11, color: '#ef4444', background: 'rgba(240,68,56,0.08)', border: '1px solid rgba(240,68,56,0.2)', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontWeight: 700, transition: 'background 0.15s' }}>
                    ✕ Effacer filtres
                  </button>
                )}
                <button onClick={() => handlePDF(false)} disabled={pdfLoading} className="db-pdf-dl"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#12b76a', background: 'rgba(18,183,106,0.08)', border: '1px solid rgba(18,183,106,0.2)', borderRadius: 20, padding: '4px 13px', cursor: pdfLoading ? 'wait' : 'pointer', opacity: pdfLoading ? 0.6 : 1, transition: 'background 0.15s' }}>
                  <FileDown size={12}/>{pdfLoading ? 'Génération…' : 'Télécharger PDF'}
                </button>
                <button onClick={() => handlePDF(true)} disabled={pdfLoading} className="db-pdf-view"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#3b6cf8', background: 'rgba(59,108,248,0.08)', border: '1px solid rgba(59,108,248,0.2)', borderRadius: 20, padding: '4px 13px', cursor: pdfLoading ? 'wait' : 'pointer', opacity: pdfLoading ? 0.6 : 1, transition: 'background 0.15s' }}>
                  <ExternalLink size={12}/>Voir PDF
                </button>
              </div>
            </div>

            {/* ── MOBILE : filtres rapides + cards ── */}
            {isMobile ? (
              <div style={{ padding: '12px' }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <input className="db-inp" style={inpSt} placeholder="Prénom / Nom..." value={filters.prenom}
                    onChange={e => setF('prenom', e.target.value)}/>
                  <input className="db-inp" style={inpSt} placeholder="Entreprise..." value={filters.entreprise}
                    onChange={e => setF('entreprise', e.target.value)}/>
                  <select className="db-sel" style={{ ...inpSt, cursor: 'pointer' }} value={filters.ville} onChange={e => setF('ville', e.target.value)}>
                    <option value="">Toutes les villes</option>
                    {villesDispos.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select className="db-sel" style={{ ...inpSt, cursor: 'pointer' }} value={filters.status} onChange={e => setF('status', e.target.value)}>
                    <option value="">Tous les statuts</option>
                    {VALID_STATUTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>

                {loading ? (
                  <div style={{ padding: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#fff' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(244,114,182,0.15)', borderTopColor: '#f472b6', animation: 'spin 0.9s linear infinite' }}/>
                    Chargement…
                  </div>
                ) : displayData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {displayData.map((item, i) => (
                      <div key={item.id}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', animation: i < 30 ? `fadeSlideUp 0.3s ${Math.min(i * 0.03, 0.5)}s ease both` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#e0e0f0', fontSize: 15, lineHeight: 1.2 }}>
                              {item.prenom || ''} {item.nom || ''}
                            </div>
                            {item.entreprise && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                <Building2 size={10} color="#12b76a"/>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#12b76a' }}>{item.entreprise}</span>
                              </div>
                            )}
                          </div>
                          <span style={{ background: `${STATUS_COLOR[item.status]}20`, color: STATUS_COLOR[item.status], borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0, boxShadow: `0 0 6px ${STATUS_COLOR[item.status]}20` }}>
                            {STATUS_LABEL[item.status]}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.ville && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff' }}>
                              <MapPin size={10} color="#3b6cf8"/>{item.ville}
                            </div>
                          )}
                          <span style={{ background: item.typeClient === 'b2b' ? 'rgba(59,108,248,0.18)' : 'rgba(167,139,250,0.18)', color: item.typeClient === 'b2b' ? '#3b6cf8' : '#a78bfa', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                            {item.typeClient}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                          {item.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#fff' }}>
                              <Mail size={9} color="rgba(255,255,255,0.6)"/>{item.email}
                            </div>
                          )}
                          {item.telephone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#fff' }}>
                              <Phone size={9} color="rgba(255,255,255,0.6)"/>{item.telephone}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setSelected(item)} aria-label="Voir la fiche" className="db-mobile-view"
                            style={{ flex: 1, height: 36, borderRadius: 9, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#06b6d4', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}>
                            <Eye size={13}/>Voir
                          </button>
                          <button onClick={() => handleDelete(item)} aria-label="Supprimer la fiche" className="db-mobile-del"
                            disabled={deletingId === item.id}
                            style={{ flex: 1, height: 36, borderRadius: 9, border: '1px solid rgba(240,68,56,0.3)', background: 'rgba(240,68,56,0.08)', cursor: deletingId === item.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#ef4444', fontSize: 12, fontWeight: 700, transition: 'all 0.15s', opacity: deletingId === item.id ? 0.5 : 1 }}>
                            <Trash2 size={13}/>{deletingId === item.id ? '…' : 'Supprimer'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#fff' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(6,182,212,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid rgba(6,182,212,0.1)' }}>
                      <DbIcon size={24} color="#06b6d4" style={{ opacity: 0.4 }}/>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                      {hasFilters ? 'Aucun résultat' : 'Aucun lead'}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {hasFilters ? 'Modifie ou efface les filtres' : 'Ajoute des leads via la page Leads'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── DESKTOP : tableau ── */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>PRÉNOM / NOM</div>
                        <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.prenom} onChange={e => setF('prenom', e.target.value)}/>
                      </th>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>NOM</div>
                        <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.nom} onChange={e => setF('nom', e.target.value)}/>
                      </th>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>EMAIL</div>
                        <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.email} onChange={e => setF('email', e.target.value)}/>
                      </th>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>TÉLÉPHONE</div>
                        <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.telephone} onChange={e => setF('telephone', e.target.value)}/>
                      </th>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>ENTREPRISE</div>
                        <input className="db-inp" style={inpSt} placeholder="Filtrer..." value={filters.entreprise} onChange={e => setF('entreprise', e.target.value)}/>
                      </th>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>VILLE</div>
                        <select className="db-sel" style={{ ...inpSt, cursor: 'pointer' }} value={filters.ville} onChange={e => setF('ville', e.target.value)}>
                          <option value="">Toutes</option>
                          {villesDispos.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </th>
                      <th style={thSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>TYPE</div>
                        <select className="db-sel" style={{ ...inpSt, cursor: 'pointer' }} value={filters.typeClient} onChange={e => setF('typeClient', e.target.value)}>
                          <option value="">Tous</option>
                          <option value="b2b">B2B</option>
                          <option value="b2c">B2C</option>
                        </select>
                      </th>
                      <th style={thStatusSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>STATUT</div>
                        <select className="db-sel" style={{ ...inpSt, cursor: 'pointer' }} value={filters.status} onChange={e => setF('status', e.target.value)}>
                          <option value="">Tous</option>
                          {VALID_STATUTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                      </th>
                      <th style={thActionSt}>
                        <div style={{ fontSize: 10, marginBottom: 6, letterSpacing: 0.8 }}>ACTIONS</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 60, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#fff' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(244,114,182,0.15)', borderTopColor: '#f472b6', animation: 'spin 0.9s linear infinite' }}/>
                            Chargement…
                          </div>
                        </td>
                      </tr>
                    ) : displayData.length > 0 ? displayData.map((item, i) => (
                      <tr key={item.id} className="db-row"
                        style={{ animation: i < 30 ? `fadeSlideUp 0.3s ${Math.min(i * 0.03, 0.5)}s ease both` : 'none' }}>
                        <td style={tdSt}><div style={{ fontWeight: 600 }}>{item.prenom || '—'}</div></td>
                        <td style={tdSt}>{item.nom || '—'}</td>
                        <td style={tdEmailSt}>{item.email || '—'}</td>
                        <td style={tdSt}>{item.telephone || '—'}</td>
                        <td style={tdSt}>
                          {item.entreprise ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <Building2 size={11} color="#12b76a"/>
                              <span style={{ fontWeight: 600, color: '#e0e0f0', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.entreprise}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#fff', fontStyle: 'italic', fontSize: 12 }}>Particulier</span>
                          )}
                        </td>
                        <td style={tdSt}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#fff' }}>
                            <MapPin size={11} color="#3b6cf8"/> {item.ville || '—'}
                          </div>
                        </td>
                        <td style={tdSt}>
                          <span style={{ background: item.typeClient === 'b2b' ? 'rgba(59,108,248,0.18)' : 'rgba(167,139,250,0.18)', color: item.typeClient === 'b2b' ? '#3b6cf8' : '#a78bfa', borderRadius: 7, padding: '3px 9px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                            {item.typeClient}
                          </span>
                        </td>
                        <td style={tdSt}>
                          <span style={{ background: `${STATUS_COLOR[item.status]}20`, color: STATUS_COLOR[item.status], borderRadius: 7, padding: '3px 9px', fontSize: 10, fontWeight: 800, boxShadow: `0 0 6px ${STATUS_COLOR[item.status]}20`, whiteSpace: 'nowrap' }}>
                            {STATUS_LABEL[item.status]}
                          </span>
                        </td>
                        <td style={tdActionSt}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button onClick={() => setSelected(item)} aria-label="Voir la fiche" title="Voir"
                              className="db-action-btn db-action-view"
                              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Eye size={13} color="#06b6d4"/>
                            </button>
                            <button onClick={() => handleDelete(item)} aria-label="Supprimer la fiche" title="Supprimer"
                              className="db-action-btn db-action-del"
                              disabled={deletingId === item.id}
                              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', cursor: deletingId === item.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: deletingId === item.id ? 0.4 : 1 }}>
                              <Trash2 size={13} color="#ef4444"/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={9} style={{ padding: '52px 0', textAlign: 'center', color: '#fff' }}>
                          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(6,182,212,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid rgba(6,182,212,0.1)' }}>
                            <DbIcon size={24} color="#06b6d4" style={{ opacity: 0.4 }}/>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                            {hasFilters ? 'Aucun résultat' : 'Aucun lead'}
                          </div>
                          <div style={{ fontSize: 12 }}>
                            {hasFilters ? 'Modifie ou efface les filtres' : 'Ajoute des leads via la page Leads'}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer compteur */}
            {displayData.length > 0 && (
              <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>
                  <span style={{ fontWeight: 900 }}>{displayData.length}</span> lead{displayData.length !== 1 ? 's' : ''} affichés
                  {anneeFiltre !== 'tout' && <> · <span style={{ fontWeight: 900 }}>{fichesByAnnee.length}</span> pour la période</>}
                  {' · '}<span style={{ fontWeight: 900 }}>{total.toLocaleString('fr-FR')}</span> en base
                </span>
                {hasFilters && (
                  <span style={{ fontSize: 11, background: 'rgba(247,144,9,0.1)', color: '#f79009', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>
                    Filtres actifs
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ════════ MODAL CONFIRMATION SUPPRESSION ════════ */}
      {confirmItem && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmItem(null); }}>
          <div style={{ background: 'rgba(6,6,18,0.99)', border: '1px solid rgba(240,68,56,0.3)', borderRadius: 18, padding: '28px 30px', maxWidth: 360, width: '90%', boxShadow: '0 24px 80px rgba(0,0,0,0.9)', animation: 'fadeSlideUp 0.2s ease both' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e0e0f0', marginBottom: 6 }}>Supprimer ce lead ?</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
              «&nbsp;{confirmItem.entreprise || `${confirmItem.prenom || ''} ${confirmItem.nom || ''}`.trim() || 'Ce lead'}&nbsp;» sera supprimé définitivement.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmItem(null)}
                style={{ flex: 1, height: 42, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#e0e0f0', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>
                Annuler
              </button>
              <button onClick={doDelete} disabled={deletingId !== null}
                style={{ flex: 1, height: 42, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', cursor: deletingId ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: deletingId ? 0.65 : 1 }}>
                {deletingId ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
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
