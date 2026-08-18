"use client";

import {
  ELASTIC_CLOUD_HOSTED_PRICING_URL,
  ELASTIC_CLOUD_SERVERLESS_PRICING_URL,
  ELASTIC_HOSTED_LIST_RATES_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL,
  ELASTIC_TSDS_METRICS_EFFECTIVE_LABEL,
  TCO_LIST_RATES_AS_OF,
} from "@/lib/tcoDisclaimer";
import { ECH_HOT_FROZEN_ARCHITECTURE } from "@/lib/elasticEchHotFrozenPricing";
import { SERVERLESS_STREAMS_S3_ARCHITECTURE } from "@/lib/elasticServerlessStreamsS3Pricing";

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
                for accuracy. List rates reconciled as of <strong>{TCO_LIST_RATES_AS_OF}</strong> against the{" "}
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
                pricing tables plus ad hoc field feedback (e.g. Serverless estimator alignment). See also{" "}
                <a
                  href={ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL}
                  className="underline font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Serverless Observability pricing
                </a>{" "}
                (TSDS metrics effective {ELASTIC_TSDS_METRICS_EFFECTIVE_LABEL}). Other vendor rates and unit
                conversions are approximate. Confirm all figures with official pricing, contracts, and measured
                usage before customer-facing quotes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
              <div className="rounded-lg bg-white/50 dark:bg-gray-900/30 border border-indigo-200/60 dark:border-indigo-900/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mb-2">
                  Elastic Serverless (design in this tool)
                </h3>
                <ul className="text-xs space-y-1.5 text-amber-950/90 dark:text-amber-50/90 list-disc pl-4">
                  <li>
                    <strong>{SERVERLESS_STREAMS_S3_ARCHITECTURE.summary}:</strong> Observability Complete
                    ingest + {SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays}-day hot retention at published floors;
                    Streams moves aged data to S3 (object storage ~$0.023/GB-mo proxy). The retention slider sets
                    total keep time (hot + S3).
                  </li>
                  <li>
                    <strong>Metrics (TSDS):</strong> published floors {ELASTIC_TSDS_METRICS_EFFECTIVE_LABEL}:
                    $0.023/GB ingest, $0.005/GB-month retained (hot window); logs, traces, and security use full
                    Complete rates for ingest/hot.
                  </li>
                  <li>
                    <strong>Logs:</strong> metered ingest uses ~1.66× raw GB (enriched size per
                    Elastic estimator).
                  </li>
                  <li>
                    <strong>Streams ingest shaping is always on:</strong> per-signal drop, aggregate, and
                    downsample — adjust in Configuration.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-white/50 dark:bg-gray-900/30 border border-blue-200/60 dark:border-blue-900/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200 mb-2">
                  Elastic Cloud Hosted — ECH (design in this tool)
                </h3>
                <ul className="text-xs space-y-1.5 text-amber-950/90 dark:text-amber-50/90 list-disc pl-4">
                  <li>
                    <strong>$0.05/GB ingest/compute</strong> (Observability list proxy, same as ECH
                    logs/APM) plus <strong>{ECH_HOT_FROZEN_ARCHITECTURE.summary}</strong> for the
                    configured retention window (hot RAM-hour + ILM writable-frozen blob).
                  </li>
                  <li>
                    Applies to <strong>metrics, logs, traces, and security</strong> variable
                    backbone — not the legacy “flat Complete retention months only” workbook model.
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
              <strong>Schemaless data blocks:</strong> Observability is schemaless at ingest —{" "}
              <strong>Streams</strong> uses AI to identify patterns, so there is no custom-metric SKU;
              the billable path is <strong>ingested GB/TiB</strong> (plus retention), not per-series
              metric packs. One block can carry mixed OTLP. Open the <strong>Data Blocks</strong> tab for
              illustrative $/TiB-month at 1, 50, 100, and 500 TiB/mo grounded in{" "}
              <a
                href={ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL}
                className="underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Serverless Observability pricing
              </a>{" "}
              Complete floors ($0.09/GB ingest · $0.019/GB-mo retention for logs/traces; TSDS metrics $0.023 /
              $0.005) plus Streams → S3 object storage. Per-tab comparisons may still apply signal-specific
              metering for vendor parity (TSDS 25%, logs 1.66×, etc.).
            </p>

            <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
              <strong>Not included:</strong> Datadog/Splunk/etc. use approximate public list pricing;
              Grafana Cloud Metrics uses Pro <strong>billable series</strong> (samples/sec × 60 DPM ÷ 1
              included DPM, $6.50/$5.90/$5.50 per 1k after 10k included) — not per million datapoints.
              Elastic is GB volume; Grafana/Datadog are unique-series meters, so high cardinality can
              favor Elastic and fat/low-cardinality samples can favor them.
              Operational FTE is optional. Excludes synthetics, LLM observability, Agent Builder,
              support ECUs, Cross-project Search mounted-GB charges, Adaptive Metrics, and negotiated discounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
