"use client";

import { InlineMath, BlockMath } from "react-katex";

export default function MethodologyPage() {
  return (
    <article className="mx-auto max-w-[680px] px-6 py-16">
      <h1 className="font-serif text-4xl font-bold text-navy">Methodology</h1>
      <p className="mt-2 text-sm text-gray-500">
        How we estimate the causal impact of Bihar&apos;s 2016 prohibition.
      </p>

      <h2 className="mt-12 font-serif text-2xl font-bold text-navy">
        1. The Counterfactual Problem
      </h2>
      <p className="mt-4 text-gray-700">
        On 5 April 2016, Bihar enacted total prohibition on alcohol sales. To
        estimate its causal effect on outcomes like road accident deaths, we
        cannot simply compare Bihar before and after April 2016 — anything
        that changed nationally over those years (motorisation, road
        infrastructure, demonetisation, COVID) would contaminate the
        before/after gap. We need a credible{" "}
        <em>counterfactual Bihar</em> — what Bihar&apos;s deaths would have
        looked like without the prohibition — and then read off the
        difference.
      </p>

      <h2 className="mt-12 font-serif text-2xl font-bold text-navy">
        2. Synthetic Control Method
      </h2>
      <p className="mt-4 text-gray-700">
        The Synthetic Control Method (Abadie, Diamond &amp; Hainmueller 2010,
        2015; Abadie 2021) constructs the counterfactual as a weighted average
        of donor states whose pre-treatment trajectory closely matched
        Bihar&apos;s. Formally, we choose donor weights{" "}
        <InlineMath math="W^* = (w_1, \ldots, w_J)" /> by solving:
      </p>

      <BlockMath math="W^* = \arg\min_W \, (X_{\text{Bihar}} - X_{\text{donors}} W)^\top V (X_{\text{Bihar}} - X_{\text{donors}} W)" />

      <p className="mt-4 text-gray-700">
        subject to <InlineMath math="w_j \geq 0" /> and{" "}
        <InlineMath math="\sum_j w_j = 1" />, where{" "}
        <InlineMath math="X" /> contains predictor variables (NSDP per
        capita, urban share, literacy) and lagged outcomes for each
        pre-treatment year, and <InlineMath math="V" /> is a diagonal weight
        matrix. The post-treatment treatment effect is the gap between
        Bihar&apos;s actual outcome and the synthetic Bihar&apos;s.
      </p>

      <h3 className="mt-8 font-serif text-xl font-bold text-navy">
        Inference via Permutation
      </h3>
      <p className="mt-4 text-gray-700">
        Because synthetic-control inference is non-standard, we follow Abadie
        et al.&apos;s permutation procedure: refit SCM with each donor state
        in turn pretending it was the treated unit, then compare Bihar&apos;s
        post/pre RMSPE ratio to the distribution of placebo ratios. Bihar
        ranks 2 of 14 (permutation p ≈ 0.071).
      </p>

      <h2 className="mt-12 font-serif text-2xl font-bold text-navy">
        3. Bayesian Structural Time Series
      </h2>
      <p className="mt-4 text-gray-700">
        BSTS (Brodersen, Gallusser, Koehler, Remy &amp; Scott 2015) models
        the treated outcome as a sum of unobserved local trend, seasonality,
        and a regression component over donor covariates:
      </p>

      <BlockMath math="y_t = \mu_t + x_t^\top \beta + \varepsilon_t" />
      <BlockMath math="\mu_{t+1} = \mu_t + \delta_t + \eta_{1,t}, \quad \delta_{t+1} = \delta_t + \eta_{2,t}" />

      <p className="mt-4 text-gray-700">
        with spike-and-slab priors on <InlineMath math="\beta" /> for
        variable selection. The post-treatment forecast — generated using
        only pre-treatment data — is the Bayesian counterfactual; the
        posterior credible interval gives uncertainty bands.
      </p>

      <h3 className="mt-8 font-serif text-xl font-bold text-navy">
        Why BSTS Has Wide Intervals Here
      </h3>
      <p className="mt-4 text-gray-700">
        BSTS&apos;s power comes from long monthly time series; we have only{" "}
        <strong>6 annual pre-treatment observations</strong> against 13
        donor covariates. The regression component is severely overfit, the
        posterior credible bands collapse to artificially narrow intervals,
        and the reported posterior tail-area probability of 0.0 should not
        be taken at face value. We report BSTS as a directional check
        alongside SCM, not as primary inference.
      </p>

      <h2 className="mt-12 font-serif text-2xl font-bold text-navy">
        4. Why Both Methods?
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold">Aspect</th>
              <th className="px-3 py-2 text-left font-semibold text-navy">
                SCM
              </th>
              <th className="px-3 py-2 text-left font-semibold text-amber">
                BSTS
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2 text-gray-600">Inference</td>
              <td className="px-3 py-2">Permutation (frequentist)</td>
              <td className="px-3 py-2">Bayesian posterior</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2 text-gray-600">Donor handling</td>
              <td className="px-3 py-2">Convex weights, sparse</td>
              <td className="px-3 py-2">Spike-and-slab regression</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2 text-gray-600">Best with</td>
              <td className="px-3 py-2">Few donors, clear pre-trend</td>
              <td className="px-3 py-2">Long time series</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-gray-600">Reliability here</td>
              <td className="px-3 py-2 text-green-700">Good</td>
              <td className="px-3 py-2 text-amber-700">
                Directional only
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 font-serif text-2xl font-bold text-navy">
        5. Data Sources
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              <th className="px-3 py-2 text-left font-semibold">Variable</th>
              <th className="px-3 py-2 text-left font-semibold">Source</th>
              <th className="px-3 py-2 text-left font-semibold">Years</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2">Road accident deaths</td>
              <td className="px-3 py-2">
                MoRTH &quot;Road Accidents in India&quot; (PDFs, camelot
                extraction)
              </td>
              <td className="px-3 py-2">2010–2022</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2">Own tax revenue</td>
              <td className="px-3 py-2">RBI Handbook of Statistics, T168</td>
              <td className="px-3 py-2">2010–2022</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-2">NSDP per capita</td>
              <td className="px-3 py-2">RBI Handbook, T19</td>
              <td className="px-3 py-2">2012–2022</td>
            </tr>
            <tr>
              <td className="px-3 py-2">Urban share, literacy</td>
              <td className="px-3 py-2">
                Census 2011 + linear interpolation
              </td>
              <td className="px-3 py-2">2010–2022</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 font-serif text-2xl font-bold text-navy">
        6. Limitations
      </h2>
      <ol className="mt-4 list-decimal space-y-3 pl-6 text-gray-700">
        <li>
          <strong>Convex hull:</strong> Bihar has unusually low NSDP and
          urbanisation; without lagged-outcome predictors, the SCM optimizer
          collapses to a degenerate corner solution. The published results
          use lagged outcomes (Abadie/Diamond/Hainmueller §IV) to anchor the
          synthetic at Bihar&apos;s level.
        </li>
        <li>
          <strong>Short pre-period:</strong> 4–6 annual observations is well
          below the BSTS rule of thumb (≥30) and tight for SCM. Permutation
          p-values are the most credible inference here.
        </li>
        <li>
          <strong>Own tax revenue is a proxy:</strong> pure state-excise as
          a separate line item is not extractable from RBI&apos;s
          publicly-accessible machine-readable sources for 2010–2022. The
          composite Own Tax Revenue series understates the true excise loss
          because GST and other components grew strongly post-2016.
        </li>
        <li>
          <strong>Census interpolation:</strong> Census 2021 was delayed by
          COVID; urban share and literacy values for 2012–2022 are linearly
          interpolated from the Census 2011 anchor with assumed annual
          growth rates. This adds smoothness that real annual data would not
          have.
        </li>
        <li>
          <strong>2020–2021 COVID shock</strong> affects both Bihar and the
          donor pool. Kept in the post-treatment period; reader should
          discount the 2020-2021 gaps slightly.
        </li>
      </ol>

      <hr className="my-12 border-gray-200" />
      <p className="text-sm text-gray-500">
        For full data lineage and source notes, see{" "}
        <code className="rounded bg-gray-100 px-1 text-xs">
          data/raw/bihar/SOURCES.md
        </code>{" "}
        in the repository.
      </p>
    </article>
  );
}
