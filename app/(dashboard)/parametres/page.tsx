'use client';

import { useState, useEffect, useCallback, useRef, useMemo, CSSProperties } from 'react';
import {
  Settings, MapPin, Building2, TrendingUp, Star, Shield, Wifi, Smartphone, Tv, Camera, Receipt,
  Phone, Monitor, Printer, CreditCard, Zap, Globe, Headphones, Lock, Home, Car,
  Music, Server, Cloud, Wrench, Bell, Key, Package, Laptop, Tablet, Video,
  Plus, X, Save, CheckCircle, AlertCircle, ChevronRight, Loader, Trash2, Edit2, UserCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrMsg } from '@/lib/api';
import { invalidateSettingsCache } from '@/lib/settings-cache';
import type { Settings as SettingsType, Service } from '@/types';
import { useAuth } from '@/context/AuthContext';
import useIsMobile from '@/hooks/useIsMobile';
import CosmosBackground from '@/components/CosmosBackground';

const CURRENCY = 'TND';
const PARAMS_PART_COLORS = ['#a78bfa','#3b6cf8','#8b5cf6','#06b6d4','#12b76a'];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}
function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'');
}

function sortedJSON(v: unknown): string {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return JSON.stringify(v);
  const obj = v as Record<string,unknown>;
  return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k)+':'+sortedJSON(obj[k])).join(',') + '}';
}

/* ─── Tabs ─── */
const TABS = [
  { id:'profil',           label:'Profil',              Icon:UserCircle2, color:'#38bdf8' },
  { id:'villes',           label:'Villes',              Icon:MapPin,      color:'#38bdf8' },
  { id:'typeCommerce',     label:'Commerce',            Icon:Building2,   color:'#f79009' },
  { id:'typeLead',         label:'Lead',                Icon:Zap,         color:'#a764f8' },
  { id:'qualification',    label:'Qualification',       Icon:Star,        color:'#f04438' },
  { id:'services',         label:'Services',            Icon:Shield,      color:'#6366f1' },
  { id:'objectifAnnuel',   label:'Objectif annuel',     Icon:TrendingUp,  color:'#12b76a' },
  { id:'motifsAnnulation', label:"Motifs d'annulation", Icon:AlertCircle, color:'#ef4444' },
  { id:'commissionDefaut', label:'Commission défaut',   Icon:CreditCard,  color:'#12b76a' },
];

const ICON_OPTIONS = [
  { key:'shield',     Icon:Shield,     label:'Alarme'      },
  { key:'wifi',       Icon:Wifi,       label:'Internet'    },
  { key:'smartphone', Icon:Smartphone, label:'Mobile'      },
  { key:'tv',         Icon:Tv,         label:'TV'          },
  { key:'camera',     Icon:Camera,     label:'Caméras'     },
  { key:'receipt',    Icon:Receipt,    label:'Interac'     },
  { key:'phone',      Icon:Phone,      label:'Téléphone'   },
  { key:'monitor',    Icon:Monitor,    label:'Écran'       },
  { key:'printer',    Icon:Printer,    label:'Imprimante'  },
  { key:'creditcard', Icon:CreditCard, label:'Paiement'    },
  { key:'zap',        Icon:Zap,        label:'Électricité' },
  { key:'globe',      Icon:Globe,      label:'Web'         },
  { key:'headphones', Icon:Headphones, label:'Audio'       },
  { key:'lock',       Icon:Lock,       label:'Sécurité'    },
  { key:'home',       Icon:Home,       label:'Résidentiel' },
  { key:'car',        Icon:Car,        label:'Automobile'  },
  { key:'music',      Icon:Music,      label:'Musique'     },
  { key:'server',     Icon:Server,     label:'Serveur'     },
  { key:'cloud',      Icon:Cloud,      label:'Cloud'       },
  { key:'wrench',     Icon:Wrench,     label:'Maintenance' },
  { key:'bell',       Icon:Bell,       label:'Alerte'      },
  { key:'key',        Icon:Key,        label:'Accès'       },
  { key:'package',    Icon:Package,    label:'Forfait'     },
  { key:'laptop',     Icon:Laptop,     label:'Laptop'      },
  { key:'tablet',     Icon:Tablet,     label:'Tablette'    },
  { key:'video',      Icon:Video,      label:'Vidéo'       },
];

function getServiceIcon(iconKey: string) {
  const opt = ICON_OPTIONS.find(o => o.key === iconKey);
  return opt ? opt.Icon : Shield;
}

const PROFIL_INPUT_STYLE: CSSProperties = {
  width:'100%', padding:'9px 14px', borderRadius:10,
  border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)',
  color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s',
};

/* ─────────────────── Tag chip ─────────────────── */
function Tag({ label, onRemove, color }: { label:string; onRemove:()=>void; color:string }) {
  return (
    <div
      className="params-tag"
      style={{ '--c22': color+'22', '--c66': color+'66', display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px 5px 12px', borderRadius:20, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', fontSize:12, fontWeight:500, color:'#e0e0f0' } as CSSProperties}
    >
      {label}
      <button className="params-tag-x" onClick={onRemove} style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', color:'rgba(255,255,255,0.4)' }}>
        <X size={11}/>
      </button>
    </div>
  );
}

/* ─────────────────── SimpleSection (Villes, Motifs) ─────────────────── */
function SimpleSection({ items, color, placeholder, onAdd, onRemove }: {
  items:string[]; color:string; placeholder:string;
  onAdd:(v:string)=>void; onRemove:(i:number)=>void;
}) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const add = () => {
    const v = val.trim();
    if (!v) return;
    if (items.some(it => normalize(it) === normalize(v))) { toast.error('Déjà dans la liste'); return; }
    onAdd(v); setVal(''); ref.current?.focus();
  };
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key==='Enter' && add()} placeholder={placeholder}
          style={{ flex:1, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', transition:'border-color 0.2s' }}
          onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
        />
        <button onClick={add} className="params-add-btn"
          style={{ '--c': color, '--c30': color+'30', display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:`1px solid ${color}44`, background:`${color}18`, color, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' } as CSSProperties}>
          <Plus size={13}/> Ajouter
        </button>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {items.length === 0 && <span style={{ color:'#fff', fontSize:12, fontStyle:'italic' }}>Aucune entrée — ajoutez-en une ci-dessus</span>}
        {items.map(v => <Tag key={v} label={v} color={color} onRemove={() => onRemove(items.indexOf(v))}/>)}
      </div>
    </div>
  );
}

/* ─────────────────── KeyLabelSection (Commerce, Lead, Qualif) ─────────────────── */
function KeyLabelSection({ items, color, placeholder, onAdd, onRemove }: {
  items:{key:string;label:string}[]; color:string; placeholder:string;
  onAdd:(item:{key:string;label:string})=>void; onRemove:(i:number)=>void;
  getItemColor?:(it:{key:string;label:string})=>string;
}) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const add = () => {
    const label = val.trim();
    if (!label) return;
    const key = slugify(label);
    if (!key) return;
    if (items.some(it => it.key === key || normalize(it.label) === normalize(label))) { toast.error('Déjà dans la liste'); return; }
    onAdd({ key, label }); setVal(''); ref.current?.focus();
  };
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        <input ref={ref} value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key==='Enter' && add()} placeholder={placeholder}
          style={{ flex:1, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', transition:'border-color 0.2s' }}
          onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
        />
        <button onClick={add} className="params-add-btn"
          style={{ '--c': color, '--c30': color+'30', display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:`1px solid ${color}44`, background:`${color}18`, color, fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' } as CSSProperties}>
          <Plus size={13}/> Ajouter
        </button>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {items.length === 0 && <span style={{ color:'#fff', fontSize:12, fontStyle:'italic' }}>Aucune entrée</span>}
        {items.map((it, i) => <Tag key={it.key} label={it.label} color={color} onRemove={() => onRemove(i)}/>)}
      </div>
    </div>
  );
}

/* ─────────────────── ObjectifSection ─────────────────── */
function ObjectifSection({ objectifs, onAdd, onRemove }: {
  objectifs:Record<string,number>;
  onAdd:(annee:string,montant:number)=>void;
  onRemove:(annee:string)=>void;
}) {
  const [annee,   setAnnee]   = useState(String(new Date().getFullYear()));
  const [montant, setMontant] = useState('');
  const color = '#12b76a';

  const entries = useMemo(() =>
    Object.entries(objectifs).sort((a,b) => Number(b[0]) - Number(a[0])),
  [objectifs]);

  const add = () => {
    const m = parseFloat(montant);
    if (!annee || !m || m <= 0) { toast.error('Année et montant requis'); return; }
    onAdd(annee, m); setMontant('');
  };

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Année</div>
          <input type="number" min="2020" max="2099" step="1" value={annee} onChange={e => setAnnee(e.target.value)}
            style={{ width:90, padding:'9px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', transition:'border-color 0.2s' }}
            onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
          />
        </div>
        <div>
          <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Objectif</div>
          <input type="number" min="0" value={montant} onChange={e => setMontant(e.target.value)} onKeyDown={e => e.key==='Enter' && add()} placeholder="Ex: 5000"
            style={{ width:140, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', transition:'border-color 0.2s' }}
            onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
          />
        </div>
        <span style={{ alignSelf:'center', fontSize:12, color:'#fff', paddingBottom:2 }}>{CURRENCY}</span>
        <button onClick={add} className="params-add-btn"
          style={{ '--c': color, '--c30': color+'30', display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, border:`1px solid ${color}44`, background:`${color}18`, color, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' } as CSSProperties}>
          <Plus size={13}/> Ajouter
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {entries.length === 0 && <div style={{ color:'#fff', fontSize:12, fontStyle:'italic' }}>Aucun objectif — ajoutez-en un ci-dessus</div>}
        {entries.map(([yr, mt]) => (
          <div key={yr} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12, background:'rgba(18,183,106,0.06)', border:'1px solid rgba(18,183,106,0.18)' }}>
            <div style={{ fontSize:15, fontWeight:800, color:'#12b76a', minWidth:48 }}>{yr}</div>
            <div style={{ flex:1 }} />
            <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{mt.toLocaleString()} {CURRENCY}</div>
            <button className="params-obj-x" onClick={() => onRemove(yr)}
              style={{ background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}>
              <X size={15}/>
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, color:'#fff', marginTop:12 }}>Barre de progression visible sur le Dashboard et Commissions selon l'année sélectionnée.</div>
    </div>
  );
}

/* ─────────────────── ServiceSection ─────────────────── */
function ServiceSection({ services, onUpdate, isMobile }: {
  services:Service[]; onUpdate:(s:Service[])=>void; isMobile:boolean;
}) {
  const [expanded,      setExpanded]      = useState<number|null>(null);
  const [adding,        setAdding]        = useState(false);
  const [newLabel,      setNewLabel]      = useState('');
  const [newColor,      setNewColor]      = useState('#6366f1');
  const [newIcon,       setNewIcon]       = useState('shield');
  const [editingIdx,    setEditingIdx]    = useState<number|null>(null);
  const [editLabel,     setEditLabel]     = useState('');
  const [editColor,     setEditColor]     = useState('');
  const [confirmDelIdx, setConfirmDelIdx] = useState<number|null>(null);

  const startEdit = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setEditingIdx(idx); setEditLabel(services[idx].label); setEditColor(services[idx].color);
  };

  const saveEdit = (idx: number) => {
    const label = editLabel.trim();
    if (!label) { setEditingIdx(null); return; }
    onUpdate(services.map((s, i) => i === idx ? { ...s, label, color: editColor } : s));
    setEditingIdx(null); toast.success('Service mis à jour !');
  };

  const addService = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = slugify(label);
    if (!id) return;
    if (services.some(s => s.id === id)) { toast.error('Service déjà existant'); return; }
    onUpdate([...services, {
      id, label, color: newColor, icon: newIcon,
      actuel:  [{ key:'inconnu', label:'Inconnu' }, { key:'autre', label:'Autre' }],
      propose: [{ key:'aucun',   label:'Aucun'   }, { key:'autre', label:'Autre' }],
    }]);
    setNewLabel(''); setNewIcon('shield'); setAdding(false);
    toast.success(`Service "${label}" créé !`);
  };

  const confirmDelete = () => {
    if (confirmDelIdx === null) return;
    onUpdate(services.filter((_, i) => i !== confirmDelIdx));
    setConfirmDelIdx(null);
  };

  const updateList = (idx: number, listKey: 'actuel'|'propose', newList: {key:string;label:string}[]) =>
    onUpdate(services.map((s, i) => i === idx ? { ...s, [listKey]: newList } : s));

  return (
    <div>
      {services.map((svc, idx) => {
        const Ic = getServiceIcon(svc.icon);
        return (
          <div key={svc.id} style={{ marginBottom:10, border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden' }}>

            {editingIdx === idx ? (
              <div onClick={e => e.stopPropagation()}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:`${svc.color}12` }}>
                <Ic size={16} color={editColor} style={{ flexShrink:0 }}/>
                <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') saveEdit(idx); if (e.key==='Escape') setEditingIdx(null); }}
                  style={{ flex:1, padding:'6px 10px', borderRadius:8, border:`1px solid ${editColor}66`, background:'rgba(255,255,255,0.06)', color:'#fff', fontSize:13, fontWeight:700, outline:'none' }}
                />
                <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                  style={{ width:36, height:34, borderRadius:6, border:'1px solid rgba(255,255,255,0.12)', background:'none', cursor:'pointer', padding:2, flexShrink:0 }}
                />
                <button onClick={() => saveEdit(idx)}
                  style={{ background:editColor, border:'none', borderRadius:8, cursor:'pointer', color:'#fff', padding:'6px 14px', fontSize:12, fontWeight:800, flexShrink:0 }}>OK</button>
                <button onClick={() => setEditingIdx(null)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#fff', padding:4, display:'flex', alignItems:'center' }}>
                  <X size={14}/>
                </button>
              </div>
            ) : (
              <div onClick={() => setExpanded(expanded === idx ? null : idx)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px', cursor:'pointer', transition:'background 0.15s', background: expanded === idx ? `${svc.color}12` : 'transparent' }}>
                <Ic size={16} color={svc.color} style={{ flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:14, fontWeight:700, color:'#e0e0f0' }}>{svc.label}</span>
                <span style={{ fontSize:11, color:'#fff', marginRight:4 }}>
                  {svc.actuel?.length || 0} actuel · {svc.propose?.length || 0} proposé
                </span>
                <button onClick={e => startEdit(e, idx)} className="params-svc-edit" aria-label="Modifier"
                  style={{ '--svc-c': svc.color, background:'none', border:'none', cursor:'pointer', padding:'3px 6px', borderRadius:6, display:'flex', alignItems:'center' } as CSSProperties}>
                  <Edit2 size={13}/>
                </button>
                <button onClick={e => { e.stopPropagation(); setConfirmDelIdx(idx); }} className="params-svc-del" aria-label="Supprimer"
                  style={{ background:'none', border:'none', cursor:'pointer', padding:'3px 6px', borderRadius:6, display:'flex', alignItems:'center' }}>
                  <Trash2 size={13}/>
                </button>
                <ChevronRight size={14} style={{ color:'#fff', transform: expanded===idx ? 'rotate(90deg)' : 'none', transition:'transform 0.2s', flexShrink:0 }}/>
              </div>
            )}

            {expanded === idx && (
              <div style={{ padding:18, borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:20 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:'#fff', marginBottom:10 }}>Fournisseurs — Actuel</div>
                    <KeyLabelSection
                      items={svc.actuel || []} color={svc.color} placeholder="Ex: Vidéotron, Bell..."
                      onAdd={item => updateList(idx, 'actuel', [...(svc.actuel||[]), item])}
                      onRemove={i => updateList(idx, 'actuel', (svc.actuel||[]).filter((_,j) => j!==i))}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:svc.color, marginBottom:10 }}>Fournisseurs — Proposé</div>
                    <KeyLabelSection
                      items={svc.propose || []} color={svc.color} placeholder="Ex: Notre offre, Autre..."
                      onAdd={item => updateList(idx, 'propose', [...(svc.propose||[]), item])}
                      onRemove={i => updateList(idx, 'propose', (svc.propose||[]).filter((_,j) => j!==i))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div style={{ border:'1px solid rgba(99,102,241,0.3)', borderRadius:14, padding:18, background:'rgba(99,102,241,0.05)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa', marginBottom:14, textTransform:'uppercase', letterSpacing:0.8 }}>Nouveau service</div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'#fff', marginBottom:8, fontWeight:600 }}>Icône</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {ICON_OPTIONS.map(({ key, Icon, label }) => {
                const sel    = newIcon === key;
                const usedBy = services.find(s => s.icon === key);
                return (
                  <button key={key} type="button" onClick={() => setNewIcon(key)} title={usedBy ? `${label} (utilisé par ${usedBy.label})` : label}
                    style={{ position:'relative', width:38, height:38, borderRadius:9, border:`2px solid ${sel ? newColor : usedBy ? `${usedBy.color}60` : 'rgba(255,255,255,0.1)'}`, background: sel ? `${newColor}22` : usedBy ? `${usedBy.color}12` : 'rgba(255,255,255,0.04)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                    <Icon size={15} color={sel ? newColor : usedBy ? usedBy.color : 'rgba(255,255,255,0.5)'}/>
                    {usedBy && !sel && <span style={{ position:'absolute', bottom:3, right:3, width:5, height:5, borderRadius:'50%', background:usedBy.color }}/>}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Nom du service</div>
              <input value={newLabel} autoFocus onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key==='Enter' && addService()} placeholder="Ex: Abonnement TV..."
                style={{ width:'100%', padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                onFocus={e => (e.target.style.borderColor='#a78bfa')} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
              />
            </div>
            <div>
              <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Couleur</div>
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                style={{ width:50, height:40, borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'none', cursor:'pointer', padding:2 }}/>
            </div>
            <button onClick={addService}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:10, border:'1px solid #6366f144', background:'#6366f118', color:'#a78bfa', fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              <Plus size={13}/> Créer
            </button>
            <button onClick={() => { setAdding(false); setNewLabel(''); setNewIcon('shield'); }}
              style={{ display:'flex', alignItems:'center', padding:'10px 12px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'none', color:'#fff', cursor:'pointer' }}>
              <X size={13}/>
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="params-svc-add"
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:14, borderRadius:14, border:'1px dashed rgba(99,102,241,0.35)', background:'transparent', color:'#a78bfa', fontSize:13, fontWeight:600, cursor:'pointer', marginTop: services.length > 0 ? 8 : 0 }}>
          <Plus size={14}/> Ajouter un service
        </button>
      )}

      {confirmDelIdx !== null && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelIdx(null); }}>
          <div style={{ background:'rgba(6,6,18,0.99)', border:'1px solid rgba(240,68,56,0.3)', borderRadius:18, padding:'28px 30px', maxWidth:360, width:'90%', boxShadow:'0 24px 80px rgba(0,0,0,0.9)', animation:'fadeSlideUp 0.2s ease both' }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#e0e0f0', marginBottom:6 }}>Supprimer ce service ?</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:24 }}>
              « {services[confirmDelIdx]?.label} » sera supprimé. Les leads qui utilisent ce service ne seront pas affectés.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDelIdx(null)}
                style={{ flex:1, height:42, borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#e0e0f0', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                Annuler
              </button>
              <button onClick={confirmDelete}
                style={{ flex:1, height:42, borderRadius:10, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── ProfilSection ─────────────────── */
const PROFILE_AVATARS = [
  '👤','👨‍💼','🧑‍💻','🎩','🕵️','🤵',
  '🦁','🦊','🐺','🦅','🐯','🦋','🐻','🦄',
  '🎯','🌟','🔥','💎','🚀','⚡','🏆','🛡️',
  '💡','🎭','🌙','🎸','🤝','🎪','🧲','🎲',
];

function ProfilSection() {
  const { user, refreshUser } = useAuth();
  const [name,       setName]       = useState(user?.name || '');
  const [role,       setRole]       = useState(user?.role || '');
  const [email,      setEmail]      = useState(user?.email || '');
  const [dateDebut,  setDateDebut]  = useState(user?.dateDebut ? user.dateDebut.slice(0,10) : '');
  const [avatar,     setAvatar]     = useState(user?.avatar || '');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving,     setSaving]     = useState(false);
  const color = '#38bdf8';

  useEffect(() => {
    if (!user) return;
    setName(prev  => prev  || user.name  || '');
    setRole(prev  => prev  || user.role  || '');
    setEmail(prev => prev  || user.email || '');
    setDateDebut(prev => prev || (user.dateDebut ? user.dateDebut.slice(0,10) : ''));
    setAvatar(prev => prev || user.avatar || '');
  }, [user]);

  const save = async () => {
    if (newPwd && newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPwd && newPwd.length < 6)     { toast.error('Mot de passe trop court (min. 6 caractères)'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Email invalide'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(), role: role.trim(), email: email.trim(),
        dateDebut: dateDebut || null, avatar: avatar || null,
      };
      if (newPwd) body.newPassword = newPwd;
      await api.put('/api/profile', body);
      await refreshUser();
      setNewPwd(''); setConfirmPwd('');
      toast.success('Profil sauvegardé !');
    } catch (err: unknown) {
      toast.error(apiErrMsg(err, 'Erreur lors de la sauvegarde'));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Avatar */}
      <div>
        <div style={{ fontSize:11, color:'#fff', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:0.8 }}>Avatar</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {PROFILE_AVATARS.map(a => (
            <button key={a} type="button" onClick={() => setAvatar(a === avatar ? '' : a)}
              style={{ width:50, height:50, borderRadius:12, border:`2px solid ${avatar===a ? color : 'rgba(255,255,255,0.25)'}`, background: avatar===a ? `${color}25` : 'rgba(255,255,255,0.08)', cursor:'pointer', fontSize:24, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', boxShadow: avatar===a ? `0 0 16px ${color}66` : '0 2px 6px rgba(0,0,0,0.3)' }}>
              {a}
            </button>
          ))}
        </div>
        {avatar && (
          <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:22 }}>{avatar}</span>
            <span style={{ fontSize:12, color:'#fff' }}>sélectionné</span>
            <button type="button" onClick={() => setAvatar('')}
              style={{ background:'none', border:'1px solid rgba(239,68,68,0.25)', borderRadius:6, cursor:'pointer', color:'rgba(239,68,68,0.7)', fontSize:11, fontWeight:600, padding:'2px 8px', transition:'all 0.15s' }}>
              Retirer
            </button>
          </div>
        )}
      </div>

      {/* Champs profil */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Nom complet</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ton nom complet" style={PROFIL_INPUT_STYLE}
            onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
          />
        </div>
        <div>
          <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Rôle</div>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Agent commercial" style={PROFIL_INPUT_STYLE}
            onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
          />
        </div>
        <div>
          <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" style={PROFIL_INPUT_STYLE}
            onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
          />
        </div>
        <div>
          <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Date de début</div>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
            style={{ ...PROFIL_INPUT_STYLE, colorScheme:'dark' }}
            onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
          />
        </div>
      </div>

      {/* Mot de passe */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:0.8 }}>Changer le mot de passe</div>
          <span style={{ fontSize:10, color:'#fff' }}>— optionnel</span>
        </div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:150 }}>
            <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Nouveau mot de passe</div>
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" style={PROFIL_INPUT_STYLE}
              onFocus={e => (e.target.style.borderColor=color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
            />
          </div>
          <div style={{ flex:1, minWidth:150 }}>
            <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Confirmer</div>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••"
              style={{ ...PROFIL_INPUT_STYLE, borderColor: confirmPwd && newPwd!==confirmPwd ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)' }}
              onFocus={e => (e.target.style.borderColor=confirmPwd&&newPwd!==confirmPwd?'rgba(239,68,68,0.6)':color)}
              onBlur={e  => (e.target.style.borderColor=confirmPwd&&newPwd!==confirmPwd?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.12)')}
            />
          </div>
        </div>
      </div>

      {/* Bouton */}
      <div>
        <button onClick={save} disabled={saving}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:13, border:'none', cursor: saving ? 'wait' : 'pointer', background:`linear-gradient(135deg,${color},#0ea5e9)`, color:'#fff', fontSize:13, fontWeight:800, boxShadow:`0 4px 20px ${color}44`, opacity: saving ? 0.7 : 1, transition:'opacity 0.2s' }}>
          {saving ? <><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Sauvegarde…</>
           : <><Save size={14}/> Sauvegarder le profil</>}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
════════════════════════════════════════════════════════════════════ */
export default function ParametresPage() {
  const isMobile = useIsMobile();
  const [settings,  setSettings]  = useState<SettingsType | null>(null);
  const [original,  setOriginal]  = useState<SettingsType | null>(null);
  const [activeTab, setActiveTab] = useState('profil');
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const dirtyRef        = useRef(false);
  const settingsCtrlRef = useRef<AbortController | null>(null);

  const dirty = useMemo(
    () => !!settings && !!original && sortedJSON(settings) !== sortedJSON(original),
    [settings, original]
  );
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' }),
    []
  );

  const fetchSettings = useCallback(() => {
    settingsCtrlRef.current?.abort();
    const ctrl = new AbortController();
    settingsCtrlRef.current = ctrl;
    api.get<SettingsType>('/api/settings', { signal: ctrl.signal })
      .then(r => { setSettings(r.data); setOriginal(JSON.parse(JSON.stringify(r.data))); })
      .catch(e => {
        if ((e as { code?: string }).code === 'ERR_CANCELED') return;
        toast.error(apiErrMsg(e, 'Impossible de charger les paramètres'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
    return () => { settingsCtrlRef.current?.abort(); };
  }, [fetchSettings]);

  useEffect(() => {
    const onVis = () => { if (!document.hidden && !dirtyRef.current) fetchSettings(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [fetchSettings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await api.put('/api/settings', settings);
      invalidateSettingsCache();
      setOriginal(JSON.parse(JSON.stringify(settings)));
      toast.success('Paramètres sauvegardés !');
    } catch (e) { toast.error(apiErrMsg(e, 'Erreur lors de la sauvegarde')); }
    finally { setSaving(false); }
  };

  const upd = <K extends keyof SettingsType>(key: K, val: SettingsType[K]) =>
    setSettings(s => s ? { ...s, [key]: val } : s);

  const addSimple    = (key: 'villes'|'motifsAnnulation', val: string) =>
    setSettings(s => s ? { ...s, [key]: [...s[key], val] } as SettingsType : s);
  const removeSimple = (key: 'villes'|'motifsAnnulation', idx: number) =>
    setSettings(s => s ? { ...s, [key]: s[key].filter((_,i) => i!==idx) } as SettingsType : s);
  const addKL        = (key: 'typeCommerce'|'typeLead'|'qualificationSysteme', item:{key:string;label:string}) =>
    setSettings(s => s ? { ...s, [key]: [...s[key], item] } as SettingsType : s);
  const removeKL     = (key: 'typeCommerce'|'typeLead'|'qualificationSysteme', idx: number) =>
    setSettings(s => s ? { ...s, [key]: s[key].filter((_,i) => i!==idx) } as SettingsType : s);

  const tab = TABS.find(t => t.id === activeTab) || TABS[0];
  const TabIcon = tab.Icon;

  return (
    <div style={{ position:'relative', minHeight:'100vh', color:'#fff', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, background:'radial-gradient(ellipse 120% 80% at 50% -10%, rgba(167,139,250,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 90% 60%, rgba(59,108,248,0.07) 0%, transparent 50%), #06060f', zIndex:0, pointerEvents:'none' }}/>
      <CosmosBackground particleColors={PARAMS_PART_COLORS} />

      <div style={{ position:'relative', zIndex:1, padding: isMobile ? '16px 12px 100px' : '28px 32px 40px' }}>

        {/* ── Header ── */}
        <div style={{ padding:'1.5px', borderRadius:22, background:'linear-gradient(135deg,#06b6d470,#0891b240,#a78bfa25)', marginBottom:20, animation:'fadeSlideUp 0.4s ease both' }}>
          <div style={{ background:'rgba(2,8,16,0.97)', borderRadius:'20.5px', padding: isMobile ? '18px 16px' : '28px 32px', backdropFilter:'blur(40px)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-80, left:-60, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)', pointerEvents:'none' }}/>
            <div style={{ position:'relative', zIndex:1 }}>
              <div style={{ display:'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#06b6d4,#0891b2)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 28px rgba(6,182,212,0.55)', flexShrink:0 }}>
                    <Settings size={26} color="#fff"/>
                  </div>
                  <h1 style={{ margin:0, fontSize: isMobile ? 20 : 26, fontWeight:900, letterSpacing:-0.5, background:'linear-gradient(135deg,#fff 30%,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Paramètres</h1>
                </div>
                {!isMobile && (
                  <div style={{ fontSize:12, color:'#fff', background:'rgba(255,255,255,0.05)', padding:'6px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.1)', textTransform:'capitalize', whiteSpace:'nowrap', fontWeight:700 }}>
                    {todayLabel}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:14, flexDirection:'column' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid rgba(6,182,212,0.15)', borderTopColor:'#06b6d4', animation:'spin 0.8s linear infinite' }}/>
            <div style={{ color:'#fff', fontSize:13 }}>Chargement…</div>
          </div>
        ) : !settings ? (
          <div style={{ textAlign:'center', padding:40, color:'#fff' }}>
            <AlertCircle size={32} style={{ marginBottom:12 }}/><div>Impossible de charger les paramètres</div>
          </div>
        ) : (<>

        {/* ── Tabs ── */}
        <div style={{ padding:'1px', borderRadius:18, background:'linear-gradient(135deg,#a78bfa30,#6366f115)', marginBottom:16 }}>
        <div style={{ background:'rgba(2,8,16,0.97)', backdropFilter:'blur(20px)', borderRadius:17, overflow:'hidden' }}>
          <div style={{ display:'flex', overflowX:'auto', padding:'6px 8px', gap:4, scrollbarWidth:'none' }}>
            {TABS.map(t => {
              const active = activeTab === t.id;
              const TIcon  = t.Icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 15px', borderRadius:10, border:'none', cursor:'pointer', whiteSpace:'nowrap', background: active ? `${t.color}1e` : 'transparent', color: active ? t.color : 'rgba(255,255,255,0.5)', fontSize:12, fontWeight: active ? 700 : 500, borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent', transition:'all 0.15s' }}>
                  <TIcon size={14}/> {t.label}
                  {active && <ChevronRight size={10}/>}
                </button>
              );
            })}
          </div>
        </div>
        </div>

        {/* ── Contenu ── */}
        <div style={{ padding:'1px', borderRadius:18, background:`linear-gradient(135deg,${tab.color}40,${tab.color}10)` }}>
        <div style={{ position:'relative', background:'rgba(2,8,16,0.97)', backdropFilter:'blur(20px)', borderRadius:17, padding: isMobile ? '18px 16px' : '26px 28px', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2.5, background:`linear-gradient(90deg,${tab.color},${tab.color}50,transparent)` }}/>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:`radial-gradient(circle,${tab.color}10,transparent 70%)`, pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
            <TabIcon size={18} color={tab.color}/>
            <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:tab.color }}>{tab.label}</h2>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${tab.color}40,transparent)` }}/>
          </div>

          {activeTab === 'profil' && <ProfilSection/>}

          {activeTab === 'villes' && (
            <SimpleSection items={settings.villes||[]} color={tab.color} placeholder="Ex: Brossard, Sainte-Julie..."
              onAdd={v => addSimple('villes', v)} onRemove={i => removeSimple('villes', i)}/>
          )}
          {activeTab === 'typeCommerce' && (
            <KeyLabelSection items={settings.typeCommerce||[]} color={tab.color} placeholder="Ex: Épicerie coréenne, Studio photo..."
              onAdd={item => addKL('typeCommerce', item)} onRemove={i => removeKL('typeCommerce', i)}/>
          )}
          {activeTab === 'typeLead' && (
            <KeyLabelSection items={settings.typeLead||[]} color={tab.color} placeholder="Ex: Recommandation LinkedIn..."
              onAdd={item => addKL('typeLead', item)} onRemove={i => removeKL('typeLead', i)}/>
          )}
          {activeTab === 'qualification' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:'16px 18px', border:'1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#e0e0f0', marginBottom:12 }}>
                  Produits qui nécessitent une qualification
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(settings.services||[]).map(sv => {
                    const checked = (settings.produitsAvecQualification||[]).includes(sv.id);
                    return (
                      <label key={sv.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                        <input type="checkbox" checked={checked}
                          onChange={e => {
                            const cur = settings.produitsAvecQualification || [];
                            upd('produitsAvecQualification', e.target.checked ? [...cur, sv.id] : cur.filter(p => p !== sv.id));
                          }}
                          style={{ width:16, height:16, cursor:'pointer', accentColor: tab.color }}
                        />
                        <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{sv.label || sv.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <KeyLabelSection items={settings.qualificationSysteme||[]} color={tab.color} placeholder="Ex: Système +15 ans..."
                onAdd={item => addKL('qualificationSysteme', item)} onRemove={i => removeKL('qualificationSysteme', i)}/>
            </div>
          )}
          {activeTab === 'services' && (
            <ServiceSection services={settings.services||[]} onUpdate={svcs => upd('services', svcs)} isMobile={isMobile}/>
          )}
          {activeTab === 'objectifAnnuel' && (
            <ObjectifSection
              objectifs={typeof settings.objectifAnnuel==='object' && !Array.isArray(settings.objectifAnnuel) ? settings.objectifAnnuel : {}}
              onAdd={(annee, montant) => upd('objectifAnnuel', { ...(settings.objectifAnnuel||{}), [annee]: montant })}
              onRemove={annee => { const next = { ...(settings.objectifAnnuel||{}) }; delete next[annee]; upd('objectifAnnuel', next); }}
            />
          )}
          {activeTab === 'motifsAnnulation' && (
            <SimpleSection items={settings.motifsAnnulation||[]} color={tab.color} placeholder="Ex: Prix trop élevé, Concurrent..."
              onAdd={v => addSimple('motifsAnnulation', v)} onRemove={i => removeSimple('motifsAnnulation', i)}/>
          )}
          {activeTab === 'commissionDefaut' && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ fontSize:13, color:'#fff' }}>
                Ces montants seront pré-remplis automatiquement quand tu crées une nouvelle fiche. Tu pourras toujours les modifier dans le formulaire.
              </div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Commission fixe par défaut</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="number" min="0" step="0.01"
                      value={settings.commissionFixeDefaut ?? 0}
                      onChange={e => upd('commissionFixeDefaut', parseFloat(e.target.value)||0)}
                      style={{ width:140, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor=tab.color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
                    />
                    <span style={{ fontSize:12, color:'#fff', fontWeight:600 }}>{CURRENCY}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'#fff', marginBottom:6, fontWeight:600 }}>Commission extra par défaut</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="number" min="0" step="0.01"
                      value={settings.commissionExtraDefaut ?? 0}
                      onChange={e => upd('commissionExtraDefaut', parseFloat(e.target.value)||0)}
                      style={{ width:140, padding:'9px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', transition:'border-color 0.2s' }}
                      onFocus={e => (e.target.style.borderColor=tab.color)} onBlur={e => (e.target.style.borderColor='rgba(255,255,255,0.12)')}
                    />
                    <span style={{ fontSize:12, color:'#fff', fontWeight:600 }}>{CURRENCY}</span>
                  </div>
                </div>
              </div>
              {((settings.commissionFixeDefaut||0) > 0 || (settings.commissionExtraDefaut||0) > 0) && (
                <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(18,183,106,0.08)', border:'1px solid rgba(18,183,106,0.2)', fontSize:13, color:'#12b76a', fontWeight:600 }}>
                  Total par défaut : {((settings.commissionFixeDefaut||0) + (settings.commissionExtraDefaut||0)).toFixed(2)} {CURRENCY}
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        {/* Bouton Sauvegarder */}
        <div style={{ marginTop:24, display:'flex', justifyContent:'flex-end' }}>
          <button onClick={save} disabled={!dirty || saving}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:13, border:'none', cursor: dirty ? 'pointer' : 'not-allowed', background: dirty ? 'linear-gradient(135deg,#6366f1,#a78bfa)' : 'rgba(255,255,255,0.06)', color: dirty ? '#fff' : 'rgba(255,255,255,0.3)', fontSize:14, fontWeight:800, boxShadow: dirty ? '0 4px 20px rgba(99,102,241,0.45)' : 'none', transition:'all 0.2s', whiteSpace:'nowrap' }}>
            {saving ? <><Loader size={14} style={{ animation:'spin 1s linear infinite' }}/> Sauvegarde…</>
             : dirty ? <><Save size={14}/> Sauvegarder</>
             : <><CheckCircle size={14}/> Sauvegardé</>}
          </button>
        </div>

        {isMobile && dirty && (
          <button onClick={save}
            style={{ position:'fixed', bottom:80, right:16, zIndex:200, display:'flex', alignItems:'center', gap:8, padding:'13px 22px', borderRadius:20, border:'none', background:'linear-gradient(135deg,#6366f1,#a78bfa)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(99,102,241,0.5)' }}>
            <Save size={14}/> Sauvegarder
          </button>
        )}
        </>)}
      </div>
    </div>
  );
}
