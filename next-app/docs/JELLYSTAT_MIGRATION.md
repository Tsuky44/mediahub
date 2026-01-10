# Architecture de Suivi des Statistiques Emby

Ce document décrit la nouvelle architecture de collecte de statistiques, remplaçant Jellystats.

## 1. Vue d'ensemble

Le système se compose de trois composants principaux :
1.  **Tracker Service (`scripts/emby-tracker.ts`)** : Un processus Node.js autonome qui maintient une connexion WebSocket persistante avec Emby.
2.  **Base de Données (SQLite/Prisma)** : Stockage des sessions en temps réel et de l'historique.
3.  **Next.js App** : Interface utilisateur pour visualiser les données (à implémenter dans le dashboard).

## 2. Base de Données

Deux nouvelles tables ont été ajoutées via Prisma :

### `EmbyLiveSession`
Stocke l'état actuel des sessions actives. Cette table est mise à jour en temps réel.
- Utilisée pour : Afficher "En cours de lecture" sur le dashboard.
- Nettoyage : Les entrées sont supprimées dès que la session se termine.

### `EmbyActivityLog`
Stocke l'historique complet des sessions terminées.
- **Précision** : Le champ `playDuration` contient le temps de visionnage *effectif* (hors pauses).
- **Structure** :
  - `embyUserId` : ID unique de l'utilisateur Emby.
  - `playDuration` : Durée en secondes.
  - `totalDuration` : Durée totale du média (Ticks).
  - `mediaInfo` : JSON contenant saison, épisode, etc.

## 3. Logique de Tracking (Intelligent)

Le script de tracking utilise un algorithme de détection d'état pour calculer le temps précis :

1.  **Connexion** : WebSocket sur `/embywebsocket`.
2.  **Boucle de message** : Réception des messages `Sessions` (état global).
3.  **Calcul Différentiel** :
    - Si l'état passe de `Playing` à `Playing` : On ajoute le temps écoulé (`Delta`) au compteur `accumulatedDuration`.
    - Si l'état passe à `Paused` : On arrête le compteur.
    - Si la session disparaît : On sauvegarde le total dans `EmbyActivityLog`.

## 4. Déploiement et Migration

### Prérequis
- Node.js 18+
- Accès à la base de données SQLite (`dev.db`).

### Installation
1.  Installer les dépendances :
    ```bash
    npm install ws
    npm install -D tsx @types/ws
    ```
2.  Mettre à jour la base de données :
    ```bash
    npx prisma db push
    ```

### Lancement du Tracker
Pour lancer le service de statistiques en arrière-plan :

```bash
# En développement
npx tsx scripts/emby-tracker.ts

# En production (avec PM2 recommandé)
pm2 start "npx tsx scripts/emby-tracker.ts" --name emby-tracker
```

### Migration depuis Jellystats
Les données existantes de Jellystats sont dans une autre base de données. Pour importer l'historique :
1.  Exporter les données de la table `jf_playback_activity` de Jellystats.
2.  Créer un script de mappage vers `EmbyActivityLog`.
    - `UserId` -> `embyUserId`
    - `PlaybackDuration` -> `playDuration`
    - `ActivityDateInserted` -> `startTime`

## 5. Configuration (.env)

Assurez-vous que les variables suivantes sont définies :

```env
EMBY_URL="http://votre-ip:8096"
EMBY_API_KEY="votre-api-key"
DATABASE_URL="file:./prisma/dev.db"
```
