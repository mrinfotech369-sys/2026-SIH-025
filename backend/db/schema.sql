-- =================================================================
-- IP-SAKTI Sahayak: Database Schema Architecture
-- PostgreSQL with pgvector for Hybrid Retrieval & Evidence Verification
-- =================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector extension for dense embeddings

-- 2. Enumerations
CREATE TYPE jurisdiction_type AS ENUM ('IN', 'US', 'AU', 'INTERNATIONAL');
CREATE TYPE authority_tier_type AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4');
CREATE TYPE verification_status_type AS ENUM ('VERIFIED', 'NOT_VERIFIED', 'INSUFFICIENT_EVIDENCE');
CREATE TYPE formulation_category_type AS ENUM (
    'CLASSICAL_ASU',
    'PATENT_PROPRIETARY_ASU',
    'NUTRACEUTICAL_FSSAI',
    'NOVEL_HERBAL_DRUG',
    'DIETARY_SUPPLEMENT_US',
    'LISTED_MEDICINE_AU',
    'UNKNOWN_UNCLASSIFIED'
);

-- 3. Documents (Authoritative Corpus Registry)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(512) NOT NULL,
    authority VARCHAR(255) NOT NULL, -- e.g., 'IP India', 'CDSCO', 'National Biodiversity Authority', 'US FDA', 'TGA AU'
    tier authority_tier_type NOT NULL DEFAULT 'TIER_1',
    jurisdiction jurisdiction_type NOT NULL DEFAULT 'IN',
    domain VARCHAR(128) NOT NULL, -- e.g., 'IP_PATENTS', 'BIODIVERSITY_ABS', 'REGULATORY_AYUSH', 'CLINICAL_EVIDENCE'
    document_type VARCHAR(128) NOT NULL, -- e.g., 'ACT', 'RULE', 'GAZETTE_NOTIFICATION', 'GUIDELINE', 'PHARMACOPOEIA'
    section_article VARCHAR(255),
    year_version VARCHAR(64),
    source_url TEXT,
    effective_date DATE,
    verification_date DATE DEFAULT CURRENT_DATE,
    is_official BOOLEAN DEFAULT TRUE,
    raw_content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index on documents
CREATE INDEX IF NOT EXISTS idx_documents_jurisdiction_tier ON documents(jurisdiction, tier);
CREATE INDEX IF NOT EXISTS idx_documents_authority ON documents(authority);

-- 4. Document Chunks (Hybrid Search Unit: Dense Vector + Sparse Keyword Search)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    text_content TEXT NOT NULL,
    page_number INT,
    section_ref VARCHAR(255),
    tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('english', text_content)) STORED,
    embedding vector(1024), -- BAAI/bge-m3 dense vector representation
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index (GIN)
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING GIN(tsv_content);
-- Vector indexing (HNSW for rapid similarity search)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);

-- 5. Innovations (Product Intake & Profiler)
CREATE TABLE IF NOT EXISTS innovations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of objects: { name, botanical_name, part, percentage, source_state }
    intended_use TEXT NOT NULL,
    dosage_form VARCHAR(128) NOT NULL, -- e.g. 'Tablet', 'Extract', 'Oil', 'Capsule', 'Powder'
    manufacturing_details TEXT,
    target_market VARCHAR(128) DEFAULT 'Domestic India',
    jurisdiction jurisdiction_type NOT NULL DEFAULT 'IN',
    is_traditional_classical BOOLEAN DEFAULT FALSE,
    classical_text_reference VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Classification Results
CREATE TABLE IF NOT EXISTS classification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
    primary_category formulation_category_type NOT NULL,
    secondary_categories JSONB DEFAULT '[]'::jsonb,
    confidence NUMERIC(4, 3) NOT NULL, -- e.g. 0.920
    reasoning TEXT NOT NULL,
    review_required BOOLEAN DEFAULT FALSE,
    clarifying_questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classifications_innovation ON classification_results(innovation_id);

-- 7. Analyses (Intelligence Synthesis Engine)
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    innovation_id UUID NOT NULL REFERENCES innovations(id) ON DELETE CASCADE,
    jurisdiction jurisdiction_type NOT NULL DEFAULT 'IN',
    status VARCHAR(64) NOT NULL DEFAULT 'COMPLETED',
    confidence_score NUMERIC(4, 3) NOT NULL, -- 0.000 to 1.000
    expert_review_recommended BOOLEAN DEFAULT FALSE,
    review_reasons JSONB DEFAULT '[]'::jsonb,
    summary TEXT NOT NULL,
    ip_considerations JSONB NOT NULL, -- { patent_eligibility, sec_3p_analysis, prior_art_context, citations }
    tk_abs_context JSONB NOT NULL, -- { nba_applicability, form_requirements, benefit_sharing, citations }
    regulatory_pathway JSONB NOT NULL, -- { authority, licensing_route, rule_ref, clinical_testing_needed, citations }
    scientific_evidence JSONB NOT NULL, -- { studies, bioactivity_findings, citations }
    safe_abstention_flag BOOLEAN DEFAULT FALSE,
    abstention_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_innovation ON analyses(innovation_id);

-- 8. Citations (Fine-grained Grounding & Verification)
CREATE TABLE IF NOT EXISTS citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    claim_text TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    authority_name VARCHAR(255) NOT NULL,
    authority_tier authority_tier_type NOT NULL,
    section_ref VARCHAR(255),
    verification_status verification_status_type NOT NULL DEFAULT 'VERIFIED',
    grounding_score NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citations_analysis ON citations(analysis_id);

-- 9. Evaluation Benchmark Suite
CREATE TABLE IF NOT EXISTS evaluation_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name VARCHAR(255) NOT NULL,
    question_prompt TEXT NOT NULL,
    expected_jurisdiction jurisdiction_type NOT NULL,
    expected_category formulation_category_type,
    ground_truth_claim_assertions JSONB DEFAULT '[]'::jsonb,
    is_abstention_expected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_question_id UUID NOT NULL REFERENCES evaluation_questions(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    citation_precision NUMERIC(4, 3) NOT NULL,
    groundness_score NUMERIC(4, 3) NOT NULL,
    abstention_accuracy NUMERIC(4, 3) NOT NULL,
    passed BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
