'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f0f23',
      }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle
            cx="22" cy="22" r="18" fill="none"
            stroke="url(#g)" strokeWidth="4" strokeDasharray="90 30"
            strokeLinecap="round"
            style={{ animation: 'spin 0.9s linear infinite', transformOrigin: 'center' }}
          />
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#12b76a" />
              <stop offset="100%" stopColor="#3b6cf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f23' }}>
      <Sidebar />
      <main style={{
        marginLeft:     'var(--sidebar-w, 70px)',
        paddingTop:     'var(--main-pt, 0px)',
        paddingBottom:  'var(--main-pb, 0px)',
        minHeight:      '100vh',
        overflow:       'auto',
        transition:     'margin-left 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {children}
      </main>
    </div>
  );
}
