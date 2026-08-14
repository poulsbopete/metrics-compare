/**
 * Serverless Streams → S3 long-retention architecture (roadmap / target TCO).
 *
 * Elastic bill grounded in published Observability Complete floors:
 * https://www.elastic.co/pricing/serverless-observability
 *   — ingest logs/traces as low as $0.09/GB
 *   — retention logs/traces $0.019/GB-mo (hot window only on Search AI Lake)
 *
 * Aged bytes leave Complete retention via Streams S3 exporter (workload-identity JWT).
 * Object-storage aged rate uses AWS S3 Standard-class list (~$0.023/GB-mo us-east-1) as the
 * customer-bucket proxy until Streams→S3 publish a dedicated Elastic rate.
 */

import {
  ELASTIC_DAYS_PER_MONTH,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  OBSERVABILITY_SERVERLESS_PUBLISHED,
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
  /** Use Complete metrics TSDS floors instead of logs/traces floors. */
  metricsTsd?: boolean;
}

/**
 * Serverless Streams→S3: Complete ingest floor + 1-day hot Complete retention + S3 aged storage.
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

  const pub = OBSERVABILITY_SERVERLESS_PUBLISHED.complete;
  const ingestRate = options.metricsTsd
    ? pub.ingestMetricsPerGB
    : pub.ingestLogsTracesPerGB;
  const hotRetentionRate = options.metricsTsd
    ? pub.retentionMetricsPerGBMonth
    : pub.retentionLogsTracesPerGBMonth;
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

  const ingestCost = monthlyIngestGB * ingestRate;
  const hotRetentionCost = hotStoredGB * hotRetentionRate;
  const s3StorageCost = s3StoredGB * s3Rate;
  const retentionCost = hotRetentionCost + s3StorageCost;

  return {
    monthlyIngestGB,
    storedGB: hotStoredGB + s3StoredGB,
    ingestCost,
    retentionCost,
    volumeCost: ingestCost + retentionCost,
    ingestRateLabel: `$${ingestRate.toFixed(3)}/GB Complete ingest (published floor)`,
    retentionRateLabel: `${hotDays}d hot @ $${hotRetentionRate.toFixed(3)}/GB-mo + ${s3Days}d S3 @ $${s3Rate.toFixed(3)}/GB-mo`,
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
