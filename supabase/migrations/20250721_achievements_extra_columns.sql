-- Colunas extras para tracking de conquistas
-- Cole e execute no SQL Editor do Supabase

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'videos_watched_today'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN videos_watched_today INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'videos_watched_date'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN videos_watched_date DATE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'watched_subjects'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN watched_subjects TEXT[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'completed_simulado_years'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN completed_simulado_years INT[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'best_simulado_score'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN best_simulado_score NUMERIC NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'simulados_this_week'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN simulados_this_week INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_streaks' AND column_name = 'last_simulado_week'
  ) THEN
    ALTER TABLE user_streaks ADD COLUMN last_simulado_week VARCHAR(10);
  END IF;
END $$;
