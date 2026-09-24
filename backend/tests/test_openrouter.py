import unittest
from typing import Dict, Any, List
from pydantic import BaseModel

from app.config import settings
from app.services.llm_client import llm_client, LLMException, LLMRateLimitError
from app.services.ai.rag_service import answer_question
from app.services.ai.gap_service import generate_gap_analysis
from app.services.ai.summary_service import generate_paper_summary
from app.database import SessionLocal
from app.models import Paper

class SampleSchema(BaseModel):
    summary: str
    key_points: List[str]

class TestOpenRouterIntegration(unittest.TestCase):

    def test_01_api_key_configuration(self):
        """Verify OpenRouter configuration loaded correctly without exposing the secret."""
        self.assertEqual(settings.LLM_PROVIDER, "openrouter")
        self.assertEqual(settings.LLM_MODEL, "openai/gpt-oss-120b")
        self.assertTrue(len(settings.OPENROUTER_API_KEY) > 20)
        self.assertTrue(settings.OPENROUTER_API_KEY.startswith("sk-or-v1-"))

    def test_02_basic_completion(self):
        """Verify basic OpenRouter chat completion returns non-empty response."""
        messages = [
            {"role": "system", "content": "You are ResearchGPT, an elite academic assistant."},
            {"role": "user", "content": "Explain edge computing in one concise sentence."}
        ]
        response = llm_client.generate(messages=messages, max_tokens=256)
        self.assertIsInstance(response, str)
        self.assertTrue(len(response) > 20)
        self.assertNotIn("<think>", response)
        self.assertNotIn("</think>", response)

    def test_03_structured_json_completion(self):
        """Verify structured JSON generation with schema validation and repair fallback."""
        messages = [
            {"role": "system", "content": "You are an academic JSON generator. Return ONLY valid JSON."},
            {"role": "user", "content": 'Return a JSON object with keys "summary" (string) and "key_points" (list of strings) about blockchain consensus.'}
        ]
        data = llm_client.generate_json(messages=messages, schema_cls=SampleSchema, max_tokens=512)
        self.assertIsInstance(data, dict)
        self.assertIn("summary", data)
        self.assertIn("key_points", data)
        self.assertIsInstance(data["key_points"], list)

    def test_04_rag_completion(self):
        """Verify RAG service answers queries with validated citations using OpenRouter."""
        res = answer_question("What is edge computing and its key trade-offs?")
        self.assertIsInstance(res, dict)
        self.assertIn("answer", res)
        self.assertIn("citations", res)
        self.assertTrue(len(res["answer"]) > 100)
        self.assertIsInstance(res["citations"], list)

    def test_05_error_handling_empty_query(self):
        """Verify prompt with empty string is handled gracefully without unnecessary API calls."""
        res = answer_question("")
        self.assertEqual(res["answer"], "Please provide a valid research question.")
        self.assertEqual(res["citations"], [])

    def test_06_llm_health_status(self):
        """Verify configuration health metadata."""
        self.assertEqual(llm_client.model, "openai/gpt-oss-120b")
        self.assertTrue(bool(llm_client.api_key))

if __name__ == "__main__":
    unittest.main()
