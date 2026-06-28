import api from '@/lib/api';
import type { Settings } from '@/types';

const TTL_MS = 5 * 60 * 1000;

let cache: Settings | null = null;
let cacheAt = 0;

export async function getCachedSettings(): Promise<Settings | null> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  try {
    const r = await api.get<Settings>('/api/settings');
    if (r.data) { cache = r.data; cacheAt = Date.now(); }
    return cache;
  } catch {
    return cache;
  }
}

export function invalidateSettingsCache(): void {
  cache = null;
  cacheAt = 0;
}
