import unittest
from unittest.mock import patch

from app.services.ai.contradiction_service import generate_contradiction_map


class TestContradictionMap(unittest.TestCase):
    def setUp(self):
        self.papers = [
            {"paper_id": "p1", "title": "Paper One", "pages": "10", "chunk_count": 50},
            {"paper_id": "p2", "title": "Paper Two", "pages": "8", "chunk_count": 40},
        ]

    @patch("app.services.ai.contradiction_service.retrieve_relevant_chunks")
    @patch("app.services.ai.contradiction_service.detect_stances")
    @patch("app.services.ai.contradiction_service._extract_key_claims")
    @patch("app.services.ai.contradiction_service._gap_derived_claims")
    def test_two_papers_one_edge(
        self, mock_gap_claims, mock_extract, mock_stances, mock_retrieve
    ):
        mock_gap_claims.return_value = []
        mock_extract.return_value = [
            {"claim_id": "c1", "paper_id": "p1", "claim": "Method A is faster."}
        ]

        def fake_retrieve(query, top_k=5, filter_paper_id=None, filter_paper_ids=None, **kw):
            pid = filter_paper_id or (filter_paper_ids or ["p2"])[0]
            return [{
                "paper_id": pid, "paper_title": f"Paper {pid}", "page": 2,
                "chunk_text": f"text from {pid}", "similarity_score": 0.7,
        }]
        mock_retrieve.side_effect = fake_retrieve
        mock_stances.return_value = [
            {"claim_id": "c1", "passage_id": "c1-own-0", "stance": "agrees", "rationale": "own"},
            {"claim_id": "c1", "passage_id": "c1-x-1", "stance": "contradicts", "rationale": "cross"},
        ]

        result = generate_contradiction_map(self.papers)
        self.assertEqual(len(result["nodes"]), 2)
        self.assertEqual(result["claims_total"], 1)
        self.assertEqual(len(result["edges"]), 1)
        edge = result["edges"][0]
        self.assertEqual(edge["stance"], "contradicts")
        self.assertEqual({edge["source_paper_id"], edge["target_paper_id"]}, {"p1", "p2"})
        self.assertTrue(edge["passages"])

    @patch("app.services.ai.contradiction_service.retrieve_relevant_chunks", return_value=[])
    @patch("app.services.ai.contradiction_service._extract_key_claims", return_value=[])
    @patch("app.services.ai.contradiction_service._gap_derived_claims", return_value=[])
    def test_no_claims_no_edges(self, _g, _e, _r):
        result = generate_contradiction_map(self.papers)
        self.assertEqual(result["edges"], [])
        self.assertEqual(len(result["nodes"]), 2)

    def test_single_paper_short_circuits(self):
        result = generate_contradiction_map(self.papers[:1])
        self.assertEqual(result["edges"], [])
        self.assertEqual(result["claims_total"], 0)


if __name__ == "__main__":
    unittest.main()
