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
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20">{suffix}</span>
        )}
      </div>
      {hint && <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{hint}</span>}
    </label>
  );
}

function observabilityOnly(inputs: ServerlessEstimatorInputs): ServerlessEstimatorInputs {
  return { ...inputs, solution: "observability" };
}

export default function ServerlessEstimator() {
  const [inputs, setInputs] = useState<ServerlessEstimatorInputs>(() =>
    observabilityOnly(SERVERLESS_ESTIMATOR_EXAMPLE)
  );

  const result = useMemo(
    () => calculateServerlessEstimator(observabilityOnly(inputs)),
    [inputs]
  );

  const patch = (partial: Partial<ServerlessEstimatorInputs>) =>
    setInputs((prev) => observabilityOnly({ ...prev, ...partial }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-950 dark:text-rose-100 leading-relaxed">
        <strong>Observability Serverless only.</strong> Security and Search estimators, and competitor
        side-by-side pricing, have been removed from this public tool. For Security quotes use the
        official{" "}
        <a
          href="https://cloud.elastic.co/pricing/serverless?s=security"
          className="underline font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          Elastic Cloud Serverless Security estimator
        </a>{" "}
        or your internal spreadsheet / PM tool — not this site.
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-sky-500 to-blue-600 rounded-full mr-3" />
              Elastic Serverless estimator
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Observability Complete — logs, metrics, and traces. Same rates as{" "}
              <a
                href="https://cloud.elastic.co/pricing/serverless?s=observability"
                className="underline font-medium text-blue-700 dark:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                cloud.elastic.co/pricing/serverless
              </a>
              {" "}
              (
              <a
                href={ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL}
                className="underline font-medium text-blue-700 dark:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                marketing floors
              </a>
              {" · "}
              <a
                href={ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL}
                className="underline font-medium text-blue-700 dark:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                volume tiers
              </a>
              ). Unofficial — confirm before customer quotes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInputs(observabilityOnly(SERVERLESS_ESTIMATOR_EXAMPLE))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() =>
                setInputs(observabilityOnly({ ...DEFAULT_SERVERLESS_ESTIMATOR_INPUTS }))
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
              Pricing mode
            </span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              {(
                [
                  { id: "tiered" as const, label: "Volume tiers (Cloud table)" },
                  { id: "floors" as const, label: "Published floors" },
                ] as { id: ServerlessEstimatorPricingMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ pricingMode: opt.id })}
                  className={`px-3 py-2 text-xs font-semibold ${
                    inputs.pricingMode === opt.id
                      ? "bg-sky-600 text-white"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 max-w-md">
              Prefer <strong>Volume tiers</strong> for quotes that should track the public Cloud
              estimator. Published floors are marketing “as low as” rates at high volume.
            </p>
          </div>
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
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950/40 dark:to-blue-950/30 p-6 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">
            {result.productLabel} · monthly
          </div>
          <div className="text-4xl font-extrabold text-sky-950 dark:text-sky-50 tabular-nums">
            {formatUsd(result.monthlyTotal)}
          </div>
          <div className="text-sm text-sky-800/80 dark:text-sky-200/80 mt-1">
            {formatUsd(result.annualTotal)} / year
          </div>
          <p className="text-[11px] text-sky-900/70 dark:text-sky-100/70 mt-4 leading-relaxed">
            Mode: {inputs.pricingMode === "tiered" ? "Cloud volume tiers" : "Published floors"}.
            Illustrative — not a quote.
          </p>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Observability Complete · line items
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Line</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ingest / mo</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Stored</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Rate</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {result.lines.map((line) => (
                  <tr key={line.signal} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">{line.label}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-md leading-snug">
                        {line.notes}
                        {line.retentionMonths > 0 ? ` · ${line.retentionMonths} mo retention` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                      {formatGb(line.billableMonthlyIngestGB)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                      {formatGb(line.storedGB)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200 text-[11px]">
                      {line.ingestRateLabel || line.retentionRateLabel || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">
                      {formatUsd(line.volumeCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sky-50 dark:bg-sky-950/30 font-bold">
                  <td className="px-4 py-3 text-gray-900 dark:text-white" colSpan={4}>
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
            Sources:{" "}
            <a
              href={ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Observability Serverless pricing
            </a>{" "}
            ·{" "}
            <a
              href={ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloud volume tiers
            </a>
            . Not a quote — confirm with measured usage and the official Cloud estimator.
          </div>
        </div>
      </div>
    </div>
  );
}
