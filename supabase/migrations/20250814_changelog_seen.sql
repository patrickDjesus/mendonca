-- Registra qual foi a última novidade (changelog) que cada usuário já viu
CREATE TABLE IF NOT EXISTS changelog_seen (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_id TEXT NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE changelog_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "changelog_seen_select" ON changelog_seen FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "changelog_seen_insert" ON changelog_seen FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "changelog_seen_update" ON changelog_seen FOR UPDATE USING (user_id = auth.uid());
