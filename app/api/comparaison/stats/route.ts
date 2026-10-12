import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { poidsLead } from '@/lib/partage';

interface Metrics {
  gained: number; paid: number; pending: number; installe: number; annulee: number;
  commMax: number; commMin: number; payRate: number; total: number;
}

type Acc = { total: number; gained: number; paid: number; installe: number; annulee: number; commMax: number; commMin: number };

function makeAcc(): Acc {
  return { total: 0, gained: 0, paid: 0, installe: 0, annulee: 0, commMax: 0, commMin: Infinity };
}

function finalizeAcc(a: Acc): Metrics {
  return {
    total: a.total, gained: a.gained, paid: a.paid,
    pending:  Math.max(0, a.gained - a.paid),
    installe: a.installe, annulee: a.annulee,
    commMax:  a.commMax,
    commMin:  a.commMin === Infinity ? 0 : a.commMin,
    payRate:  a.gained > 0 ? Math.round((a.paid / a.gained) * 100) : 0,
  };
}

export async function GET(req: NextRequest) {
  const sp       = new URL(req.url).searchParams;
  /* anneeB = année comparée, anneeA = année de référence. Compat : `annee` seul → annee vs annee-1. */
  const rawB     = parseInt(sp.get('anneeB') ?? sp.get('annee') ?? '', 10);
  const currYear = Number.isNaN(rawB) ? new Date().getFullYear() : rawB;
  const rawA     = parseInt(sp.get('anneeA') ?? '', 10);
  const prevYear = Number.isNaN(rawA) ? currYear - 1 : rawA;

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const [rows, minYearRaw] = await Promise.all([
      /* Seulement les 2 années comparées — index dateVente */
      prisma.solutionExpress.findMany({
        where: {
          createdBy: user.id,
          OR: prevYear === currYear
            ? [{ dateVente: { gte: new Date(currYear, 0, 1), lt: new Date(currYear + 1, 0, 1) } }]
            : [
                { dateVente: { gte: new Date(prevYear, 0, 1), lt: new Date(prevYear + 1, 0, 1) } },
                { dateVente: { gte: new Date(currYear, 0, 1), lt: new Date(currYear + 1, 0, 1) } },
              ],
        },
        select: { status: true, commissionTotale: true, commissionPayee: true, dateVente: true, partageAvec: true },
      }),
      /* Borne gauche de navigation — 1 ligne depuis l'index */
      prisma.$queryRaw<{ yr: number }[]>(Prisma.sql`
        SELECT EXTRACT(YEAR FROM "dateVente")::int AS yr
        FROM   "SolutionExpress"
        WHERE  "createdBy" = ${user.id} AND "dateVente" IS NOT NULL
        ORDER  BY "dateVente" ASC
        LIMIT  1
      `),
    ]);

    const realYear = new Date().getFullYear();
    const minYear  = minYearRaw[0]?.yr ?? realYear;

    /* ─── Passe unique O(N) — accumulateurs + buckets mensuels ─── */
    const monthly = Array.from({ length: 12 }, () => ({ curr: 0, prev: 0 }));
    const accCurr = makeAcc();
    const accPrev = makeAcc();

    for (const f of rows) {
      if (!f.dateVente) continue;
      const yr        = f.dateVente.getFullYear();
      const mo        = f.dateVente.getMonth();
      const comm      = f.commissionTotale;
      const isAnnulee = f.status === 'installation_annulee';
      const w         = poidsLead(f.partageAvec);

      /* Une fiche compte pour chaque année demandée (A = B possible) */
      const targets: [Acc, 'curr' | 'prev'][] = [];
      if (yr === currYear) targets.push([accCurr, 'curr']);
      if (yr === prevYear) targets.push([accPrev, 'prev']);

      for (const [acc, key] of targets) {
        acc.total += w;
        if (isAnnulee) { acc.annulee += w; continue; }
        monthly[mo][key] += comm;
        acc.gained       += comm;
        if (f.commissionPayee) acc.paid += comm;
        if (f.status === 'installe') acc.installe += w;
        if (comm > 0) {
          if (comm > acc.commMax) acc.commMax = comm;
          if (comm < acc.commMin) acc.commMin = comm;
        }
      }
    }

    const mCurr = finalizeAcc(accCurr);
    const mPrev = finalizeAcc(accPrev);

    const globalScore = mPrev.gained === 0 && mCurr.gained === 0 ? null
      : mPrev.gained === 0 ? 100
      : Math.round(((mCurr.gained - mPrev.gained) / Math.abs(mPrev.gained)) * 100);

    /* ─── Meilleur mois depuis les buckets : O(12) ─── */
    let bestMonthCurr = 0, bestMonthCurrVal = 0;
    let bestMonthPrev = 0, bestMonthPrevVal = 0;
    for (let i = 0; i < 12; i++) {
      if (monthly[i].curr > bestMonthCurrVal) { bestMonthCurrVal = monthly[i].curr; bestMonthCurr = i; }
      if (monthly[i].prev > bestMonthPrevVal) { bestMonthPrevVal = monthly[i].prev; bestMonthPrev = i; }
    }

    return NextResponse.json({
      metricsA: mCurr, metricsB: mPrev,
      bestMonthCurr, bestMonthCurrVal,
      bestMonthPrev, bestMonthPrevVal,
      globalScore, minYear,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
