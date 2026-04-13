"""
src/bsts.py
Bayesian Structural Time Series analysis class.
Backend: pycausalimpact (Google CausalImpact Python port).
"""

import json
import warnings
import pandas as pd
import numpy as np
from pathlib import Path

warnings.filterwarnings("ignore")

try:
    from causalimpact import CausalImpact
except ImportError:
    raise ImportError("Install pycausalimpact: pip install pycausalimpact")


class BSTSAnalysis:
    """
    Wrapper around pycausalimpact for BSTS-based causal inference.
    Produces posterior counterfactual and credible interval estimates.
    """

    def __init__(self, panel_df, treated_unit, donor_pool, outcome,
                 treatment_date, time_col="date", unit_col="unit"):
        self.panel          = panel_df.copy()
        self.panel[time_col] = pd.to_datetime(self.panel[time_col])
        self.treated_unit   = treated_unit
        self.donor_pool     = donor_pool
        self.outcome        = outcome
        self.treatment_date = pd.to_datetime(treatment_date)
        self.time_col       = time_col
        self.unit_col       = unit_col
        self.ci             = None
        self._fitted        = False

    def _build_wide(self):
        """
        Build wide DataFrame: first column = treated outcome,
        remaining columns = donor outcomes (covariates for regression component).
        """
        wide = self.panel.pivot(
            index=self.time_col, columns=self.unit_col, values=self.outcome
        ).sort_index()

        cols = [self.treated_unit] + [
            c for c in self.donor_pool if c in wide.columns
        ]
        wide = wide[cols].dropna(how="all")

        # Forward-fill any isolated NaNs in donors (minor gaps only)
        wide = wide.ffill().bfill()
        return wide

    def fit(self):
        wide = self._build_wide()
        # Already sorted ascending by date in _build_wide()
        dates = wide.index.tolist()
        self._dates = dates

        # Find treatment index — first date >= treatment_date
        treatment_idx = None
        for i, d in enumerate(dates):
            if pd.to_datetime(d) >= self.treatment_date:
                treatment_idx = i
                break
        if treatment_idx is None:
            raise ValueError("treatment_date is after all dates in panel")
        if treatment_idx < 3:
            raise ValueError(
                f"Only {treatment_idx} pre-treatment periods — "
                "BSTS needs at least 3."
            )

        pre_period  = [0, treatment_idx - 1]
        post_period = [treatment_idx, len(dates) - 1]

        # CausalImpact wants a clean integer-indexed DataFrame
        wide_int = wide.reset_index(drop=True)

        self.ci = CausalImpact(wide_int, pre_period, post_period)
        self._fitted     = True
        self._pre_period = pre_period
        self._post_period = post_period
        return self

    def inferences_sorted(self):
        """
        pycausalimpact returns inferences with index ordered post-period first
        then pre-period (e.g. [5,6,...,12,0,1,2,3,4]). Always re-sort to
        chronological order before extraction.
        """
        return self.ci.inferences.sort_index()

    def summary(self):
        if not self._fitted:
            raise RuntimeError("Call fit() first")
        return self.ci.summary()

    def to_json(self) -> dict:
        if not self._fitted:
            raise RuntimeError("Call fit() first")

        # CRITICAL: sort by index — pycausalimpact returns post-period rows first
        inf = self.inferences_sorted()
        observed = self.ci.data.iloc[:, 0]  # column 0 = treated unit

        # Alignment check
        assert len(inf) == len(self._dates), (
            f"Length mismatch: inferences={len(inf)}, dates={len(self._dates)}"
        )

        date_strs = [pd.Timestamp(d).isoformat() for d in self._dates]
        cols = inf.columns.tolist()
        print(f"  [BSTS] inferences columns: {cols}")

        def get_col(primary: str, *fallbacks: str):
            """Try primary column name, then fallbacks. Return list of None/floats."""
            for name in [primary, *fallbacks]:
                if name in cols:
                    return [
                        None if pd.isna(v) else round(float(v), 4)
                        for v in inf[name]
                    ]
            print(
                f"  [BSTS WARNING] none of "
                f"{[primary, *fallbacks]} found in columns {cols}"
            )
            return [None] * len(inf)

        def safe_list_series(s):
            return [None if pd.isna(v) else round(float(v), 4) for v in s]

        # Extract summary statistics
        try:
            summary_text = self.ci.summary()
        except Exception as e:
            summary_text = f"Summary unavailable: {e}"

        p_val = None
        try:
            p_val = float(self.ci.p_value)
        except Exception:
            pass

        result = {
            "case_meta": {
                "treated_unit"  : self.treated_unit,
                "donor_pool"    : self.donor_pool,
                "outcome"       : self.outcome,
                "treatment_date": self.treatment_date.isoformat(),
                "method"        : "BSTS (CausalImpact)",
                "n_pre"         : self._pre_period[1] - self._pre_period[0] + 1,
                "n_post"        : self._post_period[1] - self._post_period[0] + 1,
            },
            "dates"             : date_strs,
            "observed"          : safe_list_series(observed),
            "predicted_mean"    : get_col("preds", "y_pred", "predicted"),
            "predicted_lower"   : get_col("preds_lower", "y_pred_lower"),
            "predicted_upper"   : get_col("preds_upper", "y_pred_upper"),
            "point_effect"      : get_col("point_effects", "effect"),
            "point_effect_lower": get_col("point_effects_lower", "effect_lower"),
            "point_effect_upper": get_col("point_effects_upper", "effect_upper"),
            "cumulative_effect" : get_col("post_cum_effects", "cum_effects"),
            "summary_text"      : summary_text,
            "p_value"           : p_val,
            "pre_period_idx"    : self._pre_period,
            "post_period_idx"   : self._post_period,
        }

        # ── Outlier-band cleanup at index 0 ──────────────────────────────────
        # pycausalimpact's BSTS produces a wild predictive band at the very
        # first observation (e.g. ±300,000 deaths) because the state-space
        # filter has no prior support — the prior dominates. This distorts
        # any chart's Y-axis. Detect via "band width >> all other bands"
        # and null those values out so the frontend can plot cleanly.
        widths = []
        for lo, hi in zip(result["predicted_lower"], result["predicted_upper"]):
            if lo is None or hi is None:
                widths.append(None)
            else:
                widths.append(hi - lo)
        valid_widths = [w for w in widths if w is not None]
        if valid_widths:
            median_w = float(np.median(valid_widths))
            for i, w in enumerate(widths):
                if w is not None and w > 50 * median_w:
                    print(
                        f"  [BSTS] clipping outlier band at i={i} "
                        f"({date_strs[i][:10]}): width={w:.0f} vs median {median_w:.1f}"
                    )
                    result["predicted_lower"][i]    = None
                    result["predicted_upper"][i]    = None
                    result["point_effect_lower"][i] = None
                    result["point_effect_upper"][i] = None

        # ── Pre-period sanity check ──────────────────────────────────────────
        pre_lo, pre_hi = self._pre_period
        pre_effects = [
            result["point_effect"][i]
            for i in range(pre_lo, pre_hi + 1)
            if result["point_effect"][i] is not None
        ]
        observed_clean = [v for v in result["observed"] if v is not None]
        if pre_effects and observed_clean:
            mean_pre_effect = abs(sum(pre_effects) / len(pre_effects))
            obs_mean = sum(observed_clean) / len(observed_clean)
            if obs_mean > 0:
                pct = mean_pre_effect / obs_mean * 100
                if pct > 10.0:
                    print(
                        f"  [BSTS WARNING] pre-period mean |effect| = "
                        f"{mean_pre_effect:.1f} is {pct:.0f}% of observed mean — "
                        f"pre-period fit may be poor"
                    )
                else:
                    print(
                        f"  [BSTS OK] pre-period |effect| = "
                        f"{mean_pre_effect:.1f} ({pct:.1f}% of obs mean) — "
                        f"looks correct"
                    )

        return result

    def save_json(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_json(), f, indent=2, default=str)
        print(f"  Saved JSON: {path}")
