'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import React from 'react';

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    h(); window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}
import {
  Edit2, Trash2, Shield, Wifi, Smartphone, Tv, Camera, Receipt,
  Phone, Monitor, Printer, CreditCard, Zap, Globe, Headphones, Lock, Home, Car,
  Music, Server, Cloud, Wrench, Bell, Key, Package, Laptop, Tablet, Video,
  MapPin, Mail, User, Calendar,
} from 'lucide-react';
import type { SolutionExpress, Settings, StatusFiche } from '@/types';
import { STATUS_LABEL } from '@/types';
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

const LEAD_PALETTE = [
  '#12b76a','#0077b5','#f79009','#a764f8','#f04438','#61DAFB','#8b8b9e',
];

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
  const fmtDate    = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : null;

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


  /* ── Dernière note ── */
  const lastNote = fiche.notes?.length ? fiche.notes[fiche.notes.length - 1] : null;

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
            {fiche.entreprise && fiche.typeClient === 'b2b' && clientName !== '—' && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {clientName}
              </div>
            )}
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>
              {fiche.typeClient==='b2b' ? '🏢 B2B' : '🏠 B2C'}
              {settings.typeCommerce.find(t=>t.key===fiche.typeCommerce)?.label
                ? ` · ${settings.typeCommerce.find(t=>t.key===fiche.typeCommerce)!.label}`
                : ''}
            </div>
          </div>
          {fiche.urgencyScore > 0 && <MiniScoreRing score={fiche.urgencyScore} size={34}/>}
        </div>

        {/* ── Badges statut + lead ── */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom: fiche.status==='installation_annulee' && fiche.motifAnnulation ? 4 : 10 }}>
          <span style={{ background:`${statusColor}18`, border:`1px solid ${statusColor}30`, color:statusColor, borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:800 }}>
            {STATUS_LABEL[fiche.status]}
          </span>
          {leadLabel && (
            <span style={{ background:`${leadColor}16`, border:`1px solid ${leadColor}28`, color:leadColor, borderRadius:7, padding:'3px 9px', fontSize:10, fontWeight:700 }}>
              {leadLabel}
            </span>
          )}
        </div>

        {/* Motif annulation */}
        {fiche.status === 'installation_annulee' && fiche.motifAnnulation && (
          <div style={{ fontSize:10, color:'#be123c', fontWeight:700, marginBottom:8, padding:'3px 8px', borderRadius:6, background:'rgba(190,18,60,0.08)', border:'1px solid rgba(190,18,60,0.2)', display:'inline-block' }}>
            ✕ {fiche.motifAnnulation}
          </div>
        )}

        {/* ── Services (chips) ── */}
        {activeSvcs.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {activeSvcs.map(sv => (
              <span key={sv.id} style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${sv.color}16`, border:`1px solid ${sv.color}30`, color:sv.color, fontSize:10, fontWeight:700, borderRadius:7, padding:'3px 8px' }}>
                <SvcIcon icon={sv.icon} size={9} color={sv.color}/>{sv.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Fournisseurs actuel → proposé ── */}
        {activeSvcs.map(sv => {
          const act = getLabelAct(sv.id);
          const pro = getLabelPro(sv.id);
          if (!act && !pro) return null;
          return (
            <div key={sv.id} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
              <SvcIcon icon={sv.icon} size={9} color={sv.color}/>
              {act && <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{act}</span>}
              {act && pro && <span style={{ fontSize:11, color:sv.color, fontWeight:700 }}>→ {pro}</span>}
              {!act && pro && <span style={{ fontSize:11, color:sv.color, fontWeight:700 }}>→ {pro}</span>}
            </div>
          );
        })}


        {/* ── Qualification ── */}
        {fiche.qualificationSysteme && fiche.qualificationSysteme !== 'inconnu' && fiche.qualificationSysteme !== 'pas_de_systeme' && (
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:7, background:'rgba(255,255,255,0.04)', padding:'3px 8px', borderRadius:6, display:'inline-block' }}>
            🔒 {settings.qualificationSysteme.find(q=>q.key===fiche.qualificationSysteme)?.label ?? fiche.qualificationSysteme}
          </div>
        )}

        {/* ── Résumé ── */}
        {fiche.summary && (
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.5, marginBottom:8, marginTop:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', borderLeft:`2px solid ${leadColor}`, paddingLeft:8, background:`${leadColor}06`, borderRadius:'0 6px 6px 0', padding:'5px 5px 5px 9px' }}>
            {fiche.summary}
          </p>
        )}

        {/* ── Dernière note ── */}
        {lastNote && (
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:8, background:'rgba(255,255,255,0.03)', padding:'5px 9px', borderRadius:7, borderLeft:'2px solid #12b76a', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', fontStyle:'italic' }}>
            💬 {lastNote}
          </div>
        )}

        {/* ── Contact ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:8, marginTop:4 }}>
          {fiche.telephone && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'rgba(255,255,255,0.5)' }}>
              <Phone size={10}/> {fiche.telephone}
            </span>
          )}
          {fiche.email && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.4)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              <Mail size={10}/> {fiche.email}
            </span>
          )}
          {fiche.ville && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
              <MapPin size={10}/> {fiche.ville}
            </span>
          )}
          {fiche.typeClient === 'b2b' && clientName !== '—' && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.35)' }}>
              <User size={10}/> {clientName}
            </span>
          )}
          {fiche.dateVente && (
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
              <Calendar size={10}/> {fmtDate(fiche.dateVente)}
            </span>
          )}
        </div>

        {/* ── Commission badge ── */}
        <CommissionBadge fiche={fiche} onToggle={onTogglePaiement}/>
      </div>

      {/* ── Actions bar ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display:'flex', justifyContent:'flex-end', gap:6, padding:'9px 14px', borderTop:'1px solid rgba(255,255,255,0.05)', opacity: isMobile || hovered ? 1 : 0.35, transition:'opacity 0.2s' }}
      >
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

