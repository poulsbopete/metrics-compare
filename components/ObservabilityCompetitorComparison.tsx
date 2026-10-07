"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SERVERLESS_ESTIMATOR_INPUTS,
  SERVERLESS_ESTIMATOR_EXAMPLE,
  calculateServerlessEstimator,
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

function observabilityOnly(inputs: ServerlessEstimatorInputs): ServerlessEstimatorInputs {
  return { ...inputs, solution: "observability" };
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
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        {suffix && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20">{suffix}</span>
        )}
      </div>
      {hint && <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{hint}</span>}
    </label>
  );
}

export type ObservabilityCompetitorComparisonProps = {
  inputs: ServerlessEstimatorInputs;
  onInputsChange: (inputs: ServerlessEstimatorInputs) => void;
};

export default function ObservabilityCompetitorComparison({
  inputs,
  onInputsChange,
}: ObservabilityCompetitorComparisonProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const result = useMemo(
    () => calculateServerlessEstimator(observabilityOnly(inputs)),
    [inputs]
  );

  const patch = (partial: Partial<ServerlessEstimatorInputs>) =>
    onInputsChange(observabilityOnly({ ...inputs, ...partial }));

  const formatSignalCell = (covered: boolean, cost: number | null) => {
    if (!covered) {
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }
    if (cost == null) {
      return (
        <span
          className="text-emerald-600 dark:text-emerald-400 font-medium"
          title="Covered (not metered on this Observability worksheet)"
        >
          ✓
        </span>
      );
    }
    return <span className="tabular-nums">{formatUsd(cost)}</span>;
  };

  const summaryVendors = useMemo(() => {
    const ids = [
      "elastic-serverless",
      "elastic-ech",
      "elastic-self-hosted",
      "grafana-cloud",
      "datadog",
    ] as const;
    return ids
      .map((id) => result.competitors.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c != null)
      .sort((a, b) => a.monthlyTotal - b.monthlyTotal);
  }, [result.competitors]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full mr-3" />
              Observability competitor comparison
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Same volumes as the Serverless Estimator — Elastic Serverless / ECH vs Datadog, Grafana
              Cloud, Dynatrace, New Relic, Splunk O11y, VictoriaMetrics, Prometheus, and peers.
              Totals sum only the signals each vendor covers (metrics-only stacks look cheap until you
              add logs/traces). Illustrative list rates — not a quote.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onInputsChange(observabilityOnly(SERVERLESS_ESTIMATOR_EXAMPLE))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() =>
                onInputsChange(observabilityOnly({ ...DEFAULT_SERVERLESS_ESTIMATOR_INPUTS }))
              }
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Elastic pricing mode
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              {(
                [
                  { id: "tiered" as const, label: "Volume tiers" },
                  { id: "floors" as const, label: "Published floors" },
                ] as { id: ServerlessEstimatorPricingMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ pricingMode: opt.id })}
                  className={`px-3 py-2 text-xs font-semibold ${
                    inputs.pricingMode === opt.id
                      ? "bg-amber-600 text-white"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] font-medium text-amber-700 dark:text-amber-300 underline"
          >
            {showAdvanced ? "Hide" : "Show"} Datadog host assumption
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Logs</h3>
            <NumberField
              label="Raw log data volume"
              value={inputs.logsGbPerDay}
              onChange={(n) => patch({ logsGbPerDay: n })}
              step={1}
              suffix="GB/day"
            />
            <NumberField
              label="Log retention"
              value={inputs.logsRetentionMonths}
              onChange={(n) => patch({ logsRetentionMonths: n })}
              step={0.1}
              min={0}
              suffix="months"
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
              hint={`→ ~${Math.round(result.competitorVolumes.metricsSamplesPerSecond).toLocaleString()} samples/sec`}
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
            {showAdvanced && (
              <NumberField
                label="Datadog hosts (estimate)"
                value={inputs.datadogHosts ?? result.competitorVolumes.datadogHosts}
                onChange={(n) => patch({ datadogHosts: Math.max(1, Math.round(n)) })}
                step={1}
                min={1}
                suffix="hosts"
                hint="Used for Datadog infra + APM host lines"
              />
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/30 p-6 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">
            Stack comparison
          </div>
          <div className="space-y-2 mt-2">
            {summaryVendors.map((c) => (
              <div
                key={c.id}
                className={`flex items-baseline justify-between gap-2 text-sm border-t border-amber-200/70 dark:border-amber-800/40 pt-2 ${
                  c.id === "elastic-serverless"
                    ? "rounded-lg bg-white/50 dark:bg-gray-900/30 -mx-1 px-1 py-1 border-t-0"
                    : ""
                }`}
              >
                <span className="text-amber-950/80 dark:text-amber-100/80">
                  {c.name}
                  <span className="block text-[10px] text-amber-800/60 dark:text-amber-300/60">
                    {c.coverageLabel}
                  </span>
                </span>
                <span className="tabular-nums font-semibold text-amber-950 dark:text-amber-50">
                  {formatUsd(c.monthlyTotal)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-900/70 dark:text-amber-100/70 mt-4 leading-relaxed">
            Highlighted four · full vendor table →
          </p>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Vendor coverage & estimated monthly cost
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              ✓ / $ = covered in this estimate · — = not in product scope · Security ✓ without $ means
              capability exists but is not metered on the Observability worksheet
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Vendor</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Metrics</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Traces</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Logs</th>
                  <th className="px-2 py-2.5 text-center font-semibold">Security</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total / mo</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {result.competitors.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.isElastic
                        ? "bg-blue-50/60 dark:bg-blue-950/20"
                        : "hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                    }
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                            {row.name}
                          </div>
                          {row.isElastic && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                              Elastic
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">
                      {formatSignalCell(row.coverage.metrics, row.signals.metrics)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">
                      {formatSignalCell(row.coverage.traces, row.signals.traces)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">
                      {formatSignalCell(row.coverage.logs, row.signals.logs)}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">
                      {formatSignalCell(row.coverage.security, row.signals.security)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white text-xs sm:text-sm">
                      {formatUsd(row.monthlyTotal)}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-500 dark:text-gray-400 max-w-[10rem]">
                      <div className="font-medium text-gray-700 dark:text-gray-300">
                        {row.coverageLabel}
                      </div>
                      <div className="leading-snug mt-0.5 line-clamp-2" title={row.assumptions}>
                        {row.assumptions}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            VictoriaMetrics / Prometheus / Thanos / Cortex are metrics-only — their totals exclude
            logs and traces you still need elsewhere. Competitor rates are approximate public list
            proxies. Confirm with official pricing before customer-facing quotes.
          </div>
        </div>
      </div>
    </div>
  );
}
