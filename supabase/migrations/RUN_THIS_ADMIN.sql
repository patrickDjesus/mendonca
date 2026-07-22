-- =====================================================
-- MIGRAÇÃO COMPLETA: Admin Tools
-- Cole TUDO no SQL Editor do Supabase e clique Run
-- Inclui: profiles, achievements, admin functions
-- =====================================================

-- ═══ PARTE 1: Garantir tabela profiles ═══
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
      ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'name') THEN
      ALTER TABLE profiles ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
      ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
      ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

-- ═══ PARTE 2: Trigger auto-criar perfil ═══
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══ PARTE 3: Inserir perfis de usuários existentes ═══
INSERT INTO profiles (id, name, email, is_admin)
SELECT id, COALESCE(raw_user_meta_data->>'name', ''), COALESCE(email, ''), false
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ═══ PARTE 4: RLS ═══
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_own' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own' AND tablename = 'profiles') THEN
    CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- ═══ PARTE 5: user_achievements ═══
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);

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

-- ═══ PARTE 6: Colunas extras no user_streaks ═══
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'videos_watched_today') THEN
    ALTER TABLE user_streaks ADD COLUMN videos_watched_today INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'videos_watched_date') THEN
    ALTER TABLE user_streaks ADD COLUMN videos_watched_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'watched_subjects') THEN
    ALTER TABLE user_streaks ADD COLUMN watched_subjects TEXT[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'completed_simulado_years') THEN
    ALTER TABLE user_streaks ADD COLUMN completed_simulado_years INT[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'best_simulado_score') THEN
    ALTER TABLE user_streaks ADD COLUMN best_simulado_score NUMERIC NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'simulados_this_week') THEN
    ALTER TABLE user_streaks ADD COLUMN simulados_this_week INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'last_simulado_week') THEN
    ALTER TABLE user_streaks ADD COLUMN last_simulado_week VARCHAR(10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'total_watch_seconds') THEN
    ALTER TABLE user_streaks ADD COLUMN total_watch_seconds INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'videos_watched') THEN
    ALTER TABLE user_streaks ADD COLUMN videos_watched INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'docs_created') THEN
    ALTER TABLE user_streaks ADD COLUMN docs_created INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'challenges_completed') THEN
    ALTER TABLE user_streaks ADD COLUMN challenges_completed INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'simulados_completed') THEN
    ALTER TABLE user_streaks ADD COLUMN simulados_completed INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'notes_created') THEN
    ALTER TABLE user_streaks ADD COLUMN notes_created INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'login_days') THEN
    ALTER TABLE user_streaks ADD COLUMN login_days INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_streaks' AND column_name = 'last_login_date') THEN
    ALTER TABLE user_streaks ADD COLUMN last_login_date DATE;
  END IF;
END $$;

-- ═══ PARTE 7: Funções RPC admin ═══

-- Listar usuários básicos
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY SELECT p.id, p.name, p.email, p.is_admin, p.created_at FROM profiles p ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Listar usuários com dados completos
CREATE OR REPLACE FUNCTION public.admin_list_users_full()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  total_xp BIGINT,
  current_streak INT,
  docs_created INT,
  videos_watched INT,
  challenges_completed INT,
  simulados_completed INT,
  notes_created INT,
  login_days INT
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    p.id, p.name, p.email, p.is_admin, p.created_at,
    COALESCE(s.total_xp, 0)::BIGINT,
    COALESCE(s.current_streak, 0),
    COALESCE(s.docs_created, 0),
    COALESCE(s.videos_watched, 0),
    COALESCE(s.challenges_completed, 0),
    COALESCE(s.simulados_completed, 0),
    COALESCE(s.notes_created, 0),
    COALESCE(s.login_days, 0)
  FROM profiles p
  LEFT JOIN user_streaks s ON s.user_id = p.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alterar papel
CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  UPDATE profiles SET is_admin = (new_role = 'admin') WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar usuário completo
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM user_achievements WHERE user_id = target_user_id;
  DELETE FROM user_streaks WHERE user_id = target_user_id;
  DELETE FROM activity_log WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  DELETE FROM video_notes WHERE user_id = target_user_id;
  DELETE FROM documents WHERE user_id = target_user_id;
  DELETE FROM videos WHERE user_id = target_user_id;
  DELETE FROM challenge_attempts WHERE user_id = target_user_id;
  DELETE FROM challenges WHERE user_id = target_user_id;
  DELETE FROM note_groups WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estatísticas
CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_docs BIGINT,
  total_challenges BIGINT,
  total_videos BIGINT
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles)::BIGINT,
    (SELECT COUNT(*) FROM documents)::BIGINT,
    (SELECT COUNT(*) FROM challenges)::BIGINT,
    (SELECT COUNT(*) FROM videos)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setar XP
CREATE OR REPLACE FUNCTION public.admin_set_user_xp(target_user_id UUID, new_xp BIGINT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO user_streaks (user_id, total_xp, current_streak, longest_streak, last_challenge_date,
    total_watch_seconds, videos_watched, docs_created, challenges_completed, simulados_completed,
    notes_created, login_days, last_login_date, videos_watched_today, videos_watched_date,
    watched_subjects, completed_simulado_years, best_simulado_score, simulados_this_week, last_simulado_week)
  VALUES (target_user_id, new_xp, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '{}', '{}', 0, 0, NULL)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = new_xp, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Desbloquear conquista
CREATE OR REPLACE FUNCTION public.admin_unlock_achievement(target_user_id UUID, achievement TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (target_user_id, achievement)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover conquista
CREATE OR REPLACE FUNCTION public.admin_remove_achievement(target_user_id UUID, achievement TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM user_achievements WHERE user_id = target_user_id AND achievement_id = achievement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Listar conquistas de um usuário
CREATE OR REPLACE FUNCTION public.admin_get_user_achievements(target_user_id UUID)
RETURNS TABLE (achievement_id TEXT, unlocked_at TIMESTAMPTZ) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY SELECT ua.achievement_id, ua.unlocked_at FROM user_achievements ua WHERE ua.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar documentos
CREATE OR REPLACE FUNCTION public.admin_delete_user_documents(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE deleted_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM documents WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar vídeos
CREATE OR REPLACE FUNCTION public.admin_delete_user_videos(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE deleted_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM video_notes WHERE user_id = target_user_id;
  DELETE FROM videos WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar anotações
CREATE OR REPLACE FUNCTION public.admin_delete_user_notes(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE deleted_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM video_notes WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deletar desafios
CREATE OR REPLACE FUNCTION public.admin_delete_user_challenges(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE deleted_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM challenge_attempts WHERE user_id = target_user_id;
  DELETE FROM challenges WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resetar streak/achievements
CREATE OR REPLACE FUNCTION public.admin_reset_user_streak(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM user_streaks WHERE user_id = target_user_id;
  DELETE FROM user_achievements WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Purgar todos os dados (mantém conta)
CREATE OR REPLACE FUNCTION public.admin_purge_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM user_achievements WHERE user_id = target_user_id;
  DELETE FROM user_streaks WHERE user_id = target_user_id;
  DELETE FROM activity_log WHERE user_id = target_user_id;
  DELETE FROM goals WHERE user_id = target_user_id;
  DELETE FROM video_notes WHERE user_id = target_user_id;
  DELETE FROM documents WHERE user_id = target_user_id;
  DELETE FROM videos WHERE user_id = target_user_id;
  DELETE FROM challenge_attempts WHERE user_id = target_user_id;
  DELETE FROM challenges WHERE user_id = target_user_id;
  DELETE FROM note_groups WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ PARTE 8: Tornar você admin ═══
UPDATE profiles SET is_admin = true WHERE email = 'patrickjesusmen@gmail.com';
