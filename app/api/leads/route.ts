import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { VALID_STATUTS } from '@/types';
import { ALLOWED_LEAD_FIELDS } from '@/lib/leads-config';
import { calcCommissionTotale } from '@/lib/commission';

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const sp            = new URL(req.url).searchParams;
    const search        = (sp.get('search') ?? '').trim().slice(0, 200);
    const annee         = sp.get('annee') ?? 'tout';
    const sortBy        = sp.get('sortBy') ?? 'date_desc';
    const status        = sp.get('status') ?? '';
    const typeClient    = sp.get('typeClient') ?? '';
    const leadType      = sp.get('leadType') ?? '';
    const ville         = sp.get('ville') ?? '';
    const typeCommerce  = sp.get('typeCommerce') ?? '';
    const qualifSysteme = sp.get('qualifSysteme') ?? '';
    const commission    = sp.get('commission') ?? '';
    const service       = sp.get('service') ?? '';
    const limit         = Math.min(Math.max(Number(sp.get('limit') ?? PAGE_SIZE), 1), 5000);
    const offset        = Math.max(Number(sp.get('offset') ?? '0'), 0);

    const conditions: Prisma.SolutionExpressWhereInput[] = [];

    if (status && VALID_STATUTS.includes(status as typeof VALID_STATUTS[number])) {
      conditions.push({ status });
    }
    if (typeClient && ['b2b', 'b2c'].includes(typeClient)) conditions.push({ typeClient });
    if (leadType)      conditions.push({ leadType });
    if (ville)         conditions.push({ ville });
    if (typeCommerce)  conditions.push({ typeCommerce });
    if (qualifSysteme) conditions.push({ qualificationSysteme: qualifSysteme });

    if (commission === 'payee')      conditions.push({ commissionPayee: true });
    if (commission === 'en_attente') { conditions.push({ commissionPayee: false }); conditions.push({ commissionTotale: { gt: 0 } }); }
    if (commission === 'avec')       conditions.push({ commissionTotale: { gt: 0 } });
    if (commission === 'annulee')    conditions.push({ status: 'installation_annulee' });

    if (annee !== 'tout') {
      const yr = Number(annee);
      if (!Number.isNaN(yr) && yr > 2000 && yr < 2100) {
        conditions.push({ dateVente: { gte: new Date(yr, 0, 1), lt: new Date(yr + 1, 0, 1) } });
      }
    }

    if (search) {
      conditions.push({
        OR: [
          { entreprise: { contains: search, mode: 'insensitive' } },
          { prenom:     { contains: search, mode: 'insensitive' } },
          { nom:        { contains: search, mode: 'insensitive' } },
          { telephone:  { contains: search, mode: 'insensitive' } },
          { email:      { contains: search, mode: 'insensitive' } },
          { ville:      { contains: search, mode: 'insensitive' } },
          { summary:    { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (service) {
      conditions.push({ produits: { array_contains: [service] } } as Prisma.SolutionExpressWhereInput);
    }

    const where: Prisma.SolutionExpressWhereInput = {
      createdBy: user.id,
      ...(conditions.length > 0 && { AND: conditions }),
    };

    let orderBy: Prisma.SolutionExpressOrderByWithRelationInput[];
    switch (sortBy) {
      case 'date_asc':
        orderBy = [{ dateVente: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }];
        break;
      case 'urgency_desc':
        orderBy = [{ urgencyScore: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'commission_desc':
        orderBy = [{ commissionTotale: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'entreprise':
        orderBy = [{ entreprise: 'asc' }, { createdAt: 'desc' }];
        break;
      case 'status':
        orderBy = [{ status: 'asc' }, { createdAt: 'desc' }];
        break;
      default:
        orderBy = [{ dateVente: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }];
    }

    const [fiches, total] = await Promise.all([
      prisma.solutionExpress.findMany({ where, orderBy, take: limit, skip: offset }),
      prisma.solutionExpress.count({ where }),
    ]);

    return NextResponse.json({ fiches, total });
  } catch (err) {
    console.error('[leads GET]', err);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const body = await req.json();

    if (body.status && !VALID_STATUTS.includes(body.status)) {
      return NextResponse.json({ message: 'Statut invalide' }, { status: 400 });
    }
    if (body.typeClient && !['b2b','b2c'].includes(body.typeClient)) {
      return NextResponse.json({ message: 'Type client invalide' }, { status: 400 });
    }

    const data: Record<string, unknown> = { createdBy: user.id };
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_LEAD_FIELDS.has(k)) data[k] = v;
    }

    data.commissionTotale = calcCommissionTotale(data.commissionFixe, data.commissionExtra);

    const fiche = await prisma.solutionExpress.create({ data: data as any });
    return NextResponse.json(fiche, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Erreur création' }, { status: 500 });
  }
}
