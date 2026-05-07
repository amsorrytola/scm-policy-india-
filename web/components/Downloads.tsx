"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, type SCMResult, type BSTSResult } from "@/lib/store";
import { getPanelData } from "@/lib/api";
import { toast } from "sonner";

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) {
    toast.error("Nothing to download yet");
    return;
  }
  const headers = Object.keys(data[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = data.map((row) =>
    headers.map((h) => escape(row[h])).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildSCMRows(scm: SCMResult) {
  return scm.dates.map((d, i) => {
    const yr = new Date(d).getFullYear();
    return {
      year: yr,
      bihar_actual: scm.treated_outcome[i],
      synthetic_bihar:
        scm.synthetic_outcome[i] != null
          ? Number(scm.synthetic_outcome[i].toFixed(1))
          : null,
      gap:
        scm.gap[i] != null ? Number(scm.gap[i].toFixed(1)) : null,
      period: yr < 2016 ? "pre" : "post",
    };
  });
}

function buildBSTSRows(bsts: BSTSResult) {
  return bsts.dates.map((d, i) => {
    const yr = new Date(d).getFullYear();
    return {
      year: yr,
      observed: bsts.observed?.[i] ?? null,
      predicted_mean:
        bsts.predicted_mean[i] != null
          ? Number(bsts.predicted_mean[i]!.toFixed(1))
          : null,
      predicted_lower:
        bsts.predicted_lower[i] != null
          ? Number(bsts.predicted_lower[i]!.toFixed(1))
          : null,
      predicted_upper:
        bsts.predicted_upper[i] != null
          ? Number(bsts.predicted_upper[i]!.toFixed(1))
          : null,
      point_effect:
        bsts.point_effect[i] != null
          ? Number(bsts.point_effect[i]!.toFixed(1))
          : null,
      period: yr < 2016 ? "pre" : "post",
    };
  });
}

export function Downloads() {
  const { scmResult, bstsResult } = useAppStore();

  const downloadSCM = () => {
    if (!scmResult) return toast.error("SCM result not loaded yet");
    downloadCSV(buildSCMRows(scmResult), "bihar_scm_results.csv");
    toast.success("Downloaded bihar_scm_results.csv");
  };

  const downloadBSTS = () => {
    if (!bstsResult) return toast.error("BSTS result not loaded yet");
    downloadCSV(buildBSTSRows(bstsResult), "bihar_bsts_results.csv");
    toast.success("Downloaded bihar_bsts_results.csv");
  };

  const downloadPanel = async () => {
    try {
      const data = await getPanelData();
      downloadCSV(data, "bihar_panel.csv");
      toast.success("Downloaded bihar_panel.csv");
    } catch (e) {
      toast.error("Panel download failed: " + (e as Error).message);
    }
  };

  return (
    <div
      id="tour-downloads"
      className="mt-8 flex flex-wrap gap-3 border-t border-gray-200 pt-6"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={downloadSCM}
        disabled={!scmResult}
      >
        <Download className="mr-2 h-4 w-4" /> SCM Results (CSV)
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={downloadBSTS}
        disabled={!bstsResult}
      >
        <Download className="mr-2 h-4 w-4" /> BSTS Results (CSV)
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPanel}>
        <Download className="mr-2 h-4 w-4" /> Panel Data (CSV)
      </Button>
    </div>
  );
}
