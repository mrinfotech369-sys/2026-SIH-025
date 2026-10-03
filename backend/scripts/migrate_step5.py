import sqlite3
import os
from pathlib import Path

def migrate_db():
    db_path = os.environ.get("LOCAL_STORE_PATH", str(Path(__file__).resolve().parents[3] / "data" / "local_store.db"))
    print(f"Migrating database at {db_path}")
    conn = sqlite3.connect(db_path)
    
    new_columns = {
        "official_domain": "INTEGER DEFAULT 0",
        "active": "INTEGER DEFAULT 1",
        "last_verified_at": "TEXT",
        "last_updated_at": "TEXT",
        "version": "TEXT",
        "effective_date": "TEXT",
        "status": "TEXT DEFAULT 'UNKNOWN'"
    }
    
    for col, definition in new_columns.items():
        try:
            conn.execute(f"ALTER TABLE documents ADD COLUMN {col} {definition}")
            print(f"Added column {col}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col} already exists")
            else:
                print(f"Error adding {col}: {e}")
                
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate_db()
