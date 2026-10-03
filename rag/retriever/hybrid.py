"""
Hybrid Retrieval Engine (Dense pgvector + Sparse BM25 / FTS)
"""

import logging
import os
import time
from typing import Any, Dict, List, Optional

from rag.embeddings.provider import get_embedding_provider
from rag.store.provider import get_store

logger = logging.getLogger(__name__)

class HybridRetriever:
    def __init__(self):
        self.embedding_provider = get_embedding_provider()
        self.store = get_store()
        
        # Load configurable weights
        self.semantic_weight = float(os.environ.get("SEMANTIC_WEIGHT", "0.65"))
        self.keyword_weight = float(os.environ.get("KEYWORD_WEIGHT", "0.35"))

    def retrieve(
        self,
        query: str,
        jurisdiction: Optional[str] = None,
        domain: Optional[str] = None,
        source_tier: Optional[int] = None,
        top_k: int = 8
    ) -> Dict[str, Any]:
        """
        Executes hybrid search combining dense vector search and sparse keyword search.
        """
        start_time = time.time()
        
        # If query is empty, return early
        if not query or not query.strip():
            return {
                "query": query,
                "results": [],
                "total_candidates": 0,
                "evidence_status": "INSUFFICIENT_EVIDENCE",
                "retrieval_metadata": {
                    "semantic_weight": self.semantic_weight,
                    "keyword_weight": self.keyword_weight,
                    "embedding_provider": self.embedding_provider.name,
                    "latency_ms": 0
                }
            }
            
        # 1. Semantic Search
        query_embedding = self.embedding_provider.embed_text(query)
        semantic_results = self.store.semantic_search(
            query_embedding=query_embedding,
            top_k=top_k * 2,
            jurisdiction=jurisdiction,
            domain=domain
        )
        
        # 2. Keyword Search
        keyword_results = self.store.keyword_search(
            query=query,
            top_k=top_k * 2,
            jurisdiction=jurisdiction,
            domain=domain
        )
        
        # 3. Combine and Score
        # We need to normalize scores to 0-1 for meaningful combination.
        # Semantic scores (cosine) are typically -1 to 1, usually 0 to 1 for text.
        # Keyword scores (BM25) can be arbitrary positive numbers. We min-max normalize them.
        
        combined_candidates = {}
        
        # Normalize semantic
        sem_scores = [r.get("cosine_score", 0) for r in semantic_results]
        sem_max = max(sem_scores) if sem_scores else 1.0
        sem_min = min(sem_scores) if sem_scores else 0.0
        
        for r in semantic_results:
            c_id = r["id"]
            raw_score = r.get("cosine_score", 0)
            norm_score = (raw_score - sem_min) / (sem_max - sem_min) if sem_max > sem_min else raw_score
            combined_candidates[c_id] = {
                "doc": r,
                "semantic_score": norm_score,
                "keyword_score": 0.0
            }
            
        # Normalize keyword
        kw_scores = [r.get("bm25_score", 0) for r in keyword_results]
        kw_max = max(kw_scores) if kw_scores else 1.0
        kw_min = min(kw_scores) if kw_scores else 0.0
        
        for r in keyword_results:
            c_id = r["id"]
            raw_score = r.get("bm25_score", 0)
            norm_score = (raw_score - kw_min) / (kw_max - kw_min) if kw_max > kw_min else raw_score
            if c_id in combined_candidates:
                combined_candidates[c_id]["keyword_score"] = norm_score
            else:
                combined_candidates[c_id] = {
                    "doc": r,
                    "semantic_score": 0.0,
                    "keyword_score": norm_score
                }
                
        # Calculate hybrid score
        final_results = []
        for c_id, data in combined_candidates.items():
            doc = data["doc"]
            # Apply tier filter if requested
            if source_tier and doc.get("source_tier", 99) > source_tier:
                continue
                
            hybrid_score = (self.semantic_weight * data["semantic_score"]) + (self.keyword_weight * data["keyword_score"])
            
            tier = doc.get("source_tier", 4)
            authority_score = 1.0 if tier == 1 else (0.8 if tier == 2 else (0.6 if tier == 3 else 0.4))
            
            jur_score = 1.0
            if jurisdiction and doc["jurisdiction"] != jurisdiction:
                jur_score = 0.5
                
            domain_score = 1.0
            if domain and doc["domain"].lower() != domain.lower():
                domain_score = 0.5
                
            final_score = (hybrid_score * 0.5) + (authority_score * 0.2) + (jur_score * 0.2) + (domain_score * 0.1)
            
            result = {
                "chunk_id": doc["id"],
                "document_id": doc["document_id"],
                "content": doc["text_content"],
                "page_number": doc["page_number"],
                "section": doc.get("section") or doc.get("section_ref"),
                "article": doc.get("article"),
                "heading": doc["heading"],
                "authority": doc["authority"],
                "jurisdiction": doc["jurisdiction"],
                "domain": doc["domain"],
                "source_tier": doc.get("source_tier", 1),
                "source_url": doc.get("source_url"),
                "year": doc.get("year"),
                "version": doc.get("version"),
                "semantic_score": round(data["semantic_score"], 4),
                "keyword_score": round(data["keyword_score"], 4),
                "hybrid_score": round(hybrid_score, 4),
                "authority_score": authority_score,
                "final_score": round(final_score, 4)
            }
            final_results.append(result)
            
        # Sort and limit
        final_results.sort(key=lambda x: x["final_score"], reverse=True)
        final_results = final_results[:top_k]
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Log retrieval
        self.store.log_retrieval(
            query_text=query,
            jurisdiction=jurisdiction,
            domain=domain,
            top_k=top_k,
            semantic_weight=self.semantic_weight,
            keyword_weight=self.keyword_weight,
            result_chunk_ids=[r["chunk_id"] for r in final_results],
            result_scores=[r["hybrid_score"] for r in final_results],
            latency_ms=latency_ms,
            embedding_provider=self.embedding_provider.name
        )
        
        return {
            "query": query,
            "results": final_results,
            "total_candidates": len(combined_candidates),
            "evidence_status": "SUCCESS" if final_results else "INSUFFICIENT_EVIDENCE",
            "retrieval_metadata": {
                "semantic_weight": self.semantic_weight,
                "keyword_weight": self.keyword_weight,
                "embedding_provider": self.embedding_provider.name,
                "latency_ms": latency_ms
            }
        }
