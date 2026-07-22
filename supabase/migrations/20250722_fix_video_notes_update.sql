-- =============================================================
-- Fix: Add missing UPDATE policy for video_notes
-- Without this, assignNoteToGroup() silently fails on Supabase
-- =============================================================

CREATE POLICY "video_notes_update"
  ON video_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
