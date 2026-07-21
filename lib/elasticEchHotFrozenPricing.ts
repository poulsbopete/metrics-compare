/**
 * Elastic Cloud Hosted retention architecture (enterprise hot + frozen model):
 * 1-day data hot (RAM-hour) + ILM → searchable snapshots on blob (writable frozen).
 *
 * Rates align with cloud.elastic.co/cloud-pricing-table (AWS us-east-1).
 */

import {
  ELASTIC_DAYS_PER_MONTH,
  type ElasticServerlessCostBreakdown,
} from "./elasticServerlessPricing";

export const ECH_HOT_FROZEN_ARCHITECTURE = {
  hotDays: 1,
  ilmBlobDays: 25,
  summary: "1-day hot · ILM → blob (writable frozen)",
} as const;

/** Official ECH list rates (AWS us-east-1). */
export const ECH_CLOUD_HOSTED_LIST_RATES = {
  hoursPerMonth: 730,
  dataHotRamGbHourUsd: 0.048,
  snapshotStorageGbMonthUsd: 0.033,
  dataTransferOutPerGbUsd: 0.05,
  dataTransferIngestPct: 0.017,
  freeDataTransferGbMonth: 100,
  indexingCompressionRatio: 6,
  indexedGbPerRamGbHot: 105,
  replicaFactor: 2,
} as const;

export interface EchHotFrozenOptions {
  hotDays?: number;
  ilmBlobDays?: number;
}

/**
 * ECH variable backbone: hot RAM capacity + blob GB-month + data transfer.
 * Input is raw monthly ingest GB (uncompressed on the wire); indexed size uses compression ratio.
 */
export function calculateEchHotFrozenVolumeCost(
  monthlyIngestGB: number,
  options: EchHotFrozenOptions = {}
): ElasticServerlessCostBreakdown {
  const rates = ECH_CLOUD_HOSTED_LIST_RATES;
  const hotDays = options.hotDays ?? ECH_HOT_FROZEN_ARCHITECTURE.hotDays;
  const ilmBlobDays = options.ilmBlobDays ?? ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays;

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
  const indexedGbPerDay = rawGbPerDay / rates.indexingCompressionRatio;

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

  const volumeCost = hotCapacityCost + blobStorageCost + dataTransferCost;
  const storedGB = indexedGbPerDay * (hotDays + ilmBlobDays);

  return {
    monthlyIngestGB,
    storedGB,
    ingestCost: hotCapacityCost + dataTransferCost,
    retentionCost: blobStorageCost,
    volumeCost,
    ingestRateLabel: `${hotDays}d data hot (RAM-hour) + transfer`,
    retentionRateLabel: `${ilmBlobDays}d ILM blob @ $${rates.snapshotStorageGbMonthUsd}/GB-mo (writable frozen)`,
    echHotFrozen: {
      hotDays,
      ilmBlobDays,
      hotCapacityCost,
      blobStorageCost,
      dataTransferCost,
      indexedGbPerDay,
      rawGbPerDay,
    },
  };
}
