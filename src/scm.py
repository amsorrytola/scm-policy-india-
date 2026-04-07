"""
src/scm.py
Synthetic Control Method analysis class.
Backend: pysyncon library.
"""

import json
import warnings
import pandas as pd
import numpy as np
from pathlib import Path

warnings.filterwarnings("ignore")

try:
    from pysyncon import Dataprep, Synth
except ImportError:
    raise ImportError("Install pysyncon: pip install pysyncon")


class SCMAnalysis:
    """
    Wrapper around pysyncon to run SCM with a clean API
    suitable for notebooks and the FastAPI backend.
    """

    def __init__(self, panel_df, treated_unit, donor_pool, predictors,
                 outcome, treatment_date, time_col="date", unit_col="unit",
                 special_predictors=None):
        self.panel = panel_df.copy()
        self.panel[time_col] = pd.to_datetime(self.panel[time_col])
        self.treated_unit   = treated_unit
        self.donor_pool     = donor_pool
        self.predictors     = predictors
        self.special_predictors = special_predictors  # list of (var, [time...], op) tuples
        self.outcome        = outcome
        self.treatment_date = pd.to_datetime(treatment_date)
        self.time_col       = time_col
        self.unit_col       = unit_col

        self.pre_dates  = sorted(self.panel.loc[
            self.panel[time_col] < self.treatment_date, time_col].unique())
        self.post_dates = sorted(self.panel.loc[
            self.panel[time_col] >= self.treatment_date, time_col].unique())

        self._fitted        = False
        self.synth          = None
        self.dataprep       = None
        self.weights_       = None      # dict {donor: weight}
        self.synthetic_     = None      # pd.Series indexed by date
        self.gap_           = None      # pd.Series indexed by date
        self.placebo_gaps_  = None      # dict {donor: pd.Series}

    # ── Fit ───────────────────────────────────────────────────────────────────
    def fit(self):
        dp_kwargs = dict(
            foo                  = self.panel,
            predictors           = self.predictors,
            predictors_op        = "mean",
            time_predictors_prior= self.pre_dates,
            dependent            = self.outcome,
            unit_variable        = self.unit_col,
            time_variable        = self.time_col,
            treatment_identifier = self.treated_unit,
            controls_identifier  = self.donor_pool,
            time_optimize_ssr    = self.pre_dates,
        )
        if self.special_predictors:
            dp_kwargs["special_predictors"] = self.special_predictors
        self.dataprep = Dataprep(**dp_kwargs)
        self.synth = Synth()
        self.synth.fit(dataprep=self.dataprep)

        # Extract weights — pysyncon returns either Series or 1-col DataFrame
        w = self.synth.weights()
        if isinstance(w, pd.Series):
            self.weights_ = w.to_dict()
        else:
            self.weights_ = w.iloc[:, 0].to_dict()

        self._compute_synthetic()
        self._fitted = True
        return self

    def _compute_synthetic(self):
        donors_wide = (
            self.panel[self.panel[self.unit_col].isin(self.donor_pool)]
            .pivot(index=self.time_col, columns=self.unit_col, values=self.outcome)
        )
        w = pd.Series(self.weights_).reindex(donors_wide.columns).fillna(0)
        self.synthetic_ = donors_wide.dot(w).rename("synthetic")

        treated_s = (
            self.panel[self.panel[self.unit_col] == self.treated_unit]
            .set_index(self.time_col)[self.outcome]
        )
        self.gap_ = treated_s - self.synthetic_

    # ── Diagnostics ───────────────────────────────────────────────────────────
    def pre_rmspe(self):
        pre = self.gap_[self.gap_.index < self.treatment_date]
        return float(np.sqrt((pre ** 2).mean()))

    def post_rmspe(self):
        post = self.gap_[self.gap_.index >= self.treatment_date]
        return float(np.sqrt((post ** 2).mean()))

    def rmspe_ratio(self):
        pre = self.pre_rmspe()
        return self.post_rmspe() / pre if pre > 0 else float("inf")

    def avg_post_effect(self):
        """Average treatment effect over post-treatment period."""
        post = self.gap_[self.gap_.index >= self.treatment_date]
        return float(post.mean())

    # ── Placebo tests ─────────────────────────────────────────────────────────
    def placebo_test(self):
        """
        In-space placebo: refit SCM treating each donor as 'treated'.
        Returns dict {donor_name: gap_series}.
        """
        results = {}
        for fake_treated in self.donor_pool:
            fake_donors = [u for u in self.donor_pool if u != fake_treated]
            try:
                placebo = SCMAnalysis(
                    self.panel, fake_treated, fake_donors,
                    self.predictors, self.outcome, self.treatment_date,
                    self.time_col, self.unit_col,
                    special_predictors=self.special_predictors,
                )
                placebo.fit()
                results[fake_treated] = placebo.gap_
            except Exception as e:
                print(f"  Placebo {fake_treated} failed: {e}")
        self.placebo_gaps_ = results
        return results

    def leave_one_out(self):
        """
        Refit SCM dropping each donor in turn.
        Returns dict {excluded_donor: synthetic_series}.
        """
        results = {}
        for excluded in self.donor_pool:
            reduced = [u for u in self.donor_pool if u != excluded]
            try:
                loo = SCMAnalysis(
                    self.panel, self.treated_unit, reduced,
                    self.predictors, self.outcome, self.treatment_date,
                    self.time_col, self.unit_col,
                    special_predictors=self.special_predictors,
                )
                loo.fit()
                results[excluded] = loo.synthetic_
            except Exception as e:
                print(f"  LOO drop-{excluded} failed: {e}")
        return results

    # ── Serialisation ─────────────────────────────────────────────────────────
    def to_json(self) -> dict:
        if not self._fitted:
            raise RuntimeError("Call fit() first")

        treated_s = (
            self.panel[self.panel[self.unit_col] == self.treated_unit]
            .set_index(self.time_col)[self.outcome]
            .sort_index()
        )

        out = {
            "case_meta": {
                "treated_unit"  : self.treated_unit,
                "donor_pool"    : self.donor_pool,
                "predictors"    : self.predictors,
                "outcome"       : self.outcome,
                "treatment_date": self.treatment_date.isoformat(),
            },
            "dates"            : [d.isoformat() for d in treated_s.index],
            "treated_outcome"  : treated_s.tolist(),
            "synthetic_outcome": self.synthetic_.reindex(treated_s.index).tolist(),
            "gap"              : self.gap_.reindex(treated_s.index).tolist(),
            "weights"          : {k: round(float(v), 6)
                                  for k, v in self.weights_.items()},
            "diagnostics": {
                "pre_rmspe"    : round(self.pre_rmspe(), 4),
                "post_rmspe"   : round(self.post_rmspe(), 4),
                "rmspe_ratio"  : round(self.rmspe_ratio(), 4),
                "avg_post_effect": round(self.avg_post_effect(), 4),
                "n_pre"        : len(self.pre_dates),
                "n_post"       : len(self.post_dates),
                "n_donors"     : len(self.donor_pool),
            },
        }

        if self.placebo_gaps_ is not None:
            out["placebo_gaps"] = {
                k: v.reindex(treated_s.index).tolist()
                for k, v in self.placebo_gaps_.items()
            }
            out["placebo_rmspe_ratios"] = {}
            for donor, gap_s in self.placebo_gaps_.items():
                pre  = gap_s[gap_s.index < self.treatment_date]
                post = gap_s[gap_s.index >= self.treatment_date]
                pre_r  = float(np.sqrt((pre**2).mean())) if len(pre) > 0 else None
                post_r = float(np.sqrt((post**2).mean())) if len(post) > 0 else None
                ratio  = (post_r / pre_r) if (pre_r and pre_r > 0) else None
                out["placebo_rmspe_ratios"][donor] = round(ratio, 4) if ratio else None

        return out

    def save_json(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.to_json(), f, indent=2, default=str)
        print(f"  Saved JSON: {path}")
