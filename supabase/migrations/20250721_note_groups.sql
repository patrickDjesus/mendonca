-- =============================================================
-- Note Groups + Note ↔ Group association
-- Rode este script no SQL Editor do Supabase Dashboard
-- =============================================================

-- 1. Tabela de grupos personalizados de anotações
CREATE TABLE IF NOT EXISTS note_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id   UUID NOT NULL,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Adiciona group_id na tabela video_notes (nullable — notas sem grupo ficam NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_notes' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE video_notes ADD COLUMN group_id UUID REFERENCES note_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_note_groups_user_video
  ON note_groups (user_id, video_id);

CREATE INDEX IF NOT EXISTS idx_video_notes_group
  ON video_notes (group_id);

-- 4. Row Level Security
ALTER TABLE note_groups ENABLE ROW LEVEL SECURITY;

-- Usuário só enxerga seus próprios grupos
CREATE POLICY "select_own_groups"
  ON note_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_groups"
  ON note_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_groups"
  ON note_groups FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_groups"
  ON note_groups FOR DELETE
  USING (auth.uid() = user_id);
