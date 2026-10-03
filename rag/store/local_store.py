"""
Local Store — IP-SAKTI Sahayak Step 2.

In-memory SQLite-based document and chunk store used when Supabase credentials
are not configured. Implements the same interface as SupabaseStore.

Features:
- SQLite with FTS5 for keyword search
- NumPy cosine similarity for vector search
- Thread-safe singleton database connection
- Persists to disk at data/local_store.db by default (configurable)
"""

import json
import logging
import math
import os
import sqlite3
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SourceRegistryRecord:
    source_id: str
    source_name: str
    authority: str
    jurisdiction: str
    domain: str
    tier: int
    document_type: str
    source_url: str
    official_domain: bool
    description: str
    active: bool
    last_verified_at: Optional[str] = None
    last_updated_at: Optional[str] = None
    version: Optional[str] = None
    effective_date: Optional[str] = None

@dataclass
class DocumentRecord:
    id: str
    title: str
    authority: str
    tier: str                  # 'TIER_1' .. 'TIER_4'
    source_tier: int           # 1..4
    jurisdiction: str          # 'IN', 'US', 'AU', 'INTERNATIONAL'
    domain: str
    document_type: str
    source_url: Optional[str]
    source_status: str
    checksum: Optional[str]
    language: str
    file_name: Optional[str]
    metadata: Dict[str, Any]
    created_at: str
    source_id: Optional[str] = None
    section: Optional[str] = None
    article: Optional[str] = None
    year: Optional[str] = None
    version: Optional[str] = None
    effective_date: Optional[str] = None
    verification_date: Optional[str] = None


@dataclass
class ChunkRecord:
    id: str
    document_id: str
    chunk_index: int
    text_content: str
    page_number: Optional[int]
    section: Optional[str]
    heading: Optional[str]
    token_count: Optional[int]
    source_tier: int
    embedding: Optional[List[float]]
    metadata: Dict[str, Any]
    created_at: str


@dataclass
class RetrievalResult:
    chunk_id: str
    document_id: str
    text_content: str
    page_number: Optional[int]
    section: Optional[str]
    heading: Optional[str]
    authority: str
    jurisdiction: str
    domain: str
    source_tier: int
    source_url: Optional[str]
    semantic_score: float
    keyword_score: float
    hybrid_score: float
    token_count: Optional[int]


# ---------------------------------------------------------------------------
# LocalStore
# ---------------------------------------------------------------------------

_DB_LOCK = threading.Lock()
_DB_INSTANCE: Optional["LocalStore"] = None


class LocalStore:
    """
    SQLite-backed local store. Use get_local_store() to get the singleton.
    """

    def __init__(self, db_path: str):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()
        logger.info("LocalStore initialised at: %s", db_path)

    def _init_schema(self) -> None:
        c = self._conn
        c.executescript("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                authority TEXT NOT NULL,
                tier TEXT NOT NULL DEFAULT 'TIER_1',
                source_tier INTEGER NOT NULL DEFAULT 1,
                jurisdiction TEXT NOT NULL DEFAULT 'IN',
                domain TEXT NOT NULL,
                document_type TEXT NOT NULL,
                source_url TEXT,
                source_status TEXT DEFAULT 'needs_verification',
                checksum TEXT UNIQUE,
                language TEXT DEFAULT 'en',
                file_name TEXT,
                metadata TEXT DEFAULT '{}',
                created_at TEXT,
                source_id TEXT,
                section TEXT,
                article TEXT,
                year TEXT,
                version TEXT,
                effective_date TEXT,
                verification_date TEXT
            );

            CREATE TABLE IF NOT EXISTS document_chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                chunk_index INTEGER NOT NULL,
                text_content TEXT NOT NULL,
                page_number INTEGER,
                section TEXT,
                heading TEXT,
                token_count INTEGER,
                source_tier INTEGER DEFAULT 1,
                embedding BLOB,          -- JSON-encoded float list
                metadata TEXT DEFAULT '{}',
                created_at TEXT
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
                chunk_id UNINDEXED,
                text_content
            );

            CREATE TABLE IF NOT EXISTS retrieval_logs (
                id TEXT PRIMARY KEY,
                query_text TEXT NOT NULL,
                jurisdiction TEXT,
                domain TEXT,
                top_k INTEGER DEFAULT 5,
                semantic_weight REAL DEFAULT 0.65,
                keyword_weight REAL DEFAULT 0.35,
                result_chunk_ids TEXT DEFAULT '[]',
                result_scores TEXT DEFAULT '[]',
                latency_ms INTEGER,
                provider TEXT DEFAULT 'local',
                embedding_provider TEXT DEFAULT 'mock',
                created_at TEXT
            );
        """)
        c.commit()
        # FTS triggers for auto-sync
        c.executescript("""
            CREATE TRIGGER IF NOT EXISTS chunks_fts_insert AFTER INSERT ON document_chunks BEGIN
                INSERT INTO chunks_fts(chunk_id, text_content) VALUES (new.id, new.text_content);
            END;
            CREATE TRIGGER IF NOT EXISTS chunks_fts_delete AFTER DELETE ON document_chunks BEGIN
                INSERT INTO chunks_fts(chunks_fts, chunk_id, text_content) VALUES ('delete', old.id, old.text_content);
            END;
            CREATE TRIGGER IF NOT EXISTS chunks_fts_update AFTER UPDATE ON document_chunks BEGIN
                INSERT INTO chunks_fts(chunks_fts, chunk_id, text_content) VALUES ('delete', old.id, old.text_content);
                INSERT INTO chunks_fts(chunk_id, text_content) VALUES (new.id, new.text_content);
            END;
        """)
        c.commit()

    # ------------------------------------------------------------------
    # Document CRUD
    # ------------------------------------------------------------------

    def document_exists_by_checksum(self, checksum: str) -> Optional[str]:
        """Return document id if a document with this checksum already exists."""
        row = self._conn.execute(
            "SELECT id FROM documents WHERE checksum = ?", (checksum,)
        ).fetchone()
        return row["id"] if row else None

    def insert_document(self, doc: DocumentRecord) -> str:
        with _DB_LOCK:
            self._conn.execute(
                """INSERT INTO documents
                   (id, title, authority, tier, source_tier, jurisdiction, domain,
                    document_type, source_url, source_status, checksum, language,
                    file_name, metadata, created_at, source_id, section, article,
                    year, version, effective_date, verification_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (doc.id, doc.title, doc.authority, doc.tier, doc.source_tier,
                 doc.jurisdiction, doc.domain, doc.document_type, doc.source_url,
                 doc.source_status, doc.checksum, doc.language, doc.file_name,
                 json.dumps(doc.metadata), doc.created_at, doc.source_id,
                 doc.section, doc.article, doc.year, doc.version, doc.effective_date,
                 doc.verification_date)
            )
            self._conn.commit()
        return doc.id

    def get_document(self, doc_id: str) -> Optional[DocumentRecord]:
        row = self._conn.execute(
            "SELECT * FROM documents WHERE id = ?", (doc_id,)
        ).fetchone()
        if not row:
            return None
        return self._row_to_doc(row)

    def list_documents(
        self,
        jurisdiction: Optional[str] = None,
        domain: Optional[str] = None,
        source_tier: Optional[int] = None,
    ) -> List[DocumentRecord]:
        query = "SELECT * FROM documents WHERE 1=1"
        params: List[Any] = []
        if jurisdiction:
            query += " AND jurisdiction = ?"
            params.append(jurisdiction)
        if domain:
            query += " AND domain = ?"
            params.append(domain)
        if source_tier is not None:
            query += " AND source_tier <= ?"
            params.append(source_tier)
        rows = self._conn.execute(query, params).fetchall()
        return [self._row_to_doc(r) for r in rows]

    def _row_to_doc(self, row: sqlite3.Row) -> DocumentRecord:
        keys = row.keys()
        return DocumentRecord(
            id=row["id"],
            title=row["title"],
            authority=row["authority"],
            tier=row["tier"],
            source_tier=row["source_tier"],
            jurisdiction=row["jurisdiction"],
            domain=row["domain"],
            document_type=row["document_type"],
            source_url=row["source_url"],
            source_status=row["source_status"],
            checksum=row["checksum"],
            language=row["language"],
            file_name=row["file_name"],
            metadata=json.loads(row["metadata"] or "{}"),
            created_at=row["created_at"],
            source_id=row["source_id"] if "source_id" in keys else None,
            section=row["section"] if "section" in keys else None,
            article=row["article"] if "article" in keys else None,
            year=row["year"] if "year" in keys else None,
            version=row["version"] if "version" in keys else None,
            effective_date=row["effective_date"] if "effective_date" in keys else None,
            verification_date=row["verification_date"] if "verification_date" in keys else None,
        )

    # ------------------------------------------------------------------
    # Source Registry CRUD
    # ------------------------------------------------------------------

    def insert_source(self, source: SourceRegistryRecord) -> None:
        with _DB_LOCK:
            self._conn.execute(
                """INSERT OR REPLACE INTO source_registry
                   (source_id, source_name, authority, jurisdiction, domain,
                    tier, document_type, source_url, official_domain, description,
                    active, last_verified_at, last_updated_at, version, effective_date)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (source.source_id, source.source_name, source.authority,
                 source.jurisdiction, source.domain, source.tier, source.document_type,
                 source.source_url, source.official_domain, source.description,
                 source.active, source.last_verified_at, source.last_updated_at,
                 source.version, source.effective_date)
            )
            self._conn.commit()

    def get_source(self, source_id: str) -> Optional[SourceRegistryRecord]:
        row = self._conn.execute("SELECT * FROM source_registry WHERE source_id = ?", (source_id,)).fetchone()
        if not row:
            return None
        return SourceRegistryRecord(**dict(row))

    def list_sources(self) -> List[SourceRegistryRecord]:
        rows = self._conn.execute("SELECT * FROM source_registry").fetchall()
        return [SourceRegistryRecord(**dict(row)) for row in rows]

    # ------------------------------------------------------------------
    # Chunk CRUD
    # ------------------------------------------------------------------

    def insert_chunk(self, chunk: ChunkRecord) -> str:
        emb_json = json.dumps(chunk.embedding) if chunk.embedding else None
        with _DB_LOCK:
            self._conn.execute(
                """INSERT INTO document_chunks
                   (id, document_id, chunk_index, text_content, page_number,
                    section, heading, token_count, source_tier, embedding,
                    metadata, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (chunk.id, chunk.document_id, chunk.chunk_index, chunk.text_content,
                 chunk.page_number, chunk.section, chunk.heading, chunk.token_count,
                 chunk.source_tier, emb_json, json.dumps(chunk.metadata), chunk.created_at)
            )
            self._conn.commit()
        return chunk.id

    def insert_chunks_batch(self, chunks: List[ChunkRecord]) -> None:
        rows = [
            (c.id, c.document_id, c.chunk_index, c.text_content, c.page_number,
             c.section, c.heading, c.token_count, c.source_tier,
             json.dumps(c.embedding) if c.embedding else None,
             json.dumps(c.metadata), c.created_at)
            for c in chunks
        ]
        with _DB_LOCK:
            self._conn.executemany(
                """INSERT INTO document_chunks
                   (id, document_id, chunk_index, text_content, page_number,
                    section, heading, token_count, source_tier, embedding,
                    metadata, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                rows
            )
            self._conn.commit()

    def count_chunks(self, document_id: Optional[str] = None) -> int:
        if document_id:
            row = self._conn.execute(
                "SELECT COUNT(*) as n FROM document_chunks WHERE document_id = ?",
                (document_id,)
            ).fetchone()
        else:
            row = self._conn.execute("SELECT COUNT(*) as n FROM document_chunks").fetchone()
        return row["n"]

    # ------------------------------------------------------------------
    # Retrieval: Keyword (FTS5)
    # ------------------------------------------------------------------

    def keyword_search(
        self,
        query: str,
        top_k: int = 20,
        jurisdiction: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """FTS5 keyword search. Returns rows with bm25 score."""
        # Build FTS query — escape special chars
        fts_query = " ".join(
            f'"{w}"' if len(w) > 2 else w
            for w in query.split()
            if w
        )
        sql = """
            SELECT dc.id, dc.document_id, dc.text_content, dc.page_number,
                   dc.section, dc.heading, dc.token_count, dc.source_tier,
                   d.authority, d.jurisdiction, d.domain, d.source_url,
                   d.article, d.year, d.version,
                   bm25(chunks_fts) AS bm25_score
            FROM chunks_fts
            JOIN document_chunks dc ON chunks_fts.chunk_id = dc.id
            JOIN documents d ON dc.document_id = d.id
            WHERE chunks_fts MATCH ?
        """
        params: List[Any] = [fts_query]
        if jurisdiction:
            sql += " AND d.jurisdiction IN (?, 'INTERNATIONAL')"
            params.append(jurisdiction)
        if domain:
            sql += " AND d.domain = ?"
            params.append(domain)
        sql += " ORDER BY bm25_score LIMIT ?"
        params.append(top_k)
        try:
            rows = self._conn.execute(sql, params).fetchall()
        except sqlite3.OperationalError as e:
            logger.warning("FTS query failed for '%s': %s", query, e)
            return []
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Retrieval: Semantic (cosine similarity via NumPy)
    # ------------------------------------------------------------------

    def semantic_search(
        self,
        query_embedding: List[float],
        top_k: int = 20,
        jurisdiction: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Cosine similarity search over stored embeddings."""
        sql = """
            SELECT dc.id, dc.document_id, dc.text_content, dc.page_number,
                   dc.section, dc.heading, dc.token_count, dc.source_tier,
                   dc.embedding,
                   d.authority, d.jurisdiction, d.domain, d.source_url,
                   d.article, d.year, d.version
            FROM document_chunks dc
            JOIN documents d ON dc.document_id = d.id
            WHERE dc.embedding IS NOT NULL
        """
        params: List[Any] = []
        if jurisdiction:
            sql += " AND d.jurisdiction IN (?, 'INTERNATIONAL')"
            params.append(jurisdiction)
        if domain:
            sql += " AND d.domain = ?"
            params.append(domain)

        rows = self._conn.execute(sql, params).fetchall()
        if not rows:
            return []

        q_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        scored: List[tuple] = []
        for row in rows:
            try:
                emb = json.loads(row["embedding"])
                v = np.array(emb, dtype=np.float32)
                v_norm = np.linalg.norm(v)
                if v_norm > 0:
                    v = v / v_norm
                score = float(np.dot(q_vec, v))
            except Exception:
                score = 0.0
            scored.append((score, dict(row)))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]
        return [{"cosine_score": s, **r} for s, r in top]

    # ------------------------------------------------------------------
    # Retrieval Logging
    # ------------------------------------------------------------------

    def log_retrieval(
        self,
        query_text: str,
        jurisdiction: Optional[str],
        domain: Optional[str],
        top_k: int,
        semantic_weight: float,
        keyword_weight: float,
        result_chunk_ids: List[str],
        result_scores: List[float],
        latency_ms: int,
        embedding_provider: str = "mock",
    ) -> None:
        with _DB_LOCK:
            self._conn.execute(
                """INSERT INTO retrieval_logs
                   (id, query_text, jurisdiction, domain, top_k,
                    semantic_weight, keyword_weight, result_chunk_ids,
                    result_scores, latency_ms, provider, embedding_provider, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (str(uuid.uuid4()), query_text, jurisdiction, domain, top_k,
                 semantic_weight, keyword_weight,
                 json.dumps(result_chunk_ids), json.dumps(result_scores),
                 latency_ms, "local", embedding_provider,
                 datetime.now(timezone.utc).isoformat())
            )
            self._conn.commit()

    def stats(self) -> Dict[str, int]:
        return {
            "documents": self._conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
            "chunks": self._conn.execute("SELECT COUNT(*) FROM document_chunks").fetchone()[0],
            "retrieval_logs": self._conn.execute("SELECT COUNT(*) FROM retrieval_logs").fetchone()[0],
        }

    def close(self) -> None:
        self._conn.close()


# ---------------------------------------------------------------------------
# Singleton factory
# ---------------------------------------------------------------------------

def get_local_store(db_path: Optional[str] = None) -> LocalStore:
    """Return the singleton LocalStore instance."""
    global _DB_INSTANCE
    if _DB_INSTANCE is None:
        path = db_path or os.environ.get(
            "LOCAL_STORE_PATH",
            str(Path(__file__).resolve().parents[2] / "data" / "local_store.db")
        )
        _DB_INSTANCE = LocalStore(db_path=path)
    return _DB_INSTANCE
