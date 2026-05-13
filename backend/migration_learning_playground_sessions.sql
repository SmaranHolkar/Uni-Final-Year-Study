-- Learning Playground sessions table for chat + generated tools history
-- Run once in your Postgres/Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.learning_playground_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(180) NOT NULL DEFAULT 'Learning Playground Session',
  latest_prompt VARCHAR(400) NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_tool JSONB,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_playground_sessions_user_created
  ON public.learning_playground_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_playground_sessions_latest_prompt
  ON public.learning_playground_sessions (latest_prompt);

-- Keep updated_at fresh on any row update.
CREATE OR REPLACE FUNCTION public.set_learning_playground_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_learning_playground_sessions_updated_at
  ON public.learning_playground_sessions;

CREATE TRIGGER trg_learning_playground_sessions_updated_at
BEFORE UPDATE ON public.learning_playground_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_learning_playground_sessions_updated_at();

-- Enable Row-Level Security
ALTER TABLE public.learning_playground_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.learning_playground_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON public.learning_playground_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON public.learning_playground_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON public.learning_playground_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_playground_sessions TO authenticated;
