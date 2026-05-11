"use client";

import Link from "next/link";
import { motion, useInView, useMotionValue, animate } from "framer-motion";
import { useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";

function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const mv = useMotionValue(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.6, ease: "easeOut" });
    return () => controls.stop();
  }, [inView, to, mv]);

  useEffect(() => {
    return mv.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + v.toFixed(decimals) + suffix;
      }
    });
  }, [mv, prefix, suffix, decimals]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="bg-cream text-foreground">
      {/* HERO */}
      <section className="flex min-h-[90vh] items-center justify-center px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-gray-500">
            Empirical Time Series Project · IIT Roorkee · 2026
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight text-navy md:text-6xl">
            Causal Impact of Bihar&apos;s 2016 Alcohol Prohibition
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 md:text-xl">
            Did Bihar&apos;s prohibition save lives — or just relocate them?
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/analysis"
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-7 py-3 text-sm font-semibold text-white shadow transition-all hover:bg-navy-dark"
            >
              Explore the Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center gap-2 rounded-lg border border-navy px-7 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
            >
              View Methodology
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {[
              { label: "RMSPE ratio", value: "22.87×" },
              { label: "Permutation p", value: "≈ 0.071" },
              { label: "Donor states", value: "13" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs text-gray-700"
              >
                <span className="font-semibold text-navy">{s.value}</span>
                <span className="mx-1 text-gray-400">·</span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KEY FINDINGS — navy strip */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: -900,
              label: "Road deaths prevented in 2016",
              prefix: "",
              suffix: "",
              decimals: 0,
              note: "(SCM estimate)",
            },
            {
              n: 22.87,
              label: "RMSPE ratio",
              prefix: "",
              suffix: "×",
              decimals: 2,
              note: "(rank 2 of 14)",
            },
            {
              n: 68,
              label: "Jharkhand donor weight",
              prefix: "",
              suffix: "%",
              decimals: 0,
              note: "(top contributor)",
            },
            {
              n: 2017,
              label: "Annual own-tax revenue gap",
              prefix: "₹",
              suffix: " Cr",
              decimals: 0,
              note: "(SCM, attenuated proxy)",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="font-serif text-5xl font-bold text-amber">
                <CountUp
                  to={stat.n}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </div>
              <div className="mt-2 text-sm text-white/80">{stat.label}</div>
              <div className="text-xs text-white/50">{stat.note}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CASE CARD */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm md:p-12"
          >
            <h2 className="font-serif text-3xl font-bold text-navy md:text-4xl">
              Bihar Prohibition — April 2016
            </h2>
            <p className="mt-4 text-gray-700">
              On 5 April 2016, Bihar enacted total prohibition on alcohol
              sales statewide. We estimate the causal impact on road accident
              deaths and own tax revenue using a synthetic control built from
              13 donor states, then triangulate with Bayesian Structural Time
              Series.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Annual data", "13 donor states", "2010–2022"].map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                >
                  {p}
                </span>
              ))}
            </div>
            <Link
              href="/analysis"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-amber px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-dark"
            >
              Open Interactive Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* METHODOLOGY PREVIEW */}
      <section className="border-t border-gray-200 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-serif text-3xl font-bold text-navy">
            Two Methods, One Question
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div>
              <h3 className="font-serif text-xl font-bold text-navy">
                Synthetic Control Method
              </h3>
              <p className="mt-3 text-gray-700">
                We find a weighted combination of other Indian states whose
                pre-2016 trajectory closely matched Bihar&apos;s. The post-2016
                gap between actual Bihar and the synthetic Bihar is the
                estimated causal effect of prohibition.
              </p>
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-navy">
                Bayesian Structural Time Series
              </h3>
              <p className="mt-3 text-gray-700">
                BSTS models Bihar&apos;s outcome as a state-space system with
                donor states as covariates. The Bayesian posterior produces
                credible intervals for the counterfactual — a complementary
                check on SCM&apos;s frequentist permutation inference.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/methodology"
              className="text-sm font-semibold text-navy hover:underline"
            >
              Full methodology →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-10 text-center text-sm text-gray-600">
        <p>
          Mohammed Talha Ansari · Supervisor: Prof. Abhishek Samantray, IIT Roorkee
        </p>
        <p className="mt-2">
          <a
            href={
              process.env.NEXT_PUBLIC_GITHUB_URL ??
              "https://github.com"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy hover:underline"
          >
            GitHub
          </a>
          <span className="mx-2 text-gray-400">·</span>
          <span>Built with Next.js + FastAPI</span>
        </p>
      </footer>
    </div>
  );
}
