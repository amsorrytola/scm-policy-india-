"""
api/services/gemini_service.py
Dynamic Gemini context — switches per active outcome tab.
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
- Mention limitations when asked: short pre-period, interpolated Census data,
  BSTS overfit caveat, own-tax-revenue attenuation for excise
- Plain text only — no markdown"""

OUTCOME_CONTEXTS = {
    "road_accidents": """
ACTIVE OUTCOME: Road Accident Deaths (MoRTH Annual Reports)

KEY FINDINGS:
- Pre-period RMSPE: 42.3 deaths (0.8% of Bihar's mean — excellent fit)
- RMSPE ratio: 22.87x (rank 2 of 14, permutation p approximately 0.071)
- SCM donor weights: Jharkhand 0.68, Odisha 0.16, Uttar Pradesh 0.16
- 2016: -899 deaths (prohibition prevented ~900 deaths in year 1)
- 2017: -261 deaths (effect persisting but weakening)
- 2018: +1,198 deaths (reversal — Bihar now above synthetic)
- 2019-2022: +1,061 to +3,293 deaths (Bihar increasingly above synthetic)
- Average post-treatment (SCM): +360 deaths/year
- Average post-treatment (BSTS, max_donors=3): +1,076 deaths/year
- BSTS donors: Haryana (r=0.818), Odisha (r=0.668), West Bengal (r=0.627)
- Interpretation: Prohibition initially reduced road fatalities but the effect
  reversed sharply by 2018 — consistent with illicit alcohol market development
  and cross-border smuggling eroding the ban's effectiveness
- Literature: Chaudhuri & Jha (2024 EDCC) find similar fading pattern""",

    "own_tax": """
ACTIVE OUTCOME: Own Tax Revenue, Rupees Crore (RBI Handbook T168)

KEY FINDINGS:
- This is a PROXY for excise revenue — total own-tax composite, not pure excise
- Excise was ~22-25% of Bihar's own-tax pre-prohibition
- Bihar's excise collapsed from ~Rs 4,000 Cr (2015-16) to ~Rs 500 Cr (2017-18)
  but this is buried in the composite
- Pre-period RMSPE (SCM): Rs 1,091 Cr (good fit)
- RMSPE ratio (SCM): 3.16x
- SCM donors: Jharkhand 83.8%, UP 16.2%
- Average post effect (SCM): -Rs 2,017 Cr/year (Bihar below synthetic)
- Average post effect (BSTS): -Rs 4,867 Cr/year
- BSTS donors: Jharkhand (r=0.992), West Bengal (r=0.992), Karnataka (r=0.989)
- Interpretation: Bihar's composite own-tax is lower than counterfactual
  but the effect is ATTENUATED — non-excise taxes (VAT to GST compensation,
  stamps, vehicle tax) grew strongly post-2016, partially masking excise loss
- Caveat: interpret small gap as underestimate of true fiscal impact,
  NOT as evidence of no fiscal impact""",

    "growth": """
ACTIVE OUTCOME: NSDP Per-Capita Growth Rate, % YoY (RBI Handbook T19)

KEY FINDINGS:
- Growth rate computed as year-on-year pct_change of NSDP per capita at
  current prices. Series available from 2013 onwards (NSDP starts FY2012-13).
- Bihar's pre-prohibition growth: volatile, ~6-13% nominal YoY (rapid
  convergence from low base, standard in low-income Indian states)
- SCM donor weights: Odisha 0.66, Rajasthan 0.32, Jharkhand 0.03
  (different from road-accident weights — growth matching favors Odisha/Rajasthan)
- Pre-period RMSPE: 0.07 pp (excellent fit on growth rates, n_pre=3)
- RMSPE ratio: 83.86x (very large ratio)
- Average post-treatment effect (SCM): -2.99 pp/year
  (Bihar grew ~3 pp/year slower than synthetic counterfactual)
- Permutation p-value: ~0.43 (rank 6/14 — NOT statistically significant)
- BSTS uses a SHIFTED treatment cutoff (2017-01-01 instead of 2016-01-01)
  because pycausalimpact requires a 4-point pre-period span; calendar 2016
  contained only ~8 months of prohibition, so it is folded into pre-period.
- BSTS uses a SINGLE donor (Odisha, r=+0.98) — multi-donor BSTS overfits
  catastrophically with only 4 pre-period points (predictions blow up to
  -170% growth). Single-donor fit is barely identifiable.
- BSTS average post effect (2017-2022): -4.28 pp/year
- BSTS 95% CI: [-5.02, -3.58], p=0.0 (but tight CI reflects model constraint,
  not true uncertainty — read as directional corroboration of SCM only)
- Year-by-year BSTS effect: 2017 -3.87, 2018 -3.30, 2019 -1.20, 2020 +0.28
  (COVID parity), 2021 -8.01, 2022 -9.58
- Economic interpretation: Two competing channels —
  POSITIVE: household income freed from alcohol, reduced absenteeism
  NEGATIVE: excise revenue loss, hospitality/retail sector contraction,
  cross-border leakage of consumption
  Both methods point to negative direction (~-3 to -4 pp), consistent with
  sector contraction outweighing positive channels
- BUT the SCM result is not statistically significant (p=0.43) and the BSTS
  result depends on a single-donor specification. Report as: directionally
  consistent with growth cost, but evidence too weak to draw firm conclusions""",
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


async def ask_gemini(question: str, method: str = "scm",
                     outcome: str = "road_accidents") -> dict:
    if not GEMINI_KEY:
        return {
            "answer": (
                "Gemini API key not configured. "
                "Add GEMINI_API_KEY to api/.env to enable this feature."
            ),
            "sources_used": [],
        }

    outcome_key = outcome if outcome in OUTCOME_CONTEXTS else "road_accidents"

    file_list = OUTCOME_FILES.get(outcome_key, OUTCOME_FILES["road_accidents"])
    indices = METHOD_FILES.get(method, [0])
    files_to_load = [file_list[i] for i in indices if i < len(file_list)]

    sources = []
    contexts = []
    for fname in files_to_load:
        path = RESULTS_DIR / fname
        if path.exists():
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

    full_prompt = (
        BASE_CONTEXT
        + "\n\n"
        + OUTCOME_CONTEXTS[outcome_key]
        + "\n\nRESULTS JSON DATA (use for precise numbers):\n"
        + "\n\n".join(contexts)
        + f"\n\nUSER QUESTION: {question}\n\nANSWER:"
    )

    resp = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(3):
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_KEY}",
                json={
                    "contents": [{"parts": [{"text": full_prompt}]}],
                    "generationConfig": {
                        "temperature"    : 0.2,
                        "maxOutputTokens": 700,
                    },
                },
            )
            if resp.status_code == 429:
                if attempt < 2:
                    await asyncio.sleep((2 ** attempt) * 2)
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
        answer = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, AttributeError):
        answer = "The AI assistant returned an unexpected response."

    return {"answer": answer, "sources_used": sources}
