import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const anneeParam = new URL(req.url).searchParams.get('annee') ?? 'tout';

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const yr = anneeParam !== 'tout' ? Number(anneeParam) : null;
    const yearWhere: Prisma.SolutionExpressWhereInput = yr
      ? { dateVente: { gte: new Date(yr, 0, 1), lt: new Date(yr + 1, 0, 1) } }
      : {};

    const [statusGroups, yearsRaw] = await Promise.all([
      prisma.solutionExpress.groupBy({
        by: ['status'],
        where: { createdBy: user.id, ...yearWhere },
        _count: { _all: true },
      }),
      prisma.$queryRaw<{ yr: number }[]>(Prisma.sql`
        SELECT DISTINCT EXTRACT(YEAR FROM "dateVente")::int AS yr
        FROM   "SolutionExpress"
        WHERE  "createdBy" = ${user.id} AND "dateVente" IS NOT NULL
        ORDER  BY yr DESC
      `),
    ]);

    const cnt = (s: string) => statusGroups.find(g => g.status === s)?._count._all ?? 0;
    const cur = new Date().getFullYear();

    return NextResponse.json({
      totalFiches:   statusGroups.reduce((n, g) => n + g._count._all, 0),
      totalInstalle: cnt('installe'),
      totalAnnule:   cnt('installation_annulee'),
      totalPipeline: cnt('contacted') + cnt('proposal') + cnt('installation_en_cours'),
      annees: [...new Set([cur, ...yearsRaw.map(r => Number(r.yr))])].sort((a, b) => b - a),
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
