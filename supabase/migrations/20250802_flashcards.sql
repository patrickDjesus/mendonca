CREATE TABLE IF NOT EXISTS flashcards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  front      TEXT NOT NULL,
  back       TEXT NOT NULL,
  subject    subject_type NOT NULL,
  known      BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcards_select" ON flashcards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "flashcards_insert" ON flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcards_update" ON flashcards FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "flashcards_delete" ON flashcards FOR DELETE USING (user_id = auth.uid());
