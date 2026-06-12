'use client';

import React, { useState } from 'react';
import {
  X, Edit2, Trash2, Shield, Wifi, Smartphone, Tv, Camera, Receipt, Phone, Mail, MapPin,
  Monitor, Printer, CreditCard, Zap, Globe, Headphones, Lock, Home, Car,
  Music, Server, Cloud, Wrench, Bell, Key, Package, Laptop, Tablet, Video,
  ArrowRight, Plus, Trash, Link, FileText, Check,
} from 'lucide-react';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { STATUS_LABEL, VALID_STATUTS } from '@/types';
import MiniScoreRing from './MiniScoreRing';
import CommissionBadge from './CommissionBadge';

const PIPE_COLOR: Record<StatusFiche, string> = {
  new:                   '#3b6cf8',
  contacted:             '#f79009',
  proposal:              '#a78bfa',
  installation_en_cours: '#f97316',
  installe:              '#12b76a',
  installation_annulee:  '#ef4444',
};

const PIPELINE: StatusFiche[] = ['new', 'contacted', 'proposal', 'installation_en_cours', 'installe'];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  wifi: Wifi, smartphone: Smartphone, tv: Tv, camera: Camera, receipt: Receipt,
  phone: Phone, monitor: Monitor, printer: Printer, creditcard: CreditCard,
  zap: Zap, globe: Globe, headphones: Headphones, lock: Lock, home: Home,
  car: Car, music: Music, server: Server, cloud: Cloud, wrench: Wrench,
  bell: Bell, key: Key, package: Package, laptop: Laptop, tablet: Tablet, video: Video,
};
function ServiceIcon({ icon, size = 13, color }: { icon: string; size?: number; color?: string }) {
  const Ic = ICON_MAP[icon] ?? Shield;
  return <Ic size={size} color={color} />;
}

interface UltraFicheProps {
  fiche:    SolutionExpress;
  settings: Settings;
  onClose:  () => void;
  onEdit:   () => void;
  onDelete: (id: string) => void;
  onChangeStatus: (fiche: SolutionExpress, s: StatusFiche) => void;
  onTogglePaiement: (fiche: SolutionExpress) => void;
  onAddNote:    (fiche: SolutionExpress, note: string) => Promise<void>;
  onDeleteNote: (fiche: SolutionExpress, idx: number) => Promise<void>;
  readOnly?: boolean;
}

export default function UltraFiche({
  fiche, settings, onClose, onEdit, onDelete,
  onChangeStatus, onTogglePaiement, onAddNote, onDeleteNote,
  readOnly = false,
}: UltraFicheProps) {
  const [noteText,   setNoteText]   = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  const color       = PIPE_COLOR[fiche.status];
  const clientName  = [fiche.prenom, fiche.nom].filter(Boolean).join(' ') || '—';
  const initials    = ([fiche.prenom?.[0], fiche.nom?.[0]].filter(Boolean).join('') || (fiche.entreprise?.[0] ?? '?')).toUpperCase();
  const fournisseurs = fiche.fournisseurs as Record<string, { actuel?: string; propose?: string }>;
  const activeSvcs   = settings.services.filter(sv => (fiche.produits as string[]).includes(sv.id));

  const fmt = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleAddNote = async () => {
    const trimmed = noteText.trim();
    if (!trimmed || noteLoading) return;
    setNoteLoading(true);
    await onAddNote(fiche, trimmed);
    setNoteText('');
    setNoteLoading(false);
  };

  const handleDeleteNote = async (idx: number) => {
    setNoteLoading(true);
    await onDeleteNote(fiche, idx);
    setNoteLoading(false);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        background: '#0b0b22', border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 22, width: '100%', maxWidth: 780, maxHeight: '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px ${color}20`,
      }}>

        {/* ─── HEADER ─────────────────────────────── */}
        <div style={{
          padding: '20px 24px 16px',
          background: `linear-gradient(135deg, ${color}18 0%, transparent 60%)`,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          position: 'relative',
        }}>
          {/* Top border accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}50)`, borderRadius: '22px 22px 0 0' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: `linear-gradient(135deg, ${color}40, ${color}15)`,
              border: `2px solid ${color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color,
            }}>
              {initials}
            </div>

            {/* Name block */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
                {fiche.entreprise || clientName}
              </div>
              {fiche.entreprise && (
                <div style={{ fontSize: 13, color: '#8b8b9e', marginTop: 3 }}>{clientName}</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <span style={chip(color)}>{STATUS_LABEL[fiche.status]}</span>
                <span style={chip('#6b6b9e')}>{fiche.typeClient?.toUpperCase()}</span>
                {fiche.typeCommerce && (
                  <span style={chip('#4b5b8e', 10)}>
                    {settings.typeCommerce.find(t => t.key === fiche.typeCommerce)?.label ?? fiche.typeCommerce}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {fiche.urgencyScore > 0 && <MiniScoreRing score={fiche.urgencyScore} size={40} />}
              {/* Actions */}
              {!readOnly && <button onClick={onEdit} style={iconBtn('#3b6cf8')} title="Modifier"><Edit2 size={14} /></button>}
              {!readOnly && <button onClick={() => onDelete(fiche.id)} style={iconBtn('#ef4444')} title="Supprimer"><Trash2 size={14} /></button>}
              <button onClick={onClose} style={iconBtn('#6b6b9e')} title="Fermer"><X size={14} /></button>
            </div>
          </div>
        </div>

        {/* ─── PIPELINE STEPPER ───────────────────── */}
        {fiche.status !== 'installation_annulee' && (
          <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
            {PIPELINE.map((s, i) => {
              const idx = PIPELINE.indexOf(fiche.status);
              const done = i < idx;
              const curr = i === idx;
              const c    = PIPE_COLOR[s];
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <button
                    onClick={() => { if (!curr) onChangeStatus(fiche, s); }}
                    title={STATUS_LABEL[s]}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: curr ? 'default' : 'pointer', padding: '2px 6px',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: curr ? c : done ? c + '50' : 'rgba(255,255,255,0.06)',
                      border: `2px solid ${curr ? c : done ? c + '60' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s',
                      boxShadow: curr ? `0 0 12px ${c}50` : 'none',
                    }}>
                      {done ? <Check size={12} color="#fff" /> : (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: curr ? '#fff' : 'rgba(255,255,255,0.2)' }} />
                      )}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: curr ? 700 : 400, color: curr ? c : done ? '#8b8b9e' : '#4b4b6e', whiteSpace: 'nowrap' }}>
                      {STATUS_LABEL[s]}
                    </span>
                  </button>
                  {i < PIPELINE.length - 1 && (
                    <div style={{ height: 1.5, width: 20, background: i < PIPELINE.indexOf(fiche.status) ? color + '60' : 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
            {/* Annulation button */}
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <button
                onClick={() => onChangeStatus(fiche, 'installation_annulee')}
                style={{ padding: '4px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ─── BODY ───────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 3-col info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {/* Contact */}
            <InfoBlock title="Contact" icon={<Phone size={13} />}>
              <InfoRow label="Téléphone">{fiche.telephone || '—'}</InfoRow>
              <InfoRow label="Email">{fiche.email || '—'}</InfoRow>
              <InfoRow label="Sexe">{fiche.sexe === 'homme' ? 'Homme' : fiche.sexe === 'femme' ? 'Femme' : '—'}</InfoRow>
            </InfoBlock>

            {/* Localisation */}
            <InfoBlock title="Localisation" icon={<MapPin size={13} />}>
              <InfoRow label="Adresse">{fiche.adresse || '—'}</InfoRow>
              <InfoRow label="Ville">{fiche.ville || '—'}</InfoRow>
              {fiche.ancienneAdresse && <InfoRow label="Anc. adresse">{fiche.ancienneAdresse}</InfoRow>}
            </InfoBlock>

            {/* Système */}
            <InfoBlock title="Système" icon={<Shield size={13} />}>
              {fiche.qualificationSysteme && fiche.qualificationSysteme !== 'inconnu' && fiche.qualificationSysteme !== 'pas_de_systeme' && (
                <InfoRow label="Qualification">
                  {settings.qualificationSysteme.find(q => q.key === fiche.qualificationSysteme)?.label ?? fiche.qualificationSysteme}
                </InfoRow>
              )}
              <InfoRow label="Lead">
                {settings.typeLead.find(t => t.key === fiche.leadType)?.label ?? fiche.leadType ?? '—'}
              </InfoRow>
              <InfoRow label="Urgence">
                <span style={{ fontWeight: 700, color: fiche.urgencyScore >= 7 ? '#ef4444' : fiche.urgencyScore >= 4 ? '#f97316' : '#12b76a' }}>
                  {fiche.urgencyScore}/10
                </span>
              </InfoRow>
            </InfoBlock>
          </div>

          {/* Commission */}
          {(fiche.commissionTotale > 0 || fiche.commissionFixe > 0) && (
            <div style={{ background: 'rgba(18,183,106,0.06)', border: '1px solid rgba(18,183,106,0.18)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#12b76a', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Commission</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#6b8b7e' }}>Fixe</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#12b76a' }}>{fiche.commissionFixe?.toFixed(2)} TND</div>
                </div>
                {fiche.commissionExtra > 0 && (
                  <>
                    <div style={{ fontSize: 18, color: '#3b5b5e' }}>+</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b8b7e' }}>Extra</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#12b76a' }}>{fiche.commissionExtra?.toFixed(2)} TND</div>
                    </div>
                    <div style={{ fontSize: 18, color: '#3b5b5e' }}>=</div>
                    <div>
                      <div style={{ fontSize: 11, color: '#6b8b7e' }}>Total</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#12b76a' }}>{fiche.commissionTotale?.toFixed(2)} TND</div>
                    </div>
                  </>
                )}
                <div style={{ marginLeft: 'auto' }}>
                  <CommissionBadge fiche={fiche} onToggle={onTogglePaiement} />
                </div>
              </div>
              {(fiche.dateVente || fiche.datePaiementCommission) && (
                <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(18,183,106,0.12)' }}>
                  {fiche.dateVente && <InfoRow label="Date vente">{fmt(fiche.dateVente)}</InfoRow>}
                  {fiche.datePaiementCommission && <InfoRow label="Date paiement">{fmt(fiche.datePaiementCommission)}</InfoRow>}
                </div>
              )}
            </div>
          )}

          {/* Motif annulation */}
          {fiche.status === 'installation_annulee' && fiche.motifAnnulation && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Motif d'annulation</div>
              <div style={{ fontSize: 13, color: '#e0c0c0' }}>{fiche.motifAnnulation}</div>
            </div>
          )}

          {/* Services + Fournisseurs */}
          {activeSvcs.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b8b9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Services</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeSvcs.map(sv => {
                  const fv   = fournisseurs[sv.id] ?? {};
                  const actL = sv.actuel.find(f => f.key === fv.actuel)?.label ?? fv.actuel ?? '—';
                  const proL = sv.propose.find(f => f.key === fv.propose)?.label ?? fv.propose ?? '—';
                  return (
                    <div key={sv.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: sv.color + '18', border: `1.5px solid ${sv.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ServiceIcon icon={sv.icon} size={14} color={sv.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: sv.color, marginBottom: 4 }}>{sv.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: '#8b8b9e' }}>{actL}</span>
                          <ArrowRight size={10} color={sv.color} />
                          <span style={{ color: sv.color, fontWeight: 600 }}>{proL}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Résumé */}
          {fiche.summary && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8b8b9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={11} /> Résumé
              </div>
              <p style={{ fontSize: 13, color: '#c0c0e0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{fiche.summary}</p>
            </div>
          )}

          {/* Source URL */}
          {(fiche.sourceText || fiche.sourceUrl) && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#6b6b9e' }}>
              <Link size={11} />
              {fiche.sourceText && <span>{fiche.sourceText}</span>}
              {fiche.sourceUrl && (
                <a href={fiche.sourceUrl} target="_blank" rel="noreferrer" style={{ color: '#3b6cf8', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                  {fiche.sourceUrl.length > 50 ? fiche.sourceUrl.slice(0, 50) + '…' : fiche.sourceUrl}
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8b8b9e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Notes ({fiche.notes?.length ?? 0})
            </div>

            {/* Note list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {(fiche.notes ?? []).length === 0 && (
                <p style={{ fontSize: 12, color: '#4b4b6e', fontStyle: 'italic' }}>Aucune note pour le moment…</p>
              )}
              {(fiche.notes ?? []).map((n, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 9, padding: '8px 12px' }}>
                  <p style={{ flex: 1, fontSize: 12, color: '#d0d0f0', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{n}</p>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteNote(i)}
                      disabled={noteLoading}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Trash size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add note */}
            {!readOnly && <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(); } }}
                placeholder="Ajouter une note… (Enter pour valider)"
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 12,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none',
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || noteLoading}
                style={{ padding: '9px 14px', borderRadius: 9, background: '#a78bfa', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !noteText.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Plus size={13} /> Note
              </button>
            </div>}
          </div>

          {/* Meta */}
          <div style={{ fontSize: 10, color: '#3b3b5e', display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 4 }}>
            <span>Créé le {fmt(fiche.createdAt)}</span>
            {fiche.updatedAt !== fiche.createdAt && <span>Modifié le {fmt(fiche.updatedAt)}</span>}
          </div>
        </div>

        {/* ─── FOOTER ─────────────────────────────── */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {/* Quick status change for annulé */}
          {!readOnly && fiche.status === 'installation_annulee' && (
            <button
              onClick={() => onChangeStatus(fiche, 'new')}
              style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(59,108,248,0.1)', border: '1px solid rgba(59,108,248,0.3)', color: '#3b6cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Réactiver
            </button>
          )}
          {!readOnly && (
            <button onClick={onEdit} style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit2 size={13} /> Modifier
            </button>
          )}
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8b8b9e', fontSize: 13, cursor: 'pointer' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#6b6b9e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
        {icon} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#5b5b7e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#d0d0f0', fontWeight: 500 }}>{children}</div>
    </div>
  );
}

const chip = (color: string, fs = 11): React.CSSProperties => ({
  background: color + '18', border: `1px solid ${color}35`, color,
  borderRadius: 6, padding: '3px 9px', fontSize: fs, fontWeight: 700,
});

const iconBtn = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 9,
  background: color + '15', border: `1px solid ${color}30`,
  color, cursor: 'pointer',
});

