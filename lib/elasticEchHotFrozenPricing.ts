/**
 * Elastic Cloud Hosted retention architecture (enterprise hot + frozen model):
 * ingest/compute proxy + 1-day data hot (RAM-hour) + ILM → searchable snapshots on blob.
 *
 * Capacity rates align with cloud.elastic.co Cloud Hosted list (AWS us-east-1):
 * deployment capacity (GB RAM/hour), snapshot storage, data transfer.
 * Ingest $/GB matches the ECH Observability variable rate used on logs/APM tabs.
 */

import {
  ELASTIC_DAYS_PER_MONTH,
  type ElasticServerlessCostBreakdown,
} from "./elasticServerlessPricing";

export const ECH_HOT_FROZEN_ARCHITECTURE = {
  hotDays: 1,
  /** Fallback aged window when total retention is not provided. */
  ilmBlobDays: 25,
  summary: "1-day hot · ILM → blob (writable frozen)",
} as const;

/** Official ECH list rates (AWS us-east-1) + Observability ingest proxy. */
export const ECH_CLOUD_HOSTED_LIST_RATES = {
  hoursPerMonth: 730,
  dataHotRamGbHourUsd: 0.048,
  snapshotStorageGbMonthUsd: 0.033,
  dataTransferOutPerGbUsd: 0.05,
  dataTransferIngestPct: 0.017,
  freeDataTransferGbMonth: 100,
  /**
   * Indexed-size vs wire GB. Keep modest — samples/sec POCs already use TSDB-ish
   * bytes/sample; stacking 6× here underprices ECH vs Serverless.
   */
  indexingCompressionRatio: 2,
  indexedGbPerRamGbHot: 105,
  replicaFactor: 2,
  /** Variable ingest/compute proxy (same list rate as ECH logs/APM tabs). */
  ingestPerGbUsd: 0.05,
} as const;

export interface EchHotFrozenOptions {
  hotDays?: number;
  ilmBlobDays?: number;
  /** When set, ilmBlobDays = max(0, totalDays − hotDays). */
  totalRetentionMonths?: number;
  /** Override ingest $/GB (default list ingest proxy). Pass 0 to disable. */
  ingestPricePerGB?: number;
  /** Override compression ratio (wire GB → indexed GB). */
  indexingCompressionRatio?: number;
}

/**
 * ECH variable backbone: ingest/compute + hot RAM capacity + blob GB-month + transfer.
 * Input is monthly ingest GB on the wire (or already-sized TSDB bytes in samples/sec mode).
 */
export function calculateEchHotFrozenVolumeCost(
  monthlyIngestGB: number,
  options: EchHotFrozenOptions = {}
): ElasticServerlessCostBreakdown {
  const rates = ECH_CLOUD_HOSTED_LIST_RATES;
  const hotDays = options.hotDays ?? ECH_HOT_FROZEN_ARCHITECTURE.hotDays;
  let ilmBlobDays = options.ilmBlobDays;
  if (options.totalRetentionMonths != null && options.totalRetentionMonths >= 0) {
    const totalDays = Math.round(options.totalRetentionMonths * ELASTIC_DAYS_PER_MONTH);
    ilmBlobDays = Math.max(0, totalDays - hotDays);
  }
  ilmBlobDays = ilmBlobDays ?? ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays;

  const ingestRate =
    options.ingestPricePerGB !== undefined
      ? Math.max(0, options.ingestPricePerGB)
      : rates.ingestPerGbUsd;
  const compression = Math.max(
    1,
    options.indexingCompressionRatio ?? rates.indexingCompressionRatio
  );

  if (monthlyIngestGB <= 0) {
    return {
      monthlyIngestGB: 0,
      storedGB: 0,
      ingestCost: 0,
      retentionCost: 0,
      volumeCost: 0,
      ingestRateLabel: ECH_HOT_FROZEN_ARCHITECTURE.summary,
      retentionRateLabel: "ILM blob (writable frozen)",
    };
  }

  const rawGbPerDay = monthlyIngestGB / ELASTIC_DAYS_PER_MONTH;
  const indexedGbPerDay = rawGbPerDay / compression;

  const ingestComputeCost = monthlyIngestGB * ingestRate;

  const hotCapacityCost =
    ((indexedGbPerDay * hotDays * rates.replicaFactor) / rates.indexedGbPerRamGbHot) *
    rates.hoursPerMonth *
    rates.dataHotRamGbHourUsd;

  const blobStorageCost = indexedGbPerDay * ilmBlobDays * rates.snapshotStorageGbMonthUsd;

  const billableTransferGb = Math.max(
    0,
    monthlyIngestGB * rates.dataTransferIngestPct - rates.freeDataTransferGbMonth
  );
  const dataTransferCost = billableTransferGb * rates.dataTransferOutPerGbUsd;

  const volumeCost =
    ingestComputeCost + hotCapacityCost + blobStorageCost + dataTransferCost;
  const storedGB = indexedGbPerDay * (hotDays + ilmBlobDays);

  return {
    monthlyIngestGB,
    storedGB,
    ingestCost: ingestComputeCost + hotCapacityCost + dataTransferCost,
    retentionCost: blobStorageCost,
    volumeCost,
    ingestRateLabel:
      ingestRate > 0
        ? `$${ingestRate.toFixed(3)}/GB ingest + ${hotDays}d data hot (RAM-hour)`
        : `${hotDays}d data hot (RAM-hour) + transfer`,
    retentionRateLabel: `${ilmBlobDays}d ILM blob @ $${rates.snapshotStorageGbMonthUsd}/GB-mo (writable frozen)`,
    echHotFrozen: {
      hotDays,
      ilmBlobDays,
      hotCapacityCost,
      blobStorageCost,
      dataTransferCost,
      indexedGbPerDay,
      rawGbPerDay,
      ingestComputeCost,
    },
  };
}
