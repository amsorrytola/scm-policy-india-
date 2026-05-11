import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  // 60s timeout to absorb Render free-tier cold starts (~30–40s on first hit
  // after idle). Subsequent requests are sub-second.
  timeout: 60000,
});

export const getCaseMetadata = () =>
  api.get("/api/case/bihar").then((r) => r.data);

export const getSCMResult = () =>
  api.get("/api/case/bihar/scm").then((r) => r.data);

export const getBSTSResult = () =>
  api.get("/api/case/bihar/bsts").then((r) => r.data);

export const getSCMTaxResult = () =>
  api.get("/api/case/bihar/scm/tax").then((r) => r.data);

export const getBSTSTaxResult = () =>
  api.get("/api/case/bihar/bsts/tax").then((r) => r.data);

export const getSCMGrowthResult = () =>
  api.get("/api/case/bihar/scm/growth").then((r) => r.data);

export const getBSTSGrowthResult = () =>
  api.get("/api/case/bihar/bsts/growth").then((r) => r.data);

export default api;

export const getPanelData = () =>
  api.get("/api/case/bihar/data").then((r) => r.data);

export const refitSCM = (
  donorPool: string[],
  predictors: string[],
  outcome?: string
) =>
  api
    .post("/api/case/bihar/refit", {
      donor_pool: donorPool,
      predictors,
      outcome,
    })
    .then((r) => r.data);

// Ask the model.
//
// This hits the LOCAL Next.js Route Handler (web/app/api/ask/route.ts) — NOT
// the FastAPI backend. The Gemini key lives in Vercel env (server-side only),
// so the browser never sees it and there's no cross-origin hop.
export const askGemini = async (
  question: string,
  method: "scm" | "bsts" | "both" = "scm",
  outcome: "road_accidents" | "own_tax" | "growth" = "road_accidents"
): Promise<{ answer: string; sources_used: string[] }> => {
  try {
    const r = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, method, outcome }),
    });
    return await r.json();
  } catch (e) {
    return {
      answer: `The AI assistant is unreachable (${
        e instanceof Error ? e.message : "unknown error"
      }).`,
      sources_used: [],
    };
  }
};
