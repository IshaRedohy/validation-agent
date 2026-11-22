import time
from .db import connect, initialize, event, Jsonb
from .inference import Ollama, MODEL, EMBED_MODEL, PROMPT_VERSION, GENERATION_TIMEOUT
from .document_review import run_review, evidence_units
from .recommendations import enrich_review, scorecards


LEASE_SECONDS = max(600, int(GENERATION_TIMEOUT) + 120)

def claim():
    with connect() as c:
        c.execute("UPDATE jobs SET status='failed', stage='Failed', error='Worker interrupted repeatedly; start a new review' WHERE status='running' AND lease_until < now() AND attempts>=3")
        return c.execute('''UPDATE jobs SET status='running', attempts=attempts+1,
          lease_until=now()+make_interval(secs => %s), updated_at=now(), stage='Reading document'
          WHERE id=(SELECT id FROM jobs WHERE status='queued' OR
          (status='running' AND lease_until<now() AND attempts<3) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
          RETURNING *''', (LEASE_SECONDS,)).fetchone()

def progress(job, stage):
    with connect() as c:
        changed = c.execute("UPDATE jobs SET stage=%s, lease_until=now()+make_interval(secs => %s),updated_at=now() WHERE id=%s AND attempts=%s AND status='running'", (stage, LEASE_SECONDS, job['id'], job['attempts'])).rowcount
        if not changed: raise RuntimeError('Job lease lost')

def execute(job):
    documents = job['snapshot']['documents']
    metadata = {'model': MODEL, 'embedding_model': EMBED_MODEL, 'prompt_version': PROMPT_VERSION, 'generation_timeout_seconds': GENERATION_TIMEOUT,
                'documents': [{'id': d['id'], 'sha256': d['sha256'], 'version': d['version']} for d in documents]}
    inference = Ollama()

    def checkpoint(result):
        with connect() as c:
            changed = c.execute("UPDATE jobs SET result=%s, updated_at=now() WHERE id=%s AND attempts=%s AND status='running'",
                                (Jsonb({**result, **metadata}), job['id'], job['attempts'])).rowcount
            if not changed:
                raise RuntimeError('Job lease lost')

    try:
        progress(job, 'Connecting to local reviewer')
        metadata['model_digests'] = inference.manifest(include_embeddings=False)
        result = run_review(documents, inference, lambda stage: progress(job, stage), checkpoint)
        if 'checklist' in job['snapshot']:
            result = enrich_review(result, job['snapshot'], inference, lambda stage: progress(job, stage), checkpoint)
        # Search indexing supplements the review; an embedder outage must not prevent reading.
        try:
            progress(job, 'Preparing document chat')
            metadata['model_digests'].update(inference.manifest())
            with connect() as c:
                chunks = c.execute('SELECT * FROM chunks WHERE document_id=ANY(%s::uuid[])',
                                   ([d['id'] for d in documents],)).fetchall()
            for chunk in chunks:
                progress(job, 'Preparing document chat')
                if chunk['embedding'] is not None and chunk['embedding_model'] == EMBED_MODEL:
                    continue
                vector = inference.embed(chunk['content'])
                with connect() as c:
                    c.execute('UPDATE chunks SET embedding=%s::vector, embedding_model=%s WHERE id=%s',
                              (str(vector), EMBED_MODEL, chunk['id']))
        except Exception as exc:
            result['notes'].append(f'Document chat indexing unavailable: {type(exc).__name__}: {str(exc)[:200]}')
    except Exception as exc:
        # Covers connection/manifest failures before the first passage is read.
        result = {'mode': 'document-review', 'profile': None, 'rows_reviewed': 0,
                  'sections_total': len(evidence_units(documents, 'assessment')), 'sections_reviewed': 0,
                  'findings': [], 'semantic_reviews': [], 'notes': [],
                  'limitations': [f'Local document reviewer unavailable: {type(exc).__name__}: {str(exc)[:300]}']}
    finally:
        inference.close()
    if 'checklist' in job['snapshot'] and 'criteria' not in result:
        result['criteria'] = [{**c, 'status': 'unevaluated', 'rationale': 'Local reviewer unavailable.', 'action': '', 'evidence_ids': []} for c in job['snapshot']['checklist']['criteria']]
        result['scorecards'] = scorecards(result['criteria'], provisional=True)
        result['checklist_version'] = job['snapshot']['checklist']['version']
        result['regulatory_version'] = job['snapshot']['regulatory_bundle']['version']
    result.update(metadata)
    status = 'incomplete' if result['limitations'] else 'completed'
    with connect() as c:
        locked = c.execute('SELECT * FROM jobs WHERE id=%s FOR UPDATE', (job['id'],)).fetchone()
        if locked['attempts'] != job['attempts'] or locked['status'] != 'running':
            return
        stage = 'Review incomplete — see limitations' if status == 'incomplete' else 'Review ready'
        c.execute("UPDATE jobs SET status=%s, stage=%s,result=%s,error=NULL,lease_until=NULL,updated_at=now() WHERE id=%s",
                  (status, stage, Jsonb(result), job['id']))
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
