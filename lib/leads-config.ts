/** Valide et nettoie la liste des appels de service. Retourne null si le format est invalide. */
export function cleanAppelsService(v: unknown): { id: string; description: string; paye: boolean }[] | null {
  if (!Array.isArray(v) || v.length > 100) return null;
  const out: { id: string; description: string; paye: boolean }[] = [];
  for (const a of v) {
    if (!a || typeof a !== 'object') return null;
    const { id, description, paye } = a as Record<string, unknown>;
    if (typeof description !== 'string' || typeof paye !== 'boolean') return null;
    out.push({ id: typeof id === 'string' && id ? id.slice(0, 40) : Math.random().toString(36).slice(2, 10), description: description.trim().slice(0, 2000), paye });
  }
  return out;
}

export const ALLOWED_LEAD_FIELDS = new Set([
  'prenom', 'nom', 'email', 'telephone', 'entreprise', 'ville', 'typeClient',
  'leadType', 'typeCommerce', 'qualificationSysteme', 'status', 'produits',
  'fournisseurs', 'notes', 'summary', 'dateVente', 'commissionFixe',
  'commissionExtra', 'commissionPayee', 'datePaiementCommission', 'motifAnnulation',
  'urgencyScore', 'montantContrat', 'sexe', 'sourceText', 'sourceUrl', 'ancienneAdresse', 'adresse', 'partageAvec', 'appelsService',
]);
