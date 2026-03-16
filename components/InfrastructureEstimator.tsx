"use client";

import { useState } from "react";
import { integrations, INTEGRATION_CATEGORIES } from "@/lib/infrastructureData";

interface InfrastructureEstimatorProps {
  items: Record<string, number>;
  onItemsChange: (items: Record<string, number>) => void;
}

export default function InfrastructureEstimator({
  items,
  onItemsChange,
}: InfrastructureEstimatorProps) {
  const [activeCategory, setActiveCategory] =
    useState<string>("Hosts");

  const setCount = (id: string, count: number) => {
    const next = { ...items };
    if (count <= 0) {
      delete next[id];
    } else {
      next[id] = count;
    }
    onItemsChange(next);
  };

  const categoryIntegrations = integrations.filter(
    (i) => i.category === activeCategory
  );

  const selectedItems = integrations.filter((i) => (items[i.id] ?? 0) > 0);
  const totalGbPerDay = selectedItems.reduce(
    (sum, i) => sum + i.gbPerDayPerUnit * (items[i.id] ?? 0),
    0
  );

  const formatGb = (gb: number) =>
    gb >= 1 ? `${gb.toFixed(1)} GB/day` : `${(gb * 1000).toFixed(0)} MB/day`;

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Add Infrastructure
        </label>
        <div className="flex flex-wrap gap-1 mb-3">
          {INTEGRATION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Integration rows for active category */}
        <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
          {categoryIntegrations.map((integration) => {
            const count = items[integration.id] ?? 0;
            return (
              <div
                key={integration.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/40"
              >
                <span className="text-lg shrink-0">{integration.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">
                    {integration.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    ~{integration.gbPerDayPerUnit} GB/day {integration.referenceLabel}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setCount(integration.id, count - 1)}
                    disabled={count === 0}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-30 font-bold text-sm leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={count === 0 ? "" : count}
                    placeholder="0"
                    onChange={(e) =>
                      setCount(
                        integration.id,
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    className="w-12 text-center text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setCount(integration.id, count + 1)}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60 font-bold text-sm leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected items summary */}
      {selectedItems.length > 0 ? (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Your Infrastructure
            </label>
            <button
              onClick={() => onItemsChange({})}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
            >
              Clear all
            </button>
          </div>
          {selectedItems.map((i) => (
            <div
              key={i.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {i.emoji}{" "}
                <span className="font-semibold">{items[i.id]}×</span>{" "}
                {i.name}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">
                ~{formatGb(i.gbPerDayPerUnit * items[i.id])}
              </span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Total estimated ingest
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              ~{formatGb(totalGbPerDay)}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700/50">
          Add infrastructure above to estimate your metrics volume
        </div>
      )}
    </div>
  );
}
