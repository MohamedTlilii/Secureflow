import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { MOIS_LABELS } from '@/types';

function calcMetrics(arr: { status: string; commissionTotale: number; commissionFixe: number; commissionPayee: boolean }[]) {
  const actives  = arr.filter(f => f.status !== 'installation_annulee');
  const withComm = actives.filter(f => (f.commissionTotale || 0) > 0 || (f.commissionFixe || 0) > 0);
  const gained   = actives.reduce((s, f) => s + (f.commissionTotale || 0), 0);
  const paid     = actives.filter(f => f.commissionPayee).reduce((s, f) => s + (f.commissionTotale || 0), 0);
  const installe = actives.filter(f => f.status === 'installe').length;
  const annulee  = arr.filter(f => f.status === 'installation_annulee').length;
  const vals     = withComm.map(f => f.commissionTotale || 0).filter(v => v > 0);
  return {
    gained, paid, pending: Math.max(0, gained - paid),
    installe, annulee,
    commMax: vals.length ? Math.max(...vals) : 0,
    commMin: vals.length ? Math.min(...vals) : 0,
    payRate: gained > 0 ? Math.round((paid / gained) * 100) : 0,
    total: arr.length,
  };
}

export async function GET(req: NextRequest) {
  const sp           = new URL(req.url).searchParams;
  const selectedYear = parseInt(sp.get('annee') ?? String(new Date().getFullYear()), 10);
  const currYear     = selectedYear;
  const prevYear     = selectedYear - 1;

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const all = await prisma.solutionExpress.findMany({
      where: { createdBy: user.id },
      select: { status: true, commissionTotale: true, commissionFixe: true, commissionPayee: true, dateVente: true, createdAt: true },
    });

    const getYear  = (f: (typeof all)[0]) => f.dateVente ? new Date(f.dateVente).getFullYear() : null;
    const getMonth = (f: (typeof all)[0]) => f.dateVente ? new Date(f.dateVente).getMonth() : null;

    const realYear   = new Date().getFullYear();
    const withDate   = all.filter(f => f.dateVente);
    const allYears   = [...new Set([realYear, ...withDate.map(f => getYear(f)!)])].sort((a, b) => b - a);
    const minYear    = withDate.length > 0 ? Math.min(...withDate.map(f => getYear(f)!)) : realYear;

    const fichesCurr = all.filter(f => getYear(f) === currYear);
    const fichesPrev = all.filter(f => getYear(f) === prevYear);

    const mCurr = calcMetrics(fichesCurr);
    const mPrev = calcMetrics(fichesPrev);

    const globalScore = mPrev.gained === 0 && mCurr.gained === 0 ? null
      : mPrev.gained === 0 ? 100
      : Math.round(((mCurr.gained - mPrev.gained) / Math.abs(mPrev.gained)) * 100);

    // Best month per year
    let bestMonthCurr = 0, bestMonthCurrVal = 0;
    let bestMonthPrev = 0, bestMonthPrevVal = 0;
    MOIS_LABELS.forEach((_, idx) => {
      const vCurr = fichesCurr.filter(f => f.status !== 'installation_annulee' && getMonth(f) === idx)
        .reduce((s, f) => s + (f.commissionTotale || 0), 0);
      const vPrev = fichesPrev.filter(f => f.status !== 'installation_annulee' && getMonth(f) === idx)
        .reduce((s, f) => s + (f.commissionTotale || 0), 0);
      if (vCurr > bestMonthCurrVal) { bestMonthCurrVal = vCurr; bestMonthCurr = idx; }
      if (vPrev > bestMonthPrevVal) { bestMonthPrevVal = vPrev; bestMonthPrev = idx; }
    });

    // Monthly chart data
    const monthlyChartData = MOIS_LABELS.map((name, idx) => {
      const curr = fichesCurr.filter(f => f.status !== 'installation_annulee' && getMonth(f) === idx)
        .reduce((s, f) => s + (f.commissionTotale || 0), 0);
      const prev = fichesPrev.filter(f => f.status !== 'installation_annulee' && getMonth(f) === idx)
        .reduce((s, f) => s + (f.commissionTotale || 0), 0);
      return { name, curr, prev };
    });

    return NextResponse.json({
      metricsA: mCurr, metricsB: mPrev,
      currYear, prevYear,
      bestMonthCurr, bestMonthCurrVal,
      bestMonthPrev, bestMonthPrevVal,
      globalScore, monthlyChartData, allYears, minYear,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
