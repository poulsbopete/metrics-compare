"use client";

import { useState, useMemo, useEffect } from "react";
import MetricSlider from "@/components/MetricSlider";
import TagManager from "@/components/TagManager";
import CostComparison from "@/components/CostComparison";
import AnimatedNumber from "@/components/AnimatedNumber";
import {
  platforms,
  calculateMetricVolume,
  metricsPerSecondToMonthly,
  calculatePlatformCost,
  type MetricConfig,
} from "@/lib/costCalculator";

const STORAGE_KEY = "metrics-compare-state";

interface SavedState {
  baseVolume: number;
  tags: string[];
  tagValues: number;
}

function loadState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        baseVolume: parsed.baseVolume ?? 100,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        tagValues: parsed.tagValues ?? 10,
      };
    }
  } catch (error) {
    console.error("Failed to load state from localStorage:", error);
  }
  return null;
}

function saveState(state: SavedState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state to localStorage:", error);
  }
}

export default function Home() {
  // Initialize with default values to match server render
  const [baseVolume, setBaseVolume] = useState(100);
  const [tags, setTags] = useState<string[]>([]);
  const [tagValues, setTagValues] = useState(10);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const savedState = loadState();
    if (savedState) {
      setBaseVolume(savedState.baseVolume);
      setTags(savedState.tags);
      setTagValues(savedState.tagValues);
    }
  }, []);

  // Save state whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveState({
        baseVolume,
        tags,
        tagValues,
      });
    }
  }, [baseVolume, tags, tagValues, isHydrated]);

  const metricConfig: MetricConfig = useMemo(
    () => ({
      baseVolume,
      tags,
      tagValues,
    }),
    [baseVolume, tags, tagValues]
  );

  const metricsPerSecond = useMemo(
    () => calculateMetricVolume(metricConfig),
    [metricConfig]
  );

  const monthlyMetrics = useMemo(
    () => metricsPerSecondToMonthly(metricsPerSecond),
    [metricsPerSecond]
  );

  const costs = useMemo(() => {
    const result: Record<string, number> = {};
    try {
      platforms.forEach((platform) => {
        result[platform.id] = calculatePlatformCost(platform, monthlyMetrics);
      });
    } catch (error) {
      console.error("Error calculating costs:", error);
    }
    return result;
  }, [monthlyMetrics]);

  const formatMetricsPerSecond = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M/sec`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K/sec`;
    }
    return `${value.toFixed(0)}/sec`;
  };

  const formatMonthlyMetrics = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
    return value.toFixed(0);
  };

  const multiplier = tags.length > 0 ? Math.pow(tagValues, tags.length) : 1;

  if (!platforms || platforms.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Loading...
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Initializing platforms data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 mb-4">
            Metrics Cost Comparison
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Compare costs across observability platforms and see how tag cardinality impacts your bill
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-slide-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3" />
              Configuration
            </h2>
            <div className="space-y-6">
              <MetricSlider
                label="Base Metrics per Second"
                value={baseVolume}
                onChange={setBaseVolume}
                min={1}
                max={10000}
                step={1}
                formatValue={(v) => `${v.toLocaleString()}/sec`}
              />

              <TagManager
                tags={tags}
                onTagsChange={setTags}
                tagValues={tagValues}
                onTagValuesChange={setTagValues}
              />
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-3" />
              Metric Volume Impact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                  Base Volume
                </div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  <AnimatedNumber
                    value={baseVolume}
                    format={(v) => `${v.toLocaleString()}/sec`}
                  />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-5 border border-purple-200 dark:border-purple-700/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-semibold mb-2 uppercase tracking-wide">
                  With Tags
                </div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  <AnimatedNumber
                    value={metricsPerSecond}
                    format={formatMetricsPerSecond}
                  />
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">
                  {tags.length > 0
                    ? `${tags.length} tag(s) × ${tagValues} values = ${multiplier.toLocaleString()}x`
                    : "No tags added"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                  Monthly Volume
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  <AnimatedNumber
                    value={monthlyMetrics}
                    format={formatMonthlyMetrics}
                  />
                  <span className="text-lg ml-1">
                    {monthlyMetrics >= 1_000_000_000
                      ? "B"
                      : monthlyMetrics >= 1_000_000
                      ? "M"
                      : "K"}
                  </span>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                  metrics/month
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="mt-6 p-5 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700/50 shadow-lg animate-pulse-slow">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-yellow-400 dark:bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                      <svg
                        className="h-6 w-6 text-yellow-900"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-base font-bold text-yellow-900 dark:text-yellow-200 mb-2">
                      ⚠️ Cardinality Explosion Detected
                    </h3>
                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                      <p className="mb-2">
                        Adding tags has dramatically increased your metric volume due to cardinality multiplication.
                      </p>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 mt-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-semibold">Base:</span>{" "}
                            {baseVolume.toLocaleString()}/sec
                          </div>
                          <div>
                            <span className="font-semibold">Multiplier:</span>{" "}
                            {multiplier.toLocaleString()}x
                          </div>
                          <div className="col-span-2">
                            <span className="font-semibold">Result:</span>{" "}
                            {formatMetricsPerSecond(metricsPerSecond)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cost Comparison */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full mr-3" />
            Cost Comparison
          </h2>
          <CostComparison
            platforms={platforms}
            costs={costs}
            monthlyMetrics={monthlyMetrics}
          />
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 Pricing is approximate and based on publicly available information as of 2025. Elastic Serverless pricing based on <a href="https://www.elastic.co/pricing/serverless-observability" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">official pricing page</a> ($0.09/GB ingest + $0.019/GB retention, converted to metrics). Actual costs may vary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
