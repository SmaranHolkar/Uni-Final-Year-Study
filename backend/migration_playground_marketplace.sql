-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PLAYGROUND MARKETPLACE TOOLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.playground_marketplace_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL, -- 'flashcards', 'notes', 'image', 'interactive', etc.
  render_mode TEXT DEFAULT 'native', -- 'native' or 'iframe'
  category TEXT, -- 'study-guide', 'flashcards', 'quiz', 'interactive', etc.
  tags JSONB DEFAULT '[]'::jsonb, -- Array of tags for filtering
  
  -- Core tool data
  generated_tool JSONB NOT NULL, -- The full tool object
  latest_prompt TEXT, -- The original user prompt
  
  -- Publishing & visibility
  is_published BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'private', -- 'private', 'shared-link', 'public'
  
  -- Fork tracking
  forked_from_tool_id UUID, -- If null, it's original; otherwise it's a fork
  forked_from_user_id UUID, -- Original author (for attribution)
  fork_count INTEGER DEFAULT 0, -- How many times this tool has been forked
  
  -- Collaboration
  collaborator_ids JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who can edit
  viewer_ids JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who can view
  
  -- Versioning & optimization
  version_number INTEGER DEFAULT 1,
  change_summary TEXT, -- Describe what changed in this version
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_forked_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT valid_visibility CHECK (visibility IN ('private', 'shared-link', 'public')),
  CONSTRAINT valid_render_mode CHECK (render_mode IN ('native', 'iframe'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_playground_tools_owner ON public.playground_marketplace_tools(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_playground_tools_published ON public.playground_marketplace_tools(is_published, visibility) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_playground_tools_forked_from ON public.playground_marketplace_tools(forked_from_tool_id);
CREATE INDEX IF NOT EXISTS idx_playground_tools_created_at ON public.playground_marketplace_tools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playground_tools_category ON public.playground_marketplace_tools(category) WHERE is_published = true;

-- ============================================
-- PLAYGROUND TOOL VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.playground_tool_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES public.playground_marketplace_tools(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  generated_tool JSONB NOT NULL, -- The tool object at this version
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_tool_version UNIQUE(tool_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_tool_versions_tool_id ON public.playground_tool_versions(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_versions_created_at ON public.playground_tool_versions(created_at DESC);

-- ============================================
-- PLAYGROUND TOOL COLLABORATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.playground_tool_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES public.playground_marketplace_tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'editor', 'viewer'
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_role CHECK (role IN ('editor', 'viewer')),
  CONSTRAINT unique_collaborator UNIQUE(tool_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collaborators_tool_id ON public.playground_tool_collaborators(tool_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.playground_tool_collaborators(user_id);

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE public.playground_marketplace_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_tool_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies for playground_marketplace_tools
-- 1. Owners can see and edit their own tools
CREATE POLICY "Users can view own tools" 
  ON public.playground_marketplace_tools 
  FOR SELECT 
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own tools" 
  ON public.playground_marketplace_tools 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own tools" 
  ON public.playground_marketplace_tools 
  FOR UPDATE 
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own tools" 
  ON public.playground_marketplace_tools 
  FOR DELETE 
  USING (auth.uid() = owner_user_id);

-- 2. Public tools can be viewed by anyone
CREATE POLICY "Public tools are viewable by all" 
  ON public.playground_marketplace_tools 
  FOR SELECT 
  USING (visibility = 'public' AND is_published = true);

-- 3. Collaborators can view tools they're invited to
CREATE POLICY "Collaborators can view tools" 
  ON public.playground_marketplace_tools 
  FOR SELECT 
  USING (
    auth.uid() = ANY(viewer_ids::text[]) OR 
    auth.uid() = ANY(collaborator_ids::text[])
  );

-- 4. Collaborators with 'editor' role can update tools
CREATE POLICY "Editors can update shared tools" 
  ON public.playground_marketplace_tools 
  FOR UPDATE 
  USING (auth.uid() = ANY(collaborator_ids::text[]));

-- Policies for playground_tool_versions
-- 1. Tool owner and collaborators can view versions
CREATE POLICY "Owners and collaborators can view versions" 
  ON public.playground_tool_versions 
  FOR SELECT 
  USING (
    EXISTS(
      SELECT 1 FROM public.playground_marketplace_tools 
      WHERE id = tool_id AND (
        auth.uid() = owner_user_id OR 
        auth.uid() = ANY(viewer_ids::text[]) OR
        auth.uid() = ANY(collaborator_ids::text[])
      )
    )
  );

-- 2. Owners and editors can create versions
CREATE POLICY "Owners and editors can create versions" 
  ON public.playground_tool_versions 
  FOR INSERT 
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.playground_marketplace_tools 
      WHERE id = tool_id AND (
        auth.uid() = owner_user_id OR 
        auth.uid() = ANY(collaborator_ids::text[])
      )
    ) AND auth.uid() = created_by
  );

-- Policies for playground_tool_collaborators
-- 1. Tool owner can manage collaborators
CREATE POLICY "Owners can manage collaborators" 
  ON public.playground_tool_collaborators 
  FOR ALL 
  USING (
    EXISTS(
      SELECT 1 FROM public.playground_marketplace_tools 
      WHERE id = tool_id AND auth.uid() = owner_user_id
    )
  );

-- 2. Collaborators can view collaborator list for their tools
CREATE POLICY "Tool users can see collaborators" 
  ON public.playground_tool_collaborators 
  FOR SELECT 
  USING (
    EXISTS(
      SELECT 1 FROM public.playground_marketplace_tools 
      WHERE id = tool_id AND (
        auth.uid() = owner_user_id OR 
        auth.uid() = user_id OR
        auth.uid() = ANY(viewer_ids::text[]) OR
        auth.uid() = ANY(collaborator_ids::text[])
      )
    )
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_marketplace_tools TO authenticated;
GRANT SELECT, INSERT ON public.playground_tool_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_tool_collaborators TO authenticated;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_playground_tools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_playground_tools_updated_at ON public.playground_marketplace_tools;
CREATE TRIGGER update_playground_tools_updated_at
BEFORE UPDATE ON public.playground_marketplace_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_playground_tools_updated_at();
