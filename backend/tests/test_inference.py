import unittest
from backend.inference import validate_findings

class OutputTests(unittest.TestCase):
    def test_valid(self):
        f={'rationale':'Unclear mitigation','action':'Specify test','priority':'Medium','evidence_ids':['a']}
        self.assertEqual(validate_findings({'assessment':'Reviewed','sufficient_evidence':True,'findings':[f]},{'a'}),[f])
    def test_fabricated_or_cross_project_citation(self):
        for ids in [[],['other-project'],[{}],None]:
            with self.assertRaises(ValueError):
                validate_findings({'assessment':'Reviewed','sufficient_evidence':True,'findings':[{'rationale':'x','action':'y','priority':'High','evidence_ids':ids}]},{'a'})
    def test_empty_output_not_success(self):
        for output in [{},{'findings':[]},{'assessment':'x','findings':[]}]:
            with self.assertRaises(ValueError):validate_findings(output,{'a'})
