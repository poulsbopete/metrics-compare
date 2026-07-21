/**
 * Schemaless “data block” quotes — same $/month per ingested TB whether the bytes are logs, metrics, or traces.
 * ECH uses 1d hot + ILM blob; Serverless uses Observability Complete tiers with Streams defaults.
 */

import { calculateEchHotFrozenVolumeCost } from "./elasticEchHotFrozenPricing";
import {
  DEFAULT_ELASTIC_PRICING_OPTIONS,
  ELASTIC_DAYS_PER_MONTH,
} from "./elasticServerlessPricing";
import {
  calculateElasticVolumeCostWithStreams,
  DEFAULT_ELASTIC_STREAMS_TCO,
} from "./elasticStreamsTco";

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
  serverless: {
    monthly: number;
    annual: number;
    perTbMonth: number;
    withStreams: true;
  };
  /** Serverless Complete without Streams — workbook-style comparison */
  serverlessUnshaped: {
    monthly: number;
    annual: number;
    perTbMonth: number;
  };
}

function monthlyGbFromTierTb(tierTb: number): number {
  return tierTb * GB_PER_TIB;
}

/**
 * Unified observability ingest GB/month — signal-agnostic (schemaless wire volume).
 */
export function quoteSchemalessBlock(
  tierTb: number,
  retentionMonths: number = DEFAULT_ELASTIC_PRICING_OPTIONS.retentionMonths
): SchemalessBlockQuote {
  const monthlyIngestGb = monthlyGbFromTierTb(tierTb);
  const dailyIngestGb = monthlyIngestGb / ELASTIC_DAYS_PER_MONTH;

  const echBreakdown = calculateEchHotFrozenVolumeCost(monthlyIngestGb);
  const echMonthly = echBreakdown.volumeCost;

  const elasticOpts = {
    ...DEFAULT_ELASTIC_PRICING_OPTIONS,
    retentionMonths,
    productTier: "observability-complete" as const,
  };

  const serverlessShaped = calculateElasticVolumeCostWithStreams(
    monthlyIngestGb,
    elasticOpts,
    DEFAULT_ELASTIC_STREAMS_TCO,
    "metrics",
    { platformKind: "serverless", productTier: "observability-complete" }
  );

  const serverlessRaw = calculateElasticVolumeCostWithStreams(
    monthlyIngestGb,
    elasticOpts,
    { ...DEFAULT_ELASTIC_STREAMS_TCO, enabled: false },
    "metrics",
    { platformKind: "serverless", productTier: "observability-complete" }
  );

  return {
    tierTb,
    monthlyIngestGb,
    dailyIngestGb,
    ech: {
      monthly: echMonthly,
      annual: echMonthly * 12,
      perTbMonth: tierTb > 0 ? echMonthly / tierTb : 0,
    },
    serverless: {
      monthly: serverlessShaped.volumeCost,
      annual: serverlessShaped.volumeCost * 12,
      perTbMonth: tierTb > 0 ? serverlessShaped.volumeCost / tierTb : 0,
      withStreams: true,
    },
    serverlessUnshaped: {
      monthly: serverlessRaw.volumeCost,
      annual: serverlessRaw.volumeCost * 12,
      perTbMonth: tierTb > 0 ? serverlessRaw.volumeCost / tierTb : 0,
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
