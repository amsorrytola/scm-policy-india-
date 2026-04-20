"""
api/services/scm_service.py
Loads Bihar data and runs SCM on demand.
"""

import sys, json
from pathlib import Path
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from src.scm import SCMAnalysis

DATA_DIR    = ROOT / "data" / "processed"
RESULTS_DIR = Path(__file__).resolve().parents[1] / "results"

# ── Bihar config (single case study) ──────────────────────────────────────────
BIHAR_CONFIG = {
    "case_id"       : "bihar",
    "title"         : "Bihar Prohibition (April 2016)",
    "description"   : (
        "Bihar enacted total prohibition on alcohol sales effective April 5, 2016. "
        "We estimate causal impact on road accident deaths and own tax revenue "
        "using a synthetic control built from 13 Indian donor states."
    ),
    "treatment_date": "2016-01-01",
    "treated_unit"  : "Bihar",
    "default_donors": [
        "Andhra Pradesh", "Haryana", "Jharkhand", "Karnataka", "Kerala",
        "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan",
        "Tamil Nadu", "Uttar Pradesh", "West Bengal",
    ],
    "all_donors"    : [
        "Andhra Pradesh", "Haryana", "Jharkhand", "Karnataka", "Kerala",
        "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan",
        "Tamil Nadu", "Uttar Pradesh", "West Bengal",
    ],
    "default_predictors" : [
        "nsdp_pc_current_inr", "urban_share_pct", "literacy_rate_pct"
    ],
    "available_predictors": [
        "nsdp_pc_current_inr", "urban_share_pct", "literacy_rate_pct"
    ],
    "primary_outcome"  : "road_accident_deaths",
    "secondary_outcome": "own_tax_revenue_cr",
    "available_outcomes": [
        "road_accident_deaths", "own_tax_revenue_cr", "nsdp_growth_yoy",
    ],
    "outcome_labels"   : {
        "road_accident_deaths": "Road accident deaths (MoRTH)",
        "own_tax_revenue_cr"  : "Own tax revenue — ₹ Crore (RBI T168)",
        "nsdp_growth_yoy"     : "NSDP per-capita YoY growth (%)",
    },
    "pre_period_start": "2012-01-01",
    "pre_period_end"  : "2015-01-01",
    "post_period_end" : "2022-01-01",
    "source_note"     : (
        "Road accidents: MoRTH 'Road Accidents in India' annual PDFs (camelot extraction). "
        "Own tax revenue: RBI Handbook T168. NSDP: RBI Handbook T19. "
        "Urban share / literacy: Census 2011 + interpolation."
    ),
}


def get_panel() -> pd.DataFrame:
    return pd.read_csv(
        DATA_DIR / "bihar_panel.csv", parse_dates=["date"]
    )


def get_precomputed(result_type: str = "scm") -> dict:
    """
    result_type: "scm" | "bsts" | "scm_tax" | "bsts_tax"
    """
    fname_map = {
        "scm"        : "bihar_scm.json",
        "bsts"       : "bihar_bsts.json",
        "scm_tax"    : "bihar_scm_tax.json",
        "bsts_tax"   : "bihar_bsts_tax.json",
        "scm_growth" : "bihar_scm_growth.json",
    }
    if result_type not in fname_map:
        raise ValueError(f"Unknown result_type: {result_type}. "
                         f"Choose from {list(fname_map)}")
    path = RESULTS_DIR / fname_map[result_type]
    if not path.exists():
        raise FileNotFoundError(f"Precomputed result not found: {path}")
    return json.loads(path.read_text())


def refit_scm(donor_pool: list, predictors: list,
              outcome: str = None) -> dict:
    """Live SCM refit with user-chosen donors and predictors."""
    panel = get_panel()
    panel_match = panel[panel["date"] >= "2012-01-01"].copy()

    cfg     = BIHAR_CONFIG
    outcome = outcome or cfg["primary_outcome"]

    # Validate inputs
    available = set(cfg["all_donors"])
    invalid   = set(donor_pool) - available
    if invalid:
        raise ValueError(f"Unknown donors: {invalid}. "
                         f"Valid: {sorted(available)}")
    if len(donor_pool) < 2:
        raise ValueError("Need at least 2 donors")

    invalid_p = set(predictors) - set(cfg["available_predictors"])
    if invalid_p:
        raise ValueError(f"Unknown predictors: {invalid_p}")

    # Build special predictors (lagged outcomes — required for level matching)
    pre_dates = sorted([
        d for d in panel_match["date"].unique()
        if d < pd.to_datetime(cfg["treatment_date"])
    ])
    special_preds = [(outcome, [yr], "mean") for yr in pre_dates]

    scm = SCMAnalysis(
        panel_df           = panel_match,
        treated_unit       = cfg["treated_unit"],
        donor_pool         = donor_pool,
        predictors         = predictors,
        outcome            = outcome,
        treatment_date     = cfg["treatment_date"],
        special_predictors = special_preds,
    )
    scm.fit()
    return scm.to_json()


def get_case_metadata() -> dict:
    """Return Bihar case metadata for the frontend."""
    return BIHAR_CONFIG
