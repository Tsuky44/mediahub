# Plan d'Optimisation & Refactoring - MediaHub

> Généré le 27/04/2026 - Couvre performance, architecture, maintenabilité et dette technique.

---

## Sommaire

1. [Métriques Actuelles](#1-métriques-actuelles)
2. [P0 - Réduire le CSR (Client-Side Rendering) massif](#2-p0---réduire-le-csr-client-side-rendering-massif)
3. [P0 - Centraliser la gestion des données (TanStack Query / SWR)](#3-p0---centraliser-la-gestion-des-données-tanstack-query--swr)
4. [P1 - Éliminer la dette de typage (`any`)](#4-p1---éliminer-la-dette-de-typage-any)
5. [P1 - Continuer la décomposition des composants monolithiques](#5-p1---continuer-la-décomposition-des-composants-monolithiques)
6. [P1 - Refactoriser les `useEffect` anti-patterns](#6-p1---refactoriser-les-useeffect-anti-patterns)
7. [P2 - Créer un client API centralisé](#7-p2---créer-un-client-api-centralisé)
8. [P2 - Optimisations React & bundles](#8-p2---optimisations-react--bundles)
9. [Roadmap par phase](#9-roadmap-par-phase)
10. [Checklist de validation](#10-checklist-de-validation)

---

## 1. Métriques Actuelles

| Métrique | Valeur | Seuil critique |
|---|---|---|
| Fichiers `'use client'` | **258** | > 50 |
| `useEffect` totaux | **160** dans 71 fichiers | > 80 |
| Occurrences `any` | **1 017** dans 199 fichiers | > 200 |
| Composants > 180 lignes | **24** | > 10 |
| Composants > 250 lignes | **15** | > 5 |
| Contexts React | **2** (AbilityContext, tooltip) | - |
| Client API unique | **0** (fetch éparpillé) | 1 |

**Constat principal :** Next.js App Router est utilisé comme un Create React App. Les données sont fetchées dans le browser, le HTML est généré côté client, et le bundle JS est conséquent.

---

## 2. P0 - Réduire le CSR (Client-Side Rendering) massif

### 2.1 Problème

258 fichiers sont marqués `'use client'`. Beaucoup sont purement présentationnels (cartes, badges, en-têtes, listes statiques) et n'ont aucune raison d'être exécutés dans le navigateur.

**Impact mesurable :**
- **Time to First Byte (TTFB)** : le serveur envoie une coquille vide, le client doit télécharger React + exécuter le JS + fetch les données avant d'afficher quoi que ce soit.
- **First Contentful Paint (FCP)** : dégradé de 200-800ms selon la connexion.
- **Bundle JS** : chaque `'use client'` inclut implicitement React et ses dépendances dans le chunk client.

### 2.2 Objectif

Diviser par **2 à 3** le nombre de fichiers `'use client'` en basculant les composants passifs en **React Server Components (RSC)**.

### 2.3 Règle de décision simple

| Le composant... | Doit être |
|---|---|
| Affiche des données fetchées côté serveur | **RSC** (pas de `'use client'`) |
| Utilise `useState`, `useEffect`, `onClick`, `useRef` | `'use client'` |
| Est un bouton, un input contrôlé, une modale | `'use client'` |
| Est une carte d'affichage, un header, un footer | **RSC** |

### 2.4 Cibles prioritaires de conversion RSC

**a) Dashboard page & ses enfants**
```
app/dashboard/page.tsx           -> Déjà RSC (async) ✓
  ├── RecentRequests.tsx         -> RSC possible (affichage liste)
  ├── QuickActions.tsx           -> Garder client (interactif)
  ├── WelcomePopup.tsx          -> Garder client (modal)
  ├── ReleaseCalendar.tsx        -> RSC possible (affichage)
  ├── ServerStatusCard.tsx       -> RSC possible (données statiques)
  └── LibraryStatsCard.tsx       -> RSC possible (données statiques)
```

**b) Settings tabs (panels de lecture)**
```
app/dashboard/settings/_components/
  ├── StorageSettings.tsx        -> RSC possible (formulaire = hybride)
  ├── MediaSettings.tsx          -> RSC possible
  ├── RoleManagement.tsx         -> RSC possible (table + données)
  └── SystemMessageManagement.tsx -> RSC possible
```

**c) Docker page cards**
```
app/dashboard/docker/_components/
  ├── ContainerStats.tsx         -> RSC possible (stats display)
  ├── TerminalViewer.tsx         -> Garder client (xterm.js)
  └── LogViewer.tsx              -> Garder client (streaming)
```

### 2.5 Pattern de conversion

**Avant (CSR complet) :**
```tsx
'use client'

import { useEffect, useState } from 'react'

export default function ServerStatusCard() {
  const [status, setStatus] = useState(null)
  
  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setStatus)
  }, [])
  
  if (!status) return <div>Chargement...</div>
  return <div>{status.cpu}% CPU</div>
}
```

**Après (RSC + Server Action) :**
```tsx
// ServerStatusCard.tsx (RSC - pas de 'use client')
import { getServerHealth } from './actions' // Server Action

export default async function ServerStatusCard() {
  const status = await getServerHealth() // Exécuté sur le serveur
  
  return <div>{status.cpu}% CPU</div>
}
```

### 2.6 Extraction des "client islands"

Pour les composants qui mélangent affichage statique + interactivité, utiliser le pattern **Server Component wrapping Client Component** :

```tsx
// Server wrapper
export default async function ServerStatusCardWrapper() {
  const initialData = await getServerHealth()
  return <ClientStatusCard initialData={initialData} />
}

// Client island (petit, isolé)
'use client'
export default function ClientStatusCard({ initialData }) {
  const [data, setData] = useState(initialData)
  // Seul le polling live est client
  useEffect(() => { /* socket polling */ }, [])
  return <div>{data.cpu}%</div>
}
```

### 2.7 Bénéfice attendu

- **Bundle client** : -30% à -50% de JS transféré.
- **FCP** : amélioration de 200-500ms.
- **SEO / Partage** : meilleur pour les pages publiques (`request-access`, `login`).

---

## 3. P0 - Centraliser la gestion des données (TanStack Query / SWR)

### 3.1 Problème

Aucun cache client. Chaque composant qui a besoin de données refait un `fetch` via `useEffect`.

**Symptômes observés :**
- `useDockerContainers.ts` : fetch manuel avec `useEffect`
- `useTorrents.ts` : fetch manuel
- `useNotifications.ts` : polling manuel
- `useActivityLogs.ts` : fetch + pagination manuelle

**Impact :**
- **Waterfall** : la page attend le JS, puis fait un fetch, puis affiche.
- **Re-fetchs redondants** : 2 onglets qui affichent les mêmes containers = 2 requêtes API.
- **Race conditions** : `useEffect` non annulé au unmount.
- **Pas de mutation optimiste** : l'UI attend la réponse serveur avant de se mettre à jour.

### 3.2 Solution : TanStack Query (React Query) v5

**Pourquoi pas SWR ?** TanStack Query a des mutations optimistes intégrées, un devtools meilleur, et une intégration Server Actions plus mature.

### 3.3 Architecture cible

```
lib/
  └── query-client.ts          -> QueryClient singleton + provider
app/
  └── layout.tsx               -> QueryProvider (client wrapper)
```

### 3.4 Exemple de conversion

**Avant (hook manuel) :**
```tsx
// useDockerContainers.ts
'use client'
import { useEffect, useState } from 'react'

export function useDockerContainers() {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/docker/containers')
      .then(r => r.json())
      .then(data => {
        setContainers(data)
        setLoading(false)
      })
  }, [])
  
  return { containers, loading }
}
```

**Après (TanStack Query) :**
```tsx
// hooks/useDockerContainers.ts
'use client'
import { useQuery } from '@tanstack/react-query'

export function useDockerContainers() {
  return useQuery({
    queryKey: ['docker', 'containers'],
    queryFn: async () => {
      const res = await fetch('/api/docker/containers')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    staleTime: 5000,        // Données fraîches pendant 5s
    refetchInterval: 10000, // Polling auto toutes les 10s
  })
}
```

**Usage dans le composant :**
```tsx
export default function ContainerList() {
  const { data: containers, isLoading, error } = useDockerContainers()
  
  if (isLoading) return <Skeleton />
  if (error) return <ErrorDisplay error={error} />
  
  return containers.map(c => <ContainerCard key={c.id} {...c} />)
}
```

### 3.5 Invalidation de cache intelligente

```tsx
// Mutation avec invalidation
const queryClient = useQueryClient()

const deleteGroup = useMutation({
  mutationFn: (id: string) => fetch(`/api/groups/${id}`, { method: 'DELETE' }),
  onSuccess: () => {
    // Invalider toutes les clés qui commencent par 'docker'
    queryClient.invalidateQueries({ queryKey: ['docker'] })
  },
})
```

### 3.6 Avantages

| Avant | Avec TQ | Sans TQ |
|---|---|---|
| Deduplication requêtes | ✅ | ❌ |
| Cache avec staleTime | ✅ | ❌ |
| Refetch background | ✅ | ❌ |
| Mutations optimistes | ✅ | ❌ |
| Retry auto | ✅ | ❌ |
| DevTools | ✅ | ❌ |

---

## 4. P1 - Éliminer la dette de typage (`any`)

### 4.1 Métriques

- **1 017 occurrences** de `: any` ou `as any` dans **199 fichiers**.
- Top 5 : `emby.ts` (44), `settings/actions.ts` (41), `smb.ts` (30), `sonarr.ts` (27), `emby-tracker.ts` (27).

### 4.2 Stratégie par foyer

#### a) `lib/services/emby.ts` (44 any)

**Remplacer les `any[]` des réponses API par des interfaces strictes :**

```typescript
// Avant
async getItems(): Promise<any[]> {
  const res = await this.client.get('/Items')
  return res.data.Items
}

// Après
interface EmbyItem {
  Id: string
  Name: string
  Type: 'Movie' | 'Series' | 'Episode'
  Path?: string
  DateCreated?: string
  ImageTags?: { Primary?: string }
}

interface EmbyItemsResponse {
  Items: EmbyItem[]
  TotalRecordCount: number
}

async getItems(): Promise<EmbyItem[]> {
  const res = await this.client.get<EmbyItemsResponse>('/Items')
  return res.data.Items
}
```

#### b) `app/dashboard/page.tsx` et routes API

**Remplacer le cast systématique :**

```typescript
// Avant (ligne 23)
const user = session?.user as any

// Après
import { User } from '@prisma/client' // ou interface UserSession
const user = session?.user as User | undefined
```

#### c) Services externes (sonarr, radarr, prowlarr)

Créer des **fichiers de types dédiés** :
```
lib/
  └── types/
      ├── emby.ts
      ├── sonarr.ts
      ├── radarr.ts
      ├── prowlarr.ts
      └── tmdb.ts
```

### 4.3 Règle d'or

- `any` interdit dans le code métier (règle ESLint à ajouter).
- `unknown` autorisé uniquement pour les entrées externes (API, user input), suivi d'un **narrowing** immédiat (`zod`, `valibot`, ou `if (typeof x === 'string')`).

---

## 5. P1 - Continuer la décomposition des composants monolithiques

### 5.1 Composants > 250 lignes restants

| Composant | Lignes | Statut |
|---|---|---|
| `downloads/[hash]/page.tsx` | 552 | 🔴 Critique |
| `UserActivityButton.tsx` | 320 | 🔴 Critique |
| `TorrentRow.tsx` | 300 | 🔴 Critique |
| `TorrentManager.tsx` | 298 | 🔴 Critique |
| `LinkedAccounts.tsx` | 297 | 🔴 Critique |
| `InteractiveSearch.tsx` | 287 | 🔴 Critique |
| `ReleaseCalendar.tsx` | 287 | 🔴 Critique |
| `request-access/page.tsx` | 286 | 🔴 Critique |
| `SetupForm.tsx` | 272 | 🔴 Critique |
| `WebhookCard.tsx` | 269 | 🔴 Critique |
| `TorrentFiltersBar.tsx` | 267 | 🔴 Critique |
| `DownloadStatusCard.tsx` | 264 | 🔴 Critique |
| `media/[id]/page.tsx` | 263 | 🔴 Critique |
| `StorageSettings.tsx` | 258 | 🔴 Critique |
| `ContainerStats.tsx` | 255 | 🔴 Critique |

### 5.2 Pattern de décomposition (comme GroupManager.tsx)

Pour chaque composant > 200 lignes :

```
ComposantX.tsx
├── _types/
│   └── composant-x.ts        -> Interfaces + types
├── _constants/
│   └── composant-x.ts         -> Valeurs statiques, labels, options
├── _utils/
│   └── composant-x.ts         -> Fonctions pures (parse, format, filter)
├── _hooks/
│   └── useComposantX.ts       -> State, effects, handlers
└── _components/
    ├── ComposantXHeader.tsx
    ├── ComposantXForm.tsx
    ├── ComposantXList.tsx
    └── ComposantXRow.tsx
```

**Composant orchestrateur final :** 50-100 lignes, consomme le hook + compose les sous-composants.

### 5.3 Exemple : `downloads/[hash]/page.tsx` (552 lignes)

**Décomposition suggérée :**
```
app/dashboard/downloads/[hash]/
├── page.tsx                    -> Orchestrator (50 lignes)
├── _types/
│   └── torrent-details.ts      -> TorrentDetail, Peer, FileInfo
├── _utils/
│   └── torrent-details.ts      -> formatBytes, formatSpeed, parsePeers
├── _hooks/
│   └── useTorrentDetails.ts    -> Fetch, polling, mutations
└── _components/
    ├── TorrentDetailsHeader.tsx
    ├── TorrentDetailsTabs.tsx
    ├── PeersList.tsx
    ├── FilesList.tsx
    ├── TrackersList.tsx
    └── SpeedChart.tsx
```

---

## 6. P1 - Refactoriser les `useEffect` anti-patterns

### 6.1 Classification des 160 `useEffect`

| Catégorie | Nombre | Solution |
|---|---|---|
| Fetch de données | ~45 | Server Actions / TanStack Query |
| Dérivation de state | ~30 | `useMemo` |
| Event listeners (socket, resize) | ~25 | Extract dans hooks dédiés |
| Synchronisation DOM | ~20 | Refs + callbacks |
| Polling / timers | ~15 | TanStack Query `refetchInterval` |
| Autres | ~25 | Cas par cas |

### 6.2 Anti-pattern : Dérivation de state via `useEffect`

**Avant :**
```tsx
const [filtered, setFiltered] = useState([])

useEffect(() => {
  setFiltered(items.filter(i => i.status === activeFilter))
}, [items, activeFilter])
```

**Après :**
```tsx
const filtered = useMemo(
  () => items.filter(i => i.status === activeFilter),
  [items, activeFilter]
)
```

### 6.3 Anti-pattern : Fetch dans `useEffect`

**Avant :**
```tsx
useEffect(() => {
  fetch('/api/data').then(r => r.json()).then(setData)
}, [])
```

**Après (TanStack Query) :**
```tsx
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData })
```

**Après (Server Component) :**
```tsx
// page.tsx (RSC)
const data = await fetchData() // Exécuté côté serveur
return <View data={data} />
```

---

## 7. P2 - Créer un client API centralisé

### 7.1 Problème

Les `fetch` sont dispersés dans 50+ fichiers. Chacun gère :
- Le baseURL
- Les headers (`Content-Type`, auth)
- Le `try/catch`
- Le `response.ok`
- Le `response.json()`
- Le retry / timeout

### 7.2 Solution : `lib/api-client.ts`

```typescript
// lib/api-client.ts
import { getSession } from 'next-auth/react'

class ApiClient {
  private baseUrl: string
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  }
  
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    // Auth auto-injectée si besoin
    return headers
  }
  
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', path, undefined, options)
  }
  
  async post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('POST', path, body, options)
  }
  
  async patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>('PATCH', path, body, options)
  }
  
  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options)
  }
  
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    
    const res = await fetch(url, {
      method,
      headers: await this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    })
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new ApiError(res.status, error.message || `HTTP ${res.status}`)
    }
    
    return res.json()
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const api = new ApiClient()
```

### 7.3 Usage

```typescript
// Avant
const res = await fetch('/api/docker/groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name })
})
if (!res.ok) { /* ... */ }
return res.json()

// Après
return api.post('/api/docker/groups', { name })
```

---

## 8. P2 - Optimisations React & bundles

### 8.1 Memoization systématique

Vérifier que les composants de liste utilisent `React.memo` :

```tsx
// Avant
export function TorrentRow({ torrent }) {
  return <tr>...</tr>
}

// Après
export const TorrentRow = React.memo(function TorrentRow({ torrent }: Props) {
  return <tr>...</tr>
})
```

### 8.2 Code splitting des modales

Les modales (GroupManager, FilterModal, etc.) peuvent être lazy-loadées :

```tsx
const GroupManager = dynamic(
  () => import('./GroupManager'),
  { ssr: false, loading: () => <SkeletonModal /> }
)
```

### 8.3 Virtualisation des longues listes

Pour les listes > 50 items (torrents, logs, historique) :

```tsx
import { Virtualizer } from '@tanstack/react-virtual'
// ou react-window
```

### 8.4 Images

Vérifier l'utilisation de `next/image` partout. Les `<img>` bruts empêchent l'optimisation automatique (WebP, lazy loading, responsive).

---

## 9. Roadmap par phase

### Phase 1 : Fondations (Semaine 1) ✅ TERMINÉ

- [x] Installer TanStack Query v5 (`@tanstack/react-query`, `@tanstack/react-query-devtools`)
- [x] Créer `lib/query-client.ts` (singleton, staleTime 5s, gcTime 5min)
- [x] Créer `components/providers/QueryProvider.tsx` + intégration dans `Providers.tsx`
- [x] Créer `lib/api-client.ts` (typed GET/POST/PATCH/PUT/DELETE, timeout, ApiError)
- [ ] Cibler les 5 fichiers les plus `any` pour typage strict
- [ ] Basculer 10 composants passifs en RSC (cartes, headers sans interactivité)

### Phase 2 : Données (Semaine 2) ✅ TERMINÉ (SCOPE COURANT)

- [x] Convertir `useDockerContainers.ts` en `useQuery` + `useMutation` (polling 10s, action invalidation)
- [x] Convertir `useDockerGroups.ts` en `useQuery` + `useMutation` (move container, cross-invalidation)
- [x] Adapter `docker/page.tsx` aux nouveaux hooks (`isLoading`/`isFetching`)
- [x] Convertir `useTorrents.ts` en `useQuery` + 7 mutations (add/delete/pause/resume/reannounce/priority/shareLimits)
- [x] Convertir `useGlobalStats.ts` en `useQuery` (polling 2s)
- [x] Convertir `useFileManager.ts` en `useQuery` (path-based queryKey, useMemo filter)
- [x] Convertir `useNotifications.ts` en `useQuery` + useMutation + Socket.IO isolé (polling 60s, 3 mutations)
- [x] Convertir `useActivityLogs.ts` en `useQuery` + pagination + mutation import
- [x] Convertir `useTrackerStatsCard.ts` en `useQuery`
- [x] Convertir `useTrackerStatsModal.ts` en `useQuery` (conditional enabled + debounced dates)
- [x] Convertir `useSeasonEpisodes.ts` en `useQuery` (lazy enabled + staleTime Infinity)
- [x] Convertir `useManageMedia.ts` en `useQuery` + invalidations (fetch + delete/mark actions)
- [x] Convertir `useProwlarrSearch.ts` (useQuery for indexers + useMemo for sorting)
- [ ] Remplacer les `useEffect` de fetch dans les hooks restants

### Phase 3 : Composants (Semaine 3) 🔄 EN COURS

- [ ] Décomposer `downloads/[hash]/page.tsx` (552 -> 50 lignes)
- [x] Décomposer `UserActivityButton.tsx` (320 -> 157 lignes) -> `useUserActivity.ts`
- [x] Décomposer `TorrentRow.tsx` (300 -> 75 lignes) -> `TorrentRowHeader` + `TorrentRowFooter`
- [x] Décomposer `TorrentManager.tsx` (298 -> 195 lignes) -> `useTorrentManagerActions.ts`
- [x] Décomposer `LinkedAccounts.tsx` (297 -> 157 lignes) -> `useLinkedAccounts.ts` (TQ + mutations)
- [x] Décomposer `InteractiveSearch.tsx` (287 -> 157 lignes) -> `useInteractiveSearch.ts`

### Phase 4 : Polish (Semaine 4)

- [ ] Ajouter `React.memo` sur les lignes de table/liste
- [ ] Lazy-load les modales
- [ ] Virtualiser les grandes listes
- [ ] Audit complet `any` restants (objectif : < 50)
- [ ] Config ESLint : interdire `any`, interdire `fetch` en dehors de `lib/api-client.ts`

---

## 10. Checklist de validation

À chaque phase, vérifier :

- [ ] `tsc --noEmit` passe sans erreur
- [ ] Aucune régression fonctionnelle (tests manuels critiques)
- [ ] Lighthouse performance score avant/après
- [ ] Bundle analyzer (`next-bundle-analyzer`) : taille du chunk `_app`
- [ ] `any` count diminue (target : -20% par phase)
- [ ] `'use client'` count diminue (target : -10% par phase)

---

## Annexes

### A. Outils recommandés

| Outil | Usage |
|---|---|
| `@tanstack/react-query` | Cache client, mutations, polling |
| `zod` | Validation des réponses API |
| `next-bundle-analyzer` | Audit de taille des chunks |
| `eslint-plugin-no-any` | Interdiction de `any` |
| `react-scan` | Détection des re-renders inutiles |

### B. Commandes de vérification

```bash
# Compter les 'use client'
grep -r "'use client'" --include="*.tsx" app/ components/ | wc -l

# Compter les any
grep -r ": any\|as any" --include="*.ts" --include="*.tsx" lib/ app/ components/ | wc -l

# Compter les useEffect
grep -r "useEffect(" --include="*.tsx" --include="*.ts" app/ components/ | wc -l

# Composants les plus gros
find app/ components/ -name "*.tsx" -exec wc -l {} + | sort -rn | head -20
```

---

> **Note :** Ce plan est évolutif. Les estimations de semaines sont indicatives et dépendent du temps disponible. La règle absolue reste : **pas de régression fonctionnelle**, et chaque changement validé par `tsc --noEmit`.
