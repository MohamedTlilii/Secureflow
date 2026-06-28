import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const STAGES = ['new','contacted','proposal','installation_en_cours','installe','installation_annulee'] as const;

export async function GET(req: NextRequest) {
  const sp         = new URL(req.url).searchParams;
  const anneeParam = sp.get('annee')      ?? 'tout';
  const moisParam  = sp.get('mois')       ?? 'tout';
  const filtreComm = sp.get('filtreComm') ?? 'tout';

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    let gte: Date | undefined;
    let lt:  Date | undefined;
    let dateWhere: Prisma.SolutionExpressWhereInput = {};

    if (anneeParam !== 'tout') {
      const yr = Number(anneeParam);
      const mo = moisParam !== 'tout' ? Number(moisParam) : -1;
      gte = mo >= 0 ? new Date(yr, mo, 1)     : new Date(yr, 0, 1);
      lt  = mo >= 0 ? new Date(yr, mo + 1, 1) : new Date(yr + 1, 0, 1);
      dateWhere = {
        OR: [
          { dateVente: { gte, lt } },
          { dateVente: null, createdAt: { gte, lt } },
        ],
      };
    }

    let commWhere: Prisma.SolutionExpressWhereInput = {};
    if (filtreComm === 'payee')     commWhere = { commissionPayee: true };
    if (filtreComm === 'non_payee') commWhere = { commissionPayee: false, status: { not: 'installation_annulee' } };
    if (filtreComm === 'annulee')   commWhere = { status: 'installation_annulee' };

    const base: Prisma.SolutionExpressWhereInput = { createdBy: user.id, ...dateWhere, ...commWhere };

    const serviceQuery: Prisma.Sql = anneeParam === 'tout'
      ? Prisma.sql`
          SELECT p.produit, COUNT(*) AS cnt
          FROM   "SolutionExpress",
                 jsonb_array_elements_text(COALESCE("produits", '[]'::jsonb)) AS p(produit)
          WHERE  "createdBy" = ${user.id}
          GROUP  BY p.produit ORDER BY cnt DESC`
      : Prisma.sql`
          SELECT p.produit, COUNT(*) AS cnt
          FROM   "SolutionExpress",
                 jsonb_array_elements_text(COALESCE("produits", '[]'::jsonb)) AS p(produit)
          WHERE  "createdBy" = ${user.id}
            AND  (
                   ("dateVente" >= ${gte!} AND "dateVente" <  ${lt!})
                   OR
                   ("dateVente" IS NULL AND "createdAt" >= ${gte!} AND "createdAt" < ${lt!})
                 )
          GROUP  BY p.produit ORDER BY cnt DESC`;

    const [statusGroups, clientGroups, prodRaw, yearsRaw] = await Promise.all([
      prisma.solutionExpress.groupBy({
        by: ['status'], where: base, _count: { _all: true },
      }),
      prisma.solutionExpress.groupBy({
        by: ['typeClient'], where: base, _count: { _all: true },
      }),
      prisma.$queryRaw<{ produit: string; cnt: bigint }[]>(serviceQuery),
      prisma.$queryRaw<{ yr: number }[]>(Prisma.sql`
        SELECT DISTINCT EXTRACT(YEAR FROM "dateVente")::int AS yr
        FROM   "SolutionExpress"
        WHERE  "createdBy" = ${user.id} AND "dateVente" IS NOT NULL
        ORDER  BY yr DESC`),
    ]);

    const stageCounts = Object.fromEntries(
      STAGES.map(s => [s, statusGroups.find(g => g.status === s)?._count._all ?? 0])
    );
    const total    = statusGroups.reduce((n, g) => n + g._count._all, 0);
    const b2b      = clientGroups.find(g => g.typeClient === 'b2b')?._count._all ?? 0;
    const b2c      = clientGroups.find(g => g.typeClient === 'b2c')?._count._all ?? 0;
    const installe  = stageCounts.installe  || 0;
    const annulees  = stageCounts.installation_annulee  || 0;
    const enCours   = stageCounts.installation_en_cours || 0;
    const proposals = stageCounts.proposal  || 0;
    const convRate  = total > 0 ? Math.round((installe / total) * 100) : 0;

    const serviceCounts = Object.fromEntries(prodRaw.map(r => [r.produit, Number(r.cnt)]));

    const cur    = new Date().getFullYear();
    const annees = [...new Set([cur, ...yearsRaw.map(r => Number(r.yr))])].sort((a, b) => b - a);

    return NextResponse.json({
      total, b2b, b2c, installe, annulees, enCours, proposals, convRate,
      stageCounts, serviceCounts, annees,
    });
  } catch (e) {
    console.error('[pipeline/stats]', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
