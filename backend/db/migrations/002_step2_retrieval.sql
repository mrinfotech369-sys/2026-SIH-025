-- =================================================================
-- IP-SAKTI Sahayak: Step 2 Migration — Retrieval Foundation
-- Run AFTER schema.sql (001). Safe to run multiple times (IF NOT EXISTS).
-- =================================================================

-- Add missing columns to documents table (Step 2 requirements)
-- Using DO blocks for idempotent ALTER TABLE
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='documents' AND column_name='checksum') THEN
        ALTER TABLE documents ADD COLUMN checksum VARCHAR(64); -- SHA-256 hex
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='documents' AND column_name='source_status') THEN
        ALTER TABLE documents ADD COLUMN source_status TEXT DEFAULT 'needs_verification';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='documents' AND column_name='language') THEN
        ALTER TABLE documents ADD COLUMN language VARCHAR(16) DEFAULT 'en';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='documents' AND column_name='file_name') THEN
        ALTER TABLE documents ADD COLUMN file_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='documents' AND column_name='source_tier') THEN
        -- Integer tier (1-4) alongside existing enum tier column
        ALTER TABLE documents ADD COLUMN source_tier INTEGER DEFAULT 1;
    END IF;
END $$;

-- Add UNIQUE constraint on checksum to enable idempotent ingestion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'documents_checksum_key'
    ) THEN
        ALTER TABLE documents ADD CONSTRAINT documents_checksum_key UNIQUE (checksum);
    END IF;
END $$;

-- Add missing columns to document_chunks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='document_chunks' AND column_name='section') THEN
        ALTER TABLE document_chunks ADD COLUMN section TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='document_chunks' AND column_name='heading') THEN
        ALTER TABLE document_chunks ADD COLUMN heading TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='document_chunks' AND column_name='token_count') THEN
        ALTER TABLE document_chunks ADD COLUMN token_count INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='document_chunks' AND column_name='source_tier') THEN
        ALTER TABLE document_chunks ADD COLUMN source_tier INTEGER DEFAULT 1;
    END IF;
END $$;

-- Retrieval Logs table (Step 2 — audit every retrieval call)
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    query_embedding_preview TEXT,           -- First 64 chars of embedding JSON (debug)
    jurisdiction VARCHAR(16),
    domain VARCHAR(128),
    top_k INTEGER NOT NULL DEFAULT 5,
    semantic_weight NUMERIC(4, 3) DEFAULT 0.65,
    keyword_weight NUMERIC(4, 3) DEFAULT 0.35,
    result_chunk_ids JSONB DEFAULT '[]'::jsonb,  -- Array of chunk UUIDs returned
    result_scores JSONB DEFAULT '[]'::jsonb,      -- Corresponding hybrid scores
    latency_ms INTEGER,                           -- Retrieval latency in milliseconds
    provider VARCHAR(64) DEFAULT 'local',         -- 'supabase' | 'local'
    embedding_provider VARCHAR(64) DEFAULT 'mock',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_logs_created ON retrieval_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_jurisdiction ON retrieval_logs(jurisdiction);
