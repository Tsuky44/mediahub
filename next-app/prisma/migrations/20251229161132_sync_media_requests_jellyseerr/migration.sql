/*
  Warnings:

  - You are about to alter the column `status` on the `media_requests` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "media_type" TEXT NOT NULL,
    "tmdb_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "external_id" TEXT,
    "metadata" TEXT,
    "notes" TEXT,
    "requested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_on_emby" BOOLEAN NOT NULL DEFAULT false,
    "emby_item_id" TEXT,
    "requester_name" TEXT,
    "requester_email" TEXT,
    CONSTRAINT "media_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_requests" ("created_at", "description", "external_id", "id", "media_type", "metadata", "notes", "processed_at", "requested_at", "status", "title", "tmdb_id", "updated_at", "user_id") SELECT "created_at", "description", "external_id", "id", "media_type", "metadata", "notes", "processed_at", "requested_at", "status", "title", "tmdb_id", "updated_at", "user_id" FROM "media_requests";
DROP TABLE "media_requests";
ALTER TABLE "new_media_requests" RENAME TO "media_requests";
CREATE UNIQUE INDEX "media_requests_external_id_key" ON "media_requests"("external_id");
CREATE INDEX "media_requests_user_id_status_idx" ON "media_requests"("user_id", "status");
CREATE INDEX "media_requests_media_type_status_idx" ON "media_requests"("media_type", "status");
CREATE INDEX "media_requests_tmdb_id_idx" ON "media_requests"("tmdb_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
