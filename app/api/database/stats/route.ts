import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    const users = await prisma.user.count();

    let storageMB = 0;
    try {
      const result = await prisma.$queryRaw<[{ size_mb: number }]>`
        SELECT pg_database_size(current_database()) / (1024.0 * 1024.0) AS size_mb
      `;
      storageMB = parseFloat(Number(result[0]?.size_mb ?? 0).toFixed(2));
    } catch {
      storageMB = 0;
    }

    const storageLimit = Number(process.env.STORAGE_LIMIT_MB ?? 500);
    return NextResponse.json({
      users,
      storageMB,
      storageLimit,
      storagePercent: Math.round((storageMB / storageLimit) * 100),
    });
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
