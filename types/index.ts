export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  dateDebut?: string | null;
  createdAt: string;
}

export type StatusFiche =
  | 'new'
  | 'contacted'
  | 'proposal'
  | 'installation_en_cours'
  | 'installe'
  | 'installation_annulee';

export const VALID_STATUTS: StatusFiche[] = [
  'new', 'contacted', 'proposal',
  'installation_en_cours', 'installe', 'installation_annulee',
];

export const STATUS_LABEL: Record<StatusFiche, string> = {
  new: 'Nouveau',
  contacted: 'Contacté',
  proposal: 'Soumission',
  installation_en_cours: 'En cours',
  installe: 'Installé',
  installation_annulee: 'Annulé',
};

export const STATUS_COLOR: Record<StatusFiche, string> = {
  new: '#3b6cf8',
  contacted: '#f79009',
  proposal: '#a764f8',
  installation_en_cours: '#f97316',
  installe: '#22c55e',
  installation_annulee: '#be123c',
};

export interface Fournisseurs {
  alarme?:   { actuel?: string; propose?: string };
  internet?: { actuel?: string; propose?: string };
  mobile?:   { actuel?: string; propose?: string };
}

export interface SolutionExpress {
  id: string;
  sourceText: string;
  sourceUrl: string;
  entreprise: string;
  typeCommerce: string;
  ancienneAdresse: string;
  typeClient: 'b2b' | 'b2c';
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  sexe: 'homme' | 'femme' | 'inconnu';
  adresse: string;
  ville: string;
  leadType: string;
  qualificationSysteme: string;
  produits: string[];
  fournisseurs: Fournisseurs;
  status: StatusFiche;
  motifAnnulation: string;
  urgencyScore: number;
  summary: string;
  notes: string[];
  montantContrat: number;
  commissionFixe: number;
  commissionExtra: number;
  commissionTotale: number;
  commissionPayee: boolean;
  dateVente?: string | null;
  datePaiementCommission?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TypeCommerceItem { key: string; label: string; }

export interface ServiceFournisseur { key: string; label: string; }

export interface Service {
  id: string;
  label: string;
  color: string;
  icon: string;
  actuel: ServiceFournisseur[];
  propose: ServiceFournisseur[];
}

export interface Settings {
  id: string;
  villes: string[];
  typeCommerce: TypeCommerceItem[];
  typeLead: TypeCommerceItem[];
  qualificationSysteme: TypeCommerceItem[];
  services: Service[];
  motifsAnnulation: string[];
  objectifAnnuel: Record<string, number>;
  commissionFixeDefaut: number;
  commissionExtraDefaut: number;
  produitsAvecQualification: string[];
}

export interface EssenceMois {
  id: string;
  annee: number;
  mois: number;
  joursOuvres: number;
  montantParJour: number;
  montantAttendu: number;
  recu: boolean;
  dateReception?: string | null;
  note: string;
}

export interface DbStats {
  totalDocs: number;
  solutionExpress: number;
  users: number;
  essences: number;
  essenceRecu: number;
  storageMB: number;
  storageLimit: number;
  storagePercent: number;
}

export interface LoginResponse { token: string; user: User; }

export const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
export const MOIS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  villes: ['Montréal','Laval','Brossard','Longueuil','Repentigny','Terrebonne','Blainville','Saint-Jérôme','Mirabel','Gatineau'],
  typeCommerce: [
    { key: 'restaurant_cafe', label: 'Restaurant / Café' },
    { key: 'epicerie', label: 'Épicerie / Dépanneur' },
    { key: 'coiffure_esthetique', label: 'Coiffure et esthétique' },
    { key: 'pharmacie', label: 'Pharmacie' },
    { key: 'bureau', label: 'Bureau / Professionnel' },
    { key: 'autre', label: 'Autre' },
  ],
  typeLead: [
    { key: 'nouvelle_entreprise', label: 'Nouvelle entreprise' },
    { key: 'referral', label: 'Référence' },
    { key: 'cold_call', label: 'Appel à froid' },
    { key: 'digital', label: 'Digital / Réseaux sociaux' },
    { key: 'autre', label: 'Autre' },
  ],
  qualificationSysteme: [
    { key: 'pas_de_systeme', label: 'Pas de système' },
    { key: 'adt', label: 'ADT' },
    { key: 'protectron', label: 'Protectron' },
    { key: 'videotron', label: 'Vidéotron' },
    { key: 'bell', label: 'Bell' },
    { key: 'rogers', label: 'Rogers' },
    { key: 'autre', label: 'Autre' },
  ],
  services: [
    {
      id: 'alarme', label: 'Alarme', color: '#f04438', icon: 'shield',
      actuel: [{ key: 'adt', label: 'ADT' }, { key: 'protectron', label: 'Protectron' }, { key: 'autre', label: 'Autre' }],
      propose: [{ key: 'gardaworld', label: 'GardaWorld' }, { key: 'brinks', label: 'Brinks' }, { key: 'autre', label: 'Autre' }],
    },
    {
      id: 'internet', label: 'Internet', color: '#3b6cf8', icon: 'wifi',
      actuel: [{ key: 'videotron', label: 'Vidéotron' }, { key: 'bell', label: 'Bell' }, { key: 'rogers', label: 'Rogers' }, { key: 'autre', label: 'Autre' }],
      propose: [{ key: 'videotron', label: 'Vidéotron' }, { key: 'bell', label: 'Bell' }, { key: 'autre', label: 'Autre' }],
    },
    {
      id: 'mobile', label: 'Mobile', color: '#12b76a', icon: 'smartphone',
      actuel: [{ key: 'bell', label: 'Bell' }, { key: 'rogers', label: 'Rogers' }, { key: 'telus', label: 'Telus' }, { key: 'autre', label: 'Autre' }],
      propose: [{ key: 'bell', label: 'Bell' }, { key: 'rogers', label: 'Rogers' }, { key: 'telus', label: 'Telus' }, { key: 'autre', label: 'Autre' }],
    },
  ],
  motifsAnnulation: ['Prix trop élevé', 'Délai trop long', 'Concurrent choisi', 'Client non disponible', 'Autre'],
  objectifAnnuel: { '2025': 2222, '2026': 5000 },
  commissionFixeDefaut: 0,
  commissionExtraDefaut: 0,
  produitsAvecQualification: ['alarme'],
};
