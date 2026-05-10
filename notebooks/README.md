# Notebooks — Structure, Methodology, and Design Decisions

This document explains why the notebooks are structured the way they are, what methodological problems were encountered during analysis, and how they were resolved. It is meant to be read alongside the notebooks themselves, not instead of them.

---

## Table of Contents

1. [Overview of the notebook pipeline](#1-overview-of-the-notebook-pipeline)
2. [01 — Exploratory Data Analysis](#2-01--exploratory-data-analysis)
3. [05 — SCM: Road Accidents and Own Tax Revenue](#3-05--scm-road-accidents-and-own-tax-revenue)
4. [09 — BSTS: Road Accidents and Own Tax Revenue](#4-09--bsts-road-accidents-and-own-tax-revenue)
5. [10 — Robustness Checks](#5-10--robustness-checks)
6. [07 — SCM + BSTS: NSDP Per-Capita Growth](#6-07--scm--bsts-nsdp-per-capita-growth)
7. [Key methodological decisions across all notebooks](#7-key-methodological-decisions-across-all-notebooks)
8. [Results at a glance](#8-results-at-a-glance)

---

## 1. Overview of the notebook pipeline

```
01_eda_bihar.ipynb          ← Start here. Data audit, visual inspection,
                               design decisions documented.
        ↓
05_scm_bihar.ipynb          ← Primary analysis: SCM on road accidents (primary
                               outcome) and own tax revenue (secondary).
        ↓
09_bsts_bihar.ipynb         ← Complementary analysis: BSTS on the same two
                               outcomes. Cross-method comparison.
        ↓
10_robustness_bihar.ipynb   ← Validity checks: in-time placebos, specification
                               curve, combined results table.
        ↓
07_scm_bihar_growth.ipynb   ← Third outcome: NSDP per-capita growth rate.
                               Both SCM and BSTS in a single notebook.
```

The numbering is deliberate but non-consecutive. Notebooks 02-04 and 06 were reserved for EDA and SCM notebooks for additional case studies (demonetization, GST, COVID) that were descoped when the project narrowed to Bihar only. The gaps are left intentionally rather than renumbered, because the API result files, commit history, and documentation all reference the original numbering.

---

## 2. 01 — Exploratory Data Analysis

**File:** `01_eda_bihar.ipynb`

### What it does

EDA for the Bihar prohibition case: descriptive statistics, outcome trajectories, spaghetti plots across all donors, pre-treatment correlation table, predictor balance, and data quality audit.

### Key design decisions made here

**Telangana is excluded from the donor pool.** Telangana only became a separate state in June 2014, giving it exactly two pre-treatment observations (2014 and 2015). The pre-treatment Pearson correlation with Bihar therefore equals exactly 1.0 by the algebraic constraint that any two-point correlation is ±1 — not evidence of a strong match. Including Telangana in the donor pool would give the SCM optimizer a spuriously perfect pre-treatment fit on a state that is structurally unrelated to Bihar. Excluded.

**The matching window is restricted to 2012–2015.** The RBI Handbook T19 series for NSDP per capita begins at FY 2011-12, which maps to calendar year 2012 under the fiscal-year-ending convention used throughout. Years 2010 and 2011 have NaN NSDP, which would either be dropped (reducing the pre-period to two years) or imputed (which we decline to do for a predictor). The matching window is therefore 2012-2015 — four pre-treatment years — with 2010-2011 retained in the panel for visual inspection only.

**Road accidents show a +44% post-prohibition increase in raw Bihar data.** This is not the treatment effect. The EDA shows that all donor states also experienced rising road deaths during 2016-2022 due to vehicle stock growth. The SCM isolates the prohibition-specific component by constructing a counterfactual Bihar that shares the same vehicle-growth trend. The naive +44% is explicitly flagged in the notebook to prevent misinterpretation.

**Pre-treatment correlation table identifies best donor candidates.** The top five correlated donors on road accident deaths are Haryana (r=0.82), Odisha (r=0.67), West Bengal (r=0.63), Madhya Pradesh (r=0.59), and Jharkhand (r=0.56). However, SCM weights are not determined by correlation alone — the optimization also uses the predictor match. As shown in Notebook 05, the final weights are dominated by Jharkhand (68%), a state with similar low income and urbanization profile to Bihar, rather than Haryana (which correlates well but is economically much richer).

---

## 3. 05 — SCM: Road Accidents and Own Tax Revenue

**File:** `05_scm_bihar.ipynb`

### What it does

Full SCM analysis for the two outcomes available in the base Bihar panel: road accident deaths (primary) and total own tax revenue (secondary). Includes the main treated-vs-synthetic chart, gap plot, placebo inference, leave-one-out robustness, and JSON export for the API.

### The convex hull problem and how we fixed it

The first SCM run without any special predictors placed 100% weight on Uttar Pradesh, giving a pre-period RMSPE of 11,425 deaths — more than twice Bihar's actual level of ~5,100 deaths. This is the failure mode Abadie (2021, JEL §4) calls the **convex hull problem**: Bihar's NSDP per capita and urbanization rate are both roughly 30% of the donor-pool average, placing it near or outside the convex hull of donor predictors. When the optimizer cannot match Bihar's predictor profile, it finds the nearest corner of the feasible set (UP, the largest poor state) and assigns all weight there.

**Fix:** add the pre-treatment outcome series as `special_predictors` in pysyncon's `Dataprep`. This is the standard Abadie/Diamond/Hainmueller (2010, §IV) recommendation: each pre-treatment year's road-accident count becomes an explicit matching target alongside the socioeconomic predictors. Adding four lagged-outcome targets (2012-2015) forces the synthetic control to replicate Bihar's level of ~5,100 deaths per year, not just the predictor profile.

After this fix: pre-period RMSPE dropped from 11,425 to **42.3 deaths** (0.8% of Bihar's mean), and weights distributed across three donors — Jharkhand (68%), Odisha (16%), Uttar Pradesh (16%) — all three low-income, low-urbanization states that Bihar structurally resembles.

### SCM results: road accident deaths

| Metric | Value |
|--------|-------|
| Pre-RMSPE | 42.3 deaths |
| Post-RMSPE | 967.6 deaths |
| RMSPE ratio | **22.87×** |
| Bihar rank (placebo) | **2 of 14** |
| Permutation p-value | **≈ 0.071** |
| Avg post-treatment gap | +360 deaths/year |

The temporal pattern is the most important finding. The gap is **negative in 2016-2017** (prohibition prevents ~600-900 deaths in the first two years) and **positive from 2018 onward** (Bihar exceeds its synthetic counterfactual by growing margins). By 2022 the gap is +1,826 deaths per year. This fading-then-reversal pattern is consistent with Chaudhuri & Jha (2024, *Economic Development and Cultural Change*), who attribute it to illicit alcohol market development and cross-border supply routes that eroded the ban's effectiveness over time.

### SCM results: own tax revenue (secondary, attenuated proxy)

The excise sub-head breakdown is not available in machine-readable form for 2010-2022 (RBI State Finances PDFs go back only to recent years in the API; earlier editions returned HTTP 418 from RBI's WAF). The proxy used is **total own tax revenue** from RBI Handbook T168, of which excise constituted ~22-25% of Bihar's pre-prohibition revenue. This attenuates the treatment effect: Bihar's GST compensation payments, stamp duty, and vehicle tax all grew strongly after 2016, offsetting the excise collapse in the composite. The SCM gap of −₹2,017 Cr/year should be read as a lower bound on the fiscal impact, not a complete estimate of it.

### Placebo inference

Thirteen in-space placebos are run (one SCM fit per donor, treating that donor as "treated"). Bihar's RMSPE ratio (22.87×) ranks **2nd of 14 units**, giving a permutation p-value of approximately 0.071. The only unit with a larger ratio is Maharashtra (64.5×), which is almost certainly a numerical stability artefact from an extremely tight pre-period fit rather than a real causal signal — noted in the notebook but not disqualifying for the Bihar inference.

### Leave-one-out robustness

Dropping each of the three nonzero-weight donors one at a time and refitting shows that the synthetic control remains plausible in all three reduced specifications. The range of LOO synthetics is narrow, confirming that no single donor drives the result.

---

## 4. 09 — BSTS: Road Accidents and Own Tax Revenue

**File:** `09_bsts_bihar.ipynb`

### What it does

BSTS analysis via Google's `pycausalimpact` for the same two outcomes, producing Bayesian posterior credible intervals alongside the SCM point estimates. Includes a cross-method comparison chart.

### Why BSTS is harder here than SCM

SCM is designed for exactly this setting — a small number of pre-treatment periods and a single treated unit — because its inference is entirely nonparametric (permutation-based placebo tests). BSTS is more data-hungry: Brodersen et al. (2015) developed the method using daily and weekly data with hundreds of pre-treatment observations. Applied to annual data with n=6 pre-treatment points, two distinct pathologies appear.

**Pathology 1: The 2010 diffuse-initialization artefact.** The BSTS state-space filter uses diffuse initialization at the first observation, which produces a predictive band of ±300,000 deaths for the year 2010. Every other year has a band of ±2-7 deaths. This single outlier row, if included in `fill_between` without a Y-axis override, crushes the entire figure into a flat line at zero. The fix used throughout the notebooks is to mask rows where the band width exceeds 50× the median band width before plotting, and to set explicit Y-axis limits derived from the valid data range.

**Pathology 2: Overfitting with 13 covariates and 6 pre-treatment observations.** The original BSTS specification used all 13 donors as regression covariates. With n_pre=6 and n_covariates=13, the model is severely over-parameterized: it memorizes the training data (pre-period standard deviation of 2.13 deaths — biologically impossible precision) and extrapolates poorly out of sample. The posterior standard deviation of 2.13 deaths is not a credible uncertainty estimate.

**Fix: restrict to max_donors=3.** Donors are selected by pre-period Pearson correlation with Bihar's outcome series. For road accidents this yields Haryana (r=0.818), Odisha (r=0.668), West Bengal (r=0.627). The sparse model produces a posterior standard deviation of **41.2 deaths** and a median credible interval width of **334 deaths** (~5.5% of the observed mean) — honest uncertainty for a 6-observation pre-period. This follows Brodersen et al. (2015)'s own recommendation for sparse covariate selection in short series.

### BSTS results: road accident deaths

| Metric | Value |
|--------|-------|
| Average post-treatment effect | **+1,076 deaths/year** |
| 95% credible interval | [+994, +1,156] deaths/year |
| Relative effect | +18.77% |
| Posterior tail-area p-value | 0.0 (but see caveat below) |

The p-value of 0.0 should **not** be reported at face value. With n_pre=6 and n_post=7, the posterior is dominated by the model structure rather than genuine data information, and the narrow credible interval (width ~162 deaths) reflects the constraint imposed by the three-donor regression, not the deeper uncertainty about model specification. The SCM permutation p-value of 0.071 is the more credible inference statistic for this analysis.

### Cross-method consistency

Both methods agree on direction and temporal pattern. BSTS estimates a larger average post-treatment effect (+1,076 vs SCM's +360 deaths/year) because its counterfactual is flatter — the three selected donors (Haryana, Odisha, West Bengal) level off around 2018-2020, whereas the SCM's Jharkhand-dominated synthetic continues rising with vehicle growth. The discrepancy is methodological, not a contradiction.

---

## 5. 10 — Robustness Checks

**File:** `10_robustness_bihar.ipynb`

### What it does

Three complementary robustness exercises for the road-accident SCM:

**In-time placebos.** The SCM is refit on data truncated to before the real treatment date, using fake treatment dates of 2015 and 2014. If the method produces large effects at these false dates, the design has a false-positive problem. Results: fake 2015 produces an RMSPE ratio of **0.42×** (the synthetic fits the fake post-period *better* than the fake pre-period — a clean negative result), confirming the 2016 effect is not an artefact of the identification strategy. The fake 2014 ratio of 14.81× appears concerning in isolation but is driven by only 2 pre-fake observations, making the ratio numerically unstable. The avg gap at the fake 2014 date (−92 deaths) is negligible compared to the real post-2016 gaps.

**Specification curve.** All seven non-empty subsets of the three socioeconomic predictors are tested. Six of the seven produce RMSPE ratios above 17×, and all seven produce a positive average post-treatment effect (Bihar above synthetic). The median ratio across specifications is 18.5×. The only outlier is the literacy-only specification (+1,205 deaths avg effect, much larger than the others), which is excluded from the headline because literacy alone is too weak a matching predictor for Bihar.

**Combined results table.** SCM and BSTS estimates are displayed alongside each other. The table is also exported to `results/tables/bihar_results.csv` and loaded by the website's comparison card.

---

## 6. 07 — SCM + BSTS: NSDP Per-Capita Growth

**File:** `07_scm_bihar_growth.ipynb`

### Why a third outcome was added

Road accidents and own tax revenue both had data limitations (no pre-2017 excise sub-head, no NCRB crime data for 2010-2016). A third outcome was added to broaden the analysis and test whether prohibition affected **economic welfare** more directly. NSDP per-capita growth rate is the cleanest welfare measure in the panel: it reflects both the direct size of the economy and the population base, and it is derived from RBI Handbook T19 data already in the panel (no new data collection required).

### Economic theory: two competing channels

Unlike road accidents (where prohibition has an obvious expected direction), the growth effect is genuinely ambiguous ex ante.

**Positive channels:** Household income freed from alcohol spending can shift toward food, education, and savings — improving human capital accumulation. Reduced alcohol-related absenteeism and accidents increases effective labor supply. These channels are emphasized in the prohibitionist literature and were explicitly cited by women's groups that led the movement for Bihar's ban.

**Negative channels:** Bihar's state excise on alcohol was approximately ₹4,000 Cr/year pre-prohibition — roughly 25% of own-tax revenue. Lost excise means lost public investment capacity. Hospitality, retail, and transport sectors dependent on alcohol saw direct revenue contraction. Cross-border leakage (alcohol purchased in neighboring states) reduced local consumption multipliers without proportionally reducing social costs. Enforcement diverted state resources.

The SCM result (-3.0 pp/year average growth gap) is **directionally consistent with the negative channels dominating**, but is **not statistically significant** (permutation p-value ≈ 0.43, rank 6 of 14).

### Differences from the road-accident SCM

**Donor weights shift.** The growth-outcome SCM selects Odisha (66%), Rajasthan (32%), and Jharkhand (3%) — very different from the road-accident SCM's Jharkhand (68%), Odisha (16%), UP (16%). This makes sense: growth-rate trajectories are correlated across states with similar structural transformation paths (Odisha and Rajasthan both underwent rapid industrial growth from a similar base level), while road-accident levels are driven more by vehicle stock and road quality (where Jharkhand is Bihar's closest match).

**Pre-period is shorter.** With growth rates, the first year (2010) is NaN (no prior year to compute pct_change from), and NSDP data only starts in 2012. The effective pre-treatment matching window is 2013-2015 — only three years. This is noted as a caveat throughout.

**Bihar is inside the convex hull on growth.** Unlike the level outcomes where Bihar's NSDP per capita was 30% of the donor average (near-certain convex hull violation), growth rates are much less heterogeneous across states. Bihar's pre-period mean growth of ~12% per year falls comfortably within the donor range (~6-20%), so the lagged-outcome trick needed for Notebook 05 is less critical here — though it is still applied for consistency.

### BSTS for growth: additional complications

**Treatment date shifted to 2017-01-01 for BSTS only.** Calendar year 2016 contained only eight months of prohibition (April to December). `pycausalimpact` requires a pre-period span of at least three observations; using the SCM's 2016-01-01 cutoff leaves only 2013-2015 as the pre-period (three years, borderline). Shifting to 2017-01-01 adds 2016 to the pre-period (four years) and produces a more stable model. The SCM retains 2016-01-01 because it has no such minimum-span constraint.

**Single donor for BSTS.** Growth rates are much more volatile than levels, making multi-donor BSTS even more prone to overfitting. With max_donors=3, the model still overfitted catastrophically — predicting Bihar growth of −172% in some post-treatment years. The only stable specification uses a single donor: **Odisha**, which has the highest pre-period correlation with Bihar's growth series (r=+0.98). The tight posterior credible interval from this single-donor model (~[−5.0, −3.6] pp) reflects the constraint imposed by the model structure, not the genuine uncertainty about the causal effect. It is reported as directional corroboration of the SCM, not as an independent precision estimate.

### Cross-method consistency for growth

Both SCM and BSTS estimate a negative growth effect (Bihar grew slower than its counterfactual after prohibition). SCM: −3.0 pp/year. BSTS: −4.3 pp/year. The two estimates bracket a range of roughly 3-4 pp/year. Neither achieves statistical significance at conventional thresholds given the data constraints. The honest summary is that the evidence is consistent with a growth cost but too weak to call decisive — which is itself a meaningful finding, given the policy debate.

---

## 7. Key methodological decisions across all notebooks

### Decision 1: Special predictors for level matching

All SCM notebooks add lagged outcome values as `special_predictors` in pysyncon's `Dataprep`. This is not optional for Bihar: without it, the optimizer produces corner solutions driven by level mismatches rather than trajectory matches. The fix follows Abadie, Diamond & Hainmueller (2010, §IV) and is documented explicitly in every notebook that uses it.

### Decision 2: max_donors=3 for all BSTS fits

All BSTS fits restrict to three donors selected by pre-period correlation. The threshold was chosen empirically — with four or more covariates and n_pre=6, pycausalimpact produced degenerate posterior predictive distributions. With three covariates the posterior standard deviation is in the right order of magnitude (tens to hundreds of deaths/year for road accidents, tens of percentage points for growth rates). The selection criterion (correlation, not SCM weight) is appropriate because BSTS uses donors as regression covariates rather than convex-combination weights — the two identification strategies favor different donor characteristics.

### Decision 3: JSON as the interface between analysis and website

Every analysis notebook ends by serializing results to `api/results/<case>_<method>.json` via the `to_json()` methods on `SCMAnalysis` and `BSTSAnalysis`. This means the website charts and the "Ask the Model" Gemini context are always reading the same numbers shown in the notebooks. No manual copy-paste of results exists anywhere in the pipeline.

### Decision 4: Honest treatment of data limitations

Several limitations are documented inline rather than footnoted away:

- The 2010 BSTS initialization artefact (±300k band) is clipped to null in the JSON and excluded from plotting — explained in the BSTS notebooks.
- The own-tax-revenue attenuation is flagged every time that variable appears, with an explicit note that a small gap does not imply no fiscal impact.
- The BSTS p-value of 0.0 for road accidents is explicitly described as unreliable and the SCM permutation p-value (0.071) is named as the preferred inference statistic.
- The growth BSTS uses a single donor and shifted treatment date — both deviations from the primary specification are explained in the notebook rather than hidden.

---

## 8. Results at a glance

| Outcome | Method | Avg post effect | RMSPE ratio | Rank | p-value |
|---------|--------|-----------------|-------------|------|---------|
| Road accident deaths | SCM | +360 deaths/yr | 22.87× | 2/14 | ≈ 0.071 |
| Road accident deaths | BSTS | +1,076 deaths/yr | — | — | 0.0 (unreliable) |
| Own tax revenue | SCM | −₹2,017 Cr/yr | 3.16× | — | — |
| Own tax revenue | BSTS | −₹4,867 Cr/yr | — | — | 0.0 (unreliable) |
| NSDP per-capita growth | SCM | −2.99 pp/yr | 83.86× | 6/14 | ≈ 0.43 |
| NSDP per-capita growth | BSTS | −4.28 pp/yr | — | — | 0.0 (unreliable) |

**Reading the table:**
- All BSTS p-values should be treated as directional corroboration only, not as independent inference statistics, for the reasons documented in Notebooks 09 and 07.
- The own-tax-revenue SCM effect is attenuated (excise buried in composite) and should be read as a lower bound on fiscal impact.
- The growth SCM is not statistically significant and is reported as suggestive evidence only.
- The road-accident SCM is the primary causal claim of the project: marginally significant (p ≈ 0.071), with a clear temporal pattern that is theoretically interpretable and consistent with the existing literature.

---

## References

- Abadie, A., Diamond, A., & Hainmueller, J. (2010). Synthetic Control Methods for Comparative Case Studies. *JASA*, 105(490), 493-505.
- Abadie, A. (2021). Using Synthetic Controls: Feasibility, Data Requirements, and Methodological Aspects. *Journal of Economic Literature*, 59(2), 391-425.
- Brodersen, K. H., et al. (2015). Inferring Causal Impact Using Bayesian Structural Time-Series Models. *Annals of Applied Statistics*, 9(1), 247-274.
- Chaudhuri, A., & Jha, N. (2024). Alcohol Ban and Crime: The ABCs of the Bihar Prohibition. *Economic Development and Cultural Change*.