import { SignJWT } from 'jose';
import { prisma } from './prisma';

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret) throw new Error('JWT_SECRET non défini dans les variables d\'environnement');
const JWT_SECRET = new TextEncoder().encode(_rawSecret);

export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ id: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function getCurrentUser(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true, dateDebut: true, createdAt: true },
  });
}
