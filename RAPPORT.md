# Rapport Technique — SecureFlow CRM

> **Projet personnel** — CRM développé par Mohamed Tlili, agent commercial Solution Express (Québec)
> **Date du rapport** : Juillet 2026

---

## Sommaire

1. [Description générale](#1-description-générale)
2. [Stack technique](#2-stack-technique)
3. [Architecture du projet](#3-architecture-du-projet)
4. [Base de données](#4-base-de-données)
5. [Authentification et sécurité](#5-authentification-et-sécurité)
6. [Pages — description complète](#6-pages--description-complète)
7. [API Routes](#7-api-routes)
8. [Composants partagés](#8-composants-partagés)
9. [Librairies utilitaires](#9-librairies-utilitaires)
10. [État global du code](#10-état-global-du-code)

---

## 1. Description générale

SecureFlow CRM est une application web personnelle de gestion de leads commerciaux. Elle permet à un agent commercial de :

- Créer, modifier et suivre des fiches prospects (leads)
- Visualiser les performances via un tableau de bord avec statistiques
- Gérer un pipeline commercial par statuts
- Suivre les commissions gagnées et payées
- Comparer les performances entre années
- Gérer les remboursements d'essence mensuels
- Consulter et exporter toute la base de données
- Configurer l'application (villes, produits, types de commerce, profil)

L'application est **mono-utilisateur** : chaque donnée est liée à l'utilisateur connecté via `createdBy`.

---

## 2. Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Framework | Next.js 14 (App Router) | Routing, SSR, API routes |
| Langage | TypeScript | Typage statique sur tout le projet |
| Base de données | PostgreSQL (Supabase) | Stockage principal |
| ORM | Prisma 5 | Accès DB typé, migrations, schéma |
| Auth | JWT (JOSE) + bcryptjs | Tokens signés, mots de passe hashés |
| HTTP client | Axios | Appels API côté client |
| UI icons | Lucide React | Icônes SVG |
| Graphes | Recharts | Graphiques bar (dashboard, commissions) |
| Toast | React Hot Toast | Notifications utilisateur |
| CSS | Tailwind (base) + Inline styles + CSS Modules (dashboard) | Styles |
| Hébergement DB | Supabase (AWS eu-north-1) | PostgreSQL managé |

---

## 3. Architecture du projet

```
Portfolio-QC/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          ← Page de connexion
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Layout protégé (auth check)
│   │   ├── page.tsx                ← Dashboard principal
│   │   ├── leads/page.tsx          ← Gestion des leads
│   │   ├── pipeline/page.tsx       ← Vue pipeline Kanban
│   │   ├── commissions/page.tsx    ← Suivi des commissions
│   │   ├── comparaison/page.tsx    ← Comparaison inter-années
│   │   ├── essence/page.tsx        ← Remboursements essence
│   │   ├── database/page.tsx       ← Vue base de données
│   │   └── parametres/page.tsx     ← Configuration
│   ├── api/
│   │   ├── auth/login/route.ts     ← POST login
│   │   ├── auth/me/route.ts        ← GET profil connecté
│   │   ├── leads/route.ts          ← GET + POST leads
│   │   ├── leads/[id]/route.ts     ← PUT + DELETE lead
│   │   ├── leads/stats/route.ts    ← GET statistiques leads
│   │   ├── dashboard/stats/route.ts← GET stats dashboard
│   │   ├── pipeline/stats/route.ts ← GET stats pipeline
│   │   ├── commissions/stats/route.ts ← GET stats commissions
│   │   ├── comparaison/stats/route.ts ← GET comparaison années
│   │   ├── database/stats/route.ts ← GET vue base de données
│   │   ├── essence/route.ts        ← GET + POST essence
│   │   ├── essence/[id]/route.ts   ← PUT essence
│   │   ├── settings/route.ts       ← GET + PUT paramètres
│   │   └── profile/route.ts        ← PUT profil
│   ├── globals.css                 ← Styles globaux + keyframes
│   └── layout.tsx                  ← Layout racine (AuthProvider, fonts)
├── components/
│   ├── dashboard/                  ← Sous-composants dashboard
│   ├── solution-express/           ← FicheCard, FicheModal, UltraFiche
│   ├── Sidebar.tsx                 ← Navigation latérale
│   ├── CosmosBackground.tsx        ← Fond animé étoiles/particules
│   └── AnimatedNumber.tsx          ← Compteur animé
├── context/
│   └── AuthContext.tsx             ← Contexte global d'authentification
├── hooks/
│   └── useIsMobile.ts              ← Détection mobile responsive
├── lib/
│   ├── api.ts                      ← Instance Axios + intercepteurs
│   ├── auth.ts                     ← signToken + getCurrentUser
│   ├── commission.ts               ← Calcul commission totale
│   ├── leads-config.ts             ← Whitelist des champs autorisés
│   ├── prisma.ts                   ← Instance Prisma (singleton)
│   └── settings-cache.ts           ← Cache mémoire 5 min pour les settings
├── prisma/
│   └── schema.prisma               ← Schéma base de données
├── types/
│   └── index.ts                    ← Tous les types TypeScript + constantes
└── middleware.ts                   ← Vérification JWT sur toutes les routes /api
```

---

## 4. Base de données

### Modèles Prisma

#### `User`
Stocke les utilisateurs de l'application.

| Champ | Type | Description |
|---|---|---|
| id | String (cuid) | Identifiant unique |
| name | String | Nom affiché |
| email | String (unique) | Adresse email (login) |
| password | String | Hash bcrypt du mot de passe |
| role | String | Rôle (par défaut : "agent") |
| avatar | String? | URL de l'avatar |
| dateDebut | DateTime? | Date de début d'activité |
| createdAt | DateTime | Date de création |

#### `SolutionExpress`
Table centrale — stocke tous les leads commerciaux.

| Champ | Type | Description |
|---|---|---|
| id | String (cuid) | Identifiant unique |
| entreprise | String | Nom de l'entreprise |
| typeCommerce | String | Type de commerce (restaurant, bureau, etc.) |
| typeClient | String | B2B ou B2C |
| prenom / nom | String | Contact |
| telephone / email | String | Coordonnées |
| ville | String | Ville du client |
| adresse | String | Adresse physique |
| leadType | String | Source du lead (référence, appel froid, etc.) |
| produits | Json (array) | Liste des produits d'intérêt (alarme, internet, etc.) |
| fournisseurs | Json (objet) | Fournisseurs actuels et proposés par produit |
| status | String | Statut : new → contacted → proposal → installation_en_cours → installe / installation_annulee |
| motifAnnulation | String | Raison d'annulation si annulé |
| urgencyScore | Int | Score d'urgence (0–10) |
| summary | String | Résumé libre |
| notes | Json (array) | Notes textuelles chronologiques |
| montantContrat | Float | Valeur du contrat |
| commissionFixe | Float | Commission fixe |
| commissionExtra | Float | Commission bonus |
| commissionTotale | Float | Total commission (fixe + extra) |
| commissionPayee | Boolean | Commission reçue ou non |
| dateVente | DateTime? | Date de la vente/installation |
| datePaiementCommission | DateTime? | Date de réception de la commission |
| createdBy | String | Référence vers User.id |
| createdAt / updatedAt | DateTime | Timestamps automatiques |

**Index définis :**
- `status`, `ville`, `createdAt DESC`
- `createdBy` (filtrage par utilisateur)
- `dateVente`
- `(createdBy, dateVente)` — composite pour les filtres par période
- `(createdBy, createdAt DESC)` — composite pour les listes triées
- Index GIN sur `produits` (JSONB) — pour les recherches par produit

#### `Settings`
Un seul enregistrement global (`id = "global"`) qui stocke toute la configuration de l'application.

| Champ | Description |
|---|---|
| villes | Liste des villes disponibles |
| typeCommerce | Types de commerce (clé + label) |
| typeLead | Sources de lead (clé + label) |
| qualificationSysteme | Systèmes existants (ADT, Bell, etc.) |
| services | Catalogue produits avec couleur, icône, fournisseurs |
| motifsAnnulation | Raisons d'annulation disponibles |
| objectifAnnuel | Objectif de commissions par année |
| commissionFixeDefaut | Valeur par défaut commission fixe |
| commissionExtraDefaut | Valeur par défaut commission extra |
| produitsAvecQualification | Produits qui déclenchent une question de qualification |

#### `Essence`
Suivi mensuel des remboursements d'essence.

| Champ | Description |
|---|---|
| annee / mois | Période concernée (unique ensemble) |
| joursOuvres | Nombre de jours travaillés |
| montantParJour | Taux journalier |
| montantAttendu | Total calculé (joursOuvres × montantParJour) |
| recu | Booléen — remboursement reçu ou non |
| dateReception | Date de réception |
| note | Note libre |

---

## 5. Authentification et sécurité

### Flux d'authentification

```
[Navigateur]
    │
    ├─ POST /api/auth/login {email, password}
    │        ↓
    │   middleware.ts → route publique, laisse passer
    │        ↓
    │   login/route.ts → vérifie email + bcrypt.compare(password, hash)
    │        ↓
    │   signToken(user.id) → JWT signé HS256, expiry 7 jours
    │        ↓
    ├─ localStorage.setItem('sf_token', token)
    │
    ├─ Toute requête API suivante :
    │   Authorization: Bearer <token>
    │        ↓
    │   middleware.ts → jwtVerify(token, secret)
    │        ↓ (si valide)
    │   headers['x-user-id'] = payload.id
    │        ↓
    │   API route → getCurrentUser(req) → lit x-user-id → findUnique(user)
    │        ↓
    │   Toutes les requêtes DB filtrent par { createdBy: user.id }
```

### Protection des pages

Le layout `(dashboard)/layout.tsx` vérifie la présence d'un utilisateur connecté via `AuthContext`. Si aucun utilisateur n'est trouvé après chargement, redirection automatique vers `/login`.

Au démarrage, `AuthContext` appelle `/api/auth/me` pour valider le token stocké. Si le token est invalide ou expiré, il est supprimé du localStorage.

### Points de sécurité

| Aspect | Implémentation |
|---|---|
| Mots de passe | Hash bcrypt (jamais stocké en clair) |
| Tokens | JWT HS256, expiry 7 jours, signé avec `JWT_SECRET` |
| Isolation données | Chaque requête DB filtre par `createdBy: user.id` |
| Injection SQL | Impossible — Prisma utilise des requêtes paramétrées |
| Champs autorisés | `ALLOWED_LEAD_FIELDS` whitelist sur tous les PUT/POST leads |
| Validation entrées | Status, typeClient, annee, mois validés avant usage |
| Ownership | DELETE/PUT vérifient `existing.createdBy === user.id` (403 sinon) |
| XSS | Aucun `dangerouslySetInnerHTML` — tout le texte passe par JSX |

---

## 6. Pages — description complète

---

### Page Login (`/login`)

**Fichier :** `app/(auth)/login/page.tsx`

**Description :** Page de connexion à l'application. Interface visuelle avec fond animé, logo animé et formulaire email/mot de passe.

**Fonctionnement :**
1. L'utilisateur saisit email + mot de passe
2. Appel `POST /api/auth/login`
3. En cas de succès : token stocké dans localStorage, redirection vers le dashboard
4. En cas d'erreur : message d'erreur affiché

**Fonctionnalités :**
- Affichage/masquage du mot de passe
- Gestion état de chargement (bouton désactivé pendant la requête)
- Fond animé avec éléments visuels (logo pulsé, scan lines)

---

### Layout Dashboard (`(dashboard)/layout.tsx`)

**Fichier :** `app/(dashboard)/layout.tsx`

**Description :** Layout partagé par toutes les pages du dashboard. Il enveloppe chaque page avec la sidebar de navigation et vérifie l'authentification.

**Fonctionnement :**
- Si `loading = true` → affiche un spinner
- Si `user = null` après chargement → redirection vers `/login`
- Sinon → affiche `<Sidebar>` + `<main>{children}</main>`

---

### Dashboard (`/`)

**Fichier :** `app/(dashboard)/page.tsx`

**Description :** Page d'accueil. Vue synthétique de toutes les performances commerciales avec graphiques, statistiques et leads récents.

**Données affichées :**
- **Taux d'installation** : pourcentage de leads installés avec barre de progression
- **4 ScoreRings** : anneaux animés pour Soumission, En cours, Installé, Annulée
- **Graphe d'évolution** : bar chart mensuel ou annuel (filtrable : Total / Installé / En cours / Annulé / Payé)
- **Total leads** : compteur global + répartition B2B / B2C
- **6 cartes statuts** : Nouveau, Contacté, Soumissions, Installation en cours, Installés, Annulées
- **Produits d'intérêt** : services les plus demandés avec barres de progression
- **Types de leads** : répartition par source (référence, appel froid, digital, etc.)
- **Villes** : top 20 villes avec classement
- **Commerce B2B / B2C** : types de commerce séparément
- **Leads récents** : 6 dernières fiches avec statut, ville, date, badge B2B/B2C

**Filtres disponibles :**
- Année (toutes les années ou année spécifique)
- Mois (disponible uniquement si une année est sélectionnée)

**Sous-composants :** `EvolutionChart`, `TotalLeadsCard`, `StatusCards`, `ProductsSection`, `CitiesAndLeadTypes`, `CommerceSection`, `RecentLeads`, `ScoreRing`, `AnimatedNumber`

---

### Leads (`/leads`)

**Fichier :** `app/(dashboard)/leads/page.tsx`

**Description :** Page principale de gestion des fiches leads. C'est le cœur opérationnel de l'application.

**Affichage :**
- Leads groupés par mois (si une année est sélectionnée) ou par année
- Chaque groupe affiche : label période, nombre de fiches, total commissions
- Pagination "Afficher plus" (30 leads par page, offset progressif)
- Protection double-clic : bouton désactivé pendant le chargement pour éviter les doublons

**Filtres disponibles (8 simultanés) :**
- Statut (Nouveau, Contacté, Soumission, En cours, Installé, Annulé)
- B2B / B2C
- Type de lead (source)
- Ville
- Type de commerce
- Système de qualification actuel
- Commission (payée / en attente / avec commission / annulée)
- Service/produit (pills interactives)

**Recherche :**
- Barre de recherche full-text avec debounce 300ms
- Sur : entreprise, prénom, nom, téléphone, email, ville, résumé

**Tri :** Plus récent / Plus ancien / Urgence / Commission / Alphabétique / Statut

**Actions :**
- **Ouvrir** → UltraFiche (vue détail)
- **Modifier** → FicheModal (formulaire complet)
- **Supprimer** → confirmation puis suppression
- **Toggle commission payée** → mise à jour optimiste avec rollback
- **Changement de statut** → si "Annulée" : modal choix du motif obligatoire

**Statistiques en haut :** Total, En cours, Installés, Annulés

---

### Pipeline (`/pipeline`)

**Fichier :** `app/(dashboard)/pipeline/page.tsx`

**Description :** Vue Kanban des leads organisés par statut commercial.

**Fonctionnement :**
- 6 colonnes : Nouveau → Contacté → Soumission → Installation en cours → Installé → Annulée
- Chaque colonne affiche le nombre de leads et le total des commissions
- Les leads sont représentés par des cartes avec initiales, nom, ville, date
- Clic sur une carte → UltraFiche

**Filtres :** Année (années réelles uniquement, sans option "Toutes les années"), mois, service/produit

**Statistiques :** Total, B2B, B2C, Installés, Annulées, En cours, Soumissions, Taux d'installation, répartition par service

---

### Commissions (`/commissions`)

**Fichier :** `app/(dashboard)/commissions/page.tsx`

**Description :** Tableau de bord financier dédié aux commissions.

**Données affichées :**
- Commission totale gagnée, payée, en attente, annulée
- Objectif annuel et pourcentage d'atteinte
- Maximum et minimum par lead
- Graphe mensuel (bar chart cliquable)
- Historique détaillé par lead avec toggle "payée"

**Filtres :** Année / mois, tout / payé / non payé / annulé

**Cache intelligent :** Les données par mois sont mises en cache via `useRef` pour éviter des appels API répétés lors de la navigation entre mois.

**Protection double-clic :** Bouton "Afficher plus" désactivé pendant le chargement pour éviter les doublons dans l'historique.

---

### Comparaison (`/comparaison`)

**Fichier :** `app/(dashboard)/comparaison/page.tsx`

**Description :** Comparaison des performances entre deux années différentes.

**Fonctionnement :**
- Sélection de deux années (Année A vs Année B)
- Navigation mois par mois ou vue annuelle complète
- Deux colonnes côte à côte avec code couleur (quelle année est meilleure)

**Métriques comparées :** Commissions gagnées / payées / en attente, leads installés / annulés, commission max/min, taux de paiement, total leads

---

### Essence (`/essence`)

**Fichier :** `app/(dashboard)/essence/page.tsx`

**Description :** Suivi des remboursements d'essence mensuels.

**Fonctionnement :**
- Vue en grille de tous les mois d'une année
- Navigation par année (boutons précédent/suivant)
- Chaque mois affiche : jours ouvrés, montant attendu, statut reçu/en attente, date de réception, note

**Actions :**
- Toggle "Reçu" depuis la grille
- Édition inline des jours ouvrés
- Ajout/modification de note via modal
- "Préparer prochain mois" : création automatique si inexistant

**Statistiques :** Total attendu, total reçu, en attente, mois reçus

---

### Base de données (`/database`)

**Fichier :** `app/(dashboard)/database/page.tsx`

**Description :** Vue administrative complète de la base de données.

**Fonctionnalités :**
- Tableau de tous les leads avec filtres dans les en-têtes (entreprise, ville, statut, mois)
- Pagination "Afficher plus" (30 leads à la fois, côté client via slice)
- Les filtres fonctionnent sur toutes les données en mémoire — pas de perte au changement de filtre
- Clic sur une ligne → UltraFiche
- Suppression avec confirmation
- **Export PDF** de toutes les fiches (composant `LeadsPDF`)

**Statistiques DB :** Nombre de fiches, utilisateurs, entrées essence, espace utilisé / limite

---

### Paramètres (`/parametres`)

**Fichier :** `app/(dashboard)/parametres/page.tsx`

**Description :** Centre de configuration complet organisé en onglets.

| Onglet | Description |
|---|---|
| **Profil** | Nom, email, mot de passe, avatar, date de début |
| **Villes** | Liste des villes dans les formulaires |
| **Commerce** | Types de commerce B2B/B2C |
| **Lead** | Sources de lead (référence, appel froid, digital, etc.) |
| **Qualification** | Systèmes existants (ADT, Bell, Vidéotron, etc.) |
| **Services** | Catalogue de produits avec couleur, icône, fournisseurs |
| **Commissions** | Valeurs par défaut (fixe et extra) |
| **Objectifs** | Objectif annuel de commissions par année |
| **Annulations** | Motifs d'annulation disponibles |

**Fonctionnement :**
- Flag `dirty` pour détecter les modifications non sauvegardées
- `sortedJSON` pour comparer les états et détecter les vrais changements
- À la sauvegarde : invalidation du cache settings → toutes les pages rechargent les nouvelles valeurs

---

## 7. API Routes

### Authentification

| Route | Méthode | Description |
|---|---|---|
| `/api/auth/login` | POST | Connexion — vérifie email/password, retourne JWT + user |
| `/api/auth/me` | GET | Retourne l'utilisateur connecté depuis le token |
| `/api/auth/register` | POST | Création d'un nouveau compte |

### Leads

| Route | Méthode | Description |
|---|---|---|
| `/api/leads` | GET | Liste paginée avec filtres, recherche et tri |
| `/api/leads` | POST | Création d'un nouveau lead |
| `/api/leads/[id]` | PUT | Modification d'un lead (whitelist des champs) |
| `/api/leads/[id]` | DELETE | Suppression d'un lead (ownership vérifié) |
| `/api/leads/stats` | GET | Totaux : totalFiches, installés, annulés, pipeline |

### Dashboard & Statistiques

| Route | Méthode | Description |
|---|---|---|
| `/api/dashboard/stats` | GET | Toutes les statistiques du dashboard (requêtes parallèles) |
| `/api/pipeline/stats` | GET | Données pipeline par statut |
| `/api/commissions/stats` | GET | Données financières des commissions |
| `/api/comparaison/stats` | GET | Données pour la comparaison inter-années |
| `/api/database/stats` | GET | Vue complète DB + statistiques de stockage |

### Essence, Profil & Settings

| Route | Méthode | Description |
|---|---|---|
| `/api/essence` | GET | Liste des entrées essence par année |
| `/api/essence` | POST | Création d'une entrée essence |
| `/api/essence/[id]` | PUT | Modification (jours, montant, reçu, note) |
| `/api/profile` | PUT | Mise à jour du profil (nom, email, avatar, password) |
| `/api/profile/stats` | GET | Statistiques du profil |
| `/api/settings` | GET | Récupération des paramètres globaux |
| `/api/settings` | PUT | Sauvegarde des paramètres |

---

## 8. Composants partagés

### `Sidebar`
Navigation latérale avec icônes et labels. Mode compact (icônes seules) ou étendu (icônes + labels). Liens : Dashboard, Leads, Pipeline, Commissions, Comparaison, Essence, Base de données, Paramètres, Déconnexion.

### `CosmosBackground`
Fond décoratif animé. Génère 60 étoiles clignotantes et 18 particules montantes colorées. Positions et vitesses aléatoires générées une fois au mount. Animations CSS dans `globals.css`.

### `AnimatedNumber`
Affichage numérique avec animation de transition entre deux valeurs. Utilise `requestAnimationFrame` avec easing cubique. Supporte décimales et suffixe.

### `FicheCard`
Carte compacte d'un lead. Affiche : avatar (initiales), nom/entreprise, ville, statut, badge B2B/B2C, commission, boutons d'action rapides.

### `FicheModal`
Modal de création et modification d'un lead. Formulaire complet avec tous les champs organisés en sections scrollables.

### `UltraFiche`
Vue détail complète d'un lead. Affiche toutes les informations, change le statut, ajoute/supprime des notes, modifie, supprime. Interface visuelle avec code couleur par statut.

### Composants Dashboard (`components/dashboard/`)

| Composant | Description |
|---|---|
| `ScoreRing` | Anneau SVG animé avec valeur centrale (animation stroke-dasharray) |
| `ProgressBar` | Barre de progression colorée |
| `TotalLeadsCard` | Carte "Total leads" avec B2B/B2C |
| `StatusCards` | Grille des 6 cartes de statuts avec hover |
| `EvolutionChart` | Graphe bar Recharts avec filtres |
| `ProductsSection` | Liste des produits avec barres de progression |
| `CitiesAndLeadTypes` | Grille 2 colonnes : villes + types de leads |
| `CommerceSection` | Sections B2B et B2C commerces |
| `RecentLeads` | Liste des 6 derniers leads |

---

## 9. Librairies utilitaires

### `lib/api.ts`
Instance Axios avec :
- Intercepteur request : injection automatique du JWT depuis localStorage
- Intercepteur response : suppression du token si réponse 401
- `apiErrMsg()` : extraction du message d'erreur depuis la réponse API

### `lib/auth.ts`
- `signToken(userId)` : JWT signé HS256, valable 7 jours
- `getCurrentUser(req)` : lit le header `x-user-id` injecté par le middleware et retourne l'utilisateur DB

### `lib/commission.ts`
- `calcCommissionTotale(fixe, extra)` : calcule le total — centralisé pour garantir la cohérence partout

### `lib/leads-config.ts`
- `ALLOWED_LEAD_FIELDS` : `Set<string>` des champs autorisés en PUT/POST. Bloque toute tentative d'injecter `createdBy`, `id`, etc.

### `lib/prisma.ts`
Singleton PrismaClient. Évite les connexions multiples en développement avec Next.js Fast Refresh.

### `lib/settings-cache.ts`
Cache mémoire côté client avec TTL 5 minutes. Évite des appels API répétés à chaque changement de page. `invalidateSettingsCache()` force un rechargement lors de la sauvegarde.

### `hooks/useIsMobile.ts`
Détecte si l'écran est mobile (< 768px). Pattern isomorphique `useLayoutEffect` / `useEffect`. Debounce 80ms sur le resize.

---

## 10. État global du code

### Points forts

- **Sécurité cohérente** : middleware JWT → isolation données par `createdBy` → whitelist champs — chaîne sans faille majeure
- **Gestion des requêtes** : AbortController sur toutes les pages, debounce sur la recherche, annulation propre au démontage
- **Optimistic updates** : page Leads — mise à jour immédiate de l'UI avec rollback si l'API échoue
- **Pagination serveur** : les leads ne sont jamais tous chargés en mémoire — scalable
- **Dashboard refactorisé** : 9 sous-composants isolés, CSS module, keyframes locaux, handlers stables via `useCallback`
- **Index DB** : composites `(createdBy, dateVente)` et `(createdBy, createdAt)` + index GIN JSONB sur produits
- **Settings cache** : module-level singleton, TTL 5 min, invalidation manuelle

### Points à améliorer

- **Cohérence du style** : seul le Dashboard utilise un CSS module — les autres pages utilisent 100% inline styles
- **Composants monolithiques** : Leads (~650 lignes), Commissions, Pipeline mériteraient la même décomposition que le Dashboard
- **Rate limiting** : aucune limite de tentatives sur la route `/api/auth/login`
- **Protection serveur des pages** : middleware protège uniquement les routes `/api/*`, pas les pages Next.js
- **Register ouvert** : `/api/auth/register` est accessible sans authentification

### Note globale : **6.5 / 10**

Le projet est fonctionnel et sécurisé dans ses fondamentaux. Il démontre une maîtrise solide des patterns modernes React/Next.js (AbortController, optimistic updates, pagination serveur, CSS modules, memo/useCallback). La principale marge d'amélioration est la cohérence : le dashboard a été porté à un niveau professionnel, mais les autres pages restent dans leur état d'origine. Une refactorisation progressive des pages restantes amènerait le projet à **8/10**.


