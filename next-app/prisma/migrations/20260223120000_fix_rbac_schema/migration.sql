-- Drop old tables that might exist from previous migrations
DROP TABLE IF EXISTS "_PermissionToRole";
DROP TABLE IF EXISTS "permissions";

-- Create new Permission table matching the schema
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conditions" TEXT,
    "role_id" TEXT NOT NULL,
    CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ensure roles table has the correct column name for isSystem
-- Since we mapped isSystem -> is_system in schema, and previous migration created is_system, no change needed.
-- However, if for some reason the DB has isSystem (camelCase), we might need to rename it.
-- But standard migration creates snake_case usually.
-- Just in case, we can try to rename if needed, but SQLite doesn't support IF EXISTS for column rename easily.
-- Assuming add_rbac ran, is_system exists.
