/**
 * Dynatrace Application Security (DPS) — memory-GiB-hour billing.
 * @see https://www.dynatrace.com/pricing/rate-card/
 * @see https://docs.dynatrace.com/docs/license/capabilities/application-security/
 */

export const DYNATRACE_APPSEC_USD_PER_MEMORY_GIB_HOUR = 0.00225;
export const DYNATRACE_DEFAULT_MEMORY_GIB_PER_HOST = 8;
/** Minimum billable memory per monitored instance (rounded per 15-min interval). */
export const DYNATRACE_APPSEC_MIN_MEMORY_GIB = 4;

const HOURS_PER_MONTH = 30 * 24;

export interface DynatraceAppSecPricingOptions {
  /** Hosts/containers with AppSec enabled (often ≈ infra fleet size). */
  appSecHosts: number;
  memoryGiBPerHost: number;
  runtimeVulnerabilityAnalytics: boolean;
  runtimeApplicationProtection: boolean;
}

export const DEFAULT_DYNATRACE_APPSEC_PRICING: DynatraceAppSecPricingOptions = {
  appSecHosts: 10,
  memoryGiBPerHost: DYNATRACE_DEFAULT_MEMORY_GIB_PER_HOST,
  runtimeVulnerabilityAnalytics: true,
  runtimeApplicationProtection: false,
};

export interface DynatraceAppSecCostBreakdown {
  hosts: number;
  memoryGiBPerHost: number;
  monthlyMemoryGiBHours: number;
  rvaCost: number;
  rapCost: number;
  totalCost: number;
}

export function calculateDynatraceAppSecCostBreakdown(
  options: DynatraceAppSecPricingOptions = DEFAULT_DYNATRACE_APPSEC_PRICING,
  ratePerMemoryGiBHour = DYNATRACE_APPSEC_USD_PER_MEMORY_GIB_HOUR
): DynatraceAppSecCostBreakdown {
  const hosts = Math.max(0, options.appSecHosts);
  const memoryGiBPerHost = Math.max(DYNATRACE_APPSEC_MIN_MEMORY_GIB, options.memoryGiBPerHost);
  const monthlyMemoryGiBHours = hosts * memoryGiBPerHost * HOURS_PER_MONTH;

  const rvaCost = options.runtimeVulnerabilityAnalytics
    ? monthlyMemoryGiBHours * ratePerMemoryGiBHour
    : 0;
  const rapCost = options.runtimeApplicationProtection
    ? monthlyMemoryGiBHours * ratePerMemoryGiBHour
    : 0;

  return {
    hosts,
    memoryGiBPerHost,
    monthlyMemoryGiBHours,
    rvaCost,
    rapCost,
    totalCost: rvaCost + rapCost,
  };
}

export function calculateDynatraceAppSecCost(
  options: DynatraceAppSecPricingOptions = DEFAULT_DYNATRACE_APPSEC_PRICING
): number {
  return calculateDynatraceAppSecCostBreakdown(options).totalCost;
}

/** List-rate shortcut: ~$13/mo per 8 GiB host for one AppSec capability. */
export function dynatraceAppSecCostPerHostPerMonth(
  memoryGiBPerHost = DYNATRACE_DEFAULT_MEMORY_GIB_PER_HOST,
  capabilities = 1
): number {
  return (
    memoryGiBPerHost *
    HOURS_PER_MONTH *
    DYNATRACE_APPSEC_USD_PER_MEMORY_GIB_HOUR *
    capabilities
  );
}
