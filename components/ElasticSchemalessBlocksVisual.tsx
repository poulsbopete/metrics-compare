"use client";

import { useMemo, useState } from "react";
import {
  formatBlockCurrency,
  GB_PER_TIB,
  quoteAllSchemalessBlocks,
  SCHEMALESS_BLOCK_TIERS_TB,
  type SchemalessBlockTierTb,
} from "@/lib/elasticSchemalessBlocks";
import {
  ECH_CLOUD_HOSTED_LIST_RATES,
  ECH_HOT_FROZEN_ARCHITECTURE,
} from "@/lib/elasticEchHotFrozenPricing";
import { SERVERLESS_STREAMS_S3_ARCHITECTURE } from "@/lib/elasticServerlessStreamsS3Pricing";
import {
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  OBSERVABILITY_SERVERLESS_PUBLISHED,
} from "@/lib/elasticServerlessPricing";
import { ELASTIC_CLOUD_HOSTED_PRICING_URL } from "@/lib/tcoDisclaimer";

interface ElasticSchemalessBlocksVisualProps {
  elasticRetentionMonths?: number;
}

export default function ElasticSchemalessBlocksVisual({
  elasticRetentionMonths = 1,
}: ElasticSchemalessBlocksVisualProps) {
  const [selectedTierTb, setSelectedTierTb] = useState<SchemalessBlockTierTb>(1);

  const quotes = useMemo(
    () => quoteAllSchemalessBlocks(elasticRetentionMonths),
    [elasticRetentionMonths]
  );

  const selected = quotes.find((q) => q.tierTb === selectedTierTb) ?? quotes[0];
  const oneTb = quotes.find((q) => q.tierTb === 1);
  const pub = OBSERVABILITY_SERVERLESS_PUBLISHED.complete;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/60 dark:border-emerald-800/40 p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
            Schemaless observability · data blocks
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Schemaless ingest — no custom-metric SKUs
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            Elastic Observability is <strong>schemaless</strong>: OpenTelemetry, Elastic Agent, and Beats
            land <strong>logs, metrics, and traces</strong> in the same project without picking a separate
            SKU per signal or per custom metric. <strong>Streams</strong> uses AI to identify patterns in
            that data — so you are not charged for custom-metric series; the billable path is{" "}
            <strong>ingested GB</strong> (and retention). Estimates use published{" "}
            <a
              href={ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL}
              className="underline font-medium text-indigo-700 dark:text-indigo-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Observability Serverless
            </a>{" "}
            Complete rates for logs/traces:{" "}
            <strong>${pub.ingestLogsTracesPerGB.toFixed(2)}/GB ingest</strong> (as low as) ·{" "}
            <strong>${pub.retentionLogsTracesPerGBMonth.toFixed(3)}/GB-mo retention</strong>. Metrics in
            TSDS index mode: ${pub.ingestMetricsPerGB.toFixed(3)}/GB ingest · $
            {pub.retentionMetricsPerGBMonth.toFixed(3)}/GB-mo retention. With Streams → S3, recent data
            stays on Complete retention and older data can move to object storage.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {SCHEMALESS_BLOCK_TIERS_TB.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTierTb(tier)}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                selectedTierTb === tier
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {tier} TiB/mo
            </button>
          ))}
        </div>

        {selected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-1">
                Selected block
              </p>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                {selected.tierTb} TiB/mo
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 tabular-nums">
                ~{Math.round(selected.dailyIngestGb).toLocaleString()} GiB/day wire ·{" "}
                {GB_PER_TIB * selected.tierTb} GiB/mo
              </p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-3">
                Schemaless: high-cardinality and custom metrics count as ingest GB — not a separate
                custom-metric SKU. Streams AI finds patterns on that data.
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/70 dark:bg-blue-950/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200 mb-1">
                Elastic Cloud Hosted · {ECH_HOT_FROZEN_ARCHITECTURE.summary}
              </p>
              <p className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 tabular-nums">
                {formatBlockCurrency(selected.ech.perTbMonth)}
                <span className="text-base font-semibold text-blue-600/80 dark:text-blue-300/80">
                  /TiB-mo
                </span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 tabular-nums">
                {formatBlockCurrency(selected.ech.monthly)}/mo ·{" "}
                {formatBlockCurrency(selected.ech.annual)}/yr
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Hot RAM-hour + snapshot storage ($
                {ECH_CLOUD_HOSTED_LIST_RATES.snapshotStorageGbMonthUsd}/GB-mo) —{" "}
                <a
                  href={ELASTIC_CLOUD_HOSTED_PRICING_URL}
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cloud Hosted pricing
                </a>
              </p>
            </div>

            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/70 dark:bg-indigo-950/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mb-1">
                Serverless · {SERVERLESS_STREAMS_S3_ARCHITECTURE.summary}
              </p>
              <p className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                {formatBlockCurrency(selected.serverless.perTbMonth)}
                <span className="text-base font-semibold text-indigo-600/80 dark:text-indigo-300/80">
                  /TiB-mo
                </span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 tabular-nums">
                {formatBlockCurrency(selected.serverless.monthly)}/mo ·{" "}
                {formatBlockCurrency(selected.serverless.annual)}/yr
              </p>
              <p className="text-xs text-indigo-800 dark:text-indigo-200 mt-2 tabular-nums">
                Ingest {formatBlockCurrency(selected.serverless.ingestCost)} · retention{" "}
                {formatBlockCurrency(selected.serverless.retentionCost)}
              </p>
            </div>
          </div>
        )}

        {selected && (
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3">
            <strong>Complete published rates</strong> (logs/traces): $
            {pub.ingestLogsTracesPerGB.toFixed(2)}/GB ingest + $
            {pub.retentionLogsTracesPerGBMonth.toFixed(3)}/GB-mo retained. At this block, keeping{" "}
            {elasticRetentionMonths} month{elasticRetentionMonths === 1 ? "" : "s"} on Complete retention
            (no S3 export) is about{" "}
            <strong>{formatBlockCurrency(selected.serverlessCompleteRetention.perTbMonth)}/TiB-mo</strong>
            . Streams → S3 estimates older data at about $
            {SERVERLESS_STREAMS_S3_ARCHITECTURE.s3PerGBMonth.toFixed(3)}/GB-mo object storage after a short
            hot window.
          </p>
        )}
      </section>

      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          How these estimates are calculated
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 max-w-3xl">
          Serverless figures follow{" "}
          <a
            href={ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Observability Serverless pricing
          </a>
          . Elastic Cloud Hosted figures use capacity and snapshot storage from the Cloud Hosted pricing
          table. Streams → S3 models a short hot window on Complete retention with older data in object
          storage.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
              Elastic Cloud Hosted · {ECH_HOT_FROZEN_ARCHITECTURE.summary}
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>
                <strong>{ECH_HOT_FROZEN_ARCHITECTURE.hotDays}-day hot</strong> @ $
                {ECH_CLOUD_HOSTED_LIST_RATES.dataHotRamGbHourUsd}/GB-RAM-hour.
              </li>
              <li>
                <strong>{ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays}d writable frozen</strong> @ $
                {ECH_CLOUD_HOSTED_LIST_RATES.snapshotStorageGbMonthUsd}/GB-mo snapshot storage.
              </li>
              <li>
                Schemaless committed TiB/mo — same GB path for logs, metrics, and traces; no custom-metric
                SKU.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 mb-2">
              Serverless · Complete rates + Streams → S3
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>
                <strong>Ingest:</strong> ${pub.ingestLogsTracesPerGB.toFixed(2)}/GB Complete (as low as);
                metrics TSDS ${pub.ingestMetricsPerGB.toFixed(3)}/GB.
              </li>
              <li>
                <strong>Hot ({SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays}d):</strong> Complete retention $
                {pub.retentionLogsTracesPerGBMonth.toFixed(3)}/GB-mo.
              </li>
              <li>
                <strong>Older data ({SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days}d):</strong> Streams S3
                export estimated at ${SERVERLESS_STREAMS_S3_ARCHITECTURE.s3PerGBMonth.toFixed(3)}/GB-mo
                object storage, with workload identity (short-lived tokens; no static cloud keys in the
                exporter).
              </li>
              <li>
                Pipeline: {SERVERLESS_STREAMS_S3_ARCHITECTURE.dataPlane.join(" → ")}.
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/40 bg-slate-900 text-white p-4 mb-5 overflow-x-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-3">
            Serverless Streams → S3
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-md bg-blue-600 px-2.5 py-1.5">:4318 POST /v1/logs</span>
            <span className="text-slate-400">→</span>
            <span className="rounded-md border border-dashed border-slate-500 px-2 py-1.5 text-slate-200">
              Streams data plane
            </span>
            {SERVERLESS_STREAMS_S3_ARCHITECTURE.dataPlane.map((step, i) => (
              <span key={step} className="contents">
                {i === 0 ? <span className="text-slate-400">→</span> : null}
                <span className="rounded-md bg-amber-400 text-slate-900 px-2.5 py-1.5">{step}</span>
                {i < SERVERLESS_STREAMS_S3_ARCHITECTURE.dataPlane.length - 1 ? (
                  <span className="text-slate-400">→</span>
                ) : null}
              </span>
            ))}
            <span className="text-slate-400">→</span>
            <span className="rounded-md bg-rose-400 text-slate-900 px-2.5 py-1.5">S3</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Ingest and hot retention use published Complete rates. Older data can export to S3 with
            short-lived tokens from the Workload Identity Issuer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/15 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-2">
              Why there is no custom-metric SKU
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
              <li>
                <strong>Schemaless at ingest</strong> — logs, metrics, and traces share one GB-based path
              </li>
              <li>
                <strong>Streams + AI</strong> identify patterns and structure without a per-series metric
                catalog charge
              </li>
              <li>
                <strong>Billable path is ingest GB</strong> (plus retention) — cardinality affects volume,
                not a separate custom-metric line item
              </li>
              <li>
                Host counts and custom-metric series remain useful as capacity signals for sizing, not as
                Elastic commercial units
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-900/40 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">
              Not included in these block estimates
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
              <li>
                <strong>RUM / session packs</strong> — Elastic does not sell a packaged RUM or session-based
                SKU. Browser and mobile experience monitoring today relies on open-source /
                OpenTelemetry-oriented instrumentation; any such telemetry sent to Observability is billed
                as <strong>ingest GB</strong>, not sessions. A fuller RUM product experience (instrumentation,
                mobile SDKs, journey analysis) is on the roadmap and is not modeled here.
              </li>
              <li>Synthetics, Agent Builder, Workflows, and Managed LLM add-ons</li>
              <li>Support charges (Gold, Platinum, or Enterprise)</li>
              <li>Negotiated discounts and marketplace commitments</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Committed ingest blocks
        </h3>
        {oneTb && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Illustrative rates at <strong>1 TiB/month</strong> ({GB_PER_TIB} GiB/mo):{" "}
            <span className="text-blue-700 dark:text-blue-300 font-semibold">
              Elastic Cloud Hosted ~{formatBlockCurrency(oneTb.ech.perTbMonth)}/TiB-mo
            </span>
            {" · "}
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
              Serverless Streams→S3 ~{formatBlockCurrency(oneTb.serverless.perTbMonth)}/TiB-mo
            </span>
            {" · "}
            <span className="text-gray-500 dark:text-gray-400">
              Serverless Complete retention ({elasticRetentionMonths} mo) ~
              {formatBlockCurrency(oneTb.serverlessCompleteRetention.perTbMonth)}/TiB-mo
            </span>
            .
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3">Committed ingest block</th>
                <th className="px-4 py-3">Cloud Hosted / month</th>
                <th className="px-4 py-3">$/TiB-mo (Hosted)</th>
                <th className="px-4 py-3">Serverless Streams→S3 / mo</th>
                <th className="px-4 py-3">$/TiB-mo (Streams→S3)</th>
                <th className="px-4 py-3 text-gray-400">Complete retention / mo</th>
                <th className="px-4 py-3 text-gray-400">$/TiB-mo (Complete)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {quotes.map((row) => (
                <tr
                  key={row.tierTb}
                  className={`text-gray-800 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-gray-900/40 ${
                    row.tierTb === selectedTierTb
                      ? "bg-emerald-50/80 dark:bg-emerald-950/30"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.tierTb} TiB/mo
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal tabular-nums">
                      ~{Math.round(row.dailyIngestGb).toLocaleString()} GiB/day wire
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatBlockCurrency(row.ech.monthly)}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-blue-700 dark:text-blue-300">
                    {formatBlockCurrency(row.ech.perTbMonth)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatBlockCurrency(row.serverless.monthly)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-indigo-700 dark:text-indigo-300">
                    {formatBlockCurrency(row.serverless.perTbMonth)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-400">
                    {formatBlockCurrency(row.serverlessCompleteRetention.monthly)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-400">
                    {formatBlockCurrency(row.serverlessCompleteRetention.perTbMonth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
          Serverless rates from{" "}
          <a
            href={ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            elastic.co/pricing/serverless-observability
          </a>
          : Complete as low as ${pub.ingestLogsTracesPerGB.toFixed(2)}/GB ingest and $
          {pub.retentionLogsTracesPerGBMonth.toFixed(3)}/GB-mo retention for logs/traces; metrics TSDS $
          {pub.ingestMetricsPerGB.toFixed(3)} / ${pub.retentionMetricsPerGBMonth.toFixed(3)}; egress{" "}
          {OBSERVABILITY_SERVERLESS_PUBLISHED.egressFreeGB} GB free then $
          {OBSERVABILITY_SERVERLESS_PUBLISHED.egressPerGB.toFixed(2)}/GB. Streams→S3 estimates{" "}
          {SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days} days of older data at $
          {SERVERLESS_STREAMS_S3_ARCHITECTURE.s3PerGBMonth.toFixed(3)}/GB-mo object storage. Complete
          retention column keeps {elasticRetentionMonths} month
          {elasticRetentionMonths === 1 ? "" : "s"} on Search AI Lake at those published rates. Elastic
          Cloud Hosted from the Cloud Hosted pricing table. Illustrative only — confirm with your Elastic
          account team before purchasing decisions.
        </p>
      </section>
    </div>
  );
}
