-- =============================================================
-- Redações: histórico de redações corrigidas do usuário
-- Rode este script no SQL Editor do Supabase Dashboard.
-- =============================================================

CREATE TABLE IF NOT EXISTS redacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id    TEXT NOT NULL,
  theme_title TEXT NOT NULL,
  theme_fonte TEXT DEFAULT '',
  text        TEXT NOT NULL,
  grade       INTEGER NOT NULL DEFAULT 0,
  correction  JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redacoes_user ON redacoes(user_id);

ALTER TABLE redacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redacoes_select" ON redacoes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "redacoes_insert" ON redacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "redacoes_update" ON redacoes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "redacoes_delete" ON redacoes FOR DELETE USING (user_id = auth.uid());
