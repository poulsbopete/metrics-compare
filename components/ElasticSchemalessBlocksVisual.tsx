"use client";

import { useMemo } from "react";
import {
  formatBlockCurrency,
  GB_PER_TIB,
  quoteAllSchemalessBlocks,
  SCHEMALESS_BLOCK_TIERS_TB,
} from "@/lib/elasticSchemalessBlocks";
import { ECH_HOT_FROZEN_ARCHITECTURE } from "@/lib/elasticEchHotFrozenPricing";
import { ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL } from "@/lib/elasticServerlessPricing";

interface ElasticSchemalessBlocksVisualProps {
  elasticRetentionMonths?: number;
}

export default function ElasticSchemalessBlocksVisual({
  elasticRetentionMonths = 1,
}: ElasticSchemalessBlocksVisualProps) {
  const quotes = useMemo(
    () => quoteAllSchemalessBlocks(elasticRetentionMonths),
    [elasticRetentionMonths]
  );

  const oneTb = quotes.find((q) => q.tierTb === 1);

  return (
    <section className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-2">
          <span className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full mr-3" />
          Schemaless observability · data blocks
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
          Elastic Observability is <strong>schemaless at ingest</strong>: OpenTelemetry, Elastic Agent, and
          Beats can land <strong>logs, metrics, and traces</strong> in the same project without picking a
          separate SKU per signal. For planning, think in <strong>committed data blocks</strong> — monthly
          ingested tebibytes (TiB) on the wire — not “metrics SKU + logs SKU + APM SKU.” ES|QL, Kibana, and
          alerting run across those bytes in one place; Streams and ILM shape cost per stream, not per product
          line item.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-2">
            One block, any signal
          </h3>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            1 TiB/month of mixed OTLP (logs + metrics + traces) bills the same backbone GB as 1 TiB/month of
            logs-only — volume is <strong>ingested GB</strong>, not index type.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/20 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200 mb-2">
            ECH data block
          </h3>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            {ECH_HOT_FROZEN_ARCHITECTURE.summary}. Enterprise commits often quote{" "}
            <strong>$/TiB-month</strong> on this hot + frozen architecture.
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/60 dark:bg-indigo-950/20 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200 mb-2">
            Serverless data block
          </h3>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            Observability Complete ingest + retention tiers per{" "}
            <a href={ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL} className="underline" target="_blank" rel="noopener noreferrer">
              cloud.elastic.co
            </a>
            , with <strong>Streams TCO</strong> applied by default in this calculator.
          </p>
        </div>
      </div>

      {oneTb && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Illustrative effective rates at <strong>1 TiB/month</strong> steady ingest ({GB_PER_TIB} GiB/mo):{" "}
          <span className="text-blue-700 dark:text-blue-300 font-semibold">
            ECH ~{formatBlockCurrency(oneTb.ech.perTbMonth)}/TiB-mo
          </span>
          {" · "}
          <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
            Serverless (Streams) ~{formatBlockCurrency(oneTb.serverless.perTbMonth)}/TiB-mo
          </span>
          . Scale rows below multiply roughly linearly with committed TiB when tier tables are flat; at 50–500
          TiB/mo, Complete tiering lowers $/TiB.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3">Committed ingest block</th>
              <th className="px-4 py-3">ECH / month</th>
              <th className="px-4 py-3">ECH / year</th>
              <th className="px-4 py-3">$/TiB-mo (ECH)</th>
              <th className="px-4 py-3">Serverless / month</th>
              <th className="px-4 py-3">Serverless / year</th>
              <th className="px-4 py-3">$/TiB-mo (Serverless)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {quotes.map((row) => (
              <tr key={row.tierTb} className="text-gray-800 dark:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-gray-900/40">
                <td className="px-4 py-3 font-medium">
                  {row.tierTb} TiB/mo
                  <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal tabular-nums">
                    ~{Math.round(row.dailyIngestGb).toLocaleString()} GiB/day wire
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatBlockCurrency(row.ech.monthly)}</td>
                <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-gray-400">
                  {formatBlockCurrency(row.ech.annual)}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-blue-700 dark:text-blue-300">
                  {formatBlockCurrency(row.ech.perTbMonth)}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatBlockCurrency(row.serverless.monthly)}</td>
                <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-gray-400">
                  {formatBlockCurrency(row.serverless.annual)}
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold text-indigo-700 dark:text-indigo-300">
                  {formatBlockCurrency(row.serverless.perTbMonth)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
        Per-tab TCO comparisons above may still show signal-specific assumptions (e.g. TSDS metrics at 25% of
        Complete on Serverless, logs 1.66× metering) for vendor parity. This table is the{" "}
        <strong>unified schemaless block</strong> view: same ingested TiB/month for any mix of logs, metrics, and
        traces. Serverless column uses Complete-tier math with Streams defaults; retention slider (
        {elasticRetentionMonths} mo) applies to Serverless tiering. ECH column ignores that slider and uses{" "}
        {ECH_HOT_FROZEN_ARCHITECTURE.hotDays}d hot + {ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays}d blob. Not a quote —
        confirm with your account team and{" "}
        <a
          href={ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Elastic Cloud pricing
        </a>
        .
      </p>
    </section>
  );
}
