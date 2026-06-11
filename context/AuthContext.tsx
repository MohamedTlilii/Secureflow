'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginResponse } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sf_token');
    if (!token) { setLoading(false); return; }

    let mounted = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => { if (mounted) setLoading(false); }, 8000);

    api.get<User>('/api/auth/me', { signal: controller.signal })
      .then((r) => { if (mounted && r.data && 'id' in r.data) setUser(r.data as User); })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
        if (mounted) localStorage.removeItem('sf_token');
      })
      .finally(() => { clearTimeout(timeout); if (mounted) setLoading(false); });

    return () => { mounted = false; controller.abort(); clearTimeout(timeout); };
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
    localStorage.setItem('sf_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('sf_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
