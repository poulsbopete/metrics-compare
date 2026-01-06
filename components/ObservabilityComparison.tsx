"use client";

import { Platform } from "@/lib/costCalculator";
import { ObservabilityPlatform } from "@/lib/observabilityPricing";
import { useState } from "react";
import CostBarChart from "./CostBarChart";
import PlatformRow from "./PlatformRow";

type ObservabilityType = "metrics" | "tracing" | "logs";

interface ObservabilityComparisonProps {
  type: ObservabilityType;
  platforms: Platform[] | ObservabilityPlatform[];
  costs: Record<string, number>;
  volume: number; // metrics, spans, or GB
  volumeLabel: string; // "Monthly Metrics", "Monthly Spans", "Monthly GB"
}

export default function ObservabilityComparison({
  type,
  platforms,
  costs,
  volume,
  volumeLabel,
}: ObservabilityComparisonProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("chart");
  const sortedPlatforms = [...platforms].sort(
    (a, b) => (costs[a.id] || 0) - (costs[b.id] || 0)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
    return value.toLocaleString();
  };

  // Convert platforms to a format compatible with CostBarChart
  const chartPlatforms = platforms.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={() => setViewMode("chart")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "chart"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              viewMode === "table"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === "chart" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in-up">
          <CostBarChart platforms={chartPlatforms as Platform[]} costs={costs} />
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="space-y-3 animate-fade-in-up">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Click on any platform row to view details and infrastructure cost breakdown (for self-hosted solutions).
            </p>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        {volumeLabel}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Monthly Cost
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Annual Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedPlatforms.map((platform, index) => {
                      const cost = costs[platform.id] || 0;
                      // Convert platform to Platform format for PlatformRow
                      const platformForRow = {
                        ...platform,
                        metricTypes: type === "metrics" ? (platform as Platform).metricTypes || [] : [],
                        pricing: type === "metrics" ? (platform as Platform).pricing : undefined,
                        cardinalityNote: type === "metrics" ? (platform as Platform).cardinalityNote : undefined,
                        infrastructure: platform.infrastructure,
                      } as Platform;
                      
                      return (
                        <PlatformRow
                          key={platform.id}
                          platform={platformForRow}
                          cost={cost}
                          monthlyMetrics={volume}
                          formatCurrency={formatCurrency}
                          formatNumber={formatNumber}
                          index={index}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

