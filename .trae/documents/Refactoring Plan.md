# Plan de Refactoring — mediahub (Next.js / TypeScript)

> Objectif : restructurer et modulariser le codebase sans changement de comportement.
> Vérification systématique après chaque étape : `npx tsc --noEmit` (seule erreur tolérée = `app/api/smb/download/route.ts:58` — Readable.abort, pré-existante, non liée).

## 1. Règles d'architecture

- **Feature folders** : chaque page possède ses `_components/`, `_hooks/`, `_utils/`, `_constants/`.
- **Composants globaux** : dans `components/global/` ; providers dans `components/providers/`.
- **Fusion des variantes** : composants similaires unifiés via un prop `variant` (ex. `MediaList` = `MediaGrid` + `MediaSlider`).
- **Hooks métier** : business logic isolée dans des hooks réutilisables.
- **Imports** : toujours en haut du fichier, ordre logique (react → next → libs → locaux).
- **Préservation Git** : `git mv` pour conserver l'historique lors des déplacements.

## 2. Phases terminées

### Phase 1 — Nettoyage
- Suppression de code mort (`ImpersonationBanner` non utilisé, etc.).

### Phase 2 — Rapatriement dans `_components/` par page
- **2.1** : `media/[id]/_components/*`
- **2.2** : `UserActivityButton`, `TopItemsTabs`
- **2.3** : création `dashboard/_components/`
- **2.4** : `settings/_components/`
- **2.5** : `downloads/_components/` et `docker/_components/`

### Phase 3 — Réorganisation des globaux
- Déplacement dans `components/global/` + `components/providers/`.
- Mise à jour de ~120 fichiers pour les imports.

### Phase 4 — Fusion `MediaGrid` + `MediaSlider`
- Composant unifié `@c:\Users\Mathis\Documents\Project\mediahub\next-app\components\global\MediaList.tsx` avec prop `variant: 'grid' | 'slider'`.

### Phase 5.1 — Décomposition de `TorrentManager.tsx` (1319 → 275 lignes, −79 %)

| Phase | Commit | Extraction | TorrentManager |
|-------|--------|------------|----------------|
| 5.1.a | `393fb15` | `_utils/torrent-formatters.ts`, `_hooks/useVisibleColumns.ts` | 1319 → 1319 |
| 5.1.b | `958caa4` | 6 modals + `BatchActionsBar` dans `_components/torrent/` | 1319 → 823 |
| 5.1.c | `7f14a4a` | `_hooks/useTorrents.ts` (fetching + polling + CRUD) | 823 → 747 |
| 5.1.d | `c53ed25` | `_hooks/useTorrentFilters.ts`, `_hooks/useTorrentSelection.ts` | 747 → 707 |
| 5.1.e | `55938cc` | `_components/torrent/TorrentRow.tsx` (276 l.) | 707 → 485 |
| 5.1.f | `ae764f2` | `_components/torrent/TorrentFiltersBar.tsx` + `_constants/torrent-options.ts` | 485 → 284 |
| 5.1.g | `2ff5c88` | Polish final (dead code, indent) | 284 → 275 |

**Arborescence `downloads/` à l'issue de 5.1 :**

```
downloads/
├── _components/
│   ├── DownloadsClient.tsx          (144)
│   ├── FileManager.tsx              (378)
│   ├── TorrentManager.tsx           (275)  ← point d'entrée compact
│   ├── TorrentStats.tsx             (389)
│   ├── TrackerStatsCard.tsx         (230)
│   ├── TrackerStatsCardLazy.tsx     (31)
│   └── torrent/
│       ├── AddTorrentModal.tsx      (139)
│       ├── BatchActionsBar.tsx      (71)
│       ├── DeleteTorrentModal.tsx   (74)
│       ├── FilterModal.tsx          (238)
│       ├── SearchModal.tsx          (38)
│       ├── ShareLimitModal.tsx      (124)
│       ├── TorrentRow.tsx           (276)
│       └── TorrentFiltersBar.tsx    (247)
├── _constants/
│   └── torrent-options.ts           (62)
├── _hooks/
│   ├── useTorrents.ts               (95)
│   ├── useTorrentFilters.ts         (117)
│   ├── useTorrentSelection.ts       (37)
│   └── useVisibleColumns.ts         (49)
├── _utils/
│   └── torrent-formatters.ts        (61)
├── actions.ts                       (438)
├── file-actions.ts                  (167)
└── page.tsx                         (94)
```

### Phase 5.2 — `stats/`

| Phase | Commit | Extraction | Taille |
|-------|--------|------------|--------|
| 5.2.a | `b6155dc` | `git mv` des 6 composants (`RecentHistory`, `SourceFilter`, `StatsCharts`, `StorageManager`, `SyncPluginButton`, `UserStatsCard`) vers `_components/` | — |
| 5.2.b | `06b6ec9` | `RecentHistory` → `_hooks/useHistorySocket`, `_utils/history-formatters`, `_components/HistoryItem` | 651 → **60** (−91 %) |
| 5.2.c | `390c4ab` | `StorageManager` → `_types/storage`, `_utils/storage-formatters`, `_hooks/useStorageItems`, `_components/storage/{StorageTable, StorageDetailsModal, DeleteStorageModal}` | 594 → **145** (−76 %) |

### Phase 5.3 — `docker/`

| Phase | Commit | Extraction | Taille |
|-------|--------|------------|--------|
| 5.3.a | `3051565` | `_types/docker.ts` + 4 hooks (`useDockerContainers`, `useDockerGroups`, `useDragAutoScroll`, `useDockerViewPreferences`) | — |
| 5.3.b-d | `bfe2f0f` | `_components/container/ContainerCard` (grid+list), `_components/{DockerStatsGrid, DockerSearchBar, DockerGroupSection}` | 942 → **275** (−71 %) |

### Phase 5.4 — `settings/_components/UserManagement.tsx`

| Phase | Commit | Extraction | Taille |
|-------|--------|------------|--------|
| 5.4 | `818580a` | `_types/user.ts`, `_hooks/useUsers.ts` (CRUD + bulk + sync), `_components/users/{UserSyncButtons, ProviderFilterTabs, UserBulkActionBar, UserTableRow, CreateUserModal}` | 666 → **140** (−79 %) |

### Phase 5.5 — `settings/_components/ExternalNotifications.tsx`

| Phase | Commit | Extraction | Taille |
|-------|--------|------------|--------|
| 5.5 | `f89eb00` | `_types/webhook.ts`, `_utils/webhook-templates.ts`, `_hooks/useWebhooks.ts`, `_components/webhooks/{WebhookCard, WebhookVariablesModal, WebhookRecipients, WebhookTemplatesList}` | 647 → **105** (−84 %) |

## 3. Cibles restantes

### Pages / composants volumineux à décomposer

| Cible | Lignes | État |
|-------|--------|------|
| `stats/page.tsx` | 809 | à faire |
| `stats/me/page.tsx` | 523 | à faire |
| `settings/_components/RoleEditor.tsx` | 522 | à faire |
| `requests/list/InfiniteRequestList.tsx` | 488 | à faire |
| `settings/_components/TrackerStatsManagement.tsx` | 451 | à faire |
| `settings/_components/UserGroupManagement.tsx` | 444 | à faire |
| `docker/_components/ContainerDetails.tsx` | 441 | à faire |
| `components/global/ProwlarrSearch.tsx` | ? | à faire |
| `media/[id]/page.tsx` | ? | à faire |

### Priorisation suggérée

1. **`stats/page.tsx`** — server component principal, sûrement surtout de la data fetching à isoler.
2. **`settings/_components/RoleEditor.tsx`** — pattern similaire à `UserManagement`.
3. **`requests/list/InfiniteRequestList.tsx`** — infinite scroll + filtres, utile à pattern-iser.
4. **`global/ProwlarrSearch.tsx`** — utilisé dans plusieurs pages, ROI partagé.
5. **`media/[id]/page.tsx`** — page complexe mais très scoped.
6. **Autres settings** — à traiter après.

## 4. Règles de validation

À chaque phase :
- ✅ `npx tsc --noEmit` (aucune nouvelle erreur).
- ✅ Imports sans références inutilisées (ou lint warnings tolérés si hors scope).
- ✅ Aucun changement de comportement (handlers, API, UI).
- ✅ Commit atomique par sous-phase avec message descriptif `refactor(phaseX.Y.Z): …`.

## 5. Erreurs connues non liées

- `app/api/smb/download/route.ts:58` — `Property 'abort' does not exist on type 'Readable'` — préexistant, hors scope.
