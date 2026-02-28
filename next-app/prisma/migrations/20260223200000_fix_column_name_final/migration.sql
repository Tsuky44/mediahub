-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_roles" ("created_at", "description", "id", "name", "updated_at") SELECT "created_at", "description", "id", "name", "updated_at" FROM "roles";
DROP TABLE "roles";
ALTER TABLE "new_roles" RENAME TO "roles";
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
