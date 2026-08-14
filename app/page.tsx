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
import ElasticStreamsTcoControls from "@/components/ElasticStreamsTcoControls";
import FederatedDataSourcesVisual from "@/components/FederatedDataSourcesVisual";
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
  DEFAULT_TCO_PRICING_CONTEXT,
  type TcoPricingContext,
} from "@/lib/costCalculator";
import {
  DEFAULT_ELASTIC_STREAMS_TCO,
  normalizeElasticStreamsTcoPolicy,
  type ElasticStreamsTcoPolicy,
} from "@/lib/elasticStreamsTco";
import { ECH_HOT_FROZEN_ARCHITECTURE } from "@/lib/elasticEchHotFrozenPricing";
import { SERVERLESS_STREAMS_S3_ARCHITECTURE } from "@/lib/elasticServerlessStreamsS3Pricing";
import { OBSERVABILITY_SERVERLESS_PUBLISHED } from "@/lib/elasticServerlessPricing";
import { estimateMonitoredHosts } from "@/lib/hostEstimation";
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
import {
  ELASTIC_CLOUD_HOSTED_PRICING_URL,
  ELASTIC_CLOUD_SERVERLESS_PRICING_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL,
  ELASTIC_TSDS_METRICS_EFFECTIVE_LABEL,
  TCO_LIST_RATES_AS_OF,
  TCO_VALIDATION_FOOTNOTE,
} from "@/lib/tcoDisclaimer";
import CompetitorScenarioSelect from "@/components/CompetitorScenarioSelect";
import {
  DEFAULT_COMPETITOR_SCENARIO_ID,
  getCompetitorScenario,
  isCompetitorScenarioId,
  scenarioShowsDatadog,
  type CompetitorScenarioId,
} from "@/lib/competitorScenarios";
import {
  samplesPerSecondToMonthlyIngestGbDecimal,
} from "@/lib/elasticMetricsPoc";
import TcoDisclaimerBanner from "@/components/TcoDisclaimerBanner";
import ElasticSchemalessBlocksVisual from "@/components/ElasticSchemalessBlocksVisual";

type MetricsInputMode = "manual" | "infrastructure" | "samples-poc";

const STORAGE_KEY = "observability-compare-state";

interface SavedState {
  activeTab?: ObservabilityTab;
  // Metrics
  baseVolume: number;
  tags: string[];
  tagValues: number;
  primaryMetricType?: MetricSourceType;
  metricsInputMode?: MetricsInputMode;
  infraItems?: Record<string, number>;
  competitorScenarioId?: CompetitorScenarioId;
  samplesPerSecond?: number;
  bytesPerSample?: number;
  // Tracing
  spansPerSecond: number;
  // Logs
  gbPerDay: number;
  // Security
  eventsPerSecond: number;
  // Egress
  includeEgress?: boolean;
  usePrivateLink?: boolean;
  elasticRetentionMonths?: number;
  elasticUseVolumeTiers?: boolean;
  elasticStreamsTco?: ElasticStreamsTcoPolicy;
  datadogHostsAuto?: boolean;
  datadogManualHosts?: number;
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
  const [metricsInputMode, setMetricsInputMode] = useState<MetricsInputMode>("manual");
  const [infraItems, setInfraItems] = useState<Record<string, number>>({});
  const [competitorScenarioId, setCompetitorScenarioId] = useState<CompetitorScenarioId>(
    DEFAULT_COMPETITOR_SCENARIO_ID
  );
  const [samplesPerSecond, setSamplesPerSecond] = useState(400_000);
  const [bytesPerSample, setBytesPerSample] = useState(1.5);
  
  // Tracing state
  const [spansPerSecond, setSpansPerSecond] = useState(100);
  
  // Logs state
  const [gbPerDay, setGbPerDay] = useState(10);
  
  // Security state
  const [eventsPerSecond, setEventsPerSecond] = useState(100);
  
  // Egress state
  const [includeEgress, setIncludeEgress] = useState(false);
  const [usePrivateLink, setUsePrivateLink] = useState(false);

  // Elastic Serverless pricing (ingest + retention)
  const [elasticRetentionMonths, setElasticRetentionMonths] = useState(1);
  const [elasticUseVolumeTiers, setElasticUseVolumeTiers] = useState(true);
  const [elasticStreamsTco, setElasticStreamsTco] = useState<ElasticStreamsTcoPolicy>(
    DEFAULT_ELASTIC_STREAMS_TCO
  );

  // Datadog host licensing (Infra Pro + APM Pro)
  const [datadogHostsAuto, setDatadogHostsAuto] = useState(true);
  const [datadogManualHosts, setDatadogManualHosts] = useState(10);

  // Operational cost state
  const [includeOperationalCost, setIncludeOperationalCost] = useState(false);
  const [engineerHourlyRate, setEngineerHourlyRate] = useState(DEFAULT_ENGINEER_HOURLY_RATE);
  
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage after hydration; URL ?scenario= wins when present
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
      if (savedState.elasticRetentionMonths !== undefined) {
        setElasticRetentionMonths(savedState.elasticRetentionMonths);
      }
      setElasticUseVolumeTiers(savedState.elasticUseVolumeTiers ?? true);
      if (savedState.elasticStreamsTco) {
        setElasticStreamsTco(normalizeElasticStreamsTcoPolicy(savedState.elasticStreamsTco));
      }
      if (savedState.datadogHostsAuto !== undefined) setDatadogHostsAuto(savedState.datadogHostsAuto);
      if (savedState.datadogManualHosts !== undefined) setDatadogManualHosts(savedState.datadogManualHosts);
      if (savedState.metricsInputMode) setMetricsInputMode(savedState.metricsInputMode);
      if (savedState.competitorScenarioId) setCompetitorScenarioId(savedState.competitorScenarioId);
      if (savedState.samplesPerSecond !== undefined) setSamplesPerSecond(savedState.samplesPerSecond);
      if (savedState.bytesPerSample !== undefined) setBytesPerSample(savedState.bytesPerSample);
      if (savedState.infraItems) setInfraItems(savedState.infraItems);
    }

    const scenarioParam = new URLSearchParams(window.location.search).get("scenario");
    if (scenarioParam && isCompetitorScenarioId(scenarioParam)) {
      setCompetitorScenarioId(scenarioParam);
      const presets = getCompetitorScenario(scenarioParam).presets;
      if (presets?.metricsInputMode) setMetricsInputMode(presets.metricsInputMode);
      if (presets?.primaryMetricType) setPrimaryMetricType(presets.primaryMetricType);
      if (presets?.samplesPerSecond !== undefined) setSamplesPerSecond(presets.samplesPerSecond);
      if (presets?.elasticRetentionMonths !== undefined) {
        setElasticRetentionMonths(presets.elasticRetentionMonths);
      }
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
        competitorScenarioId,
        samplesPerSecond,
        bytesPerSample,
        spansPerSecond,
        gbPerDay,
        eventsPerSecond,
        includeEgress,
        usePrivateLink,
        elasticRetentionMonths,
        elasticUseVolumeTiers,
        elasticStreamsTco,
        datadogHostsAuto,
        datadogManualHosts,
      });
    }
  }, [activeTab, baseVolume, tags, tagValues, primaryMetricType, metricsInputMode, infraItems, competitorScenarioId, samplesPerSecond, bytesPerSample, spansPerSecond, gbPerDay, eventsPerSecond, includeEgress, usePrivateLink, elasticRetentionMonths, elasticUseVolumeTiers, elasticStreamsTco, datadogHostsAuto, datadogManualHosts, isHydrated]);

  const applyCompetitorScenario = (id: CompetitorScenarioId) => {
    setCompetitorScenarioId(id);
    // Datadog samples/sec POCs need an explicit host count — auto-from-inventory is easy to miss.
    if (id === "datadog") {
      setDatadogHostsAuto(false);
      setDatadogManualHosts((prev) => (prev < 100 ? 500 : prev));
    }
    const presets = getCompetitorScenario(id).presets;
    if (!presets) return;
    if (presets.metricsInputMode) setMetricsInputMode(presets.metricsInputMode);
    if (presets.primaryMetricType) setPrimaryMetricType(presets.primaryMetricType);
    if (presets.samplesPerSecond !== undefined) setSamplesPerSecond(presets.samplesPerSecond);
    if (presets.elasticRetentionMonths !== undefined) {
      setElasticRetentionMonths(presets.elasticRetentionMonths);
    }
  };

  const elasticPricing = useMemo(
    () => ({
      retentionMonths: elasticRetentionMonths,
      useVolumeTiers: elasticUseVolumeTiers,
    }),
    [elasticRetentionMonths, elasticUseVolumeTiers]
  );

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

  const samplesPocMonthlyMetrics = useMemo(
    () => metricsPerSecondToMonthly(samplesPerSecond),
    [samplesPerSecond]
  );

  // Effective monthly metrics: samples POC, infra-derived, or manual (with tags)
  const effectiveMonthlyMetrics = useMemo(() => {
    if (metricsInputMode === "samples-poc") return samplesPocMonthlyMetrics;
    if (metricsInputMode === "infrastructure") return infraMonthlyMetrics;
    return monthlyMetrics;
  }, [metricsInputMode, samplesPocMonthlyMetrics, infraMonthlyMetrics, monthlyMetrics]);

  const estimatedDatadogHosts = useMemo(
    () => estimateMonitoredHosts(infraItems, { logsGbPerDay: gbPerDay }),
    [infraItems, gbPerDay]
  );

  const monitoredDatadogHosts = datadogHostsAuto ? estimatedDatadogHosts : datadogManualHosts;

  const pricingContext: TcoPricingContext = useMemo(
    () => ({
      elastic: elasticPricing,
      datadog: {
        ...DEFAULT_TCO_PRICING_CONTEXT.datadog,
        infraHosts: monitoredDatadogHosts,
        apmHosts: monitoredDatadogHosts,
      },
      dynatrace: {
        ...DEFAULT_TCO_PRICING_CONTEXT.dynatrace,
        appSecHosts: monitoredDatadogHosts,
      },
      streams: elasticStreamsTco,
    }),
    [elasticPricing, monitoredDatadogHosts, elasticStreamsTco]
  );

  // Metrics calculations
  const metricsBytesPerDatapoint = useMemo(() => {
    if (metricsInputMode === "samples-poc") return bytesPerSample;
    return BYTES_PER_DATAPOINT[primaryMetricType];
  }, [metricsInputMode, bytesPerSample, primaryMetricType]);

  const metricsCosts = useMemo(() => {
    const result: Record<string, number> = {};
    try {
      platforms.forEach((platform) => {
        result[platform.id] = calculatePlatformCost(
          platform,
          effectiveMonthlyMetrics,
          primaryMetricType,
          includeEgress,
          usePrivateLink,
          pricingContext,
          metricsInputMode === "samples-poc" ? bytesPerSample : undefined
        );
      });
    } catch (error) {
      console.error("Error calculating metrics costs:", error);
    }
    return result;
  }, [effectiveMonthlyMetrics, primaryMetricType, includeEgress, usePrivateLink, pricingContext, metricsInputMode, bytesPerSample]);

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
          usePrivateLink,
          pricingContext
        );
      });
    } catch (error) {
      console.error("Error calculating tracing costs:", error);
    }
    return result;
  }, [monthlySpans, includeEgress, usePrivateLink, pricingContext]);

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
          usePrivateLink,
          pricingContext
        );
      });
    } catch (error) {
      console.error("Error calculating logs costs:", error);
    }
    return result;
  }, [monthlyGB, includeEgress, usePrivateLink, pricingContext]);

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
          usePrivateLink,
          pricingContext
        );
      });
    } catch (error) {
      console.error("Error calculating security costs:", error);
    }
    return result;
  }, [monthlyEvents, includeEgress, usePrivateLink, pricingContext]);

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
            Compare true total cost of ownership — infrastructure <em>and</em> human operational costs —
            across observability platforms. Or open <strong>Data Blocks</strong> for Elastic schemaless
            ingest and retention estimates.
          </p>
        </div>

        <TcoDisclaimerBanner />

        {/* Tabs */}
        <ObservabilityTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {/* Full Stack TCO tab */}
          {activeTab === "fullstack" && (
            <div className="animate-fade-in-up space-y-8">
              <FullStackComparison
                metricsCosts={metricsCosts}
                tracingCosts={tracingCosts}
                logsCosts={logsCosts}
                securityCosts={securityCosts}
                operationalCosts={operationalCosts}
                engineerHourlyRate={engineerHourlyRate}
              />
              <FederatedDataSourcesVisual />
            </div>
          )}

          {/* Data Blocks tab — Elastic unit economics (ingest + retention architecture) */}
          {activeTab === "datablocks" && (
            <ElasticSchemalessBlocksVisual elasticRetentionMonths={elasticRetentionMonths} />
          )}

          {activeTab !== "fullstack" && activeTab !== "datablocks" && (
          <><div className="grid gap-8 mb-8 grid-cols-1 lg:grid-cols-12">
            {/* Configuration Panel */}
            <div className="lg:col-span-4 xl:col-span-3 min-w-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
              <div className="mb-6 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center min-w-0 truncate">
                  <span className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3 shrink-0" />
                  Configuration
                </h2>
              </div>
              <div className="space-y-6 min-w-0">
                <CompetitorScenarioSelect
                  value={competitorScenarioId}
                  onChange={applyCompetitorScenario}
                />

                {activeTab === "metrics" && (
                  <div className="space-y-5">
                    {/* Input mode toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Input Mode
                      </label>
                      <div className="inline-flex flex-wrap rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900 w-full gap-1">
                        <button
                          onClick={() => setMetricsInputMode("manual")}
                          className={`flex-1 min-w-[5.5rem] px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                            metricsInputMode === "manual"
                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          Cardinality
                        </button>
                        <button
                          onClick={() => setMetricsInputMode("samples-poc")}
                          className={`flex-1 min-w-[5.5rem] px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                            metricsInputMode === "samples-poc"
                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          Samples/sec
                        </button>
                        <button
                          onClick={() => setMetricsInputMode("infrastructure")}
                          className={`flex-1 min-w-[5.5rem] px-2 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                            metricsInputMode === "infrastructure"
                              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
                        >
                          Infrastructure
                        </button>
                      </div>
                    </div>

                    {/* Metric source type (cardinality + infra modes) */}
                    {metricsInputMode !== "samples-poc" && (
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
                    )}

                    {metricsInputMode === "samples-poc" && (
                      <>
                        <MetricSlider
                          label="Samples per Second (post-dedup)"
                          value={samplesPerSecond}
                          onChange={setSamplesPerSecond}
                          min={1_000}
                          max={2_000_000}
                          step={1_000}
                          logarithmic={true}
                          formatValue={(v) => {
                            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M/sec`;
                            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K/sec`;
                            return `${v}/sec`;
                          }}
                        />
                        <MetricSlider
                          label="Bytes per sample"
                          value={bytesPerSample}
                          onChange={setBytesPerSample}
                          min={0.5}
                          max={8}
                          step={0.05}
                          formatValue={(v) => v.toFixed(2)}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                          Post-dedup samples/sec (no tag multiplication). Elastic cost uses GB from samples ×
                          bytes.{" "}
                          {scenarioShowsDatadog(competitorScenarioId) && (
                            <>
                              Datadog still uses <strong>host + custom-metric</strong> pricing — set monitored
                              hosts below (samples/sec is not a host count).
                            </>
                          )}
                          {!scenarioShowsDatadog(competitorScenarioId) && (
                            <>Volume drives the TCO chart below.</>
                          )}
                        </p>
                      </>
                    )}

                    {/* Manual cardinality mode */}
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

                {/* Datadog host licensing — prominent when comparing Datadog */}
                {scenarioShowsDatadog(competitorScenarioId) &&
                  (activeTab === "metrics" || activeTab === "tracing") && (
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Datadog host licensing
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Datadog bills <strong>Infrastructure Pro</strong> ($15/host/mo) on Metrics plus custom
                      metrics ($0.05/series/mo after included series), and <strong>APM Pro</strong> ($31/host/mo)
                      on Tracing. Host count is separate from samples/sec.
                    </p>
                    <div className="space-y-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={datadogHostsAuto}
                          onChange={(e) => setDatadogHostsAuto(e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Auto-estimate hosts from inventory / log GB/day
                        </span>
                      </label>
                      {datadogHostsAuto ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Estimated{" "}
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {estimatedDatadogHosts.toLocaleString()} hosts
                          </span>{" "}
                          (linux/windows/k8s-node inventory, or log GB/day ÷ 0.04 GB/host/day). Prefer manual
                          hosts in Samples/sec mode.
                        </p>
                      ) : (
                        <div>
                          <MetricSlider
                            label="Monitored hosts (Infra Pro + APM Pro)"
                            value={datadogManualHosts}
                            onChange={(v) => setDatadogManualHosts(Math.max(1, Math.round(v)))}
                            min={1}
                            max={50_000}
                            step={1}
                            logarithmic={true}
                            formatValue={(v) => `${Math.round(v).toLocaleString()} hosts`}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Infra Pro: ${(datadogManualHosts * 15).toLocaleString()}/mo · APM Pro (Tracing tab): $
                            {(datadogManualHosts * 31).toLocaleString()}/mo — before custom metrics.
                          </p>
                        </div>
                      )}
                    </div>
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

                {/* Elastic metrics + retention (Serverless TSDS; logs/traces use full Complete rates on their tabs) */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Elastic Serverless retention
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <strong>Serverless always uses {SERVERLESS_STREAMS_S3_ARCHITECTURE.summary}:</strong>{" "}
                    {SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays}-day hot on Observability Complete, then Streams
                    sends the rest to object storage (S3). This slider sets <strong>total retention</strong> (hot +
                    S3). <strong>ECH</strong> ignores it and uses fixed {ECH_HOT_FROZEN_ARCHITECTURE.summary} per{" "}
                    <a
                      href={ELASTIC_CLOUD_HOSTED_PRICING_URL}
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Cloud Hosted pricing
                    </a>
                    .
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Total retention:{" "}
                        <span className="text-blue-600 dark:text-blue-400">
                          {elasticRetentionMonths} month{elasticRetentionMonths === 1 ? "" : "s"}
                        </span>
                        <span className="ml-2 font-normal normal-case text-gray-400">
                          ({SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays}d hot +{" "}
                          {Math.max(
                            0,
                            Math.round(elasticRetentionMonths * (365 / 12)) -
                              SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays
                          )}
                          d on S3)
                        </span>
                        {elasticRetentionMonths === 13 && (
                          <span className="ml-2 font-normal normal-case text-gray-400">
                            · ~Grafana/Observe comparison window
                          </span>
                        )}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={1}
                        value={elasticRetentionMonths}
                        onChange={(e) => setElasticRetentionMonths(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                      />
                      <div className="relative mt-1 h-4 text-xs text-gray-400">
                        <span className="absolute left-0">1 mo</span>
                        <span
                          className="absolute -translate-x-1/2"
                          style={{ left: `${((8 - 1) / (15 - 1)) * 100}%` }}
                        >
                          8 mo
                        </span>
                        <span
                          className="absolute -translate-x-1/2"
                          style={{ left: `${((13 - 1) / (15 - 1)) * 100}%` }}
                        >
                          13 mo
                        </span>
                        <span className="absolute right-0">15 mo</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      In short: keep recent data searchable for{" "}
                      {SERVERLESS_STREAMS_S3_ARCHITECTURE.hotDays} day, then write the rest to blob/object storage
                      (S3, ~${SERVERLESS_STREAMS_S3_ARCHITECTURE.s3PerGBMonth}/GB-mo) for long-term trending and
                      retention. Metrics ingest + hot use the Observability Complete volume tier table × 25% (TSDS;
                      as low as $
                      {OBSERVABILITY_SERVERLESS_PUBLISHED.complete.ingestMetricsPerGB}/GB). ECH uses 1d hot + ILM
                      blob plus the $200/mo cluster minimum.
                    </p>
                  </div>
                </div>

                {/* Elastic Streams TCO — metrics, tracing, logs */}
                {(activeTab === "metrics" || activeTab === "tracing" || activeTab === "logs") && (
                  <ElasticStreamsTcoControls
                    activeSignal={
                      activeTab === "metrics"
                        ? "metrics"
                        : activeTab === "tracing"
                        ? "tracing"
                        : "logs"
                    }
                    policy={elasticStreamsTco}
                    onPolicyChange={setElasticStreamsTco}
                    elasticPricing={elasticPricing}
                    monthlyGB={
                      activeTab === "logs"
                        ? monthlyGB
                        : activeTab === "tracing"
                        ? (monthlySpans * 500) / (1024 * 1024 * 1024)
                        : undefined
                    }
                    monthlyMetrics={activeTab === "metrics" ? effectiveMonthlyMetrics : undefined}
                    bytesPerDatapoint={
                      activeTab === "metrics" ? metricsBytesPerDatapoint : undefined
                    }
                    gbPerDay={activeTab === "logs" ? gbPerDay : undefined}
                  />
                )}

                {/* Operational Cost Options */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Human / Operational Costs
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Self-hosted platforms need engineering time to run. Fully managed SaaS
                    (Elastic Serverless, Grafana Cloud, Datadog, etc.) is <strong>$0 platform ops</strong>.
                    Enable only when comparing DIY Prom/Mimir/Thanos-style stacks.
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
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up lg:col-span-8 xl:col-span-9">
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

              {activeTab === "metrics" && metricsInputMode === "samples-poc" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-5 border border-indigo-200 dark:border-indigo-700/50 shadow-md">
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-2 uppercase tracking-wide">
                      Bytes per Sample
                    </div>
                    <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                      {bytesPerSample}
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      post-dedup sample size
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-200 dark:border-blue-700/50 shadow-md">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">
                      Samples per Second
                    </div>
                    <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      <AnimatedNumber
                        value={samplesPerSecond}
                        format={formatMetricsPerSecond}
                      />
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      post-dedup
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-5 border border-green-200 dark:border-green-700/50 shadow-md">
                    <div className="text-sm text-green-600 dark:text-green-400 font-semibold mb-2 uppercase tracking-wide">
                      Monthly Ingest
                    </div>
                    <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                      <AnimatedNumber
                        value={samplesPerSecondToMonthlyIngestGbDecimal(samplesPerSecond, bytesPerSample)}
                        format={(v) =>
                          v >= 1000 ? `${(v / 1000).toFixed(1)} TB` : `${v.toFixed(1)} GB`
                        }
                      />
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {formatMonthlyMetrics(samplesPocMonthlyMetrics)} samples/mo
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

          <FederatedDataSourcesVisual />

          {/* Cost Comparison */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full mr-3" />
              TCO Comparison*
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {TCO_VALIDATION_FOOTNOTE}
            </p>
            <ObservabilityComparison
              type={activeTab}
              competitorScenarioId={competitorScenarioId}
              platforms={currentPlatforms}
              costs={currentCosts}
              operationalCosts={operationalCosts}
              engineerHourlyRate={engineerHourlyRate}
              volume={currentVolume}
              volumeLabel={currentVolumeLabel}
              calculationContext={
                activeTab === "metrics"
                  ? (() => {
                      const bpd = metricsBytesPerDatapoint;
                      const metricsMonthlyGB = effectiveMonthlyMetrics
                        ? metricsInputMode === "samples-poc"
                          ? samplesPerSecondToMonthlyIngestGbDecimal(samplesPerSecond, bytesPerSample)
                          : (effectiveMonthlyMetrics * bpd) / (1024 * 1024 * 1024)
                        : 0;
                      return {
                        monthlyMetrics: effectiveMonthlyMetrics,
                        metricsPerSecond: metricsInputMode === "samples-poc"
                          ? samplesPerSecond
                          : metricsInputMode === "infrastructure"
                          ? infraMetricsPerSecond
                          : metricsPerSecond,
                        primaryMetricType,
                        bytesPerDatapoint: bpd,
                        monthlyGB: metricsMonthlyGB > 0 ? metricsMonthlyGB : undefined,
                        elasticRetentionMonths,
                        elasticUseVolumeTiers,
                        elasticStreamsTco,
                        datadogInfraHosts: monitoredDatadogHosts,
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
                        monitoredHosts: monitoredDatadogHosts,
                        elasticRetentionMonths,
                        elasticUseVolumeTiers,
                        elasticStreamsTco,
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
                        elasticRetentionMonths,
                        elasticUseVolumeTiers,
                        elasticStreamsTco,
                        datadogApmHosts: monitoredDatadogHosts,
                      };
                    })()
                  : activeTab === "logs"
                  ? {
                      monthlyGB,
                      gbPerDay,
                      elasticRetentionMonths,
                      elasticUseVolumeTiers,
                      elasticStreamsTco,
                    }
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
          </> )} {/* end per-signal tabs (not fullstack / datablocks) */}
        </ObservabilityTabs>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pricing is based on publicly available list rates as of {TCO_LIST_RATES_AS_OF} (AWS us-east-1{" "}
              <a
                href={ELASTIC_CLOUD_SERVERLESS_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Serverless
              </a>{" "}
              and{" "}
              <a
                href={ELASTIC_CLOUD_HOSTED_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Cloud Hosted
              </a>{" "}
              pricing tables). Elastic Observability Serverless Complete and TSDS metrics rates per{" "}
              <a
                href={ELASTIC_SERVERLESS_OBSERVABILITY_MARKETING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                elastic.co pricing
              </a>{" "}
              (TSDS metrics effective {ELASTIC_TSDS_METRICS_EFFECTIVE_LABEL}). All figures are estimates — actual
              costs vary with negotiated discounts, committed use, and deployment configuration.{" "}
              <strong>Use the Full Stack TCO tab for a complete cross-signal comparison.</strong> Contact your SA
              for a custom TCO analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
