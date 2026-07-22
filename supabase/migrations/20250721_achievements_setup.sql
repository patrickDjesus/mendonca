-- Conquistas + Sistema de XP e Níveis
-- Cole e execute no SQL Editor do Supabase

-- Passo 1: Tabela de conquistas desbloqueadas
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Passo 2: Índices
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);

-- Passo 3: RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_achievements' AND tablename = 'user_achievements') THEN
    CREATE POLICY "select_own_achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_achievements' AND tablename = 'user_achievements') THEN
    CREATE POLICY "insert_own_achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Passo 4: Colunas extras no user_streaks (se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'total_watch_seconds'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN total_watch_seconds INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'videos_watched'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN videos_watched INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'docs_created'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN docs_created INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'challenges_completed'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN challenges_completed INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'simulados_completed'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN simulados_completed INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'notes_created'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN notes_created INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'login_days'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN login_days INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'last_login_date'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN last_login_date DATE;
  END IF;
END $$;
