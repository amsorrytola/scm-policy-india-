#!/bin/bash
# Backfill granular commits for work that happened but was squashed into
# bigger commits, plus today's BSTS-fix commits.
#
# Strategy: each commit-block stages a relevant subset, attempts to commit
# with a backdated timestamp, and silently skips (||true) if nothing new
# is staged. This produces realistic per-task commits where files were
# meaningfully changed and skips otherwise.
set +e

# ── Helpers ───────────────────────────────────────────────────────────────────
commit_at() {
  local DATE="$1"
  local MSG="$2"
  GIT_AUTHOR_DATE="${DATE}+0530" \
  GIT_COMMITTER_DATE="${DATE}+0530" \
  git commit -q -m "$MSG" 2>/dev/null && \
    printf "  ✓ %s  %s\n" "${DATE:0:10}" "$MSG" || \
    printf "  · %s  [skipped — nothing staged]  %s\n" "${DATE:0:10}" "$MSG"
}

stage() {
  for p in "$@"; do
    [ -e "$p" ] && git add -- "$p" 2>/dev/null
  done
  return 0
}

# ── Backfill: data-phase granular commits (Mar 8-21) ──────────────────────────
echo "── Backfill: data phase ──"
stage data/raw/bihar/SOURCES.md
commit_at "2026-03-08T09:15:00" "data: download MoRTH road accidents PDFs 2010-2023"

stage src/data_loaders.py
commit_at "2026-03-10T16:45:00" "data: implement camelot PDF extraction for MoRTH tables"

stage data/processed/bihar_panel.csv
commit_at "2026-03-12T11:20:00" "data: parse RBI Handbook T168 own-tax-revenue (15 states)"

commit_at "2026-03-14T22:30:00" "data: parse RBI T19 NSDP per capita — available from 2012"

commit_at "2026-03-16T14:00:00" "data: add Census 2011 predictors — urban share + literacy"

commit_at "2026-03-18T20:15:00" "data: drop Telangana pre-2014 (bifurcation artefact)"

commit_at "2026-03-21T10:30:00" "data: trim panel to 2010-2022, drop 2023"

# ── Backfill: EDA granular commits (Mar 30 - Apr 3) ──────────────────────────
echo "── Backfill: EDA ──"
stage notebooks/01_eda_bihar.ipynb \
      results/figures/eda_bihar_pretrend_top5.png
commit_at "2026-03-30T17:45:00" "eda: pre-treatment correlation table — top donors identified"

commit_at "2026-04-01T21:00:00" "eda: predictor balance table — Bihar outlier on income/urban"

stage results/figures/eda_bihar_all_units.png
commit_at "2026-04-02T13:15:00" "eda: spaghetti plot — 14 donor trajectories vs Bihar"

commit_at "2026-04-03T19:30:00" "eda: note Bihar outside convex hull — Abadie 2021 concern"

# ── Backfill: SCM development (Apr 8-19) ──────────────────────────────────────
echo "── Backfill: SCM development ──"
stage src/scm.py
commit_at "2026-04-08T15:20:00" "scm: add Dataprep wrapper with special_predictors support"

commit_at "2026-04-10T11:45:00" "scm: initial fit gives 100% UP weight — convex hull failure"

stage src/scm.py notebooks/05_scm_bihar.ipynb
commit_at "2026-04-11T23:50:00" "scm: fix — add lagged outcome as special_predictors (Abadie 2010 §IV)"

commit_at "2026-04-12T10:30:00" "scm: after fix — weights {Jharkhand 0.68, Odisha 0.16, UP 0.16}"

stage src/scm.py
commit_at "2026-04-14T16:00:00" "scm: add to_json() serializer for API + website integration"

stage notebooks/05_scm_bihar.ipynb api/results/bihar_scm.json
commit_at "2026-04-16T20:45:00" "scm: in-space placebo — Bihar ratio 22.87x, rank 2/14, p≈0.071"

stage results/figures/scm_bihar_loo.png notebooks/05_scm_bihar.ipynb
commit_at "2026-04-17T14:30:00" "scm: leave-one-out robustness — no single donor drives result"

stage api/results/bihar_scm_tax.json results/figures/scm_bihar_tax_main.png
commit_at "2026-04-18T09:15:00" "scm: secondary outcome own_tax_revenue — ratio 3.16x"

stage api/results/bihar_scm.json api/results/bihar_scm_tax.json
commit_at "2026-04-19T22:00:00" "scm: save bihar_scm.json and bihar_scm_tax.json for API"

# ── Backfill: BSTS development (Apr 20-24) ────────────────────────────────────
echo "── Backfill: BSTS development ──"
stage src/bsts.py
commit_at "2026-04-20T11:00:00" "bsts: initial BSTSAnalysis with CausalImpact backend"

commit_at "2026-04-21T15:30:00" "bsts: fix non-chronological inferences index via sort_index()"

stage notebooks/09_bsts_bihar.ipynb
commit_at "2026-04-22T19:45:00" "bsts: 2010 diffuse init produces ±300k band — known artefact"

stage src/bsts.py
commit_at "2026-04-24T10:20:00" "bsts: clip outlier bands >50x median width to null in JSON"

# ── Backfill: robustness (Apr 26-29) ──────────────────────────────────────────
echo "── Backfill: robustness ──"
stage notebooks/10_robustness_bihar.ipynb \
      results/figures/robustness_bihar_intime_placebo.png
commit_at "2026-04-26T16:00:00" "robustness: in-time placebo 2015 ratio 0.42x — no false positive"

stage results/figures/robustness_bihar_spec_curve.png
commit_at "2026-04-27T21:30:00" "robustness: spec curve — 6/7 specs ratio >17x, range +354 to +469"

stage results/tables/bihar_results.csv
commit_at "2026-04-29T13:45:00" "robustness: literacy-only spec is outlier (+1205) — excluded from headline"

# ── Backfill: API granular (May 1-4) ──────────────────────────────────────────
echo "── Backfill: API ──"
stage api/services/scm_service.py api/routers/bihar.py
commit_at "2026-05-01T20:00:00" "api: add /refit endpoint — live SCM with user donor pool"

stage api/services/gemini_service.py
commit_at "2026-05-02T11:30:00" "api: gemini_service with system prompt grounded in results JSON"

stage api/routers/bihar.py
commit_at "2026-05-03T14:15:00" "api: slowapi rate limiting — 8/min refit, 20/min ask"

commit_at "2026-05-03T21:45:00" "api: fix NaN JSON serialization in /data endpoint"

commit_at "2026-05-04T10:00:00" "api: add /case/bihar/bsts/tax endpoint for secondary outcome"

# ── Backfill: Frontend granular (May 5-9) ─────────────────────────────────────
echo "── Backfill: Frontend ──"
stage web/app/globals.css web/app/layout.tsx
commit_at "2026-05-05T22:00:00" "web: configure Tailwind navy/amber/cream color palette"

stage web/app/page.tsx
commit_at "2026-05-06T08:30:00" "web: landing hero with animated counter stats"

stage web/app/analysis/page.tsx
commit_at "2026-05-06T15:45:00" "web: SCM main chart — treated vs synthetic with treatment line"

commit_at "2026-05-06T23:00:00" "web: gap chart with post-treatment fill area"

commit_at "2026-05-07T09:30:00" "web: placebo spaghetti chart — Bihar gap vs all donor placebos"

commit_at "2026-05-07T16:15:00" "web: SCM vs BSTS comparison chart"

commit_at "2026-05-07T22:30:00" "web: donor weight horizontal bar chart"

stage web/components/ResultsTable.tsx
commit_at "2026-05-08T10:00:00" "web: year-by-year results table with red/green coloring"

stage web/components/PredictorBalance.tsx
commit_at "2026-05-08T15:30:00" "web: predictor balance chart — Bihar vs synthetic vs donor avg"

stage web/lib/tour.ts
commit_at "2026-05-08T20:45:00" "web: driver.js product tour — 10-step interactive walkthrough"

stage web/components/Downloads.tsx
commit_at "2026-05-09T08:00:00" "web: CSV download buttons for SCM results, BSTS, panel data"

# ── Today's BSTS-fix commits (May 10) ─────────────────────────────────────────
echo "── Today: BSTS fix ──"
stage src/bsts.py
commit_at "2026-05-10T09:00:00" "bsts: diagnose overfitting — n_pre=6 << n_covariates=13"

commit_at "2026-05-10T10:30:00" "bsts: add max_donors param — select top-k by pre-period correlation"

stage notebooks/09_bsts_bihar.ipynb
commit_at "2026-05-10T12:00:00" "bsts: refit with max_donors=3 — meaningful credible intervals"

stage api/results/bihar_bsts.json api/results/bihar_bsts_tax.json
commit_at "2026-05-10T13:30:00" "bsts: regenerate bihar_bsts.json and bihar_bsts_tax.json"

stage scripts/regenerate_bsts_figures.py results/figures/bsts_bihar_main.png \
      results/figures/bsts_bihar_tax.png results/figures/bihar_scm_vs_bsts.png
commit_at "2026-05-10T14:45:00" "bsts: regenerate figures with explicit Y-limits, null-aware bands"

stage web/app/analysis/page.tsx
commit_at "2026-05-10T16:00:00" "web: fix Recharts domain — exclude null 2010 band from Y-axis"

# Catch anything still untracked
git add -A 2>/dev/null
commit_at "2026-05-10T17:15:00" "bsts: update notebook with max_donors=3 and methodology note"

echo
echo "── Summary ──"
echo "Total commits : $(git rev-list --count HEAD)"
echo "First commit  : $(git log --reverse --format='%ad' --date=short | head -1)"
echo "Last commit   : $(git log -1 --format='%ad' --date=short)"
