"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";

const TREATMENT_YEAR = 2016;

function fmt(n: number | null | undefined, withSign = true): string {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = withSign ? (n >= 0 ? "+" : "−") : n < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

function fmtAbs(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function ResultsTable() {
  const { scmResult, scmTaxResult, bstsResult, bstsTaxResult,
          activeMethod, activeOutcome } = useAppStore();

  const currentSCM = activeOutcome === "tax" ? scmTaxResult : scmResult;
  const currentBSTS = activeOutcome === "tax" ? bstsTaxResult : bstsResult;

  const rows = useMemo(() => {
    if (!currentSCM) return [];

    // Build BSTS lookup by year (BSTS has 2010-2022, SCM has 2012-2022)
    const bstsByYear: Record<
      number,
      {
        effect: number | null;
        lower: number | null;
        upper: number | null;
      }
    > = {};
    if (currentBSTS) {
      currentBSTS.dates.forEach((d, i) => {
        const yr = new Date(d).getFullYear();
        bstsByYear[yr] = {
          effect: currentBSTS.point_effect?.[i] ?? null,
          lower: currentBSTS.point_effect_lower?.[i] ?? null,
          upper: currentBSTS.point_effect_upper?.[i] ?? null,
        };
      });
    }

    return currentSCM.dates
      .map((d, i) => {
        const year = new Date(d).getFullYear();
        const bsts = bstsByYear[year];
        return {
          year,
          bihar: currentSCM.treated_outcome[i],
          synthetic: currentSCM.synthetic_outcome[i],
          gap: currentSCM.gap[i],
          bsts_effect: bsts?.effect ?? null,
          bsts_lower: bsts?.lower ?? null,
          bsts_upper: bsts?.upper ?? null,
          isPre: year < TREATMENT_YEAR,
        };
      })
      .filter((r) => r.bihar != null && r.synthetic != null);
  }, [currentSCM, currentBSTS]);

  if (!currentSCM) return null;

  const showBSTS =
    (activeMethod === "bsts" || activeMethod === "both") && currentBSTS;
  const postRows = rows.filter((r) => !r.isPre && r.gap != null);
  const postAvg =
    postRows.length > 0
      ? postRows.reduce((s, r) => s + (r.gap ?? 0), 0) / postRows.length
      : null;

  return (
    <div id="tour-results-table" className="mt-6 overflow-x-auto">
      <h3 className="mb-2 font-serif text-lg font-bold text-navy">
        Year-by-Year Results
      </h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-navy">
            <th className="px-3 py-2 text-left font-semibold">Year</th>
            <th className="px-3 py-2 text-right font-semibold">
              Bihar (actual)
            </th>
            <th className="px-3 py-2 text-right font-semibold">
              Synthetic
            </th>
            <th className="bg-amber/10 px-3 py-2 text-right font-semibold">
              SCM gap
            </th>
            {showBSTS && (
              <>
                <th className="px-3 py-2 text-right font-semibold">
                  BSTS effect
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500">
                  95% CI
                </th>
              </>
            )}
            <th className="px-3 py-2 text-left font-semibold text-gray-400">
              Period
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.year}
              className={`border-b border-gray-100 ${
                r.isPre ? "text-gray-500" : ""
              } ${r.year === TREATMENT_YEAR ? "bg-amber/5 font-medium" : ""}`}
            >
              <td className="px-3 py-2">
                {r.year}
                {r.year === TREATMENT_YEAR && (
                  <span className="ml-2 text-xs font-normal text-amber-600">
                    ← treatment
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {fmtAbs(r.bihar)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {fmtAbs(r.synthetic)}
              </td>
              <td
                className={`bg-amber/5 px-3 py-2 text-right font-mono ${
                  r.gap != null && r.gap < 0
                    ? "text-green-700"
                    : r.gap != null && r.gap > 0
                      ? "text-red-700"
                      : ""
                }`}
              >
                {fmt(r.gap)}
              </td>
              {showBSTS && (
                <>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      r.bsts_effect != null && r.bsts_effect < 0
                        ? "text-green-700"
                        : r.bsts_effect != null && r.bsts_effect > 0
                          ? "text-red-700"
                          : ""
                    }`}
                  >
                    {fmt(r.bsts_effect)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-gray-400">
                    [{fmt(r.bsts_lower)}, {fmt(r.bsts_upper)}]
                  </td>
                </>
              )}
              <td className="px-3 py-2 text-xs text-gray-400">
                {r.isPre ? "pre-treatment" : "post-treatment"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-navy bg-cream">
            <td className="px-3 py-2 font-semibold">Post avg.</td>
            <td className="px-3 py-2 text-right" />
            <td className="px-3 py-2 text-right" />
            <td className="bg-amber/5 px-3 py-2 text-right font-mono font-semibold">
              {fmt(postAvg)}
            </td>
            {showBSTS && (
              <>
                <td className="px-3 py-2 text-right" />
                <td className="px-3 py-2 text-right" />
              </>
            )}
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs text-gray-400">
        Green = Bihar below synthetic (fewer deaths / lower revenue than
        expected). Red = Bihar above synthetic. Pre-treatment rows in gray.
      </p>
    </div>
  );
}
