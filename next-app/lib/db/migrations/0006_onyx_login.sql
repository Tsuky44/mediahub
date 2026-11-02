-- Liaison durable entre un compte MediaHub et l'id stable du compte Onyx
-- (connexion avec Onyx, en-tete X-Player-Id de l'API d'integration).

ALTER TABLE "users" ADD COLUMN "onyx_user_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_onyx_user_id_unique" ON "users" ("onyx_user_id");
