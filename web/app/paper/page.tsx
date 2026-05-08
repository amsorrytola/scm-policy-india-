"use client";

import { useEffect, useState } from "react";
import { Download, GitBranch } from "lucide-react";

export default function PaperPage() {
  const [pdfExists, setPdfExists] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/slides.pdf", { method: "HEAD" })
      .then((r) => setPdfExists(r.ok))
      .catch(() => setPdfExists(false));
  }, []);

  const ghUrl =
    process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl font-bold text-navy">
          Presentation
        </h1>
        <div className="flex gap-3">
          <a
            href="/slides.pdf"
            download
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-dark"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          <a
            href={ghUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-navy hover:text-white"
          >
            <GitBranch className="h-4 w-4" />
            Source on GitHub
          </a>
        </div>
      </div>

      {pdfExists === false ? (
        <div className="rounded-lg border border-amber bg-amber/10 p-6 text-sm text-gray-700">
          <strong className="text-navy">PDF not found.</strong>{" "}
          The slides will appear here once{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            presentation/slides.tex
          </code>{" "}
          is compiled and the resulting{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            slides.pdf
          </code>{" "}
          is placed in{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            web/public/
          </code>
          .
        </div>
      ) : (
        <iframe
          src="/slides.pdf"
          className="h-[80vh] w-full rounded-lg border border-gray-200 bg-white"
          title="Presentation slides"
        />
      )}
    </div>
  );
}
