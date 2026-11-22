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

    def test_generation_uses_longer_timeout_than_embeddings(self):
        from unittest.mock import MagicMock
        from backend.inference import Ollama, GENERATION_TIMEOUT
        from backend.worker import LEASE_SECONDS
        model=Ollama()
        model.client.close()
        model.client=MagicMock()
        model.client.post.return_value.json.return_value={'message':{'content':'{"findings": []}'}}
        model.generate({'task':'Review'})
        timeout=model.client.post.call_args.kwargs['timeout']
        self.assertEqual(timeout.read,GENERATION_TIMEOUT)
        self.assertEqual(timeout.connect,10)
        self.assertGreater(LEASE_SECONDS,GENERATION_TIMEOUT)
