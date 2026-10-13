import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Un lead partagé avec un agent compte 0,5 ; sinon 1. */
const POIDS_PARTAGE = 0.5;

export function poidsLead(partageAvec: unknown): number {
  return Array.isArray(partageAvec) && partageAvec.length > 0 ? POIDS_PARTAGE : 1;
}

/** Même règle en SQL : à utiliser à la place de COUNT(*). */
export const POIDS_SQL = Prisma.sql`CASE WHEN jsonb_array_length(COALESCE("partageAvec", '[]'::jsonb)) > 0 THEN 0.5 ELSE 1 END`;

type GroupKey = 'status' | 'typeClient' | 'commissionPayee';

/**
 * Remplace prisma.groupBy(...) : mêmes lignes en sortie (_count._all, _sum.commissionTotale),
 * mais _count._all est pondéré (partagé = 0,5).
 */
export async function groupPondere<K extends GroupKey>(
  where: Prisma.SolutionExpressWhereInput,
  by: K[],
) {
  const rows = await prisma.solutionExpress.findMany({
    where,
    select: { status: true, typeClient: true, commissionPayee: true, commissionTotale: true, partageAvec: true },
  });
  const map = new Map<string, { key: Record<K, any>; n: number; sum: number }>();
  for (const r of rows) {
    const id = by.map(k => String((r as any)[k])).join('|');
    let g = map.get(id);
    if (!g) {
      g = { key: Object.fromEntries(by.map(k => [k, (r as any)[k]])) as Record<K, any>, n: 0, sum: 0 };
      map.set(id, g);
    }
    g.n   += poidsLead(r.partageAvec);
    g.sum += r.commissionTotale ?? 0;
  }
  return [...map.values()].map(g => ({
    ...g.key,
    _count: { _all: g.n },
    _sum:   { commissionTotale: g.sum },
  }));
}
