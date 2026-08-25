export type CompetitorScenarioId =
  | "datadog"
  | "grafana-stack"
  | "prometheus-native"
  | "victoria-metrics"
  | "dynatrace"
  | "observe-chronosphere"
  | "splunk-newrelic"
  | "all";

export type ObservabilityTabSignal = "metrics" | "tracing" | "logs" | "security";

export interface CompetitorScenario {
  id: CompetitorScenarioId;
  label: string;
  description: string;
  /**
   * Optional sales / workshop talk track shown under the scenario picker.
   * Keep short — price + product wedge, not a full pitch.
   */
  talkTrack?: string;
  /** Platform IDs pre-selected per signal tab (always includes ECH, Serverless, and Self-hosted on metrics). */
  platformIds: Record<ObservabilityTabSignal, string[]>;
  /** Optional metrics-tab defaults when this scenario is selected. */
  presets?: {
    metricsInputMode?: "manual" | "infrastructure" | "samples-poc";
    primaryMetricType?: "OpenTelemetry" | "Prometheus" | "Mixed";
    samplesPerSecond?: number;
    /** Samples-POC bytes/sample. Prometheus parity uses 296 (not the 1.5 TSDB POC default). */
    bytesPerSample?: number;
    elasticRetentionMonths?: number;
  };
}

const ELASTIC_METRICS = ["elastic-ech", "elastic-serverless", "elastic-self-hosted"] as const;
const ELASTIC_TRACING = ["elastic-ech-tracing", "elastic-tracing"] as const;
const ELASTIC_LOGS = ["elastic-ech-logs", "elastic-logs"] as const;
const ELASTIC_SECURITY = ["elastic-security-ech", "elastic-security"] as const;

export const COMPETITOR_SCENARIOS: CompetitorScenario[] = [
  {
    id: "datadog",
    label: "Datadog",
    description: "Compare Elastic Cloud Hosted and Serverless with Datadog host and custom-metric pricing.",
    talkTrack:
      "Lead with price, then coverage: Datadog custom-metric bills push teams to drop series, sample, and exclude environments just to keep spend down — so they pay more and still miss production blind spots. Elastic is GB volume (no custom-metric SKU), so you keep coverage and cut the bill.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "datadog"],
      tracing: [...ELASTIC_TRACING, "datadog-tracing"],
      logs: [...ELASTIC_LOGS, "datadog-logs"],
      security: [...ELASTIC_SECURITY, "datadog-security"],
    },
    presets: {
      metricsInputMode: "samples-poc",
      primaryMetricType: "Prometheus",
      samplesPerSecond: 400_000,
      elasticRetentionMonths: 12,
    },
  },
  {
    id: "grafana-stack",
    label: "Grafana / Mimir / Loki / Tempo",
    description:
      "Compare Elastic with Grafana Cloud and common self-managed options (Prometheus, Thanos, VictoriaMetrics, Cortex/Mimir).",
    talkTrack:
      "Lead with architecture pain, then price: Grafana stacks mean multiple databases and multiple query languages — inefficient for humans and AI. On modeled Prometheus workloads at ~12-month retention, Elastic Serverless is ~33% lower than Grafana Cloud (e.g. 100k samples/sec @ 296B → ~$22K vs ~$33K/mo). One store, one investigation path — and cheaper.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "grafana-cloud", "prometheus", "thanos", "victoria-metrics", "cortex"],
      tracing: [...ELASTIC_TRACING, "grafana-tracing", "tempo-self-hosted"],
      logs: [...ELASTIC_LOGS, "grafana-logs", "loki-self-hosted"],
      security: [...ELASTIC_SECURITY],
    },
    presets: {
      metricsInputMode: "samples-poc",
      primaryMetricType: "Prometheus",
      // 100k samples/sec @ 296B, 12-mo retention — Grafana Cloud ~$33,094 vs Serverless ~$21,922 (~34% lower).
      samplesPerSecond: 100_000,
      bytesPerSample: 296,
      elasticRetentionMonths: 12,
    },
  },
  {
    id: "prometheus-native",
    label: "Prometheus (self-managed)",
    description: "Compare Elastic with Prometheus, Thanos, VictoriaMetrics, and Cortex/Mimir.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "prometheus", "thanos", "victoria-metrics", "cortex"],
      tracing: [...ELASTIC_TRACING, "tempo-self-hosted"],
      logs: [...ELASTIC_LOGS, "loki-self-hosted"],
      security: [...ELASTIC_SECURITY],
    },
    presets: {
      primaryMetricType: "Prometheus",
    },
  },
  {
    id: "victoria-metrics",
    label: "VictoriaMetrics",
    description:
      "Compare Elastic Cloud Hosted and Serverless with self-hosted VictoriaMetrics.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "victoria-metrics"],
      tracing: [...ELASTIC_TRACING],
      logs: [...ELASTIC_LOGS],
      security: [...ELASTIC_SECURITY],
    },
    presets: {
      metricsInputMode: "samples-poc",
      primaryMetricType: "Prometheus",
      samplesPerSecond: 100_000,
      elasticRetentionMonths: 12,
    },
  },
  {
    id: "dynatrace",
    label: "Dynatrace",
    description: "Compare Elastic Cloud Hosted and Serverless with Dynatrace pricing.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "dynatrace"],
      tracing: [...ELASTIC_TRACING, "dynatrace-tracing"],
      logs: [...ELASTIC_LOGS, "dynatrace-logs"],
      security: [...ELASTIC_SECURITY, "dynatrace-security"],
    },
  },
  {
    id: "observe-chronosphere",
    label: "Observe / Chronosphere / Grafana Cloud",
    description: "Compare Elastic with cardinality-focused SaaS metrics platforms.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "observe-inc", "chronosphere", "grafana-cloud"],
      tracing: [...ELASTIC_TRACING, "grafana-tracing"],
      logs: [...ELASTIC_LOGS, "grafana-logs"],
      security: [...ELASTIC_SECURITY],
    },
  },
  {
    id: "splunk-newrelic",
    label: "Splunk / New Relic",
    description: "Compare Elastic with Splunk Observability and New Relic metrics pricing.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "splunk-o11y", "new-relic"],
      tracing: [...ELASTIC_TRACING, "new-relic"],
      logs: [...ELASTIC_LOGS, "splunk-o11y"],
      security: [...ELASTIC_SECURITY],
    },
  },
  {
    id: "all",
    label: "Compare all platforms",
    description: "Show every platform in the list so you can choose what to include.",
    platformIds: {
      metrics: [],
      tracing: [],
      logs: [],
      security: [],
    },
  },
];

export const DEFAULT_COMPETITOR_SCENARIO_ID: CompetitorScenarioId = "datadog";

export function isCompetitorScenarioId(id: string): id is CompetitorScenarioId {
  return COMPETITOR_SCENARIOS.some((s) => s.id === id);
}

export function getCompetitorScenario(id: CompetitorScenarioId): CompetitorScenario {
  return COMPETITOR_SCENARIOS.find((s) => s.id === id) ?? COMPETITOR_SCENARIOS[0];
}

export function getScenarioPlatformIds(
  scenarioId: CompetitorScenarioId,
  tab: ObservabilityTabSignal,
  allPlatformIds: string[]
): Set<string> {
  const scenario = getCompetitorScenario(scenarioId);
  const ids = scenario.platformIds[tab];
  if (scenarioId === "all" || ids.length === 0) {
    return new Set(allPlatformIds);
  }
  return new Set(ids.filter((id) => allPlatformIds.includes(id)));
}

export function isDatadogPlatformId(id: string): boolean {
  return id === "datadog" || id.startsWith("datadog-");
}

/** Datadog config + picker only for Datadog or Compare-all scenarios. */
export function scenarioShowsDatadog(scenarioId: CompetitorScenarioId): boolean {
  return scenarioId === "datadog" || scenarioId === "all";
}
