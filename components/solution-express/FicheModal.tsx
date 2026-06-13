'use client';

import { useState, useEffect } from 'react';

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    h(); window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}
import { X, Shield, Wifi, Smartphone } from 'lucide-react';
import type { Settings, StatusFiche } from '@/types';
import { VALID_STATUTS, STATUS_LABEL } from '@/types';
import DatePicker from './DatePicker';

/* ─── Types exported for page.tsx ─── */
export type FormState = {
  sourceText: string;         sourceUrl: string;
  entreprise: string;         typeCommerce: string;
  ancienneAdresse: string;    typeClient: 'b2b' | 'b2c';
  prenom: string;             nom: string;
  sexe: 'homme' | 'femme' | 'inconnu';
  telephone: string;          email: string;
  adresse: string;            ville: string;
  leadType: string;           qualificationSysteme: string;
  produits: string[];
  fournisseurs: Record<string, { actuel: string; propose: string }>;
  status: StatusFiche;        urgencyScore: number;
  summary: string;            motifAnnulation: string;
  montantContrat: number;
  commissionFixe: number;     commissionExtra: number;
  commissionTotale: number;   commissionPayee: boolean;
  dateVente: string;          datePaiementCommission: string;
  notes: string[];
};

export const EMPTY_FORM: FormState = {
  sourceText: '', sourceUrl: '',
  entreprise: '', typeCommerce: 'autre', ancienneAdresse: '',
  typeClient: 'b2b',
  prenom: '', nom: '', sexe: 'inconnu',
  telephone: '', email: '',
  adresse: '', ville: '',
  leadType: 'nouvelle_entreprise', qualificationSysteme: 'pas_de_systeme',
  produits: [], fournisseurs: {},
  status: 'new', urgencyScore: 0, summary: '',
  motifAnnulation: '',
  montantContrat: 0, commissionFixe: 0, commissionExtra: 0,
  commissionTotale: 0, commissionPayee: false,
  dateVente: '', datePaiementCommission: '',
  notes: [],
};

/* ─── Styles ─── */
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff', outline: 'none',
};
const lbl: React.CSSProperties = { fontSize: 11, color: '#8b8b9e', marginBottom: 5, display: 'block', fontWeight: 600, letterSpacing: 0.4 };

const TABS = ['👤 Contact', '🏢 Entreprise', '🔒 Système', '💰 Commission', '📝 Résumé'];

function ServiceIcon({ icon, size = 12, color }: { icon: string; size?: number; color?: string }) {
  if (icon === 'wifi')       return <Wifi size={size} color={color} />;
  if (icon === 'smartphone') return <Smartphone size={size} color={color} />;
  return <Shield size={size} color={color} />;
}

/* ─── Props ─── */
interface FicheModalProps {
  mode:     'add' | 'edit';
  form:     FormState;
  setForm:  React.Dispatch<React.SetStateAction<FormState>>;
  settings: Settings;
  saving:   boolean;
  onSave:   () => void;
  onClose:  () => void;
}

export default function FicheModal({ mode, form, setForm, settings, saving, onSave, onClose }: FicheModalProps) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState(0);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const produits    = form.produits;
  const fournisseurs = form.fournisseurs;

  const toggleProduit = (id: string) => {
    const arr = produits.includes(id) ? produits.filter(p => p !== id) : [...produits, id];
    set('produits', arr);
    if (!produits.includes(id)) {
      if (!fournisseurs[id]) set('fournisseurs', { ...fournisseurs, [id]: { actuel: '', propose: '' } });
    }
  };

  const commTotal = (form.commissionFixe || 0) + (form.commissionExtra || 0);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
        zIndex: 2000, display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        background: '#0b0b22', border: '1px solid rgba(167,139,250,0.2)',
        borderRadius: isMobile ? '20px 20px 0 0' : 20,
        width: '100%', maxWidth: isMobile ? '100%' : 580,
        maxHeight: isMobile ? '95vh' : '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.1)',
      }}>

        {/* Header */}
        <div style={{ padding: isMobile ? '14px 16px 0' : '18px 22px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>
              {mode === 'edit' ? 'Modifier la fiche' : 'Nouvelle fiche'}
            </h2>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 6px', cursor: 'pointer', color: '#8b8b9e', display: 'flex' }}>
              <X size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {TABS.map((t, i) => (
              <button key={i} onClick={() => setTab(i)} style={{
                padding: '8px 12px', borderRadius: '9px 9px 0 0', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: tab === i ? 700 : 400, whiteSpace: 'nowrap',
                background: tab === i ? 'rgba(167,139,250,0.12)' : 'transparent',
                color: tab === i ? '#a78bfa' : '#6b6b8e',
                borderBottom: tab === i ? '2px solid #a78bfa' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 16px' : '18px 22px' }}>

          {/* ── Tab 0 : Contact ── */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                {(['prenom', 'nom', 'telephone', 'email'] as const).map(k => (
                  <div key={k}>
                    <label style={lbl}>{k === 'prenom' ? 'Prénom' : k === 'nom' ? 'Nom' : k === 'telephone' ? 'Téléphone' : 'Email'}</label>
                    <input value={form[k]} onChange={e => set(k, e.target.value)} style={inp}
                      type={k === 'email' ? 'email' : k === 'telephone' ? 'tel' : 'text'} />
                  </div>
                ))}
              </div>
              <div>
                <label style={lbl}>Sexe</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['homme', 'Homme'], ['femme', 'Femme'], ['inconnu', 'Inconnu']] .map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="radio" name="sexe" value={v} checked={form.sexe === v} onChange={() => set('sexe', v as FormState['sexe'])} style={{ accentColor: '#a78bfa' }} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Ancienne adresse</label>
                <input value={form.ancienneAdresse} onChange={e => set('ancienneAdresse', e.target.value)} style={inp} placeholder="Adresse précédente si déménagement…" />
              </div>
            </div>
          )}

          {/* ── Tab 1 : Entreprise ── */}
          {tab === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Entreprise</label>
                <input value={form.entreprise} onChange={e => set('entreprise', e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Type de commerce</label>
                  <select value={form.typeCommerce} onChange={e => set('typeCommerce', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {settings.typeCommerce.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Type client</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {[['b2b', 'B2B'], ['b2c', 'B2C']].map(([v, l]) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input type="radio" name="typeClient" value={v} checked={form.typeClient === v} onChange={() => set('typeClient', v as FormState['typeClient'])} style={{ accentColor: '#a78bfa' }} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Ville</label>
                  <select value={form.ville} onChange={e => set('ville', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    <option value="">— Sélectionner —</option>
                    {settings.villes.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Adresse</label>
                <input value={form.adresse} onChange={e => set('adresse', e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Source</label>
                  <input value={form.sourceText} onChange={e => set('sourceText', e.target.value)} style={inp} placeholder="Google, Référence…" />
                </div>
                <div>
                  <label style={lbl}>URL source</label>
                  <input value={form.sourceUrl} onChange={e => set('sourceUrl', e.target.value)} style={inp} placeholder="https://…" />
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 2 : Système ── */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Qualification système</label>
                  <select value={form.qualificationSysteme} onChange={e => set('qualificationSysteme', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {settings.qualificationSysteme.map(q => <option key={q.key} value={q.key}>{q.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Type de lead</label>
                  <select value={form.leadType} onChange={e => set('leadType', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                    {settings.typeLead.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Services */}
              <div>
                <label style={lbl}>Services proposés</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {settings.services.map(sv => (
                    <button key={sv.id} type="button" onClick={() => toggleProduit(sv.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 9,
                      border: `1px solid ${produits.includes(sv.id) ? sv.color : 'rgba(255,255,255,0.1)'}`,
                      background: produits.includes(sv.id) ? sv.color + '18' : 'transparent',
                      color: produits.includes(sv.id) ? sv.color : '#8b8b9e',
                      fontSize: 13, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                    }}>
                      <ServiceIcon icon={sv.icon} size={13} color={produits.includes(sv.id) ? sv.color : '#6b6b9e'} />
                      {sv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fournisseurs per service */}
              {produits.map(pid => {
                const sv = settings.services.find(s => s.id === pid);
                if (!sv) return null;
                const fv = fournisseurs[pid] ?? { actuel: '', propose: '' };
                return (
                  <div key={pid} style={{ background: sv.color + '07', border: `1px solid ${sv.color}20`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: sv.color, marginBottom: 10 }}>
                      <ServiceIcon icon={sv.icon} size={13} color={sv.color} /> {sv.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={lbl}>Fournisseur actuel</label>
                        <select value={fv.actuel || ''} onChange={e => set('fournisseurs', { ...fournisseurs, [pid]: { ...fv, actuel: e.target.value } })} style={{ ...inp, cursor: 'pointer' }}>
                          <option value="">— Aucun —</option>
                          {sv.actuel.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Fournisseur proposé</label>
                        <select value={fv.propose || ''} onChange={e => set('fournisseurs', { ...fournisseurs, [pid]: { ...fv, propose: e.target.value } })} style={{ ...inp, cursor: 'pointer' }}>
                          <option value="">— Aucun —</option>
                          {sv.propose.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Statut</label>
                  <select value={form.status} onChange={e => set('status', e.target.value as StatusFiche)} style={{ ...inp, cursor: 'pointer' }}>
                    {VALID_STATUTS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ ...lbl, marginBottom: 8 }}>Urgence : <span style={{ color: form.urgencyScore >= 7 ? '#ef4444' : form.urgencyScore >= 4 ? '#f97316' : '#12b76a', fontWeight: 800 }}>{form.urgencyScore}/10</span></label>
                  <input type="range" min="0" max="10" value={form.urgencyScore} onChange={e => set('urgencyScore', parseInt(e.target.value))} style={{ width: '100%', accentColor: form.urgencyScore >= 7 ? '#ef4444' : form.urgencyScore >= 4 ? '#f97316' : '#12b76a' }} />
                </div>
                {form.status === 'installation_annulee' && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lbl}>Motif d'annulation</label>
                    <select value={form.motifAnnulation} onChange={e => set('motifAnnulation', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                      <option value="">— Sélectionner —</option>
                      {settings.motifsAnnulation.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab 3 : Commission ── */}
          {tab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Commission fixe (TND)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.commissionFixe === 0 ? '' : form.commissionFixe}
                    onChange={e => set('commissionFixe', parseFloat(e.target.value) || 0)}
                    placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Commission extra (TND)</label>
                  <input type="number" min="0" step="0.01"
                    value={form.commissionExtra === 0 ? '' : form.commissionExtra}
                    onChange={e => set('commissionExtra', parseFloat(e.target.value) || 0)}
                    placeholder="0.00" style={inp} />
                </div>
              </div>

              {/* Total preview */}
              <div style={{ background: 'rgba(18,183,106,0.07)', border: '1px solid rgba(18,183,106,0.2)', borderRadius: 12, padding: '14px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6b8b7e', marginBottom: 4 }}>Commission totale</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#12b76a', letterSpacing: -1 }}>
                  {commTotal.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>TND</span>
                </div>
              </div>

<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Date de vente</label>
                  <DatePicker value={form.dateVente} onChange={v => set('dateVente', v)} placeholder="Choisir une date…" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.commissionPayee} onChange={e => set('commissionPayee', e.target.checked)} style={{ accentColor: '#12b76a', width: 16, height: 16 }} />
                    <span style={{ color: form.commissionPayee ? '#12b76a' : '#d0d0f0', fontWeight: 600 }}>Commission payée</span>
                  </label>
                </div>
                {form.commissionPayee && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lbl}>Date de paiement</label>
                    <DatePicker value={form.datePaiementCommission} onChange={v => set('datePaiementCommission', v)} placeholder="Date de paiement…" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab 4 : Résumé ── */}
          {tab === 4 && (
            <div>
              <label style={lbl}>Résumé / Observations</label>
              <textarea
                value={form.summary} onChange={e => set('summary', e.target.value)}
                rows={10} placeholder="Notes libres, observations, informations importantes sur ce client…"
                style={{ ...inp, resize: 'vertical', lineHeight: 1.7, minHeight: 200 }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '10px 16px' : '12px 22px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTab(p => Math.max(0, p - 1))} disabled={tab === 0}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: tab === 0 ? '#4b4b6e' : '#d0d0f0', cursor: tab === 0 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
              ← Précédent
            </button>
            <button onClick={() => setTab(p => Math.min(4, p + 1))} disabled={tab === 4}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: tab === 4 ? '#4b4b6e' : '#d0d0f0', cursor: tab === 4 ? 'not-allowed' : 'pointer', fontSize: 12 }}>
              Suivant →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8b8b9e', fontSize: 13, cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={onSave} disabled={saving} style={{ padding: '9px 24px', borderRadius: 9, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: saving ? 'none' : '0 4px 16px rgba(167,139,250,0.3)' }}>
              {saving ? 'Sauvegarde…' : mode === 'edit' ? 'Modifier' : 'Créer la fiche'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
