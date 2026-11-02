# sorraa comme gestionnaire de téléchargement

L'admin choisit, par type de média, qui télécharge : Radarr/Sonarr (`arr`, défaut) ou sorraa.

## Réglages (table `settings`, onglet Téléchargements)

| Clé | Valeur |
| --- | --- |
| `download_manager_movie` | `arr` ou `sorraa` |
| `download_manager_tv` | `arr` ou `sorraa` |
| `sorraa_url` | racine de sorraa, `/api/v1` est ajouté |
| `sorraa_api_key` | clé `srr_…` (envoyée en `Authorization: Bearer`) |
| `webhook_sorraa_secret` | secret de signature, onglet Automatisation |

Combinaisons possibles : sorraa pour tout, Radarr pour les films et sorraa pour les séries, etc.

## Abstraction

`lib/download-managers/` : interface `DownloadManager { addRequest, getAvailability }`, implémentations `arr.ts` (code historique) et `sorraa.ts`. `getDownloadManager(mediaType)` lit le réglage. Consommateurs : `createMediaRequest` (`lib/services/media-requests.ts`) et `getMediaAvailability` (`lib/services/media-status.ts`).

Côté sorraa, une demande MediaHub devient un `POST /requests` (tmdbId, saisons, `requester.ref` = id MediaHub) ; sorraa ajoute le titre, surveille les saisons et lance la recherche. `media_requests.external_id` vaut `sorraa:<id>`. Le statut se lit par `GET /availability` (médias présents dans sorraa avec ou sans demande MediaHub : états par saison, `progress`, `etaSeconds`, raison d'attente en `waiting`), en lot par `POST /availability-queries` pour la route de disponibilité en lot de l'API joueur. Repli sur `GET /requests` pour un sorraa plus ancien.

La progression (`progress`) alimente la barre et la fenêtre de statut du média (détail via `GET /grabs?active&mediaId`) et le champ `progress` (0-100) de l'API joueur ; la raison d'attente passe dans `waiting` (avec `nextAttemptAt`).

## Webhook entrant

`POST /api/webhooks/sorraa`. Dans sorraa, déclarer un webhook vers cette URL avec le secret affiché dans les réglages. Signature : `sha256=` + HMAC-SHA256(secret, `<X-Sorraa-Timestamp>.<corps>`), tolérance de 5 minutes ; sans secret configuré, tout est refusé.

| Évènement sorraa | Effet |
| --- | --- |
| `grabbed` | notification `MEDIA_GRABBED` |
| `imported`, `upgraded` | statuts des demandes (la notification de disponibilité reste faite par l'AvailabilityPoller) et `media.imported` vers Onyx avec `absolutePath` ; à défaut, `path` (relatif) est reconstruit avec le dossier racine de la version (`GET /media/{id}` et `/root-folders`) |
| `download_failed`, `import_failed` | notification `MEDIA_FAILED` |
| `request_changed` | statuts des demandes, y compris un recul |
| `health_*`, `test` | journal seulement |

Les statuts viennent de `requests[]` du payload ; chaque changement émet `request.status_changed` vers Onyx.

## Limites (volontaires)

Ces fonctions restent liées à Radarr/Sonarr et ne voient pas les médias gérés par sorraa : fenêtre de gestion du média, recherche interactive Prowlarr, imports bloqués, calendrier, suppression depuis les stats de stockage, synchronisation des demandes. Les titres inconnus de la bibliothèque sorraa valent `unknown` (sorraa lit sans appeler TMDb).

## Vérification

```
DATABASE_URL=file:./data/verify/sorraa.db npx drizzle-kit push --force
DATABASE_URL=file:./data/verify/sorraa.db npx tsx scripts/verify-sorraa.ts
```
