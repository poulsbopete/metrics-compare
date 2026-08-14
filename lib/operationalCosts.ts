// Operational cost estimates for each platform.
//
// Expressed as FTE (fraction of a full-time engineer) per month required to
// operate, maintain, patch, scale, and troubleshoot the *platform* itself.
//
// Default fully-loaded engineer rate: $120/hr × 160 hrs/month = $19,200/FTE/month
// ($120/hr ≈ $250k/year fully-loaded including salary, benefits, overhead)
//
// Fully managed SaaS:  0 FTE — vendor runs the service; no platform ops burden
// Managed cloud (ECH): 0.05 FTE — light cluster oversight / upgrades
// Self-hosted light:   0.20 FTE — ops, patching, basic scaling
// Self-hosted medium:  0.30 FTE — distributed system ops, capacity planning
// Self-hosted heavy:   0.50 FTE — complex multi-component infra, expertise required

export const DEFAULT_ENGINEER_HOURLY_RATE = 120; // $/hr fully-loaded
export const HOURS_PER_MONTH = 160;

// FTE per month per platform ID
export const OPERATIONAL_FTE: Record<string, number> = {
  // ── Elastic Serverless (fully managed SaaS — no platform ops burden) ─────
  "elastic-serverless":       0,
  "elastic-tracing":          0,
  "elastic-logs":             0,
  "elastic-security":         0,

  // ── Elastic Cloud Hosted (managed — light cluster oversight) ─────────────
  "elastic-ech":              0.05,
  "elastic-ech-tracing":      0.05,
  "elastic-ech-logs":         0.05,
  "elastic-security-ech":     0.05,

  // ── Elastic Self-hosted ───────────────────────────────────────────────────
  "elastic-self-hosted":          0.30,
  "elastic-apm-self-hosted":      0.30,
  "elasticsearch-logs":           0.30,
  "elastic-security-self-hosted": 0.35,

  // ── Datadog / New Relic / Dynatrace / Splunk O11y (SaaS) ──────────────────
  "datadog":           0,
  "datadog-tracing":   0,
  "datadog-logs":      0,
  "datadog-security":  0,

  "new-relic":         0,
  "new-relic-tracing": 0,
  "new-relic-logs":    0,

  "dynatrace":         0,
  "dynatrace-tracing": 0,
  "dynatrace-logs":    0,
  "dynatrace-security": 0,

  "splunk-o11y":   0,
  "splunk-tracing": 0,
  "splunk-logs":   0,
  "splunk-security": 0,

  // ── Splunk Cloud (managed but complex configuration) ──────────────────────
  "splunk-cloud-logs":     0.15,
  "splunk-cloud-security": 0.15,

  // ── Splunk Core (Self-hosted) — requires dedicated Splunk admin ───────────
  "splunk-core-logs":     0.50,
  "splunk-core-security": 0.50,

  // ── Grafana Cloud & other SaaS ────────────────────────────────────────────
  "grafana-cloud":   0,
  "grafana-tracing": 0,
  "grafana-logs":    0,

  "honeycomb-tracing": 0,
  "chronosphere":      0,
  "observe-inc":       0,
  "observe-logs":      0,

  "clickstack-managed":  0,
  "clickstack-tracing":  0,
  "clickstack-logs":     0,

  // ── Self-hosted light (single binary, minimal ops) ────────────────────────
  "victoria-metrics":  0.20,
  "jaeger-self-hosted": 0.20,

  // ── Self-hosted medium ────────────────────────────────────────────────────
  "prometheus":       0.30,
  "tempo-self-hosted": 0.25,
  "loki-self-hosted": 0.30,

  // ── Self-hosted heavy (complex distributed systems) ───────────────────────
  "thanos":          0.50,
  "cortex":          0.50,
  "clickhouse-diy":  0.40,

  // ── Security self-hosted ──────────────────────────────────────────────────
  "wazuh-self-hosted":  0.40,
  "security-onion":     0.50,

  // ── Managed security (some platform touch) ────────────────────────────────
  "microsoft-sentinel": 0.10,
  "google-secops":      0.10,
};

export function getOperationalFTE(platformId: string): number {
  return OPERATIONAL_FTE[platformId] ?? 0.10;
}

export function getOperationalCost(platformId: string, engineerHourlyRate: number): number {
  return getOperationalFTE(platformId) * engineerHourlyRate * HOURS_PER_MONTH;
}

export function getFTELabel(fte: number): string {
  if (fte <= 0) return "0 FTE — fully managed SaaS (no platform ops)";
  if (fte <= 0.05) return "~0.05 FTE — light managed-cloud oversight";
  if (fte <= 0.10) return "~0.1 FTE — cluster oversight & upgrades";
  if (fte <= 0.20) return "~0.2 FTE — ops, patching, basic scaling";
  if (fte <= 0.30) return "~0.3 FTE — distributed system ops & capacity";
  if (fte <= 0.40) return "~0.4 FTE — complex ops & expertise required";
  return "~0.5 FTE — dedicated admin required";
}
