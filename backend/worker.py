import json
import time
import uuid
from .db import connect, initialize, event, Jsonb
from .rules import review
from .inference import Ollama, MODEL, EMBED_MODEL, PROMPT_VERSION, validate_findings
from .retrieval import retrieve


def claim():
    with connect() as c:
        c.execute("UPDATE jobs SET status='failed', stage='Failed', error='Worker interrupted repeatedly; start a new review' WHERE status='running' AND lease_until < now() AND attempts>=3")
        return c.execute('''UPDATE jobs SET status='running', attempts=attempts+1,
          lease_until=now()+interval '10 minutes', updated_at=now(), stage='Checking confirmed rows'
          WHERE id=(SELECT id FROM jobs WHERE status='queued' OR
          (status='running' AND lease_until<now() AND attempts<3) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
          RETURNING *''').fetchone()

def progress(job, stage):
    with connect() as c:
        changed = c.execute("UPDATE jobs SET stage=%s, lease_until=now()+interval '10 minutes',updated_at=now() WHERE id=%s AND attempts=%s AND status='running'", (stage, job['id'], job['attempts'])).rowcount
        if not changed: raise RuntimeError('Job lease lost')

def execute(job):
    snap = job['snapshot']; documents = snap['documents']
    rows = [r for d in documents if d['role'] == 'assessment' for r in d['extraction']['rows']]
    requirements = {}
    for d in documents:
        if d['role'] == 'requirements':
            for key, ids in d['extraction']['requirements'].items(): requirements.setdefault(key, []).extend(ids)
    findings = review(rows, requirements, snap['profile'])
    result = {'findings': findings, 'profile': snap['profile'], 'rows_reviewed': len(rows),
              'semantic_reviews': [], 'limitations': [], 'model': MODEL, 'embedding_model': EMBED_MODEL,
              'prompt_version': PROMPT_VERSION, 'documents': [{'id': d['id'], 'sha256': d['sha256'], 'version': d['version']} for d in documents]}
    if not requirements: result['limitations'].append('Requirement coverage unavailable.')
    for d in documents:
        result['limitations'].extend(d['extraction'].get('warnings', []))
    if not any(d['role'] == 'methodology' for d in documents):
        result['limitations'].append('Client methodology absent; illustrative scoring only.')
    inference = Ollama()
    try:
        result['model_digests'] = inference.manifest()
        doc_ids = [d['id'] for d in documents]
        progress(job, 'Indexing local evidence')
        with connect() as c:
            chunks = c.execute('SELECT * FROM chunks WHERE document_id=ANY(%s::uuid[])', (doc_ids,)).fetchall()
        for chunk in chunks:
            progress(job, 'Indexing local evidence')
            vector = inference.embed(chunk['content'])
            with connect() as c:
                c.execute('UPDATE chunks SET embedding=%s::vector, embedding_model=%s WHERE id=%s', (str(vector), EMBED_MODEL, chunk['id']))
        for index, row in enumerate(rows):
            progress(job, f'Semantic review {index+1}/{len(rows)}')
            query = json.dumps(row)
            vector = inference.embed(query)
            with connect() as c:
                evidence = retrieve(c, job['project_id'], doc_ids, query, vector)
                # Always include the source row, even when retrieval ranks it below the cut-off.
                direct = c.execute('SELECT * FROM chunks WHERE project_id=%s AND id=ANY(%s::uuid[])',
                                   (job['project_id'], list(dict.fromkeys(row['evidence_ids'] + requirements.get(row.get('requirement_id'), []))))).fetchall()
                for item in direct:
                    if str(item['id']) not in {e['id'] for e in evidence}:
                        evidence.append({'id': str(item['id']), 'text': item['content'][:6000], 'location': item['location']})
            payload = {'task': 'Review failure mode, impact, rating rationale, requirement alignment and mitigation adequacy. Return {assessment: string, sufficient_evidence: boolean, findings: [{rationale, action, priority: Low|Medium|High, evidence_ids: string[]}]}. Empty findings only when justified.',
                       'row': row, 'profile': snap['profile'], 'evidence': evidence}
            output = inference.generate(payload)
            checked = validate_findings(output, {e['id'] for e in evidence})
            for f in checked:
                findings.append({**f, 'code': 'semantic_concern', 'category': 'Semantic review', 'kind': 'needs_judgment',
                                 'risk_id': row.get('risk_id'), 'rule': PROMPT_VERSION})
            result['semantic_reviews'].append({'risk_id': row.get('risk_id'), 'assessment': output['assessment'],
                'sufficient_evidence': output['sufficient_evidence'], 'retrieved_evidence': evidence})
            if not output['sufficient_evidence']: result['limitations'].append(f"Insufficient evidence for {row.get('risk_id')}.")
    except Exception as exc:
        result['limitations'].append(f'Local semantic review incomplete: {type(exc).__name__}: {str(exc)[:300]}')
    finally:
        inference.close()
    for index, finding in enumerate(findings): finding['id'] = f'f-{index+1}'
    status = 'incomplete' if result['limitations'] else 'completed'
    with connect() as c:
        locked = c.execute('SELECT * FROM jobs WHERE id=%s FOR UPDATE', (job['id'],)).fetchone()
        if locked['attempts'] != job['attempts'] or locked['status'] != 'running': return
        c.execute('DELETE FROM relationships WHERE job_id=%s', (job['id'],))
        for row in rows:
            risk = str(row.get('risk_id', ''))
            for relation, target in [('assesses', row.get('requirement_id')), ('mitigated_by', row.get('mitigation'))]:
                if target:
                    c.execute('INSERT INTO relationships VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING',
                              (job['id'], risk, relation, str(target), Jsonb(row['evidence_ids'])))
        c.execute("UPDATE jobs SET status=%s, stage='Review ready',result=%s,lease_until=NULL,updated_at=now() WHERE id=%s",
                  (status, Jsonb(result), job['id']))
        event(c, job['project_id'], 'review_finished', {'job_id': str(job['id']), 'status': status})

def main():
    initialize()
    while True:
        job = claim()
        if not job: time.sleep(2); continue
        try: execute(job)
        except Exception as exc:
            with connect() as c:
                c.execute("UPDATE jobs SET status=CASE WHEN attempts<3 THEN 'queued' ELSE 'failed' END, error=%s, updated_at=now() WHERE id=%s AND attempts=%s", (str(exc)[:500], job['id'], job['attempts']))

if __name__ == '__main__': main()
