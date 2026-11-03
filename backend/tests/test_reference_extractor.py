import unittest

from app.services.pdf.reference_extractor import (
    split_reference_entries,
    parse_reference_fields,
    match_to_uploaded_paper,
)


class TestReferenceExtraction(unittest.TestCase):
    NUMBERED = """[1] A. Smith and B. Jones, "Attention Is All You Need Revisited," in Proc. NeurIPS, 2019, doi: 10.1234/neurips.2019.1.
[2] C. Lee, "Federated Learning at Scale," IEEE Trans. Mobile Computing, 2021. https://doi.org/10.5678/tmc.2021.2
[3] D. Patel et al., "Efficient Transformers: A Survey," 2020."""

    AUTHOR_YEAR = """Smith, A., & Jones, B. (2019). Attention is all you need revisited. Advances in Neural Information Processing Systems.

Lee, C. (2021). Federated learning at scale. IEEE Transactions on Mobile Computing.

Patel, D., et al. (2020). Efficient transformers: A survey. ACM Computing Surveys."""

    def test_numbered_split(self):
        entries = split_reference_entries(self.NUMBERED)
        self.assertEqual(len(entries), 3)
        self.assertEqual(entries[0]["ref_index"], 1)
        self.assertIn("Attention", entries[0]["raw_text"])

    def test_author_year_split(self):
        entries = split_reference_entries(self.AUTHOR_YEAR)
        self.assertEqual(len(entries), 3)
        self.assertIsNone(entries[0]["ref_index"])

    def test_field_extraction(self):
        fields = parse_reference_fields('[1] A. Smith, "Deep Nets Rock," NeurIPS, 2019, doi: 10.1234/nips.1. https://example.com')
        self.assertEqual(fields["doi"], "10.1234/nips.1")
        self.assertEqual(fields["url"], "https://example.com")
        self.assertEqual(fields["year"], "2019")
        self.assertEqual(fields["title_guess"], "Deep Nets Rock")

    def test_title_fuzzy_match(self):
        class FakePaper:
            def __init__(self, id, title):
                self.id = id
                self.title = title
                self.filename = title

        papers = [FakePaper("p1", "Attention Is All You Need Revisited"), FakePaper("p2", "Unrelated Genomics Study")]
        match = match_to_uploaded_paper({"title_guess": "Attention is all you need revisited"}, papers)
        self.assertEqual(match, "p1")
        no_match = match_to_uploaded_paper({"title_guess": "Quantum error correction benchmarks"}, papers)
        self.assertIsNone(no_match)

    def test_empty_input(self):
        self.assertEqual(split_reference_entries(""), [])
        self.assertEqual(split_reference_entries("short"), [])


if __name__ == "__main__":
    unittest.main()
