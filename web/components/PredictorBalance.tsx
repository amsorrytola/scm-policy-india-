"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const NAVY = "#0F4C81";
const AMBER = "#F4A261";
const GRAY = "#9CA3AF";

// Phase 4A SCM results (constant — does not depend on user-selected donors)
const balanceData = [
  {
    predictor: "NSDP per capita",
    bihar: 25464,
    synthetic: 48620,
    donor_avg: 83231,
    unit: "₹",
  },
  {
    predictor: "Urban share",
    bihar: 11.8,
    synthetic: 23.1,
    donor_avg: 34.1,
    unit: "%",
  },
  {
    predictor: "Literacy rate",
    bihar: 65.6,
    synthetic: 69.3,
    donor_avg: 75.8,
    unit: "%",
  },
];

// Each row gets normalised by Bihar's value × 100
type NormalRow = {
  predictor: string;
  series: "Bihar (actual)" | "Synthetic Bihar" | "Donor average";
  pct: number;
  raw: number;
  unit: string;
};

const rows: NormalRow[] = [];
balanceData.forEach((d) => {
  rows.push({
    predictor: d.predictor,
    series: "Bihar (actual)",
    pct: 100,
    raw: d.bihar,
    unit: d.unit,
  });
  rows.push({
    predictor: d.predictor,
    series: "Synthetic Bihar",
    pct: Math.round((d.synthetic / d.bihar) * 100),
    raw: d.synthetic,
    unit: d.unit,
  });
  rows.push({
    predictor: d.predictor,
    series: "Donor average",
    pct: Math.round((d.donor_avg / d.bihar) * 100),
    raw: d.donor_avg,
    unit: d.unit,
  });
});

// Reshape for Recharts grouped bar (one row per predictor, three series)
const chartData = balanceData.map((d) => ({
  predictor: d.predictor,
  "Bihar (actual)": 100,
  "Synthetic Bihar": Math.round((d.synthetic / d.bihar) * 100),
  "Donor average": Math.round((d.donor_avg / d.bihar) * 100),
  // Tooltip extras
  raw_bihar: d.bihar,
  raw_synth: d.synthetic,
  raw_avg: d.donor_avg,
  unit: d.unit,
}));

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: typeof chartData[number] }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 text-xs shadow-md">
      <div className="mb-1 font-semibold text-navy">{label}</div>
      <div className="space-y-0.5">
        <div>
          <span className="text-gray-500">Bihar:</span>{" "}
          <span className="font-mono">
            {d.raw_bihar.toLocaleString()} {d.unit}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Synthetic:</span>{" "}
          <span className="font-mono">
            {d.raw_synth.toLocaleString()} {d.unit} (
            {d["Synthetic Bihar"]}% of Bihar)
          </span>
        </div>
        <div>
          <span className="text-gray-500">Donor avg:</span>{" "}
          <span className="font-mono">
            {d.raw_avg.toLocaleString()} {d.unit} (
            {d["Donor average"]}% of Bihar)
          </span>
        </div>
      </div>
    </div>
  );
}

export function PredictorBalance() {
  return (
    <div id="tour-predictor-balance" className="mt-6">
      <h3 className="mb-1 font-serif text-lg font-bold text-navy">
        Predictor Balance
      </h3>
      <p className="mb-3 text-sm text-gray-600">
        How well does the synthetic Bihar match real Bihar before the ban?
        Bars normalised so Bihar = 100%.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, bottom: 10, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="predictor" fontSize={11} />
          <YAxis
            fontSize={11}
            tickFormatter={(v) => v + "%"}
            label={{
              value: "% of Bihar's value",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#6b7280" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={100}
            stroke="#374151"
            strokeDasharray="3 3"
            label={{ value: "Bihar = 100", fontSize: 10, fill: "#374151" }}
          />
          <Bar
            dataKey="Bihar (actual)"
            fill={NAVY}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Synthetic Bihar"
            fill={AMBER}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="Donor average"
            fill={GRAY}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 rounded-md border-l-4 border-amber bg-cream p-3 text-xs text-gray-700">
        Synthetic Bihar matches real Bihar much better than the donor
        average, especially on NSDP (191% vs 327% of Bihar) and urban share
        (196% vs 289%). Literacy is closest in absolute terms (105% vs
        116%). Bihar still lies outside the donor pool&apos;s convex hull on
        income — see methodology for the lagged-outcome predictors that
        compensate.
      </p>
      {/* hidden series-level data so React keeps it in the DOM if needed */}
      <noscript style={{ display: "none" }}>
        {JSON.stringify(rows)}
      </noscript>
    </div>
  );
}
