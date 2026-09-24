from app.config import settings
from groq import Groq
from app.utils.json_helper import extract_clean_text

client = Groq(api_key=settings.GROQ_API_KEY)

try:
    completion = client.chat.completions.create(
        model="qwen/qwen3.6-27b",
        messages=[
            {"role": "system", "content": "You are ResearchGPT, an elite academic research assistant. Provide concise, grounded answers."},
            {"role": "user", "content": "What is edge computing in 2 sentences?"}
        ],
        temperature=0.6,
        max_completion_tokens=2048,
        top_p=0.95
    )
    raw = completion.choices[0].message.content
    with open("test_output_raw.txt", "w", encoding="utf-8") as f:
        f.write(raw)
    
    cleaned = extract_clean_text(raw)
    with open("test_output_cleaned.txt", "w", encoding="utf-8") as f:
        f.write(cleaned)

    print(f"RAW LENGTH: {len(raw)}")
    print(f"CLEANED LENGTH: {len(cleaned)}")
    print(f"HAS THINK IN RAW: {'<think>' in raw}")
    print(f"HAS /THINK IN RAW: {'</think>' in raw}")
except Exception as e:
    print(f"Error: {e}")
