# Connexion à MediaHub avec un compte Onyx

Contrat entre MediaHub (fournisseur NextAuth `onyx`) et le serveur Onyx. Les
formats Onyx sont ceux de `server/handlers/auth.go`, `otp.go`,
`device_pairing.go` et `mediahub_sso.go`.

## Réglages MediaHub (admin, onglet Media)

| Clé | Rôle |
|---|---|
| `auth_onyx_enabled` | active le fournisseur (défaut : non) |
| `onyx_url` | adresse du serveur Onyx joignable depuis MediaHub |
| `auth_onyx_auto_create` | crée le compte MediaHub à la première connexion (défaut : oui) ; sinon seuls les comptes déjà liés se connectent |
| `default_role_id` | rôle des comptes créés (le premier compte de l'instance est admin) |
| `PLAYER_INTEGRATION_API_KEY` (env) | clé d'intégration, aussi utilisée pour racheter les codes SSO |

## Identité et liaison

- Id stable : `user.id` d'Onyx (entier, jamais réutilisé), stocké en texte dans
  `users.onyx_user_id` (unique, migration `0006_onyx_login.sql`).
- Une connexion Onyx connecte le compte lié à cet id ; sinon elle crée un compte
  (`<nom>@onyx.local`) si `auth_onyx_auto_create`, sinon elle est refusée.
- Aucun rapprochement par nom : un homonyme Onyx ne reprend pas un compte
  MediaHub. Un compte MediaHub existant se lie lui-même : `POST /api/user/onyx-link`
  (session MediaHub requise) avec `{username, password}` puis, si Onyx demande un
  code, `{challenge, code}`. `DELETE` délie, `GET` donne l'état. Le bloc « Onyx »
  des réglages l'expose pour le compte connecté.
- MediaHub ne garde aucune session Onyx : il ferme (`/api/auth/logout`) celle
  qu'il vient d'ouvrir.

## Flux de connexion

### Identifiant et mot de passe

1. `POST {onyx}/api/auth/login` `{username, password}`.
2. `200 {token, user}` : connecté. `401 {error, otp:{challenge, setup}}` : étape
   OTP. `401 {error}` sans `otp` : refus.
3. Étape OTP : `POST /api/auth/otp/login` `{challenge, code}` (TOTP ou code de
   secours). `401` code incorrect (l'étape reste valable), `410` étape expirée
   (retour au mot de passe). `otp.setup == true` est refusé par MediaHub :
   l'OTP imposé se configure d'abord dans l'app Onyx.

### Code d'appairage

`POST /api/auth/device/start` `{device_name:"MediaHub"}` : MediaHub affiche
`user_code`, l'utilisateur le valide dans l'app Onyx connectée, et MediaHub
interroge `POST /api/auth/device/poll` `{device_code}` (`pending`, `expired`,
`approved` avec `token` et `user`, lisible une seule fois).

### Ouvrir MediaHub depuis l'app Onyx (SSO)

1. L'app Onyx appelle `POST {onyx}/api/integrations/mediahub/sso` (session Onyx)
   et ouvre `url` dans le navigateur : `{mediahub}/api/auth/onyx/sso?code=<code>`.
2. MediaHub (`GET /api/auth/onyx/sso`) rachète le code :
   `POST {onyx}/api/integrations/mediahub/sso/redeem`, en-tête
   `Authorization: Bearer <PLAYER_INTEGRATION_API_KEY>`, corps `{code}`.
   `200 {user}`, `401` clé invalide, `410` code expiré ou déjà utilisé.
3. MediaHub résout le compte comme ci-dessus, pose le cookie de session NextAuth
   et redirige vers `/dashboard`. En cas d'échec : `/login?error=<message>`.

## Limitation des tentatives

Même limiteur que les autres fournisseurs (`lib/auth/rate-limiter.ts`) : 5 échecs
par IP et identifiant bloquent 15 minutes. L'étape OTP, l'appairage et le SSO sont
comptés par IP. L'attente d'un appairage et l'absence de compte lié ne comptent pas
comme des échecs. Côté Onyx, les limites sont par IP (10 appels / 6 s) : toutes les
connexions MediaHub arrivent de la même IP.

## Appels d'intégration : `X-Player-Id`

Onyx envoie `X-Player-Id: <user.id>` avec `X-Player-Username`. MediaHub cherche
d'abord `users.onyx_user_id`, puis le nom ou l'e-mail ; un compte lié à un autre
id Onyx n'est pas retrouvé par son nom. Voir `README.md`.

## Vérification

`DATABASE_URL=file:./data/verify/onyx-login.db npx tsx scripts/verify-onyx-login.ts`
(depuis `next-app/`, après `drizzle-kit push --force` sur la même base) joue le
contrat contre un faux serveur Onyx.
