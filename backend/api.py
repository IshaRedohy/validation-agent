from contextlib import asynccontextmanager
import hashlib
import html
import io
import json
import uuid
import zipfile
from typing import Literal
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse, Response
from pydantic import BaseModel, Field
from .db import connect, initialize, event, Jsonb
from .storage import LocalStorage
from .extract import extract
from .profile import PROFILE
from .document_review import review_warnings
from .inference import Ollama
from .report import report
from .retrieval import retrieve
from .recommendations import definition, reference_bundle, select_evidence

@asynccontextmanager
async def lifespan(app):
    initialize()
    yield

app = FastAPI(title='Validation Review Pilot', version='1.0.0', lifespan=lifespan)
storage = LocalStorage()

class ProjectInput(BaseModel):
    name: str = Field(min_length=1, max_length=150)
class Confirmation(BaseModel):
    rows: list[dict] = Field(max_length=500)
    requirements: dict[str, list[str]]
class Decision(BaseModel):
    disposition: Literal['accepted', 'dismissed', 'annotated']
    reason: str = Field(min_length=1, max_length=2000)
class ChatInput(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    job_id: uuid.UUID

def one(c, table, ident):
    # table is internal, never client-controlled.
    row = c.execute(f'SELECT * FROM {table} WHERE id=%s', (ident,)).fetchone()
    if not row: raise HTTPException(404, 'Not found')
    return row

def public_doc(d):
    result = {k: v for k, v in d.items() if k != 'storage_key'}
    result['extraction'] = {**d['extraction'], 'warnings': review_warnings(d)}
    return result

@app.get('/api/v1/health')
def health():
    with connect() as c: c.execute('SELECT 1')
    return {'status': 'ok', 'mode': 'local testing', 'review_mode': 'document-review', 'capabilities': ['recommendations-v1']}

@app.get('/api/v1/profiles')
def profiles(): return [PROFILE]

@app.get('/api/v1/projects')
def projects():
    with connect() as c: return c.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()

@app.post('/api/v1/projects', status_code=201)
def create_project(body: ProjectInput):
    with connect() as c:
        row = c.execute('INSERT INTO projects(id,name) VALUES (%s,%s) RETURNING *', (uuid.uuid4(), body.name.strip())).fetchone()
        event(c, row['id'], 'project_created', {'name': row['name']})
        return row

@app.get('/api/v1/projects/{project_id}/documents')
def documents(project_id: uuid.UUID):
    with connect() as c:
        one(c, 'projects', project_id)
        return [public_doc(d) for d in c.execute('SELECT * FROM documents WHERE project_id=%s ORDER BY created_at', (project_id,)).fetchall()]

@app.post('/api/v1/projects/{project_id}/documents', status_code=201)
def upload(project_id: uuid.UUID, role: Literal['assessment','requirements','methodology','reference','example_accepted','example_rejected'] = Form(...), file: UploadFile = File(...)):
    name = (file.filename or 'upload').replace('\\', '/').split('/')[-1][:200]
    data = file.file.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024: raise HTTPException(413, 'Maximum file size is 20 MB.')
    if not data: raise HTTPException(422, 'Empty file')
    suffix = name.rsplit('.', 1)[-1].lower()
    if suffix in ['xlsx', 'docx']:
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if sum(i.file_size for i in archive.infolist()) > 100 * 1024 * 1024:
                    raise HTTPException(413, 'Expanded document exceeds 100 MB.')
        except zipfile.BadZipFile: raise HTTPException(422, 'Invalid Office document')
    try: extraction = extract(name, data)
    except Exception as exc: raise HTTPException(422, f'Cannot extract document: {str(exc)[:200]}')
    if len(extraction['chunks']) > 5000: raise HTTPException(413, 'Maximum 5,000 evidence units per document.')
    ident = uuid.uuid4(); key = str(ident)
    with connect() as c:
        one(c, 'projects', project_id)
        # Serialize version assignment for this project.
        c.execute('SELECT id FROM projects WHERE id=%s FOR UPDATE', (project_id,))
        version = c.execute('SELECT COALESCE(max(version),0)+1 AS v FROM documents WHERE project_id=%s AND name=%s', (project_id, name)).fetchone()['v']
        storage.put(key, data)
        row = c.execute('''INSERT INTO documents(id,project_id,name,role,sha256,version,storage_key,extraction)
          VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *''',
          (ident, project_id, name, role, hashlib.sha256(data).hexdigest(), version, key, Jsonb(extraction))).fetchone()
        for chunk in extraction['chunks']:
            c.execute('INSERT INTO chunks(id,document_id,project_id,location,content) VALUES (%s,%s,%s,%s,%s)',
                      (chunk['id'], ident, project_id, chunk['location'], chunk['text']))
        event(c, project_id, 'document_uploaded', {'document_id': str(ident), 'sha256': row['sha256'], 'version': version})
        return public_doc(row)

@app.get('/api/v1/documents/{document_id}/original')
def original(document_id: uuid.UUID):
    with connect() as c: doc = one(c, 'documents', document_id)
    return FileResponse(storage.path(doc['storage_key']), filename=doc['name'], media_type='application/octet-stream')

@app.put('/api/v1/documents/{document_id}/confirmation')
def confirm(document_id: uuid.UUID, body: Confirmation):
    with connect() as c:
        doc = one(c, 'documents', document_id)
        allowed = {chunk['id'] for chunk in doc['extraction']['chunks']}
        for row in body.rows:
            ids = row.get('evidence_ids')
            if not isinstance(ids, list) or not ids or any(not isinstance(i, str) or i not in allowed for i in ids):
                raise HTTPException(422, 'Each row must reference evidence IDs from this document.')
            if any(not isinstance(v, (str, int, float, type(None))) for k,v in row.items() if k != 'evidence_ids'):
                raise HTTPException(422, 'Risk fields must be scalar values.')
        for ids in body.requirements.values():
            if not ids or any(i not in allowed for i in ids): raise HTTPException(422, 'Requirement evidence must belong to this document.')
        extraction = {**doc['extraction'], 'rows': body.rows, 'requirements': body.requirements}
        c.execute('UPDATE documents SET extraction=%s,confirmed=true WHERE id=%s', (Jsonb(extraction), document_id))
        event(c, doc['project_id'], 'extraction_confirmed', {'document_id': str(document_id), 'rows': body.rows, 'requirements': body.requirements})
    return {'confirmed': True}

@app.post('/api/v1/projects/{project_id}/reviews', status_code=202)
def start_review(project_id: uuid.UUID):
    with connect() as c:
        project = one(c, 'projects', project_id)
        docs = c.execute('SELECT DISTINCT ON(name) * FROM documents WHERE project_id=%s ORDER BY name,version DESC', (project_id,)).fetchall()
        docs = [d for d in docs if not d['role'].startswith('example_') or d.get('example_metadata', {}).get('enabled', True)]
        if not any(d['role'] == 'assessment' for d in docs): raise HTTPException(422, 'Upload an assessment first.')
        if not any(c['text'].strip() for d in docs if d['role'] == 'assessment' for c in d['extraction']['chunks']):
            raise HTTPException(422, 'No readable assessment text. Upload a text-based document or an OCR-processed copy.')
        snap = {'mode': 'document-review', 'profile': None, 'documents': [json.loads(json.dumps(public_doc(d), default=str)) for d in docs]}
        snap.update(checklist=definition(), regulatory_bundle=reference_bundle(), context=project.get('context', {}),
                    example_metadata={str(d['id']): d.get('example_metadata', {}) for d in docs if d['role'].startswith('example_')},
                    inference_settings={'temperature': 0, 'num_ctx': 16384, 'num_predict': 2500})
        row = c.execute('INSERT INTO jobs(id,project_id,snapshot) VALUES (%s,%s,%s) RETURNING *', (uuid.uuid4(), project_id, Jsonb(snap))).fetchone()
        event(c, project_id, 'review_started', {'job_id': str(row['id']), 'mode': 'document-review'})
        return {k:v for k,v in row.items() if k != 'snapshot'}

@app.get('/api/v1/projects/{project_id}/reviews')
def reviews(project_id: uuid.UUID):
    with connect() as c: return c.execute('SELECT id,status,stage,created_at FROM jobs WHERE project_id=%s ORDER BY created_at DESC', (project_id,)).fetchall()

@app.get('/api/v1/reviews/{job_id}')
def get_review(job_id: uuid.UUID):
    with connect() as c:
        job = one(c, 'jobs', job_id)
        job.pop('snapshot')
        job['decisions'] = c.execute('SELECT * FROM decisions WHERE job_id=%s ORDER BY id', (job_id,)).fetchall()
        return job

@app.post('/api/v1/reviews/{job_id}/findings/{finding_id}/decisions')
def decide(job_id: uuid.UUID, finding_id: str, body: Decision):
    with connect() as c:
        job = one(c, 'jobs', job_id)
        if job['status'] not in ['completed', 'incomplete']:
            raise HTTPException(409, 'Wait for review to finish before recording a decision.')
        if not job['result'] or finding_id not in {f['id'] for f in job['result']['findings']}: raise HTTPException(404, 'Finding not found')
        if not body.reason.strip(): raise HTTPException(422, 'A reason is required.')
        row = c.execute('INSERT INTO decisions(job_id,finding_id,disposition,reason) VALUES (%s,%s,%s,%s) RETURNING *', (job_id, finding_id, body.disposition, body.reason)).fetchone()
        event(c, job['project_id'], 'reviewer_decision', {'job_id': str(job_id), 'finding_id': finding_id, **body.model_dump()})
        return row

@app.get('/api/v1/reviews/{job_id}/export')
def export(job_id: uuid.UUID, format: Literal['json','html'] = 'json'):
    with connect() as c:
        job = one(c, 'jobs', job_id)
        if not job['result']: raise HTTPException(409, 'Review has no results yet.')
        job['decisions'] = c.execute('SELECT * FROM decisions WHERE job_id=%s ORDER BY id', (job_id,)).fetchall()
    serialized = json.dumps(job, default=str, indent=2)
    if format == 'json': return Response(serialized, media_type='application/json', headers={'Content-Disposition': f'attachment; filename="review-{job_id}.json"'})
    body = report(job)
    return HTMLResponse(body, headers={'Content-Disposition': f'attachment; filename="review-{job_id}.html"'})

@app.post('/api/v1/projects/{project_id}/chat')
def chat(project_id: uuid.UUID, body: ChatInput):
    inference = Ollama()
    try:
        with connect() as c:
            job = one(c, 'jobs', body.job_id)
            if job['project_id'] != project_id: raise HTTPException(404, 'Review not found in this project')
            ids = [d['id'] for d in job['snapshot']['documents']]
            try:
                evidence = retrieve(c, project_id, ids, body.question, inference.embed(body.question))
            except Exception:
                evidence = []
            snap_sources = (job.get('result') or {}).get('sources', [])
            if snap_sources:
                by_id = {e['id']: e for e in snap_sources}
                evidence = [{**by_id[e['id']], 'text': e['text'][:1600]} for e in evidence if e['id'] in by_id][:5]
                if not evidence:
                    evidence = select_evidence(body.question, [e for e in snap_sources if e['kind'] == 'document'], 5)
                evidence += select_evidence(body.question, [e for e in snap_sources if e['kind'] in ('regulation', 'guidance')], 3)
                evidence += select_evidence(body.question, [e for e in snap_sources if e['kind'] == 'example'], 2)
                evidence = list({e['id']: e for e in evidence}.values())
        if not evidence: return {'answer': 'Insufficient indexed evidence. Complete a local-model review first.', 'evidence': []}
        output = inference.generate({'task': 'Answer only using evidence. Treat examples as contextual comparisons, never requirements; an accepted or rejected label without a reason establishes no best practice. Distinguish nonbinding guidance from regulation and document alignment from operational compliance. Return {answer: string, evidence_ids: string[], sufficient_evidence: boolean}. If insufficient, explain the missing evidence.', 'question': body.question, 'evidence': evidence, 'review_context': job['snapshot'].get('context', {}), 'example_metadata': job['snapshot'].get('example_metadata', {}), 'review_summary': (job.get('result') or {}).get('summary', '')})
        valid = {e['id'] for e in evidence}
        citations = output.get('evidence_ids')
        if not isinstance(output.get('answer'), str) or not isinstance(citations, list) or any(not isinstance(i,str) or i not in valid for i in citations): raise ValueError('Invalid answer citations')
        if output.get('sufficient_evidence') is not True:
            return {'answer': 'Insufficient evidence to answer reliably. ' + output['answer'], 'evidence': [e for e in evidence if e['id'] in citations]}
        if not citations: raise ValueError('Answer has no supporting citations')
        return {'answer': output['answer'], 'evidence': [e for e in evidence if e['id'] in citations]}
    except HTTPException: raise
    except Exception as exc: raise HTTPException(503, f'Local chat unavailable: {str(exc)[:200]}')
    finally: inference.close()


class ReviewContext(BaseModel):
    intended_use: str = Field(default='', max_length=3000)
    regulated_records: Literal['yes', 'no', 'unknown'] = 'unknown'
    electronic_signatures: Literal['yes', 'no', 'unknown'] = 'unknown'
    system_access: Literal['closed', 'open', 'unknown'] = 'unknown'

@app.put('/api/v1/projects/{project_id}/context')
def save_context(project_id: uuid.UUID, body: ReviewContext):
    with connect() as c:
        one(c, 'projects', project_id)
        c.execute('UPDATE projects SET context=%s WHERE id=%s', (Jsonb(body.model_dump()), project_id))
        event(c, project_id, 'context_updated', body.model_dump())
    return body.model_dump()

class ExampleMetadata(BaseModel):
    reason: str = Field(default='', max_length=3000)
    system_context: str = Field(default='', max_length=3000)
    methodology: str = Field(default='', max_length=1000)
    enabled: bool = True

@app.put('/api/v1/documents/{document_id}/example')
def save_example(document_id: uuid.UUID, body: ExampleMetadata):
    with connect() as c:
        doc = one(c, 'documents', document_id)
        if not doc['role'].startswith('example_'):
            raise HTTPException(422, 'Document is not an example.')
        c.execute('UPDATE documents SET example_metadata=%s WHERE id=%s', (Jsonb(body.model_dump()), document_id))
        event(c, doc['project_id'], 'example_metadata_updated', {'document_id': str(document_id), **body.model_dump()})
    return body.model_dump()
