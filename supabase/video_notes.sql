CREATE TABLE IF NOT EXISTS video_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  "timestamp" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_notes_video ON video_notes(video_id);

ALTER TABLE video_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_notes_select" ON video_notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "video_notes_insert" ON video_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_notes_delete" ON video_notes FOR DELETE USING (user_id = auth.uid());
