import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const anneeParam = new URL(req.url).searchParams.get('annee') ?? 'tout';

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const all = await prisma.solutionExpress.findMany({
      where: { createdBy: user.id },
      select: { status: true, dateVente: true, createdAt: true },
    });

    const getYear = (f: (typeof all)[0]) => new Date(f.dateVente ?? f.createdAt).getFullYear();

    const cur    = new Date().getFullYear();
    const annees = [...new Set([cur, ...all.map(getYear)])].sort((a, b) => b - a);

    const fiches = anneeParam === 'tout' ? all : all.filter(f => String(getYear(f)) === anneeParam);

    return NextResponse.json({
      totalFiches:   fiches.length,
      totalInstalle: fiches.filter(f => f.status === 'installe').length,
      totalAnnule:   fiches.filter(f => f.status === 'installation_annulee').length,
      totalPipeline: fiches.filter(f => ['contacted','proposal','installation_en_cours'].includes(f.status)).length,
      annees,
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
