-- Migration to add title, source_file, user_id columns to w_embeddings table
-- Run this in your Supabase SQL editor if the columns don't exist

-- Add title column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column to w_embeddings';
    END IF;
END $$;

-- Add source_file column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'source_file'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN source_file TEXT;
        RAISE NOTICE 'Added source_file column to w_embeddings';
    END IF;
END $$;

-- Add user_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column to w_embeddings';
    END IF;
END $$;

-- Add created_at column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to w_embeddings';
    END IF;
END $$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_w_embeddings_title ON public.w_embeddings(title);
CREATE INDEX IF NOT EXISTS idx_w_embeddings_source_file ON public.w_embeddings(source_file);
CREATE INDEX IF NOT EXISTS idx_w_embeddings_user_id ON public.w_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_w_embeddings_created_at ON public.w_embeddings(created_at DESC);
