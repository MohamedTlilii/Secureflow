import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(req: NextRequest, { params }: { params: { annee: string } }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

  const annee = parseInt(params.annee, 10);
  if (isNaN(annee)) return NextResponse.json({ message: 'Année invalide' }, { status: 400 });

  const curYear = new Date().getFullYear();
  if (annee === curYear) return NextResponse.json({ message: 'Impossible de supprimer l\'année en cours' }, { status: 400 });

  try {
    const { count } = await prisma.essence.deleteMany({ where: { annee } });
    return NextResponse.json({ deleted: count });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
