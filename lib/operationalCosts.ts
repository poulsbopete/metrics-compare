// Operational cost estimates for each platform.
//
// Expressed as FTE (fraction of a full-time engineer) per month required to
// operate, maintain, patch, scale, and troubleshoot the platform.
//
// Default fully-loaded engineer rate: $120/hr × 160 hrs/month = $19,200/FTE/month
// ($120/hr ≈ $250k/year fully-loaded including salary, benefits, overhead)
//
// SaaS (fully managed): 0.05 FTE — dashboards, integrations, alert tuning
// Managed cloud (ECH): 0.10 FTE — some cluster oversight, upgrades
// Self-hosted light:   0.20 FTE — ops, patching, basic scaling
// Self-hosted medium:  0.30 FTE — distributed system ops, capacity planning
// Self-hosted heavy:   0.50 FTE — complex multi-component infra, expertise required

export const DEFAULT_ENGINEER_HOURLY_RATE = 120; // $/hr fully-loaded
export const HOURS_PER_MONTH = 160;

// FTE per month per platform ID
export const OPERATIONAL_FTE: Record<string, number> = {
  // ── Elastic Serverless (fully managed, minimal ops) ──────────────────────
  "elastic-serverless":       0.05,
  "elastic-tracing":          0.05,
  "elastic-logs":             0.05,
  "elastic-security":         0.05,

  // ── Elastic Cloud Hosted (managed + some cluster oversight) ───────────────
  "elastic-ech":              0.10,
  "elastic-ech-tracing":      0.10,
  "elastic-ech-logs":         0.10,
  "elastic-security-ech":     0.10,

  // ── Elastic Self-hosted ───────────────────────────────────────────────────
  "elastic-self-hosted":          0.30,
  "elastic-apm-self-hosted":      0.30,
  "elasticsearch-logs":           0.30,
  "elastic-security-self-hosted": 0.35,

  // ── Datadog (SaaS, fully managed) ─────────────────────────────────────────
  "datadog":           0.05,
  "datadog-tracing":   0.05,
  "datadog-logs":      0.05,
  "datadog-security":  0.05,

  // ── New Relic (SaaS) ──────────────────────────────────────────────────────
  "new-relic":         0.05,
  "new-relic-tracing": 0.05,
  "new-relic-logs":    0.05,

  // ── Dynatrace (SaaS) ──────────────────────────────────────────────────────
  "dynatrace":         0.05,
  "dynatrace-tracing": 0.05,

  // ── Splunk SaaS (Observability Cloud) ─────────────────────────────────────
  "splunk-o11y":   0.05,
  "splunk-tracing": 0.05,
  "splunk-logs":   0.05,
  "splunk-security": 0.05,

  // ── Splunk Cloud (managed but complex configuration) ──────────────────────
  "splunk-cloud-logs":     0.15,
  "splunk-cloud-security": 0.15,

  // ── Splunk Core (Self-hosted) — requires dedicated Splunk admin ───────────
  "splunk-core-logs":     0.50,
  "splunk-core-security": 0.50,

  // ── Grafana Cloud (SaaS) ──────────────────────────────────────────────────
  "grafana-cloud":   0.05,
  "grafana-tracing": 0.05,
  "grafana-logs":    0.05,

  // ── Other SaaS ────────────────────────────────────────────────────────────
  "honeycomb-tracing": 0.05,
  "chronosphere":      0.05,
  "observe-inc":       0.05,
  "observe-logs":      0.05,

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

  // ── Managed security SaaS ─────────────────────────────────────────────────
  "microsoft-sentinel": 0.10,
  "google-secops":      0.10,

  // ── ClickStack Managed (SaaS, Feb 2026 beta) ──────────────────────────────
  "clickstack-managed":  0.05,
  "clickstack-tracing":  0.05,
  "clickstack-logs":     0.05,
};

export function getOperationalFTE(platformId: string): number {
  return OPERATIONAL_FTE[platformId] ?? 0.10;
}

export function getOperationalCost(platformId: string, engineerHourlyRate: number): number {
  return getOperationalFTE(platformId) * engineerHourlyRate * HOURS_PER_MONTH;
}

export function getFTELabel(fte: number): string {
  if (fte <= 0.05) return "~0.05 FTE — minimal config & dashboards";
  if (fte <= 0.10) return "~0.1 FTE — cluster oversight & upgrades";
  if (fte <= 0.20) return "~0.2 FTE — ops, patching, basic scaling";
  if (fte <= 0.30) return "~0.3 FTE — distributed system ops & capacity";
  if (fte <= 0.40) return "~0.4 FTE — complex ops & expertise required";
  return "~0.5 FTE — dedicated admin required";
}
