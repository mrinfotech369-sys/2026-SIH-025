"""
Ingestion Pipeline CLI — IP-SAKTI Sahayak Step 2.
"""

import argparse
import hashlib
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from ingestion.parsers.pdf_parser import parse_pdf
from ingestion.chunker import chunk_pages
from rag.embeddings.provider import get_embedding_provider
from rag.store.provider import get_store
from rag.store.local_store import DocumentRecord, ChunkRecord

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

def hash_file(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def ingest_file(
    file_path: str,
    jurisdiction: str,
    domain: str,
    authority: str,
    source_tier: int,
    dry_run: bool = False
):
    path = Path(file_path)
    if not path.exists():
        logger.error(f"File not found: {path}")
        sys.exit(1)
        
    logger.info(f"Starting ingestion for {path.name}")
    
    # 1. Idempotency Check
    checksum = hash_file(path)
    store = get_store()
    existing_doc_id = store.document_exists_by_checksum(checksum)
    
    if existing_doc_id:
        logger.warning(f"Document already ingested. (Doc ID: {existing_doc_id})")
        return
        
    # 2. Parse PDF
    parse_result = parse_pdf(path)
    
    # 3. Chunk
    chunks = chunk_pages(parse_result.pages, target_tokens=700, overlap_tokens=100)
    
    if not chunks:
        logger.warning("No text could be extracted or chunked.")
        return
        
    # 4. Embed
    embedding_provider = get_embedding_provider()
    
    if not dry_run:
        doc_id = str(uuid.uuid4())
        
        doc = DocumentRecord(
            id=doc_id,
            title=parse_result.title_guess or path.stem,
            authority=authority,
            tier=f"TIER_{source_tier}",
            source_tier=source_tier,
            jurisdiction=jurisdiction.upper(),
            domain=domain.upper(),
            document_type="PDF",
            source_url=None,
            source_status="verified",
            checksum=checksum,
            language=parse_result.language_guess,
            file_name=path.name,
            metadata={"pages": parse_result.total_pages, "ocr_pages": parse_result.ocr_pages},
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        store.insert_document(doc)
        logger.info(f"Inserted document record: {doc_id}")
        
        chunk_records = []
        texts_to_embed = [c.text for c in chunks]
        
        logger.info("Generating embeddings...")
        embeddings = embedding_provider.embed_batch(texts_to_embed)
        
        for i, c in enumerate(chunks):
            chunk_records.append(ChunkRecord(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                chunk_index=c.chunk_index,
                text_content=c.text,
                page_number=c.page_number,
                section=c.section,
                heading=c.heading,
                token_count=c.token_count,
                source_tier=source_tier,
                embedding=embeddings[i],
                metadata={},
                created_at=datetime.now(timezone.utc).isoformat()
            ))
            
        store.insert_chunks_batch(chunk_records)
        logger.info(f"Inserted {len(chunk_records)} chunks.")
    else:
        logger.info(f"[DRY-RUN] Would insert document {path.name} with {len(chunks)} chunks.")

def main():
    parser = argparse.ArgumentParser(description="IP-SAKTI Sahayak Document Ingestion")
    parser.add_argument("--input", required=True, help="Path to PDF file")
    parser.add_argument("--jurisdiction", required=True, help="e.g. INDIA, USA, INTERNATIONAL")
    parser.add_argument("--domain", required=True, help="e.g. REGULATORY, PATENT")
    parser.add_argument("--authority", required=True, help="e.g. IP India, CDSCO")
    parser.add_argument("--source-tier", type=int, required=True, help="1 to 4")
    parser.add_argument("--dry-run", action="store_true", help="Do not save to DB")
    
    args = parser.parse_args()
    
    ingest_file(
        args.input,
        args.jurisdiction,
        args.domain,
        args.authority,
        args.source_tier,
        args.dry_run
    )

if __name__ == "__main__":
    main()
