-- Custom SQL migration file, put your code below! --
-- Fix imported Tautulli sessions: use started_at + duration_ms as stopped_at
-- Tautulli's stopped timestamp represents wall-clock time which can span days/months
-- if user paused/resumed, causing inflated concurrent stream counts
UPDATE sessions
SET stopped_at = started_at + (duration_ms * interval '1 millisecond')
WHERE external_session_id IS NOT NULL
  AND duration_ms IS NOT NULL
  AND started_at IS NOT NULL;
