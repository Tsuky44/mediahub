-- DropIndex
DROP INDEX IF EXISTS "docker_group_members_group_id_container_name_key";

-- DropIndex
DROP INDEX IF EXISTS "emby_activity_logs_start_time_idx";

-- DropIndex
DROP INDEX IF EXISTS "emby_activity_logs_emby_user_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "emby_live_sessions_session_id_key";

-- DropIndex
DROP INDEX IF EXISTS "file_shares_token_key";

-- DropIndex
DROP INDEX IF EXISTS "media_availability_index_tmdb_id_media_type_key";

-- DropIndex
DROP INDEX IF EXISTS "media_availability_index_media_type_is_available_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "docker_group_members";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "docker_groups";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "emby_activity_logs";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "emby_live_sessions";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "file_shares";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "media_availability_index";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "daily_tracker_stats" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "tracker" TEXT NOT NULL,
    "total_uploaded" BIGINT NOT NULL DEFAULT 0,
    "total_downloaded" BIGINT NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tracker_stats_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tracker" TEXT NOT NULL,
    "total_uploaded" BIGINT NOT NULL,
    "total_downloaded" BIGINT NOT NULL,
    "uploaded_diff" BIGINT NOT NULL DEFAULT 0,
    "downloaded_diff" BIGINT NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "created_at", "details", "id", "user_id") SELECT "action", "created_at", "details", "id", "user_id" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE TABLE "new_user_group_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "user_group_id" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_group_members_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_group_members" ("id", "user_group_id", "user_id") SELECT "id", "user_group_id", "user_id" FROM "user_group_members";
DROP TABLE "user_group_members";
ALTER TABLE "new_user_group_members" RENAME TO "user_group_members";
CREATE UNIQUE INDEX "user_group_members_user_id_user_group_id_key" ON "user_group_members"("user_id", "user_group_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "daily_tracker_stats_date_idx" ON "daily_tracker_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tracker_stats_date_tracker_key" ON "daily_tracker_stats"("date", "tracker");

-- CreateIndex
CREATE INDEX "tracker_stats_logs_timestamp_idx" ON "tracker_stats_logs"("timestamp");

-- CreateIndex
CREATE INDEX "tracker_stats_logs_tracker_timestamp_idx" ON "tracker_stats_logs"("tracker", "timestamp");