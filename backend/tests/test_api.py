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
    def test_cannot_start_without_confirmation(self):
        c=MagicMock();c.execute.return_value.fetchall.return_value=[{'role':'assessment','confirmed':False}]
        with patch('backend.api.connect') as conn, patch('backend.api.one'):
            conn.return_value.__enter__.return_value=c
            r=self.client.post('/api/v1/projects/00000000-0000-0000-0000-000000000001/reviews')
            self.assertEqual(r.status_code,422)
    def test_bad_disposition(self):
        r=self.client.post('/api/v1/reviews/00000000-0000-0000-0000-000000000001/findings/f-1/decisions',json={'reason':'ok','disposition':'approved-system'})
        self.assertEqual(r.status_code,422)
