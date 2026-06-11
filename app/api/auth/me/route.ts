import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
