# MediaHub

Application Next.js (App Router) de gestion de médiathèque : demandes de médias,
téléchargements qBittorrent/Prowlarr, serveurs Emby/Jellyfin/Plex, Docker/Unraid,
notifications (WhatsApp/Discord/Webhook/Web Push), statistiques de lecture.

Le code applicatif vit dans `next-app/`. `_backup_root/` et `_cleanup_backup/` sont
des sauvegardes : les ignorer.

## Carte du projet — utiliser le graphe avant de scanner

Une carte de connaissances du projet est générée par **graphify** dans `graphify-out/` :

- `graphify-out/graph.json` — le graphe (~4000 nœuds, ~9600 arêtes, ~260 communautés)
- `graphify-out/GRAPH_REPORT.md` — rapport lisible : god nodes, communautés, ponts
- `graphify-out/graph.html` — visualisation interactive

**Avant d'explorer le code avec Glob/Grep/Read en fan-out, interroger le graphe.**
Il couvre `next-app/` (AST TypeScript + couche sémantique issue des docs).

```bash
graphify query "comment fonctionne le pipeline de notifications ?"
```

Autres commandes utiles :

```bash
graphify path "OutboxWorker" "db"
```

```bash
graphify explain "dispatch"
```

Le graphe reste le point de départ ; on retombe sur Read/Grep pour lire le détail
d'un fichier une fois le bon endroit identifié.

## Tenir la carte à jour

Après une série de modifications dans `next-app/`, reconstruire avec **ce script**,
et pas avec `graphify update` :

```bash
python graphify-out/rebuild/rebuild.py
```

Pourquoi le script et pas la commande standard — trois raisons, toutes vérifiées à
l'usage :

1. **Périmètre.** `graphify update` sans argument repart de la racine du dépôt et
   avale `_backup_root/` : le graphe passe de ~4000 à ~5500 nœuds de bruit.
2. **Couche documentaire.** Les nœuds `doc_*` / `concept_*` extraits des 7 documents
   du projet ne sont pas reconstructibles par l'extraction AST. Ils vivent dans
   `graphify-out/rebuild/build_semantic.py` et doivent être refusionnés à chaque
   rebuild, sinon ils disparaissent.
3. **Libellés.** Les identifiants de communauté ne sont pas stables d'un clustering
   à l'autre. Les libellés sont donc ancrés sur des **nœuds** dans
   `graphify-out/rebuild/label.py` (table `ANCHORS`), ce qui survit au reclustering.

Pour nommer une nouvelle zone du code : repérer un nœud caractéristique
(`graphify query` donne les identifiants) et l'ajouter à `ANCHORS`. Les communautés
sans ancre sont nommées automatiquement d'après leur répertoire dominant.

Si de nouveaux documents `.md` structurants apparaissent, les ajouter à
`build_semantic.py` avant de reconstruire.
