"use client";

import { useMemo } from "react";
import {
  EXAMPLE_WIRED_STREAMS,
  calculateElasticVolumeCostWithStreams,
  type ElasticStreamsSignalControls,
  type ElasticStreamsTcoPolicy,
  type ObservabilitySignal,
} from "@/lib/elasticStreamsTco";
import { ECH_HOT_FROZEN_ARCHITECTURE } from "@/lib/elasticEchHotFrozenPricing";
import { SERVERLESS_STREAMS_S3_ARCHITECTURE } from "@/lib/elasticServerlessStreamsS3Pricing";
import {
  elasticLogsMeteredMonthlyGB,
  type ElasticServerlessPricingOptions,
} from "@/lib/elasticServerlessPricing";
import { metricsToGB, BYTES_PER_DATAPOINT } from "@/lib/costCalculator";

interface ElasticStreamsTcoControlsProps {
  activeSignal: ObservabilitySignal;
  policy: ElasticStreamsTcoPolicy;
  onPolicyChange: (policy: ElasticStreamsTcoPolicy) => void;
  elasticPricing: ElasticServerlessPricingOptions;
  monthlyGB?: number;
  monthlyMetrics?: number;
  gbPerDay?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function signalLabel(signal: ObservabilitySignal): string {
  return signal === "tracing" ? "traces" : signal;
}

function updateSignalControls(
  policy: ElasticStreamsTcoPolicy,
  signal: ObservabilitySignal,
  patch: Partial<ElasticStreamsSignalControls>
): ElasticStreamsTcoPolicy {
  const key = signal === "tracing" ? "traces" : signal;
  return {
    ...policy,
    enabled: true,
    [key]: { ...policy[key], ...patch },
  };
}

function PctSlider({
  label,
  hint,
  value,
  enabled,
  onEnabledChange,
  onValueChange,
  savingsMonthly,
}: {
  label: string;
  hint: string;
  value: number;
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  onValueChange: (pct: number) => void;
  savingsMonthly: number;
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        enabled
          ? "border-violet-300 dark:border-violet-700 bg-white/80 dark:bg-gray-900/50"
          : "border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/20 opacity-70"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <label className="flex items-center gap-2 cursor-pointer min-w-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
            className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
          />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        </label>
        <div className="flex items-center gap-2 text-xs">
          {enabled && savingsMonthly > 0 && (
            <span className="font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
              −{formatCurrency(savingsMonthly)}/mo
            </span>
          )}
          <span
            className={`tabular-nums font-bold ${
              enabled ? "text-violet-700 dark:text-violet-300" : "text-gray-400"
            }`}
          >
            {value}% removed
          </span>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{hint}</p>
      <input
        type="range"
        min={0}
        max={90}
        step={1}
        disabled={!enabled}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600 disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>0% (keep all)</span>
        <span>Conservative</span>
        <span>Aggressive 90%</span>
      </div>
    </div>
  );
}

export default function ElasticStreamsTcoControls({
  activeSignal,
  policy,
  onPolicyChange,
  elasticPricing,
  monthlyGB = 0,
  monthlyMetrics = 0,
  gbPerDay = 0,
}: ElasticStreamsTcoControlsProps) {
  const signalKey = activeSignal === "tracing" ? "traces" : activeSignal;
  const controls = policy[signalKey];

  const costResult = useMemo(() => {
    const empty = {
      percent: 0,
      monthly: 0,
      ingestReductionPercent: 0,
      levers: { dropPctApplied: 0, aggregatePctApplied: 0, downsamplePctApplied: 0 },
      leverSavings: { dropMonthly: 0, aggregateMonthly: 0, downsampleMonthly: 0 },
    };

    if (activeSignal === "metrics") {
      const monthlyMetricsGB = metricsToGB(monthlyMetrics, BYTES_PER_DATAPOINT.Mixed);
      if (monthlyMetricsGB <= 0) return empty;
      const result = calculateElasticVolumeCostWithStreams(
        monthlyMetricsGB,
        { ...elasticPricing, productTier: "observability-complete" },
        { ...policy, enabled: true },
        "metrics",
        { platformKind: "serverless", metricsTsd: true, productTier: "observability-complete" }
      );
      return {
        percent: Math.round(result.savingsPercent),
        monthly: Math.max(0, result.baselineVolumeCost - result.volumeCost),
        ingestReductionPercent: Math.round(result.adjustment.ingestReductionPercent),
        levers: result.adjustment.levers,
        leverSavings: result.leverSavings,
      };
    }

    const ingestGB =
      activeSignal === "logs" && gbPerDay > 0
        ? elasticLogsMeteredMonthlyGB(gbPerDay)
        : monthlyGB;

    if (ingestGB <= 0) return empty;

    const result = calculateElasticVolumeCostWithStreams(
      ingestGB,
      { ...elasticPricing, productTier: "observability-complete" },
      { ...policy, enabled: true },
      activeSignal,
      { platformKind: "serverless", productTier: "observability-complete" }
    );
    return {
      percent: Math.round(result.savingsPercent),
      monthly: Math.max(0, result.baselineVolumeCost - result.volumeCost),
      ingestReductionPercent: Math.round(result.adjustment.ingestReductionPercent),
      levers: result.adjustment.levers,
      leverSavings: result.leverSavings,
    };
  }, [activeSignal, elasticPricing, gbPerDay, monthlyGB, monthlyMetrics, policy]);

  const showAggregate = activeSignal === "metrics" || activeSignal === "logs";
  const showDownsample = activeSignal === "metrics";

  const patch = (p: Partial<ElasticStreamsSignalControls>) =>
    onPolicyChange(updateSignalControls(policy, activeSignal, p));

  return (
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/25 p-4 mb-4">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
          Elastic Cloud Hosted (ECH)
        </h4>
        <p className="text-xs text-blue-800/90 dark:text-blue-200/90">
          All <strong>ECH</strong> rows always use{" "}
          <strong>{ECH_HOT_FROZEN_ARCHITECTURE.summary}</strong> — 1-day data hot (RAM-hour) plus{" "}
          {ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays}-day ILM on blob (writable frozen, queryable in Kibana). Full-fidelity
          ingest; no Streams sampling on ECH.
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Elastic Serverless · Streams shaping
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
            <strong>Serverless</strong> uses <strong>{SERVERLESS_STREAMS_S3_ARCHITECTURE.summary}</strong> plus
            the ingest shaping below. Dial each lever’s <strong>% volume removed</strong> to match how aggressive
            this customer wants to be — every environment differs. Chart totals update as you change these.
          </p>
        </div>
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-4 py-3 text-right shrink-0 min-w-[9rem]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
            Savings vs unshaped
          </div>
          <div className="text-2xl font-bold text-violet-700 dark:text-violet-200">
            {costResult.percent}%
          </div>
          <div className="text-xs text-violet-600 dark:text-violet-400">
            ~{formatCurrency(costResult.monthly)}/mo
          </div>
          {costResult.ingestReductionPercent > 0 && (
            <div className="text-[10px] text-violet-500 dark:text-violet-400 mt-1">
              {costResult.ingestReductionPercent}% less ingest GB
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/20 p-4 mb-4 space-y-3">
        <PctSlider
          label="Drop / filter"
          hint={
            activeSignal === "tracing"
              ? "Tail-sample + drop noisy spans (errors kept separately in field practice)."
              : activeSignal === "metrics"
              ? "Drop unused / noisy metric series before ingest."
              : "Drop noisy fields and low-value log events at ingest."
          }
          value={controls.dropPct}
          enabled={controls.drop}
          onEnabledChange={(on) => patch({ drop: on })}
          onValueChange={(pct) => patch({ dropPct: pct, drop: true })}
          savingsMonthly={costResult.leverSavings.dropMonthly}
        />

        {showAggregate && (
          <PctSlider
            label="Aggregate / roll up"
            hint={
              activeSignal === "metrics"
                ? "Roll up high-cardinality series (TSDS / stream processors)."
                : "Aggregate repetitive log patterns to reduce ingest volume."
            }
            value={controls.aggregatePct}
            enabled={controls.aggregate}
            onEnabledChange={(on) => patch({ aggregate: on })}
            onValueChange={(pct) => patch({ aggregatePct: pct, aggregate: true })}
            savingsMonthly={costResult.leverSavings.aggregateMonthly}
          />
        )}

        {showDownsample && (
          <PctSlider
            label="Downsample (aged data)"
            hint="Reduce resolution on data older than the 1-day hot window before/while it lands on S3. Hot stays full fidelity."
            value={controls.downsamplePct}
            enabled={controls.downsample}
            onEnabledChange={(on) => patch({ downsample: on })}
            onValueChange={(pct) => patch({ downsamplePct: pct, downsample: true })}
            savingsMonthly={costResult.leverSavings.downsampleMonthly}
          />
        )}

        <div className="pt-2">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {signalLabel(activeSignal)} Streams policy retention:{" "}
            <span className="text-violet-600 dark:text-violet-400 normal-case">
              {controls.retentionDays} days
            </span>
            <span className="ml-2 font-normal normal-case text-gray-400">
              (example wired streams; total Serverless keep uses the retention slider above)
            </span>
          </label>
          <input
            type="range"
            min={7}
            max={activeSignal === "tracing" ? 30 : 365}
            step={activeSignal === "tracing" ? 1 : activeSignal === "logs" ? 1 : 7}
            value={controls.retentionDays}
            onChange={(e) => patch({ retentionDays: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600"
          />
        </div>

        <a
          href="https://www.elastic.co/docs/solutions/observability/data-streams"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-violet-700 dark:text-violet-300 underline"
        >
          Open Streams in Kibana →
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 pr-4 font-semibold uppercase tracking-wide">Example wired stream</th>
              <th className="pb-2 pr-4 font-semibold uppercase tracking-wide">Signal</th>
              <th className="pb-2 pr-4 font-semibold uppercase tracking-wide">Processing</th>
              <th className="pb-2 font-semibold uppercase tracking-wide">Retention</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_WIRED_STREAMS.filter((row) => {
              if (activeSignal === "metrics") return row.signal === "metrics";
              if (activeSignal === "tracing") return row.signal === "traces";
              return row.signal === "logs";
            }).map((row) => (
              <tr
                key={row.stream}
                className="border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300"
              >
                <td className="py-2 pr-4 font-mono text-[11px]">{row.stream}</td>
                <td className="py-2 pr-4 capitalize">{row.signal}</td>
                <td className="py-2 pr-4">{row.actions}</td>
                <td className="py-2">{row.retentionDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DEFAULT_ELASTIC_STREAMS_TCO } from "@/lib/elasticStreamsTco";
