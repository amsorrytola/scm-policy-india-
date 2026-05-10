"""
scripts/patch_bsts_notebook.py
Surgical patch to 3 cells in notebooks/09_bsts_bihar.ipynb that generate
the BSTS figures. Adds outlier-band masking and explicit Y-axis limits so
the 2010 ±300k credible band doesn't crush the chart.

Patches:
  cell[9]  → bsts_bihar_main.png (observed vs predicted + posterior effect)
  cell[13] → bihar_scm_vs_bsts.png (SCM gap vs BSTS effect)
  cell[16] → bsts_bihar_tax.png   (own tax revenue counterfactual)
"""

import nbformat
from pathlib import Path

nb_path = Path("notebooks/09_bsts_bihar.ipynb")
nb = nbformat.read(open(nb_path), as_version=4)

# ── PATCH CELL 9 (bsts_bihar_main.png) ────────────────────────────────────────
nb.cells[9].source = '''inf = bsts.ci.inferences.sort_index()
observed = bsts.ci.data.iloc[:, 0]
dates = pd.to_datetime(bsts._dates)
treatment_dt = pd.to_datetime(TREATMENT_DATE)

fig, axes = plt.subplots(2, 1, figsize=(11, 8))

# Panel A — Observed vs Predicted
ax = axes[0]
pred_mean  = inf["preds"].values
pred_lower = inf["preds_lower"].values
pred_upper = inf["preds_upper"].values

# CRITICAL: mask rows where band is outlier (2010 first-obs artefact)
# Outlier = band width > 50x median width
widths = pred_upper - pred_lower
median_width = float(np.median(widths[widths > 0])) if any(widths > 0) else 1
valid_band = widths <= 50 * median_width

ax.fill_between(dates[valid_band], pred_lower[valid_band], pred_upper[valid_band],
                alpha=0.2, color=COLOR_SYNTHETIC, label="95% credible band")
ax.plot(dates, observed.values,
        color=COLOR_TREATED, linewidth=2.5, label="Bihar (actual)",
        marker="o", markersize=5, zorder=10)
ax.plot(dates, pred_mean,
        color=COLOR_SYNTHETIC, linewidth=2, linestyle="--",
        label="Posterior mean (counterfactual)", marker="s", markersize=4)
treatment_line(ax, TREATMENT_DATE, label="Prohibition\\n(Apr 2016)")
ax.set_ylabel("Road accident deaths")
ax.set_title("BSTS: Bihar vs Bayesian Counterfactual")

# Set Y limits based on actual data — ignore outlier band
all_vals = np.concatenate([observed.values, pred_mean])
y_min = np.nanmin(all_vals) * 0.85
y_max = np.nanmax(all_vals) * 1.15
ax.set_ylim(y_min, y_max)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))
ax.legend(loc="upper left", fontsize=9)
print(f"Panel A Y-range: {y_min:.0f} — {y_max:.0f} deaths")

# Panel B — Pointwise effect
ax = axes[1]
eff       = inf["point_effects"].values
eff_lower = inf["point_effects_lower"].values
eff_upper = inf["point_effects_upper"].values

# Same mask for effect bands
eff_widths = eff_upper - eff_lower
eff_median = float(np.median(eff_widths[eff_widths > 0])) if any(eff_widths > 0) else 1
valid_eff_band = eff_widths <= 50 * eff_median

ax.fill_between(dates[valid_eff_band], eff_lower[valid_eff_band], eff_upper[valid_eff_band],
                alpha=0.2, color=COLOR_TREATED)
ax.plot(dates, eff, color=COLOR_TREATED, linewidth=2)
ax.axhline(0, color="black", linewidth=0.8)
treatment_line(ax, TREATMENT_DATE)
ax.set_ylabel("Pointwise effect (deaths)")
ax.set_title("Posterior Point Effect Estimate")

# Y limits for effect — exclude outlier
eff_abs_max = max(abs(np.nanmin(eff)), abs(np.nanmax(eff))) * 1.3
# Cap at 5x the median absolute effect to exclude 2010 outlier
median_abs_eff = np.median(np.abs(eff[1:]))  # skip first row
cap = max(median_abs_eff * 5, 500)
ax.set_ylim(-min(eff_abs_max, cap), min(eff_abs_max, cap))
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:+,.0f}"))
print(f"Panel B Y-range: {-min(eff_abs_max, cap):.0f} — {min(eff_abs_max, cap):.0f}")

fig.tight_layout(pad=2)
save_fig(fig, RESULTS / "bsts_bihar_main.png")
plt.show()'''

# ── PATCH CELL 13 (bihar_scm_vs_bsts.png) ─────────────────────────────────────
nb.cells[13].source = '''with open("../api/results/bihar_scm.json") as f:
    scm_data = json.load(f)

scm_dates = pd.to_datetime(scm_data["dates"])
scm_gap   = pd.Series(scm_data["gap"], index=scm_dates)
bsts_eff  = pd.Series(inf["point_effects"].values, index=dates)

fig, ax = plt.subplots(figsize=(11, 5))

# BSTS credible band — mask outlier rows
eff_lower = inf["point_effects_lower"].values
eff_upper = inf["point_effects_upper"].values
eff_widths = eff_upper - eff_lower
eff_median = float(np.median(eff_widths[eff_widths > 0])) if any(eff_widths > 0) else 1
valid_band = eff_widths <= 50 * eff_median

ax.fill_between(dates[valid_band], eff_lower[valid_band], eff_upper[valid_band],
                alpha=0.15, color=COLOR_SYNTHETIC, label="BSTS 95% CI")

ax.plot(scm_gap.index, scm_gap,
        color=COLOR_TREATED, linewidth=2.5, linestyle="-",
        label=f"SCM gap (ratio={scm_data['diagnostics']['rmspe_ratio']:.1f}x)",
        marker="o", markersize=4, zorder=10)
ax.plot(bsts_eff.index, bsts_eff,
        color=COLOR_SYNTHETIC, linewidth=2.5, linestyle="--",
        label="BSTS point effect (posterior mean)",
        marker="s", markersize=4)

ax.axhline(0, color="black", linewidth=0.8)
treatment_line(ax, TREATMENT_DATE, label="Prohibition")
ax.set_ylabel("Treatment effect (deaths)")
ax.set_title("Bihar Prohibition — SCM vs BSTS Treatment Effect Estimates")

# Y limits based on valid data only (skip 2010 outlier)
valid_scm  = [v for v in scm_data["gap"] if v is not None]
valid_bsts = list(inf["point_effects"].values[1:])  # skip first row (2010)
all_effs   = valid_scm + valid_bsts
y_abs_max  = max(abs(min(all_effs)), abs(max(all_effs))) * 1.3
ax.set_ylim(-y_abs_max, y_abs_max)
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{x:+,.0f}"))
ax.legend(fontsize=9)
fig.tight_layout()
save_fig(fig, RESULTS / "bihar_scm_vs_bsts.png")
plt.show()
print(f"Y-range: ±{y_abs_max:.0f} deaths")

post_mask_scm  = scm_dates >= pd.to_datetime(TREATMENT_DATE)
post_mask_bsts = dates >= pd.to_datetime(TREATMENT_DATE)
bsts_p = getattr(bsts.ci, "p_value", None)
print("=== Post-treatment averages ===")
print(f"  SCM avg gap     : {scm_gap[post_mask_scm].mean():+.0f} deaths/year")
print(f"  BSTS avg effect : {bsts_eff[post_mask_bsts].mean():+.0f} deaths/year")
print(f"  BSTS p-value    : {bsts_p}")
print(f"  SCM RMSPE ratio : {scm_data['diagnostics']['rmspe_ratio']:.2f}x")
print(f"  SCM p-value     : ~0.071 (permutation, rank 2/14)")'''

# ── PATCH CELL 16 (bsts_bihar_tax.png) ────────────────────────────────────────
nb.cells[16].source = '''inf2     = bsts2.ci.inferences.sort_index()
observed2= bsts2.ci.data.iloc[:, 0]
dates2   = pd.to_datetime(bsts2._dates)

fig, ax = plt.subplots(figsize=(11, 4))

# Mask outlier band rows
tax_lo = inf2["preds_lower"].values
tax_hi = inf2["preds_upper"].values
tax_widths = tax_hi - tax_lo
tax_median = float(np.median(tax_widths[tax_widths > 0])) if any(tax_widths > 0) else 1
valid_tax_band = tax_widths <= 50 * tax_median

ax.fill_between(dates2[valid_tax_band], tax_lo[valid_tax_band], tax_hi[valid_tax_band],
                alpha=0.2, color=COLOR_SYNTHETIC)
ax.plot(dates2, observed2.values,
        color=COLOR_TREATED, linewidth=2.5, label="Bihar actual",
        marker="o", markersize=4, zorder=10)
ax.plot(dates2, inf2["preds"].values,
        color=COLOR_SYNTHETIC, linewidth=2, linestyle="--",
        label="BSTS counterfactual")
treatment_line(ax, TREATMENT_DATE)

# Y limits: based on actual values only
all_tax = np.concatenate([observed2.values, inf2["preds"].values])
tax_min = np.nanmin(all_tax) * 0.85
tax_max = np.nanmax(all_tax) * 1.15
ax.set_ylim(tax_min, tax_max)
ax.set_ylabel("Own tax revenue (₹ Crore)")
ax.set_title("BSTS — Bihar Own Tax Revenue (attenuated proxy for excise)")
ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"₹{x:,.0f}"))
ax.legend()
fig.tight_layout()
save_fig(fig, RESULTS / "bsts_bihar_tax.png")
plt.show()
print(f"Y-range: ₹{tax_min:,.0f} — ₹{tax_max:,.0f} Cr")'''

nbformat.write(nb, open(nb_path, "w"))
print(f"✅ Patched 3 cells in {nb_path}")
print(f"   Cell 9  (bsts_bihar_main.png)    — added valid_band mask + ylim")
print(f"   Cell 13 (bihar_scm_vs_bsts.png)  — added valid_band mask + ylim")
print(f"   Cell 16 (bsts_bihar_tax.png)     — added valid_band mask + ylim")
