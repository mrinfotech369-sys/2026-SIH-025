"""
Supabase PostgreSQL + pgvector Store — IP-SAKTI Sahayak Step 2.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

from supabase import create_client, Client

from rag.store.local_store import DocumentRecord, ChunkRecord

logger = logging.getLogger(__name__)

class SupabaseStore:
    def __init__(self, url: str, key: str):
        self.supabase: Client = create_client(url, key)
        logger.info("SupabaseStore initialised with URL: %s", url)

    def document_exists_by_checksum(self, checksum: str) -> Optional[str]:
        response = self.supabase.table("documents").select("id").eq("checksum", checksum).execute()
        if response.data:
            return response.data[0]["id"]
        return None

    def insert_document(self, doc: DocumentRecord) -> str:
        data = {
            "id": doc.id,
            "title": doc.title,
            "authority": doc.authority,
            "tier": doc.tier,
            "source_tier": doc.source_tier,
            "jurisdiction": doc.jurisdiction,
            "domain": doc.domain,
            "document_type": doc.document_type,
            "source_url": doc.source_url,
            "source_status": doc.source_status,
            "checksum": doc.checksum,
            "language": doc.language,
            "file_name": doc.file_name,
            "metadata": doc.metadata,
            "created_at": doc.created_at,
        }
        self.supabase.table("documents").insert(data).execute()
        return doc.id

    def insert_chunk(self, chunk: ChunkRecord) -> str:
        data = {
            "id": chunk.id,
            "document_id": chunk.document_id,
            "chunk_index": chunk.chunk_index,
            "text_content": chunk.text_content,
            "page_number": chunk.page_number,
            "section_ref": chunk.section,
            "heading": chunk.heading,
            "token_count": chunk.token_count,
            "source_tier": chunk.source_tier,
            "embedding": chunk.embedding,
            "metadata": chunk.metadata,
            "created_at": chunk.created_at,
        }
        self.supabase.table("document_chunks").insert(data).execute()
        return chunk.id

    def insert_chunks_batch(self, chunks: List[ChunkRecord]) -> None:
        if not chunks:
            return
        
        batch_data = []
        for chunk in chunks:
            batch_data.append({
                "id": chunk.id,
                "document_id": chunk.document_id,
                "chunk_index": chunk.chunk_index,
                "text_content": chunk.text_content,
                "page_number": chunk.page_number,
                "section_ref": chunk.section,
                "heading": chunk.heading,
                "token_count": chunk.token_count,
                "source_tier": chunk.source_tier,
                "embedding": chunk.embedding,
                "metadata": chunk.metadata,
                "created_at": chunk.created_at,
            })
            
        # Supabase API limits batch inserts, usually 1000 is safe
        chunk_size = 500
        for i in range(0, len(batch_data), chunk_size):
            self.supabase.table("document_chunks").insert(batch_data[i:i+chunk_size]).execute()

    def count_chunks(self, document_id: Optional[str] = None) -> int:
        query = self.supabase.table("document_chunks").select("id", count="exact")
        if document_id:
            query = query.eq("document_id", document_id)
        response = query.execute()
        return response.count if response.count is not None else 0

    def semantic_search(
        self,
        query_embedding: List[float],
        top_k: int = 20,
        jurisdiction: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        # Requires an RPC function in Supabase for vector matching
        # Because we can't easily do vector ordering purely through postgrest JS
        args = {
            "query_embedding": query_embedding,
            "match_count": top_k
        }
        if jurisdiction:
            args["filter_jurisdiction"] = jurisdiction
        if domain:
            args["filter_domain"] = domain
            
        # Call the RPC function 'match_document_chunks'
        try:
            response = self.supabase.rpc("match_document_chunks", args).execute()
            return response.data
        except Exception as e:
            logger.error("RPC match_document_chunks failed: %s", e)
            return []

    def keyword_search(
        self,
        query: str,
        top_k: int = 20,
        jurisdiction: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        # Full text search using Supabase .textSearch()
        q = self.supabase.table("document_chunks").select(
            "id, document_id, text_content, page_number, section_ref, heading, token_count, source_tier, documents(authority, jurisdiction, domain, source_url)"
        ).textSearch("text_content", query)
        
        if jurisdiction:
            q = q.eq("documents.jurisdiction", jurisdiction)
        if domain:
            q = q.eq("documents.domain", domain)
            
        response = q.limit(top_k).execute()
        
        results = []
        for row in response.data:
            doc = row.get("documents", {})
            results.append({
                "id": row["id"],
                "document_id": row["document_id"],
                "text_content": row["text_content"],
                "page_number": row["page_number"],
                "section": row["section_ref"],
                "heading": row["heading"],
                "token_count": row["token_count"],
                "source_tier": row["source_tier"],
                "authority": doc.get("authority"),
                "jurisdiction": doc.get("jurisdiction"),
                "domain": doc.get("domain"),
                "source_url": doc.get("source_url"),
                "bm25_score": 1.0  # Placeholder, as raw textSearch doesn't easily expose ranking score via postgrest
            })
        return results

    def log_retrieval(self, *args, **kwargs) -> None:
        pass
