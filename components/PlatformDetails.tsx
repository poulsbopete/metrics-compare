"use client";

import {
  ELASTIC_PRICE_PER_GB,
  MetricSourceType,
  Platform,
  monthlyDatapointsToUniqueCustomMetrics,
} from "@/lib/costCalculator";
import {
  calculateElasticServerlessCost,
  calculateElasticServerlessMetricsCost,
  calculateEchMetricsCost,
  type ElasticServerlessPricingOptions,
} from "@/lib/elasticServerlessPricing";
import { calculateEchHotFrozenVolumeCost, ECH_HOT_FROZEN_ARCHITECTURE } from "@/lib/elasticEchHotFrozenPricing";
import {
  calculateDatadogMetricsCostBreakdown,
  DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST,
  DATADOG_INFRA_HOST_PRO_USD_PER_MONTH,
  calculateDatadogApmHostCost,
  DATADOG_APM_HOST_PRO_USD_PER_MONTH,
} from "@/lib/datadogPricing";
import {
  ObservabilityPlatform,
  calculateLogsCostBreakdown,
  calculateSecurityCostBreakdown,
  DATADOG_LOG_INDEX_RATE_PER_M_EVENTS,
} from "@/lib/observabilityPricing";
import { DEFAULT_TCO_PRICING_CONTEXT } from "@/lib/tcoPricingContext";
import type { ElasticStreamsTcoPolicy } from "@/lib/elasticStreamsTco";
import { DYNATRACE_APPSEC_USD_PER_MEMORY_GIB_HOUR } from "@/lib/dynatracePricing";

interface PlatformDetailsProps {
  platform: Platform | ObservabilityPlatform;
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
    // Logs
    gbPerDay?: number;
    // Security
    eventsPerSecond?: number;
    monthlyEvents?: number;
    /** Host fleet proxy for Dynatrace AppSec / Datadog host SKUs */
    monitoredHosts?: number;
    // Shared
    monthlyGB?: number;
    cost: number;
    /** SaaS infra subtotal (excludes operational FTE $) — matches table “infra” when shown */
    infraCost?: number;
    operationalCost?: number;
    elasticRetentionMonths?: number;
    elasticUseVolumeTiers?: boolean;
    elasticStreamsTco?: ElasticStreamsTcoPolicy;
    datadogInfraHosts?: number;
    datadogApmHosts?: number;
  };
}

function getEffectiveMetricsPricePerGB(
  platform: Platform,
  primaryMetricType?: string
): number {
  let pricePerGB = platform.pricing.pricePerGB ?? 0;
  if (platform.id === "elastic-serverless" && primaryMetricType) {
    const mt = primaryMetricType as MetricSourceType;
    if (ELASTIC_PRICE_PER_GB[mt] != null) {
      pricePerGB = ELASTIC_PRICE_PER_GB[mt];
    }
  }
  return pricePerGB;
}

export default function PlatformDetails({ platform, calculationContext }: PlatformDetailsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /** Rates like $/M or $/GB — avoid rounding $0.75 to “$1” */
  const formatUnitRate = (value: number, suffix: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value) + suffix;

  const totalInfra = platform.infrastructure
    ? Object.values(platform.infrastructure)
        .filter((v): v is number => typeof v === "number")
        .reduce((sum, val) => sum + val, 0)
    : 0;

  const isPlatform = (p: Platform | ObservabilityPlatform): p is Platform => {
    return 'metricTypes' in p;
  };

  /** Precompute so expanded metrics breakdown matches table infra + TCO */
  let metricsBreakdown:
    | {
        monthlyGB: number;
        effectivePricePerGB: number;
        volumeChargeGB: number;
        baseCluster: number;
        infraSubtotalFromGB: number;
        billableMetrics: number;
        metricsVolumeCharge: number;
        infraSubtotalFromMetrics: number;
        uniqueCustomMetrics?: number;
        customMetricsVolumeCharge?: number;
        datadogInfraHostCount?: number;
        datadogInfraHostCost?: number;
        datadogTotalSeries?: number;
        datadogHostCoveredSeries?: number;
        datadogIncludedCustomMetrics?: number;
        datadogBillableCustomMetrics?: number;
        elasticBreakdown?: ReturnType<typeof calculateElasticServerlessCost>;
        echBreakdown?: ReturnType<typeof calculateEchHotFrozenVolumeCost>;
      }
    | null = null;

  if (
    calculationContext &&
    calculationContext.monthlyMetrics !== undefined &&
    isPlatform(platform)
  ) {
    const monthlyGB = calculationContext.monthlyGB ?? 0;
    const effectivePricePerGB = getEffectiveMetricsPricePerGB(
      platform,
      calculationContext.primaryMetricType
    );
    const hasPerGB =
      platform.id === "elastic-serverless" ||
      platform.id === "elastic-ech" ||
      !!(platform.pricing.pricePerGB && platform.pricing.pricePerGB > 0);
    const baseCluster = platform.pricing.basePrice ?? 0;
    const volumeChargeGB = hasPerGB ? monthlyGB * effectivePricePerGB : 0;
    const computedInfraGB = hasPerGB ? baseCluster + volumeChargeGB : 0;
    const elasticBreakdown =
      platform.id === "elastic-serverless" && monthlyGB > 0
        ? calculateElasticServerlessMetricsCost(monthlyGB, {
            retentionMonths: calculationContext.elasticRetentionMonths ?? 1,
            useVolumeTiers: calculationContext.elasticUseVolumeTiers ?? true,
            productTier: "observability-complete",
          })
        : undefined;
    const echBreakdown =
      platform.id === "elastic-ech" && monthlyGB > 0
        ? calculateEchMetricsCost(monthlyGB)
        : undefined;
    const infraSubtotalFromElastic = elasticBreakdown?.volumeCost;
    const infraSubtotalFromEch = echBreakdown
      ? (platform.pricing.basePrice ?? 0) + echBreakdown.volumeCost
      : undefined;
    const billableMetrics = Math.max(
      0,
      calculationContext.monthlyMetrics - (platform.pricing.freeTier || 0)
    );
    const ppm = platform.pricing.pricePerMillionMetrics ?? 0;
    const pcm = platform.pricing.pricePerCustomMetricPerMonth ?? 0;
    const uniqueCustomMetrics =
      pcm > 0 ? monthlyDatapointsToUniqueCustomMetrics(billableMetrics) : 0;
    const datadogBreakdown =
      platform.id === "datadog" && pcm > 0
        ? calculateDatadogMetricsCostBreakdown(uniqueCustomMetrics, {
            infraHosts: calculationContext.datadogInfraHosts ?? 10,
            apmHosts: calculationContext.datadogApmHosts ?? calculationContext.datadogInfraHosts ?? 10,
            customMetricsIncludedPerHost:
              platform.pricing.customMetricsIncludedPerHost ?? DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST,
            pricePerInfraHostPerMonth:
              platform.pricing.pricePerInfraHostPerMonth ?? DATADOG_INFRA_HOST_PRO_USD_PER_MONTH,
          }, pcm)
        : undefined;
    const customMetricsVolumeCharge = datadogBreakdown?.customMetricsCost ?? (pcm > 0 ? uniqueCustomMetrics * pcm : 0);
    const datadogInfraHostCost = datadogBreakdown?.infraHostCost ?? 0;
    const metricsVolumeCharge =
      ppm > 0 ? (billableMetrics / 1_000_000) * ppm : 0;
    const infraSubtotalFromMetrics =
      pcm > 0
        ? calculationContext.infraCost ??
          datadogInfraHostCost + customMetricsVolumeCharge
        : ppm > 0
        ? calculationContext.infraCost ?? metricsVolumeCharge
        : 0;
    const infraSubtotalFromGB = hasPerGB
      ? calculationContext.infraCost ??
        (infraSubtotalFromElastic ?? infraSubtotalFromEch ?? computedInfraGB)
      : 0;

    metricsBreakdown = {
      monthlyGB,
      effectivePricePerGB,
      volumeChargeGB,
      baseCluster,
      infraSubtotalFromGB,
      billableMetrics,
      metricsVolumeCharge,
      infraSubtotalFromMetrics,
      uniqueCustomMetrics,
      customMetricsVolumeCharge,
      datadogInfraHostCount: datadogBreakdown?.infraHostCount,
      datadogInfraHostCost,
      datadogTotalSeries: datadogBreakdown?.totalSeriesEstimate,
      datadogHostCoveredSeries: datadogBreakdown?.hostCoveredSeries,
      datadogIncludedCustomMetrics: datadogBreakdown?.includedCustomMetrics,
      datadogBillableCustomMetrics: datadogBreakdown?.billableCustomMetrics,
      elasticBreakdown,
      echBreakdown,
    };
  }

  return (
    <div className="space-y-4">
      {/* Metric Types */}
      {isPlatform(platform) && platform.metricTypes && platform.metricTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Supported Metric Types
          </h4>
          <div className="flex flex-wrap gap-2">
            {platform.metricTypes.map((type) => (
              <span
                key={type}
                className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cardinality Note or Observability Notes */}
      {isPlatform(platform) && platform.cardinalityNote && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
            💡 Cardinality Impact on TCO
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {platform.cardinalityNote}
          </p>
        </div>
      )}
      {(platform as ObservabilityPlatform).notes && (
        <>
          {(platform as ObservabilityPlatform).notes?.tracing && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                💡 Tracing/APM Details
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(platform as ObservabilityPlatform).notes?.tracing}
              </p>
            </div>
          )}
          {(platform as ObservabilityPlatform).notes?.logs && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                💡 Logs Details
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(platform as ObservabilityPlatform).notes?.logs}
              </p>
            </div>
          )}
          {(platform as ObservabilityPlatform).notes?.security && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                💡 Security Details
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {(platform as ObservabilityPlatform).notes?.security}
              </p>
            </div>
          )}
        </>
      )}

      {/* TCO Calculation Breakdown for Metrics */}
      {calculationContext &&
       calculationContext.monthlyMetrics !== undefined &&
       isPlatform(platform) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-3">
            📊 TCO Calculation Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            {/* Volume */}
            {calculationContext.metricsPerSecond !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Metrics per Second:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {calculationContext.metricsPerSecond >= 1_000_000
                    ? `${(calculationContext.metricsPerSecond / 1_000_000).toFixed(2)}M/sec`
                    : calculationContext.metricsPerSecond >= 1_000
                    ? `${(calculationContext.metricsPerSecond / 1_000).toFixed(1)}K/sec`
                    : `${calculationContext.metricsPerSecond.toFixed(1)}/sec`}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Monthly Metrics:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.monthlyMetrics >= 1_000_000_000_000
                  ? `${(calculationContext.monthlyMetrics / 1_000_000_000_000).toFixed(2)}T`
                  : calculationContext.monthlyMetrics >= 1_000_000_000
                  ? `${(calculationContext.monthlyMetrics / 1_000_000_000).toFixed(2)}B`
                  : calculationContext.monthlyMetrics >= 1_000_000
                  ? `${(calculationContext.monthlyMetrics / 1_000_000).toFixed(2)}M`
                  : calculationContext.monthlyMetrics >= 1_000
                  ? `${(calculationContext.monthlyMetrics / 1_000).toFixed(1)}K`
                  : calculationContext.monthlyMetrics.toLocaleString()}
              </span>
            </div>

            {/* Per-GB pricing (Elastic Serverless, ECH) */}
            {metricsBreakdown &&
             (platform.id === "elastic-serverless" ||
              platform.id === "elastic-ech" ||
              (platform.pricing.pricePerGB && platform.pricing.pricePerGB > 0)) && (
              <>
                <div className="pt-1 border-t border-blue-100 dark:border-blue-800/50" />
                {calculationContext.bytesPerDatapoint && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      Bytes per Datapoint ({calculationContext.primaryMetricType ?? "Mixed"}):
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {calculationContext.bytesPerDatapoint} B
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Monthly ingest GB:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {metricsBreakdown.monthlyGB >= 1000
                      ? `${(metricsBreakdown.monthlyGB / 1000).toFixed(2)} TB`
                      : `${metricsBreakdown.monthlyGB.toFixed(2)} GB`}
                  </span>
                </div>
                {metricsBreakdown.elasticBreakdown ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        Stored GB ({calculationContext.elasticRetentionMonths ?? 1} mo retention):
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {metricsBreakdown.elasticBreakdown.storedGB.toFixed(2)} GB
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Ingest charge:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metricsBreakdown.elasticBreakdown.ingestCost)}/month
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Retention charge:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metricsBreakdown.elasticBreakdown.retentionCost)}/month
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {metricsBreakdown.elasticBreakdown.ingestRateLabel};{" "}
                      {metricsBreakdown.elasticBreakdown.retentionRateLabel}. TSDS metrics on Serverless: 25% of
                      Observability Complete tier table × 25% for TSDS metrics.
                    </p>
                  </>
                ) : metricsBreakdown.echBreakdown ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">TSDS metrics ingest + retention:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        Included (no additional charge)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Metrics in TSDS index mode on ECH are included at no additional ingest/retention cost at this
                      time. This tab models the cluster minimum only.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Price per GB (effective):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatUnitRate(metricsBreakdown.effectivePricePerGB, "/GB")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Ingest / volume charge:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metricsBreakdown.volumeChargeGB)}/month
                      </span>
                    </div>
                  </>
                )}
                {metricsBreakdown.baseCluster > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Base cluster (minimum):</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(metricsBreakdown.baseCluster)}/month
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Infrastructure subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(metricsBreakdown.infraSubtotalFromGB)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Volume + base matches the table’s infrastructure line (before operational FTE, if any).
                </p>
              </>
            )}

            {/* Per-custom-metric-series pricing (Datadog) */}
            {platform.pricing.pricePerCustomMetricPerMonth !== undefined &&
             platform.pricing.pricePerCustomMetricPerMonth > 0 &&
             metricsBreakdown && (
              <>
                <div className="pt-1 border-t border-blue-100 dark:border-blue-800/50" />
                {(metricsBreakdown.datadogInfraHostCount ?? 0) > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Infrastructure Pro hosts:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {metricsBreakdown.datadogInfraHostCount!.toLocaleString()} ×{" "}
                        {formatUnitRate(
                          platform.pricing.pricePerInfraHostPerMonth ?? DATADOG_INFRA_HOST_PRO_USD_PER_MONTH,
                          "/host/mo"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Infra host charge:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metricsBreakdown.datadogInfraHostCost ?? 0)}/month
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total series estimate (metrics/sec):</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(() => {
                      const n = metricsBreakdown.datadogTotalSeries ?? metricsBreakdown.uniqueCustomMetrics ?? 0;
                      return n >= 1_000_000
                        ? `${(n / 1_000_000).toFixed(2)}M series`
                        : n >= 1_000
                        ? `${(n / 1_000).toFixed(1)}K series`
                        : `${Math.round(n).toLocaleString()} series`;
                    })()}
                  </span>
                </div>
                {(metricsBreakdown.datadogHostCoveredSeries ?? 0) > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span>Covered by agent/host license (est.):</span>
                    <span className="font-semibold">
                      {metricsBreakdown.datadogHostCoveredSeries!.toLocaleString()} series
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Billable custom metric series:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {(metricsBreakdown.datadogBillableCustomMetrics ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">List rate:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatUnitRate(platform.pricing.pricePerCustomMetricPerMonth, "/series/mo")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Estimated custom metrics charge:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(metricsBreakdown.customMetricsVolumeCharge ?? 0)}/month
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Infrastructure subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(metricsBreakdown.infraSubtotalFromMetrics)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Infra Pro hosts + billable custom metrics beyond agent coverage (~500 series/host) and 100 included custom metrics per host. Host count from inventory or logs GB/day only.
                </p>
              </>
            )}

            {/* Per-million-metrics pricing (New Relic, Grafana, etc.) */}
            {platform.pricing.pricePerMillionMetrics !== undefined &&
             platform.pricing.pricePerMillionMetrics > 0 &&
             metricsBreakdown && (
              <>
                <div className="pt-1 border-t border-blue-100 dark:border-blue-800/50" />
                {platform.pricing.freeTier !== undefined && platform.pricing.freeTier > 0 && (
                  <>
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                      <span>Free Tier:</span>
                      <span className="font-semibold">
                        {platform.pricing.freeTier >= 1_000_000_000
                          ? `${(platform.pricing.freeTier / 1_000_000_000).toFixed(0)}B metrics`
                          : platform.pricing.freeTier >= 1_000_000
                          ? `${(platform.pricing.freeTier / 1_000_000).toFixed(0)}M metrics`
                          : `${platform.pricing.freeTier.toLocaleString()} metrics`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Billable Metrics:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {(() => {
                          const billable = Math.max(0, calculationContext.monthlyMetrics! - platform.pricing.freeTier!);
                          return billable >= 1_000_000_000
                            ? `${(billable / 1_000_000_000).toFixed(2)}B`
                            : billable >= 1_000_000
                            ? `${(billable / 1_000_000).toFixed(2)}M`
                            : billable >= 1_000
                            ? `${(billable / 1_000).toFixed(1)}K`
                            : billable.toLocaleString();
                        })()}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Blended rate (model):</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatUnitRate(platform.pricing.pricePerMillionMetrics, "/M")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Estimated metrics charge:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(metricsBreakdown.metricsVolumeCharge)}/month
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Infrastructure subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(metricsBreakdown.infraSubtotalFromMetrics)}/month
                  </span>
                </div>
                {platform.id === "observe-inc" && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Observe charges $0.008/DPM (Data Points per Minute). $0.185/M metrics = $0.008 × (1M ÷ 43,200 datapoints/DPM)
                  </p>
                )}
              </>
            )}

            {/* Fixed infrastructure (self-hosted) */}
            {platform.pricing.basePrice !== undefined &&
             platform.pricing.basePrice > 0 &&
             !platform.pricing.pricePerGB &&
             !platform.pricing.pricePerMillionMetrics &&
             !platform.pricing.pricePerCustomMetricPerMonth && (
              <>
                <div className="pt-1 border-t border-blue-100 dark:border-blue-800/50" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fixed Infrastructure Cost:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.basePrice)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Self-hosted — fixed monthly cost regardless of metric volume (see breakdown below)
                </p>
              </>
            )}

            {(calculationContext.operationalCost ?? 0) > 0 && (
              <div className="flex justify-between items-center text-amber-800 dark:text-amber-200">
                <span>Operational burden (est. FTE):</span>
                <span className="font-semibold">
                  +{formatCurrency(calculationContext.operationalCost!)}/month
                </span>
              </div>
            )}

            {/* Total */}
            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-blue-900 dark:text-blue-200">Total monthly TCO:</span>
                <span className="text-blue-900 dark:text-blue-200 text-lg">
                  {formatCurrency(calculationContext.cost)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Same total as the comparison table (infrastructure + operational, when applicable).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TCO Calculation Breakdown for Tracing */}
      {calculationContext && 
       calculationContext.spansPerSecond !== undefined && 
       !isPlatform(platform) &&
       platform.pricing?.tracing && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-3">
            📊 TCO Calculation Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Spans per Second:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.spansPerSecond.toLocaleString()}/sec
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Monthly Spans:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.monthlySpans ? 
                  calculationContext.monthlySpans >= 1_000_000_000
                    ? `${(calculationContext.monthlySpans / 1_000_000_000).toFixed(2)}B`
                    : calculationContext.monthlySpans >= 1_000_000
                    ? `${(calculationContext.monthlySpans / 1_000_000).toFixed(2)}M`
                    : calculationContext.monthlySpans >= 1_000
                    ? `${(calculationContext.monthlySpans / 1_000).toFixed(2)}K`
                    : calculationContext.monthlySpans.toLocaleString()
                  : 'N/A'}
              </span>
            </div>
            {/* Show trace-based pricing if platform uses pricePerMillionTraces */}
            {platform.pricing.tracing.pricePerMillionTraces && calculationContext.monthlyTraces !== undefined && (
              <>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Traces:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {calculationContext.monthlyTraces >= 1_000_000_000
                        ? `${(calculationContext.monthlyTraces / 1_000_000_000).toFixed(2)}B`
                        : calculationContext.monthlyTraces >= 1_000_000
                        ? `${(calculationContext.monthlyTraces / 1_000_000).toFixed(2)}M`
                        : calculationContext.monthlyTraces >= 1_000
                        ? `${(calculationContext.monthlyTraces / 1_000).toFixed(2)}K`
                        : calculationContext.monthlyTraces.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Price per Million Traces:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(platform.pricing.tracing.pricePerMillionTraces)}/M traces
                    </span>
                  </div>
                </div>
              </>
            )}
            {/* Datadog APM host licensing */}
            {platform.id === "datadog-tracing" && calculationContext.datadogApmHosts !== undefined && (
              <>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-700" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">APM Pro hosts:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {calculationContext.datadogApmHosts.toLocaleString()} ×{" "}
                    {formatUnitRate(DATADOG_APM_HOST_PRO_USD_PER_MONTH, "/host/mo")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">APM host charge:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(calculateDatadogApmHostCost(calculationContext.datadogApmHosts))}/month
                  </span>
                </div>
              </>
            )}
            {/* Show span-based pricing for other platforms */}
            {platform.pricing.tracing.pricePerMillionSpans && platform.id !== "datadog-tracing" && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Price per Million Spans:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.pricing.tracing.pricePerMillionSpans)}/M spans
                </span>
              </div>
            )}
            {/* Show GB-based pricing */}
            {platform.pricing.tracing.pricePerGB && platform.pricing.tracing.pricePerGB > 0 && (
              <>
                {calculationContext.monthlyGB !== undefined && calculationContext.monthlyGB > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Monthly GB (calculated):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {calculationContext.monthlyGB.toFixed(2)} GB
                      </span>
                    </div>
                    {(platform.id === "elastic-tracing" || platform.id === "elastic-ech-tracing") &&
                      calculationContext.elasticRetentionMonths !== undefined && (
                      <>
                        {platform.id === "elastic-ech-tracing" ? (
                          (() => {
                            const ech = calculateEchHotFrozenVolumeCost(calculationContext.monthlyGB!);
                            return (
                              <>
                                <div className="flex justify-between items-center text-blue-800 dark:text-blue-200">
                                  <span>ECH architecture:</span>
                                  <span className="font-semibold">{ECH_HOT_FROZEN_ARCHITECTURE.summary}</span>
                                </div>
                                {ech.echHotFrozen && (
                                  <>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600 dark:text-gray-400">Hot tier (1d RAM-hour):</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(ech.echHotFrozen.hotCapacityCost)}/month
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600 dark:text-gray-400">ILM blob (writable frozen):</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(ech.echHotFrozen.blobStorageCost)}/month
                                      </span>
                                    </div>
                                    {(ech.echHotFrozen.dataTransferCost ?? 0) > 0 && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400">Data transfer:</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                          {formatCurrency(ech.echHotFrozen.dataTransferCost)}/month
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                              Stored GB ({calculationContext.elasticRetentionMonths} mo retention):
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {(calculationContext.monthlyGB * calculationContext.elasticRetentionMonths).toFixed(2)} GB
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {platform.pricing.tracing.freeTier && platform.pricing.tracing.freeTier > 0 && (
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span>Free Tier:</span>
                        <span className="font-semibold">-{platform.pricing.tracing.freeTier.toLocaleString()} spans</span>
                      </div>
                    )}
                  </>
                )}
                {platform.id !== "elastic-ech-tracing" && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Price per GB:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.tracing.pricePerGB)}/GB
                  </span>
                </div>
                )}
              </>
            )}
            {platform.pricing.tracing.basePrice && platform.pricing.tracing.basePrice > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fixed Infrastructure Cost:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.tracing.basePrice)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  Self-hosted solution with fixed monthly infrastructure costs (see breakdown below)
                </p>
              </>
            )}
            <div className="pt-2 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-blue-900 dark:text-blue-200">Total Monthly Cost:</span>
                <span className="text-blue-900 dark:text-blue-200 text-lg">
                  {formatCurrency(calculationContext.cost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TCO Calculation Breakdown for Logs */}
      {calculationContext &&
       calculationContext.monthlyGB !== undefined &&
       calculationContext.gbPerDay !== undefined &&
       !isPlatform(platform) &&
       platform.pricing?.logs && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-green-900 dark:text-green-200 uppercase tracking-wide mb-3">
            📊 TCO Calculation Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Log volume:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.gbPerDay.toFixed(1)} GB/day · {calculationContext.monthlyGB.toFixed(0)} GB/mo (raw)
              </span>
            </div>
            {(() => {
              const pricingCtx = {
                elastic: {
                  retentionMonths: calculationContext.elasticRetentionMonths ?? 1,
                  useVolumeTiers: calculationContext.elasticUseVolumeTiers ?? true,
                },
                datadog: DEFAULT_TCO_PRICING_CONTEXT.datadog,
                dynatrace: DEFAULT_TCO_PRICING_CONTEXT.dynatrace,
                streams:
                  calculationContext.elasticStreamsTco ?? DEFAULT_TCO_PRICING_CONTEXT.streams,
              };
              const breakdown = calculateLogsCostBreakdown(
                platform,
                calculationContext.monthlyGB!,
                pricingCtx
              );
              return (
                <>
                  {platform.id === "elastic-logs" && breakdown.meteredMonthlyGB !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Metered ingest (est. ~1.66× enriched):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {breakdown.streamsAdjustment?.applied
                          ? `${breakdown.streamsAdjustment.billableMonthlyIngestGB.toFixed(0)} GB/mo (after Streams)`
                          : `${breakdown.meteredMonthlyGB.toFixed(0)} GB/mo`}
                      </span>
                    </div>
                  )}
                  {breakdown.streamsAdjustment?.applied && (
                    <div className="flex justify-between items-center text-violet-700 dark:text-violet-300">
                      <span>Streams TCO policy:</span>
                      <span className="font-semibold">
                        {breakdown.streamsAdjustment.retentionDays}d retention
                        {breakdown.streamsSavingsPercent
                          ? ` · ~${Math.round(breakdown.streamsSavingsPercent)}% volume savings`
                          : ""}
                      </span>
                    </div>
                  )}
                  {platform.id === "datadog-logs" && platform.pricing.logs?.freeTier ? (
                    <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                      <span>Ingest free tier:</span>
                      <span className="font-semibold">{platform.pricing.logs.freeTier} GB/mo</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {platform.id === "datadog-logs" ? "Log ingest:" : "Ingest charge:"}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(breakdown.ingestCost)}/month
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">
                      {platform.id === "datadog-logs"
                        ? `Standard Index (${platform.pricing.logs?.indexRetentionDays ?? 15}-day):`
                        : platform.id === "dynatrace-logs"
                        ? `Grail retention (${platform.pricing.logs?.logRetentionDays ?? 30}-day):`
                        : "Retention charge:"}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(breakdown.indexCost)}/month
                    </span>
                  </div>
                  {platform.id === "dynatrace-logs" && (breakdown.queryCost ?? 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">
                        DQL query scan (est.):
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(breakdown.queryCost!)}/month
                      </span>
                    </div>
                  )}
                  {platform.id === "datadog-logs" && breakdown.indexedEvents > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      ~{(breakdown.indexedEvents / 1_000_000).toFixed(0)}M indexed events/mo @{" "}
                      {formatUnitRate(
                        platform.pricing.logs?.pricePerMillionIndexedEvents ??
                          DATADOG_LOG_INDEX_RATE_PER_M_EVENTS[15],
                        "/M events"
                      )}{" "}
                      (assumes all ingested logs indexed).
                    </p>
                  )}
                  {platform.id === "elastic-logs" && breakdown.elasticBreakdown && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      {breakdown.elasticBreakdown.ingestRateLabel}; {breakdown.elasticBreakdown.retentionRateLabel}. Source: Observability Complete pricing table.
                    </p>
                  )}
                  {platform.id === "elastic-ech-logs" && breakdown.elasticBreakdown && (
                    <>
                      <div className="flex justify-between items-center text-blue-800 dark:text-blue-200">
                        <span>ECH architecture:</span>
                        <span className="font-semibold">{ECH_HOT_FROZEN_ARCHITECTURE.summary}</span>
                      </div>
                      {breakdown.elasticBreakdown.echHotFrozen && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Hot tier (1d RAM-hour):</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(breakdown.elasticBreakdown.echHotFrozen.hotCapacityCost)}/month
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">ILM blob (writable frozen):</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(breakdown.elasticBreakdown.echHotFrozen.blobStorageCost)}/month
                            </span>
                          </div>
                        </>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {breakdown.elasticBreakdown.ingestRateLabel}; {breakdown.elasticBreakdown.retentionRateLabel}.
                        Full-fidelity ingest (no Streams sampling on ECH). Rates from{" "}
                        <a href="https://cloud.elastic.co/cloud-pricing-table" className="underline" target="_blank" rel="noopener noreferrer">
                          cloud.elastic.co
                        </a>
                        .
                      </p>
                    </>
                  )}
                  {platform.id === "dynatrace-logs" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Grail Pay-per-Query (DPS): $0.20/GiB ingest + $0.0007/GiB-day ×{" "}
                      {platform.pricing.logs?.logRetentionDays ?? 30} days + $0.0035/GiB scanned
                      {breakdown.queryScanGB != null
                        ? ` (~${breakdown.queryScanGB.toFixed(0)} GiB scanned/mo assumed)`
                        : ""}
                      . Elasticsearch-compatible indexing in many deployments.
                    </p>
                  )}
                </>
              );
            })()}
            <div className="pt-2 border-t border-green-200 dark:border-green-700">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-green-900 dark:text-green-200">Total Monthly Cost:</span>
                <span className="text-green-900 dark:text-green-200 text-lg">
                  {formatCurrency(calculationContext.cost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TCO Calculation Breakdown for Security */}
      {calculationContext && 
       calculationContext.eventsPerSecond !== undefined && 
       !isPlatform(platform) &&
       platform.pricing?.security && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-purple-900 dark:text-purple-200 uppercase tracking-wide mb-3">
            📊 TCO Calculation Breakdown
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Events per Second:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.eventsPerSecond.toLocaleString()}/sec
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Monthly Events:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculationContext.monthlyEvents ? 
                  calculationContext.monthlyEvents >= 1_000_000_000
                    ? `${(calculationContext.monthlyEvents / 1_000_000_000).toFixed(2)}B`
                    : calculationContext.monthlyEvents >= 1_000_000
                    ? `${(calculationContext.monthlyEvents / 1_000_000).toFixed(2)}M`
                    : calculationContext.monthlyEvents >= 1_000
                    ? `${(calculationContext.monthlyEvents / 1_000).toFixed(2)}K`
                    : calculationContext.monthlyEvents.toLocaleString()
                  : 'N/A'}
              </span>
            </div>
            {/* Always show Monthly GB and Price per GB for volume-based pricing */}
            {platform.pricing.security.pricePerGB !== undefined && platform.pricing.security.pricePerGB > 0 && (
              <>
                {calculationContext.monthlyGB !== undefined && calculationContext.monthlyGB > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Monthly GB (calculated):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {calculationContext.monthlyGB.toFixed(2)} GB
                      </span>
                    </div>
                    {platform.pricing.security.freeTier && platform.pricing.security.freeTier > 0 && (
                      <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                        <span>Free Tier:</span>
                        <span className="font-semibold">-{platform.pricing.security.freeTier} GB</span>
                      </div>
                    )}
                    {platform.pricing.security.freeTier && platform.pricing.security.freeTier > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Billable GB:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {Math.max(0, calculationContext.monthlyGB - (platform.pricing.security.freeTier || 0)).toFixed(2)} GB
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Price per GB:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.security.pricePerGB)}/GB
                  </span>
                </div>
              </>
            )}
            {platform.id === "dynatrace-security" && (() => {
              const dt = calculateSecurityCostBreakdown(
                platform,
                calculationContext.monthlyEvents ?? 0,
                {
                  ...DEFAULT_TCO_PRICING_CONTEXT,
                  dynatrace: {
                    ...DEFAULT_TCO_PRICING_CONTEXT.dynatrace,
                    appSecHosts: calculationContext.monitoredHosts ?? 10,
                  },
                }
              ).dynatraceAppSec;
              if (!dt) return null;
              return (
                <>
                  <div className="pt-1 border-t border-purple-100 dark:border-purple-800/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Monitored hosts (AppSec):</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {dt.hosts.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Memory per host (assumed):</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {dt.memoryGiBPerHost} GiB
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Memory-GiB-hours / month:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {dt.monthlyMemoryGiBHours.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatUnitRate(DYNATRACE_APPSEC_USD_PER_MEMORY_GIB_HOUR, "/memory-GiB-hour")}
                    </span>
                  </div>
                  {dt.rvaCost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Runtime Vulnerability Analytics:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(dt.rvaCost)}/month
                      </span>
                    </div>
                  )}
                  {dt.rapCost > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Runtime Application Protection:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(dt.rapCost)}/month
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Runtime application security (not SIEM). Host count follows infrastructure inventory. RAP is off by default (~2× if both RVA+RAP enabled).
                  </p>
                </>
              );
            })()}
            {platform.pricing.security.basePrice && platform.pricing.security.basePrice > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Fixed Infrastructure Cost:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(platform.pricing.security.basePrice)}/month
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  Self-hosted solution with fixed monthly infrastructure costs (see breakdown below)
                </p>
              </>
            )}
            <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-purple-900 dark:text-purple-200">Total Monthly Cost:</span>
                <span className="text-purple-900 dark:text-purple-200 text-lg">
                  {formatCurrency(calculationContext.cost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Infrastructure Breakdown */}
      {platform.infrastructure && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Infrastructure Cost Breakdown
          </h4>
          <div className="space-y-2">
            {platform.infrastructure.compute && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Compute (CPU/Hosts)</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.compute)}
                </span>
              </div>
            )}
            {platform.infrastructure.storage && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Storage</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.storage)}
                </span>
              </div>
            )}
            {platform.infrastructure.memory && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Memory</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.memory)}
                </span>
              </div>
            )}
            {platform.infrastructure.network && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Network</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.network)}
                </span>
              </div>
            )}
            {platform.infrastructure.other && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Other (Ops/Backup)</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(platform.infrastructure.other)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-gray-900 dark:text-white">Total Infrastructure</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(totalInfra)}
                </span>
              </div>
            </div>
            {platform.infrastructure.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                {platform.infrastructure.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

