-- A extensão pgcrypto precisa estar habilitada (para gen_random_uuid()):
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================
-- TABLE: profiles
-- ======================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- TABLE: exams
-- ======================
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- TABLE: exam_attempts
-- ======================
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  exam_year INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  score INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  time_spent INTEGER
);

-- ======================
-- TABLE: question_responses
-- ======================
CREATE TABLE IF NOT EXISTS question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  selected_option TEXT,
  is_correct BOOLEAN,
  time_spent INTEGER,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- TRIGGER FUNCTION: update updated_at
-- ======================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER ON profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ======================
-- ROW LEVEL SECURITY
-- ======================
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
