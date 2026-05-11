"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore, type SCMResult, type BSTSResult } from "@/lib/store";
import {
  getCaseMetadata,
  getSCMResult,
  getBSTSResult,
  getSCMTaxResult,
  getBSTSTaxResult,
  getSCMGrowthResult,
  refitSCM,
  askGemini,
} from "@/lib/api";
import { startTour } from "@/lib/tour";
import { ResultsTable } from "@/components/ResultsTable";
import { PredictorBalance } from "@/components/PredictorBalance";
import { Downloads } from "@/components/Downloads";

const NAVY = "#0F4C81";
const AMBER = "#F4A261";
const GRAY = "#9CA3AF";
const LIGHT_GRAY = "#D1D5DB";
const TREATMENT_YEAR = 2016;

// ── Y-axis formatters ─────────────────────────────────────────────────────────
function fmtAxis(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toString();
}

function fmtAxisSigned(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  const sign = v >= 0 ? "+" : "−";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${abs}`;
}

// Growth outcome formatters — values are percentage points
function fmtAxisPct(v: number): string {
  if (v === 0) return "0%";
  return `${v.toFixed(1)}%`;
}

function fmtAxisSignedPct(v: number): string {
  if (v === 0) return "0";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}pp`;
}

function fmtNum(n: number | null | undefined, sign = false): string {
  if (n == null || isNaN(n)) return "—";
  const s = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (sign && n > 0 ? "+" : n < 0 ? "−" : "") + s;
}

// Compute Y-axis domain from non-null values across one or more keys.
// Critical for BSTS: the 2010 row may have null bands after outlier
// clipping, and Recharts' default auto-scale would still respect any
// other null/NaN. Explicit domain stops the chart from collapsing.
function computeDomain<T extends Record<string, unknown>>(
  data: readonly T[],
  keys: ReadonlyArray<keyof T>,
  pad = 0.15,
): [number | "auto", number | "auto"] {
  const vals: number[] = [];
  for (const row of data) {
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "number" && Number.isFinite(v)) vals.push(v);
    }
  }
  if (vals.length === 0) return ["auto", "auto"];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const rng = hi - lo;
  return [Math.floor(lo - rng * pad), Math.ceil(hi + rng * pad)];
}

// ── Tooltip formatter (shared) ────────────────────────────────────────────────
// Recharts may pass a single value or a [low, high] tuple (for bands)
type ChartValue = number | string | null | undefined | readonly (string | number)[];

const tooltipFmt = (v: ChartValue) => {
  if (typeof v === "number") {
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "number" ? x.toFixed(0) : String(x))).join(" – ");
  }
  return String(v ?? "");
};

const tooltipFmtSigned = (v: ChartValue) => {
  if (typeof v === "number") {
    return (v >= 0 ? "+" : "") +
      v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "number" ? (x >= 0 ? "+" : "") + x.toFixed(0) : String(x))).join(" – ");
  }
  return String(v ?? "");
};

// ── Build BSTS by-year lookup (BSTS has 2010-2022, SCM has 2012-2022) ────────
function buildBSTSByYear(bsts: BSTSResult | null): Record<
  number,
  {
    bsts_mean: number | null;
    bsts_lower: number | null;
    bsts_upper: number | null;
    bsts_effect: number | null;
  }
> {
  const map: Record<
    number,
    {
      bsts_mean: number | null;
      bsts_lower: number | null;
      bsts_upper: number | null;
      bsts_effect: number | null;
    }
  > = {};
  if (!bsts) return map;
  bsts.dates.forEach((d, i) => {
    const yr = new Date(d).getFullYear();
    map[yr] = {
      bsts_mean: bsts.predicted_mean?.[i] ?? null,
      bsts_lower: bsts.predicted_lower?.[i] ?? null,
      bsts_upper: bsts.predicted_upper?.[i] ?? null,
      bsts_effect: bsts.point_effect?.[i] ?? null,
    };
  });
  return map;
}

export default function AnalysisPage() {
  const {
    scmResult,
    scmTaxResult,
    scmGrowthResult,
    bstsResult,
    bstsTaxResult,
    caseMetadata,
    activeOutcome,
    activeMethod,
    showPlacebos,
    selectedDonors,
    selectedPredictors,
    isRefitting,
    chatHistory,
    setSCMResult,
    setSCMTaxResult,
    setSCMGrowthResult,
    setBSTSResult,
    setBSTSTaxResult,
    setCaseMetadata,
    setActiveOutcome,
    setActiveMethod,
    setShowPlacebos,
    setSelectedDonors,
    setIsRefitting,
    addMessage,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMethod, setChatMethod] = useState<"scm" | "bsts" | "both">("scm");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [typedBuffer, setTypedBuffer] = useState("");

  // Initial load — fetch all 4 result sets in parallel so outcome switching
  // is instant (no extra round-trip when user toggles Road Accidents ↔ Tax)
  useEffect(() => {
    let mounted = true;
    Promise.all([
      getCaseMetadata(),
      getSCMResult(),
      getBSTSResult(),
      getSCMTaxResult().catch(() => null),
      getBSTSTaxResult().catch(() => null),
      getSCMGrowthResult().catch(() => null),
    ])
      .then(([meta, scm, bsts, scmTax, bstsTax, scmGrowth]) => {
        if (!mounted) return;
        setCaseMetadata(meta);
        setSCMResult(scm);
        setBSTSResult(bsts);
        if (scmTax) setSCMTaxResult(scmTax);
        if (bstsTax) setBSTSTaxResult(bstsTax);
        if (scmGrowth) setSCMGrowthResult(scmGrowth);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        toast.error(
          "Failed to load data. Is the API running on port 8000?"
        );
        console.error(err);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start tour on first visit (delay until after data loads)
  useEffect(() => {
    if (loading) return;
    let done = false;
    try {
      done = !!localStorage.getItem("bihar-scm-tour-done");
    } catch {}
    if (done) return;
    const t = setTimeout(() => {
      try {
        startTour();
      } catch (e) {
        console.warn("Tour failed to start:", e);
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [loading]);

  // Keyboard shortcuts + easter egg
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "r") {
        handleRefit();
      } else if (e.key === "p") {
        setShowPlacebos(!showPlacebos);
      } else if (e.key === "/") {
        e.preventDefault();
        chatInputRef.current?.focus();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const next = (typedBuffer + e.key.toLowerCase()).slice(-12);
        setTypedBuffer(next);
        if (next.includes("professor")) {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: [NAVY, AMBER, "#FAFAF7"],
          });
          setTypedBuffer("");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPlacebos, typedBuffer, selectedDonors, selectedPredictors]);

  // Active SCM/BSTS by outcome tab
  const currentSCM: SCMResult | null =
    activeOutcome === "tax"
      ? scmTaxResult
      : activeOutcome === "growth"
      ? scmGrowthResult
      : scmResult;
  // Growth has no BSTS counterpart — fall back to null so charts hide BSTS layers
  const currentBSTS: BSTSResult | null =
    activeOutcome === "tax"
      ? bstsTaxResult
      : activeOutcome === "growth"
      ? null
      : bstsResult;

  // BSTS lookup by year (handles SCM 2012-2022 vs BSTS 2010-2022 mismatch)
  const bstsByYear = useMemo(
    () => buildBSTSByYear(currentBSTS),
    [currentBSTS]
  );

  // Main chart data — joined by year
  const chartData = useMemo(() => {
    if (!currentSCM) return [];
    return currentSCM.dates
      .map((d, i) => {
        const yr = new Date(d).getFullYear();
        const bsts = bstsByYear[yr];
        const treated = currentSCM.treated_outcome[i];
        const synthetic = currentSCM.synthetic_outcome[i];
        return {
          year: yr,
          treated,
          synthetic: synthetic ?? null,
          gap: currentSCM.gap[i] ?? null,
          bsts_mean: bsts?.bsts_mean ?? null,
          bsts_lower: bsts?.bsts_lower ?? null,
          bsts_upper: bsts?.bsts_upper ?? null,
          bsts_effect: bsts?.bsts_effect ?? null,
          bsts_band:
            bsts?.bsts_lower != null && bsts?.bsts_upper != null
              ? [bsts.bsts_lower, bsts.bsts_upper]
              : undefined,
        };
      })
      .filter((d) => d.treated != null && d.synthetic != null);
  }, [currentSCM, bstsByYear]);

  // Placebo data — for spaghetti chart, one entry per donor
  const placeboLines = useMemo(() => {
    if (!currentSCM?.placebo_gaps) return [];
    return Object.entries(currentSCM.placebo_gaps).map(([donor, gaps]) => ({
      donor,
      points: currentSCM.dates.map((d, i) => ({
        year: new Date(d).getFullYear(),
        gap: gaps[i] ?? null,
      })),
    }));
  }, [currentSCM]);

  // Placebo RMSPE ratios sorted (for the table beneath)
  const placeboRatios = useMemo(() => {
    if (!currentSCM?.placebo_rmspe_ratios) return [];
    const items: { unit: string; ratio: number | null; isBihar: boolean }[] = [
      {
        unit: caseMetadata?.treated_unit ?? "Bihar",
        ratio: currentSCM.diagnostics.rmspe_ratio,
        isBihar: true,
      },
      ...Object.entries(currentSCM.placebo_rmspe_ratios).map(([u, r]) => ({
        unit: u,
        ratio: r,
        isBihar: false,
      })),
    ];
    return items
      .filter((x) => x.ratio != null)
      .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
  }, [currentSCM, caseMetadata]);

  // Donor weights — full list (ALL 13, even small ones)
  const weightsData = useMemo(() => {
    if (!currentSCM || !caseMetadata) return [];
    return caseMetadata.all_donors
      .map((donor) => ({
        donor,
        weight: (currentSCM.weights[donor] ?? 0) * 100,
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [currentSCM, caseMetadata]);

  // SCM vs BSTS comparison data — uses the active-outcome SCM
  const comparisonData = useMemo(() => {
    if (!currentSCM) return [];
    return currentSCM.dates
      .map((d, i) => {
        const yr = new Date(d).getFullYear();
        const bsts = bstsByYear[yr];
        return {
          year: yr,
          scm_gap: currentSCM.gap[i] ?? null,
          bsts_effect: bsts?.bsts_effect ?? null,
          bsts_band:
            bsts?.bsts_lower != null && bsts?.bsts_upper != null
              ? [
                  // Recharts Area expects [low, high] band relative to actual values;
                  // for effect plot we want [effect_lower, effect_upper] but we don't
                  // store those separately — use predicted bounds shifted by effect.
                  // Simpler: use the predicted band itself; user-side viewer can read
                  // the mean for direction.
                  bsts.bsts_lower - (bsts.bsts_mean ?? 0),
                  bsts.bsts_upper - (bsts.bsts_mean ?? 0),
                ]
              : undefined,
        };
      })
      .filter((d) => d.scm_gap != null);
  }, [currentSCM, bstsByYear]);

  // Donor toggle
  const toggleDonor = (d: string) => {
    if (selectedDonors.includes(d)) {
      setSelectedDonors(selectedDonors.filter((x) => x !== d));
    } else {
      setSelectedDonors([...selectedDonors, d]);
    }
  };

  const handleRefit = async () => {
    if (!caseMetadata || selectedDonors.length < 2) {
      toast.error("Need at least 2 donors");
      return;
    }
    setIsRefitting(true);
    try {
      const outcomeKey =
        activeOutcome === "tax"
          ? caseMetadata.secondary_outcome
          : activeOutcome === "growth"
          ? "nsdp_growth_yoy"
          : caseMetadata.primary_outcome;
      const newResult = await refitSCM(
        selectedDonors,
        selectedPredictors,
        outcomeKey
      );
      if (activeOutcome === "tax") setSCMTaxResult(newResult);
      else if (activeOutcome === "growth") setSCMGrowthResult(newResult);
      else setSCMResult(newResult);
      toast.success(
        `Refit complete. RMSPE ratio: ${newResult.diagnostics.rmspe_ratio.toFixed(2)}×`
      );
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === "object" &&
        "response" in e &&
        e.response &&
        typeof e.response === "object" &&
        "data" in e.response
          ? JSON.stringify(
              (e.response as { data: unknown }).data
            )
          : (e as Error).message;
      toast.error("Refit failed: " + msg);
    } finally {
      setIsRefitting(false);
    }
  };

  const handleAsk = async (q?: string) => {
    const question = (q ?? chatInput).trim();
    if (question.length < 3) return;
    addMessage({ role: "user", content: question });
    setChatInput("");
    setChatLoading(true);
    try {
      const outcomeKey =
        activeOutcome === "tax"
          ? "own_tax"
          : activeOutcome === "growth"
          ? "growth"
          : "road_accidents";
      const resp = await askGemini(question, chatMethod, outcomeKey);
      addMessage({
        role: "assistant",
        content: resp.answer,
        sources: resp.sources_used,
      });
    } catch (e: unknown) {
      addMessage({
        role: "assistant",
        content: "Error talking to the assistant. " + (e as Error).message,
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (loading || !caseMetadata) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Skeleton className="mb-6 h-12 w-1/2" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Skeleton className="h-96 lg:col-span-3" />
          <Skeleton className="h-96 lg:col-span-6" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div
          id="tour-header"
          className="mb-6 flex flex-wrap items-baseline justify-between gap-3"
        >
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-serif text-3xl font-bold text-navy md:text-4xl">
              {caseMetadata.title}
            </h1>
            <Badge variant="outline" className="border-amber text-amber">
              Treatment: 5 April 2016
            </Badge>
          </div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("bihar-scm-tour-done");
              } catch {}
              startTour();
            }}
            className="rounded-md border border-navy px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            ▶ Take Tour
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT — controls */}
          <aside className="lg:col-span-3 lg:sticky lg:top-20 lg:self-start">
            <Card id="tour-donor-pool" className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Donor Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {caseMetadata.all_donors.map((d) => {
                    const sel = selectedDonors.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDonor(d)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                          sel
                            ? "border-navy bg-navy text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-navy"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {selectedDonors.length} of {caseMetadata.all_donors.length}{" "}
                    selected
                  </span>
                  <button
                    className="text-navy hover:underline"
                    onClick={() =>
                      setSelectedDonors(caseMetadata.default_donors)
                    }
                  >
                    Reset
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Outcome</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => setActiveOutcome("primary")}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                    activeOutcome === "primary"
                      ? "border-navy bg-navy text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  Road accident deaths
                </button>
                <button
                  onClick={() => setActiveOutcome("tax")}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                    activeOutcome === "tax"
                      ? "border-navy bg-navy text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  Own tax revenue
                </button>
                <button
                  onClick={() => setActiveOutcome("growth")}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs ${
                    activeOutcome === "growth"
                      ? "border-navy bg-navy text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  Economic growth (NSDP %)
                </button>
                {activeOutcome === "tax" && (
                  <p className="mt-2 text-xs text-gray-500">
                    Attenuated proxy — see methodology.
                  </p>
                )}
                {activeOutcome === "growth" && (
                  <p className="mt-2 text-xs text-gray-500">
                    Per-capita NSDP YoY growth (%). 3 pre-treatment obs;
                    rank 6/14, p≈0.43 — interpret cautiously.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1">
                  {(["scm", "bsts", "both"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setActiveMethod(m)}
                      className={`rounded-md border py-1.5 text-xs uppercase ${
                        activeMethod === m
                          ? "border-navy bg-navy text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-700">
                      Show placebo gaps
                    </span>
                    <UITooltip>
                      <TooltipTrigger className="cursor-help text-gray-400">
                        ⓘ
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Refit SCM with each donor as the &quot;treated&quot;
                        unit. Bihar&apos;s gap should stand out from the
                        placebo gaps.
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <Switch
                    checked={showPlacebos}
                    onCheckedChange={setShowPlacebos}
                    disabled={activeMethod === "bsts"}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              id="tour-refit"
              onClick={handleRefit}
              disabled={isRefitting || selectedDonors.length < 2}
              className="w-full bg-navy text-white hover:bg-navy-dark"
            >
              {isRefitting ? "Refitting…" : "Refit Model"}
            </Button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Refit runs SCM live with selected donors. Press{" "}
              <kbd className="rounded border bg-white px-1">r</kbd>.
            </p>
          </aside>

          {/* CENTER — charts */}
          <section className="lg:col-span-6">
            <Card id="tour-main-chart">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg">
                  Bihar vs Synthetic Counterfactual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" stroke="#6b7280" fontSize={11} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickFormatter={
                        activeOutcome === "growth" ? fmtAxisPct : fmtAxis
                      }
                      domain={computeDomain(chartData, [
                        "treated",
                        "synthetic",
                        "bsts_mean",
                      ])}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={tooltipFmt}
                    />
                    <ReferenceLine
                      x={TREATMENT_YEAR}
                      stroke="#DC2626"
                      strokeDasharray="3 3"
                      label={{
                        value: "Prohibition",
                        position: "top",
                        fontSize: 10,
                        fill: "#DC2626",
                      }}
                    />

                    {(activeMethod === "both" ||
                      activeMethod === "bsts") &&
                      currentBSTS && (
                        <Area
                          dataKey="bsts_band"
                          fill={AMBER}
                          fillOpacity={0.15}
                          stroke="none"
                          isAnimationActive={false}
                          name="BSTS 95% credible band"
                          connectNulls={false}
                        />
                      )}
                    {(activeMethod === "both" ||
                      activeMethod === "bsts") &&
                      currentBSTS && (
                        <Line
                          type="monotone"
                          dataKey="bsts_mean"
                          stroke={GRAY}
                          strokeDasharray="2 2"
                          dot={false}
                          strokeWidth={2}
                          name="BSTS posterior mean"
                          isAnimationActive={false}
                          connectNulls={false}
                        />
                      )}

                    {(activeMethod === "scm" ||
                      activeMethod === "both") && (
                      <Line
                        type="monotone"
                        dataKey="synthetic"
                        stroke={AMBER}
                        strokeDasharray="5 5"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        name="Synthetic Bihar"
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="treated"
                      stroke={NAVY}
                      strokeWidth={2.5}
                      dot={{ r: 3.5 }}
                      name="Bihar (actual)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card id="tour-gap-chart" className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="font-serif text-lg">
                  Treatment Effect (Gap)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" stroke="#6b7280" fontSize={11} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickFormatter={
                        activeOutcome === "growth"
                          ? fmtAxisSignedPct
                          : fmtAxisSigned
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={tooltipFmtSigned}
                    />
                    <ReferenceLine y={0} stroke="#374151" />
                    <ReferenceLine
                      x={TREATMENT_YEAR}
                      stroke="#DC2626"
                      strokeDasharray="3 3"
                    />

                    {activeOutcome === "growth" ? (
                      <Bar
                        dataKey="gap"
                        name="Gap (actual − synthetic, pp)"
                      >
                        {chartData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={(d.gap ?? 0) >= 0 ? "#16a34a" : "#dc2626"}
                          />
                        ))}
                      </Bar>
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="gap"
                        stroke={NAVY}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        name="Gap (actual − synthetic)"
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Outcome tabs */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <Tabs
                  value={activeOutcome}
                  onValueChange={(v) =>
                    setActiveOutcome(v as "primary" | "tax" | "growth")
                  }
                >
                  <TabsList>
                    <TabsTrigger value="primary">Road Accidents</TabsTrigger>
                    <TabsTrigger value="tax">Own Tax Revenue</TabsTrigger>
                    <TabsTrigger value="growth">Economic Growth</TabsTrigger>
                  </TabsList>
                  <TabsContent value="primary">
                    <p className="mt-3 text-xs text-gray-600">
                      Primary outcome. State-wise persons killed in road
                      accidents (MoRTH).
                    </p>
                  </TabsContent>
                  <TabsContent value="tax">
                    <p className="mt-3 text-xs text-gray-600">
                      Secondary outcome. Total Own Tax Revenue from RBI
                      Handbook T168 — proxy for the missing pure-excise
                      series. Treatment effect is attenuated because non-excise
                      taxes (GST/VAT, stamps, vehicle tax) grew strongly
                      post-2016 and offset Bihar&apos;s ~₹3,000 Cr/yr excise
                      loss.
                    </p>
                  </TabsContent>
                  <TabsContent value="growth">
                    <p className="mt-3 text-xs text-gray-600">
                      Per-capita NSDP YoY growth (RBI T19, %). Captures both
                      sides of prohibition: lost excise revenue / hospitality
                      vs. household reallocation. Bihar grew ~3 pp/yr slower
                      than synthetic, but rank 6/14 (p≈0.43) — not statistically
                      significant; treat as suggestive only.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          {/* RIGHT — results */}
          <aside className="lg:col-span-3">
            {currentSCM && (
              <>
                <Card id="tour-headline" className="mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Headline Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-serif text-3xl font-bold text-navy">
                      {activeOutcome === "growth"
                        ? `${currentSCM.diagnostics.avg_post_effect > 0 ? "+" : ""}${currentSCM.diagnostics.avg_post_effect.toFixed(2)}`
                        : fmtNum(
                            currentSCM.diagnostics.avg_post_effect,
                            true
                          )}{" "}
                      <span className="text-base font-normal text-gray-500">
                        {activeOutcome === "tax"
                          ? "₹ Cr/yr"
                          : activeOutcome === "growth"
                          ? "pp/yr"
                          : "deaths/yr"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {currentSCM.diagnostics.avg_post_effect > 0
                        ? "↑ Bihar above synthetic"
                        : "↓ Bihar below synthetic"}{" "}
                      (avg post-treatment)
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">RMSPE ratio</span>
                        <span className="font-mono">
                          {currentSCM.diagnostics.rmspe_ratio.toFixed(2)}×
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pre-RMSPE</span>
                        <span className="font-mono">
                          {currentSCM.diagnostics.pre_rmspe.toFixed(1)}
                        </span>
                      </div>
                      {activeOutcome === "primary" && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Permutation p
                          </span>
                          <span className="font-mono">≈ 0.071</span>
                        </div>
                      )}
                      {activeOutcome === "growth" && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">
                            Permutation p
                          </span>
                          <span className="font-mono">≈ 0.429</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {activeOutcome === "primary" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Key Findings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc space-y-2 pl-5 text-xs text-gray-700">
                        <li>
                          2016–2017: ~600–900 fewer deaths than counterfactual.
                        </li>
                        <li>
                          2019–2022: effect reversed; Bihar above synthetic.
                        </li>
                        <li>
                          Consistent with illicit alcohol market development
                          (Chaudhuri &amp; Jha 2024 EDCC).
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </aside>
        </div>

        {/* ─── RESULTS TABLE + PREDICTOR BALANCE ─────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardContent className="pt-6">
              <ResultsTable />
            </CardContent>
          </Card>
          <Card className="lg:col-span-5">
            <CardContent className="pt-6">
              <PredictorBalance />
            </CardContent>
          </Card>
        </div>

        {/* ─── PLACEBO SPAGHETTI ─────────────────────────────────────────────── */}
        {currentSCM?.placebo_gaps && (
          <Card id="tour-placebo" className="mt-8">
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                In-Space Placebo Test
              </CardTitle>
              <p className="text-sm text-gray-600">
                Each gray line shows the gap for a donor state treated as if
                it were the &quot;treated&quot; unit. Bihar&apos;s navy line
                should stand out. RMSPE ratio ranks Bihar 2nd of 14 units
                (permutation p ≈ 0.071).
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    allowDuplicatedCategory={false}
                    stroke="#6b7280"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={
                      activeOutcome === "growth"
                        ? fmtAxisSignedPct
                        : fmtAxisSigned
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={tooltipFmtSigned}
                  />
                  <ReferenceLine y={0} stroke="#374151" />
                  <ReferenceLine
                    x={TREATMENT_YEAR}
                    stroke="#DC2626"
                    strokeDasharray="3 3"
                  />

                  {placeboLines.map((p) => (
                    <Line
                      key={p.donor}
                      data={p.points}
                      dataKey="gap"
                      type="monotone"
                      stroke={LIGHT_GRAY}
                      strokeWidth={0.8}
                      dot={false}
                      isAnimationActive={false}
                      name={p.donor}
                      legendType="none"
                    />
                  ))}

                  <Line
                    data={chartData}
                    dataKey="gap"
                    type="monotone"
                    stroke={NAVY}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                    name="Bihar"
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* RMSPE ratio table */}
              {placeboRatios.length > 0 && (
                <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Unit</th>
                        <th className="px-3 py-2 font-semibold">
                          RMSPE Ratio
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {placeboRatios.map((r) => (
                        <tr
                          key={r.unit}
                          className={`border-t ${
                            r.isBihar ? "bg-amber/10 font-semibold" : ""
                          }`}
                        >
                          <td className="px-3 py-1.5">
                            {r.unit}
                            {r.isBihar && (
                              <span className="ml-2 text-amber">
                                ← treated
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-mono">
                            {r.ratio?.toFixed(2)}×
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── DONOR WEIGHTS — full bar chart ──────────────────────────────── */}
        <Card id="tour-weights" className="mt-8">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              Donor Weights (all 13 donors)
            </CardTitle>
            <p className="text-sm text-gray-600">
              Weights sum to 1.0. Donors with weight &lt; 1% appear as thin
              bars.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, weightsData.length * 28)}
            >
              <BarChart
                data={weightsData}
                layout="vertical"
                margin={{ left: 105, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.toFixed(0) + "%"}
                />
                <YAxis
                  type="category"
                  dataKey="donor"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  formatter={(v) =>
                    typeof v === "number"
                      ? v.toFixed(2) + "%"
                      : String(v ?? "")
                  }
                  contentStyle={{ fontSize: "11px" }}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {weightsData.map((d, i) => (
                    <Cell
                      key={d.donor}
                      fill={
                        i === 0
                          ? AMBER
                          : i === 1
                            ? "#EBB079"
                            : i === 2
                              ? "#D9C29D"
                              : LIGHT_GRAY
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ─── SCM vs BSTS COMPARISON ──────────────────────────────────────── */}
        {currentBSTS && currentSCM && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                Method Comparison: SCM vs BSTS
              </CardTitle>
              <p className="text-sm text-gray-600">
                Both methods agree on direction but differ in magnitude.
                BSTS credible intervals are wide due to only 6 pre-treatment
                observations.
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" stroke="#6b7280" fontSize={11} />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={11}
                    tickFormatter={fmtAxisSigned}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={tooltipFmtSigned}
                  />
                  <ReferenceLine y={0} stroke="#374151" />
                  <ReferenceLine
                    x={TREATMENT_YEAR}
                    stroke="#DC2626"
                    strokeDasharray="3 3"
                  />

                  <Area
                    dataKey="bsts_band"
                    fill={AMBER}
                    fillOpacity={0.15}
                    stroke="none"
                    isAnimationActive={false}
                    name="BSTS 95% CI (effect)"
                  />
                  <Line
                    type="monotone"
                    dataKey="bsts_effect"
                    stroke={AMBER}
                    strokeDasharray="5 5"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name="BSTS point effect"
                  />
                  <Line
                    type="monotone"
                    dataKey="scm_gap"
                    stroke={NAVY}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name="SCM gap"
                  />
                </ComposedChart>
              </ResponsiveContainer>

              <div className="mt-4 rounded-lg border-l-4 border-amber bg-cream p-4 text-sm text-gray-700">
                <strong className="text-navy">⚠️ Caveat.</strong> BSTS
                credible intervals are artificially narrow here (±2–3 deaths)
                because n_pre = 6 pre-treatment observations &lt;
                n_covariates = 13 donors. The SCM permutation p-value
                (~0.071) is the more reliable inference statistic.
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── ASK ─────────────────────────────────────────────────────────── */}
        <section id="tour-ask" className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                Ask the Model
              </CardTitle>
              <p className="text-sm text-gray-600">
                Questions about this analysis, grounded in the SCM and BSTS
                results.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex flex-wrap gap-2">
                {(activeOutcome === "tax"
                  ? [
                      "Why is the tax revenue effect attenuated?",
                      "What was Bihar's actual excise revenue loss?",
                      "Why do Jharkhand and UP dominate the weights here?",
                      "How does GST compensation affect this estimate?",
                    ]
                  : activeOutcome === "growth"
                  ? [
                      "Why is the growth effect not statistically significant?",
                      "What are the two competing economic channels?",
                      "Why do Odisha and Rajasthan dominate the growth SCM weights?",
                      "How does the RMSPE ratio of 83x relate to the p-value of 0.43?",
                    ]
                  : [
                      "Why does Jharkhand get 68% weight?",
                      "What happened in 2018 when the effect reversed?",
                      "How reliable is the permutation p-value of 0.071?",
                      "What does the RMSPE ratio of 22.87x mean?",
                    ]
                ).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAsk(q)}
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:border-navy hover:text-navy"
                    disabled={chatLoading}
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="mb-3 max-h-80 space-y-3 overflow-y-auto">
                {chatHistory.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-navy text-white"
                          : "bg-cream border border-gray-200 text-gray-800"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-1.5 text-[10px] text-gray-500">
                          Sources: {m.sources.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-cream border border-gray-200 px-4 py-2 text-sm">
                      <span className="inline-flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-navy [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-navy [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-navy [animation-delay:300ms]" />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAsk();
                  }}
                  placeholder="Ask about the analysis... ( / to focus )"
                  className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none"
                />
                <Button
                  onClick={() => handleAsk()}
                  disabled={chatLoading || chatInput.trim().length < 3}
                  className="bg-navy hover:bg-navy-dark"
                >
                  Send
                </Button>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <span>Ask about:</span>
                  {(["scm", "bsts", "both"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setChatMethod(m)}
                      className={`rounded px-2 py-0.5 uppercase ${
                        chatMethod === m
                          ? "bg-navy text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── DOWNLOADS ─────────────────────────────────────────────────────── */}
        <Downloads />
      </div>
    </TooltipProvider>
  );
}
