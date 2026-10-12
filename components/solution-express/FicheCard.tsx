'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import React from 'react';
import {
  Edit2, Trash2, Shield, Wifi, Smartphone, Tv, Camera, Receipt,
  Phone, Monitor, Printer, CreditCard, Zap, Globe, Headphones, Lock, Home, Car,
  Music, Server, Cloud, Wrench, Bell, Key, Package, Laptop, Tablet, Video,
  MapPin, Mail, User, Calendar,
} from 'lucide-react';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { STATUS_LABEL, STATUS_COLOR } from '@/types';
import useIsMobile from '@/hooks/useIsMobile';
import MiniScoreRing from './MiniScoreRing';
import CommissionBadge from './CommissionBadge';

const LEAD_PALETTE = [
  '#12b76a','#0077b5','#f79009','#a764f8','#f04438','#61DAFB','#8b8b9e',
];

const PIPE_COLOR = STATUS_COLOR;

const LINE: React.CSSProperties = { height:1, background:'rgba(255,255,255,0.06)', margin:'0 0 10px' };

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  wifi: Wifi, smartphone: Smartphone, tv: Tv, camera: Camera, receipt: Receipt,
  phone: Phone, monitor: Monitor, printer: Printer, creditcard: CreditCard,
  zap: Zap, globe: Globe, headphones: Headphones, lock: Lock, home: Home,
  car: Car, music: Music, server: Server, cloud: Cloud, wrench: Wrench,
  bell: Bell, key: Key, package: Package, laptop: Laptop, tablet: Tablet, video: Video,
};
function SvcIcon({ icon, size = 12, color }: { icon: string; size?: number; color?: string }) {
  const Ic = ICON_MAP[icon] ?? Shield;
  return <Ic size={size} color={color}/>;
}

interface FicheCardProps {
  fiche:    SolutionExpress;
  settings: Settings;
  index:    number;
  onOpen:   (f: SolutionExpress) => void;
  onEdit:   (f: SolutionExpress) => void;
  onDelete: (id: string) => void;
  onTogglePaiement: (f: SolutionExpress) => void;
}

export default function FicheCard({ fiche, settings, index, onOpen, onEdit, onDelete, onTogglePaiement }: FicheCardProps) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [tilt,    setTilt]    = useState({ x: 0, y: 0 });
  const [aurora,  setAurora]  = useState({ x: 50, y: 50 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const dx   = (e.clientX - rect.left  - rect.width  / 2) / (rect.width  / 2);
    const dy   = (e.clientY - rect.top   - rect.height / 2) / (rect.height / 2);
    setTilt({ x: dy * 6, y: -dx * 6 });
    setAurora({ x: ((e.clientX-rect.left)/rect.width)*100, y: ((e.clientY-rect.top)/rect.height)*100 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false); setTilt({ x:0, y:0 }); setAurora({ x:50, y:50 });
  }, []);

  const statusColor = PIPE_COLOR[fiche.status];

  /* ── Helpers ── */
  const clientName = [fiche.prenom, fiche.nom].filter(Boolean).join(' ') || '—';
  const initials   = ([fiche.prenom?.[0], fiche.nom?.[0]].filter(Boolean).join('') || (fiche.entreprise?.[0] ?? '?')).toUpperCase();
  const displayName = fiche.typeClient === 'b2c' ? clientName : (fiche.entreprise || clientName);
  const fmtDate    = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : null;

  const activeSvcs = settings.services.filter(sv => (fiche.produits as string[]).includes(sv.id));

  const fourn = fiche.fournisseurs as Record<string, { actuel?: string; propose?: string }>;
  const getLabelAct = (id: string) => {
    const sv = settings.services.find(s => s.id === id);
    const val = fourn[id]?.actuel;
    if (!val || val === 'inconnu') return null;
    return sv?.actuel.find(f => f.key === val)?.label ?? val;
  };
  const getLabelPro = (id: string) => {
    const sv = settings.services.find(s => s.id === id);
    const val = fourn[id]?.propose;
    if (!val || val === 'aucun') return null;
    return sv?.propose.find(f => f.key === val)?.label ?? val;
  };

  /* ── Lead color (indexed by position in settings) ── */
  const leadIdx  = settings.typeLead.findIndex(t => t.key === fiche.leadType);
  const leadColor = LEAD_PALETTE[leadIdx >= 0 ? leadIdx % LEAD_PALETTE.length : 6];
  const leadLabel = settings.typeLead.find(t => t.key === fiche.leadType)?.label ?? fiche.leadType;


  return (
    <div
      ref={cardRef}
      onClick={() => onOpen(fiche)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        position:'relative', borderRadius:20, overflow:'hidden', cursor:'pointer',
        background:'rgba(2,8,16,0.97)',
        border:`1px solid ${hovered ? statusColor+'60' : statusColor+'28'}`,
        borderTop:`3px solid ${statusColor}`,
        boxShadow: hovered
          ? `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px ${statusColor}25, 0 0 30px ${statusColor}10`
          : `0 2px 16px rgba(0,0,0,0.3)`,
        transform: hovered
          ? `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px) scale(1.015)`
          : 'perspective(700px) rotateX(0) rotateY(0) translateY(0) scale(1)',
        transition:'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        animation:`fadeSlideUp 0.4s ${Math.min(index*0.04,0.5)}s ease both`,
      }}
    >
      {/* Aurora interne */}
      <div style={{
        position:'absolute', pointerEvents:'none', borderRadius:'50%',
        width:240, height:240, opacity: hovered ? 0.1 : 0,
        background:`radial-gradient(circle,${statusColor} 0%,transparent 70%)`,
        left:`${aurora.x}%`, top:`${aurora.y}%`, transform:'translate(-50%,-50%)',
        transition:'opacity 0.3s, left 0.12s, top 0.12s',
      }}/>

      <div style={{ padding:'14px 16px' }}>

        {/* ── Avatar + Nom + Score ── */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
          <div style={{ width:44, height:44, borderRadius:13, flexShrink:0, background:`linear-gradient(135deg,${statusColor}35,${statusColor}10)`, border:`1.5px solid ${statusColor}45`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:statusColor, boxShadow: hovered ? `0 0 16px ${statusColor}30` : 'none', transition:'box-shadow 0.2s' }}>
            {initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#fff', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize:11, color:'#fff', marginTop:2 }}>
              {fiche.typeClient==='b2b' ? '🏢 B2B' : '🏠 B2C'}
              {settings.typeCommerce.find(t=>t.key===fiche.typeCommerce)?.label
                ? ` · ${settings.typeCommerce.find(t=>t.key===fiche.typeCommerce)!.label}`
                : ''}
            </div>
            {fiche.entreprise && fiche.typeClient === 'b2b' && clientName !== '—' && (
              <div style={{ fontSize:11, color:'#fff', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {clientName}
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
            <span style={{ background:`${statusColor}18`, border:`1px solid ${statusColor}30`, color:statusColor, borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:800, whiteSpace:'nowrap' }}>
              {STATUS_LABEL[fiche.status]}
            </span>
          </div>
        </div>

        {/* ── Badges lead + partage ── */}
        {(leadLabel || fiche.urgencyScore > 0) && <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:5, marginBottom: fiche.status==='installation_annulee' && fiche.motifAnnulation ? 4 : 10 }}>
          {leadLabel && (
            <span style={{ background:`${leadColor}16`, border:`1px solid ${leadColor}28`, color:leadColor, borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:700 }}>
              {leadLabel}
            </span>
          )}
          {fiche.urgencyScore > 0 && <span style={{ marginLeft:'auto' }}><MiniScoreRing score={fiche.urgencyScore} size={34}/></span>}
        </div>}

        {/* Motif annulation */}
        {fiche.status === 'installation_annulee' && fiche.motifAnnulation && (
          <div style={{ fontSize:10, color:'#be123c', fontWeight:700, marginBottom:8, padding:'3px 8px', borderRadius:6, background:'rgba(190,18,60,0.08)', border:'1px solid rgba(190,18,60,0.2)', display:'inline-block' }}>
            ✕ {fiche.motifAnnulation}
          </div>
        )}

        <div style={LINE}/>

        {/* ── Contact (2 colonnes) ── */}
        {(fiche.telephone || fiche.ville || fiche.email) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px', marginBottom:10, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            {fiche.telephone && (
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:'#fff', minWidth:0 }}>
                <Phone size={10}/> {fiche.telephone}
              </span>
            )}
            {fiche.ville && (
              <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#fff', minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                <MapPin size={10} style={{ flexShrink:0 }}/> {fiche.ville}
              </span>
            )}
            {fiche.email && (
              <span style={{ gridColumn:'1 / -1', display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                <Mail size={10} style={{ flexShrink:0 }}/> {fiche.email}
              </span>
            )}
          </div>
        )}

        {/* ── Qualification ── */}
        {fiche.qualificationSysteme && (
          <div style={{ fontSize:11, color:'#fff', marginBottom:8, background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:6, display:'inline-block' }}>
            🔒 {settings.qualificationSysteme.find(q=>q.key===fiche.qualificationSysteme)?.label ?? (fiche.qualificationSysteme === 'inconnu' ? 'Inconnu' : fiche.qualificationSysteme)}
          </div>
        )}

        {fiche.qualificationSysteme && <div style={LINE}/>}

        {/* ── Services + fournisseurs (un bloc par service) ── */}
        {activeSvcs.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:10 }}>
            {activeSvcs.map(sv => {
              const act = getLabelAct(sv.id);
              const pro = getLabelPro(sv.id);
              return (
                <div key={sv.id} style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6 }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${sv.color}16`, border:`1px solid ${sv.color}30`, color:sv.color, fontSize:10, fontWeight:700, borderRadius:7, padding:'3px 8px' }}>
                    <SvcIcon icon={sv.icon} size={9} color={sv.color}/>{sv.label}
                  </span>
                  {act && <span style={{ fontSize:11, color:'#fff' }}>{act}</span>}
                  {pro && <span style={{ fontSize:11, color:sv.color, fontWeight:700 }}>→ {pro}</span>}
                </div>
              );
            })}
          </div>
        )}

        {activeSvcs.length > 0 && <div style={LINE}/>}

        {/* ── Pied : appels de service + commission ── */}
        {(fiche.appelsService || []).length > 0 && (() => {
          const aps = fiche.appelsService!;
          const impayes = aps.filter(a => !a.paye).length;
          const c = impayes > 0 ? '#f79009' : '#12b76a';
          return (
            <div style={{ fontSize:11, fontWeight:700, color:c, marginBottom:8, padding:'3px 8px', borderRadius:6, background:`${c}14`, border:`1px solid ${c}33`, display:'inline-block' }}>
              📞 {aps.length} appel{aps.length > 1 ? 's' : ''} de service · {impayes > 0 ? `${impayes} non payé${impayes > 1 ? 's' : ''}` : 'payé' + (aps.length > 1 ? 's' : '')}
            </div>
          );
        })()}
        {(fiche.appelsService || []).length > 0 && <div style={LINE}/>}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
          {(fiche.partageAvec || []).length > 0 && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(56,189,248,0.14)', border:'1px solid rgba(56,189,248,0.35)', color:'#38bdf8', borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:700 }}>
              🤝 Partagé avec {(fiche.partageAvec || []).join(', ')}
            </span>
          )}
          <span style={{ marginLeft:'auto' }}><CommissionBadge fiche={fiche} onToggle={onTogglePaiement} compact/></span>
        </div>
      </div>

      {/* ── Actions bar ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6, padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', opacity: isMobile || hovered ? 1 : 0.6, transition:'opacity 0.2s' }}
      >
        {fiche.dateVente && (
          <span style={{ marginRight:'auto', display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#12b76a', fontWeight:700, whiteSpace:'nowrap' }}>
            <Calendar size={10}/> Date de vente : {fmtDate(fiche.dateVente)}
          </span>
        )}
        <button onClick={() => onEdit(fiche)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:'rgba(59,108,248,0.1)', border:'1px solid rgba(59,108,248,0.25)', color:'#3b6cf8', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(59,108,248,0.2)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(59,108,248,0.1)'; }}>
          <Edit2 size={11}/> Modifier
        </button>
        <button onClick={() => onDelete(fiche.id)}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.18)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.08)'; }}>
          <Trash2 size={12}/>
        </button>
      </div>
    </div>
  );
}

