import { prisma } from './prisma';

export async function ensureYear(annee: number): Promise<void> {
  await Promise.all(
    Array.from({ length: 12 }, (_, mois) =>
      prisma.essence.upsert({
        where:  { annee_mois: { annee, mois } },
        update: {},
        create: { annee, mois, joursOuvres: 0, montantParJour: 0, montantAttendu: 0 },
      })
    )
  );
}
