import copy
import unittest
from backend.recommendations import definition, reference_bundle, scorecards, enrich_review
from backend.tests.test_document_review import document


class Model:
    def __init__(self, status='satisfactory', bad=False):
        self.status, self.bad, self.calls = status, bad, []
    def generate(self, payload):
        self.calls.append(payload)
        return {'status': self.status, 'rationale': 'Explicit document evidence reviewed.',
                'action': 'Verify referenced validation evidence.', 'priority': 'Medium',
                'evidence_ids': ['foreign'] if self.bad else [e['id'] for e in payload['evidence']]}


class RecommendationTests(unittest.TestCase):
    def snapshot(self):
        return {'documents': [document(['System validation is documented. Electronic records are regulated.'])],
                'context': {'regulated_records': 'yes'}, 'checklist': definition(), 'regulatory_bundle': reference_bundle()}
    def result(self):
        return {'sections_total': 1, 'sections_reviewed': 1, 'findings': [], 'limitations': [], 'notes': [], 'summary': 'Validation evidence.'}
    def run_review(self, model=None, snapshot=None, result=None):
        return enrich_review(result or self.result(), snapshot or self.snapshot(), model or Model(), lambda x:None, lambda x:None)
    def test_official_sources_are_unique_and_separate(self):
        bundle = reference_bundle()
        ids = [e['id'] for e in bundle['evidence']]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(any(e['kind'] == 'guidance' for e in bundle['evidence']))
        for clause in ['11.1','11.10','11.30','11.50','11.70','11.100','11.200','11.300']:
            self.assertIn('reg-'+clause, ids)
        self.assertEqual(len(bundle['sha256']), 64)
    def test_scores_exclude_not_applicable_and_failures(self):
        rows = [{'category':'quality','status':s} for s in ['satisfactory','satisfactory','needs_review','identified_gap','not_applicable','unevaluated']]
        card = scorecards(rows)['quality']
        self.assertEqual(card['denominator'],4)
        self.assertEqual(card['percentages'], {'satisfactory':50,'needs_review':25,'identified_gap':25})
        self.assertTrue(card['provisional'])
        self.assertIsNone(scorecards([])['part11']['percentages']['satisfactory'])
    def test_one_outcome_per_criterion_no_examples_claimed(self):
        model = Model(); result = self.run_review(model)
        self.assertEqual(len(result['criteria']),30)
        self.assertEqual(len({c['id'] for c in result['criteria']}),30)
        self.assertEqual(result['scorecards']['quality']['percentages']['satisfactory'],100)
        self.assertFalse(result['scorecards']['quality']['provisional'])
        self.assertEqual(result['findings'], [])
        self.assertTrue(any('no comparison' in n for n in result['notes']))
        self.assertTrue(all(p['example_metadata'] == {} for p in model.calls))
    def test_unknown_applicability_is_not_positive_assurance(self):
        snapshot=self.snapshot(); snapshot['context']={}
        result=self.run_review(snapshot=snapshot)
        self.assertEqual(result['scorecards']['part11']['percentages']['needs_review'],100)
    def test_bad_citations_withhold_outcomes(self):
        result=self.run_review(Model(bad=True))
        self.assertEqual(result['scorecards']['quality']['counts']['unevaluated'],12)
        self.assertIsNone(result['scorecards']['part11']['percentages']['satisfactory'])
        self.assertTrue(result['limitations'])
    def test_partial_read_cannot_be_scored(self):
        partial=self.result(); partial['sections_reviewed']=0
        model=Model(); result=self.run_review(model,result=partial)
        self.assertEqual(model.calls,[])
        self.assertEqual(len(result['criteria']),30)
        self.assertIsNone(result['scorecards']['quality']['percentages']['satisfactory'])
    def test_source_snapshots_do_not_change_with_example_metadata(self):
        snapshot=self.snapshot()
        example=document(['A previously rejected assessment.']);example.update(id='example',role='example_rejected')
        example['extraction']['chunks'][0]['id']='example-evidence'
        snapshot['documents'].append(example)
        snapshot['example_metadata']={'example':{'reason':'Untestable mitigations','system_context':'LIMS','methodology':'Qualitative'}}
        frozen=copy.deepcopy(snapshot);model=Model()
        result=self.run_review(model,snapshot=snapshot)
        self.assertEqual(snapshot,frozen)
        self.assertEqual(model.calls[0]['example_metadata'],snapshot['example_metadata'])
        self.assertTrue(any(e['kind']=='example' for e in result['sources']))
    def test_part11_requires_regulatory_citation(self):
        class MissingReg(Model):
            def generate(self,payload):
                result=super().generate(payload);result['evidence_ids']=['e-0'];return result
        result=self.run_review(MissingReg())
        self.assertEqual(result['scorecards']['part11']['counts']['unevaluated'],18)
        self.assertEqual(result['scorecards']['quality']['counts']['satisfactory'],12)

    def test_report_escapes_user_content_and_shows_scores(self):
        from backend.report import report
        result=self.run_review()
        result['summary']='<script>alert(1)</script>'
        rendered=report({'id':'job','status':'completed','result':result,'snapshot':{}})
        self.assertIn('Document quality',rendered)
        self.assertIn('100.0%',rendered)
        self.assertIn('&lt;script&gt;',rendered)
        self.assertNotIn('<script>',rendered)
