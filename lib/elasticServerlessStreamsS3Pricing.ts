/**
 * Serverless Streams → S3 long-retention architecture (roadmap / target TCO).
 *
 * Elastic bill uses Observability Complete **volume tiers** from cloud.elastic.co
 * (not marketing “as low as” floors alone — floors underprice mid-volume POCs):
 *   — ingest + short hot retention on Search AI Lake
 *   — metrics in TSDS mode: 25% of Complete tier rates
 *
 * Aged bytes leave Complete retention via Streams S3 exporter (workload-identity JWT).
 * Object-storage aged rate uses AWS S3 Standard-class list (~$0.023/GB-mo us-east-1) as the
 * customer-bucket proxy until Streams→S3 publish a dedicated Elastic rate.
 */

import {
  ELASTIC_DAYS_PER_MONTH,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  ELASTIC_TSDS_METRICS_RATE_MULTIPLIER,
  OBSERVABILITY_SERVERLESS_PUBLISHED,
  calculateTieredVolumeCost,
  getElasticServerlessRates,
  type ElasticServerlessCostBreakdown,
} from "./elasticServerlessPricing";

/** AWS S3 Standard us-east-1 list-class proxy for customer-bucket aged storage. */
export const S3_STANDARD_GB_MONTH_USD = 0.023;

export const SERVERLESS_STREAMS_S3_ARCHITECTURE = {
  hotDays: 1,
  /** Default aged window when no total retention is provided (parity with ECH 25d blob). */
  defaultS3Days: 25,
  summary: "1-day hot · Streams → S3",
  status: "roadmap" as const,
  dataPlane: ["Source", "Processors", "S3 exporter"] as const,
  identity: "Workload Identity Issuer · short-lived JWT (via ECP proxy)",
  pricingSourceUrl: ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  ingestPerGB: OBSERVABILITY_SERVERLESS_PUBLISHED.complete.ingestLogsTracesPerGB,
  hotRetentionPerGBMonth: OBSERVABILITY_SERVERLESS_PUBLISHED.complete.retentionLogsTracesPerGBMonth,
  s3PerGBMonth: S3_STANDARD_GB_MONTH_USD,
} as const;

export interface ServerlessStreamsS3Options {
  hotDays?: number;
  /** Days retained on customer S3 after the hot window. */
  s3Days?: number;
  /** Total retention including hot; when set, s3Days = max(0, totalDays − hotDays). */
  totalRetentionMonths?: number;
  /** Use Complete metrics TSDS rates (25% of Complete tiers) instead of logs/traces. */
  metricsTsd?: boolean;
  /**
   * When true (default), bill Elastic ingest + hot retention from the Complete volume
   * tier table. When false, use published marketing floors only (POC worksheets).
   */
  useVolumeTiers?: boolean;
}

function effectiveRate(totalCost: number, gb: number): string {
  if (gb <= 0) return "$0.00/GB";
  return `$${(totalCost / gb).toFixed(4)}/GB`;
}

/**
 * Serverless Streams→S3: Complete ingest (tiered) + 1-day hot retention + S3 aged storage.
 * Hot is always short (default 1 day); Streams moves the rest to object storage.
 */
export function calculateServerlessStreamsS3VolumeCost(
  monthlyIngestGB: number,
  options: ServerlessStreamsS3Options = {}
): ElasticServerlessCostBreakdown {
  const hotDays = options.hotDays ?? SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays;
  let s3Days = options.s3Days;
  if (options.totalRetentionMonths != null && options.totalRetentionMonths >= 0) {
    const totalDays = Math.round(options.totalRetentionMonths * ELASTIC_DAYS_PER_MONTH);
    s3Days = Math.max(0, totalDays - hotDays);
  }
  s3Days = s3Days ?? SERVERLESS_STREAMS_S3_ARCHITECTURE.defaultS3Days;

  const useVolumeTiers = options.useVolumeTiers ?? true;
  const rates = getElasticServerlessRates("observability-complete");
  const pub = OBSERVABILITY_SERVERLESS_PUBLISHED.complete;
  const tsdMult = options.metricsTsd ? ELASTIC_TSDS_METRICS_RATE_MULTIPLIER : 1;
  const s3Rate = SERVERLESS_STREAMS_S3_ARCHITECTURE.s3PerGBMonth;

  if (monthlyIngestGB <= 0) {
    return {
      monthlyIngestGB: 0,
      storedGB: 0,
      ingestCost: 0,
      retentionCost: 0,
      volumeCost: 0,
      ingestRateLabel: SERVERLESS_STREAMS_S3_ARCHITECTURE.summary,
      retentionRateLabel: "Streams → S3",
    };
  }

  const gbPerDay = monthlyIngestGB / ELASTIC_DAYS_PER_MONTH;
  const hotStoredGB = gbPerDay * hotDays;
  const s3StoredGB = gbPerDay * s3Days;

  let ingestCost: number;
  let hotRetentionCost: number;
  let ingestRateLabel: string;
  let hotRateLabel: string;

  if (useVolumeTiers) {
    ingestCost = calculateTieredVolumeCost(monthlyIngestGB, rates.ingestTiers) * tsdMult;
    hotRetentionCost = calculateTieredVolumeCost(hotStoredGB, rates.retentionTiers) * tsdMult;
    ingestRateLabel =
      effectiveRate(ingestCost, monthlyIngestGB) +
      (options.metricsTsd
        ? " ingest (TSDS 25% of Complete tier table)"
        : " ingest (Complete tier table)");
    hotRateLabel =
      effectiveRate(hotRetentionCost, hotStoredGB) +
      (options.metricsTsd ? " hot (TSDS 25% of Complete tiers)" : " hot (Complete tiers)");
  } else {
    const ingestRate = options.metricsTsd ? pub.ingestMetricsPerGB : pub.ingestLogsTracesPerGB;
    const hotRetentionRate = options.metricsTsd
      ? pub.retentionMetricsPerGBMonth
      : pub.retentionLogsTracesPerGBMonth;
    ingestCost = monthlyIngestGB * ingestRate;
    hotRetentionCost = hotStoredGB * hotRetentionRate;
    ingestRateLabel = `$${ingestRate.toFixed(3)}/GB Complete ingest (published floor)`;
    hotRateLabel = `$${hotRetentionRate.toFixed(3)}/GB-mo hot`;
  }

  const s3StorageCost = s3StoredGB * s3Rate;
  const retentionCost = hotRetentionCost + s3StorageCost;

  return {
    monthlyIngestGB,
    storedGB: hotStoredGB + s3StoredGB,
    ingestCost,
    retentionCost,
    volumeCost: ingestCost + retentionCost,
    ingestRateLabel,
    retentionRateLabel: `${hotDays}d hot @ ${hotRateLabel} + ${s3Days}d S3 @ $${s3Rate.toFixed(3)}/GB-mo`,
    echHotFrozen: {
      hotDays,
      ilmBlobDays: s3Days,
      hotCapacityCost: hotRetentionCost,
      blobStorageCost: s3StorageCost,
      dataTransferCost: 0,
      indexedGbPerDay: gbPerDay,
      rawGbPerDay: gbPerDay,
    },
  };
}
