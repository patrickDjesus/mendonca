-- ============================================================
-- ENEM STUDY - SCRIPT MINIMO PARA AUTH + PERFLS
-- Execute este primeiro se o script completo der erro
-- ============================================================

-- 1. EXTENSOES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM
DO $$ BEGIN
  CREATE TYPE hero_class AS ENUM (
    'guerreiro','arqueiro','mago','ladino','curandeiro','paladino'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE challenge_type AS ENUM (
    'multipla_escolha','resposta_escrita','verdadeiro_falso',
    'preencher_lacuna','ordenacao_logica','associacao_pares'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE dungeon_status AS ENUM (
    'em_andamento','concluida','abandonada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE material_type AS ENUM (
    'video','pdf','desafio','simulado'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. TABELAS (com IF NOT EXISTS para reexecucao segura)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  adventurer_name TEXT NOT NULL CHECK (char_length(adventurer_name) BETWEEN 3 AND 30),
  avatar_url TEXT NOT NULL DEFAULT '/assets/avatars/default.svg',
  hero_class hero_class NOT NULL DEFAULT 'guerreiro',
  xp_total INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT DEFAULT 'Aprendiz',
  total_study_time_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  hero_class_recommended hero_class,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.journey_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  material_type material_type NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  node_order INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  required_level INTEGER NOT NULL DEFAULT 1,
  parent_node_id UUID REFERENCES public.journey_nodes(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_journey_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.journey_nodes(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  score DECIMAL(5,2),
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, node_id)
);

CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID REFERENCES public.journey_nodes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_video_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  current_time_seconds INTEGER NOT NULL DEFAULT 0,
  total_watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE TABLE IF NOT EXISTS public.video_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  color TEXT DEFAULT '#ffffff',
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES public.journey_nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  subject TEXT NOT NULL,
  pages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_material_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  last_page_reached INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, material_id)
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES public.journey_nodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type challenge_type NOT NULL,
  subject TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  question_text TEXT NOT NULL,
  question_html TEXT,
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  explanation_html TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 15,
  time_limit_seconds INTEGER,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_challenge_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.spaced_repetition_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.50,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public.dungeons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 10,
  boss_room_number INTEGER NOT NULL DEFAULT 10,
  time_limit_seconds INTEGER NOT NULL DEFAULT 3600,
  xp_multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dungeon_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dungeon_id UUID NOT NULL REFERENCES public.dungeons(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  is_boss_room BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(dungeon_id, room_number)
);

CREATE TABLE IF NOT EXISTS public.user_dungeon_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dungeon_id UUID NOT NULL REFERENCES public.dungeons(id) ON DELETE CASCADE,
  status dungeon_status NOT NULL DEFAULT 'em_andamento',
  current_room INTEGER NOT NULL DEFAULT 1,
  hp INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL DEFAULT 100,
  score INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  title_earned TEXT,
  xp_multiplier_earned DECIMAL(3,1) DEFAULT 1.0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE(user_id, dungeon_id)
);

CREATE TABLE IF NOT EXISTS public.user_dungeon_room_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.user_dungeon_sessions(id) ON DELETE CASCADE,
  room_number INTEGER NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  damage_taken INTEGER NOT NULL DEFAULT 0,
  damage_dealt INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'break_reminder',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_video_time_seconds INTEGER NOT NULL DEFAULT 0,
  total_material_time_seconds INTEGER NOT NULL DEFAULT 0,
  total_challenge_time_seconds INTEGER NOT NULL DEFAULT 0,
  total_dungeon_time_seconds INTEGER NOT NULL DEFAULT 0,
  challenges_solved INTEGER NOT NULL DEFAULT 0,
  challenges_failed INTEGER NOT NULL DEFAULT 0,
  materials_completed INTEGER NOT NULL DEFAULT 0,
  videos_completed INTEGER NOT NULL DEFAULT 0,
  dungeons_completed INTEGER NOT NULL DEFAULT 0,
  dungeons_failed INTEGER NOT NULL DEFAULT 0,
  accuracy_by_subject JSONB NOT NULL DEFAULT '{}',
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info JSONB,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDICES
CREATE INDEX IF NOT EXISTS idx_profiles_adventurer_name ON public.profiles(adventurer_name);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);
CREATE INDEX IF NOT EXISTS idx_user_journey_progress_user ON public.user_journey_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_user ON public.user_video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_video_progress_video ON public.user_video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_user_video ON public.video_notes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_video_notes_timestamp ON public.video_notes(timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_challenges_subject ON public.challenges(subject);
CREATE INDEX IF NOT EXISTS idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX IF NOT EXISTS idx_challenges_node_id ON public.challenges(node_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_results_user ON public.user_challenge_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_results_challenge ON public.user_challenge_results(challenge_id);
CREATE INDEX IF NOT EXISTS idx_spaced_rep_user_next ON public.spaced_repetition_queue(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_dungeon_sessions_user ON public.user_dungeon_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_room_results_session ON public.user_dungeon_room_results(session_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_videos_node_id ON public.videos(node_id);
CREATE INDEX IF NOT EXISTS idx_materials_node_id ON public.materials(node_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_material_progress_user ON public.user_material_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_material_progress_material ON public.user_material_progress(material_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_results_created ON public.user_challenge_results(created_at);

-- 5. FUNCOES
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_video_notes_updated_at ON public.video_notes;
CREATE TRIGGER set_video_notes_updated_at BEFORE UPDATE ON public.video_notes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER set_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-criar profile ao registrar (resiliente — nao quebra o signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, adventurer_name, avatar_url, hero_class)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'adventurer_name', 'Aventureiro'),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', '/assets/avatars/default.svg'),
      COALESCE(NEW.raw_user_meta_data->>'hero_class', 'guerreiro')::hero_class
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar profile — %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar user_stats — %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Calcular nivel
CREATE OR REPLACE FUNCTION public.calculate_level(total_xp INTEGER)
RETURNS INTEGER AS $$ BEGIN RETURN GREATEST(1, FLOOR(SQRT(total_xp / 100.0)) + 1); END; $$ LANGUAGE plpgsql IMMUTABLE;

-- XP
CREATE OR REPLACE FUNCTION public.add_xp_to_user(p_user_id UUID, p_xp_amount INTEGER)
RETURNS VOID AS $$
DECLARE new_xp INTEGER; new_level INTEGER;
BEGIN
  UPDATE public.profiles SET xp_total = xp_total + p_xp_amount WHERE id = p_user_id RETURNING xp_total INTO new_xp;
  new_level := public.calculate_level(new_xp);
  UPDATE public.profiles SET level = new_level WHERE id = p_user_id AND level != new_level;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Streak
CREATE OR REPLACE FUNCTION public.update_daily_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE last_date DATE; current_streak INTEGER;
BEGIN
  SELECT last_active_date, streak_days INTO last_date, current_streak FROM public.profiles WHERE id = p_user_id;
  IF last_date = CURRENT_DATE THEN RETURN;
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.profiles SET streak_days = streak_days + 1, last_active_date = CURRENT_DATE WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles SET streak_days = 1, last_active_date = CURRENT_DATE WHERE id = p_user_id;
  END IF;
  UPDATE public.user_stats
  SET current_streak = (SELECT streak_days FROM public.profiles WHERE id = p_user_id),
      longest_streak = GREATEST(longest_streak, (SELECT streak_days FROM public.profiles WHERE id = p_user_id))
  WHERE user_id = p_user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Challenge answer
CREATE OR REPLACE FUNCTION public.submit_challenge_answer(
  p_user_id UUID, p_challenge_id UUID, p_user_answer JSONB, p_time_spent INTEGER
) RETURNS TABLE(is_correct BOOLEAN, xp_earned INTEGER) AS $$
DECLARE v_correct JSONB; v_xp INTEGER; v_result BOOLEAN; v_attempt INTEGER; v_subject TEXT;
BEGIN
  SELECT correct_answer, xp_reward, subject INTO v_correct, v_xp, v_subject FROM public.challenges WHERE id = p_challenge_id;
  v_result := (p_user_answer = v_correct);
  v_xp := CASE WHEN v_result THEN v_xp ELSE 0 END;
  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt FROM public.user_challenge_results WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
  INSERT INTO public.user_challenge_results (user_id, challenge_id, user_answer, is_correct, time_spent_seconds, xp_earned, attempt_number)
  VALUES (p_user_id, p_challenge_id, p_user_answer, v_result, p_time_spent, v_xp, v_attempt);
  PERFORM public.add_xp_to_user(p_user_id, v_xp);
  IF v_result THEN
    UPDATE public.user_stats SET challenges_solved = challenges_solved + 1,
      accuracy_by_subject = jsonb_set(COALESCE(accuracy_by_subject, '{}'), ARRAY[v_subject], to_jsonb(COALESCE((accuracy_by_subject->>v_subject)::INTEGER, 0) + 1))
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_stats SET challenges_failed = challenges_failed + 1 WHERE user_id = p_user_id;
    INSERT INTO public.spaced_repetition_queue (user_id, challenge_id, interval_days, next_review_at)
    VALUES (p_user_id, p_challenge_id, 1, NOW() + INTERVAL '1 day')
    ON CONFLICT (user_id, challenge_id) DO UPDATE SET interval_days = 1, next_review_at = NOW() + INTERVAL '1 day', consecutive_correct = 0, active = TRUE;
  END IF;
  RETURN QUERY SELECT v_result, v_xp;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- SR review
CREATE OR REPLACE FUNCTION public.get_review_challenges(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(challenge_id UUID, challenge_title TEXT, next_review_at TIMESTAMPTZ, interval_days INTEGER, ease_factor DECIMAL) AS $$
BEGIN RETURN QUERY
  SELECT srq.challenge_id, c.title, srq.next_review_at, srq.interval_days, srq.ease_factor
  FROM public.spaced_repetition_queue srq JOIN public.challenges c ON c.id = srq.challenge_id
  WHERE srq.user_id = p_user_id AND srq.active = TRUE AND srq.next_review_at <= NOW()
  ORDER BY srq.next_review_at ASC LIMIT p_limit;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- SR update
CREATE OR REPLACE FUNCTION public.update_spaced_repetition(p_user_id UUID, p_challenge_id UUID, p_correct BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF p_correct THEN
    UPDATE public.spaced_repetition_queue
    SET consecutive_correct = consecutive_correct + 1,
        interval_days = GREATEST(1, ROUND(interval_days * ease_factor))::INTEGER,
        ease_factor = LEAST(3.0, ease_factor + 0.1),
        next_review_at = NOW() + (GREATEST(1, ROUND(interval_days * ease_factor))::INTEGER || ' days')::INTERVAL,
        total_reviews = total_reviews + 1
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
  ELSE
    UPDATE public.spaced_repetition_queue
    SET consecutive_correct = 0, interval_days = 1, ease_factor = GREATEST(1.3, ease_factor - 0.2),
        next_review_at = NOW() + INTERVAL '1 day', total_reviews = total_reviews + 1
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id;
  END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Study time
CREATE OR REPLACE FUNCTION public.record_study_time(p_user_id UUID, p_type TEXT, p_seconds INTEGER)
RETURNS VOID AS $$
BEGIN
  IF p_seconds <= 0 THEN RETURN; END IF;
  UPDATE public.profiles SET total_study_time_seconds = total_study_time_seconds + p_seconds WHERE id = p_user_id;
  CASE p_type
    WHEN 'video' THEN UPDATE public.user_stats SET total_video_time_seconds = total_video_time_seconds + p_seconds WHERE user_id = p_user_id;
    WHEN 'material' THEN UPDATE public.user_stats SET total_material_time_seconds = total_material_time_seconds + p_seconds WHERE user_id = p_user_id;
    WHEN 'challenge' THEN UPDATE public.user_stats SET total_challenge_time_seconds = total_challenge_time_seconds + p_seconds WHERE user_id = p_user_id;
    WHEN 'dungeon' THEN UPDATE public.user_stats SET total_dungeon_time_seconds = total_dungeon_time_seconds + p_seconds WHERE user_id = p_user_id;
  END CASE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journey_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dungeons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dungeon_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dungeon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dungeon_room_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies then recreate (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view active avatars" ON public.avatars; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view active avatars" ON public.avatars FOR SELECT USING (active = TRUE);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view active nodes" ON public.journey_nodes; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view active nodes" ON public.journey_nodes FOR SELECT USING (active = TRUE);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own progress" ON public.user_journey_progress;
  DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_journey_progress;
  DROP POLICY IF EXISTS "Users can update own progress" ON public.user_journey_progress;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own progress" ON public.user_journey_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_journey_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_journey_progress FOR UPDATE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view videos" ON public.videos FOR SELECT USING (TRUE);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own video progress" ON public.user_video_progress;
  DROP POLICY IF EXISTS "Users can insert own video progress" ON public.user_video_progress;
  DROP POLICY IF EXISTS "Users can update own video progress" ON public.user_video_progress;
  DROP POLICY IF EXISTS "Users can delete own video progress" ON public.user_video_progress;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own video progress" ON public.user_video_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own video progress" ON public.user_video_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own video progress" ON public.user_video_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own video progress" ON public.user_video_progress FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own notes" ON public.video_notes;
  DROP POLICY IF EXISTS "Users can insert own notes" ON public.video_notes;
  DROP POLICY IF EXISTS "Users can update own notes" ON public.video_notes;
  DROP POLICY IF EXISTS "Users can delete own notes" ON public.video_notes;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own notes" ON public.video_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.video_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.video_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.video_notes FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view materials" ON public.materials FOR SELECT USING (TRUE);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own material progress" ON public.user_material_progress;
  DROP POLICY IF EXISTS "Users can insert own material progress" ON public.user_material_progress;
  DROP POLICY IF EXISTS "Users can update own material progress" ON public.user_material_progress;
  DROP POLICY IF EXISTS "Users can delete own material progress" ON public.user_material_progress;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own material progress" ON public.user_material_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own material progress" ON public.user_material_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own material progress" ON public.user_material_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own material progress" ON public.user_material_progress FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT USING (active = TRUE);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own results" ON public.user_challenge_results;
  DROP POLICY IF EXISTS "Users can insert own results" ON public.user_challenge_results;
  DROP POLICY IF EXISTS "Users can delete own results" ON public.user_challenge_results;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own results" ON public.user_challenge_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON public.user_challenge_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own results" ON public.user_challenge_results FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own SR queue" ON public.spaced_repetition_queue;
  DROP POLICY IF EXISTS "Users can insert own SR queue" ON public.spaced_repetition_queue;
  DROP POLICY IF EXISTS "Users can update own SR queue" ON public.spaced_repetition_queue;
  DROP POLICY IF EXISTS "Users can delete own SR queue" ON public.spaced_repetition_queue;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own SR queue" ON public.spaced_repetition_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own SR queue" ON public.spaced_repetition_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own SR queue" ON public.spaced_repetition_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own SR queue" ON public.spaced_repetition_queue FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view dungeons" ON public.dungeons; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view dungeons" ON public.dungeons FOR SELECT USING (active = TRUE);

DO $$ BEGIN DROP POLICY IF EXISTS "Anyone can view dungeon rooms" ON public.dungeon_rooms; EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Anyone can view dungeon rooms" ON public.dungeon_rooms FOR SELECT USING (TRUE);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_dungeon_sessions;
  DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_dungeon_sessions;
  DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_dungeon_sessions;
  DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_dungeon_sessions;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own sessions" ON public.user_dungeon_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.user_dungeon_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.user_dungeon_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.user_dungeon_sessions FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own room results" ON public.user_dungeon_room_results;
  DROP POLICY IF EXISTS "Users can insert own room results" ON public.user_dungeon_room_results;
  DROP POLICY IF EXISTS "Users can delete own room results" ON public.user_dungeon_room_results;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own room results" ON public.user_dungeon_room_results FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_dungeon_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own room results" ON public.user_dungeon_room_results FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.user_dungeon_sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own room results" ON public.user_dungeon_room_results FOR DELETE USING (EXISTS (SELECT 1 FROM public.user_dungeon_sessions WHERE id = session_id AND user_id = auth.uid()));

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
  DROP POLICY IF EXISTS "Users can insert own notifications" ON public.user_notifications;
  DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
  DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.user_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.user_notifications FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
  DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_stats;
  DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own user sessions" ON public.user_sessions;
  DROP POLICY IF EXISTS "Users can insert own user sessions" ON public.user_sessions;
  DROP POLICY IF EXISTS "Users can update own user sessions" ON public.user_sessions;
  DROP POLICY IF EXISTS "Users can delete own user sessions" ON public.user_sessions;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Users can view own user sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own user sessions" ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);

-- 7. SEEDS
INSERT INTO public.avatars (name, image_url, description, hero_class_recommended, sort_order) VALUES
  ('Cavaleiro Sombrio', '/assets/avatars/knight.svg', 'Um guerreiro destemido forjado nas trevas', 'guerreiro', 1),
  ('Arqueiro Lunar', '/assets/avatars/archer.svg', 'Flechas certeiras sob a luz da lua', 'arqueiro', 2),
  ('Mago Arcano', '/assets/avatars/mage.svg', 'Domina as forcas arcanas do universo', 'mago', 3),
  ('Ladino das Sombras', '/assets/avatars/rogue.svg', 'Mestre do sigilo e da astucia', 'ladino', 4),
  ('Sacerdotisa da Luz', '/assets/avatars/healer.svg', 'Canaliza a energia curadora divina', 'curandeiro', 5),
  ('Paladino Sagrado', '/assets/avatars/paladin.svg', 'Guerreiro sagrado com fe inabalavel', 'paladino', 6)
ON CONFLICT DO NOTHING;
