import {
  calculateElasticServerlessCost,
  calculateElasticServerlessMetricsCost,
  calculateEchVolumeCost,
  calculateEchMetricsCost,
  type ElasticServerlessCostBreakdown,
  type ElasticServerlessPricingOptions,
  ELASTIC_DAYS_PER_MONTH,
} from "./elasticServerlessPricing";

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

export const DEFAULT_ELASTIC_STREAMS_TCO: ElasticStreamsTcoPolicy = {
  enabled: true,
  logs: { drop: true, aggregate: false, downsample: false, retentionDays: 30 },
  metrics: { drop: false, aggregate: true, downsample: true, retentionDays: 90 },
  traces: { drop: true, aggregate: false, downsample: false, retentionDays: 10 },
};

/** Illustrative ingest reduction when drop / sample is enabled (Streams Processing tab). */
const DROP_INGEST_REDUCTION = 0.3;
const AGGREGATE_INGEST_REDUCTION = 0.15;
const TRACE_SAMPLE_INGEST_REDUCTION = 0.5;
/** Illustrative stored-volume reduction from TSDS downsample + ILM. */
const DOWNSAMPLE_STORED_REDUCTION = 0.45;

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

export function applyElasticStreamsVolume(
  signal: ObservabilitySignal,
  monthlyIngestGB: number,
  globalRetentionMonths: number,
  policy: ElasticStreamsTcoPolicy
): StreamsVolumeAdjustment {
  if (!policy.enabled || monthlyIngestGB <= 0) {
    return {
      billableMonthlyIngestGB: monthlyIngestGB,
      retentionMonths: globalRetentionMonths,
      storedGBMultiplier: 1,
      ingestReductionPercent: 0,
      retentionDays: Math.round(globalRetentionMonths * ELASTIC_DAYS_PER_MONTH),
      applied: false,
    };
  }

  const controls = signalControls(policy, signal);
  let ingestMultiplier = 1;

  if (controls.drop) {
    ingestMultiplier *=
      signal === "tracing" ? 1 - TRACE_SAMPLE_INGEST_REDUCTION : 1 - DROP_INGEST_REDUCTION;
  }
  if (controls.aggregate && signal !== "tracing") {
    ingestMultiplier *= 1 - AGGREGATE_INGEST_REDUCTION;
  }

  const retentionMonths = retentionDaysToMonths(controls.retentionDays);
  const storedGBMultiplier =
    controls.downsample && signal === "metrics" ? 1 - DOWNSAMPLE_STORED_REDUCTION : 1;

  const billableMonthlyIngestGB = monthlyIngestGB * ingestMultiplier;
  const ingestReductionPercent =
    monthlyIngestGB > 0 ? (1 - billableMonthlyIngestGB / monthlyIngestGB) * 100 : 0;

  return {
    billableMonthlyIngestGB,
    retentionMonths,
    storedGBMultiplier,
    ingestReductionPercent,
    retentionDays: controls.retentionDays,
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
  options: ElasticServerlessPricingOptions,
  pricePerIngestGB: number,
  metricsTsd: boolean
): ElasticServerlessCostBreakdown {
  if (metricsTsd) {
    return calculateEchMetricsCost(monthlyIngestGB);
  }
  return calculateEchVolumeCost(monthlyIngestGB, {
    retentionMonths: options.retentionMonths,
    useRetentionTiers: options.useVolumeTiers,
    pricePerIngestGB,
  });
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
  const baselineBreakdown =
    opts.platformKind === "serverless"
      ? serverlessBreakdown(monthlyIngestGB, {
          ...elasticOptions,
          productTier: opts.productTier ?? elasticOptions.productTier,
        }, !!opts.metricsTsd)
      : echBreakdown(
          monthlyIngestGB,
          elasticOptions,
          opts.pricePerIngestGB ?? 0.05,
          !!opts.metricsTsd
        );

  const adjustment = applyElasticStreamsVolume(
    signal,
    monthlyIngestGB,
    elasticOptions.retentionMonths,
    streams
  );

  const optimizedOptions: ElasticServerlessPricingOptions = {
    ...elasticOptions,
    retentionMonths: adjustment.retentionMonths,
    productTier: opts.productTier ?? elasticOptions.productTier,
  };

  let optimizedBreakdown =
    opts.platformKind === "serverless"
      ? serverlessBreakdown(
          adjustment.billableMonthlyIngestGB,
          optimizedOptions,
          !!opts.metricsTsd
        )
      : echBreakdown(
          adjustment.billableMonthlyIngestGB,
          optimizedOptions,
          opts.pricePerIngestGB ?? 0.05,
          !!opts.metricsTsd
        );

  optimizedBreakdown = scaleBreakdownRetention(optimizedBreakdown, adjustment.storedGBMultiplier);

  const baselineVolumeCost = baselineBreakdown.volumeCost;
  const volumeCost = optimizedBreakdown.volumeCost;
  const savingsPercent =
    baselineVolumeCost > 0
      ? Math.max(0, ((baselineVolumeCost - volumeCost) / baselineVolumeCost) * 100)
      : 0;

  return {
    volumeCost,
    breakdown: optimizedBreakdown,
    adjustment,
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
    platformId === "elastic-ech-tracing"
  );
}

export function streamsSignalForPlatform(platformId: string): ObservabilitySignal | undefined {
  if (platformId.includes("logs")) return "logs";
  if (platformId.includes("tracing")) return "tracing";
  if (platformId === "elastic-serverless" || platformId === "elastic-ech") return "metrics";
  return undefined;
}
