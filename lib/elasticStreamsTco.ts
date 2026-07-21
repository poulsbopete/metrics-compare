import {
  calculateElasticServerlessCost,
  calculateElasticServerlessMetricsCost,
  type ElasticServerlessCostBreakdown,
  type ElasticServerlessPricingOptions,
  ELASTIC_DAYS_PER_MONTH,
} from "./elasticServerlessPricing";
import { calculateEchHotFrozenVolumeCost } from "./elasticEchHotFrozenPricing";

export type ObservabilitySignal = "logs" | "metrics" | "tracing";

export interface ElasticStreamsSignalControls {
  drop: boolean;
  aggregate: boolean;
  downsample: boolean;
  retentionDays: number;
}

export interface ElasticStreamsTcoPolicy {
  enabled: boolean;
  logs: ElasticStreamsSignalControls;
  metrics: ElasticStreamsSignalControls;
  traces: ElasticStreamsSignalControls;
}

/** Default Streams TCO shaping assumptions (Serverless calculator). */
export const ELASTIC_STREAMS_LOGS_INGEST_FILTER_PCT = 35;
export const ELASTIC_STREAMS_INGEST_FILTER_EFFICIENCY = 0.92;
export const ELASTIC_STREAMS_TRACES_TAIL_SAMPLE_PCT = 15;
export const ELASTIC_STREAMS_TRACES_KEEP_ERRORS_FRACTION = 0.08;
export const ELASTIC_STREAMS_TRACES_SAMPLE_WEIGHT = 0.87;
export const ELASTIC_STREAMS_METRICS_AGGREGATE_MULT = 0.72;
export const ELASTIC_STREAMS_METRICS_HOT_RESOLUTION_DAYS = 14;
export const ELASTIC_STREAMS_METRICS_DEFAULT_RETENTION_DAYS = 90;

export const DEFAULT_ELASTIC_STREAMS_TCO: ElasticStreamsTcoPolicy = {
  enabled: true,
  logs: { drop: true, aggregate: true, downsample: false, retentionDays: 30 },
  metrics: { drop: false, aggregate: true, downsample: true, retentionDays: 90 },
  traces: { drop: true, aggregate: false, downsample: false, retentionDays: 10 },
};

export interface StreamsVolumeAdjustment {
  billableMonthlyIngestGB: number;
  retentionMonths: number;
  storedGBMultiplier: number;
  ingestReductionPercent: number;
  retentionDays: number;
  applied: boolean;
}

export interface ElasticStreamsCostResult {
  volumeCost: number;
  breakdown: ElasticServerlessCostBreakdown;
  adjustment: StreamsVolumeAdjustment;
  baselineVolumeCost: number;
  savingsPercent: number;
}

export const EXAMPLE_WIRED_STREAMS = [
  { stream: "logs-elastic_agent-default", signal: "logs" as const, actions: "Drop · parse", retentionDays: 90 },
  { stream: "logs-generic-default", signal: "logs" as const, actions: "Drop · wired", retentionDays: 30 },
  { stream: "logs.otel.adaptive-networks", signal: "logs" as const, actions: "Wired · drop", retentionDays: 30 },
  { stream: "metrics-generic-default", signal: "metrics" as const, actions: "Downsample · TSDS", retentionDays: 90 },
  { stream: "metrics-apm.internal-default", signal: "metrics" as const, actions: "Aggregate · ILM", retentionDays: 90 },
  { stream: "traces-apm-default", signal: "traces" as const, actions: "Sample · drop noise", retentionDays: 10 },
] as const;

function signalControls(
  policy: ElasticStreamsTcoPolicy,
  signal: ObservabilitySignal
): ElasticStreamsSignalControls {
  return signal === "logs" ? policy.logs : signal === "metrics" ? policy.metrics : policy.traces;
}

export function retentionDaysToMonths(days: number): number {
  return days / ELASTIC_DAYS_PER_MONTH;
}

function metricsDownsampleStoredMultiplier(
  policy: ElasticStreamsTcoPolicy,
  globalRetentionDays: number
): number {
  const controls = policy.metrics;
  if (!controls.downsample) return 1;
  const hotDays = ELASTIC_STREAMS_METRICS_HOT_RESOLUTION_DAYS;
  const totalDays = controls.retentionDays || globalRetentionDays;
  if (totalDays <= 0) return 1;
  const hotFraction = Math.min(1, hotDays / totalDays);
  const agedFraction = 1 - hotFraction;
  const tierCut = 0.22 * 3;
  const agedReduction = Math.min(0.75, tierCut);
  return hotFraction + agedFraction * (1 - agedReduction);
}

export function applyElasticStreamsVolume(
  signal: ObservabilitySignal,
  monthlyIngestGB: number,
  globalRetentionMonths: number,
  policy: ElasticStreamsTcoPolicy,
  opts?: { forceEnabled?: boolean; platformKind?: "serverless" | "ech" }
): StreamsVolumeAdjustment {
  const globalRetentionDays = Math.round(globalRetentionMonths * ELASTIC_DAYS_PER_MONTH);
  const applyStreams =
    opts?.platformKind === "ech"
      ? false
      : (opts?.forceEnabled ?? policy.enabled) && monthlyIngestGB > 0;

  if (!applyStreams) {
    return {
      billableMonthlyIngestGB: monthlyIngestGB,
      retentionMonths: globalRetentionMonths,
      storedGBMultiplier: 1,
      ingestReductionPercent: 0,
      retentionDays: globalRetentionDays,
      applied: false,
    };
  }

  const controls = signalControls(policy, signal);
  let ingestMultiplier = 1;

  if (controls.drop && signal === "logs") {
    ingestMultiplier *=
      1 -
      (ELASTIC_STREAMS_LOGS_INGEST_FILTER_PCT / 100) * ELASTIC_STREAMS_INGEST_FILTER_EFFICIENCY;
  }
  if (controls.drop && signal === "tracing") {
    ingestMultiplier =
      ELASTIC_STREAMS_TRACES_KEEP_ERRORS_FRACTION +
      (ELASTIC_STREAMS_TRACES_TAIL_SAMPLE_PCT / 100) * ELASTIC_STREAMS_TRACES_SAMPLE_WEIGHT;
  }
  if (controls.aggregate && signal === "metrics") {
    ingestMultiplier *= ELASTIC_STREAMS_METRICS_AGGREGATE_MULT;
  }

  const retentionDays = controls.retentionDays;
  const retentionMonths = retentionDaysToMonths(retentionDays);
  let storedGBMultiplier = 1;
  if (signal === "metrics" && controls.downsample) {
    storedGBMultiplier = metricsDownsampleStoredMultiplier(policy, retentionDays);
  }

  const billableMonthlyIngestGB = monthlyIngestGB * ingestMultiplier;
  const ingestReductionPercent =
    monthlyIngestGB > 0 ? (1 - billableMonthlyIngestGB / monthlyIngestGB) * 100 : 0;

  return {
    billableMonthlyIngestGB,
    retentionMonths,
    storedGBMultiplier,
    ingestReductionPercent,
    retentionDays,
    applied: true,
  };
}

function scaleBreakdownRetention(
  breakdown: ElasticServerlessCostBreakdown,
  storedGBMultiplier: number
): ElasticServerlessCostBreakdown {
  if (storedGBMultiplier >= 1) return breakdown;
  const retentionCost = breakdown.retentionCost * storedGBMultiplier;
  return {
    ...breakdown,
    storedGB: breakdown.storedGB * storedGBMultiplier,
    retentionCost,
    volumeCost: breakdown.ingestCost + retentionCost,
  };
}

function serverlessBreakdown(
  monthlyIngestGB: number,
  options: ElasticServerlessPricingOptions,
  metricsTsd: boolean
): ElasticServerlessCostBreakdown {
  return metricsTsd
    ? calculateElasticServerlessMetricsCost(monthlyIngestGB, options)
    : calculateElasticServerlessCost(monthlyIngestGB, options);
}

function echBreakdown(
  monthlyIngestGB: number,
  _options: ElasticServerlessPricingOptions,
  _pricePerIngestGB: number,
  _metricsTsd: boolean
): ElasticServerlessCostBreakdown {
  return calculateEchHotFrozenVolumeCost(monthlyIngestGB);
}

export function calculateElasticVolumeCostWithStreams(
  monthlyIngestGB: number,
  elasticOptions: ElasticServerlessPricingOptions,
  streams: ElasticStreamsTcoPolicy,
  signal: ObservabilitySignal,
  opts: {
    platformKind: "serverless" | "ech";
    pricePerIngestGB?: number;
    metricsTsd?: boolean;
    productTier?: ElasticServerlessPricingOptions["productTier"];
  }
): ElasticStreamsCostResult {
  const platformKind = opts.platformKind;

  const baselineAdjustment = applyElasticStreamsVolume(
    signal,
    monthlyIngestGB,
    elasticOptions.retentionMonths,
    streams,
    { platformKind, forceEnabled: false }
  );

  const optimizedAdjustment = applyElasticStreamsVolume(
    signal,
    monthlyIngestGB,
    elasticOptions.retentionMonths,
    streams,
    { platformKind, forceEnabled: platformKind === "serverless" }
  );

  const baselineBreakdown =
    platformKind === "serverless"
      ? serverlessBreakdown(
          baselineAdjustment.billableMonthlyIngestGB,
          {
            ...elasticOptions,
            retentionMonths: baselineAdjustment.retentionMonths,
            productTier: opts.productTier ?? elasticOptions.productTier,
          },
          !!opts.metricsTsd
        )
      : echBreakdown(
          baselineAdjustment.billableMonthlyIngestGB,
          elasticOptions,
          opts.pricePerIngestGB ?? 0.05,
          !!opts.metricsTsd
        );

  const optimizedOptions: ElasticServerlessPricingOptions = {
    ...elasticOptions,
    retentionMonths: optimizedAdjustment.retentionMonths,
    productTier: opts.productTier ?? elasticOptions.productTier,
  };

  let optimizedBreakdown =
    platformKind === "serverless"
      ? serverlessBreakdown(
          optimizedAdjustment.billableMonthlyIngestGB,
          optimizedOptions,
          !!opts.metricsTsd
        )
      : echBreakdown(
          optimizedAdjustment.billableMonthlyIngestGB,
          optimizedOptions,
          opts.pricePerIngestGB ?? 0.05,
          !!opts.metricsTsd
        );

  optimizedBreakdown = scaleBreakdownRetention(
    optimizedBreakdown,
    optimizedAdjustment.storedGBMultiplier
  );

  const baselineVolumeCost = baselineBreakdown.volumeCost;
  const volumeCost = optimizedBreakdown.volumeCost;
  const savingsPercent =
    baselineVolumeCost > 0
      ? Math.max(0, ((baselineVolumeCost - volumeCost) / baselineVolumeCost) * 100)
      : 0;

  return {
    volumeCost,
    breakdown: optimizedBreakdown,
    adjustment: optimizedAdjustment,
    baselineVolumeCost,
    savingsPercent,
  };
}

export function isElasticStreamsPlatformId(platformId: string): boolean {
  return (
    platformId === "elastic-serverless" ||
    platformId === "elastic-ech" ||
    platformId === "elastic-logs" ||
    platformId === "elastic-ech-logs" ||
    platformId === "elastic-tracing" ||
    platformId === "elastic-ech-tracing" ||
    platformId === "elastic-security"
  );
}

export function streamsSignalForPlatform(platformId: string): ObservabilitySignal | undefined {
  if (platformId.includes("logs") || platformId === "elastic-security") return "logs";
  if (platformId.includes("tracing")) return "tracing";
  if (platformId === "elastic-serverless" || platformId === "elastic-ech") return "metrics";
  return undefined;
}

export function isElasticEchPlatformId(platformId: string): boolean {
  return platformId.startsWith("elastic-ech") || platformId === "elastic-ech";
}

export function isElasticServerlessPricingPlatformId(platformId: string): boolean {
  return (
    platformId === "elastic-serverless" ||
    platformId === "elastic-logs" ||
    platformId === "elastic-tracing" ||
    platformId === "elastic-security"
  );
}
