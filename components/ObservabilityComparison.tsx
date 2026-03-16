"use client";

"use client";

import { Platform } from "@/lib/costCalculator";
import { ObservabilityPlatform } from "@/lib/observabilityPricing";
import { getOperationalFTE, getFTELabel } from "@/lib/operationalCosts";
import { useState, useMemo } from "react";
import CostBarChart from "./CostBarChart";
import PlatformRow from "./PlatformRow";

type ObservabilityType = "metrics" | "tracing" | "logs" | "security" | "fullstack";

// Default platforms shown per tab — Elastic Serverless + ECH + Datadog
const DEFAULT_PLATFORM_IDS: Partial<Record<ObservabilityType, Set<string>>> = {
  metrics:  new Set(["elastic-serverless", "elastic-ech", "datadog"]),
  tracing:  new Set(["elastic-tracing", "elastic-ech-tracing", "datadog-tracing"]),
  logs:     new Set(["elastic-logs", "elastic-ech-logs", "datadog-logs"]),
  security: new Set(["elastic-security", "elastic-security-ech", "datadog-security"]),
};

// Elastic-branded platform IDs — styled distinctively in the picker
const ELASTIC_ID_PREFIXES = ["elastic-", "elasticsearch-"];
function isElasticPlatform(id: string) {
  return ELASTIC_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

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

  // Platform picker state — default to Elastic + Datadog for this tab
  const defaultIds = DEFAULT_PLATFORM_IDS[type] ?? new Set(platforms.map((p) => p.id));
  const [activePlatformIds, setActivePlatformIds] = useState<Set<string>>(defaultIds);

  const togglePlatform = (id: string) => {
    setActivePlatformIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // always keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // TCO = infrastructure cost + operational cost
  const tcoCosts = useMemo(() => Object.fromEntries(
    platforms.map((p) => [p.id, (costs[p.id] || 0) + (operationalCosts[p.id] || 0)])
  ), [platforms, costs, operationalCosts]);

  const sortedPlatforms = useMemo(() =>
    [...platforms]
      .filter((p) => activePlatformIds.has(p.id))
      .sort((a, b) => (tcoCosts[a.id] || 0) - (tcoCosts[b.id] || 0)),
    [platforms, activePlatformIds, tcoCosts]
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

  // Only show active platforms in the chart
  const chartPlatforms = sortedPlatforms.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));

  // Sort all platforms so Elastic comes first in the picker, then alphabetically
  const pickerPlatforms = useMemo(() =>
    [...platforms].sort((a, b) => {
      const aE = isElasticPlatform(a.id) ? 0 : 1;
      const bE = isElasticPlatform(b.id) ? 0 : 1;
      return aE !== bE ? aE - bE : a.name.localeCompare(b.name);
    }),
    [platforms]
  );

  return (
    <div className="space-y-4">
      {/* Platform picker */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
          Compare platforms — Elastic &amp; Datadog shown by default
        </div>
        <div className="flex flex-wrap gap-2">
          {pickerPlatforms.map((p) => {
            const isActive = activePlatformIds.has(p.id);
            const isElastic = isElasticPlatform(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? isElastic
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.color}`} />
                {p.name}
                {isActive && <span className="opacity-60">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

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
          <CostBarChart
            platforms={chartPlatforms as Platform[]}
            costs={Object.fromEntries(sortedPlatforms.map((p) => [p.id, tcoCosts[p.id] || 0]))}
          />
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

