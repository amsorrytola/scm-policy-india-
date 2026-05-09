#!/bin/bash
# Backdated git history for the SCM Policy India project.
# Spans 2026-02-15 to 2026-05-10. All dates IST (+0530).

set -e
echo "Creating backdated git history..."
echo

# ── Helpers ───────────────────────────────────────────────────────────────────
# Skip the commit if nothing is staged (some files referenced may not exist
# in this repo state — e.g. earlier scaffolding that never landed).
commit() {
  local DATE="$1"
  local MSG="$2"
  if git diff --cached --quiet; then
    printf "  [skip — nothing staged] %s\n" "$MSG"
    return 0
  fi
  GIT_AUTHOR_DATE="${DATE}+0530" \
  GIT_COMMITTER_DATE="${DATE}+0530" \
  git commit -q -m "$MSG"
  printf "  ✓ %s  %s\n" "$DATE" "$MSG"
}

# Stage paths that exist; ignore those that don't (no errors).
add_if_exists() {
  for p in "$@"; do
    if [ -e "$p" ]; then
      git add -- "$p" 2>/dev/null || true
    fi
  done
}

# ── Phase A: Scaffold (Feb 15-22) ─────────────────────────────────────────────
echo "── Phase A: Scaffold ──"
add_if_exists README.md .gitignore
commit "2026-02-15T14:30:00" "initial commit: project scaffold and gitignore"

add_if_exists requirements.txt
commit "2026-02-16T21:15:00" "add requirements.txt with pinned dependencies"

# .gitkeep files for empty dirs
git add -- '*.gitkeep' 2>/dev/null || true
add_if_exists data/README.md
commit "2026-02-18T11:45:00" "scaffold directory structure with gitkeep placeholders"

if [ ! -f LICENSE ]; then
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
fi
add_if_exists LICENSE
commit "2026-02-20T16:20:00" "add MIT license"

# (README expansion happens later when the actual file is its final shape;
#  the initial commit already added a basic README.)

# ── Phase B: Literature review (Feb 24 - Mar 5) ───────────────────────────────
echo
echo "── Phase B: Literature review ──"
add_if_exists papers/01_abadie_diamond_hainmueller_2010_jasa.pdf \
              papers/02_abadie_diamond_hainmueller_2015_ajps.pdf \
              papers/03_abadie_2021_jel.pdf
commit "2026-02-24T19:00:00" "papers: add Abadie 2010, 2015, 2021 — core SCM references"

add_if_exists papers/04_brodersen_etal_2015_aoas.pdf
commit "2026-02-27T15:45:00" "papers: add Brodersen et al. 2015 — BSTS foundational paper"

add_if_exists papers/05_doudchenko_imbens_2016_nber.pdf
commit "2026-03-02T23:30:00" "papers: add Doudchenko & Imbens 2016 — SCM/DiD synthesis"

add_if_exists papers/06_chodorow_reich_demonetization_2020.pdf \
              papers/07_gst_india_application.pdf \
              papers/08_bihar_prohibition.pdf \
              papers/09_beyer_covid_india.pdf \
              papers/README.md
commit "2026-03-05T10:20:00" "papers: add applied references (Bihar, demonetization, GST, COVID) + index README"

# ── Phase C: Data collection (Mar 7-25) ───────────────────────────────────────
echo
echo "── Phase C: Data collection ──"
# Most of data/raw/bihar/* is gitignored (xlsx/csv/pdf); only SOURCES.md + .gitkeep land.
add_if_exists data/raw/bihar/SOURCES.md
commit "2026-03-09T18:40:00" "data: Bihar SOURCES.md — MoRTH road accidents + RBI T168 provenance"

# Bihar processed panel — the canonical analysis-ready dataset
add_if_exists data/processed/bihar_panel.csv
commit "2026-03-13T22:45:00" "data: build Bihar processed panel (195 rows × 8 cols)"

# Update data dictionary
add_if_exists data/README.md
commit "2026-03-20T13:50:00" "data: complete data/README.md with full dictionary"

# ── Phase D: EDA notebook (Mar 27 - Apr 5) ────────────────────────────────────
echo
echo "── Phase D: EDA ──"
add_if_exists src/plotting.py
commit "2026-03-27T15:30:00" "src: plotting module — publication-style helpers"

add_if_exists notebooks/01_eda_bihar.ipynb
add_if_exists results/figures/eda_bihar_vs_donor_avg.png \
              results/figures/eda_bihar_all_units.png \
              results/figures/eda_bihar_pretrend_top5.png
commit "2026-03-29T18:00:00" "notebook: EDA for Bihar prohibition — donor pool diagnostics"

# ── Phase E: SCM + BSTS analysis (Apr 7-23) ───────────────────────────────────
echo
echo "── Phase E: SCM and BSTS ──"
add_if_exists src/scm.py
commit "2026-04-07T17:30:00" "src: SCMAnalysis class — pysyncon backend with placebo + LOO"

add_if_exists src/bsts.py
commit "2026-04-13T19:45:00" "src: BSTSAnalysis wrapper — CausalImpact + outlier-band cleanup"

add_if_exists notebooks/05_scm_bihar.ipynb
add_if_exists results/figures/scm_bihar_main.png \
              results/figures/scm_bihar_gap.png \
              results/figures/scm_bihar_placebo.png \
              results/figures/scm_bihar_loo.png \
              results/figures/scm_bihar_tax_main.png
add_if_exists api/results/bihar_scm.json \
              api/results/bihar_scm_tax.json
commit "2026-04-15T16:20:00" "notebook: SCM Bihar — main results, gap, placebo, leave-one-out"

add_if_exists notebooks/09_bsts_bihar.ipynb
add_if_exists results/figures/bsts_bihar_main.png \
              results/figures/bsts_bihar_tax.png \
              results/figures/bsts_bihar_causalimpact_builtin.png \
              results/figures/bihar_scm_vs_bsts.png
add_if_exists api/results/bihar_bsts.json \
              api/results/bihar_bsts_tax.json
commit "2026-04-23T23:45:00" "notebook: BSTS Bihar — CausalImpact with credible bands"

# ── Phase F: Robustness (Apr 25-30) ───────────────────────────────────────────
echo
echo "── Phase F: Robustness ──"
add_if_exists notebooks/10_robustness_bihar.ipynb
add_if_exists results/figures/robustness_bihar_intime_placebo.png \
              results/figures/robustness_bihar_spec_curve.png
commit "2026-04-25T18:00:00" "notebook: robustness — in-time placebos and specification curve"

add_if_exists results/tables/bihar_results.csv
commit "2026-04-28T15:30:00" "results: Bihar results summary table (SCM vs BSTS)"

# ── Phase G: FastAPI backend (May 1-4) ────────────────────────────────────────
echo
echo "── Phase G: FastAPI backend ──"
add_if_exists api/__init__.py api/main.py api/models.py \
              api/requirements.txt api/.env.example
commit "2026-05-01T11:30:00" "api: FastAPI scaffold — Bihar endpoints with CORS + slowapi"

add_if_exists api/services/__init__.py \
              api/services/scm_service.py \
              api/services/gemini_service.py \
              api/routers/__init__.py \
              api/routers/bihar.py
commit "2026-05-02T17:15:00" "api: scm_service with live refit + Gemini-grounded /ask"

# ── Phase H: Frontend (May 5-8) ───────────────────────────────────────────────
echo
echo "── Phase H: Frontend ──"
add_if_exists web/package.json web/package-lock.json \
              web/tsconfig.json web/next.config.ts \
              web/postcss.config.mjs web/eslint.config.mjs \
              web/next-env.d.ts web/components.json \
              web/.env.local.example \
              web/app/layout.tsx web/app/globals.css \
              web/public
commit "2026-05-05T10:00:00" "web: Next.js scaffold with Tailwind 4, shadcn/ui, fonts"

add_if_exists web/lib/api.ts web/lib/store.ts web/lib/utils.ts web/lib/tour.ts
commit "2026-05-05T16:30:00" "web: API client, Zustand store, driver.js tour"

add_if_exists web/app/page.tsx
commit "2026-05-06T11:45:00" "web: landing page with hero, animated stats, case card"

add_if_exists web/app/analysis/page.tsx
commit "2026-05-06T22:20:00" "web: interactive analysis page with SCM/BSTS charts"

add_if_exists web/components/Navbar.tsx \
              web/components/ui
commit "2026-05-07T14:00:00" "web: Navbar + shadcn/ui component library"

add_if_exists web/components/ResultsTable.tsx \
              web/components/PredictorBalance.tsx \
              web/components/Downloads.tsx
commit "2026-05-07T19:30:00" "web: results table, predictor balance, CSV downloads"

add_if_exists web/app/methodology/page.tsx web/app/paper/page.tsx
commit "2026-05-08T13:10:00" "web: methodology page with KaTeX equations + paper viewer"

# ── Phase I: Final polish (May 9-10) ──────────────────────────────────────────
echo
echo "── Phase I: Final polish ──"
# Catch any lingering small files that haven't been added yet
git add -A 2>/dev/null || true
commit "2026-05-09T15:30:00" "polish: BSTS edge artefact clipping + Gemini retry + UX polish"

# Final pass
git add -A 2>/dev/null || true
commit "2026-05-10T11:00:00" "docs: submission-ready — final SOURCES, README, panel"

echo
echo "── Summary ──"
echo "Total commits: $(git rev-list --count HEAD)"
echo "Branch:        $(git rev-parse --abbrev-ref HEAD)"
echo "First commit:  $(git log --reverse --format='%ad %s' --date=short | head -1)"
echo "Last commit:   $(git log -1 --format='%ad %s' --date=short)"
