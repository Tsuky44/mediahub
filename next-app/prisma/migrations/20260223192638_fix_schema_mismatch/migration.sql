/*
  Warnings:

  - You are about to drop the `_PermissionToRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserDirectPermissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `category` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `is_system` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `roles` table. All the data in the column will be lost.
  - You are about to drop the column `role_version` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_group_id,user_id]` on the table `user_group_members` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `permissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX IF EXISTS "_PermissionToRole_B_index";

-- DropIndex
DROP INDEX IF EXISTS "_PermissionToRole_AB_unique";

-- DropIndex
DROP INDEX IF EXISTS "_UserDirectPermissions_B_index";

-- DropIndex
DROP INDEX IF EXISTS "_UserDirectPermissions_AB_unique";

-- DropIndex
DROP INDEX IF EXISTS "user_group_members_user_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "_PermissionToRole";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE IF EXISTS "_UserDirectPermissions";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "conditions" TEXT,
    "role_id" TEXT NOT NULL,
    CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- INSERT INTO "new_permissions" ("id") SELECT "id" FROM "permissions"; -- Commented out to avoid NOT NULL constraint violation (old permissions are incompatible)
DROP TABLE "permissions";
ALTER TABLE "new_permissions" RENAME TO "permissions";
CREATE TABLE "new_roles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_roles" ("created_at", "description", "id", "name", "updated_at") SELECT "created_at", "description", "id", "name", "updated_at" FROM "roles";
DROP TABLE "roles";
ALTER TABLE "new_roles" RENAME TO "roles";
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "password" TEXT,
    "image" TEXT,
    "emby_user_id" TEXT,
    "jellyseerr_user_id" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "role_id" TEXT,
    "has_seen_welcome" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("created_at", "email", "emailVerified", "emby_user_id", "has_seen_welcome", "id", "image", "jellyseerr_user_id", "name", "password", "role", "role_id", "updated_at") SELECT "created_at", "email", "emailVerified", "emby_user_id", "has_seen_welcome", "id", "image", "jellyseerr_user_id", "name", "password", "role", "role_id", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_emby_user_id_key" ON "users"("emby_user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_group_members_user_group_id_user_id_key" ON "user_group_members"("user_group_id", "user_id");
