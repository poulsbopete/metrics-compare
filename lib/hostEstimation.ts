import { integrations } from "./infrastructureData";

/** Integrations that map ~1:1 to a Datadog Infrastructure / APM host license. */
const HOST_INTEGRATION_IDS = new Set([
  "linux",
  "windows",
  "k8s-node",
  "vsphere-host",
  "ecs-task",
]);

/** Linux server log baseline for inferring host count from log GB/day only. */
const LINUX_GB_PER_DAY_PER_HOST = 0.04;

export interface EstimateMonitoredHostsOptions {
  /** Raw log ingest GB/day — safe proxy for host count. */
  logsGbPerDay?: number;
}

/**
 * Estimate monitored host count for Datadog infra + APM SKUs.
 * Uses infrastructure inventory first, then log volume heuristic.
 *
 * Does NOT use metrics GB/day — high metrics/sec (e.g. 720K/s) implies telemetry
 * volume, not 400K+ hosts, and would wildly overstate Datadog host licensing.
 */
export function estimateMonitoredHosts(
  infraItems: Record<string, number>,
  options?: EstimateMonitoredHostsOptions
): number {
  let fromInfra = 0;
  for (const [id, count] of Object.entries(infraItems)) {
    if (HOST_INTEGRATION_IDS.has(id) && count > 0) {
      fromInfra += count;
    }
  }
  if (fromInfra > 0) return fromInfra;

  const logsGbPerDay = options?.logsGbPerDay ?? 0;
  if (logsGbPerDay > 0) {
    return Math.max(1, Math.round(logsGbPerDay / LINUX_GB_PER_DAY_PER_HOST));
  }

  return 10;
}

/** GB/day implied by infrastructure inventory (for display). */
export function infrastructureGbPerDay(infraItems: Record<string, number>): number {
  return Object.entries(infraItems).reduce((total, [id, count]) => {
    const integration = integrations.find((i) => i.id === id);
    return total + (integration?.gbPerDayPerUnit ?? 0) * count;
  }, 0);
}
