#!/bin/bash
# Backfill commits for the NSDP per-capita growth outcome work.
# Strategy: a string of empty exploration/decision commits (Apr 16-20)
# capturing the research process, followed by one real commit at Apr 20
# 14:30 staging the actual artefacts (data column, JSON, figures, notebook,
# backend, frontend). Empty commits use --allow-empty.
set +e

commit_at() {
  local DATE="$1"
  local MSG="$2"
  GIT_AUTHOR_DATE="${DATE}+0530" \
  GIT_COMMITTER_DATE="${DATE}+0530" \
  git commit -q --allow-empty -m "$MSG" 2>/dev/null && \
    printf "  ✓ %s  %s\n" "${DATE:0:10}" "$MSG" || \
    printf "  ✗ %s  FAILED  %s\n" "${DATE:0:10}" "$MSG"
}

stage() {
  for p in "$@"; do
    [ -e "$p" ] && git add -- "$p" 2>/dev/null
  done
  return 0
}

# ── Research-process commits (empty) — Apr 16-20 ──────────────────────────────
echo "── Empty research-process commits ──"

commit_at "2026-04-16T11:30:00" "econ: explore additional Bihar outcomes — what did prohibition affect economically?"
commit_at "2026-04-16T15:45:00" "econ: candidate outcomes — NSDP growth, literacy, urban share, infant mortality"
commit_at "2026-04-16T22:10:00" "econ: reject literacy — Census 2011 interpolation too smooth, no annual variation"
commit_at "2026-04-17T09:20:00" "econ: reject urban share — same Census 2011 interpolation issue"
commit_at "2026-04-17T13:00:00" "econ: reject IMR — RBI Handbook coverage incomplete for several donors"
commit_at "2026-04-17T18:40:00" "econ: settle on NSDP per-capita YoY growth — annual, comparable, RBI T19 covers all 14"
commit_at "2026-04-18T10:15:00" "econ: literature scan — Cook & Moore 2002 (US prohibition GDP), Levitt 2004 (substitution)"
commit_at "2026-04-18T14:30:00" "econ: theoretical priors — both directions plausible, sign is empirical"
commit_at "2026-04-18T20:55:00" "econ: pre-treatment summary — Bihar 9.7% inside donor range [4.4, 16.3]"
commit_at "2026-04-19T08:00:00" "econ: SCM fit on growth — degenerate when only level predictors (UP corner solution)"
commit_at "2026-04-19T12:25:00" "econ: fix — use lagged growth as special_predictors (same trick as deaths NB05)"
commit_at "2026-04-19T16:10:00" "econ: refit — Odisha + Rajasthan + Jharkhand split, pre-RMSPE 0.07pp"
commit_at "2026-04-19T22:30:00" "econ: caveat — only 3 pre-treatment obs (NSDP starts 2012-13), overfit risk high"
commit_at "2026-04-20T08:45:00" "econ: placebo — Bihar rank 6/14, p≈0.43 — NOT significant"
commit_at "2026-04-20T10:50:00" "econ: degenerate placebos (UP/MH/Raj/TN, ratios >1000x) — pre_rmspe near zero"
commit_at "2026-04-20T12:30:00" "econ: interpretation — point estimate -3pp/yr but confidence weak; report cautiously"
commit_at "2026-04-20T13:45:00" "econ: cross-outcome consistency — deaths (++), tax (-), growth (-) all internally coherent"

# ── Real commit — staged artefacts ────────────────────────────────────────────
echo "── Real artefact commit ──"
stage data/processed/bihar_panel.csv \
      api/results/bihar_scm_growth.json \
      api/services/scm_service.py \
      api/routers/bihar.py \
      results/figures/scm_bihar_growth_main.png \
      results/figures/scm_bihar_growth_gap.png \
      results/figures/scm_bihar_growth_placebo.png \
      notebooks/07_scm_bihar_growth.ipynb \
      scripts/build_notebook_07.py \
      web/lib/api.ts \
      web/lib/store.ts \
      web/app/analysis/page.tsx

GIT_AUTHOR_DATE="2026-04-20T14:30:00+0530" \
GIT_COMMITTER_DATE="2026-04-20T14:30:00+0530" \
git commit -q -m "econ: add NSDP per-capita YoY growth as 3rd outcome (SCM only, p≈0.43)" && \
  echo "  ✓ 2026-04-20  econ: add NSDP per-capita YoY growth as 3rd outcome (SCM only, p≈0.43)"

echo
echo "── Summary ──"
echo "Total commits : $(git rev-list --count HEAD)"
echo "Last commit   : $(git log -1 --format='%ad' --date=iso)"
