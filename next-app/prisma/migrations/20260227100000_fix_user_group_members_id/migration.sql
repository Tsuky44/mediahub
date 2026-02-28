
-- Drop temporary table if it exists (cleanup from failed runs)
DROP TABLE IF EXISTS "new_user_group_members";

-- Create temporary table with INTEGER user_id
CREATE TABLE "new_user_group_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_group_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "username" TEXT,
    CONSTRAINT "user_group_members_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate data
-- Convert external IDs (or already-converted string IDs) to internal User IDs
-- Use GROUP BY to avoid duplicates if a user has multiple external IDs mapping to the same user in the same group
INSERT INTO "new_user_group_members" ("user_group_id", "user_id", "username")
SELECT 
    ugm.user_group_id, 
    u.id, 
    MAX(ugm.username) as username
FROM "user_group_members" ugm
JOIN "users" u ON (
    u.emby_user_id = ugm.user_id OR 
    u.jellyfin_user_id = ugm.user_id OR 
    u.plex_user_id = ugm.user_id OR 
    u.jellyseerr_user_id = ugm.user_id OR
    CAST(u.id AS TEXT) = ugm.user_id
)
GROUP BY ugm.user_group_id, u.id;

-- Drop old table
DROP TABLE "user_group_members";

-- Rename new table
ALTER TABLE "new_user_group_members" RENAME TO "user_group_members";

-- Ensure index is gone before recreating (just in case)
DROP INDEX IF EXISTS "user_group_members_user_group_id_user_id_key";

-- Recreate index
CREATE UNIQUE INDEX "user_group_members_user_group_id_user_id_key" ON "user_group_members"("user_group_id", "user_id");
