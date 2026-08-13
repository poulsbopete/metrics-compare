/**
 * Serverless Streams → S3 long-retention architecture (roadmap / target TCO).
 *
 * Parallel to ECH 1d hot + ILM → blob: Streams data plane (source → processors → S3 exporter)
 * ages observability bytes to object storage with workload-identity short-lived JWTs (no static keys).
 *
 * Commercial intent: ECH or Serverless at comparable TCO when aged data lives on S3-class storage
 * instead of Observability Complete retention GB-months. Backbone rates reuse ECH hot + snapshot
 * list economics until Serverless Streams→S3 list rates publish.
 */

import {
  calculateEchHotFrozenVolumeCost,
  ECH_CLOUD_HOSTED_LIST_RATES,
  ECH_HOT_FROZEN_ARCHITECTURE,
  type EchHotFrozenOptions,
} from "./elasticEchHotFrozenPricing";
import type { ElasticServerlessCostBreakdown } from "./elasticServerlessPricing";

export const SERVERLESS_STREAMS_S3_ARCHITECTURE = {
  hotDays: ECH_HOT_FROZEN_ARCHITECTURE.hotDays,
  s3Days: ECH_HOT_FROZEN_ARCHITECTURE.ilmBlobDays,
  summary: "1-day hot · Streams → S3",
  status: "roadmap" as const,
  /** Streams data-plane path shown in Serverless S3 exporter architecture. */
  dataPlane: ["Source", "Processors", "S3 exporter"] as const,
  identity: "Workload Identity Issuer · short-lived JWT (via ECP proxy)",
} as const;

/**
 * Illustrative Serverless Streams→S3 backbone — same hot + object-storage economics as ECH
 * writable-frozen so Data Blocks can show comparable TCO (not Complete retention GB-months).
 */
export function calculateServerlessStreamsS3VolumeCost(
  monthlyIngestGB: number,
  options: EchHotFrozenOptions = {}
): ElasticServerlessCostBreakdown {
  const hotDays = options.hotDays ?? SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays;
  const s3Days = options.ilmBlobDays ?? SERVERLESS_STREAMS_S3_ARCHITECTURE.s3Days;
  const breakdown = calculateEchHotFrozenVolumeCost(monthlyIngestGB, {
    hotDays,
    ilmBlobDays: s3Days,
  });

  return {
    ...breakdown,
    ingestRateLabel: `${hotDays}d hot (queryable) + Streams data plane`,
    retentionRateLabel: `${s3Days}d S3 via Streams exporter @ $${ECH_CLOUD_HOSTED_LIST_RATES.snapshotStorageGbMonthUsd}/GB-mo`,
  };
}
