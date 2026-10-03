import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

import uuid
from datetime import datetime, timezone
from rag.store.provider import get_store
from rag.store.local_store import SourceRegistryRecord, DocumentRecord, ChunkRecord

def seed_demo_corpus():
    store = get_store()
    
    # 1. Seed Sources
    sources = [
        SourceRegistryRecord(
            source_id="src_ip_india_patents",
            source_name="IP India Patents Act",
            authority="Government of India",
            jurisdiction="IN",
            domain="IP",
            tier=1,
            document_type="Legislation",
            source_url="https://ipindia.gov.in/patents-act-1970",
            official_domain=True,
            description="The Patents Act, 1970",
            active=True,
        ),
        SourceRegistryRecord(
            source_id="src_cdsco_dcr",
            source_name="CDSCO Drugs and Cosmetics Rules",
            authority="CDSCO",
            jurisdiction="IN",
            domain="REGULATORY",
            tier=1,
            document_type="Rules",
            source_url="https://cdsco.gov.in/",
            official_domain=True,
            description="Drugs and Cosmetics Rules 1945",
            active=True,
        ),
        SourceRegistryRecord(
            source_id="src_fda_dshea",
            source_name="US FDA DSHEA",
            authority="US FDA",
            jurisdiction="US",
            domain="REGULATORY",
            tier=2,
            document_type="Legislation",
            source_url="https://www.fda.gov/food/dietary-supplements",
            official_domain=True,
            description="Dietary Supplement Health and Education Act",
            active=True,
        ),
        SourceRegistryRecord(
            source_id="src_tga_australia",
            source_name="TGA Listed Medicines",
            authority="TGA",
            jurisdiction="AU",
            domain="REGULATORY",
            tier=2,
            document_type="Guidelines",
            source_url="https://www.tga.gov.au",
            official_domain=True,
            description="TGA Listed Medicines Guidelines",
            active=True,
        ),
    ]
    
    for s in sources:
        store.insert_source(s)
        
    print("Seeded sources")
    
    # 2. Seed Mock Documents and Chunks
    
    doc_ip = DocumentRecord(
        id=str(uuid.uuid4()),
        title="Patents Act, 1970 - Section 3",
        authority="Government of India",
        tier="TIER_1",
        source_tier=1,
        jurisdiction="IN",
        domain="IP",
        document_type="Legislation",
        source_url="https://ipindia.gov.in/patents-act-1970",
        source_status="verified",
        checksum="ipindia_mock_checksum",
        language="en",
        file_name=None,
        metadata={"DEMO_DATA": True},
        created_at=datetime.now(timezone.utc).isoformat(),
        source_id="src_ip_india_patents",
        section="Section 3(p)"
    )
    
    store.insert_document(doc_ip)
    
    chunk_ip = ChunkRecord(
        id=str(uuid.uuid4()),
        document_id=doc_ip.id,
        chunk_index=0,
        text_content="Section 3(p): an invention which in effect, is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components are not inventions.",
        page_number=1,
        section="Section 3(p)",
        heading="What are not inventions",
        token_count=35,
        source_tier=1,
        embedding=None,  # mock
        metadata={"DEMO_DATA": True},
        created_at=datetime.now(timezone.utc).isoformat()
    )
    store.insert_chunk(chunk_ip)
    
    doc_us = DocumentRecord(
        id=str(uuid.uuid4()),
        title="FDA Dietary Supplement Guidelines",
        authority="US FDA",
        tier="TIER_2",
        source_tier=2,
        jurisdiction="US",
        domain="REGULATORY",
        document_type="Guidelines",
        source_url="https://www.fda.gov/food/dietary-supplements",
        source_status="verified",
        checksum="fda_mock_checksum",
        language="en",
        file_name=None,
        metadata={"DEMO_DATA": True},
        created_at=datetime.now(timezone.utc).isoformat(),
        source_id="src_fda_dshea",
    )
    
    store.insert_document(doc_us)
    
    chunk_us = ChunkRecord(
        id=str(uuid.uuid4()),
        document_id=doc_us.id,
        chunk_index=0,
        text_content="Under DSHEA, a firm is responsible for determining that the dietary supplements it manufactures or distributes are safe and that any representations or claims made about them are substantiated by adequate evidence.",
        page_number=1,
        section="Overview",
        heading="Responsibilities",
        token_count=40,
        source_tier=2,
        embedding=None,
        metadata={"DEMO_DATA": True},
        created_at=datetime.now(timezone.utc).isoformat()
    )
    store.insert_chunk(chunk_us)

    doc_au = DocumentRecord(
        id=str(uuid.uuid4()),
        title="TGA Listed Medicines Guidelines",
        authority="TGA",
        tier="TIER_2",
        source_tier=2,
        jurisdiction="AU",
        domain="REGULATORY",
        document_type="Guidelines",
        source_url="https://www.tga.gov.au",
        source_status="verified",
        checksum="tga_mock_checksum",
        language="en",
        file_name=None,
        metadata={"DEMO_DATA": True},
        created_at=datetime.now(timezone.utc).isoformat(),
        source_id="src_tga_australia",
    )
    
    store.insert_document(doc_au)
    
    chunk_au = ChunkRecord(
        id=str(uuid.uuid4()),
        document_id=doc_au.id,
        chunk_index=0,
        text_content="Listed medicines (AUST L) must only contain pre-approved low-risk ingredients and can only make indications (claims) for health maintenance and health enhancement or certain indications for non-serious, self-limiting conditions.",
        page_number=1,
        section="Overview",
        heading="Listed medicines",
        token_count=40,
        source_tier=2,
        embedding=None,
        metadata={"DEMO_DATA": True},
        created_at=datetime.now(timezone.utc).isoformat()
    )
    store.insert_chunk(chunk_au)

    print("Seeded documents and chunks")

if __name__ == "__main__":
    seed_demo_corpus()
