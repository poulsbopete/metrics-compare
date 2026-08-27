/**
 * Elastic Observability Serverless Complete estimator.
 *
 * Mirrors cloud.elastic.co/pricing/serverless?s=observability field shape:
 * logs GB/day, metrics GB/day, traces TPM + sampling, per-signal retention (fractional OK).
 *
 * Pricing: Complete volume tiers (or published floors); metrics TSDS = 25% of Complete.
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
import { BYTES_PER_SPAN } from "./observabilityPricing";

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

export interface ServerlessEstimatorResult {
  daysPerMonth: number;
  logsMeteringMultiplier: number;
  lines: ServerlessEstimatorSignalLine[];
  monthlyTotal: number;
  annualTotal: number;
  pricingMode: ServerlessEstimatorPricingMode;
}

const GIB = 1024 * 1024 * 1024;

export function gbPerDayToMonthly(gbPerDay: number): number {
  return Math.max(0, gbPerDay) * ELASTIC_DAYS_PER_MONTH;
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

export function calculateServerlessEstimator(
  inputs: ServerlessEstimatorInputs
): ServerlessEstimatorResult {
  const rates = getElasticServerlessRates("observability-complete");
  const logsMultiplier = rates.logsMeteringMultiplier ?? 1.66;
  const mode = inputs.pricingMode;

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

  return {
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    logsMeteringMultiplier: logsMultiplier,
    lines,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    pricingMode: mode,
  };
}
