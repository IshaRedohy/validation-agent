"""Run RUN_DB_TESTS=1 against a disposable Postgres database with pgvector.
Uses a fake inference adapter to test orchestration, not model quality.
"""
import os
from pathlib import Path
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from backend.api import app
from backend.db import connect
from backend.worker import claim, execute

pytestmark = pytest.mark.skipif(os.getenv('RUN_DB_TESTS') != '1', reason='Requires disposable PostgreSQL with pgvector')

class FakeInference:
    def manifest(self): return {'test-model':'digest'}
    def close(self): pass
    def embed(self,text): return [1.0]+[0.0]*767
    def generate(self,payload):
        return {'assessment':'Synthetic test review', 'sufficient_evidence':True,'findings':[]}

def test_review_snapshot_recovery_and_export():
    with TestClient(app) as client:
        p=client.post('/api/v1/projects',json={'name':'Integration test'}).json()
        docs=[]
        for role in ['assessment','requirements','methodology']:
            path=Path('samples')/(role+'.txt')
            response=client.post(f'/api/v1/projects/{p["id"]}/documents',data={'role':role},files={'file':(path.name,path.read_bytes())})
            assert response.status_code==201,response.text
            doc=response.json();docs.append(doc)
            response=client.put(f'/api/v1/documents/{doc["id"]}/confirmation',json={k:doc['extraction'][k] for k in ['rows','requirements']})
            assert response.status_code==200,response.text
        response=client.post(f'/api/v1/projects/{p["id"]}/reviews');assert response.status_code==202,response.text
        ident=response.json()['id'];job=claim();assert str(job['id'])==ident
        # Simulate a dead worker and verify reclaim increments the fencing token.
        with connect() as c: c.execute("UPDATE jobs SET lease_until=now()-interval '1 second' WHERE id=%s",(ident,))
        recovered=claim();assert recovered['attempts']==2
        with patch('backend.worker.Ollama',FakeInference):execute(recovered)
        result=client.get(f'/api/v1/reviews/{ident}').json()
        assert result['status']=='completed',result
        assert len(result['result']['findings'])==4
        first=result['result']['findings'][0]
        assert client.post(f'/api/v1/reviews/{ident}/findings/{first["id"]}/decisions',json={'disposition':'accepted','reason':'Verified against source'}).status_code==200
        report=client.get(f'/api/v1/reviews/{ident}/export').json()
        assert len(report['decisions'])==1
        assert report['snapshot']['documents'][0]['sha256']
        old=report['snapshot']
        # Correction after the review cannot mutate the snapshot.
        doc=docs[0];doc['extraction']['rows'][0]['risk_score']='60'
        client.put(f'/api/v1/documents/{doc["id"]}/confirmation',json={k:doc['extraction'][k] for k in ['rows','requirements']})
        assert client.get(f'/api/v1/reviews/{ident}/export').json()['snapshot']==old
        assert 'Draft risk assessment review' in client.get(f'/api/v1/reviews/{ident}/export?format=html').text
        other=client.post('/api/v1/projects',json={'name':'Other project'}).json()
        assert client.post(f'/api/v1/projects/{other["id"]}/chat',json={'question':'Show evidence','job_id':ident}).status_code==404
