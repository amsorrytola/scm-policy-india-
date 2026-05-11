"""
api/services/gemini_service.py
Hardened: every failure path returns a clean response, never throws.
"""

import os
import json
import asyncio
import logging
from pathlib import Path

import httpx

log = logging.getLogger("gemini-service")

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)
RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"

BASE_CONTEXT = """You are an expert econometric research assistant explaining
a Synthetic Control Method (SCM) and Bayesian Structural Time Series (BSTS)
analysis of Bihar's April 5, 2016 alcohol prohibition.

PROJECT OVERVIEW:
- Method: Synthetic Control Method (Abadie, Diamond & Hainmueller 2010, 2015)
  and BSTS (Brodersen et al. 2015)
- Treated unit: Bihar (Indian state, ~120M population in 2016)
- Treatment: Total prohibition on alcohol sale and consumption, April 5, 2016
- Donor pool: 13 major Indian states (Telangana excluded — only 2 pre-periods)
- Matching window: 2012-2015 (4 pre-treatment years, limited by NSDP data)
- Three outcomes analyzed independently: road accidents, own tax revenue, NSDP growth

SHARED METHODOLOGY:
- Special predictors: lagged outcome values used to match pre-period levels
  (standard Abadie 2010 §IV approach for level matching)
- Bihar lies near the edge of donor convex hull on income/urbanization
  (ratio ~ 0.3 vs donor average) — acknowledged limitation
- BSTS restricted to max_donors=3 (top by pre-period correlation) for the
  road-accident and own-tax outcomes to avoid overfitting with n_pre=6 << n_covariates=13
- Historical context: Women's groups protested alcohol violence, prohibition
  enacted. Chaudhuri & Jha (2024 EDCC) use similar causal design.

RULES:
- Answer ONLY using data from the results JSON and context above
- Cite specific numbers: weights, RMSPE values, year-by-year gaps, p-values
- Keep answers to 3-5 sentences unless question needs more
- Never claim stronger evidence than the data supports
- Mention limitations when asked
- Plain text only — no markdown"""

OUTCOME_CONTEXTS = {
    "road_accidents": """
ACTIVE OUTCOME: Road Accident Deaths (MoRTH Annual Reports)

KEY FINDINGS:
- Pre-period RMSPE: 42.3 deaths (0.8% of Bihar's mean)
- RMSPE ratio: 22.87x (rank 2 of 14, permutation p approximately 0.071)
- SCM donor weights: Jharkhand 0.68, Odisha 0.16, Uttar Pradesh 0.16
- 2016: -899 deaths, 2017: -261 deaths, 2018: +1,198 deaths (reversal)
- Average post-treatment (SCM): +360 deaths/year
- Average post-treatment (BSTS, max_donors=3): +1,076 deaths/year
- BSTS donors: Haryana (r=0.818), Odisha (r=0.668), West Bengal (r=0.627)
- Interpretation: Initial reduction reversed by 2018 — illicit market development""",

    "own_tax": """
ACTIVE OUTCOME: Own Tax Revenue, Rupees Crore (RBI Handbook T168)

KEY FINDINGS:
- PROXY for excise revenue — composite, not pure excise (excise was ~22-25% of own-tax pre-prohibition)
- SCM donors: Jharkhand 83.8%, UP 16.2%
- Average post effect (SCM): -Rs 2,017 Cr/year
- Average post effect (BSTS): -Rs 4,867 Cr/year
- BSTS donors: Jharkhand, West Bengal, Karnataka (all r > 0.99)
- Caveat: small gap is UNDERESTIMATE of true fiscal impact — non-excise taxes grew strongly post-2016""",

    "growth": """
ACTIVE OUTCOME: NSDP Per-Capita Growth Rate, % YoY (RBI Handbook T19)

KEY FINDINGS:
- SCM weights: Odisha 0.66, Rajasthan 0.32, Jharkhand 0.03
- Average post effect (SCM): -2.99 pp/year
- Permutation p-value: ~0.43 (rank 6/14 — NOT statistically significant)
- BSTS uses 2017 cutoff and SINGLE donor (Odisha) to avoid overfit
- BSTS effect: -4.28 pp/year, 95% CI [-5.02, -3.58]
- Both methods directionally negative; NOT statistically significant — suggestive only""",
}

OUTCOME_FILES = {
    "road_accidents": ["bihar_scm.json", "bihar_bsts.json"],
    "own_tax":        ["bihar_scm_tax.json", "bihar_bsts_tax.json"],
    "growth":         ["bihar_scm_growth.json", "bihar_bsts_growth.json"],
}

METHOD_FILES = {
    "scm":  [0],
    "bsts": [1],
    "both": [0, 1],
}


def _safe_response(answer: str, sources=None) -> dict:
    """Always return the canonical shape so Pydantic AskResponse never fails."""
    return {"answer": answer, "sources_used": sources or []}


async def ask_gemini(question: str, method: str = "scm",
                     outcome: str = "road_accidents") -> dict:
    """
    Hardened Gemini call. Catches everything; never raises.
    Always returns {"answer": str, "sources_used": list[str]}.
    """
    # ── 1. Validate API key ──────────────────────────────────────────────────
    if not GEMINI_KEY:
        log.warning("GEMINI_API_KEY not set in environment")
        return _safe_response(
            "Gemini API key not configured on the server. "
            "The analysis results are still fully visible above. "
            "(Admin: set GEMINI_API_KEY in Render environment variables.)"
        )

    # ── 2. Load context files ────────────────────────────────────────────────
    try:
        outcome_key = outcome if outcome in OUTCOME_CONTEXTS else "road_accidents"
        file_list = OUTCOME_FILES.get(outcome_key, OUTCOME_FILES["road_accidents"])
        indices = METHOD_FILES.get(method, [0])
        files_to_load = [file_list[i] for i in indices if i < len(file_list)]

        sources = []
        contexts = []
        for fname in files_to_load:
            path = RESULTS_DIR / fname
            if not path.exists():
                log.warning("Results file missing: %s", path)
                continue
            try:
                data = json.loads(path.read_text())
                for key in ["placebo_gaps", "placebo_rmspe_ratios"]:
                    if key in data:
                        truncated = dict(list(data[key].items())[:5])
                        data[key] = {**truncated, "...": "truncated"}
                contexts.append(
                    f"=== {fname.upper()} ===\n"
                    f"{json.dumps(data, indent=2)[:5000]}"
                )
                sources.append(fname)
            except Exception as e:
                log.error("Failed to load %s: %s", fname, e)

        full_prompt = (
            BASE_CONTEXT
            + "\n\n"
            + OUTCOME_CONTEXTS[outcome_key]
            + "\n\nRESULTS JSON DATA:\n"
            + "\n\n".join(contexts)
            + f"\n\nUSER QUESTION: {question}\n\nANSWER:"
        )
    except Exception as e:
        log.exception("Context-build error")
        return _safe_response(
            f"Internal context-building error: {type(e).__name__}."
        )

    # ── 3. Call Gemini API ───────────────────────────────────────────────────
    resp = None
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            for attempt in range(3):
                try:
                    resp = await client.post(
                        f"{GEMINI_URL}?key={GEMINI_KEY}",
                        json={
                            "contents": [{"parts": [{"text": full_prompt}]}],
                            "generationConfig": {
                                "temperature": 0.2,
                                "maxOutputTokens": 1500,
                                "thinkingConfig": {"thinkingBudget": 0},
                            },
                        },
                    )
                except (httpx.TimeoutException, httpx.ConnectError) as e:
                    log.warning("Gemini network error attempt %d: %s", attempt + 1, e)
                    if attempt < 2:
                        await asyncio.sleep((2 ** attempt) * 2)
                        continue
                    return _safe_response(
                        "The AI assistant is temporarily unreachable. "
                        "Please try again in a moment."
                    )

                if resp.status_code == 429:
                    if attempt < 2:
                        await asyncio.sleep((2 ** attempt) * 2)
                        continue
                    return _safe_response(
                        "The AI assistant is busy right now. "
                        "Please try again in a few seconds."
                    )

                if resp.status_code != 200:
                    body = resp.text[:400] if resp.text else "(empty)"
                    # Defensively strip the API key if Gemini ever echoes it
                    if GEMINI_KEY and GEMINI_KEY in body:
                        body = body.replace(GEMINI_KEY, "[REDACTED]")
                    log.error("Gemini %d: %s", resp.status_code, body)
                    if resp.status_code == 429 and attempt < 2:
                        await asyncio.sleep((2 ** attempt) * 2)
                        continue
                    return _safe_response(
                        f"Gemini HTTP {resp.status_code}: {body}"
                    )

                break
            else:
                return _safe_response(
                    "The AI assistant could not be reached after multiple attempts."
                )
    except Exception as e:
        log.exception("Gemini transport error")
        return _safe_response(
            f"AI assistant transport error: {type(e).__name__}."
        )

    # ── 4. Parse response ────────────────────────────────────────────────────
    if resp is None:
        return _safe_response("AI assistant returned no response.")

    try:
        data = resp.json()
    except Exception as e:
        log.error("Gemini returned non-JSON: %s", e)
        return _safe_response("AI assistant returned an invalid response format.")

    try:
        candidates = data.get("candidates", [])
        if not candidates:
            block_reason = data.get("promptFeedback", {}).get("blockReason")
            if block_reason:
                log.warning("Gemini blocked: %s", block_reason)
                return _safe_response(
                    f"The AI assistant declined to answer ({block_reason}). "
                    "Please rephrase your question."
                )
            log.warning("Gemini returned no candidates: %s", str(data)[:300])
            return _safe_response(
                "The AI assistant returned an empty response. Please try rephrasing."
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return _safe_response(
                "The AI assistant returned an empty answer. Please try again."
            )

        answer = parts[0].get("text", "").strip()
        if not answer:
            return _safe_response(
                "The AI assistant returned no text. Please rephrase your question."
            )

        return _safe_response(answer, sources)
    except Exception as e:
        log.exception("Gemini response parse error")
        return _safe_response(
            f"Could not parse AI assistant response: {type(e).__name__}."
        )