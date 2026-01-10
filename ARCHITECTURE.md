# Documentation Technique - Système de Statistiques Emby

Ce système remplace Jellystat par une solution intégrée à Next.js, utilisant Prisma pour le stockage et les WebSockets pour le suivi en temps réel.

## Architecture

Le système est composé de trois parties principales :

1.  **Base de données (SQLite/Prisma)** : Stocke les instances Emby, les sessions en direct et l'historique de lecture.
2.  **Tracker (Script Node.js)** : Un script autonome qui se connecte aux WebSockets de chaque instance Emby configurée pour suivre l'activité en temps réel.
3.  **Interface Dashboard (Next.js)** : Affiche les statistiques basées sur les données collectées.

## Installation du Tracker

Le tracker doit tourner en permanence pour collecter les données.

```bash
cd next-app
# Installation des dépendances
npm install

# Lancer le tracker avec tsx
npx tsx scripts/emby-tracker.ts
```

Il est recommandé d'utiliser un gestionnaire de processus comme **PM2** :

```bash
pm2 start "npx tsx scripts/emby-tracker.ts" --name emby-tracker
```

## Migration depuis Jellystat

Un script est fourni pour migrer l'historique depuis une base de données Jellystat (PostgreSQL).

1.  Configurez les variables d'environnement dans le fichier `.env` :
    - `JELLYSTAT_DB_HOST`
    - `JELLYSTAT_DB_USER`
    - `JELLYSTAT_DB_PASSWORD`
    - `JELLYSTAT_DB_NAME`
2.  Exécutez la migration :
    ```bash
    npx tsx scripts/migrate-jellystat.ts
    ```

## Robustesse et Fonctionnalités

-   **Multi-instances** : Le tracker récupère la liste des instances depuis la base de données et gère une connexion par instance.
-   **Fallback HTTP** : En cas de déconnexion WebSocket, le système effectue un polling HTTP toutes les 5 minutes.
-   **Nettoyage automatique** : Les sessions "fantômes" sont nettoyées après 5 minutes d'inactivité.
-   **Calcul précis** : La durée de lecture est calculée en cumulant le temps réel, évitant les erreurs si l'utilisateur met en pause ou change de position dans la vidéo.

## Structure des données

Les logs d'activité sont stockés dans la table `EmbyActivityLog` avec les champs suivants :
- `instanceId` : ID de l'instance Emby.
- `playDuration` : Durée réelle de lecture en secondes.
- `mediaInfo` : JSON contenant les détails (saison, épisode, série, etc.).
