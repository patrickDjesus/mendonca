-- =====================================================
-- MIGRAÇÃO COMPLETA: Conquistas + Perfis + Admin
-- Cole TUDO no SQL Editor do Supabase e clique Run
-- =====================================================

-- ═══ PARTE 1: Colunas extras no user_streaks ═══
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
END $$;

-- ═══ PARTE 2: Tabela profiles (criar ou corrigir) ═══
-- Se já existe mas faltam colunas, adiciona elas
DO $$
BEGIN
  -- Se a tabela não existe, cria completa
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    -- Tabela existe, garantir que as colunas existem
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

-- ═══ PARTE 3: Trigger auto-criar perfil ═══
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

-- ═══ PARTE 4: Inserir perfis de usuários existentes ═══
INSERT INTO profiles (id, name, email, is_admin)
SELECT id, COALESCE(raw_user_meta_data->>'name', ''), COALESCE(email, ''), false
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ═══ PARTE 5: RLS ═══
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

-- ═══ PARTE 6: Funções RPC admin ═══
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

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  UPDATE profiles SET is_admin = (new_role = 'admin') WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ═══ PARTE 7: Tornar você admin ═══
UPDATE profiles SET is_admin = true WHERE email = 'patrickjesusmen@gmail.com';
