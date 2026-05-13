-- ============================================
-- PLAYGROUND MARKETPLACE VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.playground_tool_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES public.playground_marketplace_tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_value SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_vote_value CHECK (vote_value IN (-1, 1)),
  CONSTRAINT unique_tool_vote UNIQUE (tool_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_playground_tool_votes_tool_id ON public.playground_tool_votes(tool_id);
CREATE INDEX IF NOT EXISTS idx_playground_tool_votes_user_id ON public.playground_tool_votes(user_id);

ALTER TABLE public.playground_tool_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes for public tools" 
  ON public.playground_tool_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playground_marketplace_tools t
      WHERE t.id = tool_id AND t.visibility = 'public' AND t.is_published = true
    )
  );

CREATE POLICY "Users can manage their own votes"
  ON public.playground_tool_votes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_tool_votes TO authenticated;

DROP TRIGGER IF EXISTS update_playground_tool_votes_updated_at ON public.playground_tool_votes;
CREATE TRIGGER update_playground_tool_votes_updated_at
BEFORE UPDATE ON public.playground_tool_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_playground_tools_updated_at();