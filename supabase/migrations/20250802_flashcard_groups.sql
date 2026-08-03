-- =============================================================
-- Flash Card Groups
-- Rode este script no SQL Editor do Supabase Dashboard (após o
-- script 20250802_flashcards.sql, que cria a tabela flashcards).
-- =============================================================

-- 1. Tabela de grupos de flash cards
CREATE TABLE IF NOT EXISTS flashcard_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  subject     subject_type NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_groups_user    ON flashcard_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_groups_subject ON flashcard_groups(subject);

-- 2. Relaciona cards ao grupo (cards sem grupo ficam NULL = "cards soltos")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE flashcards ADD COLUMN group_id UUID REFERENCES flashcard_groups(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flashcards_group ON flashcards(group_id);

-- 3. Row Level Security
ALTER TABLE flashcard_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcard_groups_select" ON flashcard_groups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "flashcard_groups_insert" ON flashcard_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcard_groups_update" ON flashcard_groups FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "flashcard_groups_delete" ON flashcard_groups FOR DELETE USING (user_id = auth.uid());
