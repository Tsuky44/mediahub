ALTER TABLE "termination_logs" DROP CONSTRAINT IF EXISTS "termination_logs_session_id_sessions_id_fk";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_dedup_fallback_idx" ON "sessions" USING btree ("server_id","server_user_id","rating_key","started_at");
