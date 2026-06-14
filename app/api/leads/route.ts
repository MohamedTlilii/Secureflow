import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { VALID_STATUTS } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status   = searchParams.get('status');
    const leadType = searchParams.get('leadType');
    const ville    = searchParams.get('ville');

    const where: Record<string, unknown> = { createdBy: user.id };
    if (status && VALID_STATUTS.includes(status as typeof VALID_STATUTS[number])) where.status = status;
    if (leadType) where.leadType = leadType;
    if (ville && ville.length < 100) where.ville = ville;

    const fiches = await prisma.solutionExpress.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(fiches);
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = new Set([
  'prenom','nom','email','telephone','entreprise','ville','typeClient',
  'leadType','typeCommerce','qualificationSysteme','status','produits',
  'fournisseurs','notes','summary','dateVente','commissionFixe',
  'commissionExtra','commissionPayee','datePaiementCommission','motifAnnulation',
]);

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
      if (ALLOWED_FIELDS.has(k)) data[k] = v;
    }

    const fixe  = Number.isFinite(parseFloat(String(data.commissionFixe)))  ? parseFloat(String(data.commissionFixe))  : 0;
    const extra = Number.isFinite(parseFloat(String(data.commissionExtra))) ? parseFloat(String(data.commissionExtra)) : 0;
    data.commissionTotale = fixe + extra;

    const fiche = await prisma.solutionExpress.create({ data: data as any });
    return NextResponse.json(fiche, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Erreur création' }, { status: 500 });
  }
}
