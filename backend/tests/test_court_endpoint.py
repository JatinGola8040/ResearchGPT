import unittest
from unittest.mock import patch

from app.services.ai.court_service import run_evidence_court


class TestEvidenceCourt(unittest.TestCase):
    CLAIM = "Self-attention reduces training time compared to RNNs."

    def setUp(self):
        self.papers_meta = [
            {"paper_id": "p1", "paper_title": "Transformers Rock"},
            {"paper_id": "p2", "paper_title": "RNNs Forever"},
        ]

    @patch("app.services.ai.court_service.llm_client.generate_json")
    @patch("app.services.ai.court_service.detect_stances")
    @patch("app.services.ai.court_service.retrieve_relevant_chunks")
    def test_supported_verdict(self, mock_retrieve, mock_stances, mock_llm):
        mock_retrieve.return_value = [
            {"paper_id": "p1", "paper_title": "Transformers Rock", "page": 4, "chunk_text": "Attention is 40% faster.", "similarity_score": 0.72},
            {"paper_id": "p2", "paper_title": "RNNs Forever", "page": 9, "chunk_text": "RNNs remain competitive.", "similarity_score": 0.55},
        ]
        mock_stances.return_value = [
            {"claim_id": "the-claim", "passage_id": "psg-0", "stance": "agrees", "rationale": "supports"},
            {"claim_id": "the-claim", "passage_id": "psg-1", "stance": "unrelated", "rationale": "off topic"},
        ]
        mock_llm.return_value = {
            "label": "supported",
            "confidence": 0.86,
            "sentences": [
                {"sentence": "The corpus supports the claim.", "tag": "supported", "source_passage_id": "psg-0"},
            ],
        }

        result = run_evidence_court(self.papers_meta, self.CLAIM)
        self.assertEqual(len(result["prosecution"]), 1)
        self.assertEqual(len(result["defense"]), 0)
        self.assertEqual(result["verdict"]["label"], "supported")
        self.assertEqual(result["verdict"]["sentences"][0]["tag"], "supported")
        self.assertIsNotNone(result["verdict"]["sentences"][0]["source"])
        self.assertEqual(result["verdict"]["sentences"][0]["source"]["page"], 4)

    @patch("app.services.ai.court_service.retrieve_relevant_chunks", return_value=[])
    def test_no_passages_insufficient(self, _r):
        result = run_evidence_court(self.papers_meta, self.CLAIM)
        self.assertEqual(result["verdict"]["label"], "insufficient_evidence")
        self.assertEqual(result["prosecution"], [])
        self.assertEqual(result["defense"], [])

    @patch("app.services.ai.court_service.llm_client.generate_json")
    @patch("app.services.ai.court_service.detect_stances")
    @patch("app.services.ai.court_service.retrieve_relevant_chunks")
    def test_judge_failure_degrades(self, mock_retrieve, mock_stances, mock_llm):
        mock_retrieve.return_value = [
            {"paper_id": "p1", "paper_title": "T", "page": 1, "chunk_text": "x", "similarity_score": 0.6},
        ]
        mock_stances.return_value = [
            {"claim_id": "the-claim", "passage_id": "psg-0", "stance": "agrees", "rationale": "y"},
        ]
        mock_llm.side_effect = RuntimeError("judge down")
        result = run_evidence_court(self.papers_meta, self.CLAIM)
        self.assertEqual(result["verdict"]["label"], "insufficient_evidence")
        self.assertEqual(len(result["prosecution"]), 1)


if __name__ == "__main__":
    unittest.main()
