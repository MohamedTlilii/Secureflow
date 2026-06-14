'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Fuel, CheckCircle, Clock, MessageSquare, Edit3, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrMsg } from '@/lib/api';
import AnimatedNumber from '@/components/AnimatedNumber';
import type { EssenceMois } from '@/types';
import { MOIS_FULL } from '@/types';

/* ─── cosmos ─────────────────────────────────────────────── */
const PART_COLORS = ['#f59e0b', '#f97316', '#fbbf24', '#3b6cf8', '#12b76a'];
interface Star     { x:number; y:number; s:number; o:number; d:number }
interface Particle { x:number; y:number; s:number; d:number; delay:number; color:string }

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

/* ─── NoteModal ──────────────────────────────────────────── */
function NoteModal({ doc, onClose, onSave }: {
  doc: EssenceMois;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [txt, setTxt] = useState(doc.note || '');
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(11,11,34,0.98),rgba(8,8,24,0.98))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 400, boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', margin: 0 }}>
            💬 Note — {MOIS_FULL[doc.mois]} {doc.annee}
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8b8b9e' }}>
            <X size={14} />
          </button>
        </div>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={4} placeholder="Ajouter une note…"
          style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#8b8b9e', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
          <button onClick={() => onSave(txt)} style={{ flex: 1, padding: '10px 0', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>Sauvegarder</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function EssencePage() {
  const isMobile  = useIsMobile();
  const [data,      setData]      = useState<EssenceMois[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [mounted,   setMounted]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState('');
  const [noteModal, setNoteModal] = useState<EssenceMois | null>(null);

  const starsRef = useRef<Star[]>([]);
  const partsRef = useRef<Particle[]>([]);

  const now         = new Date();
  const curYear     = now.getFullYear();
  const isDecembre  = now.getMonth() === 11;
  const [annee,     setAnnee]     = useState(curYear);

  /* ── cosmos ── */
  useEffect(() => {
    starsRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      s: Math.random() * 2 + 0.4, o: Math.random() * 0.5 + 0.08, d: Math.random() * 5 + 2,
    }));
    partsRef.current = Array.from({ length: 18 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100 + 100,
      s: Math.random() * 5 + 2, d: Math.random() * 18 + 10, delay: Math.random() * 8,
      color: PART_COLORS[Math.floor(Math.random() * PART_COLORS.length)],
    }));
    setMounted(true);
  }, []);

  /* ── fetch ── */
  const fetchData = useCallback(async (yr: number, force = false) => {
    if (!force) setLoading(true);
    try {
      const { data: rows } = await api.get<EssenceMois[]>('/api/essence', { params: { annee: yr } });
      setData(rows);
    } catch (e) {
      toast.error(apiErrMsg(e, 'Erreur chargement'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(annee);
    const onVis = () => { if (!document.hidden) fetchData(annee, true); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchData, annee]);

  /* ── stats locales ── */
  const stats = useMemo(() => {
    const totalAttendu = data.reduce((s, m) => s + m.montantAttendu, 0);
    const totalRecu    = data.filter(m => m.recu).reduce((s, m) => s + m.montantAttendu, 0);
    const moisRecus    = data.filter(m => m.recu).length;
    const pctRecu      = totalAttendu > 0 ? Math.round((totalRecu / totalAttendu) * 100) : 0;
    return { totalAttendu, totalRecu, totalManquant: totalAttendu - totalRecu, moisRecus, moisTotal: data.length, pctRecu };
  }, [data]);

  /* ── patch local ── */
  const patchData = (id: string, patch: Partial<EssenceMois>) =>
    setData(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

  /* ── toggle reçu ── */
  const toggleRecu = async (doc: EssenceMois) => {
    const newRecu = !doc.recu;
    try {
      await api.put(`/api/essence/${doc.id}`, { recu: newRecu });
      patchData(doc.id, { recu: newRecu, dateReception: newRecu ? new Date().toISOString() : null });
      toast.success(newRecu ? '✅ Marqué reçu !' : 'Marqué en attente');
    } catch (e) {
      toast.error(apiErrMsg(e, 'Erreur mise à jour'));
    }
  };

  /* ── save note ── */
  const saveNote = async (note: string) => {
    if (!noteModal) return;
    try {
      await api.put(`/api/essence/${noteModal.id}`, { note });
      patchData(noteModal.id, { note });
      setNoteModal(null);
      toast.success('Note sauvegardée');
    } catch (e) {
      toast.error(apiErrMsg(e, 'Erreur sauvegarde note'));
    }
  };

  /* ── save montant ── */
  const saveMontant = async (doc: EssenceMois) => {
    const v = parseFloat(editVal);
    if (isNaN(v) || v < 0) { setEditingId(null); return; }
    try {
      await api.put(`/api/essence/${doc.id}`, { montantAttendu: +v.toFixed(3) });
      patchData(doc.id, { montantAttendu: +v.toFixed(3) });
      setEditingId(null);
      toast.success('Montant mis à jour');
    } catch (e) {
      toast.error(apiErrMsg(e, 'Erreur — montant non sauvegardé'));
      setEditingId(null);
    }
  };

  /* ── préparer année suivante ── */
  const prepareNextYear = async () => {
    try {
      await api.post('/api/essence/prepare-next');
      toast.success(`🎉 ${curYear + 1} est prêt !`);
    } catch (e) {
      toast.error(apiErrMsg(e, 'Erreur'));
    }
  };

  const pc = stats.pctRecu >= 80 ? '#12b76a' : stats.pctRecu >= 40 ? '#f59e0b' : '#ef4444';

  /* ────────────────── RENDER ────────────────── */
  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: '#fff', overflow: 'hidden' }}>
      <style>{`
        @keyframes twinkle-star  { 0%,100%{opacity:.08} 50%{opacity:.55} }
        @keyframes particle-rise { from{transform:translateY(0);opacity:.4} to{transform:translateY(-100vh);opacity:0} }
        @keyframes fadeSlideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .ess-row:hover { background:rgba(255,255,255,0.035)!important; }
      `}</style>

      {/* Fond */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 120% 80% at 50% -10%,rgba(245,158,11,0.12) 0%,transparent 60%),radial-gradient(ellipse 80% 60% at 90% 50%,rgba(249,115,22,0.07) 0%,transparent 50%),#06060f', zIndex: 0, pointerEvents: 'none' }} />
      {mounted && starsRef.current.map((s, i) => (
        <div key={i} style={{ position: 'fixed', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: '#fff', opacity: s.o, pointerEvents: 'none', zIndex: 0, animation: `twinkle-star ${s.d}s ease-in-out infinite`, animationDelay: `${i * 0.08}s` }} />
      ))}
      {mounted && partsRef.current.map((p, i) => (
        <div key={i} style={{ position: 'fixed', left: `${p.x}%`, bottom: `-${p.y}px`, width: p.s, height: p.s, borderRadius: '50%', background: p.color, opacity: 0.4, pointerEvents: 'none', zIndex: 0, animation: `particle-rise ${p.d}s linear infinite`, animationDelay: `${p.delay}s` }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, padding: isMobile ? '16px 12px 40px' : '28px 32px 40px' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '1.5px', borderRadius: 22, background: 'linear-gradient(135deg,#f59e0b70,#d9770640,#12b76a25)', marginBottom: 20, animation: 'fadeSlideUp 0.4s ease both' }}>
          <div style={{ background: 'rgba(2,8,16,0.97)', borderRadius: '20.5px', padding: isMobile ? '18px 16px' : '28px 32px', backdropFilter: 'blur(40px)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>

              {/* Titre */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#fb923c,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 28px rgba(251,146,60,0.55)', flexShrink: 0 }}>
                    <Fuel size={26} color="#fff" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, letterSpacing: -0.5, background: 'linear-gradient(135deg,#fff 30%,#fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Essence
                    </h1>
                    <button onClick={() => setAnnee(a => a - 1)} disabled={annee <= 2026}
                      style={{ background: 'none', border: 'none', cursor: annee <= 2026 ? 'default' : 'pointer', color: annee <= 2026 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}>
                      <ChevronLeft size={18} />
                    </button>
                    <span style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: annee === curYear ? '#fb923c' : 'rgba(255,255,255,0.7)', letterSpacing: -0.5 }}>
                      {annee}
                    </span>
                    <button onClick={() => setAnnee(a => a + 1)} disabled={annee >= curYear}
                      style={{ background: 'none', border: 'none', cursor: annee >= curYear ? 'default' : 'pointer', color: annee >= curYear ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                {!isMobile && (
                  <div style={{ fontSize: 12, color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', fontWeight: 700, textTransform: 'capitalize' }}>
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
                {isDecembre && annee === curYear && (
                  <button onClick={prepareNextYear}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 11, background: 'linear-gradient(135deg,#12b76a,#059669)', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 16px rgba(18,183,106,0.4)' }}>
                    🚀 Préparer {curYear + 1}
                  </button>
                )}
              </div>

              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'En attente', value: stats.totalManquant, color: '#f59e0b' },
                  { label: 'Total reçu',  value: stats.totalRecu,     color: '#12b76a' },
                  { label: `Total ${annee}`,   value: stats.totalAttendu,  color: '#6366f1' },
                ].map((s, i) => (
                  <div key={i} style={{ background: `${s.color}12`, borderRadius: 12, padding: '12px 16px', border: `1px solid ${s.color}25`, animation: `fadeSlideUp 0.4s ${i * 0.06}s ease both` }}>
                    <div style={{ fontSize: 10, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{s.label}</div>
                    <AnimatedNumber value={s.value} decimals={0} color={s.color} suffix=" TND" />
                  </div>
                ))}
              </div>

              {/* Barre progression */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: '#fff' }}>
                  <span>Mois reçus · {stats.moisRecus} / {stats.moisTotal}</span>
                  <span style={{ fontWeight: 700, color: pc }}>{stats.pctRecu}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg,#f59e0b,${pc})`, width: `${stats.pctRecu}%`, transition: 'width 1.2s ease' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LISTE MOIS ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(245,158,11,0.15)', borderTopColor: '#f59e0b', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14, color: '#fff' }}>Chargement…</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map((m, i) => (
              <div key={m.id} className="ess-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, flexWrap: isMobile ? 'wrap' : 'nowrap',
                  background: m.recu ? 'rgba(18,183,106,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${m.recu ? 'rgba(18,183,106,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14, padding: isMobile ? '12px 14px' : '14px 18px',
                  transition: 'all 0.15s', animation: `fadeSlideUp 0.35s ${i * 0.04}s ease both`,
                }}>

                {/* Icon */}
                <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: m.recu ? 'rgba(18,183,106,0.15)' : 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${m.recu ? 'rgba(18,183,106,0.25)' : 'rgba(245,158,11,0.15)'}` }}>
                  <Fuel size={15} color={m.recu ? '#12b76a' : '#f59e0b'} />
                </div>

                {/* Mois */}
                <div style={{ minWidth: isMobile ? 0 : 130, flex: isMobile ? 1 : undefined }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: m.recu ? '#12b76a' : 'rgba(255,255,255,0.9)' }}>
                    {MOIS_FULL[m.mois]}
                  </div>
                  {m.dateReception && (
                    <div style={{ fontSize: 11, color: '#fff', marginTop: 3 }}>
                      Reçu le {new Date(m.dateReception).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>

                {/* Montant éditable */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === m.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                        autoFocus step="0.001"
                        style={{ width: isMobile ? 90 : 120, padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}
                        onKeyDown={e => { if (e.key === 'Enter') saveMontant(m); if (e.key === 'Escape') setEditingId(null); }} />
                      <button onClick={() => saveMontant(m)} style={{ background: 'rgba(18,183,106,0.15)', border: '1px solid rgba(18,183,106,0.3)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#12b76a', display: 'flex' }}><Check size={13} /></button>
                      <button onClick={() => setEditingId(null)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><X size={13} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                      onClick={() => { setEditingId(m.id); setEditVal(String(m.montantAttendu)); }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: m.recu ? '#12b76a' : '#f59e0b', letterSpacing: -0.5 }}>
                        {Math.round(m.montantAttendu)} TND
                      </span>
                      <Edit3 size={12} color="rgba(255,255,255,0.25)" />
                    </div>
                  )}
                  {m.note && (
                    <div style={{ fontSize: 11, color: '#fff', fontStyle: 'italic', marginTop: 3 }}>💬 {m.note}</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, ...(isMobile && { width: '100%', justifyContent: 'flex-end' }) }}>
                  <button onClick={() => setNoteModal(m)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(59,108,248,0.1)', border: '1px solid rgba(59,108,248,0.2)', borderRadius: 9, padding: '7px 12px', color: '#3b6cf8', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    <MessageSquare size={13} /> Note
                  </button>
                  <button onClick={() => toggleRecu(m)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: m.recu ? 'rgba(18,183,106,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${m.recu ? 'rgba(18,183,106,0.25)' : 'rgba(255,255,255,0.09)'}`,
                      borderRadius: 9, padding: '7px 14px',
                      color: m.recu ? '#12b76a' : '#f59e0b',
                      cursor: 'pointer', fontSize: 12, fontWeight: 800, transition: 'all 0.15s',
                    }}>
                    {m.recu ? <><CheckCircle size={13} /> Reçu</> : <><Clock size={13} /> En att.</>}
                  </button>
                </div>
              </div>
            ))}

            {data.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#fff', fontSize: 14 }}>
                Aucune donnée pour {annee}
              </div>
            )}
          </div>
        )}
      </div>

      {noteModal && (
        <NoteModal doc={noteModal} onClose={() => setNoteModal(null)} onSave={saveNote} />
      )}
    </div>
  );
}
