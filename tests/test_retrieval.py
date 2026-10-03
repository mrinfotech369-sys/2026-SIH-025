import pytest
import os
import uuid
import tempfile
from pathlib import Path

from rag.store.local_store import LocalStore, DocumentRecord, ChunkRecord
from rag.embeddings.provider import MockEmbeddingProvider
from rag.retriever.hybrid import HybridRetriever

@pytest.fixture
def temp_store():
    # Setup a temporary local DB for tests
    temp_dir = tempfile.TemporaryDirectory()
    db_path = os.path.join(temp_dir.name, "test_store.db")
    store = LocalStore(db_path=db_path)
    
    # Pre-populate with some test documents
    doc1 = DocumentRecord(
        id=str(uuid.uuid4()),
        title="Drugs and Cosmetics Act",
        authority="CDSCO",
        tier="TIER_1",
        source_tier=1,
        jurisdiction="INDIA",
        domain="REGULATORY",
        document_type="ACT",
        source_url=None,
        source_status="verified",
        checksum="hash1",
        language="en",
        file_name="dca.pdf",
        metadata={},
        created_at="2023-01-01T00:00:00Z"
    )
    doc2 = DocumentRecord(
        id=str(uuid.uuid4()),
        title="US FDA Guidelines",
        authority="US FDA",
        tier="TIER_2",
        source_tier=2,
        jurisdiction="USA",
        domain="REGULATORY",
        document_type="GUIDELINE",
        source_url=None,
        source_status="verified",
        checksum="hash2",
        language="en",
        file_name="fda.pdf",
        metadata={"foo": "bar"},
        created_at="2023-01-01T00:00:00Z"
    )
    store.insert_document(doc1)
    store.insert_document(doc2)
    
    # Mock embeddings
    provider = MockEmbeddingProvider()
    
    # Chunks
    chunk1 = ChunkRecord(
        id=str(uuid.uuid4()),
        document_id=doc1.id,
        chunk_index=0,
        text_content="Section 3: Ayurveda drugs definition. An ayurvedic drug must be from authoritative books.",
        page_number=1,
        section="Section 3",
        heading="Definitions",
        token_count=15,
        source_tier=1,
        embedding=provider.embed_text("Section 3: Ayurveda drugs definition. An ayurvedic drug must be from authoritative books."),
        metadata={},
        created_at="2023-01-01T00:00:00Z"
    )
    chunk2 = ChunkRecord(
        id=str(uuid.uuid4()),
        document_id=doc2.id,
        chunk_index=0,
        text_content="Dietary Supplement Health and Education Act (DSHEA) defines supplements.",
        page_number=1,
        section="Introduction",
        heading="Overview",
        token_count=10,
        source_tier=2,
        embedding=provider.embed_text("Dietary Supplement Health and Education Act (DSHEA) defines supplements."),
        metadata={},
        created_at="2023-01-01T00:00:00Z"
    )
    
    store.insert_chunks_batch([chunk1, chunk2])
    
    yield store
    store.close()
    temp_dir.cleanup()

def test_metadata_preservation(temp_store):
    docs = temp_store.list_documents()
    assert len(docs) == 2
    # Ensure metadata parsing worked correctly
    us_doc = next(d for d in docs if d.jurisdiction == "USA")
    assert us_doc.metadata.get("foo") == "bar"

def test_checksum_idempotency(temp_store):
    # Already inserted "hash1"
    existing_id = temp_store.document_exists_by_checksum("hash1")
    assert existing_id is not None
    non_existing = temp_store.document_exists_by_checksum("hash_new")
    assert non_existing is None

def test_keyword_retrieval(temp_store):
    res = temp_store.keyword_search("ayurveda", top_k=5)
    assert len(res) == 1
    assert "ayurveda" in res[0]["text_content"].lower()

def test_vector_retrieval(temp_store):
    provider = MockEmbeddingProvider()
    vec = provider.embed_text("ayurveda definition")
    res = temp_store.semantic_search(vec, top_k=5)
    assert len(res) == 2  # Returns all but scored

def test_hybrid_retrieval(monkeypatch, temp_store):
    # Monkeypatch get_store to use our temp_store
    import rag.retriever.hybrid
    monkeypatch.setattr(rag.retriever.hybrid, "get_store", lambda: temp_store)
    
    retriever = HybridRetriever()
    res = retriever.retrieve("ayurveda")
    assert res["evidence_status"] == "SUCCESS"
    assert len(res["results"]) > 0
    assert "hybrid_score" in res["results"][0]

def test_jurisdiction_filtering(monkeypatch, temp_store):
    import rag.retriever.hybrid
    monkeypatch.setattr(rag.retriever.hybrid, "get_store", lambda: temp_store)
    
    retriever = HybridRetriever()
    res = retriever.retrieve("drug", jurisdiction="USA")
    assert len(res["results"]) == 1
    assert res["results"][0]["jurisdiction"] == "USA"

def test_source_tier_filtering(monkeypatch, temp_store):
    import rag.retriever.hybrid
    monkeypatch.setattr(rag.retriever.hybrid, "get_store", lambda: temp_store)
    
    retriever = HybridRetriever()
    res = retriever.retrieve("health", source_tier=1)
    # The US doc (tier 2) contains health, but we filtered tier 1
    # Note: DSHEA has "Health" in the text, so normally it would match keyword search.
    # The filter should exclude it.
    for r in res["results"]:
        assert r["source_tier"] <= 1

def test_empty_query_handling(monkeypatch, temp_store):
    import rag.retriever.hybrid
    monkeypatch.setattr(rag.retriever.hybrid, "get_store", lambda: temp_store)
    
    retriever = HybridRetriever()
    res = retriever.retrieve("   ")
    assert res["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert len(res["results"]) == 0

def test_no_result_handling(monkeypatch, temp_store):
    import rag.retriever.hybrid
    monkeypatch.setattr(rag.retriever.hybrid, "get_store", lambda: temp_store)
    
    retriever = HybridRetriever()
    # "zebra" doesn't exist in our chunks
    res = retriever.retrieve("zebra", jurisdiction="INTERNATIONAL")
    assert res["evidence_status"] == "INSUFFICIENT_EVIDENCE"
    assert len(res["results"]) == 0

def test_pdf_parsing_and_chunking():
    from ingestion.parsers.pdf_parser import PDFParseResult, PageResult
    from ingestion.chunker import chunk_pages
    
    pages = [
        PageResult(page_num=1, text="Section 1. Definitions.\n\nParagraph one is here.", word_count=10),
        PageResult(page_num=2, text="Paragraph two is here.\n\nSection 2. Scope.\n\nScope is broad.", word_count=15)
    ]
    chunks = chunk_pages(pages, target_tokens=10, overlap_tokens=0, min_tokens=1)
    # Just basic sanity check that chunker produces Chunk objects
    assert len(chunks) > 0
    assert chunks[0].section is not None
