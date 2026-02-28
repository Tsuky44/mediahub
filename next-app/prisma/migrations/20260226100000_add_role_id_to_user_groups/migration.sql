-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_groups_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_groups" ("created_at", "id", "name", "updated_at") SELECT "created_at", "id", "name", "updated_at" FROM "user_groups";
DROP TABLE "user_groups";
ALTER TABLE "new_user_groups" RENAME TO "user_groups";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
