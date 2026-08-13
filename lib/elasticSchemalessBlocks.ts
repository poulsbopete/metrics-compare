/**
 * Schemaless “data block” quotes — same $/month per ingested TB whether the bytes are logs, metrics, or traces.
 *
 * Serverless numbers grounded in published Observability Complete floors:
 * https://www.elastic.co/pricing/serverless-observability
 *   — ingest as low as $0.09/GB (logs/traces); metrics TSDS $0.023/GB
 *   — retention $0.019/GB-mo (logs/traces); metrics $0.005/GB-mo
 *
 * ECH: 1d hot + ILM blob (Cloud Hosted list). Serverless primary: Streams → S3 (Complete ingest + hot
 * retention floors + S3-class aged). Contrast: full Complete retention months at published floors.
 */

import {
  calculateEchHotFrozenVolumeCost,
  ECH_CLOUD_HOSTED_LIST_RATES,
  ECH_HOT_FROZEN_ARCHITECTURE,
} from "./elasticEchHotFrozenPricing";
import {
  calculateServerlessStreamsS3VolumeCost,
  SERVERLESS_STREAMS_S3_ARCHITECTURE,
} from "./elasticServerlessStreamsS3Pricing";
import {
  calculateObservabilityCompleteFloorCost,
  DEFAULT_ELASTIC_PRICING_OPTIONS,
  ELASTIC_DAYS_PER_MONTH,
  OBSERVABILITY_SERVERLESS_PUBLISHED,
} from "./elasticServerlessPricing";

export const GB_PER_TIB = 1024;

/** Committed monthly ingest blocks for reference quotes (tebibytes on the wire). */
export const SCHEMALESS_BLOCK_TIERS_TB = [1, 50, 100, 500] as const;

export type SchemalessBlockTierTb = (typeof SCHEMALESS_BLOCK_TIERS_TB)[number];

export interface EchBlockMath {
  monthly: number;
  annual: number;
  perTbMonth: number;
  rawGbPerDay: number;
  indexedGbPerDay: number;
  hotCapacityCost: number;
  blobStorageCost: number;
  dataTransferCost: number;
  billableTransferGb: number;
  hotDays: number;
  ilmBlobDays: number;
  compressionRatio: number;
  replicaFactor: number;
  indexedGbPerRamGbHot: number;
  hoursPerMonth: number;
  dataHotRamGbHourUsd: number;
  snapshotStorageGbMonthUsd: number;
  dataTransferOutPerGbUsd: number;
  dataTransferIngestPct: number;
  freeDataTransferGbMonth: number;
}

export interface ServerlessStreamsS3BlockMath {
  monthly: number;
  annual: number;
  perTbMonth: number;
  withStreamsS3: true;
  gbPerDay: number;
  ingestCost: number;
  hotRetentionCost: number;
  s3StorageCost: number;
  retentionCost: number;
  hotStoredGb: number;
  s3StoredGb: number;
  ingestPerGB: number;
  hotRetentionPerGBMonth: number;
  s3PerGBMonth: number;
  hotDays: number;
  s3Days: number;
}

export interface ServerlessCompleteBlockMath {
  monthly: number;
  annual: number;
  perTbMonth: number;
  ingestCost: number;
  retentionCost: number;
  storedGb: number;
  retentionMonths: number;
  ingestPerGB: number;
  retentionPerGBMonth: number;
}

export interface SchemalessBlockQuote {
  tierTb: number;
  monthlyIngestGb: number;
  dailyIngestGb: number;
  daysPerMonth: number;
  ech: EchBlockMath;
  serverless: ServerlessStreamsS3BlockMath;
  serverlessCompleteRetention: ServerlessCompleteBlockMath;
}

function monthlyGbFromTierTb(tierTb: number): number {
  return tierTb * GB_PER_TIB;
}

function perTb(monthly: number, tierTb: number): number {
  return tierTb > 0 ? monthly / tierTb : 0;
}

/**
 * Unified observability ingest GB/month — signal-agnostic (schemaless wire volume).
 * Serverless paths use Complete logs/traces published floors (conservative for mixed OTLP).
 */
export function quoteSchemalessBlock(
  tierTb: number,
  retentionMonths: number = DEFAULT_ELASTIC_PRICING_OPTIONS.retentionMonths
): SchemalessBlockQuote {
  const monthlyIngestGb = monthlyGbFromTierTb(tierTb);
  const dailyIngestGb = monthlyIngestGb / ELASTIC_DAYS_PER_MONTH;
  const rates = ECH_CLOUD_HOSTED_LIST_RATES;
  const pub = OBSERVABILITY_SERVERLESS_PUBLISHED.complete;

  const echBreakdown = calculateEchHotFrozenVolumeCost(monthlyIngestGb);
  const echDetail = echBreakdown.echHotFrozen!;
  const billableTransferGb = Math.max(
    0,
    monthlyIngestGb * rates.dataTransferIngestPct - rates.freeDataTransferGbMonth
  );

  const streamsS3 = calculateServerlessStreamsS3VolumeCost(monthlyIngestGb);
  const s3Detail = streamsS3.echHotFrozen!;
  const hotRetentionCost = s3Detail.hotCapacityCost;
  const s3StorageCost = s3Detail.blobStorageCost;

  const completeFloor = calculateObservabilityCompleteFloorCost(
    monthlyIngestGb,
    retentionMonths,
    "logs_traces"
  );

  return {
    tierTb,
    monthlyIngestGb,
    dailyIngestGb,
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    ech: {
      monthly: echBreakdown.volumeCost,
      annual: echBreakdown.volumeCost * 12,
      perTbMonth: perTb(echBreakdown.volumeCost, tierTb),
      rawGbPerDay: echDetail.rawGbPerDay,
      indexedGbPerDay: echDetail.indexedGbPerDay,
      hotCapacityCost: echDetail.hotCapacityCost,
      blobStorageCost: echDetail.blobStorageCost,
      dataTransferCost: echDetail.dataTransferCost,
      billableTransferGb,
      hotDays: ECH_HOT_FROZEN_ARCHITECTURE.hotDays,
      ilmBlobDays: ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays,
      compressionRatio: rates.indexingCompressionRatio,
      replicaFactor: rates.replicaFactor,
      indexedGbPerRamGbHot: rates.indexedGbPerRamGbHot,
      hoursPerMonth: rates.hoursPerMonth,
      dataHotRamGbHourUsd: rates.dataHotRamGbHourUsd,
      snapshotStorageGbMonthUsd: rates.snapshotStorageGbMonthUsd,
      dataTransferOutPerGbUsd: rates.dataTransferOutPerGbUsd,
      dataTransferIngestPct: rates.dataTransferIngestPct,
      freeDataTransferGbMonth: rates.freeDataTransferGbMonth,
    },
    serverless: {
      monthly: streamsS3.volumeCost,
      annual: streamsS3.volumeCost * 12,
      perTbMonth: perTb(streamsS3.volumeCost, tierTb),
      withStreamsS3: true,
      gbPerDay: s3Detail.rawGbPerDay,
      ingestCost: streamsS3.ingestCost,
      hotRetentionCost,
      s3StorageCost,
      retentionCost: streamsS3.retentionCost,
      hotStoredGb: s3Detail.rawGbPerDay * SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays,
      s3StoredGb: s3Detail.rawGbPerDay * SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days,
      ingestPerGB: SERVERLESS_STREAMS_S3_ARCHITECTURE.ingestPerGB,
      hotRetentionPerGBMonth: SERVERLESS_STREAMS_S3_ARCHITECTURE.hotRetentionPerGBMonth,
      s3PerGBMonth: SERVERLESS_STREAMS_S3_ARCHITECTURE.s3PerGBMonth,
      hotDays: SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays,
      s3Days: SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days,
    },
    serverlessCompleteRetention: {
      monthly: completeFloor.volumeCost,
      annual: completeFloor.volumeCost * 12,
      perTbMonth: perTb(completeFloor.volumeCost, tierTb),
      ingestCost: completeFloor.ingestCost,
      retentionCost: completeFloor.retentionCost,
      storedGb: completeFloor.storedGB,
      retentionMonths,
      ingestPerGB: pub.ingestLogsTracesPerGB,
      retentionPerGBMonth: pub.retentionLogsTracesPerGBMonth,
    },
  };
}

export function quoteAllSchemalessBlocks(
  retentionMonths: number = DEFAULT_ELASTIC_PRICING_OPTIONS.retentionMonths
): SchemalessBlockQuote[] {
  return SCHEMALESS_BLOCK_TIERS_TB.map((tierTb) => quoteSchemalessBlock(tierTb, retentionMonths));
}

export function formatBlockCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

/** Precise currency for formula worksheets (keeps cents). */
export function formatBlockCurrencyExact(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatGb(value: number): string {
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (value >= 10) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
