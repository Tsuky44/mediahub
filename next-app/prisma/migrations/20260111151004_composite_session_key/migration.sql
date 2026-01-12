/*
  Warnings:

  - Added the required column `instance_id` to the `file_shares` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `media_availability_index` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `media_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `watch_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `instance_id` to the `watch_later` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "instances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "emby_url" TEXT NOT NULL,
    "emby_api_key" TEXT NOT NULL,
    "jellyseerr_url" TEXT,
    "jellyseerr_api_key" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "emby_live_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" INTEGER NOT NULL DEFAULT 1,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "client" TEXT,
    "device" TEXT,
    "device_id" TEXT,
    "app_version" TEXT,
    "item_id" TEXT,
    "item_name" TEXT,
    "item_type" TEXT,
    "runtime_ticks" BIGINT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playback_position" BIGINT
);

-- CreateTable
CREATE TABLE "emby_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" INTEGER NOT NULL DEFAULT 1,
    "emby_user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" DATETIME,
    "play_duration" INTEGER NOT NULL DEFAULT 0,
    "total_duration" BIGINT,
    "client" TEXT,
    "device" TEXT,
    "device_id" TEXT,
    "ip_address" TEXT,
    "media_info" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_file_shares" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_shares_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_file_shares" ("created_at", "expires_at", "file_path", "id", "token") SELECT "created_at", "expires_at", "file_path", "id", "token" FROM "file_shares";
DROP TABLE "file_shares";
ALTER TABLE "new_file_shares" RENAME TO "file_shares";
CREATE UNIQUE INDEX "file_shares_token_key" ON "file_shares"("token");
CREATE TABLE "new_media_availability_index" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instance_id" INTEGER NOT NULL,
    "tmdb_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "availability_data" TEXT,
    "jellyseerr_status" INTEGER,
    "last_checked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "media_availability_index_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_availability_index" ("availability_data", "created_at", "id", "is_available", "jellyseerr_status", "last_checked_at", "media_type", "tmdb_id", "updated_at") SELECT "availability_data", "created_at", "id", "is_available", "jellyseerr_status", "last_checked_at", "media_type", "tmdb_id", "updated_at" FROM "media_availability_index";
DROP TABLE "media_availability_index";
ALTER TABLE "new_media_availability_index" RENAME TO "media_availability_index";
CREATE INDEX "media_availability_index_media_type_is_available_idx" ON "media_availability_index"("media_type", "is_available");
CREATE UNIQUE INDEX "media_availability_index_tmdb_id_instance_id_key" ON "media_availability_index"("tmdb_id", "instance_id");
CREATE TABLE "new_media_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "instance_id" INTEGER NOT NULL,
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
    "requester_avatar" TEXT,
    CONSTRAINT "media_requests_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "media_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media_requests" ("created_at", "description", "emby_item_id", "external_id", "id", "is_on_emby", "media_type", "metadata", "notes", "processed_at", "requested_at", "requester_email", "requester_name", "status", "title", "tmdb_id", "updated_at", "user_id") SELECT "created_at", "description", "emby_item_id", "external_id", "id", "is_on_emby", "media_type", "metadata", "notes", "processed_at", "requested_at", "requester_email", "requester_name", "status", "title", "tmdb_id", "updated_at", "user_id" FROM "media_requests";
DROP TABLE "media_requests";
ALTER TABLE "new_media_requests" RENAME TO "media_requests";
CREATE UNIQUE INDEX "media_requests_external_id_key" ON "media_requests"("external_id");
CREATE INDEX "media_requests_user_id_status_idx" ON "media_requests"("user_id", "status");
CREATE INDEX "media_requests_media_type_status_idx" ON "media_requests"("media_type", "status");
CREATE INDEX "media_requests_tmdb_id_idx" ON "media_requests"("tmdb_id");
CREATE TABLE "new_notifications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "media_id" TEXT,
    "media_type" TEXT,
    "poster_path" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_notifications" ("created_at", "id", "is_read", "link", "media_id", "media_type", "message", "poster_path", "title", "type", "user_id") SELECT "created_at", "id", "is_read", "link", "media_id", "media_type", "message", "poster_path", "title", "type", "user_id" FROM "notifications";
DROP TABLE "notifications";
ALTER TABLE "new_notifications" RENAME TO "notifications";
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instance_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "type" TEXT NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'general',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "settings_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_settings" ("created_at", "group", "id", "key", "type", "updated_at", "value") SELECT "created_at", "group", "id", "key", "type", "updated_at", "value" FROM "settings";
DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE UNIQUE INDEX "settings_key_instance_id_key" ON "settings"("key", "instance_id");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instance_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "password" TEXT,
    "image" TEXT,
    "emby_user_id" TEXT,
    "jellyseerr_user_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "role_version" INTEGER NOT NULL DEFAULT 0,
    "has_seen_welcome" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "email", "emailVerified", "emby_user_id", "id", "image", "jellyseerr_user_id", "name", "password", "role", "updated_at") SELECT "created_at", "email", "emailVerified", "emby_user_id", "id", "image", "jellyseerr_user_id", "name", "password", "role", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_instance_id_key" ON "users"("email", "instance_id");
CREATE UNIQUE INDEX "users_emby_user_id_instance_id_key" ON "users"("emby_user_id", "instance_id");
CREATE TABLE "new_watch_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "instance_id" INTEGER NOT NULL,
    "emby_user_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "item_type" TEXT,
    "item_name" TEXT,
    "series_name" TEXT,
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "plays" INTEGER NOT NULL DEFAULT 1,
    "played_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "client" TEXT,
    "device" TEXT,
    "episode_number" INTEGER,
    "ip_address" TEXT,
    "play_method" TEXT,
    "season_name" TEXT,
    "session_id" TEXT,
    "user_name" TEXT,
    CONSTRAINT "watch_events_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "watch_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_watch_events" ("created_at", "duration_minutes", "emby_user_id", "id", "item_id", "item_name", "item_type", "played_at", "plays", "series_name", "updated_at", "user_id") SELECT "created_at", "duration_minutes", "emby_user_id", "id", "item_id", "item_name", "item_type", "played_at", "plays", "series_name", "updated_at", "user_id" FROM "watch_events";
DROP TABLE "watch_events";
ALTER TABLE "new_watch_events" RENAME TO "watch_events";
CREATE UNIQUE INDEX "watch_events_emby_user_id_item_id_played_at_key" ON "watch_events"("emby_user_id", "item_id", "played_at");
CREATE TABLE "new_watch_later" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "media_id" TEXT NOT NULL,
    "tmdb_id" TEXT,
    "media_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "poster_path" TEXT,
    "is_emby_item" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "watch_later_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "watch_later_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_watch_later" ("created_at", "id", "is_emby_item", "media_id", "media_type", "poster_path", "title", "tmdb_id", "user_id") SELECT "created_at", "id", "is_emby_item", "media_id", "media_type", "poster_path", "title", "tmdb_id", "user_id" FROM "watch_later";
DROP TABLE "watch_later";
ALTER TABLE "new_watch_later" RENAME TO "watch_later";
CREATE UNIQUE INDEX "watch_later_user_id_media_id_media_type_key" ON "watch_later"("user_id", "media_id", "media_type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "instances_name_key" ON "instances"("name");

-- CreateIndex
CREATE UNIQUE INDEX "instances_slug_key" ON "instances"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "emby_live_sessions_session_id_instance_id_key" ON "emby_live_sessions"("session_id", "instance_id");

-- CreateIndex
CREATE INDEX "emby_activity_logs_emby_user_id_idx" ON "emby_activity_logs"("emby_user_id");

-- CreateIndex
CREATE INDEX "emby_activity_logs_start_time_idx" ON "emby_activity_logs"("start_time");
