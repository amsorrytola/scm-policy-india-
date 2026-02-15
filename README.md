# Causal Impact of Major Indian Policy Interventions

### A Synthetic Control & Bayesian Structural Time Series Analysis

> Empirical Time Series Project | IIT Roorkee | Supervisor: Prof. Abhishek Samantray

[Live Website](URL_PLACEHOLDER) · [Presentation (PDF)](presentation/slides.pdf) · [GitHub](URL_PLACEHOLDER)

## Abstract

This project applies Synthetic Control Method (Abadie, Diamond & Hainmueller 2010, 2015) and Bayesian Structural Time Series (Brodersen et al. 2015) to estimate the causal effect of four major Indian policy interventions on relevant economic and social outcomes.

## Case Studies

| # | Policy | Date | Outcomes | Donor Pool |
|---|--------|------|----------|------------|
| 1 | Bihar Prohibition | Apr 2016 | Road accidents, crime, excise revenue | 14 Indian states |
| 2 | Demonetization | Nov 2016 | GDP, money supply, IIP | 10 emerging markets |
| 3 | GST Rollout | Jul 2017 | State tax revenue, IIP, CPI | Indian states |
| 4 | COVID-19 Lockdown | Mar 2020 | IIP, unemployment, mobility | EM + low-stringency |

## Methods

- **Synthetic Control Method (SCM)** — Abadie's optimization for donor weights
- **Bayesian Structural Time Series (BSTS)** — Google's CausalImpact
- **Difference-in-Differences (DiD)** — Two-way fixed effects baseline

## Repository Structure

```
scm-policy-india/
├── papers/              # Reference papers and literature
├── data/
│   ├── raw/             # Original downloads (gitignored)
│   │   ├── bihar/
│   │   ├── demonetization/
│   │   ├── gst/
│   │   └── covid/
│   └── processed/       # Cleaned analysis-ready datasets
├── notebooks/           # Jupyter notebooks 01–10 (analysis pipeline)
├── src/                 # Reusable Python modules (SCM, BSTS, DiD helpers)
├── api/                 # FastAPI backend
│   ├── routers/         # Endpoint route definitions
│   ├── services/        # Business logic / model loading
│   └── results/         # Cached model outputs served by API
├── web/                 # Next.js frontend (interactive results dashboard)
├── presentation/
│   └── figures/         # Slide-ready figures
├── results/
│   ├── figures/         # Final paper figures (PNG/PDF)
│   ├── tables/          # LaTeX/CSV tables
│   └── logs/            # Run logs
├── scripts/             # One-off data-fetching / pipeline scripts
└── .github/workflows/   # CI configuration
```

## Reproduction Steps

```bash
# 1. Clone
git clone <repo-url>
cd scm-policy-india

# 2. Set up Python env (3.10 or 3.11 required)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Re-run analysis (notebooks 01-10 in order)
jupyter lab notebooks/

# 4. Run backend
cd api && uvicorn main:app --reload

# 5. Run frontend
cd web && npm install && npm run dev
```

## Author

[YOUR NAME] — [YOUR EMAIL] — Department of Economics, IIT Roorkee

## License

MIT
