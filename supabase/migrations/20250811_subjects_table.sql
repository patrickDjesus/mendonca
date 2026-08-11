-- =============================================================
-- Matérias personalizadas do usuário (sincronizadas com o app)
-- Rode este script no SQL Editor do Supabase Dashboard.
-- =============================================================

CREATE TABLE IF NOT EXISTS subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color_bg   TEXT NOT NULL,
  color_text TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '📚',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select" ON subjects FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subjects_insert" ON subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subjects_update" ON subjects FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "subjects_delete" ON subjects FOR DELETE USING (user_id = auth.uid());
