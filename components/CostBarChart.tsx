"use client";

import { Platform } from "@/lib/costCalculator";
import { useMemo } from "react";

interface CostBarChartProps {
  platforms: Platform[];
  costs: Record<string, number>;
}

const colorMap: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-slate-500": "#64748b",
  "bg-purple-500": "#a855f7",
  "bg-green-500": "#22c55e",
  "bg-orange-500": "#f97316",
  "bg-cyan-500": "#06b6d4",
  "bg-red-500": "#ef4444",
  "bg-indigo-500": "#6366f1",
  "bg-pink-500": "#ec4899",
  "bg-emerald-500": "#10b981",
  "bg-amber-500": "#f59e0b",
  "bg-teal-500": "#14b8a6",
  "bg-sky-600": "#0284c7",
  "bg-yellow-600": "#ca8a04",
  "bg-orange-600": "#ea580c",
  "bg-orange-700": "#c2410c",
  "bg-indigo-600": "#4f46e5",
  "bg-slate-600": "#475569",
  "bg-blue-600": "#2563eb",
  "bg-green-600": "#16a34a",
  "bg-green-700": "#15803d",
  "bg-blue-700": "#1d4ed8",
};

/** Use log scale when the cheapest and most expensive differ by more than this factor. */
const LOG_SCALE_RATIO_THRESHOLD = 20;

function barWidthPercent(
  cost: number,
  minCost: number,
  maxCost: number,
  useLogScale: boolean
): number {
  if (cost <= 0 || maxCost <= 0) return 0;
  if (maxCost === minCost) return 100;

  if (useLogScale) {
    const logMin = Math.log10(Math.max(minCost, 1));
    const logMax = Math.log10(maxCost);
    const logCost = Math.log10(Math.max(cost, 1));
    if (logMax <= logMin) return 100;
    const pct = ((logCost - logMin) / (logMax - logMin)) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  return Math.min(100, (cost / maxCost) * 100);
}

export default function CostBarChart({ platforms, costs }: CostBarChartProps) {
  const sortedPlatforms = [...platforms].sort(
    (a, b) => (costs[a.id] || 0) - (costs[b.id] || 0)
  );

  const { minCost, maxCost, useLogScale } = useMemo(() => {
    const values = sortedPlatforms.map((p) => costs[p.id] || 0).filter((v) => v > 0);
    if (values.length === 0) {
      return { minCost: 0, maxCost: 1, useLogScale: false };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const ratio = max / Math.max(min, 1);
    return {
      minCost: min,
      maxCost: max,
      useLogScale: ratio >= LOG_SCALE_RATIO_THRESHOLD,
    };
  }, [sortedPlatforms, costs]);

  const formatCurrency = (value: number) => {
    if (value < 1 && value > 0) return `$${value.toFixed(2)}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  if (sortedPlatforms.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No platforms to display
      </div>
    );
  }

  const getColor = (colorClass: string) => colorMap[colorClass] || "#3b82f6";

  return (
    <div className="space-y-5">
      {useLogScale && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center pb-1 border-b border-gray-100 dark:border-gray-700">
          Bar lengths use a <strong>log scale</strong> because costs span more than{" "}
          {LOG_SCALE_RATIO_THRESHOLD}× ({formatCompact(minCost)} → {formatCompact(maxCost)}). Dollar
          labels stay linear.
        </p>
      )}

      {sortedPlatforms.map((platform) => {
        const cost = costs[platform.id] || 0;
        const widthPct = barWidthPercent(cost, minCost, maxCost, useLogScale);
        const linearPct = maxCost > 0 && cost > 0 ? (cost / maxCost) * 100 : 0;
        const barColor = getColor(platform.color);
        const vsMax =
          cost > 0 && maxCost > 0 ? `${(cost / maxCost).toFixed(cost / maxCost >= 0.1 ? 1 : 2)}× max` : "";

        return (
          <div key={platform.id} className="group">
            <div className="flex items-center justify-between mb-2 gap-4">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0 transition-transform group-hover:scale-125 shadow-sm"
                  style={{ backgroundColor: barColor }}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {platform.name}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {formatCurrency(cost)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {formatCurrency(cost * 12)}/yr
                  {vsMax && linearPct < 99.5 && (
                    <span className="ml-1 text-gray-400">· {vsMax}</span>
                  )}
                </span>
              </div>
            </div>
            <div
              className="relative rounded-lg overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-700/80"
              style={{ height: "36px" }}
              title={
                cost > 0
                  ? `${formatCurrency(cost)}/mo (${linearPct.toFixed(linearPct >= 1 ? 1 : 2)}% of highest)`
                  : undefined
              }
            >
              {cost > 0 ? (
                <div
                  className="h-full rounded-lg transition-[width] duration-700 ease-out flex items-center justify-end pr-2 min-w-[2px]"
                  style={{
                    width: `${Math.max(widthPct, cost > 0 ? 0.35 : 0)}%`,
                    backgroundColor: barColor,
                  }}
                >
                  {widthPct >= 18 && (
                    <span className="text-[10px] font-semibold text-white/90 drop-shadow-sm tabular-nums">
                      {linearPct >= 10 ? `${Math.round(linearPct)}%` : formatCompact(cost)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500">$0</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
