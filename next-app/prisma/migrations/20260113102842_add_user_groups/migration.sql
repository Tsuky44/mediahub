-- CreateTable
CREATE TABLE "user_groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_group_members" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_group_id" TEXT NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT,
    CONSTRAINT "user_group_members_user_group_id_fkey" FOREIGN KEY ("user_group_id") REFERENCES "user_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_group_members_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_group_members_instance_id_user_id_key" ON "user_group_members"("instance_id", "user_id");
