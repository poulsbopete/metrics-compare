import { integrations } from "./infrastructureData";

/** Integrations that map ~1:1 to a Datadog Infrastructure / APM host license. */
const HOST_INTEGRATION_IDS = new Set([
  "linux",
  "windows",
  "k8s-node",
  "vsphere-host",
  "ecs-task",
]);

const LINUX_GB_PER_DAY_PER_HOST = 0.04;

/**
 * Estimate monitored host count for Datadog infra + APM SKUs.
 * Prefers infrastructure inventory; falls back to GB/day heuristics (Linux server baseline).
 */
export function estimateMonitoredHosts(
  infraItems: Record<string, number>,
  options?: { metricsGbPerDay?: number; logsGbPerDay?: number }
): number {
  let fromInfra = 0;
  for (const [id, count] of Object.entries(infraItems)) {
    if (HOST_INTEGRATION_IDS.has(id) && count > 0) {
      fromInfra += count;
    }
  }
  if (fromInfra > 0) return fromInfra;

  const gbCandidates = [
    options?.metricsGbPerDay ?? 0,
    options?.logsGbPerDay ?? 0,
  ].filter((v) => v > 0);

  if (gbCandidates.length > 0) {
    const maxGb = Math.max(...gbCandidates);
    return Math.max(1, Math.round(maxGb / LINUX_GB_PER_DAY_PER_HOST));
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
