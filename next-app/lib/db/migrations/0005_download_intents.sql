-- Classification de l'intention de téléchargement, capturée au Grab et relue
-- à l'import. Remplace l'heuristique par fenêtre temporelle de 10 s.

CREATE TABLE IF NOT EXISTS "download_intents" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	"download_id" TEXT NOT NULL,
	"tmdb_id" TEXT NOT NULL,
	"season_number" INTEGER,
	"episode_numbers" TEXT NOT NULL,
	"release_type" TEXT,
	"release_title" TEXT,
	"classification" TEXT NOT NULL,
	"reason" TEXT,
	"air_date_utc" INTEGER,
	"created_at" INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "download_intents_download_id_unique" ON "download_intents" ("download_id");
CREATE INDEX IF NOT EXISTS "download_intents_created_idx" ON "download_intents" ("created_at");
