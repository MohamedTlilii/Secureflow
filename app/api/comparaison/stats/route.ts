import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
  const raw      = parseInt(sp.get('annee') ?? '', 10);
  const currYear = Number.isNaN(raw) ? new Date().getFullYear() : raw;
  const prevYear = currYear - 1;

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const [rows, minYearRaw] = await Promise.all([
      /* Fenêtre 2 ans seulement — index dateVente → O(log N) */
      prisma.solutionExpress.findMany({
        where: {
          createdBy: user.id,
          dateVente: { gte: new Date(prevYear, 0, 1), lt: new Date(currYear + 1, 0, 1) },
        },
        select: { status: true, commissionTotale: true, commissionPayee: true, dateVente: true },
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

      if (yr === currYear) {
        accCurr.total++;
        if (isAnnulee) { accCurr.annulee++; continue; }
        monthly[mo].curr += comm;
        accCurr.gained   += comm;
        if (f.commissionPayee) accCurr.paid += comm;
        if (f.status === 'installe') accCurr.installe++;
        if (comm > 0) {
          if (comm > accCurr.commMax) accCurr.commMax = comm;
          if (comm < accCurr.commMin) accCurr.commMin = comm;
        }
      } else if (yr === prevYear) {
        accPrev.total++;
        if (isAnnulee) { accPrev.annulee++; continue; }
        monthly[mo].prev += comm;
        accPrev.gained   += comm;
        if (f.commissionPayee) accPrev.paid += comm;
        if (f.status === 'installe') accPrev.installe++;
        if (comm > 0) {
          if (comm > accPrev.commMax) accPrev.commMax = comm;
          if (comm < accPrev.commMin) accPrev.commMin = comm;
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
