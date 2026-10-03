import sqlite3, json, hashlib
import numpy as np

c=sqlite3.connect('../data/local_store.db')
rows = c.execute('SELECT id, text_content FROM document_chunks WHERE embedding IS NULL').fetchall()
EMBEDDING_DIM = 1024
updates = []
for r in rows:
    digest = hashlib.sha256(r[1].encode('utf-8')).digest()
    seed = int.from_bytes(digest[:4], 'big')
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(EMBEDDING_DIM).astype(np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0: 
        vec = vec / norm
    updates.append((json.dumps(vec.tolist()), r[0]))

c.executemany('UPDATE document_chunks SET embedding = ? WHERE id = ?', updates)
c.commit()
print(f'Updated {len(updates)} chunks')
