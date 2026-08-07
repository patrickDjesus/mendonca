-- =============================================================
-- AI Usage: contador diário de usos do assistente de IA por usuário
-- Rode este script no SQL Editor do Supabase Dashboard
-- =============================================================

CREATE TABLE IF NOT EXISTS ai_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, usage_date);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ai_usage_select' AND tablename = 'ai_usage'
  ) THEN
    CREATE POLICY "ai_usage_select" ON ai_usage FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ai_usage_insert' AND tablename = 'ai_usage'
  ) THEN
    CREATE POLICY "ai_usage_insert" ON ai_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'ai_usage_update' AND tablename = 'ai_usage'
  ) THEN
    CREATE POLICY "ai_usage_update" ON ai_usage FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
