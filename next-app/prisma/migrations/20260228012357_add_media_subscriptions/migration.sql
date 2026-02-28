/*
  Warnings:

  - A unique constraint covering the columns `[tmdb_id,media_type]` on the table `media_availability_index` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "media_availability_index_tmdb_id_key";

-- CreateTable
CREATE TABLE "media_subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "tmdb_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "media_subscriptions_user_id_tmdb_id_media_type_key" ON "media_subscriptions"("user_id", "tmdb_id", "media_type");

-- CreateIndex
CREATE UNIQUE INDEX "media_availability_index_tmdb_id_media_type_key" ON "media_availability_index"("tmdb_id", "media_type");
