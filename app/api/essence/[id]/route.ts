import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const body       = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.montantAttendu !== undefined) updateData.montantAttendu = body.montantAttendu;
    if (body.note           !== undefined) updateData.note           = body.note;
    if (body.recu           !== undefined) {
      updateData.recu          = body.recu;
      updateData.dateReception = body.recu ? new Date() : null;
    }

    const updated = await prisma.essence.update({
      where: { id: params.id },
      data:  updateData,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025')
      return NextResponse.json({ message: 'Mois introuvable' }, { status: 404 });
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
