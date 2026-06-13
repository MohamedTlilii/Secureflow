'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, BarChart2, Wallet, Users, Kanban,
  Fuel, Database, Settings, LogOut, X, Calendar, UserCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { SolutionExpress } from '@/types';

const NAV = [
  { to: '/',                 label: 'Dashboard',           color: '#12b76a', Icon: LayoutDashboard },
  { to: '/comparaison',      label: 'Comparaison',         color: '#3b82f6', Icon: BarChart2       },
  { to: '/commissions',      label: 'Commissions',         color: '#f59e0b', Icon: Wallet          },
  { to: '/leads',            label: 'Leads',                color: '#818cf8', Icon: Users           },
  { to: '/pipeline',         label: 'Pipeline',            color: '#c084fc', Icon: Kanban          },
  { to: '/essence',          label: 'Indemnité Carburant', color: '#fb923c', Icon: Fuel            },
  { to: '/database',         label: 'Base de données',     color: '#f472b6', Icon: Database        },
  { to: '/parametres',       label: 'Paramètres',          color: '#06b6d4', Icon: Settings        },
] as const;

function fmtDebut(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function anciennete(d: Date): { label: string; suffix: string } {
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff < 30)  return { label: `${diff} jour${diff > 1 ? 's' : ''}`, suffix: "d'activité" };
  if (diff < 365) return { label: `${Math.floor(diff / 30)} mois`,       suffix: "d'activité" };
  const y = Math.floor(diff / 365);
  return { label: `${y} an${y > 1 ? 's' : ''}`, suffix: 'dans le poste' };
}

interface ProfileStats { totalPaye: number; enAttente: number; annee: number; }

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    let t: ReturnType<typeof setTimeout>;
    const h = () => { clearTimeout(t); t = setTimeout(check, 80); };
    window.addEventListener('resize', h);
    return () => { window.removeEventListener('resize', h); clearTimeout(t); };
  }, []);
  return isMobile;
}

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuth();
  const isMobile  = useIsMobile();

  const [expanded,    setExpanded]    = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAnniv,   setShowAnniv]   = useState(false);
  const [stats,       setStats]       = useState<ProfileStats | null>(null);

  const avatarRef = useRef<HTMLDivElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  const handleLogout = () => { logout(); router.push('/login'); };

  useEffect(() => { if (showAnniv) setExpanded(false); }, [showAnniv]);

  useEffect(() => {
    if (!user) return;
    const debut = user.dateDebut ? new Date(user.dateDebut) : null;
    if (!debut) return;
    const today = new Date();
    if (today.getMonth() !== debut.getMonth() || today.getDate() !== debut.getDate()) return;
    const key = `sf_anniv_${today.getFullYear()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    setTimeout(() => setShowAnniv(true), 1200);
  }, [user]);

  useEffect(() => { if (!showProfile) setStats(null); }, [showProfile]);

  useEffect(() => {
    if (!showProfile) return;
    const handler = (e: MouseEvent) => {
      if (
        avatarRef.current && !avatarRef.current.contains(e.target as Node) &&
        panelRef.current  && !panelRef.current.contains(e.target as Node)
      ) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfile]);

  useEffect(() => {
    if (!showProfile || stats) return;
    const controller = new AbortController();
    api.get<SolutionExpress[]>('/api/leads', { signal: controller.signal })
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : [];
        if (!all.length) { setStats({ totalPaye: 0, enAttente: 0, annee: new Date().getFullYear() }); return; }
        const yr     = new Date().getFullYear();
        const fiches = all.filter(f => new Date(f.dateVente ?? f.createdAt).getFullYear() === yr);
        const totalPaye = fiches.filter(f => f.commissionPayee).reduce((s, f) => s + (f.commissionTotale || 0), 0);
        const enAttente = fiches.filter(f => f.status !== 'installation_annulee' && !f.commissionPayee && (f.commissionTotale || 0) > 0).reduce((s, f) => s + (f.commissionTotale || 0), 0);
        setStats({ totalPaye, enAttente, annee: yr });
      })
      .catch(err => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        setStats({ totalPaye: 0, enAttente: 0, annee: new Date().getFullYear() });
      });
    return () => controller.abort();
  }, [showProfile, stats]);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w',  isMobile ? '0px'  : expanded ? '240px' : '70px');
    document.documentElement.style.setProperty('--main-pt',    isMobile ? '56px' : '0px');
    document.documentElement.style.setProperty('--main-pb',    isMobile ? '80px' : '0px');
  }, [isMobile, expanded]);

  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to);

  /* ── MOBILE ───────────────────────────────────────────────────────────── */
  if (isMobile) return (
    <>
      {/* Top header */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, background:'rgba(2,6,20,0.97)', borderBottom:'1px solid rgba(18,183,106,0.18)', backdropFilter:'blur(40px)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:56, boxShadow:'0 4px 24px rgba(0,0,0,0.5),0 1px 0 rgba(18,183,106,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:11, background:'linear-gradient(135deg,#12b76a,#3b6cf8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(18,183,106,0.45)', flexShrink:0 }}>
            <LogoSVG id="mh" size={19}/>
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:18, background:'linear-gradient(135deg,#e8fff5 20%,#12b76a,#3b6cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-0.5, lineHeight:1 }}>SecureFlow</div>
          </div>
        </div>
        <div ref={avatarRef} onClick={() => setShowProfile(p => !p)} style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 8px', borderRadius:10, cursor:'pointer', background: showProfile ? 'rgba(18,183,106,0.12)' : 'transparent', border:`1px solid ${showProfile ? 'rgba(18,183,106,0.35)' : 'transparent'}`, transition:'all 0.2s' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:12.5, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize:10.5, color:'#12b76a', fontWeight:700, textTransform:'capitalize' }}>{user?.role}</div>
          </div>
          <Avatar emoji={user?.avatar}/>
        </div>
      </header>

      {/* Profile panel mobile */}
      {showProfile && (
        <div ref={panelRef} style={{ position:'fixed', top:66, right:12, width:250, background:'rgba(2,6,20,0.98)', border:'1px solid rgba(18,183,106,0.22)', borderRadius:16, boxShadow:'0 8px 48px rgba(0,0,0,0.7),0 0 0 1px rgba(18,183,106,0.08)', backdropFilter:'blur(40px)', overflow:'hidden', animation:'profileSlideDown 0.22s cubic-bezier(0.34,1.56,0.64,1) both', zIndex:300 }}>
          <ProfilePanel user={user} stats={stats} onClose={() => setShowProfile(false)} onLogout={handleLogout}/>
        </div>
      )}

      {/* Bottom nav */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:200, background:'rgba(2,6,20,0.97)', borderTop:'1px solid rgba(18,183,106,0.18)', backdropFilter:'blur(40px)', display:'flex', alignItems:'center', padding:'6px 2px 14px', boxShadow:'0 -4px 24px rgba(0,0,0,0.5),0 -1px 0 rgba(18,183,106,0.1)' }}>
        {NAV.map(({ to, Icon, label, color }) => {
          const active = isActive(to);
          return (
            <Link key={to} href={to} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 2px', borderRadius:10, color: active ? color : `${color}88`, textDecoration:'none', position:'relative' }}>
              {active && <div style={{ position:'absolute', top:-6, left:'50%', transform:'translateX(-50%)', width:20, height:2.5, borderRadius:2, background:`linear-gradient(90deg,${color},${color}aa)`, boxShadow:`0 0 10px ${color}99` }}/>}
              <div style={{ width:34, height:34, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', background: active ? `${color}1a` : `${color}0f`, transform: active ? 'scale(1.12)' : 'scale(1)', transition:'all 0.2s' }}>
                <Icon size={18} style={{ filter: active ? `drop-shadow(0 0 5px ${color}99)` : 'none' }}/>
              </div>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:0.2, opacity: active ? 1 : 0.7 }}>{label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      <AnnivModal show={showAnniv} name={user?.name} debutYear={user?.dateDebut ? new Date(user.dateDebut).getFullYear() : undefined} onClose={() => setShowAnniv(false)}/>
      <style>{`@keyframes profileSlideDown{from{opacity:0;transform:translateY(-10px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </>
  );

  /* ── DESKTOP ──────────────────────────────────────────────────────────── */
  const w = expanded ? '240px' : '70px';
  return (
    <>
      <aside
        onMouseEnter={() => { if (!showAnniv) setExpanded(true); }}
        onMouseLeave={() => setExpanded(false)}
        style={{ width: w, background:'rgba(2,6,20,0.97)', borderRight:'1px solid rgba(18,183,106,0.18)', position:'fixed', top:0, left:0, bottom:0, display:'flex', flexDirection:'column', zIndex:100, transition:'width 0.35s cubic-bezier(0.4,0,0.2,1)', overflow:'hidden', backdropFilter:'blur(40px)', boxShadow: expanded ? '4px 0 60px rgba(18,183,106,0.12),4px 0 40px rgba(0,0,0,0.6)' : '2px 0 20px rgba(0,0,0,0.5)' }}>

        {/* Glow orbs (same as pages) */}
        <div style={{ position:'absolute', top:-60, left:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(18,183,106,0.13) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:-40, left:-20, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,108,248,0.10) 0%,transparent 70%)', pointerEvents:'none' }}/>

        {/* Logo */}
        <div style={{ padding:'18px 17px 16px', borderBottom:'1px solid rgba(18,183,106,0.1)', display:'flex', alignItems:'center', gap:11, flexShrink:0, position:'relative' }}>
          <div style={{ minWidth:36, height:36, borderRadius:12, background:'linear-gradient(135deg,#12b76a,#3b6cf8)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow: expanded ? '0 6px 28px rgba(18,183,106,0.55)' : '0 4px 16px rgba(18,183,106,0.38)', flexShrink:0, transition:'box-shadow 0.35s ease' }}>
            <LogoSVG id="sb" size={21}/>
          </div>
          <div style={{ opacity: expanded ? 1 : 0, transform: expanded ? 'translateX(0)' : 'translateX(-8px)', transition:'opacity 0.25s ease,transform 0.25s ease', whiteSpace:'nowrap', overflow:'hidden' }}>
            <div style={{ fontWeight:900, fontSize:18, background:'linear-gradient(135deg,#e8fff5 20%,#12b76a,#3b6cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-0.5 }}>SecureFlow</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto', overflowX:'hidden', position:'relative' }}>
          {NAV.map(({ to, Icon, label, color }, idx) => {
            const active = isActive(to);
            return (
              <Link key={to} href={to} title={label} style={{ display:'flex', alignItems:'center', gap:13, padding:'9px 12px', borderRadius:10, color: active ? color : `${color}99`, background: active ? `${color}16` : `${color}08`, border:`1px solid ${active ? `${color}35` : `${color}15`}`, fontSize:12.5, fontWeight:700, transition:'all 0.18s ease', textDecoration:'none', boxShadow: active ? `0 0 16px ${color}18,inset 0 0 12px ${color}08` : 'none' }}>
                <div style={{ minWidth:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, filter: active ? `drop-shadow(0 0 6px ${color}bb)` : 'none', transform: active ? 'scale(1.1)' : 'scale(1)', transition:'all 0.2s' }}>
                  <Icon size={17}/>
                </div>
                <span style={{ opacity: expanded ? 1 : 0, transform: expanded ? 'translateX(0)' : 'translateX(-6px)', transition:`opacity 0.22s ease ${idx * 0.025}s,transform 0.22s ease ${idx * 0.025}s`, whiteSpace:'nowrap', overflow:'hidden', pointerEvents: expanded ? 'auto' : 'none' }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding:'10px 8px 14px', borderTop:'1px solid rgba(18,183,106,0.1)', flexShrink:0, position:'relative' }}>
          <div style={{ padding:'1.5px', borderRadius:12, background: showProfile ? 'linear-gradient(135deg,#12b76a60,#3b6cf830)' : 'linear-gradient(135deg,rgba(18,183,106,0.2),rgba(59,108,248,0.1))', marginBottom:6, transition:'background 0.2s' }}>
            <div ref={avatarRef} onClick={() => setShowProfile(p => !p)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:'10.5px', background:'rgba(2,6,20,0.95)', transition:'all 0.2s', cursor:'pointer', overflow:'hidden' }}>
              <Avatar size={29} emoji={user?.avatar}/>
              <div style={{ flex:1, minWidth:0, opacity: expanded ? 1 : 0, transform: expanded ? 'translateX(0)' : 'translateX(-6px)', transition:'opacity 0.22s ease 0.05s,transform 0.22s ease 0.05s', pointerEvents: expanded ? 'auto' : 'none' }}>
                <div style={{ fontSize:12, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', background:'linear-gradient(135deg,#e8fff5,#12b76a)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{user?.name}</div>
                <div style={{ fontSize:10, color:'rgba(18,183,106,0.8)', fontWeight:700, textTransform:'capitalize', marginTop:1 }}>{user?.role}</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`@keyframes profileSlideUp{from{opacity:0;transform:translateY(10px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      </aside>

      {/* Profile panel desktop */}
      {showProfile && (
        <div ref={panelRef} style={{ position:'fixed', bottom:88, left:9, width:226, background:'rgba(2,6,20,0.98)', border:'1px solid rgba(18,183,106,0.22)', borderRadius:16, boxShadow:'0 -8px 48px rgba(0,0,0,0.6),0 0 0 1px rgba(18,183,106,0.08)', backdropFilter:'blur(40px)', overflow:'hidden', animation:'profileSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) both', zIndex:300 }}>
          <ProfilePanel user={user} stats={stats} onClose={() => setShowProfile(false)} onLogout={handleLogout}/>
        </div>
      )}

      <AnnivModal show={showAnniv} name={user?.name} debutYear={user?.dateDebut ? new Date(user.dateDebut).getFullYear() : undefined} onClose={() => setShowAnniv(false)}/>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function LogoSVG({ id, size }: { id: string; size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={`${id}_lg1`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#12b76a"/><stop offset="100%" stopColor="#61DAFB"/>
        </linearGradient>
        <linearGradient id={`${id}_lg2`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#61DAFB" stopOpacity="0.95"/><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.75"/>
        </linearGradient>
      </defs>
      <polygon points="94,50 72,88 28,88 6,50 28,12 72,12" fill="none" stroke={`url(#${id}_lg1)`} strokeWidth="3.5" strokeLinejoin="round"/>
      <polyline points="22,76 36,61 50,49 64,37 77,24" fill="none" stroke={`url(#${id}_lg1)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M77,14 C77,14 70,22 70,27 C70,30.9 73.1,34 77,34 C80.9,34 84,30.9 84,27 C84,22 77,14 77,14Z" fill={`url(#${id}_lg2)`}/>
    </svg>
  );
}

function Avatar({ size = 33, emoji }: { size?: number; emoji?: string | null }) {
  if (emoji) {
    return (
      <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, border:'2px solid rgba(18,183,106,0.4)', boxShadow:'0 0 10px rgba(18,183,106,0.25)', background:'linear-gradient(135deg,rgba(18,183,106,0.18),rgba(59,108,248,0.12))', display:'flex', alignItems:'center', justifyContent:'center', fontSize: Math.round(size * 0.52) }}>
        {emoji}
      </div>
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0, border:'2px solid rgba(18,183,106,0.4)', boxShadow:'0 0 10px rgba(18,183,106,0.25)', background:'linear-gradient(135deg,rgba(18,183,106,0.18),rgba(59,108,248,0.12))', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <UserCircle2 size={Math.round(size * 0.72)} color="#12b76a" strokeWidth={1.5}/>
    </div>
  );
}

function ProfilePanel({ user, stats, onClose, onLogout }: {
  user: { name?: string; role?: string; avatar?: string | null; dateDebut?: string | null; createdAt?: string } | null;
  stats: ProfileStats | null; onClose: () => void; onLogout: () => void
}) {
  const debutDate = user?.dateDebut ? new Date(user.dateDebut) : user?.createdAt ? new Date(user.createdAt) : null;
  const anc = debutDate ? anciennete(debutDate) : null;
  return (
    <>
      <div style={{ background:'linear-gradient(135deg,rgba(18,183,106,0.12),transparent)', padding:'16px 14px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:11 }}>
        <Avatar size={44} emoji={user?.avatar}/>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:13.5, fontWeight:700, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
          <div style={{ fontSize:11, color:'#12b76a', fontWeight:700, textTransform:'capitalize', marginTop:2 }}>{user?.role}</div>
        </div>
        <button type="button" onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.9)', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
          <X size={13}/>
        </button>
      </div>
      <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:9 }}>
        {debutDate && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'rgba(18,183,106,0.06)', border:'1px solid rgba(18,183,106,0.12)' }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'rgba(18,183,106,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Calendar size={14} color="#12b76a"/>
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Actif depuis</div>
            <div style={{ fontSize:12, color:'#fff', fontWeight:700, marginTop:2 }}>{fmtDebut(debutDate)}</div>
            {anc && <div style={{ fontSize:10.5, color:'#12b76a', marginTop:1 }}>{anc.label} {anc.suffix}</div>}
          </div>
        </div>
        )}
        {stats && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:`✓ Payé ${stats.annee}`,        value:`${stats.totalPaye.toFixed(0)} TND`,  color:'#12b76a', bg:'rgba(18,183,106,0.06)',  border:'rgba(18,183,106,0.15)' },
              { label:`⏳ En attente ${stats.annee}`, value:`${stats.enAttente.toFixed(0)} TND`, color:'#f79009', bg:'rgba(247,144,9,0.06)',   border:'rgba(247,144,9,0.15)'  },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', borderRadius:9, background:s.bg, border:`1px solid ${s.border}` }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.85)', fontWeight:700 }}>{s.label}</div>
                <div style={{ fontSize:14, fontWeight:800, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={onLogout} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px', borderRadius:10, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.06)', color:'#ef4444', cursor:'pointer', fontSize:13, fontWeight:700 }}>
          <LogOut size={15}/> Déconnexion
        </button>
      </div>
    </>
  );
}

function AnnivModal({ show, name, debutYear, onClose }: { show: boolean; name?: string; debutYear?: number; onClose: () => void }) {
  if (!show) return null;
  const years = new Date().getFullYear() - (debutYear ?? new Date().getFullYear());
  if (years <= 0) return null;
  const COLORS = ['#12b76a','#f79009','#818cf8','#38bdf8','#f04438','#a764f8'];
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', animation:'annexFadeIn 0.3s ease both' }}>
      <div style={{ position:'relative', background:'rgba(3,8,26,0.98)', borderRadius:24, maxWidth:420, width:'100%', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(18,183,106,0.2)', animation:'annexPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
          {COLORS.map((c, i) => (
            <div key={i} style={{ position:'absolute', top:'-10%', left:`${10+i*15}%`, width:8, height:8, borderRadius: i % 2 ? '50%' : 3, background:c, animation:`confetti${i} ${1.8+i*0.3}s ease-in ${i*0.15}s infinite`, opacity:0.8 }}/>
          ))}
        </div>
        <div style={{ background:'linear-gradient(135deg,rgba(18,183,106,0.18),rgba(247,144,9,0.1),transparent)', padding:'36px 28px 24px', textAlign:'center', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:52, marginBottom:12, animation:'bounceEmoji 1s ease infinite alternate' }}>🔥</div>
          <div style={{ fontSize:11, fontWeight:700, color:'#f79009', textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>Anniversaire</div>
          <h2 style={{ margin:'0 0 6px', fontSize:22, fontWeight:800, background:'linear-gradient(135deg,#e8fff5,#12b76a,#f79009)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{name} !</h2>
          <div style={{ fontSize:36, fontWeight:900, color:'#12b76a', margin:'10px 0 2px', textShadow:'0 0 30px rgba(18,183,106,0.5)' }}>{years} ans 🎯</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', fontStyle:'italic' }}>et tu es encore là.</div>
        </div>
        <div style={{ padding:'22px 28px 28px', textAlign:'center' }}>
          <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.9)', lineHeight:1.85, marginBottom:22 }}>
            Des refus, des relances, des signatures.<br/>
            Du stress, des doutes, et des victoires.<br/>
            <span style={{ color:'#12b76a', fontWeight:700 }}>C&apos;est toi qui te lèves et tu continues — c&apos;est ça qui fait la différence. 💎</span>
          </div>
          <button type="button" onClick={onClose} style={{ width:'100%', padding:'13px', borderRadius:14, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background:'linear-gradient(135deg,#12b76a,#0ea472)', color:'#fff', boxShadow:'0 4px 20px rgba(18,183,106,0.35)' }}>Merci 🙏</button>
        </div>
      </div>
      <style>{`
        @keyframes annexFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes annexPop{from{opacity:0;transform:scale(0.8) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes bounceEmoji{from{transform:translateY(0)}to{transform:translateY(-8px)}}
        @keyframes confetti0{0%{transform:translateY(0) rotate(0deg);opacity:.8}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
        @keyframes confetti1{0%{transform:translateY(0) rotate(0deg);opacity:.8}100%{transform:translateY(110vh) rotate(-540deg);opacity:0}}
        @keyframes confetti2{0%{transform:translateY(0) rotate(0deg);opacity:.8}100%{transform:translateY(110vh) rotate(900deg);opacity:0}}
        @keyframes confetti3{0%{transform:translateY(0) rotate(0deg);opacity:.8}100%{transform:translateY(110vh) rotate(-720deg);opacity:0}}
        @keyframes confetti4{0%{transform:translateY(0) rotate(0deg);opacity:.8}100%{transform:translateY(110vh) rotate(540deg);opacity:0}}
        @keyframes confetti5{0%{transform:translateY(0) rotate(0deg);opacity:.8}100%{transform:translateY(110vh) rotate(-900deg);opacity:0}}
      `}</style>
    </div>
  );
}
