-- AlterTable
ALTER TABLE "users" ADD COLUMN "jellyfin_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN "plex_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_jellyfin_user_id_key" ON "users"("jellyfin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_plex_user_id_key" ON "users"("plex_user_id");
