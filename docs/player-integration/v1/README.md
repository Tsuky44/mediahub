# API d'intégration du lecteur, version 1

Contrat entre MediaHub et Onyx pour les demandes de médias. Les exemples de
chaque message sont dans `examples/`. `scripts/verify-player-api.ts`
(dans `next-app/`) rejoue l'essentiel contre une base jetable.

Base : `{MediaHub}/api/integrations/player/v1`. Le préfixe `v1` ne change pas de
forme : un ajout de champ est compatible, toute rupture passera en `v2`.

## Authentification

Chaque appel porte :

| En-tête | Valeur |
|---|---|
| `Authorization` | `Bearer <PLAYER_INTEGRATION_API_KEY>` (variable d'environnement de MediaHub) |
| `X-Player-Username` | nom ou e-mail du compte MediaHub de l'utilisateur d'Onyx |
| `X-Player-Id` | id stable du compte Onyx (`user.id`), de préférence au nom : le compte MediaHub lié (`users.onyx_user_id`) est retrouvé par cet id |

Sans clé valide : `401`. Les droits sont ceux du rôle du compte MediaHub
retrouvé par `X-Player-Id` (liaison créée par la connexion avec Onyx, voir
`onyx-login-contract.md`), à défaut par `X-Player-Username` (CASL, comme dans
l'interface). Un compte déjà lié à un autre id Onyx n'est jamais retrouvé par un
homonyme. Un compte inconnu est traité comme un compte sans rôle (`read Media`, `create MediaRequest`), sans
demandes à lui.

Le message `error` est en français et prêt à afficher.

Erreur : `{ "error": "message", "code": "unauthorized|forbidden|not_found|bad_request|unavailable|conflict|error" }`.

## Routes

| Méthode et chemin | Droit requis | Rôle |
|---|---|---|
| `GET /ping` | clé valide | Vérifie la clé, rend version, fonctions et droits du compte (`ping.json`) |
| `GET /catalog?type=&query=&page=` | `read Media` | Tendances ou recherche TMDB, statut de chaque titre |
| `GET /media/:tmdbId?type=movie\|tv` | `read Media` | Fiche d'un titre et état de ses saisons |
| `GET /availability/:tmdbId?type=` | `read Media` | Disponibilité, saisons, raison d'attente (`availability.json`) |
| `GET /progress/:tmdbId?type=` | `read Media` | Téléchargement et import en cours du titre, ceux des widgets de la fiche (Radarr, Sonarr ou sorraa) : `{ active, downloading, download: { progress, timeleft, speed, size, sizeLeft, releaseTitle } \| null, imports: [{ releaseName, progress, files, filesDone, size, sizeDone, sizeLeft, current, failed, message }] }` |
| `POST /availability` | `read Media` | Même chose pour 100 titres maximum (`availability_batch_request.json`, réponse `availability_batch.json`) |
| `POST /requests` | `create MediaRequest` | Crée une demande (`request_create.json` puis `request_create_response.json`) |
| `GET /requests?scope=mine\|all&type=&limit=&before=` | `mine` : `read` ou `create MediaRequest` ; `all` : `read MediaRequest` | Liste, plus récente d'abord, paginée par `nextBefore` (`requests_list.json`) |
| `GET /requests/:id` | propriétaire, ou `read MediaRequest` | Détail avec disponibilité par saison (`request_detail.json`) |
| `PATCH /requests/:id` | `update MediaRequest` | Approuver ou refuser (`request_moderate.json`) |
| `DELETE /requests/:id` | `delete MediaRequest` | Supprime la demande dans MediaHub (Radarr et Sonarr ne sont pas touchés) |
| `GET /requests/feed?after=<curseur>&limit=` | `read MediaRequest` | Nouvelles demandes de tous les comptes, du plus ancien au plus récent (`request_feed.json`). `cursor` est à repasser dans `after`. Sans `after`, la réponse ne contient que le curseur courant (`requests` vide). Sondage de secours si le webhook manque |
| `POST /webhook/test` | `manage_settings Settings` | Envoie un évènement `webhook.test` à Onyx |

`catalog` et `media/:tmdbId` rendent les mêmes réponses que
`/api/integrations/player/catalog` et `.../media/:id` (anciens chemins gardés).

### Demande

`POST /requests` accepte `tmdbId`, `mediaType` (`movie`|`tv`), `title`,
`posterPath`, `seasons` (nombre ou liste). Même logique que `POST /api/request`
(Radarr/Sonarr, notifications, journal). Un film déjà demandé est remis à jour ;
pour une série il y a une ligne par saison, une saison déjà demandée est
ignorée. Réponse `201` si des lignes ont été créées, `200` sinon (les lignes
existantes sont rendues). Erreurs possibles : `400` paramètres, `403`,
`503` Radarr/Sonarr/TMDB non configuré, `404` série introuvable.

Objet `request` (listes, détail, création, évènements) :

| Champ | Type | Sens |
|---|---|---|
| `id` | entier | identifiant de la demande MediaHub |
| `mediaType` | `movie`\|`tv` | |
| `tmdbId` | entier | |
| `title`, `posterPath` | texte, texte ou null | |
| `seasons` | entiers | saison de la ligne (vide pour un film) |
| `status` | texte | `pending`, `approved`, `processing`, `partial`, `available`, `declined` |
| `statusCode` | entier | 1, 2, 3, 4, 5 ou 6 (refusée) |
| `requestedAt`, `updatedAt` | ISO 8601 | |
| `progress` | nombre ou null | réservé, toujours `null` en v1 |
| `awaitingRelease` | booléen | le titre n'est pas encore sorti |
| `waiting` | objet ou null | `{ message, releaseDate }`: pourquoi rien ne se télécharge encore, en français, prêt à afficher |
| `note` | texte ou null | motif du refus |
| `requester` | texte | nom du demandeur (présent sauf dans `POST /requests`) |

`waiting` n'est calculé que pour les demandes pas encore partielles (statut < 4).

### Modération

`PATCH /requests/:id` avec `{ "action": "approve" }` ou
`{ "action": "decline", "reason": "..." }`. Une demande déjà partielle ou
disponible rend `409`. Le refus ne retire rien de Radarr ou Sonarr. Le statut
numérique `6` n'existe que dans cette API et dans la liste de l'interface.

## Évènements sortants (MediaHub vers Onyx)

Configuration côté MediaHub : variable `ONYX_WEBHOOK_URL` (ou réglage
`onyx_webhook_url`), URL complète de la route d'Onyx qui reçoit les évènements.
La clé est la même `PLAYER_INTEGRATION_API_KEY`. Sans URL, rien n'est envoyé. Côté Onyx la route est `POST {Onyx}/api/integrations/mediahub/events` (c'est la valeur à mettre).

`POST <ONYX_WEBHOOK_URL>`, corps JSON :

```json
{ "id": "uuid", "event": "request.created", "apiVersion": 1, "occurredAt": "ISO 8601", "data": { } }
```

| En-tête | Valeur |
|---|---|
| `Authorization` | `Bearer <PLAYER_INTEGRATION_API_KEY>` |
| `X-MediaHub-Event` | nom de l'évènement |
| `X-MediaHub-Delivery` | même `id` que le corps, pour dédoublonner |
| `X-MediaHub-Signature` | `sha256=` + HMAC-SHA256 du corps brut, clé = la clé d'intégration |

Onyx répond `2xx`. MediaHub réessaie 3 fois (0,5 s puis 1 s) sur erreur réseau,
5xx, 408 et 429, pas sur les autres 4xx. Un évènement perdu est rattrapé par
`GET /requests/feed` et `GET /requests`.

| Évènement | Quand | `data` |
|---|---|---|
| `webhook.test` | `POST /webhook/test` | `{ "message": "..." }` |
| `request.created` | demande créée via l'API | `{ request, requesterId }` (`event_request_created.json`) |
| `request.status_changed` | import Radarr/Sonarr, approbation, refus | `{ request, previousStatus, requesterId }` (`event_request_status_changed.json`) |
| `request.deleted` | suppression via l'API | `{ request, requesterId }` |
| `media.imported` | import fini par Radarr ou Sonarr | `{ tmdbId, mediaType, seasons?, paths }` (`event_media_imported.json`) |

`paths` sont les chemins vus par Radarr/Sonarr (peut être vide si l'évènement
Radarr/Sonarr n'en donne pas). Les créations faites depuis l'interface web de
MediaHub ne déclenchent pas `request.created` : seule l'API v1 le fait.
Les changements de statut dus à la synchronisation de l'interface ne sont pas
émis non plus ; `media.imported` et `request.status_changed` partent des
webhooks Radarr/Sonarr.
