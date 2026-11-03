import unittest
from unittest.mock import patch

from app.services.ai.stance_service import detect_stances


class TestStanceService(unittest.TestCase):
    def setUp(self):
        self.claims = [
            {"claim_id": "c1", "paper_id": "p1", "claim": "Method A halves training time."},
            {"claim_id": "c2", "paper_id": "p2", "claim": "Accuracy saturates after 10 epochs."},
        ]
        self.passages = {
            "c1": [
                {"passage_id": "psg-1", "paper_title": "Paper B", "page": 3, "text": "We find Method A is slower."},
            ],
            "c2": [
                {"passage_id": "psg-2", "paper_title": "Paper C", "page": 7, "text": "Accuracy plateaus at epoch 10."},
            ],
        }

    @patch("app.services.ai.stance_service.llm_client.generate_json")
    def test_happy_path(self, mock_llm):
        mock_llm.return_value = {
            "judgments": [
                {"claim_id": "c1", "passage_id": "psg-1", "stance": "contradicts", "rationale": "Reports slower training."},
                {"claim_id": "c2", "passage_id": "psg-2", "stance": "agrees", "rationale": "Same plateau."},
            ]
        }
        results = detect_stances(self.claims, self.passages)
        self.assertEqual(len(results), 2)
        by_passage = {r["passage_id"]: r for r in results}
        self.assertEqual(by_passage["psg-1"]["stance"], "contradicts")
        self.assertEqual(by_passage["psg-2"]["stance"], "agrees")

    @patch("app.services.ai.stance_service.llm_client.generate_json")
    def test_unknown_stance_coerced_to_partial(self, mock_llm):
        mock_llm.return_value = {
            "judgments": [
                {"claim_id": "c1", "passage_id": "psg-1", "stance": "strongly-agrees", "rationale": "x"},
            ]
        }
        results = detect_stances(self.claims, self.passages)
        self.assertEqual(results[0]["stance"], "partial")

    @patch("app.services.ai.stance_service.llm_client.generate_json")
    def test_llm_failure_returns_empty_not_raise(self, mock_llm):
        mock_llm.side_effect = RuntimeError("provider down")
        results = detect_stances(self.claims, self.passages)
        self.assertEqual(results, [])

    @patch("app.services.ai.stance_service.llm_client.generate_json")
    def test_no_passages_skips_llm(self, mock_llm):
        results = detect_stances(self.claims, {"c1": [], "c2": []})
        self.assertEqual(results, [])
        mock_llm.assert_not_called()


if __name__ == "__main__":
    unittest.main()
