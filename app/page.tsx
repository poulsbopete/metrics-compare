"use client";

import { useState, useMemo, useEffect } from "react";
import MetricSlider from "@/components/MetricSlider";
import TagManager from "@/components/TagManager";
import InfrastructureEstimator from "@/components/InfrastructureEstimator";
import ObservabilityComparison from "@/components/ObservabilityComparison";
import ObservabilityTabs, { type ObservabilityTab } from "@/components/ObservabilityTabs";
import TracingConfig from "@/components/TracingConfig";
import LogsConfig from "@/components/LogsConfig";
import SecurityConfig from "@/components/SecurityConfig";
import AnimatedNumber from "@/components/AnimatedNumber";
import FullStackComparison from "@/components/FullStackComparison";
import {
  platforms,
  calculateMetricVolume,
  metricsPerSecondToMonthly,
  calculatePlatformCost,
  BYTES_PER_DATAPOINT,
  type MetricConfig,
  type MetricSourceType,
} from "@/lib/costCalculator";
import {
  integrations,
  gbPerDayToMetricsPerSecond,
  gbPerDayToMonthlyMetrics,
} from "@/lib/infrastructureData";
import {
  getOperationalCost,
  DEFAULT_ENGINEER_HOURLY_RATE,
} from "@/lib/operationalCosts";
import {
  tracingPlatforms,
  logsPlatforms,
  securityPlatforms,
  calculateTracingCost,
  calculateLogsCost,
  calculateSecurityCost,
  spansPerSecondToMonthly,
  gbPerDayToMonthly,
  eventsPerSecondToMonthly,
} from "@/lib/observabilityPricing";

const STORAGE_KEY = "observability-compare-state";

interface SavedState {
  activeTab?: ObservabilityTab;
  // Metrics
  baseVolume: number;
  tags: string[];
  tagValues: number;
  primaryMetricType?: MetricSourceType;
  metricsInputMode?: "manual" | "infrastructure";
  infraItems?: Record<string, number>;
  // Tracing
  spansPerSecond: number;
  // Logs
  gbPerDay: number;
  // Security
  eventsPerSecond: number;
  // Egress
  includeEgress?: boolean;
  usePrivateLink?: boolean;
}

function loadState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        activeTab: parsed.activeTab ?? "metrics",
        baseVolume: parsed.baseVolume ?? 100,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        tagValues: parsed.tagValues ?? 10,
        primaryMetricType: parsed.primaryMetricType ?? "Mixed",
        spansPerSecond: parsed.spansPerSecond ?? 100,
        gbPerDay: parsed.gbPerDay ?? 10,
        eventsPerSecond: parsed.eventsPerSecond ?? 100,
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
  // Tab state
  const [activeTab, setActiveTab] = useState<ObservabilityTab>("metrics");
  
  // Metrics state
  const [baseVolume, setBaseVolume] = useState(100);
  const [tags, setTags] = useState<string[]>([]);
  const [tagValues, setTagValues] = useState(10);
  const [primaryMetricType, setPrimaryMetricType] = useState<MetricSourceType>("Mixed");
  const [metricsInputMode, setMetricsInputMode] = useState<"manual" | "infrastructure">("manual");
  const [infraItems, setInfraItems] = useState<Record<string, number>>({});
  
  // Tracing state
  const [spansPerSecond, setSpansPerSecond] = useState(100);
  
  // Logs state
  const [gbPerDay, setGbPerDay] = useState(10);
  
  // Security state
  const [eventsPerSecond, setEventsPerSecond] = useState(100);
  
  // Egress state
  const [includeEgress, setIncludeEgress] = useState(false);
  const [usePrivateLink, setUsePrivateLink] = useState(false);

  // Operational cost state
  const [includeOperationalCost, setIncludeOperationalCost] = useState(true);
  const [engineerHourlyRate, setEngineerHourlyRate] = useState(DEFAULT_ENGINEER_HOURLY_RATE);
  
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage after hydration
  useEffect(() => {
    setIsHydrated(true);
    const savedState = loadState();
    if (savedState) {
      if (savedState.activeTab) setActiveTab(savedState.activeTab);
      setBaseVolume(savedState.baseVolume);
      setTags(savedState.tags);
      setTagValues(savedState.tagValues);
      if (savedState.primaryMetricType) {
        setPrimaryMetricType(savedState.primaryMetricType);
      }
      if (savedState.spansPerSecond) setSpansPerSecond(savedState.spansPerSecond);
      if (savedState.gbPerDay) setGbPerDay(savedState.gbPerDay);
      if (savedState.eventsPerSecond) setEventsPerSecond(savedState.eventsPerSecond);
      if (savedState.includeEgress !== undefined) setIncludeEgress(savedState.includeEgress);
      if (savedState.usePrivateLink !== undefined) setUsePrivateLink(savedState.usePrivateLink);
      if (savedState.metricsInputMode) setMetricsInputMode(savedState.metricsInputMode);
      if (savedState.infraItems) setInfraItems(savedState.infraItems);
    }
  }, []);

  // Save state whenever it changes (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveState({
        activeTab,
        baseVolume,
        tags,
        tagValues,
        primaryMetricType,
        metricsInputMode,
        infraItems,
        spansPerSecond,
        gbPerDay,
        eventsPerSecond,
        includeEgress,
        usePrivateLink,
      });
    }
  }, [activeTab, baseVolume, tags, tagValues, primaryMetricType, metricsInputMode, infraItems, spansPerSecond, gbPerDay, eventsPerSecond, isHydrated]);

  const metricConfig: MetricConfig = useMemo(
    () => ({
      baseVolume,
      tags,
      tagValues,
      primaryMetricType,
    }),
    [baseVolume, tags, tagValues, primaryMetricType]
  );

  const metricsPerSecond = useMemo(
    () => calculateMetricVolume(metricConfig),
    [metricConfig]
  );

  const monthlyMetrics = useMemo(
    () => metricsPerSecondToMonthly(metricsPerSecond),
    [metricsPerSecond]
  );

  // Infrastructure-based metrics estimation
  const infraGbPerDay = useMemo(() => {
    return Object.entries(infraItems).reduce((total, [id, count]) => {
      const integration = integrations.find((i) => i.id === id);
      return total + (integration?.gbPerDayPerUnit ?? 0) * count;
    }, 0);
  }, [infraItems]);

  const infraMetricsPerSecond = useMemo(() => {
    return gbPerDayToMetricsPerSecond(infraGbPerDay, BYTES_PER_DATAPOINT[primaryMetricType]);
  }, [infraGbPerDay, primaryMetricType]);

  const infraMonthlyMetrics = useMemo(() => {
    return gbPerDayToMonthlyMetrics(infraGbPerDay, BYTES_PER_DATAPOINT[primaryMetricType]);
  }, [infraGbPerDay, primaryMetricType]);

  // Effective monthly metrics: infra-derived or manual
  const effectiveMonthlyMetrics = useMemo(() => {
    return metricsInputMode === "infrastructure" ? infraMonthlyMetrics : monthlyMetrics;
  }, [metricsInputMode, infraMonthlyMetrics, monthlyMetrics]);

  // Metrics calculations
  const metricsCosts = useMemo(() => {
    const result: Record<string, number> = {};
    try {
      platforms.forEach((platform) => {
        result[platform.id] = calculatePlatformCost(
          platform,
          effectiveMonthlyMetrics,
          primaryMetricType,
          includeEgress,
          usePrivateLink
        );
      });
    } catch (error) {
      console.error("Error calculating metrics costs:", error);
    }
    return result;
  }, [effectiveMonthlyMetrics, primaryMetricType, includeEgress, usePrivateLink]);

  // Tracing calculations
  const monthlySpans = useMemo(
    () => spansPerSecondToMonthly(spansPerSecond),
    [spansPerSecond]
  );

  const tracingCosts = useMemo(() => {
    const result: Record<string, number> = {};
    try {
      tracingPlatforms.forEach((platform) => {
        result[platform.id] = calculateTracingCost(
          platform,
          monthlySpans,
          includeEgress,
          usePrivateLink
        );
      });
    } catch (error) {
      console.error("Error calculating tracing costs:", error);
    }
    return result;
  }, [monthlySpans, includeEgress, usePrivateLink]);

  // Logs calculations
  const monthlyGB = useMemo(
    () => gbPerDayToMonthly(gbPerDay),
    [gbPerDay]
  );

  const logsCosts = useMemo(() => {
    const result: Record<string, number> = {};
    try {
      logsPlatforms.forEach((platform) => {
        result[platform.id] = calculateLogsCost(
          platform,
          monthlyGB,
          includeEgress,
          usePrivateLink
        );
      });
    } catch (error) {
      console.error("Error calculating logs costs:", error);
    }
    return result;
  }, [monthlyGB, includeEgress, usePrivateLink]);

  // Security calculations
  const monthlyEvents = useMemo(
    () => eventsPerSecondToMonthly(eventsPerSecond),
    [eventsPerSecond]
  );

  // Calculate daily ingest in GB for security events
  const securityGbPerDay = useMemo(() => {
    const bytesPerEvent = 1000; // BYTES_PER_SECURITY_EVENT
    const secondsPerDay = 24 * 60 * 60;
    const bytesPerDay = eventsPerSecond * bytesPerEvent * secondsPerDay;
    return bytesPerDay / (1024 * 1024 * 1024);
  }, [eventsPerSecond]);

  const securityCosts = useMemo(() => {
    const result: Record<string, number> = {};
    try {
      securityPlatforms.forEach((platform) => {
        result[platform.id] = calculateSecurityCost(
          platform,
          monthlyEvents,
          includeEgress,
          usePrivateLink
        );
      });
    } catch (error) {
      console.error("Error calculating security costs:", error);
    }
    return result;
  }, [monthlyEvents, includeEgress, usePrivateLink]);

  // Operational costs — computed for every platform across all tabs
  const allPlatformIds = useMemo(() => [
    ...platforms.map(p => p.id),
    ...tracingPlatforms.map(p => p.id),
    ...logsPlatforms.map(p => p.id),
    ...securityPlatforms.map(p => p.id),
  ], []);

  const operationalCosts = useMemo(() => {
    if (!includeOperationalCost) return {} as Record<string, number>;
    const result: Record<string, number> = {};
    allPlatformIds.forEach(id => {
      result[id] = getOperationalCost(id, engineerHourlyRate);
    });
    return result;
  }, [includeOperationalCost, engineerHourlyRate, allPlatformIds]);

  // Get current costs and platforms based on active tab
  const currentCosts = useMemo(() => {
    if (activeTab === "metrics") return metricsCosts;
    if (activeTab === "tracing") return tracingCosts;
    if (activeTab === "logs") return logsCosts;
    if (activeTab === "security") return securityCosts;
    return {};
  }, [activeTab, metricsCosts, tracingCosts, logsCosts, securityCosts]);

  const currentPlatforms = useMemo(() => {
    if (activeTab === "metrics") return platforms;
    if (activeTab === "tracing") return tracingPlatforms;
    if (activeTab === "logs") return logsPlatforms;
    return securityPlatforms;
  }, [activeTab]);

  const currentVolume = useMemo(() => {
    if (activeTab === "metrics") return effectiveMonthlyMetrics;
    if (activeTab === "tracing") return monthlySpans;
    if (activeTab === "logs") return monthlyGB;
    return monthlyEvents;
  }, [activeTab, monthlyMetrics, monthlySpans, monthlyGB, monthlyEvents]);

  const currentVolumeLabel = useMemo(() => {
    if (activeTab === "metrics") return "Monthly Metrics";
    if (activeTab === "tracing") return "Monthly Spans";
    if (activeTab === "logs") return "Monthly GB";
    return "Monthly Events";
  }, [activeTab]);

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
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 mb-4">
            Observability TCO Comparison
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Compare true total cost of ownership — infrastructure <em>and</em> human operational costs — across observability platforms
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="mb-10 animate-fade-in-up">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl px-6 py-4 flex items-start gap-3 shadow-sm">
            <span className="text-amber-500 text-xl mt-0.5 shrink-0">⚠️</span>
            <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Estimation purposes only.</strong> All pricing is approximate and based on publicly available list pricing as of early 2026. Actual costs vary based on negotiated contracts, committed-use discounts, data compression ratios, retention policies, and deployment configuration. Self-hosted cost estimates reflect typical infrastructure sizing and do not include staffing, licensing, or operational overhead unless noted. Contact vendors directly for accurate quotes.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <ObservabilityTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {/* Full Stack TCO tab */}
          {activeTab === "fullstack" && (
            <div className="animate-fade-in-up">
              <FullStackComparison
                metricsCosts={metricsCosts}
                tracingCosts={tracingCosts}
                logsCosts={logsCosts}
                securityCosts={securityCosts}
                operationalCosts={operationalCosts}
                engineerHourlyRate={engineerHourlyRate}
              />
            </div>
          )}

          {activeTab !== "fullstack" && (
          <><div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Configuration Panel */}
            <div className="lg:col-span-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-slide-in">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3" />
                Configuration
              </h2>
              <div className="space-y-6">
                {activeTab === "metrics" && (
                  <div className="space-y-5">
                    {/* Input mode toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Input Mode
                      </label>
                      <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900 w-full">
                        <button
                          onClick={() => setMetricsInputMode("manual")}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                            metricsInputMode === "manual"
                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          Manual
                        </button>
                        <button
                          onClick={() => setMetricsInputMode("infrastructure")}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                            metricsInputMode === "infrastructure"
                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          From Infrastructure
                        </button>
                      </div>
                    </div>

                    {/* Metric source type (shown in both modes) */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Metric Source
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["OpenTelemetry", "Prometheus", "ElasticAgent", "Mixed"] as MetricSourceType[]).map((type) => (
                          <button
                            key={type}
                            onClick={() => setPrimaryMetricType(type)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                              primaryMetricType === type
                                ? "bg-blue-600 text-white shadow-md"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            {type === "ElasticAgent" ? "Elastic Agent" : type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Manual mode */}
                    {metricsInputMode === "manual" && (
                      <>
                        <MetricSlider
                          label="Base Metrics per Second"
                          value={baseVolume}
                          onChange={setBaseVolume}
                          min={1}
                          max={1_000_000}
                          step={1}
                          logarithmic={true}
                          formatValue={(v) => {
                            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M/sec`;
                            if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K/sec`;
                            return `${v}/sec`;
                          }}
                        />
                        <TagManager
                          tags={tags}
                          onTagsChange={setTags}
                          tagValues={tagValues}
                          onTagValuesChange={setTagValues}
                        />
                      </>
                    )}

                    {/* Infrastructure mode */}
                    {metricsInputMode === "infrastructure" && (
                      <InfrastructureEstimator
                        items={infraItems}
                        onItemsChange={setInfraItems}
                      />
                    )}
                  </div>
                )}

                {activeTab === "tracing" && (
                  <TracingConfig
                    spansPerSecond={spansPerSecond}
                    onSpansPerSecondChange={setSpansPerSecond}
                  />
                )}

                {activeTab === "logs" && (
                  <LogsConfig
                    gbPerDay={gbPerDay}
                    onGbPerDayChange={setGbPerDay}
                  />
                )}

                {activeTab === "security" && (
                  <SecurityConfig
                    eventsPerSecond={eventsPerSecond}
                    onEventsPerSecondChange={setEventsPerSecond}
                  />
                )}

                {/* Operational Cost Options */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Human / Operational Costs
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Self-hosted platforms require engineering time to operate. Enable to see true TCO.
                  </p>
                  <div className="space-y-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeOperationalCost}
                        onChange={(e) => setIncludeOperationalCost(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Include operational costs in TCO
                      </span>
                    </label>
                    {includeOperationalCost && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Engineer fully-loaded rate: <span className="text-blue-600 dark:text-blue-400">${engineerHourlyRate}/hr</span>
                          <span className="ml-1 font-normal text-gray-400">(${(engineerHourlyRate * 160 * 12).toLocaleString()}/yr)</span>
                        </label>
                        <input
                          type="range"
                          min={60}
                          max={250}
                          step={5}
                          value={engineerHourlyRate}
                          onChange={(e) => setEngineerHourlyRate(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>$60/hr</span>
                          <span>$120/hr</span>
                          <span>$250/hr</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Default $120/hr ≈ $250k/yr fully-loaded (salary + benefits + overhead)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Egress Cost Options */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Network Egress Costs
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeEgress}
                        onChange={(e) => setIncludeEgress(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Include network egress costs
                      </span>
                    </label>
                    {includeEgress && (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={usePrivateLink}
                          onChange={(e) => setUsePrivateLink(e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Use Private Link (reduces egress costs)
                        </span>
                      </label>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {includeEgress
                        ? usePrivateLink
                          ? "Egress costs calculated with Private Link pricing (near-zero)."
                          : "Egress costs calculated based on platform pricing. Private Link can significantly reduce costs."
                        : "Egress costs excluded from calculations. Enable to see full TCO including data transfer costs."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Summary */}
            <div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <span className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-3" />
                {activeTab === "metrics" && "Metric Volume Impact"}
                {activeTab === "tracing" && "Tracing Volume"}
                {activeTab === "logs" && "Log Volume"}
                {activeTab === "security" && "Security Event Volume"}
              </h2>
              {activeTab === "metrics" && metricsInputMode === "infrastructure" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-5 border border-indigo-200 dark:border-indigo-700/50 shadow-md">
                      <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-2 uppercase tracking-wide">
                        Est. Daily Ingest
                      </div>
                      <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                        <AnimatedNumber
                          value={infraGbPerDay}
                          format={(v) => v >= 1 ? `${v.toFixed(1)} GB` : `${(v * 1000).toFixed(0)} MB`}
                        />
                      </div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">per day</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md">
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                        Metrics per Second
                      </div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        <AnimatedNumber
                          value={infraMetricsPerSecond}
                          format={formatMetricsPerSecond}
                        />
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {BYTES_PER_DATAPOINT[primaryMetricType]}B/datapoint ({primaryMetricType === "ElasticAgent" ? "Elastic Agent" : primaryMetricType})
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md">
                      <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                        Monthly Metrics
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                        <AnimatedNumber
                          value={infraMonthlyMetrics}
                          format={formatMonthlyMetrics}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Infrastructure breakdown table */}
                  {Object.keys(infraItems).length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Infrastructure Breakdown
                      </div>
                      <div className="space-y-1.5">
                        {integrations
                          .filter((i) => (infraItems[i.id] ?? 0) > 0)
                          .map((i) => {
                            const count = infraItems[i.id];
                            const gb = i.gbPerDayPerUnit * count;
                            return (
                              <div key={i.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {i.emoji} {count}× {i.name}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 tabular-nums text-xs">
                                  {gb >= 1 ? `${gb.toFixed(1)} GB/day` : `${(gb * 1000).toFixed(0)} MB/day`}
                                </span>
                              </div>
                            );
                          })}
                        <div className="pt-1.5 mt-1.5 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center font-semibold text-sm">
                          <span className="text-gray-700 dark:text-gray-300">Total</span>
                          <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                            {infraGbPerDay >= 1 ? `${infraGbPerDay.toFixed(1)} GB/day` : `${(infraGbPerDay * 1000).toFixed(0)} MB/day`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {Object.keys(infraItems).length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <div className="text-4xl mb-2">🏗️</div>
                      <p className="text-sm">Add infrastructure in the Configuration panel to see volume estimates</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "metrics" && metricsInputMode === "manual" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-5 border border-indigo-200 dark:border-indigo-700/50 shadow-md">
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-2 uppercase tracking-wide">
                      Metric Source
                    </div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {primaryMetricType === "ElasticAgent" ? "Elastic Agent" : primaryMetricType}
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      {BYTES_PER_DATAPOINT[primaryMetricType]} bytes/datapoint
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                      Metrics per Second
                    </div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      <AnimatedNumber
                        value={metricsPerSecond}
                        format={formatMetricsPerSecond}
                      />
                    </div>
                    {tags.length > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {multiplier.toLocaleString()}× cardinality multiplier
                      </div>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md">
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                      Monthly Metrics
                    </div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      <AnimatedNumber
                        value={monthlyMetrics}
                        format={formatMonthlyMetrics}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tracing" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                      Spans per Second
                    </div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {spansPerSecond.toLocaleString()}/sec
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md">
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                      Monthly Spans
                    </div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      <AnimatedNumber
                        value={monthlySpans}
                        format={formatMonthlyMetrics}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                      Daily Ingest
                    </div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {gbPerDay >= 1000
                        ? `${(gbPerDay / 1000).toFixed(1)} TB/day`
                        : `${gbPerDay.toFixed(1)} GB/day`}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md">
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                      Monthly Ingest
                    </div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {monthlyGB >= 1000
                        ? `${(monthlyGB / 1000).toFixed(1)} TB/month`
                        : `${monthlyGB.toFixed(1)} GB/month`}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-5 border border-red-200 dark:border-red-700/50 shadow-md">
                      <div className="text-sm text-red-600 dark:text-red-400 font-semibold mb-2 uppercase tracking-wide">
                        Events per Second
                      </div>
                      <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                        <AnimatedNumber
                          value={eventsPerSecond}
                          format={(v) => `${v.toLocaleString()}/sec`}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md">
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                        Daily Ingest (GB/day)
                      </div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {securityGbPerDay.toFixed(2)} GB/day
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md">
                      <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                        Monthly Events
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                        <AnimatedNumber
                          value={monthlyEvents}
                          format={formatMonthlyMetrics}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                      💡 <strong>Calculation:</strong> Daily ingest (GB/day) = Events/sec × 1,000 bytes/event × 86,400 sec/day ÷ 1,073,741,824 bytes/GB
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>To match your daily ingest:</strong> Adjust the Events per Second slider. Quick reference: 100 GB/day ≈ 1,157 events/sec, 500 GB/day ≈ 5,787 events/sec, 1 TB/day ≈ 11,574 events/sec
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cost Comparison */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full mr-3" />
              TCO Comparison
            </h2>
            <ObservabilityComparison
              type={activeTab}
              platforms={currentPlatforms}
              costs={currentCosts}
              operationalCosts={operationalCosts}
              engineerHourlyRate={engineerHourlyRate}
              volume={currentVolume}
              volumeLabel={currentVolumeLabel}
              calculationContext={
                activeTab === "metrics"
                  ? (() => {
                      const bpd = BYTES_PER_DATAPOINT[primaryMetricType];
                      const metricsMonthlyGB = effectiveMonthlyMetrics
                        ? (effectiveMonthlyMetrics * bpd) / (1024 * 1024 * 1024)
                        : 0;
                      return {
                        monthlyMetrics: effectiveMonthlyMetrics,
                        metricsPerSecond: metricsInputMode === "infrastructure"
                          ? infraMetricsPerSecond
                          : metricsPerSecond,
                        primaryMetricType,
                        bytesPerDatapoint: bpd,
                        monthlyGB: metricsMonthlyGB > 0 ? metricsMonthlyGB : undefined,
                      };
                    })()
                  : activeTab === "security"
                  ? (() => {
                      const bytesPerEvent = 1000; // BYTES_PER_SECURITY_EVENT
                      const secMonthlyGB = monthlyEvents
                        ? (monthlyEvents * bytesPerEvent) / (1024 * 1024 * 1024)
                        : 0;
                      return {
                        eventsPerSecond,
                        monthlyEvents,
                        monthlyGB: secMonthlyGB > 0 ? secMonthlyGB : undefined,
                      };
                    })()
                  : activeTab === "tracing"
                  ? (() => {
                      const bytesPerSpan = 500; // BYTES_PER_SPAN
                      const tracingMonthlyGB = monthlySpans
                        ? (monthlySpans * bytesPerSpan) / (1024 * 1024 * 1024)
                        : 0;
                      return {
                        spansPerSecond,
                        monthlySpans,
                        monthlyTraces: monthlySpans / 10,
                        monthlyGB: tracingMonthlyGB > 0 ? tracingMonthlyGB : undefined,
                      };
                    })()
                  : undefined
              }
            />
          </div>

          {/* Try Elastic Metrics - Instruqt */}
          {activeTab === "metrics" && false && false && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full mr-3" />
                Try Elastic Metrics
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Experience Elastic Serverless Metrics hands-on with this interactive tutorial. Learn how to ingest, query, and visualize metrics at scale.
              </p>
              <a
                href="https://play.instruqt.com/embed/elastic/tracks/elastic-metrics-firehose?token=em_u0mX9BSdbwxtRoO3"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              >
                <span>Launch Tutorial</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}
          </> )} {/* end activeTab !== "fullstack" */}
        </ObservabilityTabs>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pricing is based on publicly available list rates as of March 2026. Elastic Serverless reflects the <a href="https://www.elastic.co/pricing/serverless-observability" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">November 2025 pricing</a>. All figures are estimates — actual costs vary with negotiated discounts, committed use, and deployment configuration. <strong>Use the Full Stack TCO tab for a complete cross-signal comparison.</strong> Contact your SE for a custom TCO analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
