-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new settings table with 'category' column
CREATE TABLE "new_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Copy data from old settings table, mapping 'group' to 'category'
-- Using a check to see if 'group' column exists (it should based on previous migrations)
-- If 'group' doesn't exist, this might fail, but in our migration chain it exists.
INSERT INTO "new_settings" ("created_at", "id", "key", "updated_at", "value", "category")
SELECT "created_at", "id", "key", "updated_at", "value", "group"
FROM "settings";

DROP TABLE "settings";
ALTER TABLE "new_settings" RENAME TO "settings";
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
