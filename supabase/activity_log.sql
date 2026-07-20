-- ============================================
-- Tabela: activity_log
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  title      TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'book',
  color      TEXT NOT NULL DEFAULT '#508cc8',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select" ON activity_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "activity_insert" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
