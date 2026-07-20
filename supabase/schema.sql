-- =============================================================
-- Mendonça — Supabase Schema
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- ── Enum types ──────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE subject_type AS ENUM (
    'Física', 'Química', 'Biologia', 'Matemática',
    'Linguagens', 'Geografia', 'História', 'Filosofia'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_type AS ENUM ('facil', 'medio', 'dificil');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM (
    'multipla', 'multipla_multipla', 'verdadeiro_falso', 'aberta',
    'arrastar', 'ordem', 'completar', 'palavras_cruzadas'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM ('editor', 'pdf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Profiles ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT,
  email      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-criar profile quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Documents ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  doc_type    doc_type NOT NULL DEFAULT 'editor',
  subject     subject_type,
  content     JSONB,
  file_name   TEXT,
  file_url    TEXT,
  file_size   BIGINT,
  thumbnail   TEXT,
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_public ON documents(is_public) WHERE is_public = true;

-- ── Videos ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  subject     subject_type NOT NULL,
  video_url   TEXT NOT NULL,
  thumbnail   TEXT,
  duration    TEXT,
  author_name TEXT,
  is_public   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_public ON videos(is_public) WHERE is_public = true;

-- ── Video Notes ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  "timestamp" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_notes_video ON video_notes(video_id);

-- ── Questions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS questions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type               question_type NOT NULL,
  title              TEXT NOT NULL,
  subject            subject_type NOT NULL,
  content            TEXT,
  image_url          TEXT,
  explanation        TEXT,
  options            JSONB DEFAULT '[]'::jsonb,
  statements         JSONB DEFAULT '[]'::jsonb,
  match_pairs        JSONB DEFAULT '[]'::jsonb,
  order_items        JSONB DEFAULT '[]'::jsonb,
  blanks             JSONB DEFAULT '[]'::jsonb,
  open_expected_text TEXT,
  crossword_clues    JSONB DEFAULT '[]'::jsonb,
  crossword_size     INTEGER DEFAULT 5,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_user ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);

-- ── Challenges ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  subject        subject_type NOT NULL,
  cross_subjects JSONB DEFAULT '[]'::jsonb,
  difficulty     difficulty_type NOT NULL DEFAULT 'medio',
  question_ids   JSONB DEFAULT '[]'::jsonb,
  xp_base        INTEGER NOT NULL DEFAULT 100,
  is_daily       BOOLEAN DEFAULT false,
  daily_date     DATE,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_daily ON challenges(is_daily, daily_date) WHERE is_daily = true;

-- ── Challenge Attempts ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenge_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id  UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  answers       JSONB DEFAULT '[]'::jsonb,
  total_time_ms INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count   INTEGER NOT NULL,
  score         INTEGER NOT NULL,
  xp_earned     INTEGER NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON challenge_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_challenge ON challenge_attempts(challenge_id);

-- ── User Streaks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   INTEGER DEFAULT 0,
  longest_streak   INTEGER DEFAULT 0,
  last_challenge_date DATE,
  total_xp         INTEGER DEFAULT 0,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── RLS (Row Level Security) ────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only own can update
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Documents: owner full access, public readable
CREATE POLICY "documents_select" ON documents FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "documents_update" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "documents_delete" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Videos: owner full access, public readable
CREATE POLICY "videos_select" ON videos FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "videos_insert" ON videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "videos_update" ON videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "videos_delete" ON videos FOR DELETE USING (auth.uid() = user_id);

-- Video Notes: owner full access
CREATE POLICY "video_notes_select" ON video_notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "video_notes_insert" ON video_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_notes_delete" ON video_notes FOR DELETE USING (auth.uid() = user_id);

-- Questions: owner full access, everyone can read (for challenges)
CREATE POLICY "questions_select" ON questions FOR SELECT USING (true);
CREATE POLICY "questions_insert" ON questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "questions_update" ON questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "questions_delete" ON questions FOR DELETE USING (auth.uid() = user_id);

-- Challenges: owner full access, everyone can read
CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "challenges_update" ON challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "challenges_delete" ON challenges FOR DELETE USING (auth.uid() = user_id);

-- Attempts: owner full access
CREATE POLICY "attempts_select" ON challenge_attempts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "attempts_insert" ON challenge_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streaks: owner full access
CREATE POLICY "streaks_select" ON user_streaks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "streaks_insert" ON user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streaks_update" ON user_streaks FOR UPDATE USING (auth.uid() = user_id);
