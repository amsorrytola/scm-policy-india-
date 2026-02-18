# Data Directory — Data Dictionary

This directory holds all data used in the project. Raw downloads live in `raw/<case-study>/` and are gitignored; cleaned, analysis-ready files land in `processed/` and are tracked.

> **Status:** Placeholder. Column-level descriptions, units, and source URLs will be filled in during **Phase 2 (Data Acquisition & Cleaning)**.

## Layout

```
data/
├── raw/
│   ├── bihar/              # Bihar Prohibition raw downloads
│   ├── demonetization/     # Demonetization raw downloads
│   ├── gst/                # GST rollout raw downloads
│   └── covid/              # COVID-19 lockdown raw downloads
└── processed/              # Cleaned panel datasets (one CSV per case study)
```

Each `raw/<case>/` folder will contain a `SOURCES.md` listing the exact URL, access date, and citation for every file.

---

## Case Study 1 — Bihar Prohibition (April 5, 2016)

**Geography:** State-level | **Frequency:** Annual | **Treated unit:** Bihar | **Donor pool:** 14 other Indian states

| Column | Type | Unit | Description | Source |
|--------|------|------|-------------|--------|
| `state` | str | — | Indian state name | TBD |
| `year` | int | — | Calendar year | TBD |
| `road_accidents` | float | count | Total road accidents | TBD (NCRB / MoRTH) |
| `crime_rate` | float | per 100k | IPC crimes per 100,000 people | TBD (NCRB) |
| `excise_revenue` | float | INR crore | State excise revenue | TBD (RBI / state budgets) |
| ... | | | *(remaining covariates to be specified)* | |

## Case Study 2 — Demonetization (November 8, 2016)

**Geography:** Cross-country | **Frequency:** Quarterly | **Treated unit:** India | **Donor pool:** ~10 emerging markets

| Column | Type | Unit | Description | Source |
|--------|------|------|-------------|--------|
| `country` | str | — | Country name (ISO-3 code in `iso3`) | TBD |
| `quarter` | period | — | Calendar quarter (e.g., 2016Q4) | TBD |
| `gdp_growth` | float | % YoY | Real GDP growth | TBD (World Bank / IMF) |
| `m1` | float | local ccy bn | Narrow money supply | TBD (IMF IFS / RBI) |
| `iip` | float | index | Industrial production index | TBD (OECD / national stat office) |
| ... | | | | |

## Case Study 3 — GST Rollout (July 1, 2017)

**Geography:** State-level | **Frequency:** Quarterly | **Treated unit:** India (national; or per-state pre/post) | **Donor pool:** TBD

| Column | Type | Unit | Description | Source |
|--------|------|------|-------------|--------|
| `state` | str | — | Indian state | TBD |
| `quarter` | period | — | Calendar quarter | TBD |
| `state_tax_revenue` | float | INR crore | State own-tax revenue | TBD (RBI State Finances) |
| `iip` | float | index | State industrial production proxy | TBD |
| `cpi` | float | index | Consumer price index | TBD (MoSPI) |
| ... | | | | |

## Case Study 4 — COVID-19 National Lockdown (March 25, 2020)

**Geography:** National (cross-country) | **Frequency:** Monthly | **Treated unit:** India | **Donor pool:** EMs with low Oxford stringency index during 2020

| Column | Type | Unit | Description | Source |
|--------|------|------|-------------|--------|
| `country` | str | — | Country name | TBD |
| `month` | period | — | YYYY-MM | TBD |
| `iip` | float | index | Industrial production | TBD (OECD MEI) |
| `unemployment` | float | % | Unemployment rate | TBD (CMIE / ILO) |
| `mobility` | float | % vs baseline | Google mobility (retail & recreation) | TBD (Google Community Mobility Reports) |
| `stringency` | float | 0–100 | Oxford COVID-19 Government Response Tracker | TBD (OxCGRT) |
| ... | | | | |

---

## Conventions

- All dates in ISO-8601 (`YYYY-MM-DD`).
- Currency values in real terms where feasible; deflator and base year noted in the relevant `SOURCES.md`.
- Missing values encoded as empty cells (not `NA` strings) in CSVs.
- Each processed CSV has a sibling `<name>.meta.json` describing column types, units, and the build script that produced it.
