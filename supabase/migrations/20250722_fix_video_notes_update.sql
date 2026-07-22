-- =============================================================
-- Fix: Add missing UPDATE policy for video_notes
-- Without this, assignNoteToGroup() silently fails on Supabase
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'video_notes_update'
      AND tablename = 'video_notes'
  ) THEN
    CREATE POLICY "video_notes_update"
      ON video_notes FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
