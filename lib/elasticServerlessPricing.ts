/**
 * Elastic Observability / Security Serverless pricing
 *
 * Observability Complete ingest + retention tiers match the Elastic Cloud pricing table
 * (AWS us-east-1): cloud.elastic.co/cloud-pricing-table?productType=serverless&project=observability
 *
 * Not modeled in this TCO tool: Agent Builder executions, synthetics, LLM add-ons, workflows.
 * Serverless Data Out (egress): 50 GB free/month, then $0.05/GB — see costCalculator egress fields.
 *
 * Billing model (ingest + retention are separate line items):
 * https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/elastic-observability-billing-dimensions
 */

import { calculateEchHotFrozenVolumeCost } from "./elasticEchHotFrozenPricing";

export const ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL =
  "https://cloud.elastic.co/cloud-pricing-table?productType=serverless&project=observability";

/** Serverless Data Out — 0–50 GB free, then $0.05/GB (Observability pricing table add-ons). */
export const ELASTIC_SERVERLESS_DATA_OUT_FREE_GB = 50;
export const ELASTIC_SERVERLESS_DATA_OUT_PRICE_PER_GB = 0.05;

export type ElasticServerlessProductTier =
  | "observability-complete"
  | "observability-logs-essentials"
  | "security-analytics-complete";

export interface VolumeTier {
  min: number;
  max?: number;
  pricePerGB: number;
}

export interface ElasticServerlessRates {
  productTier: ElasticServerlessProductTier;
  label: string;
  ingestFloorPerGB: number;
  retentionFloorPerGB: number;
  ingestTiers: VolumeTier[];
  retentionTiers: VolumeTier[];
  /** Logs are metered at 1.66× raw GB after enrichment (Elastic pricing estimator). */
  logsMeteringMultiplier?: number;
}

export interface ElasticServerlessPricingOptions {
  retentionMonths: number;
  productTier?: ElasticServerlessProductTier;
  /** When true (default), uses Observability Complete tier table from cloud.elastic.co. */
  useVolumeTiers?: boolean;
}

export const DEFAULT_ELASTIC_PRICING_OPTIONS: ElasticServerlessPricingOptions = {
  retentionMonths: 1,
  productTier: "observability-complete",
  useVolumeTiers: true,
};

export const ELASTIC_DAYS_PER_MONTH = 365 / 12;

/**
 * TSDS index mode metrics on Observability Serverless:
 * 25% of standard Observability Complete per-GB ingest and retention tier rates
 * (same billing units — GB ingested + GB-month stored).
 *
 * Matches Elastic list floors effective July 1, 2026: $0.023/GB ingest, $0.005/GB-month retention
 * at Complete tier minimums — see elastic.co/pricing/serverless-observability.
 */
export const ELASTIC_TSDS_METRICS_RATE_MULTIPLIER = 0.25;

/** Published Complete floor rates for TSDS metrics (July 1, 2026). */
export const ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB = 0.023;
export const ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB = 0.005;

/** Effective floor for 1-month retention at published TSDS list rates. */
export const ELASTIC_TSDS_METRICS_FLOOR_PER_GB_ONE_MONTH =
  ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB +
  ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB;

/** Observability Complete - Data Retention (AWS us-east-1). */
export const OBSERVABILITY_COMPLETE_RETENTION_TIERS: VolumeTier[] = [
  { min: 0, max: 10_000, pricePerGB: 0.04 },
  { min: 10_000, max: 20_000, pricePerGB: 0.032 },
  { min: 20_000, max: 50_000, pricePerGB: 0.03 },
  { min: 50_000, max: 100_000, pricePerGB: 0.028 },
  { min: 100_000, max: 250_000, pricePerGB: 0.026 },
  { min: 250_000, max: 1_000_000, pricePerGB: 0.022 },
  { min: 1_000_000, max: 2_500_000, pricePerGB: 0.02 },
  { min: 2_500_000, pricePerGB: 0.0188 },
];

/** Observability Complete - Data Ingestion (AWS us-east-1). */
export const OBSERVABILITY_COMPLETE_INGEST_TIERS: VolumeTier[] = [
  { min: 0, max: 1_500, pricePerGB: 0.5 },
  { min: 1_500, max: 3_000, pricePerGB: 0.325 },
  { min: 3_000, max: 6_000, pricePerGB: 0.225 },
  { min: 6_000, max: 15_000, pricePerGB: 0.15 },
  { min: 15_000, max: 30_000, pricePerGB: 0.105 },
  { min: 30_000, max: 60_000, pricePerGB: 0.1 },
  { min: 60_000, max: 150_000, pricePerGB: 0.095 },
  { min: 150_000, pricePerGB: 0.0925 },
];

const OBSERVABILITY_LOGS_ESSENTIALS_INGEST_TIERS: VolumeTier[] = [
  { min: 0, max: 1_500, pricePerGB: 0.35 },
  { min: 1_500, max: 3_000, pricePerGB: 0.2275 },
  { min: 3_000, max: 6_000, pricePerGB: 0.1575 },
  { min: 6_000, max: 15_000, pricePerGB: 0.105 },
  { min: 15_000, max: 30_000, pricePerGB: 0.0735 },
  { min: 30_000, max: 60_000, pricePerGB: 0.07 },
  { min: 60_000, max: 150_000, pricePerGB: 0.0665 },
  { min: 150_000, pricePerGB: 0.0648 },
];

const OBSERVABILITY_LOGS_ESSENTIALS_RETENTION_TIERS: VolumeTier[] = [
  { min: 0, max: 10_000, pricePerGB: 0.036 },
  { min: 10_000, max: 20_000, pricePerGB: 0.0288 },
  { min: 20_000, max: 50_000, pricePerGB: 0.027 },
  { min: 50_000, max: 100_000, pricePerGB: 0.0252 },
  { min: 100_000, max: 250_000, pricePerGB: 0.0234 },
  { min: 250_000, max: 1_000_000, pricePerGB: 0.0198 },
  { min: 1_000_000, max: 2_500_000, pricePerGB: 0.018 },
  { min: 2_500_000, pricePerGB: 0.0169 },
];

const SECURITY_ANALYTICS_COMPLETE_INGEST_TIERS: VolumeTier[] = [
  { min: 0, max: 1_500, pricePerGB: 0.6 },
  { min: 1_500, max: 3_000, pricePerGB: 0.39 },
  { min: 3_000, max: 6_000, pricePerGB: 0.27 },
  { min: 6_000, max: 15_000, pricePerGB: 0.18 },
  { min: 15_000, max: 30_000, pricePerGB: 0.126 },
  { min: 30_000, max: 60_000, pricePerGB: 0.12 },
  { min: 60_000, max: 150_000, pricePerGB: 0.114 },
  { min: 150_000, pricePerGB: 0.111 },
];

function buildRates(
  productTier: ElasticServerlessProductTier,
  label: string,
  ingestFloorPerGB: number,
  retentionFloorPerGB: number,
  ingestTiers: VolumeTier[],
  retentionTiers: VolumeTier[],
  extras?: Pick<ElasticServerlessRates, "logsMeteringMultiplier">
): ElasticServerlessRates {
  return {
    productTier,
    label,
    ingestFloorPerGB,
    retentionFloorPerGB,
    ingestTiers,
    retentionTiers,
    ...extras,
  };
}

export const ELASTIC_SERVERLESS_RATES: Record<
  ElasticServerlessProductTier,
  ElasticServerlessRates
> = {
  "observability-complete": buildRates(
    "observability-complete",
    "Observability Complete",
    0.09,
    0.019,
    OBSERVABILITY_COMPLETE_INGEST_TIERS,
    OBSERVABILITY_COMPLETE_RETENTION_TIERS,
    { logsMeteringMultiplier: 1.66 }
  ),
  "observability-logs-essentials": buildRates(
    "observability-logs-essentials",
    "Observability Logs Essentials",
    0.07,
    0.017,
    OBSERVABILITY_LOGS_ESSENTIALS_INGEST_TIERS,
    OBSERVABILITY_LOGS_ESSENTIALS_RETENTION_TIERS
  ),
  "security-analytics-complete": buildRates(
    "security-analytics-complete",
    "Security Analytics Complete",
    0.11,
    0.019,
    SECURITY_ANALYTICS_COMPLETE_INGEST_TIERS,
    OBSERVABILITY_COMPLETE_RETENTION_TIERS
  ),
};

export interface ElasticServerlessCostBreakdown {
  monthlyIngestGB: number;
  storedGB: number;
  ingestCost: number;
  retentionCost: number;
  volumeCost: number;
  ingestRateLabel: string;
  retentionRateLabel: string;
  /** Present when ECH 1d hot + ILM blob (writable frozen) model is used. */
  echHotFrozen?: {
    hotDays: number;
    ilmBlobDays: number;
    hotCapacityCost: number;
    blobStorageCost: number;
    dataTransferCost: number;
    indexedGbPerDay: number;
    rawGbPerDay: number;
  };
}

/** Tiered GB pricing — matches Elastic Cloud pricing table tier widths. */
export function calculateTieredVolumeCost(gb: number, tiers: VolumeTier[]): number {
  if (gb <= 0) return 0;

  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  let total = 0;
  let consumed = 0;

  for (const tier of sorted) {
    if (consumed >= gb) break;

    const tierEnd = tier.max ?? Infinity;
    const tierWidth = tierEnd - tier.min;
    const remaining = gb - consumed;
    const billable = Math.min(remaining, tierWidth);

    if (billable > 0) {
      total += billable * tier.pricePerGB;
      consumed += billable;
    }
  }

  return total;
}

function effectiveRate(totalCost: number, gb: number): string {
  if (gb <= 0) return "$0.00/GB";
  return `$${(totalCost / gb).toFixed(4)}/GB`;
}

export function getElasticServerlessRates(
  productTier: ElasticServerlessProductTier = "observability-complete"
): ElasticServerlessRates {
  return ELASTIC_SERVERLESS_RATES[productTier];
}

export function calculateElasticServerlessCost(
  monthlyIngestGB: number,
  options: ElasticServerlessPricingOptions = DEFAULT_ELASTIC_PRICING_OPTIONS
): ElasticServerlessCostBreakdown {
  const productTier = options.productTier ?? "observability-complete";
  const useVolumeTiers = options.useVolumeTiers ?? true;
  const retentionMonths = Math.max(0, options.retentionMonths);
  const rates = getElasticServerlessRates(productTier);
  const storedGB = monthlyIngestGB * retentionMonths;

  if (!useVolumeTiers) {
    const ingestCost = monthlyIngestGB * rates.ingestFloorPerGB;
    const retentionCost = storedGB * rates.retentionFloorPerGB;
    return {
      monthlyIngestGB,
      storedGB,
      ingestCost,
      retentionCost,
      volumeCost: ingestCost + retentionCost,
      ingestRateLabel: `$${rates.ingestFloorPerGB.toFixed(3)}/GB ingest (floor)`,
      retentionRateLabel: `$${rates.retentionFloorPerGB.toFixed(3)}/GB retained/mo (floor)`,
    };
  }

  const ingestCost = calculateTieredVolumeCost(monthlyIngestGB, rates.ingestTiers);
  const retentionCost = calculateTieredVolumeCost(storedGB, rates.retentionTiers);

  return {
    monthlyIngestGB,
    storedGB,
    ingestCost,
    retentionCost,
    volumeCost: ingestCost + retentionCost,
    ingestRateLabel: effectiveRate(ingestCost, monthlyIngestGB) + " ingest (tiered avg)",
    retentionRateLabel: effectiveRate(retentionCost, storedGB) + " retained/mo (tiered avg)",
  };
}

/** Observability Serverless metrics (TSDS): 25% of Complete ingest + retention tier costs. */
export function calculateElasticServerlessMetricsCost(
  monthlyIngestGB: number,
  options: ElasticServerlessPricingOptions = DEFAULT_ELASTIC_PRICING_OPTIONS
): ElasticServerlessCostBreakdown {
  const base = calculateElasticServerlessCost(monthlyIngestGB, options);
  const m = ELASTIC_TSDS_METRICS_RATE_MULTIPLIER;
  const ingestCost = base.ingestCost * m;
  const retentionCost = base.retentionCost * m;
  return {
    monthlyIngestGB: base.monthlyIngestGB,
    storedGB: base.storedGB,
    ingestCost,
    retentionCost,
    volumeCost: ingestCost + retentionCost,
    ingestRateLabel:
      effectiveRate(ingestCost, monthlyIngestGB) +
      " ingest (TSDS 25% of Complete tier table)",
    retentionRateLabel:
      effectiveRate(retentionCost, base.storedGB) +
      " retained/mo (TSDS 25% of Complete tiers)",
  };
}

/** ECH + self-managed: TSDS metrics use the same 1d hot + ILM blob backbone as logs/traces. */
export function calculateEchMetricsCost(monthlyIngestGB: number): ElasticServerlessCostBreakdown {
  return calculateEchHotFrozenVolumeCost(monthlyIngestGB);
}

export interface EchVolumePricingOptions {
  retentionMonths: number;
  /** Match Serverless retention tier table from cloud.elastic.co when true. */
  useRetentionTiers?: boolean;
  pricePerIngestGB?: number;
}

/** @deprecated Use calculateEchHotFrozenVolumeCost — ECH always models 1d hot + ILM blob. */
export function calculateEchVolumeCost(
  monthlyIngestGB: number,
  _options: EchVolumePricingOptions
): ElasticServerlessCostBreakdown {
  return calculateEchHotFrozenVolumeCost(monthlyIngestGB);
}

/** Convert raw logs GB/day to metered monthly ingest GB (Elastic estimator uses 1.66× enrichment). */
export function elasticLogsMeteredMonthlyGB(rawGbPerDay: number): number {
  const rates = getElasticServerlessRates("observability-complete");
  const multiplier = rates.logsMeteringMultiplier ?? 1.66;
  return rawGbPerDay * multiplier * ELASTIC_DAYS_PER_MONTH;
}

export function isElasticServerlessPlatformId(platformId: string): boolean {
  return (
    platformId === "elastic-serverless" ||
    platformId === "elastic-logs" ||
    platformId === "elastic-tracing" ||
    platformId === "elastic-security"
  );
}

export function elasticProductTierForPlatform(platformId: string): ElasticServerlessProductTier {
  if (platformId === "elastic-security") return "security-analytics-complete";
  return "observability-complete";
}
