# RAPPORT COMPLET — SecureFlow CRM v2

**Auteur** : Mohamed Tlili  
**Rôle** : Agent commercial — Solution Express (Québec)  
**Email** : solutionsexpress.tn@gmail.com  
**Actif depuis** : 15 juin 2025  
**Date rapport** : 10 juin 2026  
**Version** : 2.0 (migration MERN → Next.js - TypeScript)

---

## 1. STACK TECHNOLOGIQUE

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Framework | **Next.js 14** (App Router) | Frontend + Backend dans un seul projet |
| Langage | **TypeScript** strict | Typage complet partout |
| Base de données | **PostgreSQL** | Données relationnelles |
| Hébergement DB | **Supabase** | Cloud PostgreSQL avec pooler |
| ORM | **Prisma** | Queries DB, migrations, schéma |
| Auth API routes | **jsonwebtoken** | Signer/vérifier les tokens JWT (Node.js) |
| Auth middleware | **jose** | Vérifier JWT en Edge Runtime (middleware.ts) |
| Client HTTP | **Axios** | Appels API depuis le frontend |
| State global | **React Context** | AuthContext (user, login, logout) |
| Icônes | **Lucide React** | Toutes les icônes de l'app |
| Graphiques | **Recharts** | Bar, Area, Pie charts |
| Notifications | **react-hot-toast** | Toasts succès/erreur |
| Hébergement app | **Vercel** | Déploiement production |
| Style | **Inline styles** | CSS-in-JS, zéro Tailwind, zéro modules CSS |

---

## 2. STRUCTURE DES DOSSIERS

```
Portfolio-QC/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                    # Page de connexion
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # Layout dashboard (sidebar + auth guard)
│   │   ├── page.tsx                        # Dashboard principal (/)
│   │   ├── comparaison/
│   │   │   └── page.tsx                    # Comparaison annuelle
│   │   ├── commissions/
│   │   │   └── page.tsx                    # Suivi commissions + calendrier
│   │   ├── solution-express/
│   │   │   └── page.tsx                    # Gestion fiches clients
│   │   ├── pipeline/
│   │   │   └── page.tsx                    # Pipeline Kanban
│   │   ├── essence/
│   │   │   └── page.tsx                    # Indemnité carburant
│   │   ├── database/
│   │   │   └── page.tsx                    # Stats base de données
│   │   └── parametres/
│   │       └── page.tsx                    # Configuration app
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts              # POST /api/auth/login
│   │   │   ├── register/route.ts           # POST /api/auth/register
│   │   │   └── me/route.ts                 # GET /api/auth/me
│   │   ├── solution-express/
│   │   │   ├── route.ts                    # GET + POST /api/solution-express
│   │   │   └── [id]/route.ts               # PUT + DELETE /api/solution-express/[id]
│   │   ├── settings/
│   │   │   └── route.ts                    # GET + PUT /api/settings
│   │   ├── essence/
│   │   │   ├── route.ts                    # GET /api/essence?annee=X
│   │   │   ├── [id]/route.ts               # PUT /api/essence/[id]
│   │   │   ├── annees/route.ts             # GET /api/essence/annees
│   │   │   ├── annees/[annee]/route.ts     # DELETE /api/essence/annees/[annee]
│   │   │   └── stats/route.ts              # GET /api/essence/stats
│   │   └── database/
│   │       └── stats/route.ts              # GET /api/database/stats
│   └── globals.css                         # Animations CSS globales
├── components/
│   ├── Sidebar.tsx                         # Navigation principale (desktop + mobile)
│   ├── AnimatedNumber.tsx                  # Compteur animé (chiffres qui défilent)
│   └── solution-express/
│       ├── FicheCard.tsx                   # Carte client dans la liste
│       ├── UltraFiche.tsx                  # Panneau détail complet d'un client
│       ├── FicheModal.tsx                  # Formulaire ajout / édition fiche
│       ├── MiniScoreRing.tsx               # Anneau SVG score d'urgence (1-10)
│       └── CommissionBadge.tsx             # Badge toggle commission payée/non payée
├── context/
│   └── AuthContext.tsx                     # Context React global auth
├── lib/
│   ├── api.ts                              # Instance Axios avec intercepteurs
│   ├── auth.ts                             # signToken, verifyToken, getCurrentUser
│   ├── prisma.ts                           # Singleton Prisma client
│   └── essence-helpers.ts                  # ensureYear() — auto-génère 12 mois
├── types/
│   └── index.ts                            # Tous les types TypeScript du projet
├── middleware.ts                            # Vérification JWT sur toutes les routes /api/*
├── prisma/
│   └── schema.prisma                       # Schéma base de données
└── .env.local                              # Variables d'environnement (jamais committé)
```

---

## 3. VARIABLES D'ENVIRONNEMENT

Fichier `.env.local` (sur ta machine uniquement, jamais sur GitHub ni Vercel repo) :

```env
JWT_SECRET=...     # Clé secrète pour signer les tokens JWT (longue chaîne aléatoire)
DATABASE_URL=...   # URL Supabase avec pgbouncer (pour Prisma en production)
DIRECT_URL=...     # URL Supabase directe (pour les migrations Prisma)
```

Sur **Vercel** (production) : ces 3 variables doivent être copiées dans le dashboard Vercel → Settings → Environment Variables.

---

## 4. BASE DE DONNÉES — SCHÉMA PRISMA COMPLET

### Modèle `User`
```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String                         // Hashé avec bcrypt (10 rounds)
  role      String   @default("agent")
  avatar    String?
  createdAt DateTime @default(now())

  fiches SolutionExpress[]                 // Relation 1→N
}
```

### Modèle `SolutionExpress` (fiche client)
```prisma
model SolutionExpress {
  id                     String    @id @default(cuid())
  sourceText             String    @default("")       // Texte source du lead
  sourceUrl              String    @default("")       // URL source du lead
  entreprise             String    @default("")
  typeCommerce           String    @default("autre")
  ancienneAdresse        String    @default("")
  typeClient             String    @default("b2b")    // "b2b" ou "b2c"
  prenom                 String    @default("")
  nom                    String    @default("")
  telephone              String    @default("")
  email                  String    @default("")
  sexe                   String    @default("inconnu") // "homme", "femme", "inconnu"
  adresse                String    @default("")
  ville                  String    @default("")
  region                 String    @default("")
  leadType               String    @default("autre")
  qualificationSysteme   String    @default("inconnu")
  produits               Json      @default("[]")     // string[] : IDs des services choisis
  fournisseurs           Json      @default("{}")     // { [serviceId]: { actuel, propose } }
  status                 String    @default("new")    // voir StatusFiche
  motifAnnulation        String    @default("")
  urgencyScore           Int       @default(0)        // 0-10
  summary                String    @default("")
  notes                  Json      @default("[]")     // string[]
  montantContrat         Float     @default(0)
  commissionFixe         Float     @default(0)
  commissionExtra        Float     @default(0)
  commissionTotale       Float     @default(0)        // = commissionFixe + commissionExtra
  commissionPayee        Boolean   @default(false)
  dateVente              DateTime?
  datePaiementCommission DateTime?
  createdBy              String                       // FK → User.id
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@index([status])
  @@index([ville])
  @@index([createdAt(sort: Desc)])
  @@index([createdBy])
}
```

### Modèle `Settings` (singleton)
```prisma
model Settings {
  id                   String   @id @default("global") // Toujours "global" — un seul enregistrement
  villes               Json     @default("[]")         // string[]
  typeCommerce         Json     @default("[]")         // TypeCommerceItem[]
  typeLead             Json     @default("[]")         // TypeCommerceItem[]
  qualificationSysteme Json     @default("[]")         // TypeCommerceItem[]
  services             Json     @default("[]")         // Service[]
  motifsAnnulation     Json     @default("[]")         // string[]
  objectifAnnuel       Json     @default("{}")         // Record<string, number> ex: { "2025": 2222, "2026": 5000 }
  updatedAt            DateTime @updatedAt
}
```

### Modèle `Essence`
```prisma
model Essence {
  id             String    @id @default(cuid())
  annee          Int
  mois           Int       // 0 = Janvier, 11 = Décembre (JavaScript convention)
  joursOuvres    Int
  montantParJour Float     @default(5)
  montantAttendu Float     // = joursOuvres × montantParJour
  recu           Boolean   @default(false)
  dateReception  DateTime?
  note           String    @default("")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([annee, mois])  // Un seul enregistrement par mois/année
  @@index([annee])
}
```

---

## 5. TYPES TYPESCRIPT — `types/index.ts`

### `User`
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  createdAt: string;
}
```

### `StatusFiche`
```typescript
type StatusFiche =
  | 'new'
  | 'contacted'
  | 'proposal'
  | 'installation_en_cours'
  | 'installe'
  | 'installation_annulee';
```

### `VALID_STATUTS`
```typescript
const VALID_STATUTS: StatusFiche[] = [
  'new', 'contacted', 'proposal',
  'installation_en_cours', 'installe', 'installation_annulee'
];
```

### `STATUS_LABEL`
```typescript
const STATUS_LABEL: Record<StatusFiche, string> = {
  new:                    'Nouveau',
  contacted:              'Contacté',
  proposal:               'Soumission',
  installation_en_cours:  'En cours',
  installe:               'Installé',
  installation_annulee:   'Annulé',
};
```

### `STATUS_COLOR`
```typescript
const STATUS_COLOR: Record<StatusFiche, string> = {
  new:                    '#8b8b9e',
  contacted:              '#3b6cf8',
  proposal:               '#f59e0b',
  installation_en_cours:  '#f97316',
  installe:               '#12b76a',
  installation_annulee:   '#ef4444',
};
```

### `SolutionExpress`
```typescript
interface SolutionExpress {
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
  region: string;
  leadType: string;
  qualificationSysteme: string;
  produits: string[];             // IDs des services
  fournisseurs: Fournisseurs;     // { [serviceId]: { actuel: string, propose: string } }
  status: StatusFiche;
  motifAnnulation: string;
  urgencyScore: number;           // 0-10
  summary: string;
  notes: string[];
  montantContrat: number;
  commissionFixe: number;
  commissionExtra: number;
  commissionTotale: number;
  commissionPayee: boolean;
  dateVente?: string;
  datePaiementCommission?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### `Settings`
```typescript
interface Settings {
  id: string;
  villes: string[];
  typeCommerce: TypeCommerceItem[];
  typeLead: TypeCommerceItem[];
  qualificationSysteme: TypeCommerceItem[];
  services: Service[];
  motifsAnnulation: string[];
  objectifAnnuel: Record<string, number>;
}
```

### `Service`
```typescript
interface Service {
  id: string;
  label: string;
  color: string;
  icon: string;                   // clé d'icône (ex: 'wifi', 'shield', etc.)
  actuel: ServiceFournisseur[];   // { id, label } — fournisseurs actuels
  propose: ServiceFournisseur[];  // { id, label } — fournisseurs proposés
}
```

### `EssenceMois`
```typescript
interface EssenceMois {
  id: string;
  annee: number;
  mois: number;             // 0-11
  joursOuvres: number;
  montantParJour: number;
  montantAttendu: number;
  recu: boolean;
  dateReception?: string;
  note: string;
}
```

### `DbStats`
```typescript
interface DbStats {
  totalDocuments: number;
  solutionExpressCount: number;
  usersCount: number;
  essenceTotal: number;
  essenceRecus: number;
  dbSizeMB: number;
  dbLimitMB: number;
  dbUsedPct: number;
}
```

### `LoginResponse`
```typescript
interface LoginResponse {
  token: string;
  user: User;
}
```

### `MOIS_LABELS`
```typescript
const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                     'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
```

### `MOIS_FULL`
```typescript
const MOIS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
```

### `DEFAULT_SETTINGS`
```typescript
const DEFAULT_SETTINGS: Settings = {
  id: 'global',
  villes: ['Montréal', 'Laval', 'Brossard', 'Longueuil', 'Repentigny',
           'Terrebonne', 'Blainville', 'Saint-Jérôme', 'Mirabel', 'Gatineau'],
  typeCommerce: [],
  typeLead: [],
  qualificationSysteme: [],
  services: [
    { id: 's1', label: 'Alarme',   color: '#ef4444', icon: 'shield',     actuel: [], propose: [] },
    { id: 's2', label: 'Internet', color: '#3b82f6', icon: 'wifi',       actuel: [], propose: [] },
    { id: 's3', label: 'Mobile',   color: '#22c55e', icon: 'smartphone', actuel: [], propose: [] },
  ],
  motifsAnnulation: [],
  objectifAnnuel: { '2025': 2222, '2026': 5000 },
};
```

---

## 6. AUTHENTIFICATION — FLUX COMPLET

### Schéma du flux
```
[Browser]  →  POST /api/auth/login { email, password }
                       ↓
[login/route.ts]  →  bcrypt.compare(password, hash)
                       ↓
[lib/auth.ts]  →  signToken(userId)  →  JWT HS256, expiry 7j
                       ↓
[Browser]  →  localStorage.setItem('sf_token', token)
                       ↓
[lib/api.ts]  →  intercepteur: Authorization: Bearer <token> sur chaque requête
                       ↓
[middleware.ts]  →  jose.jwtVerify(token, secret)  →  extrait userId  →  header x-user-id
                       ↓
[API route]  →  getCurrentUser(req)  →  lit x-user-id  →  prisma.user.findUnique()
```

### `lib/auth.ts` — fonctions
```typescript
// Signe un token JWT pour userId, expire dans 7 jours
function signToken(userId: string): string
  // jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' })

// Vérifie un token, retourne le payload ou null
function verifyToken(token: string): JwtPayload | null
  // Retourne { id, iat, exp } ou null si invalide

// Lit x-user-id du header, retourne l'utilisateur Prisma ou null
async function getCurrentUser(req: NextRequest): Promise<User | null>
  // req.headers.get('x-user-id') → prisma.user.findUnique({ where: { id } })
```

### `lib/api.ts` — Axios
```typescript
// Instance Axios
const api = axios.create({ baseURL: '' });

// Request interceptor
// Lit localStorage.getItem('sf_token')
// Ajoute: config.headers.Authorization = `Bearer ${token}`

// Response interceptor
// Si status 401 → localStorage.removeItem('sf_token') → window.location.href = '/login'
```

### `middleware.ts`
```typescript
// Routes publiques (sans token requis)
const PUBLIC = ['/api/auth/login', '/api/auth/register'];

// Sur toutes les routes /api/* :
// 1. Extrait le token du header Authorization: Bearer
// 2. jose.jwtVerify(token, secret) → payload
// 3. Injecte x-user-id dans les headers de la requête
// 4. Si invalide → 401 JSON
```

### `context/AuthContext.tsx` — état global
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Au mount :
// 1. Lit sf_token de localStorage
// 2. GET /api/auth/me avec AbortController + timeout 8s
// 3. Si succès → setUser(data)
// 4. Si erreur (non-annulation) → supprime token
// 5. Mounted flag empêche setState après démontage

// login() : POST /api/auth/login → setItem sf_token → setUser
// logout() : removeItem sf_token → setUser(null)
```

---

## 7. API ROUTES — DÉTAIL COMPLET

### `POST /api/auth/login`
- **Auth** : non requise
- **Body** : `{ email: string, password: string }`
- **Validation** :
  - Email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - email max 254 chars, password max 128 chars
  - Types string obligatoires
  - Corps JSON valide (try/catch séparé → 400)
- **Logique** : `bcrypt.compare` → `signToken(user.id)` → retourne user sans password
- **Réponse 200** : `{ token: string, user: User }`
- **Erreurs** : 400 (validation), 401 (mauvais credentials), 500

### `GET /api/auth/me`
- **Auth** : Bearer requis
- **Réponse 200** : `User` (sans password)

### `GET /api/solution-express`
- **Auth** : Bearer requis
- **Logique** : `prisma.solutionExpress.findMany({ where: { createdBy: userId }, orderBy: { createdAt: 'desc' } })`
- **Réponse 200** : `SolutionExpress[]`

### `POST /api/solution-express`
- **Auth** : Bearer requis
- **Body** : champs de la fiche
- **Logique** :
  - Ajoute `createdBy: userId` automatiquement
  - `commissionTotale = commissionFixe + commissionExtra`
- **Réponse 201** : fiche créée

### `PUT /api/solution-express/[id]`
- **Auth** : Bearer requis
- **Vérification** : `fiche.createdBy === userId`
- **Whitelist** : `ALLOWED_UPDATE_FIELDS` — ~20 champs autorisés
- **Validation statut** : vérifie `VALID_STATUTS`
- **Calcul commission** : si `commissionFixe` ou `commissionExtra` présents → recalcule `commissionTotale`
- **Réponse 200** : fiche mise à jour

### `DELETE /api/solution-express/[id]`
- **Auth** : Bearer requis
- **Vérification** : `fiche.createdBy === userId`
- **Réponse 200** : `{ deleted: true }`

### `GET /api/settings`
- **Auth** : Bearer requis
- **Logique** : `upsert { where: { id: 'global' }, create: DEFAULT_SETTINGS, update: {} }` (retourne l'existant ou crée avec defaults)
- **Réponse 200** : `Settings`

### `PUT /api/settings`
- **Auth** : Bearer requis
- **Body** : champs Settings à mettre à jour
- **Logique** : `prisma.settings.upsert({ where: { id: 'global' }, create, update })`
- **Réponse 200** : `Settings` mis à jour

### `GET /api/essence?annee=X`
- **Auth** : Bearer requis
- **Query param** : `annee` (number, entre 2020 et 2099)
- **Logique** : `ensureYear(annee)` → crée les 12 mois si absents → `findMany({ where: { annee }, orderBy: { mois: 'asc' } })`
- **Réponse 200** : `EssenceMois[]` (toujours 12 éléments)

### `PUT /api/essence/[id]`
- **Auth** : Bearer requis
- **Body** : `{ recu?, note?, montantAttendu?, montantParJour? }`
- **Logique** :
  - Si `recu=true` → `dateReception = new Date()`
  - Si `recu=false` → `dateReception = null`
  - Si `recu=true` ET `mois===11` (décembre) ET tous les 12 mois reçus :
    1. `ensureYear(annee + 1)` — génère l'année suivante
    2. Re-vérification avant suppression (atomicité)
    3. `deleteMany({ where: { annee } })` — supprime l'année révolue
    4. Retourne `nextAnnee: annee + 1`
- **Réponse 200** : `EssenceMois & { nextAnnee?: number }`
- **Erreur P2025** : 404 (mois introuvable)

### `GET /api/essence/annees`
- **Auth** : Bearer requis
- **Logique** : `prisma.essence.findMany({ distinct: ['annee'], select: { annee: true }, orderBy: { annee: 'asc' } })`
- **Réponse 200** : `number[]`

### `DELETE /api/essence/annees/[annee]`
- **Auth** : Bearer requis
- **Protection** : `if (annee === new Date().getFullYear()) → 400`
- **Logique** : `prisma.essence.deleteMany({ where: { annee } })`
- **Réponse 200** : `{ deleted: count }`

### `GET /api/essence/stats`
- **Auth** : Bearer requis
- **Réponse 200** : `{ totalAttendu, totalRecu, totalManquant, pctRecu, moisRecus, moisTotal }`

### `GET /api/database/stats`
- **Auth** : Bearer requis
- **Réponse 200** : `DbStats` (counts + taille DB)

---

## 8. PAGES — DÉTAIL COMPLET

---

### 8.1 LOGIN (`/login`)

**Fichier** : `app/(auth)/login/page.tsx`

**État** : `email`, `password`, `loading`, `error`

**Actions** :
- Soumettre → `AuthContext.login(email, password)` → redirige `/`
- Si déjà connecté au mount → redirige `/` automatiquement

**Sécurité** : validation email regex côté client, types string, longueurs max

---

### 8.2 DASHBOARD (`/`)

**Fichier** : `app/(dashboard)/page.tsx`

**État** :
- `fiches: SolutionExpress[]` — toutes les fiches
- `settings: Settings`
- `loading: boolean`
- `annee: number | 'all'` — filtre année sélectionné

**API** : `GET /api/solution-express`, `GET /api/settings`

**Sections & logique** :

1. **KPI cards** (6) — filtrées sur `annee` :
   - Total leads : `fichesFiltrees.length`
   - Installés : `status === 'installe'`
   - En cours : `status === 'installation_en_cours'`
   - Annulés : `status === 'installation_annulee'`
   - Taux conversion : `(installés / total) × 100`
   - Commissions (hors annulés) : `sum(commissionTotale)`

2. **Graphique statuts** : Bar chart Recharts, une barre par statut

3. **Comparaison mensuelle** : Bar chart par mois (mois 0-11)

4. **Fournisseurs proposés** : `topN(data, 'fournisseurs')` — compte toutes les valeurs `propose` dans `fournisseurs`, trie desc, affiche tout (plus de `slice`)

5. **Types de leads** : `topN(data, 'leadType')` — avec barre de progression `(count / max) × 100`

6. **Villes** : `topN(data, 'ville')` — avec barre

7. **Leads récents** : 6 derniers (par `dateVente` ou `createdAt`)

**Fonction `topN`** (après fix) :
```typescript
// Avant : function topN<T>(arr: T[], key: keyof T, n = 5)
// Après : function topN<T>(arr: T[], key: keyof T)
// Plus de .slice(0, n) — affiche tout
```

---

### 8.3 COMPARAISON (`/comparaison`)

**Fichier** : `app/(dashboard)/comparaison/page.tsx`

**Ce qu'elle fait** : comparaison de performances entre deux années (bar chart côte à côte par mois).

---

### 8.4 COMMISSIONS (`/commissions`)

**Fichier** : `app/(dashboard)/commissions/page.tsx`

**État** :
- `fiches: SolutionExpress[]`
- `settings: Settings`
- `filtreAnnee: number | 'all'`
- `filtreStatut: 'tout' | 'payee' | 'attente'`
- `calMois: number`, `calAnnee: number` — mois/année affiché dans le calendrier
- `selDay: { date: string; ventes: SolutionExpress[] } | null` — popup jour actif

**Interface interne `CalByDate`** :
```typescript
interface CalByDate {
  montant: number;
  payee: number;
  attente: number;
  annulee: number;  // ajouté — compte les fiches annulées par jour
}
```

**Calcul des données calendrier** :
```typescript
// Map { 'YYYY-MM-DD': CalByDate }
fiches.forEach(c => {
  const key = formatDate(c.dateVente ?? c.createdAt);
  if (!map[key]) map[key] = { montant: 0, payee: 0, attente: 0, annulee: 0 };
  if (c.status !== 'installation_annulee') map[key].montant += c.commissionTotale;
  if (c.commissionPayee) map[key].payee += 1;
  else if (c.status !== 'installation_annulee') map[key].attente += 1;
  if (c.status === 'installation_annulee') map[key].annulee += 1;
});
```

**Calendrier** — chaque cellule de jour avec data affiche :
- Montant (hors annulés)
- Dots colorés : vert `#12b76a` (payée), orange `#f79009` (attente), rouge `#be123c` (annulée)

**Légende** :
- ● Payée (`#12b76a`)
- ● En attente (`#f79009`)
- ● Annulée (`#be123c`)
- ◉ Aujourd'hui (bleu)

**Popup détail jour** — pour chaque fiche :
```jsx
const ann = c.status === 'installation_annulee';
const clr = ann ? '#be123c' : c.commissionPayee ? '#12b76a' : '#f79009';
const lbl = ann ? '✕ Annulée' : c.commissionPayee ? '✓ Payée' : '⏳ Attente';
// Si ann && c.motifAnnulation → affiche le motif en rouge sous le nom
```

---

### 8.5 SOLUTION EXPRESS (`/solution-express`)

**Fichier** : `app/(dashboard)/solution-express/page.tsx`

**État** :
- `fiches: SolutionExpress[]`
- `settings: Settings`
- `search: string`
- `filters: FilterState` — objet avec tous les filtres actifs
- `sort: SortOption`
- `annee: number | 'all'`
- `selected: SolutionExpress | null` — fiche ouverte dans UltraFiche
- `editFiche: SolutionExpress | null` — fiche en mode édition dans FicheModal
- `showAdd: boolean` — FicheModal en mode ajout
- `loading: boolean`

**Interface `FilterState`** :
```typescript
interface FilterState {
  status: string;
  typeClient: string;
  leadType: string;
  ville: string;
  typeCommerce: string;
  commission: '' | 'payee' | 'attente' | 'avec' | 'annulee';
  service: string;
  qualificationSysteme: string;
}
```

**Logique de filtrage** (dans l'ordre) :
1. Filtre année sur `dateVente` ou `createdAt`
2. Recherche texte sur nom, prénom, entreprise, téléphone, email, ville, summary
3. Filtre statut
4. Filtre type client
5. Filtre lead type
6. Filtre ville
7. Filtre type commerce
8. Filtre commission :
   - `payee` : `commissionPayee === true`
   - `attente` : `commissionPayee === false && commissionTotale > 0 && status !== 'installation_annulee'`
   - `avec` : `commissionTotale > 0`
   - `annulee` : `status === 'installation_annulee'`
9. Filtre service (présent dans `produits`)
10. Filtre qualification système

**Tri disponible** :
- `recent` : `createdAt desc`
- `ancien` : `createdAt asc`
- `urgence` : `urgencyScore desc`
- `commission` : `commissionTotale desc`
- `alpha` : `entreprise || nom` alphabétique
- `status` : ordre custom (installe → en_cours → proposal → contacted → new → annulee)

---

### 8.6 PIPELINE (`/pipeline`)

**Fichier** : `app/(dashboard)/pipeline/page.tsx`

**Colonnes Kanban** :
| Colonne | Statut | Couleur |
|---------|--------|---------|
| Nouveau | `new` | `#8b8b9e` |
| Contacté | `contacted` | `#3b6cf8` |
| Soumission | `proposal` | `#f59e0b` |
| En cours | `installation_en_cours` | `#f97316` |
| Installé | `installe` | `#12b76a` |

Annulés (`installation_annulee`) : section séparée en bas de page

**Interactions** :
- Déplacer une fiche entre colonnes → `PUT /api/solution-express/[id]` avec `{ status: newStatus }`
- Clic sur fiche → `UltraFiche` en mode `readOnly={true}` (lecture seule, pas d'édition depuis Pipeline)

---

### 8.7 ESSENCE / INDEMNITÉ CARBURANT (`/essence`)

**Fichier** : `app/(dashboard)/essence/page.tsx`

**État** :
- `mois: EssenceMois[]` — 12 mois de l'année sélectionnée
- `annees: number[]` — toutes les années en DB
- `anneeSelectionnee: number`
- `loading: boolean`
- `editMois: EssenceMois | null` — mois en mode édition note

**Calcul du sélecteur d'années** :
```typescript
const curYear = new Date().getFullYear();
// Force l'année courante même si absente en DB
// Exclut les années futures (> curYear)
const anneesFiltre = [...new Set([curYear, ...annees.filter(y => y <= curYear)])].sort((a, b) => b - a);
```

**Bouton suppression d'année** :
- Apparaît uniquement pour les années != année courante
- Appelle `DELETE /api/essence/annees/${yr}`
- Confirmation avant suppression

**Toggle "Reçu"** :
- `PUT /api/essence/${mois.id}` avec `{ recu: !mois.recu }`
- Si la réponse contient `nextAnnee` → recharge avec `nextAnnee` (passage à l'année suivante automatique)

**KPI** :
- Total attendu : `sum(montantAttendu)` de tous les mois
- Total reçu : `sum(montantAttendu)` des mois `recu === true`
- Manquant : total attendu - total reçu
- % reçu : `(reçu / attendu) × 100`
- Mois reçus / total : compteurs

**Export CSV** : télécharge tous les mois de l'année avec colonnes Mois, Jours ouvrés, Montant/jour, Attendu, Reçu, Date réception, Note

---

### 8.8 BASE DE DONNÉES (`/database`)

**Fichier** : `app/(dashboard)/database/page.tsx`

**API** : `GET /api/database/stats`

**Affiche** : stats Prisma (counts) + stats PostgreSQL (taille DB, espace utilisé)

---

### 8.9 PARAMÈTRES (`/parametres`)

**Fichier** : `app/(dashboard)/parametres/page.tsx`

**État** : `settings: Settings`, `loading: boolean`, `saving: boolean`

**API** : `GET /api/settings`, `PUT /api/settings`

**26 icônes disponibles pour les services** :
```
shield    wifi       smartphone  tv         camera    receipt
phone     monitor    printer     creditcard zap        globe
headphones lock      home        car        music      server
cloud     wrench     bell        key        package    laptop
tablet    video
```

**Logique icône déjà utilisée** :
```typescript
// Calcule les icônes utilisées par les autres services (hors service en cours d'édition)
const usedIcons = settings.services
  .filter(s => s.id !== currentService.id)
  .map(s => s.icon);
// Les icônes utilisées affichent un dot coloré et une bordure de la couleur du service
// Mais restent CLIQUABLES (pas de blocage)
```

**Objectif annuel** : `Record<string, number>` — ex: `{ '2025': 2222, '2026': 5000 }`

---

### 8.10 SIDEBAR

**Fichier** : `components/Sidebar.tsx`

**Desktop** : sidebar fixe gauche, 70px → 240px au hover  
**Mobile** : top header (56px) + bottom navigation bar

**Navigation** :
| Label | Route | Icône Lucide | Couleur accent |
|-------|-------|-------------|----------------|
| Dashboard | `/` | LayoutDashboard | `#38bdf8` |
| Comparaison | `/comparaison` | BarChart2 | `#34d399` |
| Commissions | `/commissions` | Wallet | `#10b981` |
| Solution Express | `/solution-express` | Users | `#818cf8` |
| Pipeline | `/pipeline` | Kanban | `#c084fc` |
| Indemnité Carburant | `/essence` | Fuel | `#fb923c` |
| Base de données | `/database` | Database | `#f472b6` |
| Paramètres | `/parametres` | Settings | `#a78bfa` |

**Avatar** :
```typescript
function Avatar({ size = 33 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '2px solid rgba(18,183,106,0.4)',
      boxShadow: '0 0 10px rgba(18,183,106,0.25)',
      background: 'linear-gradient(135deg,rgba(18,183,106,0.18),rgba(59,108,248,0.12))',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <UserCircle2 size={Math.round(size * 0.72)} color="#12b76a" strokeWidth={1.5}/>
    </div>
  );
}
```

**Panel profil** (clic sur avatar) :
- Nom + rôle
- Ancienneté calculée depuis le 15 juin 2025 (`X ans Y mois Z jours`)
- Commissions payées de l'année courante
- Commissions en attente de l'année courante
- Bouton déconnexion → `logout()`

**Modal anniversaire** : 15 juin de chaque année à partir de 2026, une seule fois par an (localStorage key `sf_anniv_YYYY`)

**Données chargées** : `GET /api/solution-express` → `Array.isArray(res.data) ? res.data : []`

---

## 9. COMPOSANTS — DÉTAIL

### `FicheCard`
**Props** : `{ fiche: SolutionExpress, settings: Settings, onEdit, onDelete, onClick }`

**Effets visuels** :
- Tilt 3D au hover (perspective CSS + `onMouseMove`)
- Aurora effect (gradient radial qui suit la souris)

**Affiche** : avatar initiales, statut coloré, type lead chip, services avec icônes, fournisseurs actuel→proposé (flèche), qualification, résumé (2 lignes), dernière note, contact (tel/email/ville), date vente, badge commission

**ICON_MAP** dans FicheCard :
```typescript
const ICON_MAP: Record<string, React.ComponentType<{size?:number;color?:string}>> = {
  wifi, smartphone, tv, camera, receipt, shield,
  phone, monitor, printer, creditcard, zap, globe,
  headphones, lock, home, car, music, server, cloud,
  wrench, bell, key, package, laptop, tablet, video
};
function SvcIcon({ icon, size=13, color }) {
  const Ic = ICON_MAP[icon] ?? Shield;
  return <Ic size={size} color={color} />;
}
```

### `UltraFiche`
**Props** : `{ fiche: SolutionExpress, settings: Settings, onClose, onEdit, onDelete, onStatusChange, onTogglePaiement, readOnly?: boolean }`

**Sections** :
- Header : nom, entreprise, statut, score urgence
- Pipeline visuel : étapes colorées avec indicateur actif
- Informations client complètes
- Services + fournisseurs avec icônes
- Commission + toggle paiement (si `!readOnly`)
- Notes avec ajout inline (si `!readOnly`)
- Actions : Réactiver (annulée uniquement, si `!readOnly`), Modifier, Supprimer

**Même ICON_MAP** que FicheCard.

### `FicheModal`
**Props** : `{ open, onClose, onSave, fiche?: SolutionExpress, settings: Settings, mode: 'add' | 'edit' }`

**Formulaire sections** :
1. Source lead (texte + URL)
2. Infos client (prénom, nom, entreprise, type, sexe, contact, adresse)
3. Qualifications (type lead, qualification système, type commerce)
4. Services sélectionnés + fournisseurs par service
5. Commission (fixe, extra, totale calculée auto)
6. Score d'urgence (slider 0-10)
7. Résumé
8. Notes
9. Statut + motif annulation (si annulée)
10. Date de vente

**Date de vente** : stockée à midi local `${date}T12:00:00` pour éviter décalage UTC

### `MiniScoreRing`
**Props** : `{ score: number }` (0-10)

SVG animé. Arc coloré selon le score :
- 0-3 : vert `#12b76a`
- 4-6 : orange `#f79009`
- 7-10 : rouge `#ef4444`

### `CommissionBadge`
**Props** : `{ fiche: SolutionExpress, onToggle: (id, payee) => void }`

Badge affichant le montant de la commission. Clic → toggle `commissionPayee`.
- Vert si payée, orange si non payée.

### `AnimatedNumber`
**Props** : `{ value: number, prefix?: string, suffix?: string, decimals?: number }`

Anime de 0 à `value` au mount ou quand `value` change. Utilisé sur tous les KPI cards.

---

## 10. `lib/essence-helpers.ts`

```typescript
export async function ensureYear(annee: number): Promise<void> {
  for (let mois = 0; mois < 12; mois++) {
    await prisma.essence.upsert({
      where: { annee_mois: { annee, mois } },
      create: {
        annee, mois,
        joursOuvres: 22,            // valeur par défaut
        montantParJour: 5,          // 5 CAD par défaut
        montantAttendu: 22 * 5,     // = 110
        recu: false,
        note: '',
      },
      update: {},                   // Ne modifie pas si déjà existant
    });
  }
}
```

---

## 11. ANIMATIONS CSS — `globals.css`

| Nom animation | Usage |
|---------------|-------|
| `spin` | Spinner de chargement (icône rotative) |
| `fadeSlideUp` | Entrée des cards (translateY 20px→0, opacity 0→1) |
| `commPulse` | Pulsation sur badges commission (scale 1→1.05→1) |
| `twinkle-star` | Étoiles dans le background cosmos |
| `particle-rise` | Particules qui montent dans le background cosmos |

---

## 12. RÈGLES IMPORTANTES (LOGIQUE CRITIQUE)

### Dates
- **Toujours** utiliser les méthodes locales : `getFullYear()`, `getMonth()`, `getDate()`
- **Jamais** `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
- `dateVente` stockée à `T12:00:00` (midi local) pour éviter le problème "date -1 jour" en UTC

### Sécurité des tableaux
- Toujours `Array.isArray(res.data) ? res.data : []` avant d'assigner un tableau depuis l'API
- Ne jamais `res.data || []` (un objet `{}` est truthy)

### Prisma singleton
- `lib/prisma.ts` exporte un seul client Prisma (pattern singleton avec `global.__prisma`)
- Évite les connexions multiples en développement (hot-reload Next.js)

### Commission totale
- Toujours calculée côté serveur : `commissionTotale = commissionFixe + commissionExtra`
- Le client envoie `commissionFixe` et `commissionExtra`, le serveur recalcule

### Essence — décembre
- Quand décembre est marqué "reçu" ET tous les 12 mois de l'année sont "reçus" :
  1. Génère l'année suivante (`ensureYear(annee + 1)`)
  2. Re-vérifie les 12 mois (atomicité)
  3. Supprime l'ancienne année

### Sidebar — données commissions
- Données chargées via `GET /api/solution-express`
- Guard `Array.isArray()` sur toutes les assignations

---

## 13. DÉPLOIEMENT

### Développement local
```bash
npm run dev      # Lance sur http://localhost:3000
npm run build    # Build de production
npm run start    # Lance le build prod en local
```

### Migrations Prisma
```bash
npx prisma migrate dev       # Crée et applique une migration (dev)
npx prisma migrate deploy    # Applique les migrations en prod
npx prisma generate          # Régénère le client TS après changement schema
npx prisma studio            # Interface GUI pour voir/modifier les données
```

### Production — Vercel
1. Push sur GitHub
2. Vercel détecte automatiquement Next.js
3. Variables d'environnement à ajouter dans Vercel Dashboard :
   - `JWT_SECRET`
   - `DATABASE_URL` (avec `?pgbouncer=true` et `?connection_limit=1`)
   - `DIRECT_URL` (URL directe sans pgbouncer)

---

## 14. IDENTIFIANTS

| Élément | Valeur |
|---------|--------|
| Email compte | solutionsexpress.tn@gmail.com |
| URL dev | http://localhost:3000 |
| Date création compte | 15 juin 2025 |

---

## 15. HISTORIQUE — v1 MERN → v2 Next.js

| Élément | v1 MERN | v2 Next.js |
|---------|---------|-----------|
| Frontend | React + Vite (Vercel) | Next.js 14 App Router (Vercel) |
| Backend | Express.js (Render) | API Routes Next.js (intégré) |
| Base de données | MongoDB Atlas | PostgreSQL (Supabase) |
| ORM/ODM | Mongoose | Prisma |
| Auth | JWT custom | JWT (`jsonwebtoken` + `jose`) |
| Hébergeurs | Vercel + Render + MongoDB | Vercel + Supabase (2 services) |

---

## 16. MODIFICATIONS APPORTÉES EN JUIN 2026

| Modification | Fichier(s) |
|-------------|-----------|
| Indicateur "Annulée" rouge dans le calendrier commissions (légende, dots, popup) | `commissions/page.tsx` |
| Filtre "Annulée" dans Solution Express (commission filter) | `solution-express/page.tsx` |
| Fix dropdown année Essence (toujours inclure l'année courante) | `essence/page.tsx` |
| Bouton suppression d'année Essence | `essence/page.tsx` |
| Route DELETE année Essence | `api/essence/annees/[annee]/route.ts` (nouveau fichier) |
| 26 icônes dans le picker services des Paramètres | `parametres/page.tsx` |
| Icônes déjà utilisées : indicateur visuel mais cliquables | `parametres/page.tsx` |
| ICON_MAP dans FicheCard + 26 icônes | `components/solution-express/FicheCard.tsx` |
| ICON_MAP dans UltraFiche + 26 icônes | `components/solution-express/UltraFiche.tsx` |
| Dashboard : suppression des limites "Top N" | `app/(dashboard)/page.tsx` |
| Sidebar : fix Array.isArray + avatar inline UserCircle2 | `components/Sidebar.tsx` |
| AuthContext : AbortController + mounted + timeout 8s | `context/AuthContext.tsx` |
| Login : try/catch JSON séparé | `api/auth/login/route.ts` |
| Essence PUT : re-vérification atomique avant deleteMany | `api/essence/[id]/route.ts` |

---

*Rapport complet — SecureFlow CRM v2 — 10 juin 2026*

---

## Mise à jour — 11 juin 2026

### Contexte
Le projet est maintenant universel : peu importe le produit vendu ou la compagnie, le CRM s'adapte. "Solution Express" était trop spécifique à un seul produit — renommé "Leads" pour être générique.

---

### Modifications apportées

#### 1. Renommage Solution Express → Leads
- Page URL : `/solution-express` → `/leads`
- API routes : `/api/solution-express` et `/api/solution-express/[id]` → `/api/leads` et `/api/leads/[id]`
- Tous les textes "Solution Express" remplacés par "Leads" dans : `Sidebar.tsx`, `commissions/page.tsx`, `page.tsx` (dashboard), `database/page.tsx`, `layout.tsx`
- Fichiers supprimés : `app/(dashboard)/solution-express/page.tsx`, `app/api/solution-express/`

#### 2. Onglet Profil dans Paramètres
- Nouveau premier onglet "Profil" avec icône `UserCircle2`
- Champs : Prénom/Nom, Rôle, Email, Date de début, Nouveau mot de passe (optionnel)
- 30 avatars emoji sélectionnables avec bonne visibilité
- Sauvegarde via `PUT /api/profile` (nouveau fichier `app/api/profile/route.ts`)
- Pas de vérification "mot de passe actuel" (CRM personnel mono-utilisateur)
- Après sauvegarde : `refreshUser()` pour mettre à jour la sidebar en temps réel

#### 3. Schéma Prisma — champ dateDebut
- Ajout `dateDebut DateTime?` dans le modèle `User`
- Sélection du champ dans `lib/auth.ts` (`getCurrentUser`)
- Ajout `dateDebut?: string | null` dans `types/index.ts`
- Fix timezone : stockage à midi (`T12:00:00`) pour éviter le décalage UTC/Tunisie

#### 4. Sidebar dynamique
- Suppression de la constante `DEBUT` codée en dur
- `anciennete()` accepte maintenant un paramètre `Date` dynamique
- Affichage basé sur `user.dateDebut` (fallback sur `user.createdAt`)
- Locale date : `fr-CA` → `fr-FR`
- Modal anniversaire : toujours "ans" (sans condition sur pluriel), texte universel

#### 5. AuthContext — refreshUser
- Ajout de `refreshUser()` dans l'interface et l'implémentation
- Permet de re-fetch l'utilisateur depuis `/api/auth/me` sans déconnexion
- Exposé dans le Provider pour usage depuis n'importe quelle page

#### 6. Qualification système — affichage conditionnel
- `FicheCard.tsx` : masqué si valeur `inconnu` ou `pas_de_systeme`
- `UltraFiche.tsx` : même condition appliquée
- Logique : affiché seulement si l'utilisateur a activement sélectionné une valeur

#### 7. Page Login
- Sous-titre : `Leads · Commissions · Carburant · Pipeline`
- Badges : `['Leads', 'Commissions', 'Pipeline']` (suppression du ×6 répété)
- Placeholder email : `ton@email.com`

#### 8. Dashboard — améliorations
| Amélioration | Détail |
|---|---|
| Dates fr-CA → fr-FR | Format français partout (header, commissions, leads récents) |
| Bouton "+ Nouveau lead" | Dans le header, à côté des filtres année/mois |
| Graphique mensuel | Barres bleues (leads) + vertes (installés) par mois — visible si année sélectionnée |
| Lien "Voir tout →" Commissions | Navigue vers `/commissions` |
| Lien "Voir tous →" Leads récents | Navigue vers `/leads` |
| Filtre "❌ Annulée" commissions | Nouveau filtre dans l'historique commissions |
| Fix filtre "⏳ Attente" | N'affiche plus les annulées (filtre corrigé) |
| Services à 0 cachés | Cercles et bar chart du header masqués si count = 0 |

#### 9. Pipeline — services à 0 cachés
- Même logique que le Dashboard : `activeServices` = services avec count > 0
- Les cercles de services dans le header du Pipeline ne montrent que les services utilisés

---

### Fichiers modifiés (session du 11 juin 2026)
| Fichier | Modification |
|---|---|
| `prisma/schema.prisma` | Ajout `dateDebut DateTime?` sur User |
| `lib/auth.ts` | Ajout `dateDebut` dans select |
| `types/index.ts` | Ajout `dateDebut?: string \| null` sur User |
| `context/AuthContext.tsx` | Ajout `refreshUser()` |
| `app/api/profile/route.ts` | NOUVEAU — PUT profil utilisateur |
| `app/api/leads/route.ts` | NOUVEAU (renommé depuis solution-express) |
| `app/api/leads/[id]/route.ts` | NOUVEAU (renommé depuis solution-express) |
| `app/(dashboard)/leads/page.tsx` | NOUVEAU (renommé depuis solution-express) |
| `app/(dashboard)/parametres/page.tsx` | Onglet Profil complet |
| `components/Sidebar.tsx` | dateDebut dynamique, anniversaire, avatar emoji |
| `components/solution-express/FicheCard.tsx` | Qualification conditionnelle |
| `components/solution-express/UltraFiche.tsx` | Qualification conditionnelle |
| `app/(auth)/login/page.tsx` | Badges et placeholder mis à jour |
| `app/(dashboard)/page.tsx` | Graphique mensuel, filtres, services, dates |
| `app/(dashboard)/pipeline/page.tsx` | Services à 0 cachés |
| `app/layout.tsx` | Texte "Solution Express" → "Leads" |
| `app/(dashboard)/commissions/page.tsx` | Texte mis à jour |
| `app/(dashboard)/database/page.tsx` | Texte mis à jour |

---

*Mise à jour — SecureFlow CRM v2 — 11 juin 2026*
