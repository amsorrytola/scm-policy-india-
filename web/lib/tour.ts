import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function startTour() {
  const d = driver({
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Start exploring!",
    overlayColor: "#0F4C81",
    overlayOpacity: 0.65,
    smoothScroll: true,
    onDestroyed: () => {
      try {
        localStorage.setItem("bihar-scm-tour-done", "true");
      } catch {}
    },
    steps: [
      {
        element: "#tour-header",
        popover: {
          title: "Bihar Prohibition Analysis",
          description:
            "This page shows the causal impact of Bihar's April 2016 alcohol ban on road accident deaths, estimated using the Synthetic Control Method (SCM).",
          side: "bottom",
        },
      },
      {
        element: "#tour-donor-pool",
        popover: {
          title: "Donor Pool",
          description:
            "These 13 Indian states form the 'donor pool' — candidates for building Bihar's synthetic counterfactual. Toggle states on/off to change who can contribute.",
          side: "right",
        },
      },
      {
        element: "#tour-main-chart",
        popover: {
          title: "Bihar vs Synthetic Bihar",
          description:
            "The navy line is Bihar's actual road deaths. The amber dashed line is the synthetic counterfactual — what Bihar would have looked like without the ban. The gap is the estimated treatment effect.",
          side: "left",
        },
      },
      {
        element: "#tour-gap-chart",
        popover: {
          title: "Treatment Effect (Gap)",
          description:
            "Gap = Bihar actual − Synthetic Bihar. Negative = prohibition prevented deaths. Positive = more deaths than expected. Note the early reduction (2016-17) and later reversal (2019+).",
          side: "top",
        },
      },
      {
        element: "#tour-placebo",
        popover: {
          title: "Placebo Test",
          description:
            "Gray lines show what happens when we apply SCM to donor states as if they were treated. Bihar's navy line should stand out. It ranks 2nd of 14 — permutation p ≈ 0.071.",
          side: "top",
        },
      },
      {
        element: "#tour-headline",
        popover: {
          title: "Headline Result",
          description:
            "Average treatment effect across the post-period: +360 deaths/year. This includes the initial reduction AND the reversal. See the gap chart for the year-by-year story.",
          side: "left",
        },
      },
      {
        element: "#tour-results-table",
        popover: {
          title: "Year-by-Year Results Table",
          description:
            "Every year's numbers in one place. Green = fewer deaths than expected (prohibition working). Red = more deaths. Notice the sign change around 2018-2019 as the effect fades.",
          side: "top",
        },
      },
      {
        element: "#tour-predictor-balance",
        popover: {
          title: "Predictor Balance",
          description:
            "How well does the synthetic Bihar match real Bihar before the ban? Perfect matching = all bars at 100%. Synthetic matches on literacy but Bihar is much poorer than the synthetic — documented limitation.",
          side: "top",
        },
      },
      {
        element: "#tour-downloads",
        popover: {
          title: "Download the Data",
          description:
            "Download all results as CSV files for your own analysis. The panel data includes all 13 donor states × 13 years.",
          side: "top",
        },
      },
      {
        element: "#tour-weights",
        popover: {
          title: "Donor Weights",
          description:
            "Jharkhand gets 68% of the weight — Bihar's closest structural match (similar income, urbanization, and pre-2016 accident trajectory). Odisha and UP share the remaining 32%.",
          side: "left",
        },
      },
      {
        element: "#tour-refit",
        popover: {
          title: "Live Model Refit",
          description:
            "Toggle donors on/off and click 'Refit Model' to run the SCM live with your pool. The chart and weights update in real time. Try removing Jharkhand to see how the result changes.",
          side: "top",
        },
      },
      {
        element: "#tour-ask",
        popover: {
          title: "Ask the Model",
          description:
            "Ask any question about this analysis in plain English. Powered by Gemini 2.0 Flash, grounded in the actual SCM and BSTS results. Try 'Why does Jharkhand get 68% weight?'",
          side: "top",
        },
      },
    ],
  });

  d.drive();
}
