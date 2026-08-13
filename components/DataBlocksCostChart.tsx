"use client";

import { useMemo } from "react";
import {
  formatBlockCurrency,
  type SchemalessBlockQuote,
  type SchemalessBlockTierTb,
} from "@/lib/elasticSchemalessBlocks";

const ECH_COLOR = "#2563eb";
const SERVERLESS_COLOR = "#4f46e5";
const INGEST_COLOR = "#6366f1";
const HOT_COLOR = "#818cf8";
const S3_COLOR = "#a5b4fc";
const ECH_HOT_COLOR = "#3b82f6";
const ECH_BLOB_COLOR = "#93c5fd";
const ECH_XFER_COLOR = "#bfdbfe";

/** Use log scale when ECH and Serverless differ by more than this factor at any tier. */
const LOG_SCALE_RATIO_THRESHOLD = 8;

interface DataBlocksCostChartProps {
  quotes: SchemalessBlockQuote[];
  selectedTierTb: SchemalessBlockTierTb;
  onSelectTier?: (tierTb: SchemalessBlockTierTb) => void;
}

function barHeightPct(value: number, maxLinear: number, useLog: boolean, minPositive: number): number {
  if (value <= 0 || maxLinear <= 0) return 0;
  if (!useLog) return Math.min(100, (value / maxLinear) * 100);
  const logMin = Math.log10(Math.max(minPositive, 1));
  const logMax = Math.log10(maxLinear);
  const logVal = Math.log10(Math.max(value, 1));
  if (logMax <= logMin) return 100;
  return Math.min(100, Math.max(4, ((logVal - logMin) / (logMax - logMin)) * 100));
}

export default function DataBlocksCostChart({
  quotes,
  selectedTierTb,
  onSelectTier,
}: DataBlocksCostChartProps) {
  const selected = quotes.find((q) => q.tierTb === selectedTierTb) ?? quotes[0];

  const { maxMonthly, minPositive, useLogScale } = useMemo(() => {
    const values = quotes.flatMap((q) => [q.ech.monthly, q.serverless.monthly]).filter((v) => v > 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, max);
    return {
      maxMonthly: max,
      minPositive: min,
      useLogScale: max / Math.max(min, 1) >= LOG_SCALE_RATIO_THRESHOLD,
    };
  }, [quotes]);

  if (!selected || quotes.length === 0) return null;

  const serverlessStack = [
    { key: "ingest", label: "Ingest", value: selected.serverless.ingestCost, color: INGEST_COLOR },
    { key: "hot", label: "Hot window", value: selected.serverless.hotRetentionCost, color: HOT_COLOR },
    { key: "s3", label: "S3 aged", value: selected.serverless.s3StorageCost, color: S3_COLOR },
  ];
  const echStack = [
    { key: "hot", label: "Hot RAM", value: selected.ech.hotCapacityCost, color: ECH_HOT_COLOR },
    { key: "blob", label: "Blob / snapshot", value: selected.ech.blobStorageCost, color: ECH_BLOB_COLOR },
    { key: "xfer", label: "Transfer", value: selected.ech.dataTransferCost, color: ECH_XFER_COLOR },
  ];
  const stackMax = Math.max(selected.ech.monthly, selected.serverless.monthly, 1);

  return (
    <div className="space-y-8 mb-6">
      {/* Grouped bars by committed block */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Monthly cost by committed ingest block
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Elastic Cloud Hosted vs Serverless Streams → S3 at the same wire volume
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ECH_COLOR }} />
              Cloud Hosted
            </span>
            <span className="inline-flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SERVERLESS_COLOR }} />
              Streams → S3
            </span>
          </div>
        </div>

        {useLogScale && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
            Bar heights use a <strong>log scale</strong> so both series stay visible (costs span more than{" "}
            {LOG_SCALE_RATIO_THRESHOLD}×). Dollar labels stay linear.
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {quotes.map((row) => {
            const isSelected = row.tierTb === selectedTierTb;
            const echH = barHeightPct(row.ech.monthly, maxMonthly, useLogScale, minPositive);
            const svlsH = barHeightPct(row.serverless.monthly, maxMonthly, useLogScale, minPositive);
            return (
              <button
                key={row.tierTb}
                type="button"
                onClick={() => onSelectTier?.(row.tierTb as SchemalessBlockTierTb)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-300/60 dark:ring-emerald-700/50"
                    : "border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {row.tierTb} TiB/mo
                </p>
                <div className="flex items-end justify-center gap-2 h-36 mb-2">
                  <div className="flex flex-col items-center justify-end h-full w-10 sm:w-12">
                    <span className="text-[10px] font-semibold tabular-nums text-blue-700 dark:text-blue-300 mb-1">
                      {formatBlockCurrency(row.ech.monthly)}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-[height] duration-500 ease-out min-h-[2px]"
                      style={{ height: `${echH}%`, backgroundColor: ECH_COLOR }}
                      title={`Cloud Hosted ${formatBlockCurrency(row.ech.monthly)}/mo`}
                    />
                  </div>
                  <div className="flex flex-col items-center justify-end h-full w-10 sm:w-12">
                    <span className="text-[10px] font-semibold tabular-nums text-indigo-700 dark:text-indigo-300 mb-1">
                      {formatBlockCurrency(row.serverless.monthly)}
                    </span>
                    <div
                      className="w-full rounded-t-md transition-[height] duration-500 ease-out min-h-[2px]"
                      style={{ height: `${svlsH}%`, backgroundColor: SERVERLESS_COLOR }}
                      title={`Streams→S3 ${formatBlockCurrency(row.serverless.monthly)}/mo`}
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-2 text-[9px] text-gray-400 uppercase tracking-wide">
                  <span>ECH</span>
                  <span>SVLS</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stacked breakdown for selected block */}
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
          Cost mix at {selected.tierTb} TiB/mo
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Where the monthly dollars come from for the selected block
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <StackBar
            title="Elastic Cloud Hosted"
            total={selected.ech.monthly}
            max={stackMax}
            segments={echStack}
          />
          <StackBar
            title="Serverless Streams → S3"
            total={selected.serverless.monthly}
            max={stackMax}
            segments={serverlessStack}
          />
        </div>
      </div>
    </div>
  );
}

function StackBar({
  title,
  total,
  max,
  segments,
}: {
  title: string;
  total: number;
  max: number;
  segments: { key: string; label: string; value: number; color: string }[];
}) {
  const widthPct = max > 0 ? Math.min(100, (total / max) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/50 p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{title}</p>
        <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
          {formatBlockCurrency(total)}
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">/mo</span>
        </p>
      </div>

      <div className="h-8 rounded-lg overflow-hidden flex bg-gray-100 dark:bg-gray-800 mb-3">
        <div
          className="h-full flex transition-[width] duration-500 ease-out min-w-0"
          style={{ width: `${Math.max(widthPct, total > 0 ? 2 : 0)}%` }}
        >
          {segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const segPct = total > 0 ? (s.value / total) * 100 : 0;
              return (
                <div
                  key={s.key}
                  className="h-full"
                  style={{ width: `${segPct}%`, backgroundColor: s.color }}
                  title={`${s.label}: ${formatBlockCurrency(s.value)}`}
                />
              );
            })}
        </div>
      </div>

      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="tabular-nums font-medium text-gray-900 dark:text-white">
              {formatBlockCurrency(s.value)}
              {total > 0 && (
                <span className="text-gray-400 font-normal ml-1">
                  ({Math.round((s.value / total) * 100)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
