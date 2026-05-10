"""
api/services/gemini_service.py
Proxies natural-language questions to Gemini 2.0 Flash,
grounded in Bihar SCM/BSTS results JSON.
"""

import os, json, asyncio
from pathlib import Path
import httpx

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"

SYSTEM_PROMPT = """You are an expert econometric research assistant explaining
the results of a Synthetic Control Method (SCM) and Bayesian Structural Time
Series (BSTS) analysis of Bihar's April 2016 alcohol prohibition.

The analysis finds:
- SCM pre-period RMSPE: 42 deaths (excellent fit, <1% of Bihar's mean)
- SCM RMSPE ratio: 22.87x (rank 2/14 donors, permutation p≈0.071)
- Top donors: Jharkhand (68%), Odisha (16%), Uttar Pradesh (16%)
- 2016-2017: Bihar had ~600-900 FEWER deaths than synthetic counterfactual
- 2019-2022: Bihar had ~200-1,800 MORE deaths than synthetic (fading effect)
- Average post-treatment: +360 deaths/yr (SCM); +1076 deaths/yr (BSTS, max_donors=3)
- BSTS p=0.0 but unreliable — only 6 pre-treatment observations; restricted to 3 covariates (Haryana, Odisha, West Bengal) to avoid overfitting
- Own tax revenue gap: -₹2,017 Cr/yr (SCM), -₹4,867 Cr/yr (BSTS)

RULES:
- Answer using the provided results JSON data and the summary above
- Be precise — cite specific numbers (weights, RMSPE, gaps, dates)
- Keep answers concise (3-5 sentences) unless the question needs more
- If asked about limitations, mention: short pre-period (4-6 years),
  Bihar outside convex hull, BSTS overfit, data approximations
- Never claim stronger causal evidence than the data supports
- Plain text only — no markdown bullets or bold in your response"""


async def ask_gemini(question: str, method: str = "scm") -> dict:
    if not GEMINI_KEY:
        return {
            "answer": (
                "Gemini API key not configured. "
                "Add GEMINI_API_KEY to api/.env to enable this feature."
            ),
            "sources_used": [],
        }

    # Load relevant results JSON(s)
    sources = []
    contexts = []
    files_to_load = {
        "scm" : ["bihar_scm.json"],
        "bsts": ["bihar_bsts.json"],
        "both": ["bihar_scm.json", "bihar_bsts.json"],
    }.get(method, ["bihar_scm.json"])

    for fname in files_to_load:
        path = RESULTS_DIR / fname
        if path.exists():
            data = json.loads(path.read_text())
            # Truncate large arrays to keep context manageable
            for key in ["placebo_gaps", "placebo_rmspe_ratios"]:
                if key in data:
                    truncated = dict(list(data[key].items())[:5])
                    data[key] = {**truncated, "...": "truncated"}
            contexts.append(
                f"=== {fname.upper()} ===\n"
                f"{json.dumps(data, indent=2)[:6000]}"
            )
            sources.append(fname)

    full_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"RESULTS DATA:\n" + "\n\n".join(contexts) +
        f"\n\nUSER QUESTION: {question}\n\nANSWER:"
    )

    # Retry up to 3 times with exponential backoff on 429
    resp = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(3):
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_KEY}",
                json={
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {
                        "temperature"    : 0.2,
                        "maxOutputTokens": 600,
                    },
                },
            )
            if resp.status_code == 429:
                if attempt < 2:
                    await asyncio.sleep((2 ** attempt) * 2)  # 2s, 4s
                    continue
                return {
                    "answer": (
                        "The AI assistant is temporarily busy. "
                        "Please try again in a few seconds."
                    ),
                    "sources_used": [],
                }
            if resp.status_code == 400:
                return {
                    "answer": (
                        "Gemini returned a bad request error. "
                        "Your question may be too long."
                    ),
                    "sources_used": [],
                }
            if resp.status_code != 200:
                return {
                    "answer": (
                        f"AI assistant unavailable (HTTP {resp.status_code}). "
                        "The analysis results are still fully available above."
                    ),
                    "sources_used": [],
                }
            break

    try:
        data = resp.json() if resp is not None else {}
        answer = (
            data["candidates"][0]["content"]["parts"][0]["text"].strip()
        )
    except (KeyError, IndexError, AttributeError):
        answer = "The AI assistant returned an unexpected response."

    return {"answer": answer, "sources_used": sources}
