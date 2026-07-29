-- =============================================================
-- Cleanup: remove admin tools e campos de simulado
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- ── 1. Remover funções RPC de admin ──────────────────────────

DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_list_users_full();
DROP FUNCTION IF EXISTS public.admin_set_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_delete_user(UUID);
DROP FUNCTION IF EXISTS public.admin_stats();
DROP FUNCTION IF EXISTS public.admin_set_user_xp(UUID, BIGINT);
DROP FUNCTION IF EXISTS public.admin_unlock_achievement(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_remove_achievement(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_user_achievements(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user_documents(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user_videos(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user_notes(UUID);
DROP FUNCTION IF EXISTS public.admin_delete_user_challenges(UUID);
DROP FUNCTION IF EXISTS public.admin_reset_user_streak(UUID);
DROP FUNCTION IF EXISTS public.admin_purge_user_data(UUID);

-- ── 2. Remover coluna is_admin de profiles ──────────────────

ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- ── 3. Remover colunas de simulado de user_streaks ──────────

ALTER TABLE user_streaks DROP COLUMN IF EXISTS simulados_completed;
ALTER TABLE user_streaks DROP COLUMN IF EXISTS completed_simulado_years;
ALTER TABLE user_streaks DROP COLUMN IF EXISTS best_simulado_score;
ALTER TABLE user_streaks DROP COLUMN IF EXISTS simulados_this_week;
ALTER TABLE user_streaks DROP COLUMN IF EXISTS last_simulado_week;
