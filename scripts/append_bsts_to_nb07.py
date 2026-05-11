"""
scripts/append_bsts_to_nb07.py
Append BSTS analysis cells to notebooks/07_scm_bihar_growth.ipynb.
"""

import nbformat
from nbformat.v4 import new_markdown_cell, new_code_cell
from pathlib import Path

nb_path = Path("notebooks/07_scm_bihar_growth.ipynb")
nb = nbformat.read(open(nb_path), as_version=4)

nb.cells.append(new_markdown_cell("""## 9. BSTS Analysis — NSDP Growth Rate

Bayesian Structural Time Series provides a complementary estimate with full
posterior uncertainty quantification.

### Methodology notes specific to growth

**Treatment cutoff shifted to 2017-01-01.** Calendar year 2016 contained only
~8 months of prohibition (April-December), and `pycausalimpact` requires a
pre-period span of at least 4 time points. We therefore treat 2016 as a
pre-treatment year for BSTS only — SCM keeps the original 2016-01-01 cutoff
because it does not have the same minimum-span constraint.

**Single donor (Odisha).** With only 4 pre-treatment points and growth being
a much more volatile series than levels, multi-donor BSTS overfits
catastrophically — pre-period effects collapse to ≈ 0 (perfect fit) and the
model extrapolates absurd post-period counterfactuals (e.g. predicting
−170% growth for Bihar in 2021). Restricting the regression component to
Odisha (highest positive pre-period correlation, r=+0.98) produces a
non-degenerate fit with sensible counterfactual predictions and pre-period
|effect| ≈ 0.1 pp — read this as "BSTS for growth is barely identifiable
and should be interpreted as directional corroboration of SCM, not as
independent evidence."""))

nb.cells.append(new_code_cell("""from src.bsts import BSTSAnalysis

BSTS_TREATMENT_DATE = "2017-01-01"

panel_clean = panel.dropna(subset=["nsdp_growth_yoy"])
bsts_growth = BSTSAnalysis(
    panel_df=panel_clean,
    treated_unit=TREATED,
    donor_pool=["Odisha"],   # single-donor — see methodology note above
    outcome="nsdp_growth_yoy",
    treatment_date=BSTS_TREATMENT_DATE,
    max_donors=None,
)
bsts_growth.fit()
print(bsts_growth.summary())"""))

nb.cells.append(new_code_cell("""# Plot BSTS growth
import json
with open("../api/results/bihar_bsts_growth.json") as f:
    bg = json.load(f)

bg_dates = pd.to_datetime(bg["dates"])
def to_series(arr): return pd.Series(
    [v if v is not None else np.nan for v in arr], index=bg_dates,
)
bg_obs  = to_series(bg["observed"])
bg_pred = to_series(bg["predicted_mean"])
bg_lo   = to_series(bg["predicted_lower"])
bg_hi   = to_series(bg["predicted_upper"])
bg_eff  = to_series(bg["point_effect"])

BSTS_TS = pd.to_datetime(BSTS_TREATMENT_DATE)
all_vals = pd.concat([bg_obs.dropna(), bg_pred.dropna()])
y_lo = float(all_vals.min()) - 4
y_hi = float(all_vals.max()) + 4

fig, axes = plt.subplots(2, 1, figsize=(11, 8))

# Panel A — observed vs predicted
ax = axes[0]
band_mask = bg_lo.notna() & bg_hi.notna()
ax.fill_between(bg_dates[band_mask], bg_lo[band_mask], bg_hi[band_mask],
                alpha=0.25, color=COLOR_SYNTHETIC, label="95% credible band")
ax.plot(bg_dates, bg_obs, color=COLOR_TREATED, linewidth=2.5,
        label="Bihar (actual)", marker="o", markersize=5, zorder=10)
ax.plot(bg_dates, bg_pred, color=COLOR_SYNTHETIC, linewidth=2, linestyle="--",
        label="Posterior mean (counterfactual)", marker="s", markersize=4)
treatment_line(ax, BSTS_TREATMENT_DATE, label="Prohibition\\n(BSTS cutoff)")
ax.axhline(0, color="black", linewidth=0.5, linestyle=":")
ax.set_ylim(y_lo, y_hi)
ax.set_ylabel("NSDP growth (% YoY)")
ax.set_title("BSTS — Bihar Growth vs Bayesian Counterfactual (donor: Odisha)")
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:+.1f}%"))
ax.legend(loc="upper right", fontsize=9)

# Panel B — pointwise effect
ax = axes[1]
eff_mask = bg_eff.notna()
ax.bar(bg_dates[eff_mask], bg_eff[eff_mask], width=300,
       color=["#16a34a" if v >= 0 else "#dc2626" for v in bg_eff[eff_mask]],
       alpha=0.85, edgecolor="black", linewidth=0.4)
ax.axhline(0, color="black", linewidth=0.8)
treatment_line(ax, BSTS_TREATMENT_DATE)
ax.set_ylabel("Pointwise effect (pp)")
ax.set_title("BSTS Posterior Point Effect — Growth Rate")
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:+.1f}pp"))

fig.tight_layout(pad=2)
save_fig(fig, Path("../results/figures/bsts_bihar_growth_main.png"))
plt.show()

post_effs = bg_eff[bg_dates >= BSTS_TS].dropna()
print(f"\\nAvg post effect: {post_effs.mean():+.3f} pp/year")
print(f"Pre-period |effect| (sanity): "
      f"{abs(bg_eff[bg_dates < BSTS_TS].dropna()).mean():.3f} pp")
print(f"p-value: {bg['p_value']}")"""))

nb.cells.append(new_markdown_cell("""## 10. Growth — SCM vs BSTS Comparison

SCM uses the original 2016 treatment date (3 pre-period points, 7 post-period
points). BSTS uses 2017 (4 pre, 6 post). The two estimates therefore disagree
on 2016: SCM treats it as the first post-treatment year (gap = +2.79 pp),
while BSTS folds it into the pre-period."""))

nb.cells.append(new_code_cell("""with open("../api/results/bihar_scm_growth.json") as f:
    sg = json.load(f)

scm_g_dates = pd.to_datetime(sg["dates"])
scm_g_gap = pd.Series(sg["gap"], index=scm_g_dates)

# Align BSTS by year
bsts_g_by_yr = {pd.to_datetime(d).year: e
                for d, e in zip(bg["dates"], bg["point_effect"])
                if e is not None}
bsts_g_aligned = pd.Series(
    [bsts_g_by_yr.get(d.year) for d in scm_g_dates],
    index=scm_g_dates,
)

fig, ax = plt.subplots(figsize=(11, 5))
ax.plot(scm_g_dates, scm_g_gap,
        color=COLOR_TREATED, linewidth=2.5, marker="o", markersize=4,
        label=f"SCM gap (ratio={sg['diagnostics']['rmspe_ratio']:.1f}×)",
        zorder=10)
ax.plot(scm_g_dates, bsts_g_aligned,
        color=COLOR_SYNTHETIC, linewidth=2.5, linestyle="--",
        marker="s", markersize=4,
        label="BSTS point effect (Odisha donor)")
ax.axhline(0, color="black", linewidth=0.8)
treatment_line(ax, "2016-01-01", label="SCM treatment")
ax.axvline(pd.to_datetime("2017-01-01"),
           color="#9CA3AF", linewidth=1, linestyle=":")
ax.text(pd.to_datetime("2017-01-01"), ax.get_ylim()[1] * 0.95,
        "  BSTS treatment", fontsize=8, color="#6b7280", va="top")

all_effs = [v for v in list(scm_g_gap) + list(bsts_g_aligned.dropna())
            if pd.notna(v)]
ax.set_ylim(min(all_effs) * 1.3, max(all_effs) * 1.3)
ax.set_ylabel("Treatment effect (pp)")
ax.set_title("Bihar Prohibition — SCM vs BSTS: Per-Capita Growth Effect")
ax.yaxis.set_major_formatter(
    mticker.FuncFormatter(lambda x, _: f"{x:+.1f}pp")
)
ax.legend(fontsize=9, loc="lower left")
fig.tight_layout()
save_fig(fig, Path("../results/figures/scm_vs_bsts_growth.png"))
plt.show()

print(f"SCM avg post effect (2016-2022): {sg['diagnostics']['avg_post_effect']:+.2f} pp/yr")
print(f"BSTS avg post effect (2017-2022): {bsts_g_aligned.dropna().mean():+.2f} pp/yr")"""))

nb.cells.append(new_markdown_cell("""### Cross-method takeaway for growth

Both methods point in the same direction — Bihar's per-capita growth lagged
its synthetic / Bayesian counterfactual after prohibition. SCM gives an
average gap of **−3.0 pp/year** (rank 6/14, p ≈ 0.43). BSTS gives **−4.3
pp/year** with a tight credible interval, but only because the model is
constrained to a single-donor regression — the credible interval reflects
posterior uncertainty given that constraint, not the deeper uncertainty
about model specification.

The honest summary is: **two complementary estimators agree on direction
and rough magnitude, but neither produces statistically firm evidence of a
causal effect on growth.** This is what we would expect ex-ante for an
outcome where Bihar entered prohibition with rapid catch-up dynamics and
the post-period was disrupted by COVID — the data is too noisy and too
short to settle the question."""))

nbformat.write(nb, open(nb_path, "w"))
print(f"✅ Appended {6} cells to {nb_path} (now {len(nb.cells)} total)")
