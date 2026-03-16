"use client";

import { Platform } from "@/lib/costCalculator";
import { ObservabilityPlatform } from "@/lib/observabilityPricing";
import { getOperationalFTE, getFTELabel } from "@/lib/operationalCosts";
import { useState } from "react";
import CostBarChart from "./CostBarChart";
import PlatformRow from "./PlatformRow";

type ObservabilityType = "metrics" | "tracing" | "logs" | "security" | "fullstack";

interface ObservabilityComparisonProps {
  type: ObservabilityType;
  platforms: Platform[] | ObservabilityPlatform[];
  costs: Record<string, number>;
  operationalCosts?: Record<string, number>;
  engineerHourlyRate?: number;
  volume: number; // metrics, spans, or GB
  volumeLabel: string; // "Monthly Metrics", "Monthly Spans", "Monthly GB"
  calculationContext?: {
    // Metrics
    monthlyMetrics?: number;
    metricsPerSecond?: number;
    primaryMetricType?: string;
    bytesPerDatapoint?: number;
    // Tracing
    spansPerSecond?: number;
    monthlySpans?: number;
    monthlyTraces?: number;
    // Security
    eventsPerSecond?: number;
    monthlyEvents?: number;
    // Shared
    monthlyGB?: number;
  };
}

export default function ObservabilityComparison({
  type,
  platforms,
  costs,
  operationalCosts = {},
  engineerHourlyRate,
  volume,
  volumeLabel,
  calculationContext,
}: ObservabilityComparisonProps) {
  const [viewMode, setViewMode] = useState<"table" | "chart">("chart");

  // TCO = infrastructure cost + operational cost
  const tcoCosts = Object.fromEntries(
    platforms.map((p) => [p.id, (costs[p.id] || 0) + (operationalCosts[p.id] || 0)])
  );

  const sortedPlatforms = [...platforms].sort(
    (a, b) => (tcoCosts[a.id] || 0) - (tcoCosts[b.id] || 0)
  );

  // Find Datadog TCO for this tab to compute savings %
  const DATADOG_IDS: Partial<Record<ObservabilityType, string>> = {
    metrics: "datadog",
    tracing: "datadog-tracing",
    logs: "datadog-logs",
    security: "datadog-security",
  };
  const datadogId = DATADOG_IDS[type];
  const datadogCost = datadogId ? (tcoCosts[datadogId] ?? 0) : 0;

  const hasOperationalCosts = Object.keys(operationalCosts).length > 0;

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
          <CostBarChart platforms={chartPlatforms as Platform[]} costs={tcoCosts} />
          {hasOperationalCosts && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
              Costs include estimated operational overhead ({engineerHourlyRate ? `$${engineerHourlyRate}/hr` : ""} fully-loaded engineer rate). Toggle in Configuration panel.
            </p>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="space-y-3 animate-fade-in-up">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-1.5">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> Click on any platform row to view details and TCO breakdown.
            </p>
            {hasOperationalCosts && (
              <p className="text-sm text-blue-800 dark:text-blue-200">
                🧑‍💻 <strong>Operational costs included</strong> at <strong>{engineerHourlyRate ? `$${engineerHourlyRate}/hr` : ""}</strong> fully-loaded rate. Self-hosted solutions require significantly more engineering time. Adjust in Configuration panel.
              </p>
            )}
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
                        Monthly TCO
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Annual TCO
                      </th>
                      {datadogCost > 0 && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          vs Datadog
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedPlatforms.map((platform, index) => {
                      const infraCost = costs[platform.id] || 0;
                      const opsCost = operationalCosts[platform.id] || 0;
                      const tco = infraCost + opsCost;
                      const savingsPct = datadogCost > 0 && platform.id !== datadogId
                        ? ((datadogCost - tco) / datadogCost) * 100
                        : null;
                      
                      return (
                        <PlatformRow
                          key={platform.id}
                          platform={platform as Platform | ObservabilityPlatform}
                          cost={tco}
                          infraCost={infraCost}
                          operationalCost={opsCost}
                          monthlyMetrics={volume}
                          formatCurrency={formatCurrency}
                          formatNumber={formatNumber}
                          index={index}
                          savingsVsDatadog={savingsPct}
                          showSavingsColumn={datadogCost > 0}
                          calculationContext={calculationContext ? {
                            ...calculationContext,
                            cost: tco,
                          } : undefined}
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

