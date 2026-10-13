# SecureFlow CRM — Rapport simple et complet

> Projet personnel de Mohamed Tlili, agent commercial **Solution Express** (Québec).
> Ce document explique tout le projet **simplement**, page par page.

---

## Sommaire

1. [C'est quoi SecureFlow ?](#1-cest-quoi-secureflow-)
2. [Technologies utilisées](#2-technologies-utilisées)
3. [Organisation des dossiers](#3-organisation-des-dossiers)
4. [Comment ça marche (le chemin d'une action)](#4-comment-ça-marche)
5. [Base de données (4 tables)](#5-base-de-données)
6. [Connexion et sécurité](#6-connexion-et-sécurité)
7. [Les pages, une par une](#7-les-pages-une-par-une)
8. [Les API (le serveur)](#8-les-api-le-serveur)
9. [Les composants](#9-les-composants)
10. [Les fichiers utilitaires (lib)](#10-les-fichiers-utilitaires-lib)
11. [Règles importantes du métier](#11-règles-importantes-du-métier)
12. [Lancer le projet](#12-lancer-le-projet)

---

## 1. C'est quoi SecureFlow ?

Une application web pour **gérer mes clients potentiels (leads)** et **mes commissions**.

Je vends des services (Alarme, Internet, Mobile, etc.). Pour chaque client je crée une **fiche**. L'app me permet de :

- créer / modifier / supprimer des fiches clients ;
- suivre où en est chaque client (nouveau → contacté → soumission → installation → installé ou annulé) ;
- voir combien de **commission** j'ai gagnée, payée, ou en attente ;
- comparer deux années ;
- suivre mon **indemnité carburant** mois par mois ;
- exporter toute ma base (JSON, Excel, PDF) ;
- tout configurer (villes, services, objectifs…) dans **Paramètres**.

L'app est **pour une seule personne** : chaque fiche est liée à l'utilisateur qui l'a créée (`createdBy`). Il n'y a pas d'inscription : le compte est créé à la main dans la base.

---

## 2. Technologies utilisées

| Outil | À quoi ça sert (simple) |
|---|---|
| **Next.js 14** | Le framework : les pages ET le serveur dans le même projet |
| **React 18 + TypeScript** | Construire les écrans, avec vérification des types |
| **PostgreSQL** (hébergé sur Supabase) | La base de données où tout est stocké |
| **Prisma** | Parler à la base de données facilement |
| **jose** | Créer et vérifier le « badge » de connexion (JWT) |
| **bcryptjs** | Cacher les mots de passe (hash) |
| **Axios** | Envoyer des requêtes de l'écran vers le serveur |
| **Recharts** | Les graphiques |
| **Lucide React** | Les icônes |
| **react-hot-toast** | Les petits messages (« Sauvegardé ! ») |
| **date-fns** | Gérer les dates |
| **exceljs** | Fabriquer le fichier Excel |
| **@react-pdf/renderer** | Fabriquer le PDF |
| **Tailwind CSS** | Un peu de style (le reste est du style direct dans les fichiers) |

---

## 3. Organisation des dossiers

```
Secureflow/
├── app/
│   ├── (auth)/login/page.tsx        → page de connexion
│   ├── (dashboard)/                 → toutes les pages après connexion
│   │   ├── layout.tsx               → cadre commun (menu à gauche + protection)
│   │   ├── page.tsx                 → Dashboard
│   │   ├── leads/page.tsx           → Leads
│   │   ├── pipeline/page.tsx        → Pipeline
│   │   ├── commissions/page.tsx     → Commissions
│   │   ├── comparaison/page.tsx     → Comparaison
│   │   ├── essence/page.tsx         → Indemnité carburant
│   │   ├── database/page.tsx        → Base de données
│   │   └── parametres/page.tsx      → Paramètres
│   ├── api/                         → le serveur (voir section 8)
│   ├── layout.tsx / globals.css     → base de toute l'app
├── components/                      → morceaux d'écran réutilisables
├── context/AuthContext.tsx          → « qui est connecté ? »
├── hooks/useIsMobile.ts             → détecte si on est sur téléphone
├── lib/                             → petites fonctions utilitaires
├── prisma/schema.prisma             → la structure de la base de données
├── scripts/apply-gin-index.ts       → script à lancer une fois (index de vitesse)
├── types/index.ts                   → les types + les réglages par défaut
└── middleware.ts                    → le gardien des API
```

---

## 4. Comment ça marche

Exemple : je change le statut d'une fiche dans **Leads**.

1. L'écran appelle `api.put('/api/leads/ID', { status: 'installe' })` (Axios).
2. `lib/api.ts` ajoute automatiquement mon **token** (badge) dans la requête.
3. `middleware.ts` (le gardien) vérifie le token. Pas de token ou faux token → refusé (401).
4. La route `app/api/leads/[id]/route.ts` vérifie que **la fiche m'appartient**, nettoie les champs, recalcule la commission.
5. Prisma enregistre dans PostgreSQL.
6. L'écran se met à jour.

Les pages font toutes pareil : elles chargent les **réglages** (`/api/settings`) + leurs **données** (`/api/.../stats`), puis affichent.

---

## 5. Base de données

Fichier : `prisma/schema.prisma`. **4 tables** :

### `User` — l'utilisateur
`name`, `email` (unique), `password` (hashé), `role`, `avatar` (un emoji), `dateDebut` (date de début d'activité, sert à « Actif depuis » et à l'anniversaire).

### `SolutionExpress` — la fiche client (la table principale)
| Groupe | Champs |
|---|---|
| Identité | `prenom`, `nom`, `telephone`, `email`, `sexe` |
| Entreprise | `entreprise`, `typeCommerce`, `typeClient` (b2b ou b2c), `adresse`, `ancienneAdresse`, `ville` |
| Origine | `leadType`, `sourceText`, `sourceUrl` |
| Produits | `produits` (liste), `fournisseurs` (actuel/proposé par service), `qualificationSysteme` (système actuel du client) |
| Suivi | `status`, `urgencyScore` (0 à 10), `summary` (résumé), `notes` (liste), `motifAnnulation` |
| Partage | `partageAvec` (liste de noms d'agents) |
| Appels de service | `appelsService` (liste : description + payé oui/non) |
| Argent | `montantContrat`, `commissionFixe`, `commissionExtra`, `commissionTotale` (= fixe + extra), `commissionPayee` |
| Dates | `dateVente` (**obligatoire**), `datePaiementCommission`, `createdAt`, `updatedAt` |
| Lien | `createdBy` → l'utilisateur propriétaire |

Des **index** existent pour que les recherches restent rapides (statut, ville, dateVente, etc.).

### `Settings` — les réglages (une seule ligne, id = `global`)
`villes`, `typeCommerce`, `typeLead`, `qualificationSysteme`, `services`, `motifsAnnulation`, `agents`, `objectifAnnuel`, `commissionFixeDefaut`, `commissionExtraDefaut`, `produitsAvecQualification`.
Tout ça se modifie dans la page **Paramètres**. Si la ligne n'existe pas encore, l'app utilise `DEFAULT_SETTINGS` (dans `types/index.ts`).

### `Essence` — le carburant
Une ligne par mois : `annee`, `mois`, `joursOuvres`, `montantParJour`, `montantAttendu`, `recu` (oui/non), `dateReception`, `note`. Un seul enregistrement par (année, mois).

---

## 6. Connexion et sécurité

- **Login** : email + mot de passe → le serveur compare avec bcrypt → il renvoie un **token JWT** valable **7 jours**.
- Le token est gardé dans le navigateur (`localStorage`, clé `sf_token`).
- `lib/api.ts` l'ajoute à chaque requête. Si le serveur répond 401, le token est supprimé.
- **`middleware.ts`** protège toutes les routes `/api/...` (sauf login et register). Il lit le token et met l'id de l'utilisateur dans l'en-tête `x-user-id`.
- **`getCurrentUser()`** (`lib/auth.ts`) lit cet id et retrouve l'utilisateur.
- **Chaque requête filtre par `createdBy = mon id`** → je ne vois que mes propres fiches. Modifier ou supprimer la fiche d'un autre → erreur 403.
- Les pages sont protégées dans le **layout** : si pas connecté → redirection vers `/login`.
- Seuls certains champs d'une fiche sont acceptés par l'API (liste blanche `ALLOWED_LEAD_FIELDS`) → impossible d'écraser `createdBy` par exemple.
- Variable obligatoire : `JWT_SECRET` (sinon l'app refuse de démarrer).

---

## 7. Les pages, une par une

Le **menu à gauche** (Sidebar) donne accès aux 8 pages. Presque toutes ont un filtre **année** (et parfois **mois**).

### 7.1 Connexion — `/login`
- Écran avec fond animé, champ email + mot de passe, bouton « Accéder ».
- Si c'est bon : token sauvegardé, redirection vers le Dashboard.
- Erreur : message rouge (« Email ou mot de passe incorrect »).

### 7.2 Dashboard — `/`
**But : la vue d'ensemble.**
- Filtre **année** et **mois**.
- **Carte Total leads** + anneaux de score (Total, Installé, En cours, Annulé, Payé).
- **6 cartes de statut** : Nouveau, Contacté, Soumissions, Installation en cours, Installés, Annulées (cliquer ouvre les Leads filtrés).
- **Graphique d'évolution** dans le temps (par mois ou par jour).
- **Villes** et **types de lead** les plus fréquents.
- **Commerces** B2B et B2C (répartition).
- **Leads récents**.
- Bouton « Réessayer » si le chargement échoue.
- Données : `GET /api/dashboard/stats`.

### 7.3 Leads — `/leads`
**But : la liste de travail principale. C'est là qu'on crée et gère les fiches.**
- 4 compteurs en haut : Total, En cours, Installés, Annulés.
- **Recherche** (entreprise, nom, téléphone, email, ville, résumé).
- **Filtres groupés** : statut, B2B/B2C, type de lead, ville, type de commerce, système actuel, **paiement** (commission payée / en attente / avec commission / annulée, appel de service payé / non payé / avec / sans), **partage** (partagés / non partagés / partagé avec quelqu'un), **service** (Alarme, Internet…).
- **Tri** : plus récent, plus ancien, urgence, commission, entreprise, statut.
- Les fiches sont **regroupées par année / mois**, et chargées par pages de 30 (« charger plus »).
- Sur chaque fiche on peut : **changer le statut** (si « Annulé » → on demande le **motif**), **cocher commission payée**, ajouter / supprimer des **notes**, gérer les **appels de service**, **modifier**, **supprimer** (avec confirmation).
- Le bouton « + » ouvre la fiche vide (**FicheModal**) avec les commissions par défaut des Paramètres déjà remplies.
- Données : `GET/POST /api/leads`, `PUT/DELETE /api/leads/[id]`, `GET /api/leads/stats`.

### 7.4 Pipeline — `/pipeline`
**But : voir les clients par étape (comme un tableau Kanban).**
- 6 colonnes : Nouveau, Contacté, Soumission, Installation en cours, Installé, Annulée.
- Chaque colonne montre ses fiches ; on peut **changer l'étape** d'une fiche.
- Passer en « Annulée » ouvre une fenêtre pour choisir le **motif**.
- Filtres : année, mois, commission (payée / non payée / annulée).
- Affiche aussi : total, B2B/B2C, taux de **conversion** (installés ÷ total), répartition par service.
- Données : `GET /api/pipeline/stats` + `GET /api/leads`.

### 7.5 Commissions — `/commissions`
**But : l'argent.**
- Cartes : **Total gagné**, **Payé**, **En attente**, **Annulé**, plus la commission **maximum** et **minimum**.
- **Objectif annuel** (défini dans Paramètres) avec pourcentage atteint.
- **Graphique** : par année (si « Toutes les années »), sinon par vente. Couleurs : bleu = payée, orange = en attente, rouge = annulée.
- **Filtre** : tout / payée / non payée / annulée.
- **Historique** paginé des commissions avec détail Fixe / Extra, bouton pour marquer **payée**, et un **résumé** de la fiche.
- Données : `GET /api/commissions/stats`.

### 7.6 Comparaison — `/comparaison`
**But : comparer deux années.**
- On choisit l'année A et l'année B (flèches pour naviguer).
- Lignes comparées : commissions gagnées, payées, en attente, installations réalisées, annulées, plus la commission max/min et le **taux de paiement**.
- **Meilleur mois** de chaque année.
- **Score global** : % de progression (ex : +25 %). Si l'année précédente est à 0 → 100 %.
- « Première année de référence » s'il n'y a pas d'année avant.
- Données : `GET /api/comparaison/stats`.

### 7.7 Indemnité Carburant — `/essence`
**But : suivre le remboursement d'essence reçu chaque mois.**
- Un tableau avec les **12 mois** de l'année choisie.
- Pour chaque mois : montant attendu (modifiable), case **« Reçu »** (met la date de réception), et une **note** (fenêtre de texte).
- Totaux : **En attente**, **Total reçu**, **Total de l'année**.
- Bouton pour **préparer l'année suivante** (crée les 12 mois vides).
- Pour l'année en cours, les mois jusqu'à aujourd'hui sont créés automatiquement.
- Données : `GET /api/essence`, `PUT /api/essence/[id]`, `POST /api/essence/prepare-next`.

### 7.8 Base de données — `/database`
**But : tout voir en tableau + exporter + sauvegarder.**
- Carte **Stockage PostgreSQL** (espace utilisé / limite, 500 Mo par défaut) et compteurs (leads, utilisateurs).
- Gros **tableau** de tous les leads avec **filtres par colonne** (prénom, nom, email, téléphone, entreprise, ville, statut) + filtres **partage** et **appel de service**.
- Boutons :
  - **Sauvegarde** → télécharge un fichier **JSON** complet ;
  - **Excel** → fichier Excel mis en forme (`lib/exportExcel.ts`) ;
  - **Télécharger PDF** / **Voir PDF** → document PDF (`components/LeadsPDF.tsx`).
- Pour chaque ligne : **voir la fiche** (ouvre UltraFiche) ou **supprimer**.
- Données : `GET /api/leads` (jusqu'à 5000), `GET /api/database/stats`.

### 7.9 Paramètres — `/parametres`
**But : configurer toute l'app.** 10 onglets :

| Onglet | Ce qu'on y fait | Utilisé où |
|---|---|---|
| **Profil** | Nom, rôle, email, date de début, avatar (emoji), nouveau mot de passe (6 caractères minimum) | Menu à gauche, anniversaire |
| **Villes** | Liste des villes | Choix de ville dans les fiches + filtres |
| **Commerce** | Types de commerce | Fiches, Pipeline, Dashboard |
| **Lead** | Types de lead (référence, appel à froid…) | Fiches, filtres, Dashboard |
| **Qualification** | Systèmes actuels du client (ADT, Bell…) | Fiches, filtres |
| **Services** | Les services vendus : nom, couleur, **icône**, fournisseurs « actuel » et « proposé » | Fiches, Pipeline, filtres |
| **Objectif annuel** | Un objectif en TND par année | Page Commissions |
| **Motifs d'annulation** | Raisons possibles d'une annulation | Annulation d'une fiche |
| **Partage Avec** | Liste des agents (nom + homme/femme) | Vente partagée, filtres |
| **Commission défaut** | Commission fixe et extra pré-remplies pour toute nouvelle fiche | Création de fiche |

- Un bouton **Sauvegarder** envoie tout à `PUT /api/settings`. Les réglages sont gardés en mémoire 5 minutes (`settings-cache`) puis le cache est vidé après sauvegarde.
- Le profil se sauvegarde à part avec `PUT /api/profile`.

> Vérifié : **tous les réglages sont bien utilisés** par au moins une page.

---

## 8. Les API (le serveur)

Toutes demandent un token, sauf login.

| Route | Méthode | Ce qu'elle fait |
|---|---|---|
| `/api/auth/login` | POST | Vérifie email + mot de passe, renvoie le token |
| `/api/auth/me` | GET | Renvoie l'utilisateur connecté |
| `/api/leads` | GET | Liste filtrée / triée / paginée (max 5000) |
| `/api/leads` | POST | Crée une fiche (date de vente obligatoire) |
| `/api/leads/[id]` | PUT | Modifie une fiche, recalcule la commission totale |
| `/api/leads/[id]` | DELETE | Supprime une fiche |
| `/api/leads/stats` | GET | Totaux pour les compteurs des Leads |
| `/api/dashboard/stats` | GET | Tout le Dashboard |
| `/api/pipeline/stats` | GET | Compteurs par étape, B2B/B2C, conversion, services |
| `/api/commissions/stats` | GET | Gagné/payé/attente/annulé, graphique, historique |
| `/api/comparaison/stats` | GET | Comparaison de deux années |
| `/api/essence` | GET | Les 12 mois d'une année (crée ceux qui manquent) |
| `/api/essence/[id]` | PUT | Modifie montant, « reçu », note |
| `/api/essence/prepare-next` | POST | Crée l'année suivante |
| `/api/settings` | GET / PUT | Lire / sauvegarder les réglages |
| `/api/profile` | PUT | Modifier mon profil / mot de passe |
| `/api/profile/stats` | GET | Total payé et en attente de l'année (menu à gauche) |
| `/api/database/stats` | GET | Nb d'utilisateurs + taille de la base |

---

## 9. Les composants

### Général (`components/`)
| Fichier | Rôle |
|---|---|
| `Sidebar.tsx` | Menu à gauche : 8 pages, profil (panneau avec « Actif depuis », payé, en attente), déconnexion, fenêtre **anniversaire** |
| `CosmosBackground.tsx` | Fond animé (étoiles) de la page login |
| `AnimatedNumber.tsx` | Nombre qui « compte » jusqu'à sa valeur |
| `LogoIcon.tsx` | Le logo |
| `SexeIcon.tsx` | Icône homme / femme |
| `LeadsPDF.tsx` | Construit le PDF de la page Base de données |

### Dashboard (`components/dashboard/`)
`TotalLeadsCard`, `StatusCards`, `EvolutionChart`, `CitiesAndLeadTypes`, `CommerceSection`, `RecentLeads`, `ScoreRing`, `ProgressBar` — chacun est un bloc visuel du Dashboard.

### Fiches (`components/solution-express/`)
| Fichier | Rôle |
|---|---|
| `FicheCard.tsx` | La carte d'une fiche dans la liste Leads |
| `FicheModal.tsx` | Le formulaire de création / modification d'une fiche |
| `UltraFiche.tsx` | La fiche complète en lecture (avec la ligne d'avancement) |
| `CommissionBadge.tsx` | Pastille de commission (payée / en attente / annulée) |
| `MiniScoreRing.tsx` | Petit anneau du score d'urgence |
| `DatePicker.tsx` | Le choix de date |

### Autres
- `context/AuthContext.tsx` : garde l'utilisateur connecté (`login`, `logout`, `refreshUser`).
- `hooks/useIsMobile.ts` : dit si l'écran est petit.

---

## 10. Les fichiers utilitaires (lib)

| Fichier | Rôle |
|---|---|
| `api.ts` | Axios + ajout du token + message d'erreur |
| `auth.ts` | Créer le token (7 jours), retrouver l'utilisateur connecté |
| `prisma.ts` | Connexion unique à la base |
| `commission.ts` | `commissionTotale = fixe + extra` |
| `partage.ts` | Règle de la **vente partagée** (voir section 11) |
| `leads-config.ts` | Champs autorisés d'une fiche + nettoyage des appels de service |
| `settings-cache.ts` | Garde les réglages 5 min en mémoire |
| `exportExcel.ts` | Génère le fichier Excel |

---

## 11. Règles importantes du métier

- **Statuts** : Nouveau → Contacté → Soumission → Installation en cours → Installé, ou Annulé.
- **Commission totale** = commission fixe + commission extra (recalculée par le serveur).
- **Une commission annulée** n'est pas comptée dans « gagné ».
- **Date de vente obligatoire** à la création d'une fiche. Les stats par année utilisent la `dateVente` (à défaut, la date de création pour Leads/Pipeline/Database).
- **Vente partagée** : si une fiche est partagée avec un agent (`partageAvec` non vide), elle compte **0,5** au lieu de **1** dans tous les compteurs (total, installés, annulés…). Les montants de commission restent entiers.
- **Appels de service** : petites lignes (description + payé oui/non) sur la fiche, pour suivre les interventions après la vente.
- **Qualification** : le champ « système actuel » n'apparaît que si un des services choisis fait partie de `produitsAvecQualification` (ex : alarme).
- **Taux de conversion** = installés ÷ total.
- **Monnaie** : TND.

---

## 12. Lancer le projet

Variables d'environnement nécessaires (`.env`) :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion à PostgreSQL |
| `DIRECT_URL` | Connexion directe (pour Prisma) |
| `JWT_SECRET` | Clé secrète des tokens (**obligatoire**) |
| `STORAGE_LIMIT_MB` | Limite affichée du stockage (500 par défaut) |

Commandes :

```
npm install          # installer
npm run dev          # lancer en développement
npm run build        # construire (fait prisma generate puis next build)
npm start            # lancer en production
```

Script à lancer **une seule fois** pour accélérer les filtres par service :
`npx tsx scripts/apply-gin-index.ts`
