"""Project and snapshot scoped reciprocal-rank fusion of lexical and vector results."""
from .inference import EMBED_MODEL

def retrieve(c, project_id, document_ids, query, vector, limit=8):
    if not document_ids: return []
    scope = (project_id, document_ids)
    lexical = c.execute('''SELECT id, content, location, document_id FROM chunks
      WHERE project_id=%s AND document_id=ANY(%s::uuid[]) AND search @@ plainto_tsquery('english',%s)
      ORDER BY ts_rank(search, plainto_tsquery('english',%s)) DESC LIMIT 20''', (*scope, query, query)).fetchall()
    semantic = c.execute('''SELECT id, content, location, document_id FROM chunks
      WHERE project_id=%s AND document_id=ANY(%s::uuid[]) AND embedding IS NOT NULL AND embedding_model=%s
      ORDER BY embedding <=> %s::vector LIMIT 20''', (*scope, EMBED_MODEL, str(vector))).fetchall()
    scores, rows = {}, {}
    for ranked in [lexical, semantic]:
        for rank, row in enumerate(ranked):
            key = str(row['id']); rows[key] = row
            scores[key] = scores.get(key, 0) + 1 / (60 + rank + 1)
    return [{'id': key, 'text': rows[key]['content'][:6000], 'location': rows[key]['location'],
             'document_id': str(rows[key]['document_id'])}
            for key in sorted(scores, key=scores.get, reverse=True)[:limit]]
