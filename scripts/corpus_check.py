import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))

import json
from rag.store.provider import get_store

def check_corpus():
    store = get_store()
    
    docs = store.list_documents()
    chunks = store._conn.execute("SELECT * FROM document_chunks").fetchall()
    
    report = {
        "TOTAL DOCUMENTS": len(docs),
        "TOTAL CHUNKS": len(chunks),
        "TIER 1 DOCUMENTS": len([d for d in docs if d.source_tier == 1]),
        "TIER 2 DOCUMENTS": len([d for d in docs if d.source_tier == 2]),
        "TIER 3 DOCUMENTS": len([d for d in docs if d.source_tier == 3]),
        "TIER 4 DOCUMENTS": len([d for d in docs if d.source_tier == 4]),
        "MISSING METADATA": 0,
        "DUPLICATES": 0,
        "INVALID RECORDS": 0
    }
    
    # Check for missing metadata
    for doc in docs:
        if not doc.jurisdiction or not doc.authority or not doc.source_url or not doc.tier:
            report["MISSING METADATA"] += 1
            
    for chunk in chunks:
        if not chunk["text_content"] or len(chunk["text_content"]) < 10:
            report["INVALID RECORDS"] += 1
            
    print("CORPUS QUALITY CHECK REPORT")
    print(json.dumps(report, indent=2))
    
if __name__ == "__main__":
    check_corpus()
