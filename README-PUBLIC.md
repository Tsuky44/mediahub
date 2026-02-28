## Installation rapide

1. Assurez-vous d'avoir Docker installé.
2. **(Important)** Authentifiez-vous pour accéder aux images privées :
   *   Générez un Token sur GitHub (Settings -> Developer settings -> Personal access tokens -> Tokens (classic)).
   *   Cochez la case `read:packages`.
   *   Connectez-vous :
       ```bash
       docker login ghcr.io -u tsuky44
       ```
       (Collez votre Token comme mot de passe)
3. Téléchargez le fichier `docker-compose.public.yml` et renommez-le en `docker-compose.yml`.
4. (Optionnel) Ouvrez le fichier pour modifier `NEXTAUTH_URL` ou le port si besoin.
5. Lancez la commande :
   ```bash
   docker compose up -d
   ```
