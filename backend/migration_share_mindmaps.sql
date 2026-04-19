-- Run this in the Supabase SQL editor once.
-- After running, go to: Database → Replication → Tables → toggle shared_mindmaps ON

CREATE TABLE IF NOT EXISTS public.shared_mindmaps (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  quiz_mindmap_id BIGINT NOT NULL REFERENCES public.quizzes_mindmaps(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_mindmaps_recipient ON public.shared_mindmaps(recipient_id);
CREATE INDEX IF NOT EXISTS idx_shared_mindmaps_sender ON public.shared_mindmaps(sender_id);
