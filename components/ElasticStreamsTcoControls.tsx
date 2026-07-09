"use client";

import { useMemo } from "react";
import {
  DEFAULT_ELASTIC_STREAMS_TCO,
  EXAMPLE_WIRED_STREAMS,
  calculateElasticVolumeCostWithStreams,
  type ElasticStreamsSignalControls,
  type ElasticStreamsTcoPolicy,
  type ObservabilitySignal,
} from "@/lib/elasticStreamsTco";
import type { ElasticServerlessPricingOptions } from "@/lib/elasticServerlessPricing";
import { elasticLogsMeteredMonthlyGB } from "@/lib/elasticServerlessPricing";
import { metricsToGB, BYTES_PER_DATAPOINT } from "@/lib/costCalculator";

interface ElasticStreamsTcoControlsProps {
  activeSignal: ObservabilitySignal;
  policy: ElasticStreamsTcoPolicy;
  onPolicyChange: (policy: ElasticStreamsTcoPolicy) => void;
  elasticPricing: ElasticServerlessPricingOptions;
  /** Raw monthly GB for logs/traces; undefined on metrics tab */
  monthlyGB?: number;
  /** Monthly metrics datapoints on metrics tab */
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
    [key]: { ...policy[key], ...patch },
  };
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

  const illustrativeSavings = useMemo(() => {
    if (activeSignal === "metrics") {
      const monthlyMetricsGB = metricsToGB(monthlyMetrics, BYTES_PER_DATAPOINT.Mixed);
      if (monthlyMetricsGB <= 0) return { percent: 0, monthly: 0 };
      const result = calculateElasticVolumeCostWithStreams(
        monthlyMetricsGB,
        { ...elasticPricing, productTier: "observability-complete" },
        policy,
        "metrics",
        { platformKind: "serverless", metricsTsd: true, productTier: "observability-complete" }
      );
      return {
        percent: Math.round(result.savingsPercent),
        monthly: Math.max(0, result.baselineVolumeCost - result.volumeCost),
      };
    }

    const ingestGB =
      activeSignal === "logs" && gbPerDay > 0
        ? elasticLogsMeteredMonthlyGB(gbPerDay)
        : monthlyGB;

    if (ingestGB <= 0) return { percent: 0, monthly: 0 };

    const result = calculateElasticVolumeCostWithStreams(
      ingestGB,
      { ...elasticPricing, productTier: "observability-complete" },
      policy,
      activeSignal,
      { platformKind: "serverless", productTier: "observability-complete" }
    );
    return {
      percent: Math.round(result.savingsPercent),
      monthly: Math.max(0, result.baselineVolumeCost - result.volumeCost),
    };
  }, [activeSignal, elasticPricing, gbPerDay, monthlyGB, monthlyMetrics, policy]);

  const toggleControl = (key: keyof Pick<ElasticStreamsSignalControls, "drop" | "aggregate" | "downsample">) => {
    if (key === "downsample" && activeSignal !== "metrics") return;
    onPolicyChange(updateSignalControls(policy, activeSignal, { [key]: !controls[key] }));
  };

  return (
    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Signal-aware TCO controls · Elastic Streams
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl">
            Elastic Streams adds a <strong>Processing</strong> tab (drop, parse, aggregate) and a{" "}
            <strong>Retention</strong> tab (searchable snapshots via DSL/ILM) per stream in Kibana — so you
            bill for value, not noise. When enabled, Elastic platform costs use per-signal retention days
            and illustrative ingest reductions below instead of the global retention slider alone.
          </p>
        </div>
        {policy.enabled && illustrativeSavings.percent > 0 && (
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 px-4 py-3 text-right shrink-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
              Illustrative savings
            </div>
            <div className="text-2xl font-bold text-violet-700 dark:text-violet-200">
              {illustrativeSavings.percent}%
            </div>
            <div className="text-xs text-violet-600 dark:text-violet-400">
              ~{formatCurrency(illustrativeSavings.monthly)}/mo vs unoptimized backbone
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/20 p-4 mb-4">
        <label className="flex items-center cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={policy.enabled}
            onChange={(e) => onPolicyChange({ ...policy, enabled: e.target.checked })}
            className="w-5 h-5 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
            Apply Streams TCO policies to Elastic {signalLabel(activeSignal)} costs
          </span>
        </label>

        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              { id: "drop" as const, label: "Drop", hint: "Drop noisy fields/events at ingest" },
              {
                id: "aggregate" as const,
                label: "Aggregate",
                hint: "Roll up high-cardinality series",
                metricsLogsOnly: true,
              },
              {
                id: "downsample" as const,
                label: "Downsample",
                hint: "TSDS downsample for metrics retention",
                metricsOnly: true,
              },
            ] as const
          ).map((btn) => {
            if ("metricsOnly" in btn && btn.metricsOnly && activeSignal !== "metrics") return null;
            if ("metricsLogsOnly" in btn && btn.metricsLogsOnly && activeSignal === "tracing") return null;
            const active = controls[btn.id];
            return (
              <button
                key={btn.id}
                type="button"
                title={btn.hint}
                onClick={() => toggleControl(btn.id)}
                disabled={!policy.enabled}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                } ${!policy.enabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
              >
                {btn.label}
              </button>
            );
          })}
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            Retention: {controls.retentionDays}d
          </span>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {signalLabel(activeSignal)} retention (Streams policy):{" "}
            <span className="text-violet-600 dark:text-violet-400 normal-case">
              {controls.retentionDays} days
            </span>
          </label>
          <input
            type="range"
            min={7}
            max={activeSignal === "tracing" ? 30 : 365}
            step={activeSignal === "tracing" ? 1 : activeSignal === "logs" ? 1 : 7}
            value={controls.retentionDays}
            disabled={!policy.enabled}
            onChange={(e) =>
              onPolicyChange(
                updateSignalControls(policy, activeSignal, { retentionDays: Number(e.target.value) })
              )
            }
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600 disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{activeSignal === "tracing" ? "7d" : "7d"}</span>
            <span>{activeSignal === "tracing" ? "30d" : activeSignal === "logs" ? "90d" : "90d"}</span>
            <span>{activeSignal === "tracing" ? "" : "365d"}</span>
          </div>
        </div>

        <a
          href="https://www.elastic.co/docs/solutions/observability/data-streams"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-700 dark:text-violet-300 underline"
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

      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 italic">
        Illustrative reductions: ~30% ingest drop (logs), ~50% trace sampling, ~15% aggregate, ~45% stored
        volume from TSDS downsample. Confirm with your Streams policies and cloud.elastic.co pricing before
        customer-facing quotes.
      </p>
    </div>
  );
}

export { DEFAULT_ELASTIC_STREAMS_TCO };
