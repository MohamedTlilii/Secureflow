import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const nextAnnee = new Date().getFullYear() + 1;

    await Promise.all(
      Array.from({ length: 12 }, (_, mois) =>
        prisma.essence.upsert({
          where:  { annee_mois: { annee: nextAnnee, mois } },
          update: {},
          create: { annee: nextAnnee, mois, joursOuvres: 0, montantParJour: 0, montantAttendu: 0 },
        })
      )
    );

    return NextResponse.json({ ok: true, nextAnnee });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
