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

import { calculateEchHotFrozenVolumeCost } from "./elasticEchHotFrozenPricing";
import { calculateServerlessStreamsS3VolumeCost } from "./elasticServerlessStreamsS3Pricing";
import {
  calculateObservabilityCompleteFloorCost,
  DEFAULT_ELASTIC_PRICING_OPTIONS,
  ELASTIC_DAYS_PER_MONTH,
} from "./elasticServerlessPricing";

export const GB_PER_TIB = 1024;

/** Committed monthly ingest blocks for reference quotes (tebibytes on the wire). */
export const SCHEMALESS_BLOCK_TIERS_TB = [1, 50, 100, 500] as const;

export type SchemalessBlockTierTb = (typeof SCHEMALESS_BLOCK_TIERS_TB)[number];

export interface SchemalessBlockQuote {
  tierTb: number;
  monthlyIngestGb: number;
  dailyIngestGb: number;
  ech: {
    monthly: number;
    annual: number;
    perTbMonth: number;
  };
  /** Primary Serverless — Streams → S3 using Complete published floors + S3-class aged. */
  serverless: {
    monthly: number;
    annual: number;
    perTbMonth: number;
    withStreamsS3: true;
    ingestCost: number;
    retentionCost: number;
  };
  /**
   * Contrast: Observability Complete ingest + retention at published floors (no S3 export).
   * Uses logs/traces Complete floors for schemaless mixed OTLP.
   */
  serverlessCompleteRetention: {
    monthly: number;
    annual: number;
    perTbMonth: number;
  };
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

  const echMonthly = calculateEchHotFrozenVolumeCost(monthlyIngestGb).volumeCost;
  const streamsS3 = calculateServerlessStreamsS3VolumeCost(monthlyIngestGb);
  const completeFloor = calculateObservabilityCompleteFloorCost(
    monthlyIngestGb,
    retentionMonths,
    "logs_traces"
  );

  return {
    tierTb,
    monthlyIngestGb,
    dailyIngestGb,
    ech: {
      monthly: echMonthly,
      annual: echMonthly * 12,
      perTbMonth: perTb(echMonthly, tierTb),
    },
    serverless: {
      monthly: streamsS3.volumeCost,
      annual: streamsS3.volumeCost * 12,
      perTbMonth: perTb(streamsS3.volumeCost, tierTb),
      withStreamsS3: true,
      ingestCost: streamsS3.ingestCost,
      retentionCost: streamsS3.retentionCost,
    },
    serverlessCompleteRetention: {
      monthly: completeFloor.volumeCost,
      annual: completeFloor.volumeCost * 12,
      perTbMonth: perTb(completeFloor.volumeCost, tierTb),
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
