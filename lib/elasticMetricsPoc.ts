import { ELASTIC_DAYS_PER_MONTH } from "./elasticServerlessPricing";
import {
  ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB,
  ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB,
} from "./elasticServerlessPricing";

export type ElasticSupportTierId = "standard" | "gold" | "platinum" | "enterprise";

export const ELASTIC_SUPPORT_TIERS: {
  id: ElasticSupportTierId;
  label: string;
  pctOfConsumption: number;
}[] = [
  { id: "standard", label: "Standard (included)", pctOfConsumption: 0 },
  { id: "gold", label: "Gold (5%)", pctOfConsumption: 0.05 },
  { id: "platinum", label: "Platinum (10%)", pctOfConsumption: 0.1 },
  { id: "enterprise", label: "Enterprise (15%)", pctOfConsumption: 0.15 },
];

export interface ElasticMetricsPocInput {
  /** Post-dedup samples/sec on the wire (1 sample ≈ 1 datapoint for volume). */
  samplesPerSecond: number;
  /** Elastic TSDB / TSDS bytes per sample (POC default 1.5). */
  bytesPerSample: number;
  retentionMonths: number;
  /**
   * Steady-state stored GB/month ≈ ingest × retentionMonths / factor.
   * Default ~3.12 matches 1,560 GB ingest → ~6 TB stored @ 12 mo in field POCs.
   */
  tsdbStoredCompressionFactor: number;
  supportTier: ElasticSupportTierId;
  ingestRatePerGb?: number;
  retentionRatePerGb?: number;
}

export interface ElasticMetricsPocBreakdown {
  samplesPerDay: number;
  monthlyIngestGbDecimal: number;
  storedGbMonth: number;
  ingestCost: number;
  retentionCost: number;
  subtotal: number;
  supportPct: number;
  supportCost: number;
  totalMonthly: number;
  totalAnnual: number;
}

const SECONDS_PER_DAY = 86_400;

/** Decimal GB (1 GB = 1e9 bytes) — matches enterprise POC worksheets. */
export function samplesPerSecondToMonthlyIngestGbDecimal(
  samplesPerSecond: number,
  bytesPerSample: number
): number {
  const monthlySamples = samplesPerSecond * ELASTIC_DAYS_PER_MONTH * SECONDS_PER_DAY;
  return (monthlySamples * bytesPerSample) / 1_000_000_000;
}

export function calculateElasticMetricsPoc(
  input: ElasticMetricsPocInput
): ElasticMetricsPocBreakdown {
  const ingestRate = input.ingestRatePerGb ?? ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB;
  const retentionRate =
    input.retentionRatePerGb ?? ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB;
  const supportPct =
    ELASTIC_SUPPORT_TIERS.find((t) => t.id === input.supportTier)?.pctOfConsumption ?? 0;

  const samplesPerDay = input.samplesPerSecond * SECONDS_PER_DAY;
  const monthlyIngestGbDecimal = samplesPerSecondToMonthlyIngestGbDecimal(
    input.samplesPerSecond,
    input.bytesPerSample
  );
  const factor = Math.max(1, input.tsdbStoredCompressionFactor);
  const storedGbMonth =
    (monthlyIngestGbDecimal * Math.max(1, input.retentionMonths)) / factor;

  const ingestCost = monthlyIngestGbDecimal * ingestRate;
  const retentionCost = storedGbMonth * retentionRate;
  const subtotal = ingestCost + retentionCost;
  const supportCost = subtotal * supportPct;
  const totalMonthly = subtotal + supportCost;

  return {
    samplesPerDay,
    monthlyIngestGbDecimal,
    storedGbMonth,
    ingestCost,
    retentionCost,
    subtotal,
    supportPct,
    supportCost,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
  };
}
