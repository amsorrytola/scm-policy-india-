/**
 * web/app/api/ask/route.ts — Next.js Route Handler
 *
 * Server-side proxy to Google's Gemini 2.5 Flash, grounded in per-outcome
 * context for the Bihar Prohibition SCM/BSTS analysis.
 *
 * Why this lives in the Next.js app instead of the FastAPI backend:
 *   - GEMINI_API_KEY stays in Vercel env (never shipped to the browser, never
 *     hops through Render), so deployment is one-key, one-host.
 *   - Eliminates a cross-origin call from the browser through Render to Google,
 *     which was failing on Render with opaque 400s.
 *
 * Request:  POST { question: string, method: "scm"|"bsts"|"both", outcome: string }
 * Response: 200 { answer: string, sources_used: string[] }
 *
 * Contract: never throws. Every failure returns 200 with a human-readable
 * fallback in `answer`, so the frontend can render it directly.
 *
 * The BASE_CONTEXT and OUTCOME_CONTEXTS are copied verbatim from
 * api/services/gemini_service.py — keep them in sync if the analysis numbers
 * change.
 */

import { NextRequest, NextResponse } from "next/server";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  "gemini-2.5-flash:generateContent";

// ── BASE_CONTEXT — verbatim from api/services/gemini_service.py ─────────────
const BASE_CONTEXT = `You are an expert econometric research assistant explaining
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
- Plain text only — no markdown`;

// ── OUTCOME_CONTEXTS — verbatim from api/services/gemini_service.py ─────────
const OUTCOME_CONTEXTS: Record<string, string> = {
  road_accidents: `
ACTIVE OUTCOME: Road Accident Deaths (MoRTH Annual Reports)

KEY FINDINGS:
- Pre-period RMSPE: 42.3 deaths (0.8% of Bihar's mean)
- RMSPE ratio: 22.87x (rank 2 of 14, permutation p approximately 0.071)
- SCM donor weights: Jharkhand 0.68, Odisha 0.16, Uttar Pradesh 0.16
- 2016: -899 deaths, 2017: -261 deaths, 2018: +1,198 deaths (reversal)
- Average post-treatment (SCM): +360 deaths/year
- Average post-treatment (BSTS, max_donors=3): +1,076 deaths/year
- BSTS donors: Haryana (r=0.818), Odisha (r=0.668), West Bengal (r=0.627)
- Interpretation: Initial reduction reversed by 2018 — illicit market development`,

  own_tax: `
ACTIVE OUTCOME: Own Tax Revenue, Rupees Crore (RBI Handbook T168)

KEY FINDINGS:
- PROXY for excise revenue — composite, not pure excise (excise was ~22-25% of own-tax pre-prohibition)
- SCM donors: Jharkhand 83.8%, UP 16.2%
- Average post effect (SCM): -Rs 2,017 Cr/year
- Average post effect (BSTS): -Rs 4,867 Cr/year
- BSTS donors: Jharkhand, West Bengal, Karnataka (all r > 0.99)
- Caveat: small gap is UNDERESTIMATE of true fiscal impact — non-excise taxes grew strongly post-2016`,

  growth: `
ACTIVE OUTCOME: NSDP Per-Capita Growth Rate, % YoY (RBI Handbook T19)

KEY FINDINGS:
- SCM weights: Odisha 0.66, Rajasthan 0.32, Jharkhand 0.03
- Average post effect (SCM): -2.99 pp/year
- Permutation p-value: ~0.43 (rank 6/14 — NOT statistically significant)
- BSTS uses 2017 cutoff and SINGLE donor (Odisha) to avoid overfit
- BSTS effect: -4.28 pp/year, 95% CI [-5.02, -3.58]
- Both methods directionally negative; NOT statistically significant — suggestive only`,
};

type AskResponse = { answer: string; sources_used: string[] };

const safe = (answer: string, sources_used: string[] = []): AskResponse => ({
  answer,
  sources_used,
});

export async function POST(req: NextRequest): Promise<NextResponse<AskResponse>> {
  // ── 1. Parse + validate body ─────────────────────────────────────────────
  let body: { question?: string; method?: string; outcome?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      safe("Invalid request body. Please send JSON with a 'question' field."),
    );
  }

  const question = (body.question ?? "").trim();
  const method = body.method ?? "scm";
  const outcomeKey =
    body.outcome && OUTCOME_CONTEXTS[body.outcome] ? body.outcome : "road_accidents";

  if (question.length < 3) {
    return NextResponse.json(
      safe("Please ask a question with at least 3 characters."),
    );
  }

  // ── 2. Validate API key ──────────────────────────────────────────────────
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json(
      safe(
        "Gemini API key not configured on the server. " +
          "The analysis results are still fully visible above. " +
          "(Admin: set GEMINI_API_KEY in Vercel project environment variables.)",
      ),
    );
  }

  // ── 3. Build prompt — text contexts only, no JSON file injection ─────────
  const prompt =
    `${BASE_CONTEXT}\n\n${OUTCOME_CONTEXTS[outcomeKey]}\n\n` +
    `(Method requested: ${method})\n\n` +
    `USER QUESTION: ${question}\n\nANSWER:`;

  // ── 4. Call Gemini with retries on 429/5xx ───────────────────────────────
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    let resp: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45_000);
      resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (2 ** attempt) * 2_000));
        continue;
      }
      return NextResponse.json(
        safe(`The AI assistant is temporarily unreachable (${msg}).`),
      );
    }

    // Retry transient failures
    if ((resp.status === 429 || resp.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, (2 ** attempt) * 2_000));
      continue;
    }

    if (resp.status !== 200) {
      let bodyText = "";
      try {
        bodyText = (await resp.text()).slice(0, 400);
      } catch {
        bodyText = "(no body)";
      }
      // Defensively redact the API key if Gemini ever echoes it
      const sanitized = bodyText.replaceAll(apiKey, "[REDACTED]");
      console.error(`Gemini ${resp.status}: ${sanitized}`);
      return NextResponse.json(
        safe(`AI assistant unavailable (HTTP ${resp.status}).`),
      );
    }

    // ── 5. Parse + extract answer ──────────────────────────────────────────
    let data: unknown;
    try {
      data = await resp.json();
    } catch (e) {
      console.error("Gemini returned non-JSON:", e);
      return NextResponse.json(
        safe("AI assistant returned an invalid response format."),
      );
    }

    try {
      const d = data as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
        promptFeedback?: { blockReason?: string };
      };
      const candidates = d.candidates ?? [];
      if (candidates.length === 0) {
        const blockReason = d.promptFeedback?.blockReason;
        return NextResponse.json(
          safe(
            blockReason
              ? `The AI assistant declined to answer (${blockReason}). Please rephrase your question.`
              : "The AI assistant returned an empty response. Please try rephrasing.",
          ),
        );
      }
      const parts = candidates[0]?.content?.parts ?? [];
      const text = (parts[0]?.text ?? "").trim();
      if (!text) {
        return NextResponse.json(
          safe("The AI assistant returned no text. Please rephrase your question."),
        );
      }
      return NextResponse.json(safe(text, [`context: ${outcomeKey}`]));
    } catch (e) {
      console.error("Gemini response parse error:", e);
      return NextResponse.json(
        safe("AI assistant returned an unexpected response shape."),
      );
    }
  }

  return NextResponse.json(
    safe("The AI assistant could not be reached after multiple attempts."),
  );
}
