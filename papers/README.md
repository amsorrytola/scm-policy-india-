# Literature Review

Reference papers for the methodology and case study.

The project was originally scoped as four case studies (Bihar prohibition,
demonetization, GST rollout, COVID lockdown) and the literature
collection reflects that scope: 5 methodological references plus
4 application papers. The analysis ultimately narrowed to **Bihar only**.
The 3 unused application papers are kept on disk as background reading
and are flagged below.

---

## Core Methodological References — used throughout

### 1. Abadie, Diamond & Hainmueller (2010) — Synthetic Control Methods
**File:** `01_abadie_diamond_hainmueller_2010_jasa.pdf`
**Citation:** Abadie, A., Diamond, A., & Hainmueller, J. (2010). Synthetic Control Methods for Comparative Case Studies: Estimating the Effect of California's Tobacco Control Program. *Journal of the American Statistical Association*, 105(490), 493–505.
**Source:** UPenn mirror (`law.upenn.edu/live/files/8950-abadie2010pdf`); original MIT URL was a dead link.
**Why we cite it:** The foundational SCM paper. Establishes the optimization problem for donor weights and the placebo (in-space) inference procedure.
**Used in:** Notebook 05 (main SCM fit), Notebook 10 (in-space placebo). The lagged-outcome `special_predictors` trick we use to anchor Bihar inside the donor convex hull is from §IV of this paper.

### 2. Abadie, Diamond & Hainmueller (2015) — Comparative Politics
**File:** `02_abadie_diamond_hainmueller_2015_ajps.pdf`
**Citation:** Abadie, A., Diamond, A., & Hainmueller, J. (2015). Comparative Politics and the Synthetic Control Method. *American Journal of Political Science*, 59(2), 495–510.
**Source:** GitHub mirror at `bquistorff/synth_runner` (Stanford `~jhain` URL 404s).
**Why we cite it:** Extends SCM to political-science settings, formalises pre-treatment fit diagnostics and the leave-one-out robustness check.
**Used in:** Notebook 05 (LOO refits, see `scm_bihar_loo.png`), Notebook 10 (RMSPE ratio thresholds).

### 3. Abadie (2021) — Using Synthetic Controls (JEL)
**File:** `03_abadie_2021_jel.pdf`
**Citation:** Abadie, A. (2021). Using Synthetic Controls: Feasibility, Data Requirements, and Methodological Aspects. *Journal of Economic Literature*, 59(2), 391–425.
**Source:** NBER conference paper version (`conference.nber.org/confer/2021/SI2021/Abadie_2021.pdf`); MIT DSpace returns 403 to anonymous curl.
**Why we cite it:** Comprehensive practitioner's guide. Drives our donor-pool selection rules, our handling of the convex-hull problem (Bihar lies near the edge on income/urbanization), and the RMSPE × 5 placebo rule.
**Used in:** Methodology chapter of the slides; first paper to read for viva.

### 4. Brodersen, Gallusser, Koehler, Remy & Scott (2015) — BSTS / CausalImpact
**File:** `04_brodersen_etal_2015_aoas.pdf`
**Citation:** Brodersen, K. H., Gallusser, F., Koehler, J., Remy, N., & Scott, S. L. (2015). Inferring Causal Impact Using Bayesian Structural Time-Series Models. *Annals of Applied Statistics*, 9(1), 247–274.
**Source:** Google Research archive (`research.google.com/pubs/archive/41854.pdf`).
**Why we cite it:** The BSTS / CausalImpact framework — local-level + seasonal + regression components with spike-and-slab priors over donor regressors. Implemented via `pycausalimpact` in Notebooks 07 and 09.
**Used in:** All BSTS analyses. §3.2 motivates our `max_donors` restriction (sparse models with short pre-periods).

### 5. Doudchenko & Imbens (2016) — SCM ↔ DiD ↔ Regression
**File:** `05_doudchenko_imbens_2016_nber.pdf`
**Citation:** Doudchenko, N., & Imbens, G. W. (2016). Balancing, Regression, Difference-in-Differences and Synthetic Control Methods: A Synthesis. *NBER Working Paper* 22791.
**Source:** NBER (`nber.org/system/files/working_papers/w22791/w22791.pdf`).
**Why we cite it:** Shows SCM, DiD, and ridge/regression weighting are all special cases of a common balancing problem. Justifies SCM over DiD for our setting (single treated unit, no parallel-trends assumption needed).

---

## Application Paper — Bihar (used)

### 8. Chaudhuri & Jha (2024) — Bihar Prohibition
**File:** `08_bihar_prohibition.pdf`
**Citation:** Chaudhuri, K., & Jha, N. (2024). Alcohol Ban and Crime: The ABCs of the Bihar Prohibition. *Economic Development and Cultural Change*, 72(4) [working paper version: NEUDC 2018, Cornell].
**Source:** Author's personal site (`natashajha.github.io/files/EDCC-alcoholban-ms.pdf`), 8-page manuscript version. Mirrors at Cornell NEUDC (paper_248.pdf) and ISID acegd2018 are similar in length, confirming this is the canonical preprint length.
**Why we cite it:** Closest peer-reviewed application of synthetic-control-style identification to the Bihar prohibition. They find a 0.22σ reduction in violent crime; our SCM on road accidents and own-tax revenue complements their crime-only outcome and adds a third (NSDP per-capita growth).
**Used in:** Outcome-variable selection rationale; cited in the analysis notebooks and in the AI-assistant context for the road-accidents tab.

---

## Background Reading — descoped case studies

The three papers below were collected when the project planned to cover
demonetization, GST, and COVID alongside Bihar. They are kept on disk
for reference but are **not used in the final analysis**. None of their
findings feed into the Bihar results; the citations remain useful if
you want to extend the project later or if a viva question drifts to
those topics.

### 6. Chodorow-Reich, Gopinath, Mishra & Narayanan (2020) — Demonetization *(unused)*
**File:** `06_chodorow_reich_demonetization_2020.pdf`
**Citation:** Chodorow-Reich, G., Gopinath, G., Mishra, P., & Narayanan, A. (2020). Cash and the Economy: Evidence from India's Demonetization. *Quarterly Journal of Economics*, 135(1), 57–103.
**Source:** NBER WP 25370 (`nber.org/system/files/working_papers/w25370/w25370.pdf`).
**Status:** Originally intended for a cross-country demonetization SCM. Case study not implemented.

### 7. Mukherjee (2020) — GST in India *(unused)*
**File:** `07_gst_india_application.pdf`
**Citation:** Mukherjee, S. (2020). Performance Assessment of Indian GST: State-level Analysis of Compliance Gap and Revenue Growth. *NIPFP Working Paper* No. 301/2020.
**Source:** `nipfp.org.in/media/medialibrary/2020/03/WP_301_2020.pdf`.
**Status:** Substitute for a 404'd NIPFP WP_2019_259. Originally intended for a state-level GST rollout SCM. Case study not implemented.

### 9. Beyer, Franco-Bedoya & Galdo (2021) — COVID-19 in India *(unused)*
**File:** `09_beyer_covid_india.pdf`
**Citation:** Beyer, R. C., Franco-Bedoya, S., & Galdo, V. (2021). Examining the Economic Impact of COVID-19 in India through Daily Electricity Consumption and Nighttime Light Intensity. *World Development*, 140, 105287.
**Source:** World Bank Policy Research WP 9291 mirror (`documents1.worldbank.org/curated/en/763351592916493022/pdf/...`).
**Status:** Originally intended for a COVID lockdown SCM with high-frequency outcome proxies. Case study not implemented.

---

## Suggested Reading Order (Bihar-focused)

For viva preparation, in this order:

1. **Abadie (2021)** — single most useful overview.
2. **Abadie, Diamond & Hainmueller (2010)** — foundational SCM paper.
3. **Brodersen et al. (2015)** — BSTS / CausalImpact, the second leg.
4. **Chaudhuri & Jha (2024)** — direct application to Bihar prohibition.
5. **Doudchenko & Imbens (2016)** — connects SCM to DiD; useful when challenged on methodological choice.

---

## Manual Download Notes

All 9 papers downloaded successfully via `curl` with a browser User-Agent.
**No manual intervention needed.** Substitutions / mirror notes (in case
any URL rots):

- **#1 (Abadie 2010 JASA):** `economics.mit.edu/.../Synthetic Control Methods...pdf` is dead. Working: UPenn Law (`law.upenn.edu/live/files/8950-abadie2010pdf`) or NBER WP 12831.
- **#2 (Abadie 2015 AJPS):** `web.stanford.edu/~jhain/Paper/AJPS2015a.pdf` 404s. Working: GitHub `bquistorff/synth_runner` literature folder.
- **#3 (Abadie 2021 JEL):** `economics.mit.edu/sites/default/files/2022-08/...` 404s; MIT DSpace returns 403. Working: `conference.nber.org/confer/2021/SI2021/Abadie_2021.pdf`.
- **#4 (Brodersen et al. 2015):** `projecteuclid.org/download/pdfview_1/...` returns a 1 KB HTML stub. Working: `research.google.com/pubs/archive/41854.pdf` (also arXiv 1506.00356).
- **#6 (Chodorow-Reich et al. 2020):** `scholar.harvard.edu/files/chodorow-reich/...` blocked by Akamai. Working: NBER WP 25370.
- **#7 (NIPFP GST):** WP_2019_259 does not exist. Substituted Mukherjee (2020) WP 301/2020.
- **#8 (Bihar prohibition):** the originally cited Luca, Owens & Sharma (2019) is about US drunkenness arrests, not Bihar. Substituted Chaudhuri & Jha (2024 EDCC). All available preprint mirrors are short (6–8 pages); this matches the canonical NEUDC version length.
- **#9 (Beyer et al. 2021):** `openknowledge.worldbank.org/bitstream/handle/10986/34495/...` is broken. Working: `documents1.worldbank.org/curated/en/763351592916493022/pdf/...` (WPS 9291 working-paper version).
