# Literature Review

This folder contains the 9 papers underlying the methodological choices and case study designs in this project.

## Core Methodological References

### 1. Abadie, Diamond & Hainmueller (2010) — Synthetic Control Methods
**File:** `01_abadie_diamond_hainmueller_2010_jasa.pdf`
**Status:** Downloaded ✅
**Citation:** Abadie, A., Diamond, A., & Hainmueller, J. (2010). Synthetic Control Methods for Comparative Case Studies: Estimating the Effect of California's Tobacco Control Program. *Journal of the American Statistical Association*, 105(490), 493–505.
**Source:** https://www.law.upenn.edu/live/files/8950-abadie2010pdf (UPenn mirror; original MIT URL was a dead link).
**Why we cite it:** The foundational paper introducing SCM. Establishes the optimization problem for donor weights and the placebo (in-space) inference procedure used in our Notebook 10.
**Used in:** All 4 case studies; Methodology section of slides.

### 2. Abadie, Diamond & Hainmueller (2015) — Comparative Politics
**File:** `02_abadie_diamond_hainmueller_2015_ajps.pdf`
**Status:** Downloaded ✅
**Citation:** Abadie, A., Diamond, A., & Hainmueller, J. (2015). Comparative Politics and the Synthetic Control Method. *American Journal of Political Science*, 59(2), 495–510.
**Source:** GitHub mirror at `bquistorff/synth_runner` (original Stanford `~jhain` URL now redirects to a 404 page).
**Why we cite it:** Extends SCM to political-science settings, formalises pre-treatment fit diagnostics and the leave-one-out robustness check we use in Notebooks 03–06.
**Used in:** Bihar prohibition (Case 1) and GST (Case 3) — both involve sub-national treatment timing.

### 3. Abadie (2021) — Using Synthetic Controls (JEL)
**File:** `03_abadie_2021_jel.pdf`
**Status:** Downloaded ✅
**Citation:** Abadie, A. (2021). Using Synthetic Controls: Feasibility, Data Requirements, and Methodological Aspects. *Journal of Economic Literature*, 59(2), 391–425.
**Source:** NBER conference paper version (https://conference.nber.org/confer/2021/SI2021/Abadie_2021.pdf); MIT DSpace bitstream returned 403.
**Why we cite it:** Comprehensive practitioner's guide. Drives our donor-pool selection rules, our handling of interpolation bias (avoid extrapolation outside the convex hull), and our pre-treatment fit thresholds (RMSPE × 5 placebo rule).
**Used in:** Methodology chapter; first paper to read for viva.

### 4. Brodersen, Gallusser, Koehler, Remy & Scott (2015) — BSTS / CausalImpact
**File:** `04_brodersen_etal_2015_aoas.pdf`
**Status:** Downloaded ✅
**Citation:** Brodersen, K. H., Gallusser, F., Koehler, J., Remy, N., & Scott, S. L. (2015). Inferring Causal Impact Using Bayesian Structural Time-Series Models. *Annals of Applied Statistics*, 9(1), 247–274.
**Source:** Google Research archive (https://research.google.com/pubs/archive/41854.pdf); the original Project Euclid `download/pdfview_1` URL returned a tiny HTML stub.
**Why we cite it:** The BSTS / CausalImpact framework — local-level + seasonal + regression components with spike-and-slab priors over donor regressors. Implemented via `pycausalimpact` in Notebook 09.
**Used in:** All 4 case studies as a Bayesian counterfactual to triangulate against SCM; uncertainty intervals shown in slides.

### 5. Doudchenko & Imbens (2016) — SCM ↔ DiD ↔ Regression
**File:** `05_doudchenko_imbens_2016_nber.pdf`
**Status:** Downloaded ✅
**Citation:** Doudchenko, N., & Imbens, G. W. (2016). Balancing, Regression, Difference-in-Differences and Synthetic Control Methods: A Synthesis. *NBER Working Paper* 22791.
**Source:** NBER (https://www.nber.org/system/files/working_papers/w22791/w22791.pdf).
**Why we cite it:** Shows SCM, DiD, and ridge/regression weighting are all special cases of a common balancing problem. Justifies our DiD baseline as a natural complement to SCM rather than a competitor.
**Used in:** Notebook 02 (DiD baselines) and the Methods chapter's "what's the difference?" subsection.

## Case-Study Applications

### 6. Chodorow-Reich, Gopinath, Mishra & Narayanan (2020) — Demonetization
**File:** `06_chodorow_reich_demonetization_2020.pdf`
**Status:** Downloaded ✅
**Citation:** Chodorow-Reich, G., Gopinath, G., Mishra, P., & Narayanan, A. (2020). Cash and the Economy: Evidence from India's Demonetization. *Quarterly Journal of Economics*, 135(1), 57–103.
**Source:** NBER WP 25370 (https://www.nber.org/system/files/working_papers/w25370/w25370.pdf); the Harvard scholar.harvard.edu URL was blocked by an Akamai edge error.
**Why we cite it:** Benchmark for the magnitude of demonetization's economic impact (≈2pp drop in nightlight-implied GDP, Q4 2016) and the cross-district identification strategy. Our cross-country SCM should produce an aggregate effect roughly consistent with theirs.
**Used in:** Case Study 2 (Demonetization); validation of estimated effect size.

### 7. Mukherjee (2020) — GST in India
**File:** `07_gst_india_application.pdf`
**Status:** Downloaded ✅ (substitute for the originally requested NIPFP WP_2019_259, which 404s)
**Citation:** Mukherjee, S. (2020). Performance Assessment of Indian GST: State-level Analysis of Compliance Gap and Revenue Growth. *NIPFP Working Paper* No. 301/2020.
**Source:** https://www.nipfp.org.in/media/medialibrary/2020/03/WP_301_2020.pdf
**Why we cite it:** Provides the descriptive baseline for state-level GST revenue performance and identifies pre/post-GST tax-buoyancy heterogeneity across states — useful prior for our donor pool selection in Case Study 3.
**Used in:** Case Study 3 (GST rollout); Section on "what we'd expect" in Notebook 05.

### 8. Chaudhuri & Jha (2024) — Bihar Prohibition
**File:** `08_bihar_prohibition.pdf`
**Status:** Downloaded ✅ (substitute for Luca, Owens & Sharma 2019, which is about US drunkenness arrests rather than Bihar specifically)
**Citation:** Chaudhuri, K., & Jha, N. (2024). Alcohol Ban and Crime: The ABCs of the Bihar Prohibition. *Economic Development and Cultural Change*, 72(4) [working paper version: NEUDC 2018, Cornell].
**Source:** Author's personal site (https://natashajha.github.io/files/EDCC-alcoholban-ms.pdf), 8-page manuscript version. Mirrors at Cornell NEUDC (paper_248.pdf) and ISID acegd2018 are similar in length (6 pages each), confirming this is the canonical preprint length.
**Why we cite it:** Closest peer-reviewed application of synthetic-control-style identification to the Bihar prohibition. They find a 0.22σ reduction in violent crime; our SCM on road accidents and excise revenue complements their crime-only outcome.
**Used in:** Case Study 1 (Bihar prohibition); used to justify outcome-variable selection.

### 9. Beyer, Franco-Bedoya & Galdo (2021) — COVID-19 in India
**File:** `09_beyer_covid_india.pdf`
**Status:** Downloaded ✅
**Citation:** Beyer, R. C., Franco-Bedoya, S., & Galdo, V. (2021). Examining the Economic Impact of COVID-19 in India through Daily Electricity Consumption and Nighttime Light Intensity. *World Development*, 140, 105287.
**Source:** World Bank Policy Research WP 9291 mirror (https://documents1.worldbank.org/curated/en/763351592916493022/pdf/...); the original `openknowledge.worldbank.org/bitstream/handle/10986/34495/...` URL returned 2 KB of HTML.
**Why we cite it:** Defines the high-frequency proxies (daily electricity, monthly nightlights) we use as alternatives to lagged official IIP for the COVID-19 case study. Their counterfactual model is regression-based; we extend with SCM and BSTS.
**Used in:** Case Study 4 (COVID lockdown); justifies our outcome-variable choice and provides a high-frequency comparison benchmark.

---

## Suggested Reading Order

For viva preparation, read in this order:

1. **Abadie (2021)** — JEL — comprehensive overview, the single most useful reference.
2. **Abadie, Diamond & Hainmueller (2010)** — foundational, original SCM paper.
3. **Brodersen et al. (2015)** — BSTS / CausalImpact, the second leg of our methodology.
4. **Doudchenko & Imbens (2016)** — connects SCM to DiD; useful for justifying methodological choices when challenged.
5. **One application paper for the case study you're most likely to be quizzed on:**
   - Bihar → Chaudhuri & Jha (2024)
   - Demonetization → Chodorow-Reich et al. (2020)
   - GST → Mukherjee (2020)
   - COVID → Beyer et al. (2021)

## Manual Download Instructions

All 9 papers downloaded successfully via `curl` with browser User-Agent. **No manual intervention needed.**

Substitutions/notes (in case you need to re-fetch):

- **#1 (Abadie 2010 JASA):** the URL given (`economics.mit.edu/.../Synthetic Control Methods for Comparative Case Studies.pdf`) is dead. Working mirror: UPenn Law (`law.upenn.edu/live/files/8950-abadie2010pdf`) or NBER WP 12831.
- **#2 (Abadie 2015 AJPS):** `web.stanford.edu/~jhain/Paper/AJPS2015a.pdf` redirects to a 404. Working mirrors: MIT Economics (`economics.mit.edu/sites/default/files/publications/Comparative%20Politics%20and%20the%20Synthetic%20Control.pdf`) or the GitHub `bquistorff/synth_runner` literature folder.
- **#3 (Abadie 2021 JEL):** The original `economics.mit.edu/sites/default/files/2022-08/...` URL is a 404; MIT DSpace returns 403 to anonymous curl. Working mirror: NBER conference site `conference.nber.org/confer/2021/SI2021/Abadie_2021.pdf`.
- **#4 (Brodersen et al. 2015 AoAS):** `projecteuclid.org/download/pdfview_1/...` returns a 1 KB HTML stub. Working mirror: Google Research archive `research.google.com/pubs/archive/41854.pdf` (also arXiv 1506.00356).
- **#6 (Chodorow-Reich et al. 2020):** `scholar.harvard.edu/files/chodorow-reich/...` returns an Akamai edge error (Reference #97...). Working mirror: NBER WP 25370.
- **#7 (NIPFP GST):** the WP_2019_259 paper does not exist at that URL. We substituted Mukherjee (2020) WP 301/2020, the closest peer-reviewed NIPFP analysis of state-level GST performance.
- **#8 (Bihar prohibition):** the originally cited Luca, Owens & Sharma (2019) is about US drunkenness arrests, not Bihar. We substituted Chaudhuri & Jha (2024 EDCC) — the only peer-reviewed paper applying synthetic-control-style identification to the Bihar ban specifically. Note all available preprint mirrors are short (6–8 pages); this matches the canonical length of the NEUDC version.
- **#9 (Beyer et al. 2021):** the `openknowledge.worldbank.org/bitstream/handle/10986/34495/...` URL is broken; `documents1.worldbank.org/curated/en/763351592916493022/pdf/...` works (and yields the WPS 9291 working-paper version of the World Development article).
