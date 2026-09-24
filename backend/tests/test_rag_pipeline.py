import unittest
import json
from app.services.vector.retriever import (
    is_noise_or_reference_chunk,
    get_expansion_queries,
    retrieve_relevant_chunks,
    format_citations,
    validate_citations,
    retrieve_gap_evidence
)
from app.utils.json_helper import extract_clean_text, extract_json_from_response
from app.services.ai.gap_service import generate_gap_analysis
from app.services.ai.rag_service import answer_question
from app.database import SessionLocal
from app.models import Paper

class TestRAGPipeline(unittest.TestCase):

    def test_01_noise_filtering(self):
        """Verify that pure bibliography/reference text is detected as noise."""
        reference_text = "[1] A. Reyna, 'Blockchain in IoT', 2018. [2] B. Smith, 2019. [3] C. Lee, 2020. [4] D. Wang, 2021. doi: 10.1109/test"
        self.assertTrue(is_noise_or_reference_chunk(reference_text))
        
        clean_research_text = "Our experimental results show a 40% reduction in latency when deploying proof-of-authority on edge nodes compared to cloud validation."
        self.assertFalse(is_noise_or_reference_chunk(clean_research_text))

    def test_02_query_expansion(self):
        """Verify that gap analysis queries generate targeted limitation and challenge keywords."""
        exp = get_expansion_queries("Identify unresolved research gaps across papers")
        self.assertGreaterEqual(len(exp), 2)
        self.assertTrue(any("limitations" in q.lower() for q in exp))

    def test_03_json_helper_thinking_stripping(self):
        """Verify that reasoning models emitting <think> tags are cleanly sanitized."""
        raw_llm_response = "<think>\nThinking about research gaps...\nLet's construct JSON:\n</think>\n{\n  \"research_coverage\": \"Covers edge computing.\",\n  \"common_themes\": [\"Decentralization\"]\n}"
        cleaned = extract_clean_text(raw_llm_response)
        self.assertNotIn("<think>", cleaned)
        self.assertNotIn("</think>", cleaned)
        self.assertIn("Covers edge computing.", cleaned)

        parsed = extract_json_from_response(raw_llm_response)
        self.assertEqual(parsed.get("research_coverage"), "Covers edge computing.")
        self.assertEqual(parsed.get("common_themes"), ["Decentralization"])

    def test_04_citation_validation(self):
        """Verify that hallucinated citations are discarded and valid ones preserved."""
        retrieved_chunks = [
            {"paper_id": "valid-pid-1", "paper_title": "Paper 1", "page": 2, "chunk_text": "Real excerpt 1"},
            {"paper_id": "valid-pid-2", "paper_title": "Paper 2", "page": 5, "chunk_text": "Real excerpt 2"}
        ]
        
        citations = [
            {"paper_id": "valid-pid-1", "paper_title": "Paper 1", "page": 2, "snippet": "Real excerpt 1"},
            {"paper_id": "hallucinated-pid", "paper_title": "Fake Paper", "page": 99, "snippet": "Fake text"}
        ]
        
        validated = validate_citations(citations, retrieved_chunks)
        self.assertEqual(len(validated), 1)
        self.assertEqual(validated[0]["paper_id"], "valid-pid-1")

    def test_05_empty_query_rag(self):
        """Verify graceful handling when query is empty."""
        res = answer_question("")
        self.assertIn("citations", res)

    def test_06_no_papers_gap_analysis(self):
        """Verify graceful handling when no papers are passed."""
        res = generate_gap_analysis([])
        self.assertIn("research_gaps", res)
        self.assertEqual(len(res.get("citations", [])), 0)

    def test_07_end_to_end_gap_analysis_live(self):
        """Verify real multi-paper gap analysis against the indexed database."""
        db = SessionLocal()
        papers = db.query(Paper).filter(Paper.status == "indexed").limit(3).all()
        db.close()
        
        if not papers:
            print("No indexed papers found in SQLite, skipping live DB test.")
            return
            
        papers_meta = [{"paper_id": str(p.id), "paper_title": str(p.title or p.filename)} for p in papers]
        result = generate_gap_analysis(papers_meta)
        
        self.assertIn("research_coverage", result)
        self.assertIn("common_themes", result)
        self.assertIn("research_gaps", result)
        self.assertIn("citations", result)
        self.assertGreater(len(result["research_gaps"]), 0)
        self.assertNotEqual(result["research_coverage"], "")

if __name__ == "__main__":
    unittest.main()
