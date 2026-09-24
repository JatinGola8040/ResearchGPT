import unittest
from unittest.mock import patch

from app.schemas import IdeaValidationRequest
from app.services.ai.validator_service import generate_idea_validation


class TestValidatorService(unittest.TestCase):
    def setUp(self):
        self.papers_meta = [
            {"paper_id": "p1", "paper_title": "Federated IDS for IoT"},
            {"paper_id": "p2", "paper_title": "Lightweight Blockchain Trust"},
        ]
        self.request = IdeaValidationRequest(
            paper_ids=["p1", "p2"],
            research_idea="Lightweight blockchain-based federated intrusion detection for resource-constrained IoT devices.",
            domain="IoT Security",
            target_problem="Trustworthy intrusion detection under edge constraints",
            proposed_method="Federated intrusion detection with a lightweight blockchain trust layer",
            constraints=["limited compute", "low latency"],
        )

    @patch("app.services.ai.validator_service.validate_citations")
    @patch("app.services.ai.validator_service.format_citations")
    @patch("app.services.ai.validator_service.llm_client.generate_json")
    @patch("app.services.ai.validator_service.generate_gap_analysis")
    @patch("app.services.ai.validator_service.retrieve_gap_evidence", return_value=[])
    @patch("app.services.ai.validator_service.retrieve_relevant_chunks")
    def test_valid_idea(
        self,
        mock_retrieve,
        mock_gap_chunks,
        mock_gap_analysis,
        mock_generate_json,
        mock_format_citations,
        mock_validate_citations,
    ):
        chunk_one = {
            "paper_id": "p1",
            "paper_title": "Federated IDS for IoT",
            "page": 7,
            "chunk_id": 1,
            "similarity_score": 0.91,
            "chunk_text": "Federated intrusion detection for IoT nodes improves privacy but increases coordination overhead.",
        }
        chunk_two = {
            "paper_id": "p2",
            "paper_title": "Lightweight Blockchain Trust",
            "page": 5,
            "chunk_id": 2,
            "similarity_score": 0.88,
            "chunk_text": "A lightweight blockchain trust mechanism reduces tampering risk, but resource limits remain a constraint.",
        }
        mock_retrieve.return_value = [chunk_one, chunk_two, {**chunk_one, "chunk_id": 3, "page": 9}]
        mock_gap_analysis.return_value = {"evidence_quality": "High grounded fidelity across indexed papers."}
        mock_generate_json.return_value = {
            "corpus_summary": "Assessment based on the indexed papers, with strong overlap on the problem and partial overlap on the method.",
            "existing_work": [
                {
                    "paper_title": "Federated IDS for IoT",
                    "relevance": "high",
                    "existing_contribution": "Federated IDS is already explored for IoT environments.",
                    "overlap_with_idea": "The problem and distributed detection setup strongly overlap.",
                },
                {
                    "paper_title": "Lightweight Blockchain Trust",
                    "relevance": "medium",
                    "existing_contribution": "Blockchain-based trust has been studied under lightweight constraints.",
                    "overlap_with_idea": "The trust layer overlaps, but not the full IDS combination.",
                },
            ],
            "overlap_analysis": {
                "problem": {"level": "high", "rationale": "IoT intrusion detection is directly covered."},
                "method": {"level": "medium", "rationale": "Blockchain trust is related but not fully identical."},
                "dataset": {"level": "low", "rationale": "Dataset evidence is sparse."},
                "domain": {"level": "high", "rationale": "The papers are both in IoT security."},
                "evaluation": {"level": "medium", "rationale": "Some performance metrics exist but edge trade-offs are incomplete."},
                "combination": {"level": "low", "rationale": "The exact combination remains underexplored."},
            },
            "novelty_signals": [
                {"dimension": "Combination Novelty", "signal": "high", "rationale": "The indexed papers do not directly combine both ideas."}
            ],
            "research_gaps": [
                {
                    "gap": "Limited evaluation of trust-enhanced federated IDS under strict edge constraints.",
                    "type": "underexplored",
                    "why_it_matters": "Edge deployments need resource-aware validation.",
                    "supporting_papers": ["Federated IDS for IoT", "Lightweight Blockchain Trust"],
                    "evidence": ["Both papers mention overhead concerns."],
                    "confidence": "high",
                }
            ],
            "potential_contribution": "A resource-aware trust layer for federated IDS under constrained IoT conditions.",
            "research_questions": [
                "Can a lightweight blockchain trust layer improve federated IDS robustness without violating edge latency constraints?"
            ],
            "hypothesis": {
                "h1": "Integrating a lightweight blockchain trust layer with federated IDS will improve trust resilience while preserving feasible edge performance.",
                "h0": "The trust layer will not provide a meaningful advantage over standard federated IDS under edge constraints.",
            },
            "experiment_blueprint": {
                "dataset": ["IoT network intrusion benchmark"],
                "baselines": ["Centralized IDS", "Federated IDS"],
                "proposed_method": "Federated IDS with lightweight blockchain trust layer",
                "experimental_setup": "Compare centralized, federated, and trust-augmented variants under edge resource constraints.",
                "variables": ["consensus overhead", "node churn", "attack intensity"],
                "evaluation_metrics": ["accuracy", "f1", "latency", "energy"],
                "ablation_study": ["Remove trust layer", "Swap consensus variant"],
                "expected_comparison": "The proposed method should trade a moderate overhead increase for stronger trust robustness.",
            },
            "baselines": [
                {
                    "baseline": "Federated IDS",
                    "why_it_matters": "It isolates the benefit of the blockchain trust layer.",
                    "paper": "Federated IDS for IoT",
                    "evidence": "This paper provides the core distributed IDS baseline.",
                }
            ],
            "potential_contributions": [
                "A resource-aware architecture for trustworthy federated IDS.",
                "An evaluation protocol focused on edge constraints.",
            ],
            "evidence_quality": "High grounded fidelity across indexed papers.",
        }
        mock_format_citations.return_value = [{"paper_id": "p1"}]
        mock_validate_citations.return_value = [
            {"paper_id": "p1", "paper_title": "Federated IDS for IoT", "page": 7, "snippet": "Federated intrusion detection..."}
        ]

        result = generate_idea_validation(self.papers_meta, self.request)

        self.assertEqual(result["idea"], self.request.research_idea)
        self.assertEqual(result["existing_work"][0]["paper_id"], "p1")
        self.assertEqual(result["overlap_analysis"]["problem"]["level"], "high")
        self.assertEqual(result["novelty_signals"][0]["signal"], "high")
        self.assertEqual(result["research_gaps"][0]["confidence"], "high")
        self.assertEqual(result["citations"][0]["paper_id"], "p1")

    def test_empty_idea(self):
        request = IdeaValidationRequest(
            paper_ids=["p1"],
            research_idea="tmp",
            constraints=[],
        )
        request.research_idea = " "
        with self.assertRaises(ValueError):
            generate_idea_validation(self.papers_meta, request)

    def test_no_selected_papers(self):
        with self.assertRaises(ValueError):
            generate_idea_validation([], self.request)

    @patch("app.services.ai.validator_service.retrieve_gap_evidence", return_value=[])
    @patch("app.services.ai.validator_service.retrieve_relevant_chunks")
    @patch("app.services.ai.validator_service.generate_gap_analysis")
    def test_insufficient_evidence(self, mock_gap_analysis, mock_retrieve, mock_gap_chunks):
        mock_retrieve.return_value = [
            {
                "paper_id": "p1",
                "paper_title": "Federated IDS for IoT",
                "page": 7,
                "chunk_id": 1,
                "similarity_score": 0.91,
                "chunk_text": "Short evidence snippet.",
            }
        ]
        mock_gap_analysis.return_value = {"evidence_quality": "Limited corpus evidence."}

        result = generate_idea_validation(self.papers_meta, self.request)

        self.assertIn("Insufficient evidence", result["evidence_quality"])
        self.assertEqual(result["overlap_analysis"]["problem"]["level"], "low")

    @patch("app.services.ai.validator_service.validate_citations")
    @patch("app.services.ai.validator_service.format_citations")
    @patch("app.services.ai.validator_service.llm_client.generate_json")
    @patch("app.services.ai.validator_service.generate_gap_analysis")
    @patch("app.services.ai.validator_service.retrieve_gap_evidence", return_value=[])
    @patch("app.services.ai.validator_service.retrieve_relevant_chunks")
    def test_citation_validation(
        self,
        mock_retrieve,
        mock_gap_chunks,
        mock_gap_analysis,
        mock_generate_json,
        mock_format_citations,
        mock_validate_citations,
    ):
        mock_retrieve.return_value = [
            {
                "paper_id": "p1",
                "paper_title": "Federated IDS for IoT",
                "page": 7,
                "chunk_id": 1,
                "similarity_score": 0.91,
                "chunk_text": "Federated intrusion detection evidence.",
            },
            {
                "paper_id": "p2",
                "paper_title": "Lightweight Blockchain Trust",
                "page": 5,
                "chunk_id": 2,
                "similarity_score": 0.88,
                "chunk_text": "Lightweight blockchain evidence.",
            },
            {
                "paper_id": "p2",
                "paper_title": "Lightweight Blockchain Trust",
                "page": 8,
                "chunk_id": 3,
                "similarity_score": 0.82,
                "chunk_text": "Additional evaluation evidence.",
            },
        ]
        mock_gap_analysis.return_value = {"evidence_quality": "Moderate"}
        mock_generate_json.return_value = {
            "corpus_summary": "Corpus-based assessment",
            "existing_work": [],
            "overlap_analysis": {key: {"level": "medium", "rationale": "Grounded"} for key in ["problem", "method", "dataset", "domain", "evaluation", "combination"]},
            "novelty_signals": [],
            "research_gaps": [],
            "potential_contribution": "Potential contribution",
            "research_questions": ["RQ1"],
            "hypothesis": {"h1": "H1", "h0": "H0"},
            "experiment_blueprint": {
                "dataset": [],
                "baselines": [],
                "proposed_method": "Method",
                "experimental_setup": "Setup",
                "variables": [],
                "evaluation_metrics": [],
                "ablation_study": [],
                "expected_comparison": "Comparison",
            },
            "baselines": [],
            "potential_contributions": [],
            "evidence_quality": "Moderate",
        }
        mock_format_citations.return_value = [{"paper_id": "fake"}]
        mock_validate_citations.return_value = [{"paper_id": "p2", "paper_title": "Lightweight Blockchain Trust", "page": 5, "snippet": "Valid"}]

        result = generate_idea_validation(self.papers_meta, self.request)

        self.assertEqual(result["citations"], mock_validate_citations.return_value)

    @patch("app.services.ai.validator_service.llm_client.generate_json")
    @patch("app.services.ai.validator_service.generate_gap_analysis")
    @patch("app.services.ai.validator_service.retrieve_gap_evidence", return_value=[])
    @patch("app.services.ai.validator_service.retrieve_relevant_chunks")
    def test_malformed_llm_response(self, mock_retrieve, mock_gap_chunks, mock_gap_analysis, mock_generate_json):
        mock_retrieve.return_value = [
            {
                "paper_id": "p1",
                "paper_title": "Federated IDS for IoT",
                "page": 7,
                "chunk_id": 1,
                "similarity_score": 0.91,
                "chunk_text": "Federated intrusion detection evidence.",
            },
            {
                "paper_id": "p2",
                "paper_title": "Lightweight Blockchain Trust",
                "page": 5,
                "chunk_id": 2,
                "similarity_score": 0.88,
                "chunk_text": "Lightweight blockchain evidence.",
            },
            {
                "paper_id": "p2",
                "paper_title": "Lightweight Blockchain Trust",
                "page": 8,
                "chunk_id": 3,
                "similarity_score": 0.82,
                "chunk_text": "Additional evaluation evidence.",
            },
        ]
        mock_gap_analysis.return_value = {"evidence_quality": "Moderate"}
        mock_generate_json.return_value = {"corpus_summary": "missing most required fields"}

        result = generate_idea_validation(self.papers_meta, self.request)
        self.assertIn("corpus_summary", result)
        self.assertIn("experiment_blueprint", result)

    @patch("app.services.ai.validator_service.validate_citations")
    @patch("app.services.ai.validator_service.format_citations")
    @patch("app.services.ai.validator_service.llm_client.generate_json")
    @patch("app.services.ai.validator_service.generate_gap_analysis")
    @patch("app.services.ai.validator_service.retrieve_gap_evidence", return_value=[])
    @patch("app.services.ai.validator_service.retrieve_relevant_chunks")
    def test_structured_response_parsing(
        self,
        mock_retrieve,
        mock_gap_chunks,
        mock_gap_analysis,
        mock_generate_json,
        mock_format_citations,
        mock_validate_citations,
    ):
        mock_retrieve.return_value = [
            {
                "paper_id": "p1",
                "paper_title": "Federated IDS for IoT",
                "page": 7,
                "chunk_id": 1,
                "similarity_score": 0.91,
                "chunk_text": "Federated intrusion detection evidence.",
            },
            {
                "paper_id": "p2",
                "paper_title": "Lightweight Blockchain Trust",
                "page": 5,
                "chunk_id": 2,
                "similarity_score": 0.88,
                "chunk_text": "Lightweight blockchain evidence.",
            },
            {
                "paper_id": "p2",
                "paper_title": "Lightweight Blockchain Trust",
                "page": 8,
                "chunk_id": 3,
                "similarity_score": 0.82,
                "chunk_text": "Additional evaluation evidence.",
            },
        ]
        mock_gap_analysis.return_value = {"evidence_quality": "Moderate"}
        mock_generate_json.return_value = {
            "corpus_summary": "Assessment based on indexed papers.",
            "existing_work": [],
            "overlap_analysis": {key: {"level": "medium", "rationale": "Grounded"} for key in ["problem", "method", "dataset", "domain", "evaluation", "combination"]},
            "novelty_signals": [{"dimension": "Method Novelty", "signal": "medium", "rationale": "Partial overlap"}],
            "research_gaps": [],
            "potential_contribution": "Potential contribution",
            "research_questions": ["RQ1", "RQ2"],
            "hypothesis": {"h1": "H1", "h0": "H0"},
            "experiment_blueprint": {
                "dataset": ["Dataset A"],
                "baselines": ["Baseline A"],
                "proposed_method": "Method",
                "experimental_setup": "Setup",
                "variables": ["Variable A"],
                "evaluation_metrics": ["Metric A"],
                "ablation_study": ["Ablation A"],
                "expected_comparison": "Comparison",
            },
            "baselines": [],
            "potential_contributions": ["Contribution A"],
            "evidence_quality": "Moderate",
        }
        mock_format_citations.return_value = []
        mock_validate_citations.return_value = []

        result = generate_idea_validation(self.papers_meta, self.request)

        self.assertIn("experiment_blueprint", result)
        self.assertEqual(result["experiment_blueprint"]["dataset"], ["Dataset A"])
        self.assertEqual(result["research_questions"], ["RQ1", "RQ2"])


if __name__ == "__main__":
    unittest.main()
