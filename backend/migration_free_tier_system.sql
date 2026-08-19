-- Free-tier quota, mastery rewards, and spaced-repetition support.

CREATE TABLE IF NOT EXISTS public.user_tier_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL DEFAULT 'free',
  unlimited_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_tier_state_tier_check CHECK (tier_name IN ('free'))
);

CREATE TABLE IF NOT EXISTS public.daily_usage_counters (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  action_type TEXT NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  limit_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_usage_counters_action_check CHECK (
    action_type IN ('learning_tool_generate', 'study_session_start')
  ),
  CONSTRAINT daily_usage_counters_nonnegative_check CHECK (
    used_count >= 0 AND limit_count >= 0
  ),
  CONSTRAINT daily_usage_counters_unique UNIQUE (user_id, usage_date, action_type)
);

CREATE TABLE IF NOT EXISTS public.mastery_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_key TEXT NOT NULL,
  topic_label TEXT NOT NULL,
  score_percentage INTEGER NOT NULL,
  quiz_id BIGINT REFERENCES public.quizzes_mindmaps(id) ON DELETE SET NULL,
  week_start_date DATE NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mastery_events_score_check CHECK (score_percentage BETWEEN 0 AND 100),
  CONSTRAINT mastery_events_unique_weekly_topic UNIQUE (user_id, topic_key, week_start_date)
);

CREATE TABLE IF NOT EXISTS public.weekly_mastery_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  mastered_topics_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weekly_mastery_progress_nonnegative_check CHECK (mastered_topics_count >= 0),
  CONSTRAINT weekly_mastery_progress_unique UNIQUE (user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS public.reward_unlock_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qualification_window_end DATE NOT NULL,
  reward_granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlimited_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL DEFAULT 'mastery_4_weeks',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reward_unlock_events_unique_window UNIQUE (user_id, qualification_window_end)
);

CREATE TABLE IF NOT EXISTS public.spaced_repetition_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_key TEXT NOT NULL,
  topic_label TEXT NOT NULL,
  source_quiz_id BIGINT REFERENCES public.quizzes_mindmaps(id) ON DELETE SET NULL,
  last_score_percentage INTEGER,
  next_review_at TIMESTAMPTZ NOT NULL,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT spaced_repetition_queue_score_check CHECK (
    last_score_percentage IS NULL OR (last_score_percentage BETWEEN 0 AND 100)
  ),
  CONSTRAINT spaced_repetition_queue_unique_topic UNIQUE (user_id, topic_key)
);

ALTER TABLE public.quizzes_mindmaps
  ADD COLUMN IF NOT EXISTS retake_of_quiz_id BIGINT REFERENCES public.quizzes_mindmaps(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_usage_counters_user_date
  ON public.daily_usage_counters (user_id, usage_date);

CREATE INDEX IF NOT EXISTS idx_mastery_events_user_week
  ON public.mastery_events (user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_mastery_progress_user_week
  ON public.weekly_mastery_progress (user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_reward_unlock_events_user_granted
  ON public.reward_unlock_events (user_id, reward_granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_spaced_repetition_queue_due
  ON public.spaced_repetition_queue (user_id, next_review_at);