import sqlite3
import os
from pathlib import Path

def migrate():
    db_path = os.environ.get("LOCAL_STORE_PATH", str(Path(__file__).resolve().parents[1] / "data" / "local_store.db"))
    print(f"Migrating {db_path}")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Create source_registry
    c.executescript("""
    CREATE TABLE IF NOT EXISTS source_registry (
        source_id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        authority TEXT NOT NULL,
        jurisdiction TEXT NOT NULL,
        domain TEXT NOT NULL,
        tier INTEGER NOT NULL,
        document_type TEXT,
        source_url TEXT,
        official_domain BOOLEAN DEFAULT 1,
        description TEXT,
        active BOOLEAN DEFAULT 1,
        last_verified_at TEXT,
        last_updated_at TEXT,
        version TEXT,
        effective_date TEXT
    );
    """)
    conn.commit()

    # Add columns to documents if they don't exist
    c.execute("PRAGMA table_info(documents);")
    columns = [row[1] for row in c.fetchall()]
    
    alter_queries = []
    if "source_id" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN source_id TEXT;")
    if "section" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN section TEXT;")
    if "article" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN article TEXT;")
    if "year" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN year TEXT;")
    if "version" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN version TEXT;")
    if "effective_date" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN effective_date TEXT;")
    if "verification_date" not in columns:
        alter_queries.append("ALTER TABLE documents ADD COLUMN verification_date TEXT;")
        
    for q in alter_queries:
        print(f"Executing: {q}")
        c.execute(q)
        
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
