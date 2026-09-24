import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

QUERIES = [
    "What are the main contributions across these papers?",
    "Compare the methodologies used in these papers.",
    "Identify unresolved research gaps across papers.",
    "Which limitations are explicitly mentioned?",
    "What future research directions are suggested?"
]

def p(text):
    try:
        print(text, flush=True)
    except UnicodeEncodeError:
        safe_text = text.encode("ascii", "replace").decode("ascii")
        print(safe_text, flush=True)

def main():
    p("=== RESEARCHGPT LIVE VERIFICATION SUITE (OPENROUTER MIGRATION) ===")
    p(f"Testing Backend at {BASE_URL} with OpenRouter + openai/gpt-oss-120b\n")

    # 1. Health Checks
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=15)
        p(f"[1/8] System Health: {r.status_code} -> {r.json()}")
        
        r_llm = requests.get(f"{BASE_URL}/debug/llm-health", timeout=15)
        p(f"[2/8] LLM Health: {r_llm.status_code} -> {r_llm.json()}")
    except Exception as e:
        p(f"FAILED to connect to backend: {e}")
        sys.exit(1)

    # 2. Papers list
    r_papers = requests.get(f"{BASE_URL}/papers", timeout=15)
    papers = r_papers.json()
    indexed_papers = [paper for paper in papers if paper.get("status") == "indexed"]
    p(f"[3/8] Total indexed papers: {len(indexed_papers)}/{len(papers)}")
    for paper in indexed_papers[:3]:
        p(f"      - {paper.get('title')} ({paper.get('id')})")

    if not indexed_papers:
        p("No indexed papers found. Cannot proceed with live query verification.")
        sys.exit(1)

    sample_pid = indexed_papers[0]["id"]
    sample_ids = [p["id"] for p in indexed_papers[:3]]

    # 3. Test Paper Summary Endpoint
    p("\n--- TESTING PAPER SUMMARY ENDPOINT ---")
    try:
        r_sum = requests.get(f"{BASE_URL}/papers/{sample_pid}/summary", timeout=120)
        if r_sum.status_code == 200:
            sum_data = r_sum.json()
            p(f"  SUCCESS! Summary: {sum_data.get('executive_summary', '')[:120]}...")
            p(f"  Key Contributions: {len(sum_data.get('key_contributions', []))}")
            p(f"  Citations: {len(sum_data.get('citations', []))}")
        else:
            p(f"  FAILED: Status {r_sum.status_code} - {r_sum.text}")
    except Exception as e:
        p(f"  EXCEPTION: {e}")

    # 4. Test Multi-Paper Compare Endpoint
    p("\n--- TESTING MULTI-PAPER COMPARE ENDPOINT ---")
    try:
        r_comp = requests.post(f"{BASE_URL}/papers/compare", json={"paper_ids": sample_ids[:2]}, timeout=120)
        if r_comp.status_code == 200:
            comp_data = r_comp.json()
            comp = comp_data.get("comparison", {})
            p(f"  SUCCESS! Research Objective: {comp.get('research_objective', '')[:120]}...")
            p(f"  Key Differences: {len(comp.get('key_differences', []))}")
            p(f"  Citations: {len(comp_data.get('citations', []))}")
        else:
            p(f"  FAILED: Status {r_comp.status_code} - {r_comp.text}")
    except Exception as e:
        p(f"  EXCEPTION: {e}")

    # 5. Test 5 Core RAG Queries
    p("\n--- TESTING 5 CORE RAG QUERIES ---")
    for idx, q in enumerate(QUERIES, 1):
        p(f"\n[Query {idx}/5]: '{q}'")
        try:
            resp = requests.post(
                f"{BASE_URL}/query",
                json={"query": q},
                timeout=120
            )
            if resp.status_code != 200:
                p(f"  FAILED: Status {resp.status_code} - {resp.text}")
                continue
            
            data = resp.json()
            answer = data.get("answer", "")
            citations = data.get("citations", [])
            p(f"  SUCCESS! Answer length: {len(answer)} chars | Citations: {len(citations)}")
            p(f"  Snippet: {answer[:180]}...")
            if citations:
                p(f"  Top Citation: [{citations[0].get('paper_title')}, Page {citations[0].get('page')}]")
        except Exception as e:
            p(f"  EXCEPTION: {e}")

    # 6. Test Gap Analysis Feature
    p("\n--- TESTING GAP ANALYSIS ENDPOINT ---")
    try:
        resp = requests.post(
            f"{BASE_URL}/papers/gap-analysis",
            json={"paper_ids": sample_ids},
            timeout=120
        )
        if resp.status_code == 200:
            gap_data = resp.json()
            analysis = gap_data.get("analysis", {})
            gaps = analysis.get("research_gaps", [])
            p(f"  SUCCESS! Coverage: {analysis.get('research_coverage', '')[:120]}...")
            p(f"  Gaps Found: {len(gaps)}")
            for g_idx, g in enumerate(gaps[:3], 1):
                gap_text = g.get("gap") if isinstance(g, dict) else str(g)
                p(f"    Gap {g_idx}: {gap_text}")
        else:
            p(f"  FAILED: Status {resp.status_code} - {resp.text}")
    except Exception as e:
        p(f"  EXCEPTION during gap analysis: {e}")

    # 7. Test Literature Review Feature
    p("\n--- TESTING LITERATURE REVIEW ENDPOINT ---")
    try:
        resp = requests.post(
            f"{BASE_URL}/papers/literature-review",
            json={"paper_ids": sample_ids},
            timeout=120
        )
        if resp.status_code == 200:
            lit_data = resp.json()
            p(f"  SUCCESS! Title: {lit_data.get('title')}")
            p(f"  Introduction: {lit_data.get('introduction', '')[:120]}...")
            p(f"  References: {len(lit_data.get('references', []))}")
        else:
            p(f"  FAILED: Status {resp.status_code} - {resp.text}")
    except Exception as e:
        p(f"  EXCEPTION during literature review: {e}")

    # 8. Test Debug Endpoint
    p("\n--- TESTING DEBUG GAP ANALYSIS ENDPOINT ---")
    try:
        resp = requests.post(
            f"{BASE_URL}/debug/gap-analysis",
            json={"paper_ids": sample_ids[:2]},
            timeout=120
        )
        if resp.status_code == 200:
            dbg_data = resp.json().get("data", {})
            p(f"  SUCCESS! Model: {dbg_data.get('model')} | Retrieved chunks: {dbg_data.get('retrieved_chunks_count')}")
            p(f"  Prompt length: ~{dbg_data.get('prompt_approx_char_length')} chars | Gaps: {dbg_data.get('evidence_count')}")
        else:
            p(f"  FAILED: Status {resp.status_code} - {resp.text}")
    except Exception as e:
        p(f"  EXCEPTION during debug gap analysis: {e}")

    p("\n=== ALL VERIFICATION RUNS COMPLETE ===")

if __name__ == "__main__":
    main()
