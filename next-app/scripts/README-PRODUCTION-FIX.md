# Correction des erreurs de base de données en production

## Problèmes identifiés

Les erreurs suivantes apparaissent dans les logs de production :

1. **Table manquante** : `notification_deliveries`
2. **Table manquante** : `settings` 
3. **Colonne manquante** : `email_verified` dans la table `users`
4. **Colonnes manquantes** : `discord_user_id`, `discord_webhook`, `custom_webhook`, `whatsapp_number`

## Solution

### Étape 1: Transférer les scripts sur le serveur

Copiez les fichiers suivants sur votre serveur de production :
- `fix-production-server.sh` (pour Linux)
- `fix-production-server.ps1` (pour Windows)

### Étape 2: Exécuter le script correct

#### Pour serveur Linux :
```bash
chmod +x fix-production-server.sh
./fix-production-server.sh
```

#### Pour serveur Windows :
```powershell
.\fix-production-server.ps1
```

### Étape 3: Vérifier les résultats

1. Attendre 30 secondes que le container redémarre
2. Vérifier les logs : `docker logs mediahub-app --tail 50`
3. Accéder à l'application pour vérifier que les erreurs ont disparu

## Ce que fait le script

Le script effectue les actions suivantes :

1. **Crée la table `settings`** avec la structure correcte
2. **Crée la table `notification_events`** avec tous les indexes nécessaires
3. **Crée la table `notification_deliveries`** avec tous les indexes nécessaires
4. **Ajoute les colonnes manquantes** dans la table `users` :
   - `email_verified`
   - `discord_user_id`
   - `discord_webhook`
   - `custom_webhook`
   - `whatsapp_number`
5. **Redémarre le container** pour appliquer les changements

## Si les erreurs persistent

Si après avoir exécuté le script vous voyez encore des erreurs :

1. Vérifiez que le container est bien nommé `mediahub-app`
2. Vérifiez que la base de données est bien à `/app/data/db/dev.db`
3. Exécutez le script une deuxième fois
4. Contactez-moi avec les logs exacts

## Dépannage manuel

Si le script ne fonctionne pas, vous pouvez exécuter les commandes manuellement :

```bash
# Vérifier les tables existantes
docker exec mediahub-app sqlite3 /app/data/db/dev.db ".tables"

# Vérifier la structure d'une table
docker exec mediahub-app sqlite3 /app/data/db/dev.db ".schema settings"

# Créer manuellement la table settings
docker exec mediahub-app sqlite3 /app/data/db/dev.db "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT, category TEXT DEFAULT 'general' NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);"
```
