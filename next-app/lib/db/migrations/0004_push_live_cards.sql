-- Notifications push vivantes : verbosité par appareil + état partagé des cartes.

-- Volume de notifications voulu sur cet appareil : 'all' | 'steps' | 'final'.
-- iOS n'honore ni `silent` ni `renotify` : chaque push y vibre, d'où le besoin
-- de pouvoir réduire le volume appareil par appareil.
ALTER TABLE "push_subscriptions" ADD COLUMN "verbosity" TEXT NOT NULL DEFAULT 'all';

-- Une ligne = une carte suivie (un média, ou une saison).
CREATE TABLE IF NOT EXISTS "push_live_cards" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	"tag" TEXT NOT NULL,
	"tmdb_id" TEXT NOT NULL,
	"media_type" TEXT NOT NULL,
	"season_number" INTEGER,
	"step" TEXT NOT NULL,
	"last_progress_sent" INTEGER,
	"last_sent_at" INTEGER,
	"snapshot" TEXT NOT NULL,
	"created_at" INTEGER NOT NULL,
	"updated_at" INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_live_cards_tag_unique" ON "push_live_cards" ("tag");
CREATE INDEX IF NOT EXISTS "push_live_cards_updated_idx" ON "push_live_cards" ("updated_at");
