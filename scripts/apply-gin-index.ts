/**
 * Script one-shot : ajoute l'index GIN sur la colonne produits (JSONB).
 * Prisma ne génère pas les index GIN via le schema — ce script doit être
 * exécuté une seule fois en développement et en production.
 *
 * Usage : npx ts-node scripts/apply-gin-index.ts
 *         ou : npx tsx scripts/apply-gin-index.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // CONCURRENTLY ne fonctionne pas dans une transaction — on utilise $executeRawUnsafe
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS idx_se_produits_gin ON "SolutionExpress" USING GIN (produits jsonb_path_ops)`
  );
  console.log('✓ Index GIN idx_se_produits_gin créé (ou déjà existant).');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
