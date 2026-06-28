import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { VALID_STATUTS, MOIS_LABELS } from '@/types';

type EvoRow   = { period: number; status: string; commission_payee: boolean; cnt: bigint };
type ProdRow  = { produit: string; cnt: bigint };
type EvoEntry = { total: number; installe: number; encours: number; annule: number; paye: number };

const zero = (): EvoEntry => ({ total: 0, installe: 0, encours: 0, annule: 0, paye: 0 });

export async function GET(req: NextRequest) {
  const sp         = new URL(req.url).searchParams;
  const anneeParam = sp.get('annee') ?? 'tout';
  const moisParam  = sp.get('mois')  ?? 'tout';

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    if (anneeParam !== 'tout' && !/^\d{4}$/.test(anneeParam))
      return NextResponse.json({ message: 'Paramètre année invalide' }, { status: 400 });
    if (moisParam !== 'tout' && !/^\d{1,2}$/.test(moisParam))
      return NextResponse.json({ message: 'Paramètre mois invalide' }, { status: 400 });

    // gte/lt extraits séparément — évite les casts dangereux dans les raw SQL
    let gte: Date | undefined;
    let lt:  Date | undefined;
    let statsWhere: Prisma.SolutionExpressWhereInput = {};

    if (anneeParam !== 'tout') {
      const yr = Number(anneeParam);
      const mo = moisParam !== 'tout' ? Number(moisParam) : -1;
      if (mo !== -1 && (mo < 0 || mo > 11))
        return NextResponse.json({ message: 'Mois hors plage (0–11)' }, { status: 400 });
      gte = mo >= 0 ? new Date(yr, mo, 1)     : new Date(yr, 0, 1);
      lt  = mo >= 0 ? new Date(yr, mo + 1, 1) : new Date(yr + 1, 0, 1);
      statsWhere = {
        OR: [
          { dateVente: { gte, lt } },
          { dateVente: null, createdAt: { gte, lt } },
        ],
      };
    }

    const base: Prisma.SolutionExpressWhereInput = { createdBy: user.id, ...statsWhere };

    // ── Raw SQL : évolution (dateVente uniquement — graphe temporel des ventes) ────
    const evoQuery: Prisma.Sql = anneeParam === 'tout'
      ? Prisma.sql`
          SELECT EXTRACT(YEAR FROM "dateVente")::int AS period,
                 status, "commissionPayee" AS commission_payee, COUNT(*) AS cnt
          FROM   "SolutionExpress"
          WHERE  "createdBy" = ${user.id} AND "dateVente" IS NOT NULL
          GROUP  BY period, status, "commissionPayee"
          ORDER  BY period ASC`
      : Prisma.sql`
          SELECT (EXTRACT(MONTH FROM "dateVente")::int - 1) AS period,
                 status, "commissionPayee" AS commission_payee, COUNT(*) AS cnt
          FROM   "SolutionExpress"
          WHERE  "createdBy" = ${user.id}
            AND  "dateVente" >= ${gte!}
            AND  "dateVente" <  ${lt!}
          GROUP  BY period, status, "commissionPayee"
          ORDER  BY period ASC`;

    // ── Raw SQL : produits (JSON array — impossible via groupBy ORM) ─────────────
    const prodQuery: Prisma.Sql = anneeParam === 'tout'
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

    // ── Toutes les requêtes en parallèle ────────────────────────────────────────
    const [
      statusGroups, clientGroups, cityGroups, leadTypeGroups, commerceGroups,
      recent, prodRaw, evoRaw, yearsRaw,
    ] = await Promise.all([
      prisma.solutionExpress.groupBy({
        by: ['status'], where: base, _count: { _all: true },
      }),
      prisma.solutionExpress.groupBy({
        by: ['typeClient'], where: base, _count: { _all: true },
      }),
      prisma.solutionExpress.groupBy({
        by: ['ville'],
        where: { ...base, ville: { not: '' } },
        _count: { _all: true },
        orderBy: { _count: { ville: 'desc' } },
        take: 20,
      }),
      prisma.solutionExpress.groupBy({
        by: ['leadType'],
        where: { ...base, leadType: { not: '' } },
        _count: { _all: true },
        orderBy: { _count: { leadType: 'desc' } },
      }),
      prisma.solutionExpress.groupBy({
        by: ['typeCommerce', 'typeClient'],
        where: { ...base, typeCommerce: { notIn: ['', 'autre'] } },
        _count: { _all: true },
      }),
      prisma.solutionExpress.findMany({
        where: base,
        select: {
          id: true, entreprise: true, prenom: true, nom: true,
          ville: true, status: true, typeClient: true,
          dateVente: true, motifAnnulation: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.$queryRaw<ProdRow[]>(prodQuery),
      prisma.$queryRaw<EvoRow[]>(evoQuery),
      prisma.$queryRaw<{ yr: number }[]>(Prisma.sql`
        SELECT DISTINCT EXTRACT(YEAR FROM "dateVente")::int AS yr
        FROM   "SolutionExpress"
        WHERE  "createdBy" = ${user.id} AND "dateVente" IS NOT NULL
        ORDER  BY yr DESC`),
    ]);

    // ── Counts & totaux ──────────────────────────────────────────────────────────
    const counts   = Object.fromEntries(
      VALID_STATUTS.map(s => [s, statusGroups.find(g => g.status === s)?._count._all ?? 0])
    );
    const totalSE  = statusGroups.reduce((n, g) => n + g._count._all, 0);
    const b2b      = clientGroups.find(g => g.typeClient === 'b2b')?._count._all ?? 0;
    const b2c      = clientGroups.find(g => g.typeClient === 'b2c')?._count._all ?? 0;
    const won      = counts.installe;
    const convRate = totalSE > 0 ? Math.round((won / totalSE) * 100) : 0;

    // ── Tableaux de répartition ──────────────────────────────────────────────────
    const byCity        = cityGroups.map(g => [g.ville, g._count._all] as [string, number]);
    const byLeadType    = leadTypeGroups.map(g => [g.leadType, g._count._all] as [string, number]);
    const byCommerce    = commerceGroups
      .filter(g => g.typeClient === 'b2b')
      .sort((a, b) => b._count._all - a._count._all)
      .map(g => [g.typeCommerce, g._count._all] as [string, number]);
    const byCommerceB2C = commerceGroups
      .filter(g => g.typeClient === 'b2c')
      .sort((a, b) => b._count._all - a._count._all)
      .map(g => [g.typeCommerce, g._count._all] as [string, number]);
    const byProduit     = prodRaw.map(r => [r.produit, Number(r.cnt)] as [string, number]);

    // ── Années ───────────────────────────────────────────────────────────────────
    const cur    = new Date().getFullYear();
    const annees = [...new Set([cur, ...yearsRaw.map(r => Number(r.yr))])].sort((a, b) => b - a);

    // ── Données d'évolution ──────────────────────────────────────────────────────
    const periodsMap = new Map<number, EvoEntry>();
    for (const row of evoRaw) {
      const cnt = Number(row.cnt);
      if (!periodsMap.has(row.period)) periodsMap.set(row.period, zero());
      const e = periodsMap.get(row.period)!;
      e.total += cnt;
      if (row.status === 'installe')              e.installe += cnt;
      if (row.status === 'installation_en_cours') e.encours  += cnt;
      if (row.status === 'installation_annulee')  e.annule   += cnt;
      if (row.commission_payee && row.status !== 'installation_annulee') e.paye += cnt;
    }

    let evolutionData: ({ name: string } & EvoEntry)[];
    if (anneeParam === 'tout') {
      evolutionData = annees.slice().reverse().map(yr => ({ name: String(yr), ...(periodsMap.get(yr) ?? zero()) }));
    } else if (moisParam !== 'tout') {
      const mo = Number(moisParam);
      evolutionData = [{ name: MOIS_LABELS[mo], ...(periodsMap.get(mo) ?? zero()) }];
    } else {
      evolutionData = Array.from({ length: 12 }, (_, i) => ({
        name: MOIS_LABELS[i],
        ...(periodsMap.get(i) ?? zero()),
      }));
    }

    return NextResponse.json({
      totalSE, b2b, b2c, won, convRate, counts, annees,
      byCity, byLeadType, byCommerce, byCommerceB2C, byProduit,
      recent, evolutionData,
    });
  } catch (e) {
    console.error('[dashboard/stats]', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
