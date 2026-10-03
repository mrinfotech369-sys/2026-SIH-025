# RAG Architecture

## 1. Ingestion Pipeline
Documents are parsed using PyMuPDF (pymupdf), extracting raw text while identifying structured headings based on standard legal formats (e.g. Sections, Rules, Articles). Pages requiring OCR are detected and flagged.

## 2. Chunking Strategy
Text is chunked into sizes of 500-900 tokens with 10-20% overlap. Chunking strictly respects boundaries such as blank lines (paragraphs) and punctuation (clauses) over hard splits. Surrounding metadata like page numbers and nearest section headings are attached to chunks.

## 3. Embedding Strategy
A provider abstraction is used for embeddings. It supports BAAI/BGE-M3 (multilingual retrieval) locally via `sentence-transformers`, `text-embedding-3-small` via OpenAI, and a Mock provider for local development.

## 4. Vector Storage
Chunks and metadata are stored in Supabase PostgreSQL using `pgvector` for vector index storage, alongside fallback SQLite full-text search and cosine similarity for local testing.

## 5. Keyword Retrieval
PostgreSQL Full-Text Search (FTS) is executed over chunk text. In the local mock adapter, SQLite FTS5 (BM25) is used.

## 6. Hybrid Scoring
Retrieval combines dense embedding similarity and sparse keyword matching using a weighted score:
`Hybrid Score = (alpha * Semantic Score) + (beta * Keyword Score)`
Where `alpha=0.65` and `beta=0.35` (configurable).

## 7. Metadata Filtering
Filters such as Jurisdiction, Domain, and Source Tier are executed as strict database WHERE clauses before the semantic/keyword matching limits.

## 8. Reranking
Reranking is planned via a BGE cross-encoder. Currently, hybrid scores function as the final ranking step to avoid heavy local requirements.

## 9. Evaluation
Golden questions in `data/evaluation/golden_questions.json` map queries to expected source documents. We measure Recall@K and MRR.

## 10. Known Limitations
- OCR fallback isn't fully integrated yet, flagged pages are skipped.
- Table preservation relies heavily on PyMuPDF's raw text dump.
