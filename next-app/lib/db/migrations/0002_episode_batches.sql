-- Episode Batches Migration (Anti-spam notifications)

-- episode_batches table
CREATE TABLE IF NOT EXISTS "episode_batches" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	"tmdb_id" TEXT NOT NULL,
	"season_number" INTEGER NOT NULL,
	"episodes" TEXT NOT NULL,
	"status" TEXT DEFAULT 'downloading' NOT NULL,
	"downloaded_episodes" TEXT,
	"failed_download_episodes" TEXT,
	"imported_episodes" TEXT,
	"available_episodes" TEXT,
	"created_at" INTEGER NOT NULL,
	"updated_at" INTEGER NOT NULL
);

-- Indexes for episode_batches
CREATE INDEX IF NOT EXISTS "episode_batches_tmdb_season_idx" ON "episode_batches" ("tmdb_id", "season_number");
CREATE INDEX IF NOT EXISTS "episode_batches_status_idx" ON "episode_batches" ("status");
