/**
 * Elastic Observability Serverless Complete estimator.
 *
 * Mirrors cloud.elastic.co/pricing/serverless?s=observability field shape:
 * logs GB/day, metrics GB/day, traces TPM + sampling, per-signal retention (fractional OK).
 *
 * Pricing: Complete volume tiers (or published floors); metrics TSDS = 25% of Complete.
 * Also estimates Datadog + Grafana Cloud from the same volumes (list-rate, approximate).
 */

import {
  calculateElasticServerlessCost,
  calculateElasticServerlessMetricsCost,
  calculateObservabilityCompleteFloorCost,
  ELASTIC_DAYS_PER_MONTH,
  ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  getElasticServerlessRates,
  type ElasticServerlessCostBreakdown,
} from "./elasticServerlessPricing";
import {
  BYTES_PER_SPAN,
  calculateLogsCost,
  calculateTracingCost,
  logsPlatforms,
  tracingPlatforms,
} from "./observabilityPricing";
import {
  BYTES_PER_DATAPOINT,
  calculatePlatformCost,
  platforms,
} from "./costCalculator";
import { gbPerDayToMetricsPerSecond, gbPerDayToMonthlyMetrics } from "./infrastructureData";
import {
  DEFAULT_TCO_PRICING_CONTEXT,
  type TcoPricingContext,
} from "./tcoPricingContext";

export { ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL, ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL };

export type ServerlessEstimatorPricingMode = "tiered" | "floors";

export interface ServerlessEstimatorInputs {
  /** Raw log ingest GB/day (before 1.66× metering). */
  logsGbPerDay: number;
  logsRetentionMonths: number;
  /** Metrics ingest GB/day (TSDS). */
  metricsGbPerDay: number;
  metricsRetentionMonths: number;
  /** Traces per minute before sampling. */
  tracesPerMinute: number;
  /** 0–100. */
  traceSamplingPercent: number;
  tracesRetentionMonths: number;
  /** Average bytes per span for TPM → GB. Default 500. */
  bytesPerSpan: number;
  pricingMode: ServerlessEstimatorPricingMode;
  /**
   * Datadog Infra + APM host count. When omitted, estimated as max(10, round(logsGbPerDay))
   * (≈1 GB/day/host app-log heuristic — not the thin Linux baseline).
   */
  datadogHosts?: number;
  /**
   * Bytes/datapoint used to turn metrics GB/day into samples/sec for Datadog/Grafana.
   * Default Prometheus 296B — Elastic TSDS GB is often smaller than raw Prom wire size.
   */
  metricsBytesPerDatapoint?: number;
}

/** Customer example that fails on the official Cloud estimator (fractional log retention). */
export const SERVERLESS_ESTIMATOR_EXAMPLE: ServerlessEstimatorInputs = {
  logsGbPerDay: 585,
  logsRetentionMonths: 1.2,
  metricsGbPerDay: 12,
  metricsRetentionMonths: 12,
  tracesPerMinute: 208_333,
  traceSamplingPercent: 100,
  tracesRetentionMonths: 3,
  bytesPerSpan: BYTES_PER_SPAN,
  pricingMode: "tiered",
  datadogHosts: 585,
  metricsBytesPerDatapoint: BYTES_PER_DATAPOINT.Prometheus,
};

export const DEFAULT_SERVERLESS_ESTIMATOR_INPUTS: ServerlessEstimatorInputs = {
  logsGbPerDay: 10,
  logsRetentionMonths: 1,
  metricsGbPerDay: 1,
  metricsRetentionMonths: 1,
  tracesPerMinute: 1_000,
  traceSamplingPercent: 100,
  tracesRetentionMonths: 1,
  bytesPerSpan: BYTES_PER_SPAN,
  pricingMode: "tiered",
  datadogHosts: 10,
  metricsBytesPerDatapoint: BYTES_PER_DATAPOINT.Prometheus,
};

export interface ServerlessEstimatorSignalLine {
  signal: "logs" | "metrics" | "traces";
  label: string;
  rawGbPerDay: number;
  billableMonthlyIngestGB: number;
  retentionMonths: number;
  storedGB: number;
  ingestCost: number;
  retentionCost: number;
  volumeCost: number;
  ingestRateLabel: string;
  retentionRateLabel: string;
  notes: string;
}

export interface ServerlessCompetitorSignalCosts {
  metrics: number;
  logs: number;
  traces: number;
}

export interface ServerlessCompetitorEstimate {
  id: string;
  name: string;
  color: string;
  signals: ServerlessCompetitorSignalCosts;
  monthlyTotal: number;
  annualTotal: number;
  vsElasticPct: number | null;
  assumptions: string;
}

export interface ServerlessEstimatorResult {
  daysPerMonth: number;
  logsMeteringMultiplier: number;
  lines: ServerlessEstimatorSignalLine[];
  monthlyTotal: number;
  annualTotal: number;
  pricingMode: ServerlessEstimatorPricingMode;
  /** Volumes used for competitor meters. */
  competitorVolumes: {
    logsMonthlyGB: number;
    metricsSamplesPerSecond: number;
    metricsMonthlyDatapoints: number;
    metricsBytesPerDatapoint: number;
    monthlySpans: number;
    datadogHosts: number;
  };
  competitors: ServerlessCompetitorEstimate[];
}

const GIB = 1024 * 1024 * 1024;

export function gbPerDayToMonthly(gbPerDay: number): number {
  return Math.max(0, gbPerDay) * ELASTIC_DAYS_PER_MONTH;
}

/** App-log heuristic: ~1 GB/day/host (not thin Linux agent-only baseline). */
export function estimateDatadogHostsFromLogs(logsGbPerDay: number): number {
  if (logsGbPerDay <= 0) return 10;
  return Math.max(10, Math.round(logsGbPerDay));
}

/** Sampled TPM → monthly ingest GB (binary GiB, same as rest of TCO tool). */
export function tracesTpmToMonthlyGB(
  tracesPerMinute: number,
  samplingPercent: number,
  bytesPerSpan: number = BYTES_PER_SPAN
): number {
  const tpm = Math.max(0, tracesPerMinute);
  const sample = Math.min(100, Math.max(0, samplingPercent)) / 100;
  const bytes = Math.max(0, bytesPerSpan);
  const spansPerMonth = tpm * sample * 60 * 24 * ELASTIC_DAYS_PER_MONTH;
  return (spansPerMonth * bytes) / GIB;
}

export function tracesTpmToGbPerDay(
  tracesPerMinute: number,
  samplingPercent: number,
  bytesPerSpan: number = BYTES_PER_SPAN
): number {
  return tracesTpmToMonthlyGB(tracesPerMinute, samplingPercent, bytesPerSpan) / ELASTIC_DAYS_PER_MONTH;
}

export function tracesTpmToMonthlySpans(
  tracesPerMinute: number,
  samplingPercent: number
): number {
  const tpm = Math.max(0, tracesPerMinute);
  const sample = Math.min(100, Math.max(0, samplingPercent)) / 100;
  return tpm * sample * 60 * 24 * ELASTIC_DAYS_PER_MONTH;
}

function costForLogsTraces(
  monthlyIngestGB: number,
  retentionMonths: number,
  pricingMode: ServerlessEstimatorPricingMode
): ElasticServerlessCostBreakdown {
  if (pricingMode === "floors") {
    return calculateObservabilityCompleteFloorCost(monthlyIngestGB, retentionMonths, "logs_traces");
  }
  return calculateElasticServerlessCost(monthlyIngestGB, {
    retentionMonths,
    productTier: "observability-complete",
    useVolumeTiers: true,
  });
}

function costForMetrics(
  monthlyIngestGB: number,
  retentionMonths: number,
  pricingMode: ServerlessEstimatorPricingMode
): ElasticServerlessCostBreakdown {
  if (pricingMode === "floors") {
    return calculateObservabilityCompleteFloorCost(monthlyIngestGB, retentionMonths, "metrics");
  }
  return calculateElasticServerlessMetricsCost(monthlyIngestGB, {
    retentionMonths,
    productTier: "observability-complete",
    useVolumeTiers: true,
  });
}

function toLine(
  signal: ServerlessEstimatorSignalLine["signal"],
  label: string,
  rawGbPerDay: number,
  breakdown: ElasticServerlessCostBreakdown,
  retentionMonths: number,
  notes: string
): ServerlessEstimatorSignalLine {
  return {
    signal,
    label,
    rawGbPerDay,
    billableMonthlyIngestGB: breakdown.monthlyIngestGB,
    retentionMonths,
    storedGB: breakdown.storedGB,
    ingestCost: breakdown.ingestCost,
    retentionCost: breakdown.retentionCost,
    volumeCost: breakdown.volumeCost,
    ingestRateLabel: breakdown.ingestRateLabel,
    retentionRateLabel: breakdown.retentionRateLabel,
    notes,
  };
}

function requirePlatform<T extends { id: string }>(list: T[], id: string): T {
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error(`Missing platform ${id}`);
  return p;
}

function competitorPricingContext(
  hosts: number,
  retentionMonths: number
): TcoPricingContext {
  return {
    ...DEFAULT_TCO_PRICING_CONTEXT,
    elastic: {
      ...DEFAULT_TCO_PRICING_CONTEXT.elastic,
      retentionMonths,
    },
    datadog: {
      ...DEFAULT_TCO_PRICING_CONTEXT.datadog,
      infraHosts: hosts,
      apmHosts: hosts,
    },
  };
}

function buildCompetitors(
  inputs: ServerlessEstimatorInputs,
  elasticMonthly: number,
  volumes: ServerlessEstimatorResult["competitorVolumes"]
): ServerlessCompetitorEstimate[] {
  const ctx = competitorPricingContext(
    volumes.datadogHosts,
    Math.max(
      inputs.logsRetentionMonths,
      inputs.metricsRetentionMonths,
      inputs.tracesRetentionMonths
    )
  );

  const datadogMetrics = requirePlatform(platforms, "datadog");
  const grafanaMetrics = requirePlatform(platforms, "grafana-cloud");
  const datadogLogs = requirePlatform(logsPlatforms, "datadog-logs");
  const grafanaLogs = requirePlatform(logsPlatforms, "grafana-logs");
  const datadogTracing = requirePlatform(tracingPlatforms, "datadog-tracing");
  const grafanaTracing = requirePlatform(tracingPlatforms, "grafana-tracing");

  const ddMetricsCost = calculatePlatformCost(
    datadogMetrics,
    volumes.metricsMonthlyDatapoints,
    "Prometheus",
    false,
    false,
    ctx,
    volumes.metricsBytesPerDatapoint
  );
  const ddLogsCost = calculateLogsCost(
    datadogLogs,
    volumes.logsMonthlyGB,
    false,
    false,
    ctx
  );
  const ddTracesCost = calculateTracingCost(
    datadogTracing,
    volumes.monthlySpans,
    false,
    false,
    ctx
  );

  const gfMetricsCost = calculatePlatformCost(
    grafanaMetrics,
    volumes.metricsMonthlyDatapoints,
    "Prometheus",
    false,
    false,
    ctx,
    volumes.metricsBytesPerDatapoint
  );
  const gfLogsCost = calculateLogsCost(
    grafanaLogs,
    volumes.logsMonthlyGB,
    false,
    false,
    ctx
  );
  const gfTracesCost = calculateTracingCost(
    grafanaTracing,
    volumes.monthlySpans,
    false,
    false,
    ctx
  );

  const make = (
    id: string,
    name: string,
    color: string,
    signals: ServerlessCompetitorSignalCosts,
    assumptions: string
  ): ServerlessCompetitorEstimate => {
    const monthlyTotal = signals.metrics + signals.logs + signals.traces;
    const vsElasticPct =
      elasticMonthly > 0 ? ((monthlyTotal - elasticMonthly) / elasticMonthly) * 100 : null;
    return {
      id,
      name,
      color,
      signals,
      monthlyTotal,
      annualTotal: monthlyTotal * 12,
      vsElasticPct,
      assumptions,
    };
  };

  return [
    make(
      "datadog",
      "Datadog",
      "bg-purple-500",
      { metrics: ddMetricsCost, logs: ddLogsCost, traces: ddTracesCost },
      `${volumes.datadogHosts.toLocaleString()} Infra+APM hosts · metrics from GB→samples @ ${volumes.metricsBytesPerDatapoint}B · logs indexed (15d list) · APM host SKU`
    ),
    make(
      "grafana-cloud",
      "Grafana Cloud",
      "bg-orange-400",
      { metrics: gfMetricsCost, logs: gfLogsCost, traces: gfTracesCost },
      `Metrics billable series from ~${Math.round(volumes.metricsSamplesPerSecond).toLocaleString()} samples/sec · logs $/GB · traces $/M spans (list)`
    ),
  ].sort((a, b) => a.monthlyTotal - b.monthlyTotal);
}

export function calculateServerlessEstimator(
  inputs: ServerlessEstimatorInputs
): ServerlessEstimatorResult {
  const rates = getElasticServerlessRates("observability-complete");
  const logsMultiplier = rates.logsMeteringMultiplier ?? 1.66;
  const mode = inputs.pricingMode;
  const metricsBytes =
    inputs.metricsBytesPerDatapoint ?? BYTES_PER_DATAPOINT.Prometheus;
  const datadogHosts =
    inputs.datadogHosts != null && inputs.datadogHosts > 0
      ? Math.round(inputs.datadogHosts)
      : estimateDatadogHostsFromLogs(inputs.logsGbPerDay);

  const logsRawMonthly = gbPerDayToMonthly(inputs.logsGbPerDay);
  const logsBillableMonthly = logsRawMonthly * logsMultiplier;
  const logsBd = costForLogsTraces(logsBillableMonthly, inputs.logsRetentionMonths, mode);

  const metricsMonthly = gbPerDayToMonthly(inputs.metricsGbPerDay);
  const metricsBd = costForMetrics(metricsMonthly, inputs.metricsRetentionMonths, mode);

  const tracesMonthly = tracesTpmToMonthlyGB(
    inputs.tracesPerMinute,
    inputs.traceSamplingPercent,
    inputs.bytesPerSpan
  );
  const tracesGbDay = tracesTpmToGbPerDay(
    inputs.tracesPerMinute,
    inputs.traceSamplingPercent,
    inputs.bytesPerSpan
  );
  const tracesBd = costForLogsTraces(tracesMonthly, inputs.tracesRetentionMonths, mode);

  const lines: ServerlessEstimatorSignalLine[] = [
    toLine(
      "logs",
      "Logs",
      inputs.logsGbPerDay,
      logsBd,
      inputs.logsRetentionMonths,
      `Raw × ${logsMultiplier} metering → ${logsBillableMonthly.toFixed(1)} GB/mo billable`
    ),
    toLine(
      "metrics",
      "Metrics (TSDS)",
      inputs.metricsGbPerDay,
      metricsBd,
      inputs.metricsRetentionMonths,
      mode === "floors"
        ? "Published TSDS floors ($0.023/GB ingest · $0.005/GB-mo)"
        : "TSDS = 25% of Complete ingest + retention tier table"
    ),
    toLine(
      "traces",
      "Traces",
      tracesGbDay,
      tracesBd,
      inputs.tracesRetentionMonths,
      `${inputs.tracesPerMinute.toLocaleString()} TPM × ${inputs.traceSamplingPercent}% @ ${inputs.bytesPerSpan} B/span`
    ),
  ];

  const monthlyTotal = lines.reduce((s, l) => s + l.volumeCost, 0);

  const metricsSamplesPerSecond = gbPerDayToMetricsPerSecond(
    inputs.metricsGbPerDay,
    metricsBytes
  );
  const metricsMonthlyDatapoints = gbPerDayToMonthlyMetrics(
    inputs.metricsGbPerDay,
    metricsBytes
  );
  const monthlySpans = tracesTpmToMonthlySpans(
    inputs.tracesPerMinute,
    inputs.traceSamplingPercent
  );

  const competitorVolumes = {
    logsMonthlyGB: logsRawMonthly,
    metricsSamplesPerSecond,
    metricsMonthlyDatapoints,
    metricsBytesPerDatapoint: metricsBytes,
    monthlySpans,
    datadogHosts,
  };

  const competitors = buildCompetitors(inputs, monthlyTotal, competitorVolumes);

  return {
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    logsMeteringMultiplier: logsMultiplier,
    lines,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    pricingMode: mode,
    competitorVolumes,
    competitors,
  };
}
