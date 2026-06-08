/**
 * Elastic Observability / Security Serverless pricing
 *
 * Official list rates (volume-tier floors, effective Nov 1, 2025):
 * https://www.elastic.co/pricing/serverless-observability
 *
 * Billing model (ingest + retention are separate line items):
 * https://www.elastic.co/docs/deploy-manage/cloud-organization/billing/elastic-observability-billing-dimensions
 *
 * Volume tier breakpoints (first two ingest tiers from Nov 2025 packaging blog;
 * intermediate tiers estimated to reach published floors by ~5 TB/month):
 * https://www.elastic.co/blog/elastic-cloud-serverless-pricing-packaging
 */

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
  /** When false, uses published floor rates only (high-volume best case). */
  useVolumeTiers?: boolean;
}

export const DEFAULT_ELASTIC_PRICING_OPTIONS: ElasticServerlessPricingOptions = {
  retentionMonths: 1,
  productTier: "observability-complete",
  useVolumeTiers: true,
};

export const ELASTIC_DAYS_PER_MONTH = 365 / 12;

/** Shared ingest tier shape; retention tiers scale by retentionFloor / ingestFloor. */
const OBSERVABILITY_COMPLETE_INGEST_TIERS: VolumeTier[] = [
  { min: 0, max: 50, pricePerGB: 0.6 },
  { min: 50, max: 100, pricePerGB: 0.33 },
  { min: 100, max: 1024, pricePerGB: 0.18 },
  { min: 1024, max: 5120, pricePerGB: 0.12 },
  { min: 5120, pricePerGB: 0.09 },
];

function scaleRetentionTiers(
  ingestTiers: VolumeTier[],
  ingestFloor: number,
  retentionFloor: number
): VolumeTier[] {
  const scale = retentionFloor / ingestFloor;
  return ingestTiers.map((tier) => ({
    min: tier.min,
    max: tier.max,
    pricePerGB: tier.pricePerGB * scale,
  }));
}

function buildRates(
  productTier: ElasticServerlessProductTier,
  label: string,
  ingestFloorPerGB: number,
  retentionFloorPerGB: number,
  ingestTiers: VolumeTier[],
  extras?: Pick<ElasticServerlessRates, "logsMeteringMultiplier">
): ElasticServerlessRates {
  return {
    productTier,
    label,
    ingestFloorPerGB,
    retentionFloorPerGB,
    ingestTiers,
    retentionTiers: scaleRetentionTiers(ingestTiers, ingestFloorPerGB, retentionFloorPerGB),
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
    { logsMeteringMultiplier: 1.66 }
  ),
  "observability-logs-essentials": buildRates(
    "observability-logs-essentials",
    "Observability Logs Essentials",
    0.07,
    0.017,
    OBSERVABILITY_COMPLETE_INGEST_TIERS.map((tier) => ({
      ...tier,
      pricePerGB: (tier.pricePerGB / 0.09) * 0.07,
    }))
  ),
  "security-analytics-complete": buildRates(
    "security-analytics-complete",
    "Security Analytics Complete",
    0.11,
    0.019,
    OBSERVABILITY_COMPLETE_INGEST_TIERS.map((tier) => ({
      ...tier,
      pricePerGB: (tier.pricePerGB / 0.09) * 0.11,
    }))
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
}

/** Tiered GB pricing — matches Elastic Cloud pricing estimator (`tz` in console). */
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
