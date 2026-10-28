# Performance — conventions

Règles à suivre pour garder l'application rapide. Chaque point correspond à un utilitaire existant : réutilisez-le plutôt que de réécrire la logique.

## Côté serveur

| Besoin | À utiliser | Pourquoi |
|---|---|---|
| Session / utilisateur courant | `getSession()` ou `getCurrentUser()` (`@/lib/auth`) | Mémoïsé par requête (React `cache`) : le callback de session fait une requête DB, payée une seule fois par requête même si layout, page et actions l'appellent. Ne plus appeler `getServerSession(authOptions)` directement. |
| Plusieurs settings DB | `readSettings([...])` (`@/lib/settings`) | Une seule requête SQL au lieu d'un `SELECT` par clé. |
| Un setting (avec priorité env) | `getSetting(key)` | Cache mémoire 30 s, invalidé par `setSetting`. |
| Config du dashboard (feature flags) | `getDashboardConfig()` (`app/dashboard/_services/dashboard-config.ts`) | Partagée entre layout et pages dans la même requête. |
| Cache d'appels externes | `createMemoCache({ max, ttl, clone })` (`@/lib/cache`) | LRU + TTL + déduplication des appels concurrents. Les erreurs et `null` ne sont pas mis en cache. `clone: true` si l'appelant peut muter l'objet. |
| Client HTTP | `createAxiosClient` (`@/lib/http-client`) ou les agents de `@/lib/http-agents` | Connexions keep-alive réutilisées (plus de handshake TLS à chaque appel). Ne jamais créer de `new https.Agent()` par instance/requête. |
| TMDB | `getTmdbService()` | Instance unique + réponses en cache (détails 30 min, listes 5 min, posters 24 h). |

Règles :

- **Pas de `await` séquentiels indépendants** : regrouper avec `Promise.all`.
- **Pas de N+1** : une requête pour toute une liste (ex. `areInWatchLater(items)` au lieu de `isInWatchLater` par item).
- **Données lentes (Emby, TMDB, *arr) = section streamée** : composant serveur async dans un `<Suspense fallback={...}>` (voir `app/dashboard/_components/DashboardSections.tsx`). Le reste de la page s'affiche sans les attendre.
- Nouvelle requête SQL filtrée/triée sur une colonne : ajouter l'index dans `lib/db/schema.ts` **et** dans `TABLE_DEFINITIONS` de `lib/db/drizzle.ts` (migration auto au démarrage).

## Côté client

- Chaque route du dashboard a un `loading.tsx` construit avec `@/components/ui/skeletons` : la navigation affiche un squelette immédiatement.
- Le cache de routeur client (`experimental.staleTimes` dans `next.config.ts`) rend instantané le retour sur une page visitée depuis moins de 30 s. Après une mutation via `fetch('/api/...')`, appeler `router.refresh()` si la page doit refléter le changement immédiatement (les server actions avec `revalidatePath` le font déjà).
- Modales et librairies lourdes (xterm, recharts…) : `next/dynamic` avec `ssr: false` (voir `DockerModals.tsx`, `StatsCharts.tsx`).
- Images en liste : `loading="lazy" decoding="async"` et la taille TMDB adaptée (`w92`/`w185`/`w342`), jamais `original` pour une vignette.
- React Query : `getQueryClient()` (`@/lib/query-client`) — un client par requête côté serveur, singleton côté navigateur.
