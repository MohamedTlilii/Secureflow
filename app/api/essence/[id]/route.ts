import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ensureYear } from '@/lib/essence-helpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.recu           !== undefined) updateData.recu           = body.recu;
    if (body.note           !== undefined) updateData.note           = body.note;
    if (body.montantAttendu !== undefined) updateData.montantAttendu = body.montantAttendu;
    if (body.montantParJour !== undefined) updateData.montantParJour = body.montantParJour;
    if (body.recu === true)               updateData.dateReception   = new Date();
    if (body.recu === false)              updateData.dateReception   = null;

    const updated = await prisma.essence.update({
      where: { id: params.id },
      data: updateData,
    });

    // Logique décembre : si reçu + tous les mois de l'année reçus → génère l'année suivante
    let nextAnnee: number | undefined;
    if (body.recu === true && updated.mois === 11) {
      const tousLesMois = await prisma.essence.findMany({ where: { annee: updated.annee } });
      const tousRecus   = tousLesMois.length === 12 && tousLesMois.every((m) => m.recu);
      if (tousRecus) {
        nextAnnee = updated.annee + 1;
        await ensureYear(nextAnnee);
        // Re-vérification atomique avant suppression
        const recheck = await prisma.essence.findMany({ where: { annee: updated.annee } });
        if (recheck.length === 12 && recheck.every((m) => m.recu)) {
          await prisma.essence.deleteMany({ where: { annee: updated.annee } });
        }
      }
    }

    return NextResponse.json({ ...updated, nextAnnee });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json({ message: 'Mois introuvable' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
