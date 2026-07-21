"use client";

import {
  ELASTIC_CLOUD_HOSTED_PRICING_URL,
  ELASTIC_CLOUD_SERVERLESS_PRICING_URL,
  ELASTIC_HOSTED_LIST_RATES_URL,
} from "@/lib/tcoDisclaimer";
import { ECH_HOT_FROZEN_ARCHITECTURE } from "@/lib/elasticEchHotFrozenPricing";

export default function TcoDisclaimerBanner() {
  return (
    <div className="mb-10 animate-fade-in-up">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl px-6 py-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-amber-500 text-xl mt-0.5 shrink-0" aria-hidden>
            ⚠️
          </span>
          <div className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed space-y-4 min-w-0">
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-50 mb-1">
                Estimation purposes only
              </p>
              <p className="text-amber-900/90 dark:text-amber-100/90">
                This tool is not validated by Elastic Product, Marketing, or Competitive Intelligence
                for accuracy. It is calibrated against the{" "}
                <a
                  href={ELASTIC_CLOUD_SERVERLESS_PRICING_URL}
                  className="underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Elastic Cloud Serverless
                </a>{" "}
                and{" "}
                <a
                  href={ELASTIC_CLOUD_HOSTED_PRICING_URL}
                  className="underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cloud Hosted
                </a>{" "}
                pricing tables plus ad hoc field feedback (e.g. Serverless estimator alignment). Other
                vendor rates and unit conversions are approximate. Confirm all figures with official
                pricing, contracts, and measured usage before customer-facing quotes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
              <div className="rounded-lg bg-white/50 dark:bg-gray-900/30 border border-indigo-200/60 dark:border-indigo-900/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mb-2">
                  Elastic Serverless (design in this tool)
                </h3>
                <ul className="text-xs space-y-1.5 text-amber-950/90 dark:text-amber-50/90 list-disc pl-4">
                  <li>
                    <strong>Observability Complete</strong> ingest + retention tier table (AWS
                    us-east-1 list rates).
                  </li>
                  <li>
                    <strong>Metrics (TSDS):</strong> 25% of Complete per-GB ingest and retention;
                    logs/traces/security use full Complete rates.
                  </li>
                  <li>
                    <strong>Logs:</strong> metered ingest uses ~1.66× raw GB (enriched size per
                    Elastic estimator).
                  </li>
                  <li>
                    <strong>Elastic Streams TCO is always on:</strong> per-signal drop, aggregate,
                    downsample, and retention (PayPal RFP-style defaults) — adjust in Configuration.
                  </li>
                  <li>
                    Retention slider affects the unshaped baseline only; billed Serverless totals
                    include Streams policies.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-white/50 dark:bg-gray-900/30 border border-blue-200/60 dark:border-blue-900/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200 mb-2">
                  Elastic Cloud Hosted — ECH (design in this tool)
                </h3>
                <ul className="text-xs space-y-1.5 text-amber-950/90 dark:text-amber-50/90 list-disc pl-4">
                  <li>
                    <strong>{ECH_HOT_FROZEN_ARCHITECTURE.summary}</strong> —{" "}
                    {ECH_HOT_FROZEN_ARCHITECTURE.hotDays}-day data hot (RAM-hour) plus{" "}
                    {ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays}-day ILM on blob (writable frozen,
                    queryable in Kibana).
                  </li>
                  <li>
                    Applies to <strong>metrics, logs, traces, and security</strong> variable
                    backbone — not the legacy “flat $/GB ingest + Complete retention months” workbook
                    model.
                  </li>
                  <li>
                    <strong>Full-fidelity ingest</strong> on ECH; Streams sampling is not applied to
                    ECH rows (Serverless-only shaping).
                  </li>
                  <li>
                    List rates from{" "}
                    <a
                      href={ELASTIC_HOSTED_LIST_RATES_URL}
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      elastic.co/pricing/cloud-hosted
                    </a>{" "}
                    / cloud pricing table (data hot, snapshot storage, transfer).
                  </li>
                  <li>Cluster minimums ($200 metrics, etc.) still apply where modeled.</li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-amber-900/80 dark:text-amber-200/80 pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
              <strong>Not included:</strong> Datadog/Splunk/etc. use approximate public list pricing;
              operational FTE is optional. Excludes synthetics, LLM observability, Agent Builder,
              support ECUs, Cross-project Search mounted-GB charges, and negotiated discounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
