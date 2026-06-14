import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const STAGES = ['new','contacted','proposal','installation_en_cours','installe','installation_annulee'] as const;

export async function GET(req: NextRequest) {
  const sp          = new URL(req.url).searchParams;
  const anneeParam  = sp.get('annee')      ?? 'tout';
  const moisParam   = sp.get('mois')       ?? 'tout';
  const filtreComm  = sp.get('filtreComm') ?? 'tout';

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const all = await prisma.solutionExpress.findMany({
      where: { createdBy: user.id },
      select: { status: true, typeClient: true, produits: true, commissionPayee: true, dateVente: true, createdAt: true },
    });

    const getYear  = (f: (typeof all)[0]) => f.dateVente ? new Date(f.dateVente).getFullYear() : null;
    const getMonth = (f: (typeof all)[0]) => f.dateVente ? new Date(f.dateVente).getMonth() : null;

    const cur    = new Date().getFullYear();
    const annees = [...new Set([cur, ...all.filter(f => f.dateVente).map(f => getYear(f)!)])].sort((a, b) => b - a);

    let fiches = anneeParam === 'tout' ? all : all.filter(f => getYear(f) === Number(anneeParam));
    if (anneeParam !== 'tout' && moisParam !== 'tout') fiches = fiches.filter(f => getMonth(f) === Number(moisParam));
    if (filtreComm === 'payee')     fiches = fiches.filter(f => f.commissionPayee);
    if (filtreComm === 'non_payee') fiches = fiches.filter(f => !f.commissionPayee && f.status !== 'installation_annulee');
    if (filtreComm === 'annulee')   fiches = fiches.filter(f => f.status === 'installation_annulee');

    const stageCounts = Object.fromEntries(STAGES.map(s => [s, fiches.filter(f => f.status === s).length]));

    const total    = fiches.length;
    const b2b      = fiches.filter(f => f.typeClient === 'b2b').length;
    const b2c      = fiches.filter(f => f.typeClient === 'b2c').length;
    const installe = fiches.filter(f => f.status === 'installe').length;
    const annulees = fiches.filter(f => f.status === 'installation_annulee').length;
    const enCours  = fiches.filter(f => f.status === 'installation_en_cours').length;
    const proposals= fiches.filter(f => f.status === 'proposal').length;
    const convRate = total > 0 ? Math.round((installe / total) * 100) : 0;

    const serviceCounts: Record<string, number> = {};
    fiches.forEach(f => {
      (f.produits as string[]).forEach(p => { serviceCounts[p] = (serviceCounts[p] || 0) + 1; });
    });

    return NextResponse.json({
      total, b2b, b2c, installe, annulees, enCours, proposals, convRate,
      stageCounts, serviceCounts, annees,
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
