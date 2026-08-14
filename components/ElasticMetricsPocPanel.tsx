"use client";

import { useMemo } from "react";
import {
  calculateElasticMetricsPoc,
  ELASTIC_SUPPORT_TIERS,
  type ElasticSupportTierId,
} from "@/lib/elasticMetricsPoc";
import {
  ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB,
  ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB,
} from "@/lib/elasticServerlessPricing";

interface ElasticMetricsPocPanelProps {
  samplesPerSecond: number;
  onSamplesPerSecondChange: (v: number) => void;
  bytesPerSample: number;
  onBytesPerSampleChange: (v: number) => void;
  retentionMonths: number;
  onRetentionMonthsChange: (v: number) => void;
  tsdbStoredCompressionFactor: number;
  onTsdbStoredCompressionFactorChange: (v: number) => void;
  supportTier: ElasticSupportTierId;
  onSupportTierChange: (v: ElasticSupportTierId) => void;
}

function fmtUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(value < 10 ? 2 : 0)}`;
}

function fmtNum(value: number): string {
  return Math.round(value).toLocaleString();
}

export default function ElasticMetricsPocPanel({
  samplesPerSecond,
  onSamplesPerSecondChange,
  bytesPerSample,
  onBytesPerSampleChange,
  retentionMonths,
  onRetentionMonthsChange,
  tsdbStoredCompressionFactor,
  onTsdbStoredCompressionFactorChange,
  supportTier,
  onSupportTierChange,
}: ElasticMetricsPocPanelProps) {
  const breakdown = useMemo(
    () =>
      calculateElasticMetricsPoc({
        samplesPerSecond,
        bytesPerSample,
        retentionMonths,
        tsdbStoredCompressionFactor,
        supportTier,
      }),
    [samplesPerSecond, bytesPerSample, retentionMonths, tsdbStoredCompressionFactor, supportTier]
  );

  const supportLabel = ELASTIC_SUPPORT_TIERS.find((t) => t.id === supportTier)?.label ?? supportTier;

  return (
    <section className="mb-6 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Elastic Serverless · metrics-only POC (TSDS)
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
        Sample/sec worksheet for TSDS list floors (
        {ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB}/GB ingest,{" "}
        {ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB}/GB-month retention). Use the bar chart below for
        side-by-side vendor totals.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            Samples/sec (post-dedup):{" "}
            <span className="text-violet-600 dark:text-violet-400">{fmtNum(samplesPerSecond)}/sec</span>
          </label>
          <input
            type="range"
            min={1_000}
            max={2_000_000}
            step={1_000}
            value={samplesPerSecond}
            onChange={(e) => onSamplesPerSecondChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            TSDB bytes/sample:{" "}
            <span className="text-violet-600 dark:text-violet-400">{bytesPerSample.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.1}
            value={bytesPerSample}
            onChange={(e) => onBytesPerSampleChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            Retention:{" "}
            <span className="text-violet-600 dark:text-violet-400">{retentionMonths} mo</span>
          </label>
          <input
            type="range"
            min={1}
            max={24}
            step={1}
            value={retentionMonths}
            onChange={(e) => onRetentionMonthsChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            Stored-volume factor:{" "}
            <span className="text-violet-600 dark:text-violet-400">{tsdbStoredCompressionFactor.toFixed(2)}×</span>
          </label>
          <input
            type="range"
            min={1}
            max={8}
            step={0.1}
            value={tsdbStoredCompressionFactor}
            onChange={(e) => onTsdbStoredCompressionFactorChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-violet-600"
          />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
            Stored GB/mo ≈ ingest × retention ÷ factor (TSDS compression + rollups).
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Elastic Cloud support
        </label>
        <div className="flex flex-wrap gap-2">
          {ELASTIC_SUPPORT_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSupportTierChange(tier.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                supportTier === tier.id
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-white/80 dark:bg-gray-900/60 border border-violet-100 dark:border-violet-900/40 p-4 font-mono text-xs text-gray-800 dark:text-gray-200 space-y-1.5">
        <div>
          Wire volume: {fmtNum(samplesPerSecond)}/sec → {fmtNum(breakdown.samplesPerDay)} samples/day
        </div>
        <div>
          Monthly ingest: {fmtNum(breakdown.monthlyIngestGbDecimal)} GB @ $
          {ELASTIC_TSDS_METRICS_PUBLISHED_INGEST_FLOOR_PER_GB}/GB = {fmtUsd(breakdown.ingestCost)}/mo
        </div>
        <div>
          Retention ({retentionMonths} mo): {fmtNum(breakdown.storedGbMonth)} GB stored/mo @ $
          {ELASTIC_TSDS_METRICS_PUBLISHED_RETENTION_FLOOR_PER_GB}/GB = {fmtUsd(breakdown.retentionCost)}/mo
        </div>
        <div className="pt-1 border-t border-violet-100 dark:border-violet-900/40">
          Subtotal: {fmtUsd(breakdown.subtotal)}/mo · Support ({supportLabel}): {fmtUsd(breakdown.supportCost)}/mo
        </div>
        <div className="text-sm font-bold text-violet-700 dark:text-violet-300 pt-1">
          Total: {fmtUsd(breakdown.totalMonthly)}/mo ≈ {fmtUsd(breakdown.totalAnnual)}/yr (metrics only)
        </div>
      </div>
    </section>
  );
}
