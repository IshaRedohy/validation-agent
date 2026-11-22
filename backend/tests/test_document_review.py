import unittest
from backend.document_review import batches, run_review


def document(texts):
    return {'id': 'doc', 'name': 'Assessment.pdf', 'role': 'assessment',
            'extraction': {'chunks': [{'id': f'e-{i}', 'location': f'Page {i+1}', 'text': t}
                                      for i, t in enumerate(texts)], 'rows': [], 'warnings': []}}


class Reviewer:
    def __init__(self, fail_at=None):
        self.calls = []
        self.fail_at = fail_at
    def generate(self, payload):
        self.calls.append(payload)
        if len(self.calls) == self.fail_at:
            raise ValueError('Reviewer unavailable')
        primary = payload.get('primary_evidence', [])
        # A concern late in the document must survive batching and synthesis.
        findings = [{'rationale': 'Mitigation says only improve logging; no verification is defined.',
                     'action': 'Define a negative test and expected audit record.', 'priority': 'High',
                     'evidence_ids': [p['id']]} for p in primary if 'improve logging' in p['text']]
        return {'assessment': 'Reviewed the available text.', 'sufficient_evidence': True, 'findings': findings}


class DocumentReviewTests(unittest.TestCase):
    def test_prose_only_without_rows_or_supporting_docs(self):
        result = run_review([document(['Risk: undetected record changes. Mitigation: improve logging.'])],
                            Reviewer(), lambda s: None, lambda r: None)
        self.assertEqual(result['sections_reviewed'], 1)
        self.assertEqual(result['sections_total'], 1)
        self.assertEqual(len(result['findings']), 1)
        self.assertIsNone(result['profile'])
        self.assertEqual(result['limitations'], [])
        self.assertTrue(result['notes'])

    def test_reads_all_223_sections_and_end_of_long_page(self):
        texts = [f'Paragraph {i}: ' + 'Detailed assessment. ' * 20 for i in range(223)]
        texts[-1] += 'x' * 16000 + ' improve logging'
        reviewer = Reviewer()
        result = run_review([document(texts)], reviewer, lambda s: None, lambda r: None)
        primary = [p for call in reviewer.calls for p in call.get('primary_evidence', [])]
        for i, text in enumerate(texts):
            self.assertEqual(''.join(p['text'] for p in primary if p['id'] == f'e-{i}'), text)
        self.assertEqual(result['sections_reviewed'], 223)
        self.assertEqual(result['findings'][0]['evidence_ids'], ['e-222'])
        self.assertTrue(any('section_summaries' in call for call in reviewer.calls))
        self.assertEqual(result['limitations'], [])

    def test_partial_failure_preserves_feedback_and_reports_coverage(self):
        reviewer = Reviewer(fail_at=2)
        result = run_review([document(['improve logging ' + 'a' * 10000, 'b' * 9000])],
                            reviewer, lambda s: None, lambda r: None)
        self.assertEqual(result['batches_reviewed'], 1)
        self.assertLess(result['sections_reviewed'], result['sections_total'])
        self.assertTrue(result['findings'])
        self.assertTrue(any('incomplete' in item for item in result['limitations']))

    def test_bad_citation_fails_review(self):
        reviewer = Reviewer()
        reviewer.generate = lambda payload: {'assessment': 'Reviewed', 'sufficient_evidence': True,
            'findings': [{'rationale': 'x', 'action': 'y', 'priority': 'High', 'evidence_ids': ['another-project']}]}
        result = run_review([document(['Risk narrative'])], reviewer, lambda s: None, lambda r: None)
        self.assertEqual(result['sections_reviewed'], 0)
        self.assertEqual(result['findings'], [])
        self.assertTrue(result['limitations'])

    def test_empty_document_and_legacy_mapping_warning(self):
        doc = document([])
        doc['extraction']['warnings'] = ['PDF risk rows require manual mapping and confirmation; page text is preserved.']
        result = run_review([doc], Reviewer(), lambda s: None, lambda r: None)
        self.assertEqual(result['limitations'], ['No readable assessment text is available.'])

    def test_timeout_explains_generation_failure_without_fabricating_findings(self):
        import httpx
        reviewer=Reviewer()
        def timeout(payload): raise httpx.ReadTimeout('timed out')
        reviewer.generate=timeout
        result=run_review([document(['Risk narrative'])],reviewer,lambda s:None,lambda r:None)
        self.assertEqual(result['sections_reviewed'],0)
        self.assertEqual(result['findings'],[])
        self.assertIn('embedding success does not mean',result['limitations'][0])
