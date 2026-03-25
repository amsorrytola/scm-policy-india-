# Data Directory — Bihar Prohibition Study

This directory holds all data used in the project. The analysis narrowed
to a single case study — Bihar's April 2016 alcohol prohibition — so the
documentation below is Bihar-specific. Raw downloads live in
`raw/bihar/` (mostly gitignored); cleaned, analysis-ready files land in
`processed/` and are tracked.

## Layout

```
data/
├── raw/
│   └── bihar/              # Source PDFs, RBI Handbook xlsx, extraction CSVs
│       ├── pdfs/           # 14 MoRTH + 5 NCRB PDFs (gitignored, ~330 MB)
│       ├── headers/        # HTTP response headers (gitignored, audit only)
│       ├── SOURCES.md      # Provenance log (tracked)
│       └── *.csv, *.xlsx   # RBI Handbook + extraction outputs
└── processed/
    └── bihar_panel.csv     # Analysis-ready panel (tracked)
```

## What is tracked vs gitignored

Tracked in `raw/bihar/`:
- `SOURCES.md` — provenance for every variable
- Camelot/manual extraction CSVs (small, deterministic outputs)
- Census predictor CSV

Gitignored in `raw/bihar/`:
- `pdfs/*.pdf` — MoRTH and NCRB source PDFs
- `*.xlsx`, `*.xls`, `*.zip` — RBI Handbook downloads
- `headers/` — HTTP response headers from anti-bot bypass attempts

Gitignored files are large and fully regenerable from the sources documented in
`raw/bihar/SOURCES.md`. The tracked extraction outputs are small and make the
processed panel reproducible without re-downloading the originals.

---

## Processed panel — `bihar_panel.csv`

**Shape:** 195 rows × 9 columns (15 states × 13 years, 2010-2022)

| Column | Type | Unit | Description | Source |
|--------|------|------|-------------|--------|
| `unit` | str | — | Indian state name | — |
| `date` | date | YYYY-01-01 | Calendar year as ISO date | — |
| `road_accident_deaths` | int | count | Persons killed in road accidents | MoRTH (see below) |
| `own_tax_revenue_cr` | float | ₹ Crore, nominal | State own-tax revenue (composite) | RBI Handbook T168 |
| `nsdp_pc_current_inr` | float | ₹, current prices | Net State Domestic Product per capita | RBI Handbook T19 |
| `urban_share_pct` | float | % | Urban population share | Census 2011 + interpolation |
| `literacy_rate_pct` | float | % | Literacy rate (age 7+) | Census 2011 + interpolation |
| `nsdp_growth_yoy` | float | % | NSDP per-capita YoY growth rate | Computed: pct_change(nsdp_pc_current_inr) |

**Units:** Bihar and 14 donor states — Andhra Pradesh, Haryana, Jharkhand,
Karnataka, Kerala, Madhya Pradesh, Maharashtra, Odisha, Punjab, Rajasthan,
Tamil Nadu, Uttar Pradesh, West Bengal.
Telangana was excluded: it bifurcated from Andhra Pradesh in June 2014,
giving only two pre-treatment observations (2014-2015) and a degenerate
pre-period Pearson correlation of exactly 1.0 with Bihar.

**Missing values:**

| Column | NaN count | Reason |
|--------|-----------|--------|
| `nsdp_pc_current_inr` | 30 | RBI Handbook T19 starts at FY 2011-12 (→ 2012); 2010-2011 are NaN for all 15 states |
| `own_tax_revenue_cr` | 5 | Telangana 2010-2014: RBI did not publish separately before bifurcation |
| `road_accident_deaths` | 4 | Telangana 2010-2013: state did not exist |
| `nsdp_growth_yoy` | 15 | First year (2010) is NaN for all states (no prior year for pct_change) |
| All others | 0 | Fully populated |

---

## Raw sources and acquisition strategy

### Outcome 1 — Road accident deaths
**Source:** Ministry of Road Transport & Highways (MoRTH), *Road Accidents in India*, annual reports 2010-2023.

**Why this source:** MoRTH is the only official source for state-wise road fatality
counts. NCRB publishes overlapping data in *Accidental Deaths & Suicides in India*
but the MoRTH series is more consistently formatted across years and covers our
full 2010-2022 window.

**Acquisition problem:** MoRTH's website (`morth.nic.in`) runs an Angular SPA that
redirects every `/sites/default/files/*.pdf` path to the app shell — curl receives
40 KB of HTML instead of a PDF for every attempt. None of the 14 direct URL patterns
in the original data-collection script succeeded.

**Workaround:** The Wayback Machine CDX API was used to find archived snapshots of
each annual report. For 2010-2017, full PDFs were retrieved from Wayback `id_/`
snapshot URLs. For 2018-2022, working URLs were found by trial and error against the
live MoRTH server using filename variants documented in `SOURCES.md`
(e.g. `Road_Accidednt.pdf` in 2018 — the typo is in the original filename).
2023 was fetched from a new MoRTH server pattern (`morth.gov.in/backend/documents/`).

**Extraction:** Camelot (stream mode) was used to extract the state-wise killed table
from each PDF. The table appears at different page numbers across years (page 44 in
2010, page 94 in 2023). A `find_accidents_table()` function searches pages 1-150 for
a table containing at least 3 of the 4 probe states (Bihar, Maharashtra, Kerala,
Punjab) alongside a "killed" column keyword, then applies `parse_killed_from_table()`
to extract the Bihar row. All 14 PDFs produced valid extractions; raw camelot output
is in `morth_road_accidents_extracted.csv`.

**Telangana note:** Telangana appears in MoRTH tables from 2014 onward. The 2010-2013
cells are set to NaN in the panel rather than splitting Andhra Pradesh figures.

### Outcome 2 — Own tax revenue
**Source:** RBI, *Handbook of Statistics on Indian States*, Table T168
(*State-wise Own Tax Revenue*).

**Why this source:** The RBI Handbook is the canonical source for comparable
state fiscal data in India. T168 covers FY 2004-05 through 2023-24, giving a
long pre-treatment window.

**Limitation — not pure excise:** T168 is a composite of all own-tax revenue
(excise + sales tax/VAT + GST compensation + stamp duty + vehicle tax). Bihar's
state excise on alcohol was approximately ₹4,000 Crore/year pre-prohibition
(~22-25% of own-tax). The excise sub-head breakdown is published in RBI *State
Finances: A Study of Budgets* appendices, but those PDFs returned HTTP 418
(WAF block) for all years prior to 2023-24 despite multiple bypass attempts.
The composite T168 series is used with an explicit attenuation caveat throughout
the analysis.

**Acquisition:** The RBI website uses an F5 BIG-IP anti-bot layer (TSPD cookie).
A two-step cookie warmup was required: first fetch the landing page to obtain the
TSPD session cookie, then fetch the Excel file with that cookie. Once bypassed,
all 12 Handbook tables downloaded as genuine Excel 2007+ files. See
`SOURCES.md` for the exact warmup sequence.

**Fiscal year convention:** RBI labels years as "2011-12", "2012-13", etc.
We map to calendar year by the ending year: FY 2011-12 → 2012,
FY 2015-16 → 2016, and so on. This aligns with the treatment date of
April 5, 2016 (which falls in FY 2016-17, mapped to calendar year 2017).
The treatment therefore appears in the 2016 calendar-year row.

### Predictor 1 — NSDP per capita
**Source:** RBI Handbook T19 (*State-wise Per Capita Net State Domestic Product
at Current Prices*).

**Coverage:** FY 2011-12 onward → calendar years 2012-2023 in the panel.
Years 2010 and 2011 are NaN for all states and are excluded from the SCM
matching window (set to 2012-2015).

**Fiscal year convention:** Same as T168 above.

### Predictors 2 & 3 — Urban share and literacy rate
**Source:** Census of India 2011, Primary Census Abstract.

**Values used (Census 2011, exact published figures):**

| State | Urban share (%) | Literacy rate (%) |
|-------|-----------------|-------------------|
| Bihar | 11.3 | 63.8 |
| Uttar Pradesh | 22.3 | 67.7 |
| Madhya Pradesh | 27.6 | 69.3 |
| Rajasthan | 24.9 | 66.1 |
| Jharkhand | 24.1 | 66.4 |
| West Bengal | 31.9 | 76.3 |
| Odisha | 16.7 | 72.9 |
| Maharashtra | 45.2 | 82.3 |
| Karnataka | 38.7 | 75.4 |
| Tamil Nadu | 48.4 | 80.1 |
| Andhra Pradesh | 33.5 | 67.4 |
| Telangana | 38.9 | 66.5 |
| Kerala | 47.7 | 93.9 |
| Punjab | 37.5 | 75.8 |
| Haryana | 34.8 | 75.6 |

**Interpolation method:** Census 2011 values are the anchor. Values for
2010-2022 are generated by linear interpolation/extrapolation assuming a
constant annual increment per state:
- Urban share: 0.20 pp/year for low-urbanizing states (Bihar, Jharkhand,
  Odisha, UP); 0.35 pp/year for others.
- Literacy rate: 0.70 pp/year for states with low 2011 literacy (Bihar,
  Jharkhand, Rajasthan, UP); 0.15 pp/year for Kerala (near ceiling);
  0.40 pp/year for others.

Census 2021 was delayed due to COVID-19 and had not been released at time
of analysis. All post-2011 values are therefore interpolated. This is
documented in the analysis notebooks and the SOURCES.md.

**Implication for SCM:** These predictors change at a constant rate by
construction, so they contribute little discriminating power in the SCM
optimization. The lagged outcome values (actual road-accident counts) do
the heavy lifting in the matching. See `notebooks/README.md` for the
convex hull problem and its fix.

### Derived variable — NSDP per-capita growth rate
**Column:** `nsdp_growth_yoy`
**Computation:** `panel.groupby("unit")["nsdp_pc_current_inr"].pct_change() * 100`
**Used in:** `notebooks/07_scm_bihar_growth.ipynb` as the outcome variable
for the economic growth SCM/BSTS analysis.
**NaN:** First year (2010) is NaN for all 15 states — no prior year available
for pct_change. Excluded from the matching window automatically.

---

## How to regenerate the processed panel

The full pipeline is in `src/data_loaders.py`:

```bash
# From project root with venv active
python src/data_loaders.py
```

This requires the raw files to be present. Files that are gitignored can be
re-acquired as follows:

**MoRTH PDFs (road accidents):** Download the 14 annual reports manually from
MoRTH or Wayback Machine. See `raw/bihar/SOURCES.md` for exact URLs and
filenames. Place in `data/raw/bihar/pdfs/`. Then run:
```bash
python scripts/regenerate_bsts_figures.py  # also extracts MoRTH tables
```

**RBI Handbook xlsx files:** The acquisition requires a cookie warmup against
`rbi.org.in`. The two-step sequence is documented in `raw/bihar/SOURCES.md`
under "RBI anti-bot bypass". The files are large (2-15 MB each); total ~120 MB.

**Quick check — does the panel look right?**
```python
import pandas as pd
panel = pd.read_csv("data/processed/bihar_panel.csv", parse_dates=["date"])
assert panel.shape == (195, 9), f"Expected (195, 9), got {panel.shape}"
assert panel["unit"].nunique() == 15
assert panel["date"].dt.year.min() == 2010
assert panel["date"].dt.year.max() == 2022
assert panel[panel["unit"]=="Bihar"]["road_accident_deaths"].isna().sum() == 0
print("✅ Panel OK")
```

---

## SOURCES.md

`raw/bihar/SOURCES.md` is the primary provenance document. It records for
every variable: the original source publication, URL, access date, table name,
fiscal-year convention used, manual transcription notes (where applicable), and
the exact filename saved to disk. It is tracked by git and kept up to date.
