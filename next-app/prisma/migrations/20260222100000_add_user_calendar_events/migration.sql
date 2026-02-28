-- CreateTable
CREATE TABLE "user_calendar_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "media_type" TEXT NOT NULL,
    "tmdb_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "release_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_calendar_events_user_id_release_date_idx" ON "user_calendar_events"("user_id", "release_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_calendar_events_user_id_tmdb_id_media_type_key" ON "user_calendar_events"("user_id", "tmdb_id", "media_type");
