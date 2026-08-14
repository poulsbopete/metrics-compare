import { calculateEchHotFrozenVolumeCost } from "./elasticEchHotFrozenPricing";
import { calculateServerlessStreamsS3VolumeCost } from "./elasticServerlessStreamsS3Pricing";
import {
  type ElasticServerlessCostBreakdown,
  type ElasticServerlessPricingOptions,
  ELASTIC_DAYS_PER_MONTH,
} from "./elasticServerlessPricing";

export type ObservabilitySignal = "logs" | "metrics" | "tracing";

/**
 * Per-signal Streams shaping. Percentages are “volume removed” (0–90) when the lever is on.
 * Customers dial aggression differently — these are editable TCO assumptions, not product defaults.
 */
export interface ElasticStreamsSignalControls {
  drop: boolean;
  /** % of ingest volume dropped / filtered out when drop is on. */
  dropPct: number;
  aggregate: boolean;
  /** % of ingest volume removed by aggregation / rollup when aggregate is on. */
  aggregatePct: number;
  downsample: boolean;
  /** % reduction applied to aged (post-hot) stored volume when downsample is on. */
  downsamplePct: number;
  retentionDays: number;
}

export interface ElasticStreamsTcoPolicy {
  enabled: boolean;
  logs: ElasticStreamsSignalControls;
  metrics: ElasticStreamsSignalControls;
  traces: ElasticStreamsSignalControls;
}

/** Legacy constants — kept for docs / UI hints; live values live on the policy. */
export const ELASTIC_STREAMS_LOGS_INGEST_FILTER_PCT = 35;
export const ELASTIC_STREAMS_INGEST_FILTER_EFFICIENCY = 0.92;
export const ELASTIC_STREAMS_TRACES_TAIL_SAMPLE_PCT = 15;
export const ELASTIC_STREAMS_TRACES_KEEP_ERRORS_FRACTION = 0.08;
export const ELASTIC_STREAMS_TRACES_SAMPLE_WEIGHT = 0.87;
export const ELASTIC_STREAMS_METRICS_AGGREGATE_MULT = 0.72;
export const ELASTIC_STREAMS_METRICS_HOT_RESOLUTION_DAYS = 1;
export const ELASTIC_STREAMS_METRICS_DEFAULT_RETENTION_DAYS = 90;

/** Default drop % for logs ≈ 35% × 0.92 filter efficiency. */
const DEFAULT_LOGS_DROP_PCT = Math.round(
  ELASTIC_STREAMS_LOGS_INGEST_FILTER_PCT * ELASTIC_STREAMS_INGEST_FILTER_EFFICIENCY
);
/** Default traces keep ≈ errors + tail sample → ~79% dropped. */
const DEFAULT_TRACES_DROP_PCT = Math.round(
  (1 -
    (ELASTIC_STREAMS_TRACES_KEEP_ERRORS_FRACTION +
      (ELASTIC_STREAMS_TRACES_TAIL_SAMPLE_PCT / 100) * ELASTIC_STREAMS_TRACES_SAMPLE_WEIGHT)) *
    100
);
/** Default metrics aggregate ≈ 1 − 0.72 keep. */
const DEFAULT_METRICS_AGGREGATE_PCT = Math.round((1 - ELASTIC_STREAMS_METRICS_AGGREGATE_MULT) * 100);
/** Default metrics downsample on aged data (prior tier-cut model ~66%). */
const DEFAULT_METRICS_DOWNSAMPLE_PCT = 66;

export const DEFAULT_ELASTIC_STREAMS_TCO: ElasticStreamsTcoPolicy = {
  enabled: true,
  logs: {
    drop: true,
    dropPct: DEFAULT_LOGS_DROP_PCT,
    aggregate: true,
    aggregatePct: 15,
    downsample: false,
    downsamplePct: 40,
    retentionDays: 30,
  },
  metrics: {
    drop: false,
    dropPct: 10,
    aggregate: true,
    aggregatePct: DEFAULT_METRICS_AGGREGATE_PCT,
    downsample: true,
    downsamplePct: DEFAULT_METRICS_DOWNSAMPLE_PCT,
    retentionDays: 90,
  },
  traces: {
    drop: true,
    dropPct: DEFAULT_TRACES_DROP_PCT,
    aggregate: false,
    aggregatePct: 10,
    downsample: false,
    downsamplePct: 40,
    retentionDays: 10,
  },
};

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(90, Math.max(0, Math.round(value)));
}

function normalizeSignalControls(
  partial: Partial<ElasticStreamsSignalControls> | undefined,
  fallback: ElasticStreamsSignalControls
): ElasticStreamsSignalControls {
  return {
    drop: partial?.drop ?? fallback.drop,
    dropPct: clampPct(partial?.dropPct ?? fallback.dropPct),
    aggregate: partial?.aggregate ?? fallback.aggregate,
    aggregatePct: clampPct(partial?.aggregatePct ?? fallback.aggregatePct),
    downsample: partial?.downsample ?? fallback.downsample,
    downsamplePct: clampPct(partial?.downsamplePct ?? fallback.downsamplePct),
    retentionDays: Math.max(1, Math.round(partial?.retentionDays ?? fallback.retentionDays)),
  };
}

/** Merge saved / partial policy with defaults (localStorage may lack new % fields). */
export function normalizeElasticStreamsTcoPolicy(
  partial?: Partial<ElasticStreamsTcoPolicy> | null
): ElasticStreamsTcoPolicy {
  if (!partial) return { ...DEFAULT_ELASTIC_STREAMS_TCO };
  return {
    enabled: partial.enabled ?? true,
    logs: normalizeSignalControls(partial.logs, DEFAULT_ELASTIC_STREAMS_TCO.logs),
    metrics: normalizeSignalControls(partial.metrics, DEFAULT_ELASTIC_STREAMS_TCO.metrics),
    traces: normalizeSignalControls(partial.traces, DEFAULT_ELASTIC_STREAMS_TCO.traces),
  };
}

export interface StreamsLeverImpact {
  dropPctApplied: number;
  aggregatePctApplied: number;
  downsamplePctApplied: number;
  ingestKeepFraction: number;
  storedKeepFraction: number;
}

export interface StreamsVolumeAdjustment {
  billableMonthlyIngestGB: number;
  retentionMonths: number;
  storedGBMultiplier: number;
  ingestReductionPercent: number;
  retentionDays: number;
  applied: boolean;
  levers: StreamsLeverImpact;
}

export interface ElasticStreamsCostResult {
  volumeCost: number;
  breakdown: ElasticServerlessCostBreakdown;
  adjustment: StreamsVolumeAdjustment;
  baselineVolumeCost: number;
  savingsPercent: number;
  leverSavings: {
    dropMonthly: number;
    aggregateMonthly: number;
    downsampleMonthly: number;
  };
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

function emptyLevers(): StreamsLeverImpact {
  return {
    dropPctApplied: 0,
    aggregatePctApplied: 0,
    downsamplePctApplied: 0,
    ingestKeepFraction: 1,
    storedKeepFraction: 1,
  };
}

/**
 * Aged stored-volume keep fraction when downsample is on.
 * Hot window stays full fidelity; aged (Streams → S3) volume is reduced by downsamplePct.
 */
function downsampleStoredMultiplier(
  controls: ElasticStreamsSignalControls,
  totalRetentionDays: number
): { multiplier: number; pctApplied: number } {
  if (!controls.downsample || controls.downsamplePct <= 0) {
    return { multiplier: 1, pctApplied: 0 };
  }
  const hotDays = ELASTIC_STREAMS_METRICS_HOT_RESOLUTION_DAYS;
  const totalDays = Math.max(1, totalRetentionDays);
  const hotFraction = Math.min(1, hotDays / totalDays);
  const agedFraction = 1 - hotFraction;
  const keepAged = 1 - clampPct(controls.downsamplePct) / 100;
  return {
    multiplier: hotFraction + agedFraction * keepAged,
    pctApplied: clampPct(controls.downsamplePct),
  };
}

export function applyElasticStreamsVolume(
  signal: ObservabilitySignal,
  monthlyIngestGB: number,
  globalRetentionMonths: number,
  policy: ElasticStreamsTcoPolicy,
  opts?: { forceEnabled?: boolean; platformKind?: "serverless" | "ech" }
): StreamsVolumeAdjustment {
  const normalized = normalizeElasticStreamsTcoPolicy(policy);
  const globalRetentionDays = Math.round(globalRetentionMonths * ELASTIC_DAYS_PER_MONTH);
  const applyStreams =
    opts?.platformKind === "ech"
      ? false
      : (opts?.forceEnabled ?? normalized.enabled) && monthlyIngestGB > 0;

  if (!applyStreams) {
    return {
      billableMonthlyIngestGB: monthlyIngestGB,
      retentionMonths: globalRetentionMonths,
      storedGBMultiplier: 1,
      ingestReductionPercent: 0,
      retentionDays: globalRetentionDays,
      applied: false,
      levers: emptyLevers(),
    };
  }

  const controls = signalControls(normalized, signal);
  let ingestKeep = 1;
  let dropPctApplied = 0;
  let aggregatePctApplied = 0;

  if (controls.drop && controls.dropPct > 0) {
    dropPctApplied = clampPct(controls.dropPct);
    ingestKeep *= 1 - dropPctApplied / 100;
  }
  if (controls.aggregate && controls.aggregatePct > 0) {
    // Aggregate applies to logs + metrics (rollup / cardinality reduction).
    if (signal === "logs" || signal === "metrics") {
      aggregatePctApplied = clampPct(controls.aggregatePct);
      ingestKeep *= 1 - aggregatePctApplied / 100;
    }
  }

  const retentionDays = controls.retentionDays;
  const retentionMonths =
    opts?.platformKind === "serverless"
      ? globalRetentionMonths
      : retentionDaysToMonths(retentionDays);
  const effectiveRetentionDays =
    opts?.platformKind === "serverless"
      ? Math.round(globalRetentionMonths * ELASTIC_DAYS_PER_MONTH)
      : retentionDays;

  let storedGBMultiplier = 1;
  let downsamplePctApplied = 0;
  if (signal === "metrics") {
    const ds = downsampleStoredMultiplier(controls, effectiveRetentionDays);
    storedGBMultiplier = ds.multiplier;
    downsamplePctApplied = ds.pctApplied;
  }

  const billableMonthlyIngestGB = monthlyIngestGB * ingestKeep;
  const ingestReductionPercent =
    monthlyIngestGB > 0 ? (1 - billableMonthlyIngestGB / monthlyIngestGB) * 100 : 0;

  return {
    billableMonthlyIngestGB,
    retentionMonths,
    storedGBMultiplier,
    ingestReductionPercent,
    retentionDays: effectiveRetentionDays,
    applied: true,
    levers: {
      dropPctApplied,
      aggregatePctApplied,
      downsamplePctApplied,
      ingestKeepFraction: ingestKeep,
      storedKeepFraction: storedGBMultiplier,
    },
  };
}

function scaleBreakdownRetention(
  breakdown: ElasticServerlessCostBreakdown,
  storedGBMultiplier: number
): ElasticServerlessCostBreakdown {
  if (storedGBMultiplier >= 0.999) return breakdown;
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
  return calculateServerlessStreamsS3VolumeCost(monthlyIngestGB, {
    metricsTsd,
    totalRetentionMonths: options.retentionMonths,
    useVolumeTiers: options.useVolumeTiers ?? true,
  });
}

function echBreakdown(monthlyIngestGB: number): ElasticServerlessCostBreakdown {
  return calculateEchHotFrozenVolumeCost(monthlyIngestGB);
}

function costWithPolicy(
  monthlyIngestGB: number,
  elasticOptions: ElasticServerlessPricingOptions,
  streams: ElasticStreamsTcoPolicy,
  signal: ObservabilitySignal,
  opts: {
    platformKind: "serverless" | "ech";
    pricePerIngestGB?: number;
    metricsTsd?: boolean;
    productTier?: ElasticServerlessPricingOptions["productTier"];
  },
  forceEnabled: boolean
): { cost: number; adjustment: StreamsVolumeAdjustment } {
  const adjustment = applyElasticStreamsVolume(
    signal,
    monthlyIngestGB,
    elasticOptions.retentionMonths,
    streams,
    { platformKind: opts.platformKind, forceEnabled }
  );

  let breakdown =
    opts.platformKind === "serverless"
      ? serverlessBreakdown(
          adjustment.billableMonthlyIngestGB,
          {
            ...elasticOptions,
            retentionMonths: adjustment.retentionMonths,
            productTier: opts.productTier ?? elasticOptions.productTier,
          },
          !!opts.metricsTsd
        )
      : echBreakdown(adjustment.billableMonthlyIngestGB);

  breakdown = scaleBreakdownRetention(breakdown, adjustment.storedGBMultiplier);
  return { cost: breakdown.volumeCost, adjustment };
}

/**
 * Isolate each lever’s monthly $ impact by comparing full policy vs policy with that lever off.
 */
function isolateLeverSavings(
  monthlyIngestGB: number,
  elasticOptions: ElasticServerlessPricingOptions,
  streams: ElasticStreamsTcoPolicy,
  signal: ObservabilitySignal,
  opts: {
    platformKind: "serverless" | "ech";
    pricePerIngestGB?: number;
    metricsTsd?: boolean;
    productTier?: ElasticServerlessPricingOptions["productTier"];
  },
  shapedCost: number
): ElasticStreamsCostResult["leverSavings"] {
  if (opts.platformKind !== "serverless" || monthlyIngestGB <= 0) {
    return { dropMonthly: 0, aggregateMonthly: 0, downsampleMonthly: 0 };
  }

  const normalized = normalizeElasticStreamsTcoPolicy(streams);
  const key = signal === "tracing" ? "traces" : signal;
  const base = normalized[key];

  const withPatch = (patch: Partial<ElasticStreamsSignalControls>) =>
    costWithPolicy(
      monthlyIngestGB,
      elasticOptions,
      {
        ...normalized,
        [key]: { ...base, ...patch },
      },
      signal,
      opts,
      true
    ).cost;

  const withoutDrop = withPatch({ drop: false });
  const withoutAggregate = withPatch({ aggregate: false });
  const withoutDownsample = withPatch({ downsample: false });

  return {
    dropMonthly: Math.max(0, withoutDrop - shapedCost),
    aggregateMonthly: Math.max(0, withoutAggregate - shapedCost),
    downsampleMonthly: Math.max(0, withoutDownsample - shapedCost),
  };
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

  const baseline = costWithPolicy(
    monthlyIngestGB,
    elasticOptions,
    streams,
    signal,
    opts,
    false
  );
  const shaped = costWithPolicy(
    monthlyIngestGB,
    elasticOptions,
    streams,
    signal,
    opts,
    platformKind === "serverless"
  );

  // Rebuild full breakdown for return (shaped path)
  const optimizedAdjustment = shaped.adjustment;
  let optimizedBreakdown =
    platformKind === "serverless"
      ? serverlessBreakdown(
          optimizedAdjustment.billableMonthlyIngestGB,
          {
            ...elasticOptions,
            retentionMonths: optimizedAdjustment.retentionMonths,
            productTier: opts.productTier ?? elasticOptions.productTier,
          },
          !!opts.metricsTsd
        )
      : echBreakdown(optimizedAdjustment.billableMonthlyIngestGB);
  optimizedBreakdown = scaleBreakdownRetention(
    optimizedBreakdown,
    optimizedAdjustment.storedGBMultiplier
  );

  const baselineVolumeCost = baseline.cost;
  const volumeCost = shaped.cost;
  const savingsPercent =
    baselineVolumeCost > 0
      ? Math.max(0, ((baselineVolumeCost - volumeCost) / baselineVolumeCost) * 100)
      : 0;

  const leverSavings = isolateLeverSavings(
    monthlyIngestGB,
    elasticOptions,
    streams,
    signal,
    opts,
    volumeCost
  );

  return {
    volumeCost,
    breakdown: optimizedBreakdown,
    adjustment: optimizedAdjustment,
    baselineVolumeCost,
    savingsPercent,
    leverSavings,
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
