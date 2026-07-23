-- =============================================================
-- Video Progress: sincroniza progresso de assistido entre dispositivos
-- Rode este script no SQL Editor do Supabase Dashboard
-- =============================================================

CREATE TABLE IF NOT EXISTS video_progress (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id   UUID NOT NULL,
  seconds    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id, video_id);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vp_select' AND tablename = 'video_progress'
  ) THEN
    CREATE POLICY "vp_select" ON video_progress FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vp_upsert' AND tablename = 'video_progress'
  ) THEN
    CREATE POLICY "vp_upsert" ON video_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vp_update' AND tablename = 'video_progress'
  ) THEN
    CREATE POLICY "vp_update" ON video_progress FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
