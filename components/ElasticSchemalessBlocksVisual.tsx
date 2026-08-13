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
import { ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL } from "@/lib/elasticServerlessPricing";

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

  const completeVsS3 =
    selected && selected.serverless.monthly > 0
      ? selected.serverlessCompleteRetention.monthly / selected.serverless.monthly
      : null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero: all-in unit price for selected block */}
      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-200/60 dark:border-emerald-800/40 p-6">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
            Elastic unit economics · schemaless data blocks
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Commit ingest blocks — long retention on S3, not Complete GB-months
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            OpenTelemetry, Elastic Agent, and Beats land <strong>logs, metrics, and traces</strong> in
            the same project. The commercial unit is <strong>committed ingested TiB/month</strong> on
            the wire. TCO drops when aged data lives on <strong>object storage</strong>: ECH via ILM →
            blob; Serverless via <strong>Streams → S3</strong> (source → processors → S3 exporter,
            workload-identity JWTs). ECH and Serverless land at <strong>comparable $/TiB</strong> on
            that architecture — not Complete retention tiers.
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
                Same all-in rate whether the bytes are logs, metrics, or traces.
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/70 dark:bg-blue-950/30 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-800 dark:text-blue-200 mb-1">
                ECH · {ECH_HOT_FROZEN_ARCHITECTURE.summary}
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
                Full fidelity · hot for triage · aged on blob
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
              <p className="text-xs text-indigo-800 dark:text-indigo-200 mt-2">
                Roadmap · comparable to ECH when aged data is on S3
              </p>
            </div>
          </div>
        )}

        {selected && completeVsS3 !== null && completeVsS3 > 2 && (
          <p className="mt-4 text-sm text-amber-800 dark:text-amber-200/90 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3">
            <strong>Do not lead with Complete retention GB-months.</strong> That workbook path is ~
            {completeVsS3.toFixed(0)}× this block (
            {formatBlockCurrency(selected.serverlessCompleteRetention.perTbMonth)}/TiB-mo) because it
            keeps aged data on Observability Complete retention instead of Streams → S3. Use Full Stack
            TCO only when an RFP forces that metering.
          </p>
        )}
      </section>

      {/* Architecture: Streams → S3 */}
      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          Why long retention lowers TCO
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 max-w-3xl">
          Lead with <strong>where aged data lives</strong>. Incident triage needs a short hot window;
          compliance and historical queries belong on cheap, searchable object storage — ECH blob or
          Serverless Streams → S3.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
              ECH · ingest + hot → blob (S3-class)
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>
                <strong>{ECH_HOT_FROZEN_ARCHITECTURE.hotDays}-day hot</strong> (RAM-hour) for
                sub-second triage on live signals.
              </li>
              <li>
                <strong>
                  ILM → {ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays}d writable frozen on blob
                </strong>{" "}
                (~${ECH_CLOUD_HOSTED_LIST_RATES.snapshotStorageGbMonthUsd}/GB-mo) — searchable aged
                logs, metrics, and traces without a 30-day hot tax.
              </li>
              <li>
                Schemaless: one committed TiB/mo covers mixed OTLP — no separate metrics / logs / APM
                line items in the block rate.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-100 mb-2">
              Serverless · Streams data plane → S3
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>
                <strong>Streams data plane:</strong>{" "}
                {SERVERLESS_STREAMS_S3_ARCHITECTURE.dataPlane.join(" → ")} — shape signals, then export
                aged bytes to S3.
              </li>
              <li>
                <strong>Secure auth:</strong> {SERVERLESS_STREAMS_S3_ARCHITECTURE.identity} — zero
                static AWS keys in the exporter; refresh on expiry.
              </li>
              <li>
                <strong>
                  {SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays}d hot ·{" "}
                  {SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days}d S3
                </strong>{" "}
                — same retention shape as ECH, so Data Blocks quote{" "}
                <strong>comparable $/TiB</strong> (illustrative until Streams→S3 list rates publish).
              </li>
            </ul>
          </div>
        </div>

        {/* Mini architecture flow */}
        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-800/40 bg-slate-900 text-white p-4 mb-5 overflow-x-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-3">
            Serverless Streams → S3 (architecture)
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
            S3 exporter gets a short-lived JWT from the Workload Identity Issuer (POST /token via ECP
            proxy) — federated identity, no static credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/15 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-2">
              In the block unit price
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
              <li>Committed ingest volume (TiB/mo on the wire)</li>
              <li>Logs · metrics · traces — schemaless, one rate</li>
              <li>ECH: hot capacity + blob + transfer</li>
              <li>Serverless: hot + Streams → S3 (comparable backbone)</li>
              <li>Kibana, ES|QL, alerting, APM on the same project</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/60 dark:bg-gray-900/40 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">
              Not in the block unit price
            </h4>
            <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
              <li>
                <strong>Host packs</strong> — inventory for ops, not the commercial unit
              </li>
              <li>
                <strong>Custom-metric SKUs</strong> — capacity signal only; billable path is ingest GB
              </li>
              <li>
                <strong>RUM / session packs</strong> — discuss separately if required for scoring
              </li>
              <li>
                <strong>Complete retention GB-months</strong> — legacy path when not using Streams → S3
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Block table */}
      <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Committed ingest blocks
        </h3>
        {oneTb && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Illustrative effective rates at <strong>1 TiB/month</strong> ({GB_PER_TIB} GiB/mo):{" "}
            <span className="text-blue-700 dark:text-blue-300 font-semibold">
              ECH ~{formatBlockCurrency(oneTb.ech.perTbMonth)}/TiB-mo
            </span>
            {" · "}
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
              Serverless Streams→S3 ~{formatBlockCurrency(oneTb.serverless.perTbMonth)}/TiB-mo
            </span>
            {" · "}
            <span className="text-gray-500 dark:text-gray-400">
              Complete retention (no S3 export) ~{" "}
              {formatBlockCurrency(oneTb.serverlessCompleteRetention.perTbMonth)}/TiB-mo — contrast
              only
            </span>
            .
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3">Committed ingest block</th>
                <th className="px-4 py-3">ECH / month</th>
                <th className="px-4 py-3">$/TiB-mo (ECH)</th>
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
                  <td className="px-4 py-3 tabular-nums text-gray-400 line-through decoration-gray-300">
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
          <strong>Primary columns:</strong> ECH ({ECH_HOT_FROZEN_ARCHITECTURE.hotDays}d hot +{" "}
          {ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays}d blob) and Serverless Streams → S3 (
          {SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays}d hot +{" "}
          {SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days}d S3) share the same illustrative hot +
          object-storage backbone so Data Blocks show <strong>comparable TCO</strong>. Streams→S3 is
          roadmap — confirm list rates with your account team.{" "}
          <strong>Complete retention</strong> columns are the legacy Observability Complete ingest +
          retention GB-month path (Streams shaping, {elasticRetentionMonths} mo slider) — useful as
          contrast, not the lead story. Per-signal tabs / Full Stack still apply TSDS 25% and logs
          1.66× for vendor-parity bake-offs. Not a quote — see{" "}
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
    </div>
  );
}
