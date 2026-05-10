"""
scripts/regenerate_bsts_figures.py
Regenerate BSTS figures with explicit Y-limits and null-aware bands,
using the new max_donors=3 BSTSAnalysis configuration.
"""

import sys, warnings, json
sys.path.append(".")
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from pathlib import Path

from src.plotting import (
    set_publication_style, COLOR_TREATED, COLOR_SYNTHETIC,
    treatment_line, save_fig,
)
set_publication_style()

RESULTS = Path("results/figures")
TREATMENT_DATE = "2016-01-01"
TREATMENT_TS = pd.to_datetime(TREATMENT_DATE)


def safe_series(values, index):
    return pd.Series(
        [v if v is not None else np.nan for v in values],
        index=index,
    )


def band_segments(dates, lower, upper):
    """Return only the non-null portions of a credible band as a list."""
    seg_d, seg_lo, seg_hi = [], [], []
    for d, lo, hi in zip(dates, lower, upper):
        if lo is not None and hi is not None:
            seg_d.append(d); seg_lo.append(lo); seg_hi.append(hi)
    return seg_d, seg_lo, seg_hi


def smart_ylim(series_list, pad=0.15):
    vals = []
    for s in series_list:
        for v in s:
            if v is None: continue
            try:
                fv = float(v)
            except Exception:
                continue
            if not np.isnan(fv) and not np.isinf(fv):
                vals.append(fv)
    if not vals:
        return None, None
    lo, hi = min(vals), max(vals)
    rng = hi - lo
    return lo - rng * pad, hi + rng * pad


# ── Load JSONs ───────────────────────────────────────────────────────────────
with open("api/results/bihar_bsts.json") as f:
    bsts_data = json.load(f)
with open("api/results/bihar_scm.json") as f:
    scm_data = json.load(f)
with open("api/results/bihar_bsts_tax.json") as f:
    bsts_tax_data = json.load(f)


# ── FIGURE 1: bsts_bihar_main.png ────────────────────────────────────────────
dates = pd.to_datetime(bsts_data["dates"])
obs   = bsts_data["observed"]
pred  = bsts_data["predicted_mean"]
p_lo  = bsts_data["predicted_lower"]
p_hi  = bsts_data["predicted_upper"]
eff   = bsts_data["point_effect"]
e_lo  = bsts_data["point_effect_lower"]
e_hi  = bsts_data["point_effect_upper"]

fig, axes = plt.subplots(
    2, 1, figsize=(11, 9), gridspec_kw={"height_ratios": [2, 1]},
)

# Panel A
ax = axes[0]
bd, blo, bhi = band_segments(dates, p_lo, p_hi)
if bd:
    ax.fill_between(bd, blo, bhi, alpha=0.25, color=COLOR_SYNTHETIC,
                    label="95% credible band")
ax.plot(dates, safe_series(obs, dates),
        color=COLOR_TREATED, linewidth=2.5, marker="o", markersize=5,
        label="Bihar (actual)", zorder=10)
ax.plot(dates, safe_series(pred, dates),
        color=COLOR_SYNTHETIC, linewidth=2, linestyle="--",
        marker="s", markersize=4,
        label="Posterior mean (counterfactual)")
treatment_line(ax, TREATMENT_DATE, label="Prohibition\n(Apr 2016)")
ax.set_ylim(*smart_ylim([obs, pred]))
ax.set_ylabel("Road accident deaths")
ax.set_title(
    "BSTS: Bihar vs Bayesian Counterfactual — Road Accident Deaths\n"
    f"({bsts_data['case_meta'].get('n_pre', '?')} pre-treatment obs, "
    f"3 covariates — see methodology)",
    fontsize=12,
)
ax.yaxis.set_major_formatter(
    mticker.FuncFormatter(lambda x, _: f"{x:,.0f}")
)
ax.legend(loc="upper left", fontsize=9)

# Panel B
ax = axes[1]
ed, elo, ehi = band_segments(dates, e_lo, e_hi)
if ed:
    ax.fill_between(ed, elo, ehi, alpha=0.2, color=COLOR_TREATED)
eff_s = safe_series(eff, dates)
ax.plot(dates, eff_s, color=COLOR_TREATED, linewidth=2,
        marker="o", markersize=4)
ax.axhline(0, color="black", linewidth=0.8)
ax.fill_between(dates, eff_s, 0,
                where=(dates >= TREATMENT_TS),
                alpha=0.1, color=COLOR_TREATED)
treatment_line(ax, TREATMENT_DATE)
ax.set_ylabel("Point effect (deaths)")
ax.set_title("Posterior Pointwise Effect")
ax.set_ylim(*smart_ylim([eff]))
ax.yaxis.set_major_formatter(
    mticker.FuncFormatter(lambda x, _: f"{x:+,.0f}")
)

fig.tight_layout(pad=2)
save_fig(fig, RESULTS / "bsts_bihar_main.png")
plt.close()
print("✅ bsts_bihar_main.png")


# ── FIGURE 2: bihar_scm_vs_bsts.png ──────────────────────────────────────────
scm_dates = pd.to_datetime(scm_data["dates"])
scm_gap = scm_data["gap"]

bsts_by_yr = {}
for dt, e, lo, hi in zip(dates, eff, e_lo, e_hi):
    bsts_by_yr[pd.to_datetime(dt).year] = (e, lo, hi)

aligned_eff, aligned_lo, aligned_hi = [], [], []
for dt in scm_dates:
    e, lo, hi = bsts_by_yr.get(dt.year, (None, None, None))
    aligned_eff.append(e); aligned_lo.append(lo); aligned_hi.append(hi)

fig, ax = plt.subplots(figsize=(11, 5))
bd, blo, bhi = band_segments(scm_dates, aligned_lo, aligned_hi)
if bd:
    ax.fill_between(bd, blo, bhi, alpha=0.15, color=COLOR_SYNTHETIC,
                    label="BSTS 95% CI")
ax.plot(scm_dates, safe_series(scm_gap, scm_dates),
        color=COLOR_TREATED, linewidth=2.5, marker="o", markersize=4,
        label=f"SCM gap (ratio={scm_data['diagnostics']['rmspe_ratio']:.1f}×)")
ax.plot(scm_dates, safe_series(aligned_eff, scm_dates),
        color=COLOR_SYNTHETIC, linewidth=2.5, linestyle="--",
        marker="s", markersize=4,
        label="BSTS point effect (posterior mean)")
ax.axhline(0, color="black", linewidth=0.8)
treatment_line(ax, TREATMENT_DATE, label="Prohibition")
ax.set_ylabel("Treatment effect (deaths/year)")
ax.set_title("Bihar Prohibition — SCM vs BSTS: Treatment Effect Estimates")
ax.set_ylim(*smart_ylim([scm_gap, aligned_eff]))
ax.yaxis.set_major_formatter(
    mticker.FuncFormatter(lambda x, _: f"{x:+,.0f}")
)
ax.legend(fontsize=9)
fig.tight_layout()
save_fig(fig, RESULTS / "bihar_scm_vs_bsts.png")
plt.close()
print("✅ bihar_scm_vs_bsts.png")


# ── FIGURE 3: bsts_bihar_tax.png ─────────────────────────────────────────────
tax_dates = pd.to_datetime(bsts_tax_data["dates"])
t_obs  = bsts_tax_data["observed"]
t_pred = bsts_tax_data["predicted_mean"]
t_lo   = bsts_tax_data["predicted_lower"]
t_hi   = bsts_tax_data["predicted_upper"]

fig, ax = plt.subplots(figsize=(11, 4))
bd, blo, bhi = band_segments(tax_dates, t_lo, t_hi)
if bd:
    ax.fill_between(bd, blo, bhi, alpha=0.2, color=COLOR_SYNTHETIC)
ax.plot(tax_dates, safe_series(t_obs, tax_dates),
        color=COLOR_TREATED, linewidth=2.5, marker="o",
        label="Bihar actual")
ax.plot(tax_dates, safe_series(t_pred, tax_dates),
        color=COLOR_SYNTHETIC, linewidth=2, linestyle="--",
        label="BSTS counterfactual")
treatment_line(ax, TREATMENT_DATE)
ax.set_ylabel("Own tax revenue (₹ Crore)")
ax.set_title(
    "BSTS — Bihar Own Tax Revenue\n"
    "(attenuated proxy; excise ~22% of composite, 3 covariates)",
    fontsize=12,
)
ax.set_ylim(*smart_ylim([t_obs, t_pred]))
ax.yaxis.set_major_formatter(
    mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}")
)
ax.legend()
fig.tight_layout()
save_fig(fig, RESULTS / "bsts_bihar_tax.png")
plt.close()
print("✅ bsts_bihar_tax.png")

print("\n=== All BSTS figures regenerated ===")
print(f"Primary outcome Y-axis range: {smart_ylim([obs, pred])}")
print(f"Tax outcome     Y-axis range: {smart_ylim([t_obs, t_pred])}")
