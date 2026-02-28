# Instructions de déploiement

## 1. Préparation (Sur votre machine de dev)

Exécutez le script `build-release.ps1` pour créer les images Docker :
```powershell
./build-release.ps1
```

Cela va créer deux images :
- `mediahub-app:latest`
- `mediahub-tracker:latest`

Si vous devez transférer ces images sur un autre serveur sans passer par un registre en ligne (Docker Hub), vous pouvez les sauvegarder en fichiers :
```bash
docker save -o mediahub-images.tar mediahub-app:latest mediahub-tracker:latest
```

## 2. Installation (Sur le serveur de production)

1. Copiez le dossier `release` sur votre serveur.
2. Renommez `.env.example` en `.env` et modifiez les valeurs (surtout `NEXTAUTH_SECRET` et `NEXTAUTH_URL`).
3. (Si transfert manuel) Chargez les images Docker :
   ```bash
   docker load -i mediahub-images.tar
   ```
4. Lancez l'application :
   ```bash
   docker compose up -d
   ```

L'application sera accessible sur le port défini dans le `.env` (par défaut 3008).
La base de données sera créée automatiquement dans le dossier `release/data/db`.
