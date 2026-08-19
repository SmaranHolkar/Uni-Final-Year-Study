-- Migration to add paragraph_index, page_number, and chunk_metadata to w_embeddings
-- Run this in your Supabase SQL editor or it will be auto-applied by backend startup checks

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'paragraph_index'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN paragraph_index INT DEFAULT 1;
        RAISE NOTICE 'Added paragraph_index column to w_embeddings';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'page_number'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN page_number INT DEFAULT 1;
        RAISE NOTICE 'Added page_number column to w_embeddings';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'w_embeddings' 
        AND column_name = 'chunk_metadata'
    ) THEN
        ALTER TABLE public.w_embeddings ADD COLUMN chunk_metadata JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added chunk_metadata column to w_embeddings';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_w_embeddings_paragraph_index ON public.w_embeddings(paragraph_index);
