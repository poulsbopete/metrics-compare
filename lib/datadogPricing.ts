/**
 * Datadog host + custom metric list rates (annual contract, US list).
 * Source: datadoghq.com/pricing/list
 */

export const DATADOG_INFRA_HOST_PRO_USD_PER_MONTH = 15;
export const DATADOG_APM_HOST_PRO_USD_PER_MONTH = 31;
/** Included custom metric time series per Infrastructure Pro host / month. */
export const DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST = 100;

export interface DatadogHostPricingOptions {
  infraHosts: number;
  apmHosts: number;
  pricePerInfraHostPerMonth?: number;
  pricePerApmHostPerMonth?: number;
  customMetricsIncludedPerHost?: number;
}

export const DEFAULT_DATADOG_HOST_PRICING: DatadogHostPricingOptions = {
  infraHosts: 10,
  apmHosts: 10,
  pricePerInfraHostPerMonth: DATADOG_INFRA_HOST_PRO_USD_PER_MONTH,
  pricePerApmHostPerMonth: DATADOG_APM_HOST_PRO_USD_PER_MONTH,
  customMetricsIncludedPerHost: DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST,
};

export interface DatadogMetricsCostBreakdown {
  infraHostCount: number;
  infraHostCost: number;
  uniqueCustomMetrics: number;
  includedCustomMetrics: number;
  billableCustomMetrics: number;
  customMetricsCost: number;
}

export function calculateDatadogMetricsCostBreakdown(
  uniqueCustomMetricSeries: number,
  hosts: DatadogHostPricingOptions = DEFAULT_DATADOG_HOST_PRICING,
  pricePerCustomMetricPerMonth = 0.05
): DatadogMetricsCostBreakdown {
  const infraHostCount = Math.max(0, hosts.infraHosts);
  const includedPerHost = hosts.customMetricsIncludedPerHost ?? DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST;
  const includedCustomMetrics = infraHostCount * includedPerHost;
  const billableCustomMetrics = Math.max(0, uniqueCustomMetricSeries - includedCustomMetrics);
  const infraHostCost =
    infraHostCount * (hosts.pricePerInfraHostPerMonth ?? DATADOG_INFRA_HOST_PRO_USD_PER_MONTH);
  const customMetricsCost = billableCustomMetrics * pricePerCustomMetricPerMonth;

  return {
    infraHostCount,
    infraHostCost,
    uniqueCustomMetrics: uniqueCustomMetricSeries,
    includedCustomMetrics,
    billableCustomMetrics,
    customMetricsCost,
  };
}

export function calculateDatadogApmHostCost(
  apmHosts: number,
  pricePerApmHostPerMonth = DATADOG_APM_HOST_PRO_USD_PER_MONTH
): number {
  return Math.max(0, apmHosts) * pricePerApmHostPerMonth;
}
