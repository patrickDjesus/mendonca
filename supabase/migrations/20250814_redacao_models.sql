-- Redação models: textos modelo salvos pelo usuário para usar no Treino de Redação
CREATE TABLE IF NOT EXISTS redacao_models (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redacao_models_user ON redacao_models(user_id);

ALTER TABLE redacao_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redacao_models_select" ON redacao_models FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "redacao_models_insert" ON redacao_models FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "redacao_models_update" ON redacao_models FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "redacao_models_delete" ON redacao_models FOR DELETE USING (user_id = auth.uid());
