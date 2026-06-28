import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { VALID_STATUTS } from '@/types';
import { ALLOWED_LEAD_FIELDS } from '@/lib/leads-config';
import { calcCommissionTotale } from '@/lib/commission';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const existing = await prisma.solutionExpress.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ message: 'Fiche non trouvée' }, { status: 404 });
    if (existing.createdBy !== user.id) return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });

    const body = await req.json();

    if (body.status && !VALID_STATUTS.includes(body.status)) {
      return NextResponse.json({ message: 'Statut invalide' }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_LEAD_FIELDS.has(k)) updateFields[k] = v;
    }

    if (updateFields.commissionFixe !== undefined || updateFields.commissionExtra !== undefined) {
      const rawFixe  = updateFields.commissionFixe  ?? existing.commissionFixe  ?? 0;
      const rawExtra = updateFields.commissionExtra ?? existing.commissionExtra ?? 0;
      updateFields.commissionTotale = calcCommissionTotale(rawFixe, rawExtra);
    }

    const updated = await prisma.solutionExpress.update({
      where: { id: params.id },
      data: updateFields,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: 'Erreur mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const existing = await prisma.solutionExpress.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ message: 'Fiche non trouvée' }, { status: 404 });
    if (existing.createdBy !== user.id) return NextResponse.json({ message: 'Non autorisé' }, { status: 403 });

    await prisma.solutionExpress.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Fiche supprimée' });
  } catch {
    return NextResponse.json({ message: 'Erreur suppression' }, { status: 500 });
  }
}
