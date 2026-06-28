'use client';

import { useState, useEffect, useLayoutEffect } from 'react';

/* useLayoutEffect côté client (avant paint) — useEffect côté serveur (no-op, évite le warning SSR) */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function useIsMobile(breakpoint = 768): boolean {
  const [m, setM] = useState(false);
  useIsomorphicLayoutEffect(() => {
    const h = () => setM(window.innerWidth < breakpoint);
    h();
    let t: ReturnType<typeof setTimeout>;
    const d = () => { clearTimeout(t); t = setTimeout(h, 80); };
    window.addEventListener('resize', d);
    return () => { window.removeEventListener('resize', d); clearTimeout(t); };
  }, [breakpoint]);
  return m;
}
