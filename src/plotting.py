"""
src/plotting.py
Shared plotting utilities for the SCM + BSTS project.
Publication style: Financial Times / Economist aesthetic.
"""

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np

# ── Colour palette ─────────────────────────────────────────────────────────────
COLOR_TREATED   = "#0F4C81"   # deep navy  — treated unit
COLOR_SYNTHETIC = "#F4A261"   # warm amber — synthetic control
COLOR_DONORS    = "#9CA3AF"   # neutral gray — individual donors
COLOR_PLACEBO   = "#D1D5DB"   # light gray — placebo lines
COLOR_ZERO      = "#374151"   # near-black — zero/reference lines

# ── Publication style ──────────────────────────────────────────────────────────
def set_publication_style():
    plt.rcParams.update({
        "font.family":        "DejaVu Serif",
        "font.size":          11,
        "axes.titlesize":     13,
        "axes.titleweight":   "bold",
        "axes.labelsize":     11,
        "axes.spines.top":    False,
        "axes.spines.right":  False,
        "axes.grid":          True,
        "grid.alpha":         0.3,
        "grid.linestyle":     "--",
        "lines.linewidth":    2.0,
        "figure.dpi":         150,
        "savefig.dpi":        300,
        "savefig.bbox":       "tight",
        "legend.frameon":     False,
        "legend.fontsize":    10,
    })

def treatment_line(ax, date, label="Treatment", color="#DC2626", ypos=0.97):
    """Draw a vertical dashed treatment line with annotation."""
    ax.axvline(pd.to_datetime(date), color=color, linewidth=1.5,
               linestyle="--", zorder=5)
    ax.annotate(label,
                xy=(pd.to_datetime(date), ax.get_ylim()[1] * ypos),
                xytext=(8, 0), textcoords="offset points",
                fontsize=9, color=color, va="top")

def save_fig(fig, path):
    """Save figure at 300 DPI with tight layout."""
    from pathlib import Path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=300, bbox_inches="tight")
    print(f"  Saved: {path}")

# need this import inside the module
import pandas as pd
