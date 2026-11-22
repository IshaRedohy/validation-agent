import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.api import app

class ApiTests(unittest.TestCase):
    def setUp(self): self.client=TestClient(app)
    def test_invalid_project_id(self):
        self.assertEqual(self.client.get('/api/v1/projects/not-a-uuid/documents').status_code,422)
    def test_empty_project_rejected(self):
        self.assertEqual(self.client.post('/api/v1/projects',json={'name':''}).status_code,422)
    def test_bad_document_rejected_without_db(self):
        r=self.client.post('/api/v1/projects/00000000-0000-0000-0000-000000000001/documents',
                           data={'role':'assessment'},files={'file':('bad.doc',b'invalid')})
        self.assertEqual(r.status_code,422)
    def test_cannot_confirm_cross_document_evidence(self):
        doc={'role':'assessment','extraction':{'chunks':[{'id':'own'}]}}
        with patch('backend.api.connect') as connect, patch('backend.api.one',return_value=doc):
            r=self.client.put('/api/v1/documents/00000000-0000-0000-0000-000000000001/confirmation',
                              json={'rows':[{'risk_id':'RA-1','evidence_ids':['foreign']}],'requirements':{}})
            self.assertEqual(r.status_code,422)
    def test_cannot_start_without_readable_assessment(self):
        c=MagicMock();c.execute.return_value.fetchall.return_value=[{'role':'assessment','confirmed':False,'extraction':{'chunks':[]}}]
        with patch('backend.api.connect') as conn, patch('backend.api.one'):
            conn.return_value.__enter__.return_value=c
            r=self.client.post('/api/v1/projects/00000000-0000-0000-0000-000000000001/reviews')
            self.assertEqual(r.status_code,422)
    def test_bad_disposition(self):
        r=self.client.post('/api/v1/reviews/00000000-0000-0000-0000-000000000001/findings/f-1/decisions',json={'reason':'ok','disposition':'approved-system'})
        self.assertEqual(r.status_code,422)

    def test_starts_prose_review_without_confirmation_or_rows(self):
        doc={'id':'doc','name':'Assessment.txt','role':'assessment','confirmed':False,
             'extraction':{'chunks':[{'id':'e','text':'A narrative risk assessment'}],'rows':[],'warnings':[]}}
        c=MagicMock()
        c.execute.return_value.fetchall.return_value=[doc]
        c.execute.return_value.fetchone.return_value={'id':'job','status':'queued'}
        with patch('backend.api.connect') as conn, patch('backend.api.one'):
            conn.return_value.__enter__.return_value=c
            r=self.client.post('/api/v1/projects/00000000-0000-0000-0000-000000000001/reviews')
            self.assertEqual(r.status_code,202,r.text)
        insertion=next(call for call in c.execute.call_args_list if 'INSERT INTO jobs' in call.args[0])
        snapshot=insertion.args[1][2].obj
        self.assertIsNone(snapshot['profile'])
        self.assertEqual(snapshot['mode'],'document-review')

    def test_can_confirm_prose_without_rows(self):
        doc={'role':'assessment','project_id':'project','extraction':{'chunks':[{'id':'own'}]}}
        with patch('backend.api.connect'), patch('backend.api.one',return_value=doc):
            r=self.client.put('/api/v1/documents/00000000-0000-0000-0000-000000000001/confirmation',
                              json={'rows':[],'requirements':{}})
            self.assertEqual(r.status_code,200,r.text)

    def test_context_rejects_unsupported_applicability(self):
        r=self.client.put('/api/v1/projects/00000000-0000-0000-0000-000000000001/context',json={'regulated_records':'probably'})
        self.assertEqual(r.status_code,422)

    def test_disabled_examples_excluded_and_context_frozen(self):
        doc={'id':'doc','name':'Assessment.txt','role':'assessment','extraction':{'chunks':[{'id':'e','text':'Risk assessment'}],'warnings':[]}}
        disabled={**doc,'id':'disabled','name':'Rejected.txt','role':'example_rejected','example_metadata':{'enabled':False}}
        enabled={**doc,'id':'enabled','name':'Accepted.txt','role':'example_accepted','example_metadata':{'reason':'Traceable mitigations','enabled':True}}
        c=MagicMock();c.execute.return_value.fetchall.return_value=[doc,disabled,enabled]
        c.execute.return_value.fetchone.return_value={'id':'job','status':'queued'}
        context={'regulated_records':'yes','intended_use':'Laboratory records'}
        with patch('backend.api.connect') as conn, patch('backend.api.one',return_value={'context':context}):
            conn.return_value.__enter__.return_value=c
            response=self.client.post('/api/v1/projects/00000000-0000-0000-0000-000000000001/reviews')
        self.assertEqual(response.status_code,202)
        insertion=next(call for call in c.execute.call_args_list if 'INSERT INTO jobs' in call.args[0])
        snapshot=insertion.args[1][2].obj
        self.assertEqual([d['id'] for d in snapshot['documents']],['doc','enabled'])
        self.assertEqual(snapshot['context'],context)
        self.assertEqual(snapshot['example_metadata']['enabled']['reason'],'Traceable mitigations')
        self.assertEqual(len(snapshot['checklist']['criteria']),30)
        self.assertTrue(snapshot['regulatory_bundle']['sha256'])
