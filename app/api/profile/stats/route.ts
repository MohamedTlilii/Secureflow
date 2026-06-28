import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

    const yr = new Date().getFullYear();
    const fiches = await prisma.solutionExpress.findMany({
      where: { createdBy: user.id },
      select: { commissionTotale: true, commissionPayee: true, status: true, dateVente: true },
    });

    const yearFiches = fiches.filter(f => f.dateVente && new Date(f.dateVente).getFullYear() === yr);
    const totalPaye  = yearFiches.filter(f => f.commissionPayee).reduce((s, f) => s + (Number(f.commissionTotale) || 0), 0);
    const enAttente  = yearFiches.filter(f => f.status !== 'installation_annulee' && !f.commissionPayee && (Number(f.commissionTotale) || 0) > 0).reduce((s, f) => s + (Number(f.commissionTotale) || 0), 0);

    return NextResponse.json({ totalPaye, enAttente, annee: yr });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
