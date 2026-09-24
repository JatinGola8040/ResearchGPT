import httpx
from app.config import settings

headers = {
    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": settings.OPENROUTER_SITE_URL,
    "X-Title": settings.OPENROUTER_SITE_NAME,
}

payload = {
    "model": settings.LLM_MODEL,
    "messages": [
        {"role": "system", "content": "You are ResearchGPT, an elite academic research assistant."},
        {"role": "user", "content": "What is edge computing in 1 sentence?"}
    ],
    "temperature": settings.LLM_TEMPERATURE,
    "max_tokens": 512,
    "top_p": settings.LLM_TOP_P
}

try:
    with httpx.Client(timeout=30.0) as client:
        resp = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        with open("test_or_output.txt", "w", encoding="utf-8") as f:
            f.write(content)
        print("Written content to test_or_output.txt successfully.")
except Exception as e:
    print(f"Error: {e}")
