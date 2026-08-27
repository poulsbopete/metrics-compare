"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SERVERLESS_ESTIMATOR_INPUTS,
  SERVERLESS_ESTIMATOR_EXAMPLE,
  calculateServerlessEstimator,
  ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  type ServerlessEstimatorInputs,
  type ServerlessEstimatorPricingMode,
} from "@/lib/serverlessEstimator";

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatGb(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)} TB`;
  if (n >= 100) return `${n.toFixed(0)} GB`;
  if (n >= 10) return `${n.toFixed(1)} GB`;
  return `${n.toFixed(2)} GB`;
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-16">{suffix}</span>
        )}
      </div>
      {hint && <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{hint}</span>}
    </label>
  );
}

export default function ServerlessEstimator() {
  const [inputs, setInputs] = useState<ServerlessEstimatorInputs>(SERVERLESS_ESTIMATOR_EXAMPLE);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo(() => calculateServerlessEstimator(inputs), [inputs]);

  const patch = (partial: Partial<ServerlessEstimatorInputs>) =>
    setInputs((prev) => ({ ...prev, ...partial }));

  const maxCompetitor = Math.max(
    result.monthlyTotal,
    ...result.competitors.map((c) => c.monthlyTotal),
    1
  );

  const comparisonRows = [
    {
      id: "elastic-serverless",
      name: "Elastic Serverless",
      color: "bg-blue-500",
      monthlyTotal: result.monthlyTotal,
      signals: {
        metrics: result.lines.find((l) => l.signal === "metrics")?.volumeCost ?? 0,
        logs: result.lines.find((l) => l.signal === "logs")?.volumeCost ?? 0,
        traces: result.lines.find((l) => l.signal === "traces")?.volumeCost ?? 0,
      },
      assumptions: "Observability Complete (this estimator)",
      isElastic: true as const,
    },
    ...result.competitors.map((c) => ({ ...c, isElastic: false as const })),
  ].sort((a, b) => a.monthlyTotal - b.monthlyTotal);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-sky-500 to-blue-600 rounded-full mr-3" />
              Observability Serverless estimator
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Enter volumes the same way as{" "}
              <a
                href="https://cloud.elastic.co/pricing/serverless?s=observability"
                className="underline font-medium text-blue-700 dark:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                Elastic Cloud Serverless pricing
              </a>
              . Fractional retention (e.g. 1.2 months) and high TPM are supported. Datadog and Grafana
              Cloud estimates use the same volumes (list-rate, approximate).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInputs({ ...SERVERLESS_ESTIMATOR_EXAMPLE })}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() => setInputs({ ...DEFAULT_SERVERLESS_ESTIMATOR_INPUTS })}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 mb-6">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Elastic pricing
          </span>
          {(
            [
              { id: "tiered" as const, label: "Volume tiers (Cloud table)" },
              { id: "floors" as const, label: "Published floors (as low as)" },
            ] as { id: ServerlessEstimatorPricingMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ pricingMode: opt.id })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                inputs.pricingMode === opt.id
                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Logs</h3>
            <NumberField
              label="Raw log data volume"
              value={inputs.logsGbPerDay}
              onChange={(n) => patch({ logsGbPerDay: n })}
              step={1}
              suffix="GB/day"
              hint={`Billed at ${result.logsMeteringMultiplier}× after enrichment`}
            />
            <NumberField
              label="Log retention"
              value={inputs.logsRetentionMonths}
              onChange={(n) => patch({ logsRetentionMonths: n })}
              step={0.1}
              min={0}
              suffix="months"
              hint="Decimals allowed (e.g. 1.2)"
            />
          </section>

          <section className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Metrics</h3>
            <NumberField
              label="Metrics data volume"
              value={inputs.metricsGbPerDay}
              onChange={(n) => patch({ metricsGbPerDay: n })}
              step={0.1}
              suffix="GB/day"
              hint="TSDS index mode (25% of Complete)"
            />
            <NumberField
              label="Metrics retention"
              value={inputs.metricsRetentionMonths}
              onChange={(n) => patch({ metricsRetentionMonths: n })}
              step={0.1}
              min={0}
              suffix="months"
            />
          </section>

          <section className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-950/20 p-4 space-y-3">
            <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200">Traces</h3>
            <NumberField
              label="Traces per minute (TPM)"
              value={inputs.tracesPerMinute}
              onChange={(n) => patch({ tracesPerMinute: n })}
              step={1}
              suffix="TPM"
            />
            <NumberField
              label="Trace sampling rate"
              value={inputs.traceSamplingPercent}
              onChange={(n) => patch({ traceSamplingPercent: Math.min(100, Math.max(0, n)) })}
              step={1}
              min={0}
              suffix="%"
            />
            <NumberField
              label="Trace retention"
              value={inputs.tracesRetentionMonths}
              onChange={(n) => patch({ tracesRetentionMonths: n })}
              step={0.1}
              min={0}
              suffix="months"
            />
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-[11px] font-medium text-violet-700 dark:text-violet-300 underline"
            >
              {showAdvanced ? "Hide" : "Show"} competitor assumptions
            </button>
            {showAdvanced && (
              <div className="space-y-3 pt-1 border-t border-violet-200/60 dark:border-violet-800/40">
                <NumberField
                  label="Bytes per span"
                  value={inputs.bytesPerSpan}
                  onChange={(n) => patch({ bytesPerSpan: n })}
                  step={10}
                  min={1}
                  suffix="bytes"
                  hint="TPM → Elastic GB (default 500)"
                />
                <NumberField
                  label="Datadog hosts (Infra + APM)"
                  value={inputs.datadogHosts ?? result.competitorVolumes.datadogHosts}
                  onChange={(n) => patch({ datadogHosts: Math.max(1, Math.round(n)) })}
                  step={1}
                  min={1}
                  suffix="hosts"
                  hint="Used for Datadog host SKUs"
                />
                <NumberField
                  label="Metrics bytes / datapoint"
                  value={
                    inputs.metricsBytesPerDatapoint ??
                    result.competitorVolumes.metricsBytesPerDatapoint
                  }
                  onChange={(n) => patch({ metricsBytesPerDatapoint: n })}
                  step={1}
                  min={1}
                  suffix="bytes"
                  hint={`→ ~${Math.round(result.competitorVolumes.metricsSamplesPerSecond).toLocaleString()} samples/sec for DD/Grafana`}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950/40 dark:to-blue-950/30 p-6 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">
            Elastic Serverless · monthly
          </div>
          <div className="text-4xl font-extrabold text-sky-950 dark:text-sky-50 tabular-nums">
            {formatUsd(result.monthlyTotal)}
          </div>
          <div className="text-sm text-sky-800/80 dark:text-sky-200/80 mt-1">
            {formatUsd(result.annualTotal)} / year
          </div>
          <div className="mt-5 space-y-2">
            {result.competitors.map((c) => {
              const cheaper = c.monthlyTotal > result.monthlyTotal;
              const pct =
                c.monthlyTotal > 0
                  ? Math.abs(
                      Math.round(
                        ((c.monthlyTotal - result.monthlyTotal) / c.monthlyTotal) * 100
                      )
                    )
                  : null;
              return (
                <div
                  key={c.id}
                  className="flex items-baseline justify-between gap-2 text-sm border-t border-sky-200/60 dark:border-sky-800/40 pt-2"
                >
                  <span className="text-sky-900/80 dark:text-sky-100/80">{c.name}</span>
                  <span className="tabular-nums font-semibold text-sky-950 dark:text-sky-50 text-right">
                    {formatUsd(c.monthlyTotal)}
                    {pct != null && cheaper && (
                      <span className="block text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Elastic ~{pct}% lower
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-sky-900/70 dark:text-sky-100/70 mt-4 leading-relaxed">
            Observability Complete ·{" "}
            {result.pricingMode === "tiered" ? "volume tier table" : "published floors"} ·{" "}
            {result.daysPerMonth.toFixed(2)} days/month. Competitor figures are approximate public
            list rates.
          </p>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Vendor comparison (logs + metrics + traces)
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {comparisonRows.map((row) => {
              const width = Math.max(4, (row.monthlyTotal / maxCompetitor) * 100);
              return (
                <div key={row.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {row.name}
                      </span>
                      {row.isElastic && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                          This estimate
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                      {formatUsd(row.monthlyTotal)}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                        /mo
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-900 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${row.color} opacity-90`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                    <span>Logs {formatUsd(row.signals.logs)}</span>
                    <span>Metrics {formatUsd(row.signals.metrics)}</span>
                    <span>Traces {formatUsd(row.signals.traces)}</span>
                  </div>
                  {!row.isElastic && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 leading-snug">
                      {row.assumptions}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Datadog/Grafana metrics convert Elastic metrics GB/day → samples using bytes/datapoint
            (tune under competitor assumptions). Datadog hosts default ≈1 GB log/day/host.
            Illustrative list rates only — not a quote.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Elastic Serverless · breakdown by signal
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Signal</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ingest / mo</th>
                <th className="px-4 py-2.5 text-right font-semibold">Stored</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ingest $</th>
                <th className="px-4 py-2.5 text-right font-semibold">Retention $</th>
                <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {result.lines.map((line) => (
                <tr key={line.signal} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 dark:text-white">{line.label}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-xs leading-snug">
                      {line.notes} · {line.retentionMonths} mo retention
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                    {formatGb(line.billableMonthlyIngestGB)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                    {formatGb(line.storedGB)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                    {formatUsd(line.ingestCost)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                    {formatUsd(line.retentionCost)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">
                    {formatUsd(line.volumeCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-sky-50 dark:bg-sky-950/30 font-bold">
                <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={5}>
                  Total
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-sky-900 dark:text-sky-100">
                  {formatUsd(result.monthlyTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Rates from{" "}
          <a
            href={ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Observability Serverless pricing
          </a>{" "}
          and the{" "}
          <a
            href={ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloud volume tier table
          </a>
          . Excludes Agent Builder, synthetics, LLM add-ons, and egress beyond the free tier.
        </div>
      </div>
    </div>
  );
}
