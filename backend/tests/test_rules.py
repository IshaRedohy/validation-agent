import copy
import unittest
from backend.rules import review
from backend.profile import classify

class RulesTests(unittest.TestCase):
    def setUp(self):
        self.row = dict(risk_id='RA-001', requirement_id='URS-001', failure_mode='Loss', impact='Data integrity',
                        severity='5', probability='2', detectability='5', risk_score='50', risk_class='High',
                        mitigation='Test the control', evidence_ids=['source'])
    def test_valid(self):
        self.assertEqual(review([self.row], {'URS-001':['req']}), [])
    def test_thresholds(self):
        self.assertEqual([classify(n) for n in [1,19,20,49,50,125]], ['Low','Low','Medium','Medium','High','High'])
    def test_all_rating_combinations(self):
        for s in range(1,6):
            for p in range(1,6):
                for d in range(1,6):
                    score=s*p*d
                    row={**self.row,'severity':s,'probability':p,'detectability':d,'risk_score':score,'risk_class':classify(score)}
                    self.assertEqual(review([row],{'URS-001':['req']}),[])
    def test_wrong_score_and_class(self):
        findings=review([{**self.row,'risk_score':20,'risk_class':'Low'}],{'URS-001':['req']})
        self.assertEqual({f['code'] for f in findings},{'incorrect_score','incorrect_class'})
        self.assertTrue(all(f['evidence_ids']==['source'] for f in findings))
    def test_invalid_rating(self):
        for v in [0,6,-1,'1.5',True,None,'=A1*B1']:
            self.assertIn('invalid_rating',[f['code'] for f in review([{**self.row,'severity':v}],{'URS-001':['req']})])
    def test_coverage_duplicates_and_missing(self):
        codes={f['code'] for f in review([self.row,self.row],{'URS-002':['req']})}
        self.assertEqual(codes,{'duplicate_id','broken_requirement','uncovered_requirement'})
        self.assertIn('missing_requirements',[f['code'] for f in review([self.row],{})])
    def test_no_mutation(self):
        old=copy.deepcopy(self.row);review([self.row],{});self.assertEqual(old,self.row)
