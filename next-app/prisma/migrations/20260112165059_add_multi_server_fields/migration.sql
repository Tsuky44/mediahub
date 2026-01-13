-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_emby_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'emby',
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
INSERT INTO "new_emby_activity_logs" ("client", "device", "device_id", "emby_user_id", "end_time", "id", "instance_id", "ip_address", "item_id", "item_name", "item_type", "media_info", "play_duration", "start_time", "total_duration", "user_name") SELECT "client", "device", "device_id", "emby_user_id", "end_time", "id", "instance_id", "ip_address", "item_id", "item_name", "item_type", "media_info", "play_duration", "start_time", "total_duration", "user_name" FROM "emby_activity_logs";
DROP TABLE "emby_activity_logs";
ALTER TABLE "new_emby_activity_logs" RENAME TO "emby_activity_logs";
CREATE INDEX "emby_activity_logs_instance_id_idx" ON "emby_activity_logs"("instance_id");
CREATE INDEX "emby_activity_logs_emby_user_id_idx" ON "emby_activity_logs"("emby_user_id");
CREATE INDEX "emby_activity_logs_start_time_idx" ON "emby_activity_logs"("start_time");
CREATE TABLE "new_emby_live_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instance_id" INTEGER NOT NULL DEFAULT 1,
    "session_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'emby',
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
    "playback_position" BIGINT,
    "accumulated_duration" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_emby_live_sessions" ("app_version", "client", "device", "device_id", "id", "instance_id", "is_paused", "item_id", "item_name", "item_type", "last_activity", "playback_position", "runtime_ticks", "session_id", "started_at", "user_id", "user_name") SELECT "app_version", "client", "device", "device_id", "id", "instance_id", "is_paused", "item_id", "item_name", "item_type", "last_activity", "playback_position", "runtime_ticks", "session_id", "started_at", "user_id", "user_name" FROM "emby_live_sessions";
DROP TABLE "emby_live_sessions";
ALTER TABLE "new_emby_live_sessions" RENAME TO "emby_live_sessions";
CREATE UNIQUE INDEX "emby_live_sessions_session_id_instance_id_key" ON "emby_live_sessions"("session_id", "instance_id");
CREATE TABLE "new_instances" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'emby',
    "emby_url" TEXT,
    "emby_api_key" TEXT,
    "plex_url" TEXT,
    "plex_token" TEXT,
    "jellyfin_url" TEXT,
    "jellyfin_api_key" TEXT,
    "jellyseerr_url" TEXT,
    "jellyseerr_api_key" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_instances" ("created_at", "emby_api_key", "emby_url", "id", "is_default", "jellyseerr_api_key", "jellyseerr_url", "name", "slug", "updated_at") SELECT "created_at", "emby_api_key", "emby_url", "id", "is_default", "jellyseerr_api_key", "jellyseerr_url", "name", "slug", "updated_at" FROM "instances";
DROP TABLE "instances";
ALTER TABLE "new_instances" RENAME TO "instances";
CREATE UNIQUE INDEX "instances_name_key" ON "instances"("name");
CREATE UNIQUE INDEX "instances_slug_key" ON "instances"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
