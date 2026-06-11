import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET non défini dans les variables d\'environnement');

const secret = new TextEncoder().encode(JWT_SECRET);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Laisse passer tous les fichiers statiques et pages
  // Les pages sont protégées côté client par le dashboard layout + AuthContext
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Routes API publiques — pas de token requis
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register')
  ) {
    return NextResponse.next();
  }

  // Toutes les autres routes API → token requis
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const headers = new Headers(req.headers);
    headers.set('x-user-id', userId);
    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json({ message: 'Token invalide' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
