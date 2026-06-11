import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });

  try {
    const [seFiches, users, essences, essenceAgg] = await Promise.all([
      prisma.solutionExpress.count({ where: { createdBy: user.id } }),
      prisma.user.count(),
      prisma.essence.count(),
      prisma.essence.aggregate({ _sum: { montantAttendu: true }, where: { recu: true, annee: new Date().getFullYear() } }),
    ]);

    let storageMB = 0;
    try {
      const result = await prisma.$queryRaw<[{ size_mb: number }]>`
        SELECT pg_database_size(current_database()) / (1024.0 * 1024.0) AS size_mb
      `;
      storageMB = parseFloat(Number(result[0]?.size_mb ?? 0).toFixed(2));
    } catch {
      storageMB = 0;
    }

    return NextResponse.json({
      totalDocs: seFiches + users + essences,
      solutionExpress: seFiches,
      users,
      essences,
      essenceRecu: parseFloat((essenceAgg._sum.montantAttendu ?? 0).toFixed(2)),
      storageMB,
      storageLimit: 500,
      storagePercent: Math.round((storageMB / 500) * 100),
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
