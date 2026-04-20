import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 30000,
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

export const askGemini = (
  question: string,
  method: "scm" | "bsts" | "both" = "scm"
) =>
  api.post("/api/ask", { question, method }).then((r) => r.data);
