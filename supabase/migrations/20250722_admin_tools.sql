-- Ferramentas avançadas de administração
-- Cole e execute no SQL Editor do Supabase

-- ═══ Listar usuários com dados completos (streak/XP) ═══
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

-- ═══ Setar XP de um usuário ═══
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

-- ═══ Desbloquear conquista para um usuário ═══
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

-- ═══ Remover conquista de um usuário ═══
CREATE OR REPLACE FUNCTION public.admin_remove_achievement(target_user_id UUID, achievement TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM user_achievements WHERE user_id = target_user_id AND achievement_id = achievement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ Listar conquistas de um usuário ═══
CREATE OR REPLACE FUNCTION public.admin_get_user_achievements(target_user_id UUID)
RETURNS TABLE (achievement_id TEXT, unlocked_at TIMESTAMPTZ) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY SELECT ua.achievement_id, ua.unlocked_at FROM user_achievements ua WHERE ua.user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ Deletar todos os documentos de um usuário ═══
CREATE OR REPLACE FUNCTION public.admin_delete_user_documents(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM documents WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ Deletar todos os vídeos de um usuário ═══
CREATE OR REPLACE FUNCTION public.admin_delete_user_videos(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
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

-- ═══ Deletar todas as anotações de um usuário ═══
CREATE OR REPLACE FUNCTION public.admin_delete_user_notes(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM video_notes WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══ Deletar todos os desafios de um usuário ═══
CREATE OR REPLACE FUNCTION public.admin_delete_user_challenges(target_user_id UUID)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
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

-- ═══ Resetar streak/XP de um usuário ═══
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

-- ═══ Deletar todos os dados de um usuário (mantém conta) ═══
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

-- ═══ Garantir que o email do patrick é admin ═══
UPDATE profiles SET is_admin = true WHERE email = 'patrickjesusmen@gmail.com';
