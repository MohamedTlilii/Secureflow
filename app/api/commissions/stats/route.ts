import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { MOIS_LABELS } from '@/types';

const YEAR_COLORS = ['#12b76a','#3b6cf8','#f79009','#a764f8','#f04438','#61DAFB','#f97316'];
const HIST_PAGE   = 20;

export async function GET(req: NextRequest) {
  const sp         = new URL(req.url).searchParams;
  const anneeParam = sp.get('annee')  ?? 'tout';
  const filtre     = sp.get('filtre') ?? 'tout';
  const calMois    = Math.max(parseInt(sp.get('calMois')   ?? '-1', 10), -1);
  const calAnnee   = parseInt(sp.get('calAnnee') ?? String(new Date().getFullYear()), 10);
  const histOffset = Math.max(parseInt(sp.get('histOffset') ?? '0', 10), 0);

  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    /* ─── WHERE builders ────────────────────────────────────── */
    const commCond: Prisma.SolutionExpressWhereInput = {
      OR: [{ commissionTotale: { gt: 0 } }, { commissionFixe: { gt: 0 } }],
    };

    const baseConditions: Prisma.SolutionExpressWhereInput[] = [commCond];

    if (anneeParam !== 'tout') {
      const yr = Number(anneeParam);
      if (!Number.isNaN(yr) && yr > 2000 && yr < 2100) {
        baseConditions.push({ dateVente: { gte: new Date(yr, 0, 1), lt: new Date(yr + 1, 0, 1) } });
      }
    }
    if (calMois >= 0 && calMois <= 11 && !Number.isNaN(calAnnee)) {
      baseConditions.push({
        dateVente: { gte: new Date(calAnnee, calMois, 1), lt: new Date(calAnnee, calMois + 1, 1) },
      });
    }

    const statsWhere: Prisma.SolutionExpressWhereInput = {
      createdBy: user.id,
      AND: baseConditions,
    };

    const filtreConds: Prisma.SolutionExpressWhereInput[] = [];
    if (filtre === 'payee')     { filtreConds.push({ commissionPayee: true  }, { status: { not: 'installation_annulee' } }); }
    if (filtre === 'non_payee') { filtreConds.push({ commissionPayee: false }, { status: { not: 'installation_annulee' } }); }
    if (filtre === 'annulee')   { filtreConds.push({ status: 'installation_annulee' }); }

    const histWhere: Prisma.SolutionExpressWhereInput = {
      createdBy: user.id,
      AND: filtreConds.length > 0 ? [...baseConditions, ...filtreConds] : baseConditions,
    };

    // Min/Max cible : actives (sauf annulee pour filtre=tout), ou annulees si filtre=annulee
    const minMaxConds: Prisma.SolutionExpressWhereInput[] = [...baseConditions, { commissionTotale: { gt: 0 } }];
    if      (filtre === 'payee')     { minMaxConds.push({ commissionPayee: true  }, { status: { not: 'installation_annulee' } }); }
    else if (filtre === 'non_payee') { minMaxConds.push({ commissionPayee: false }, { status: { not: 'installation_annulee' } }); }
    else if (filtre === 'annulee')   { minMaxConds.push({ status: 'installation_annulee' }); }
    else                             { minMaxConds.push({ status: { not: 'installation_annulee' } }); }

    /* ─── Parallel queries ──────────────────────────────────── */
    type YrRow = { yr: number; status: string; commissionPayee: boolean; total: number; cnt: number };

    const [statsGroups, yearsRaw, [histItems, histTotal], settingsRaw, chartRaw, minMaxAgg] = await Promise.all([
      /* 1 – Stats via groupBy (year+month scope, no filtre) */
      prisma.solutionExpress.groupBy({
        by:     ['status', 'commissionPayee'],
        where:  statsWhere,
        _sum:   { commissionTotale: true },
        _count: { _all: true },
      }),

      /* 2 – Available years */
      prisma.$queryRaw<{ yr: number }[]>(Prisma.sql`
        SELECT DISTINCT EXTRACT(YEAR FROM "dateVente")::int AS yr
        FROM   "SolutionExpress"
        WHERE  "createdBy" = ${user.id}
          AND  ("commissionTotale" > 0 OR "commissionFixe" > 0)
          AND  "dateVente" IS NOT NULL
        ORDER  BY yr DESC
      `),

      /* 3 – Historique paginé + total */
      Promise.all([
        prisma.solutionExpress.findMany({
          where:   histWhere,
          orderBy: [{ dateVente: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
          take:    HIST_PAGE,
          skip:    histOffset,
        }),
        prisma.solutionExpress.count({ where: histWhere }),
      ]),

      /* 4 – Settings (objectif) */
      prisma.settings.findUnique({ where: { id: 'global' } }),

      /* 5 – Chart data */
      anneeParam === 'tout'
        ? prisma.$queryRaw<YrRow[]>(Prisma.sql`
            SELECT
              EXTRACT(YEAR FROM "dateVente")::int         AS yr,
              status,
              "commissionPayee",
              COALESCE(SUM("commissionTotale"), 0)::float AS total,
              COUNT(*)::int                               AS cnt
            FROM  "SolutionExpress"
            WHERE "createdBy" = ${user.id}
              AND ("commissionTotale" > 0 OR "commissionFixe" > 0)
              AND "dateVente" IS NOT NULL
            GROUP BY yr, status, "commissionPayee"
            ORDER BY yr DESC
          `)
        : prisma.solutionExpress.findMany({
            where:   histWhere,
            orderBy: [{ dateVente: { sort: 'asc', nulls: 'last' } }],
            take:    500,
            select: {
              commissionTotale: true, dateVente: true, status: true,
              commissionPayee: true, motifAnnulation: true,
              entreprise: true, prenom: true, nom: true,
            },
          }),

      /* 6 – Min / Max précis */
      prisma.solutionExpress.aggregate({
        where: { createdBy: user.id, AND: minMaxConds },
        _max:  { commissionTotale: true },
        _min:  { commissionTotale: true },
      }),
    ]);

    /* ─── Derivation stats depuis groupBy ───────────────────── */
    const sumFn   = (gs: typeof statsGroups) => gs.reduce((s, g) => s + (g._sum.commissionTotale ?? 0), 0);
    const countFn = (gs: typeof statsGroups) => gs.reduce((s, g) => s + g._count._all, 0);

    const activeGroups   = statsGroups.filter(g => g.status !== 'installation_annulee');
    const annuleeGroups  = statsGroups.filter(g => g.status === 'installation_annulee');
    const payeeActive    = activeGroups.filter(g =>  g.commissionPayee);
    const nonPayeeActive = activeGroups.filter(g => !g.commissionPayee);

    const filteredActive =
      filtre === 'payee'     ? payeeActive    :
      filtre === 'non_payee' ? nonPayeeActive :
      filtre === 'annulee'   ? []             :
      activeGroups;

    const totalGagne  = filtre === 'annulee' ? 0 : sumFn(filteredActive);
    const totalAnnule = (filtre === 'payee' || filtre === 'non_payee') ? 0 : sumFn(annuleeGroups);
    const totalPaye   = filtre === 'annulee' ? 0 : sumFn(payeeActive.filter(g => filteredActive.includes(g)));
    const enAttente   = filtre === 'annulee' ? 0 : Math.max(0, totalGagne - totalPaye);

    const nActives  = filtre === 'annulee' ? 0 : countFn(filteredActive);
    const nPayees   = (filtre === 'annulee' || filtre === 'non_payee') ? 0 : filtre === 'payee' ? nActives : countFn(payeeActive);
    const nAttente  = (filtre === 'annulee' || filtre === 'payee')     ? 0 : filtre === 'non_payee' ? nActives : countFn(nonPayeeActive);
    const nAnnulees = (filtre === 'payee'   || filtre === 'non_payee') ? 0 : countFn(annuleeGroups);

    const maximum = minMaxAgg._max.commissionTotale ?? 0;
    const minimum = minMaxAgg._min.commissionTotale ?? 0;

    const objectifAnnuel = (settingsRaw?.objectifAnnuel ?? {}) as Record<string, number>;
    const objectif = anneeParam !== 'tout' ? (objectifAnnuel[anneeParam] || 0) : 0;
    const objPct   = objectif > 0 ? Math.min(Math.round((totalGagne / objectif) * 100), 100) : 0;

    const cur    = new Date().getFullYear();
    const annees = [...new Set([cur, ...yearsRaw.map(r => Number(r.yr))])].sort((a, b) => b - a);

    /* ─── Chart data ────────────────────────────────────────── */
    let chartData;
    if (anneeParam === 'tout') {
      const yrRows = chartRaw as YrRow[];
      chartData = annees.map((yr, i) => {
        const yg     = yrRows.filter(r => r.yr === yr);
        const actYg  = yg.filter(r => r.status !== 'installation_annulee');
        const annYg  = yg.filter(r => r.status === 'installation_annulee');
        const payYg  = actYg.filter(r =>  r.commissionPayee);
        const npaYg  = actYg.filter(r => !r.commissionPayee);
        const filtYg = filtre === 'annulee' ? annYg : filtre === 'payee' ? payYg : filtre === 'non_payee' ? npaYg : actYg;
        const barColor = filtre === 'payee' ? '#3b6cf8' : filtre === 'non_payee' ? '#f79009' : filtre === 'annulee' ? '#be123c' : YEAR_COLORS[i % YEAR_COLORS.length];
        return {
          name:     String(yr),
          total:    filtYg.reduce((s, r) => s + Number(r.total), 0),
          count:    yg.reduce((s, r) => s + Number(r.cnt), 0),
          cPayee:   payYg.reduce((s, r) => s + Number(r.cnt), 0),
          cAttente: npaYg.reduce((s, r) => s + Number(r.cnt), 0),
          cAnnulee: annYg.reduce((s, r) => s + Number(r.cnt), 0),
          color:    barColor,
        };
      });
    } else {
      type DayItem = { commissionTotale: number|null; dateVente: string|null; status: string; commissionPayee: boolean; motifAnnulation: string|null; entreprise: string|null; prenom: string|null; nom: string|null };
      chartData = (chartRaw as DayItem[]).map(c => {
        const d       = c.dateVente ? new Date(c.dateVente) : null;
        const annulee = c.status === 'installation_annulee';
        return {
          name:    d ? `${d.getDate()} ${MOIS_LABELS[d.getMonth()]}` : '?',
          total:   c.commissionTotale || 0,
          color:   annulee ? '#be123c' : c.commissionPayee ? '#3b6cf8' : '#f79009',
          annulee,
          fullNom: c.entreprise || `${c.prenom || ''} ${c.nom || ''}`.trim() || '?',
          motif:   c.motifAnnulation || '',
          payee:   c.commissionPayee,
        };
      });
    }

    return NextResponse.json({
      totalGagne, totalPaye, enAttente, totalAnnule,
      maximum, minimum,
      objectif, objPct,
      nActives, nPayees, nAttente, nAnnulees,
      annees, chartData,
      historique: histItems,
      histTotal,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
