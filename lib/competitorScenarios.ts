export type CompetitorScenarioId =
  | "datadog"
  | "grafana-stack"
  | "prometheus-native"
  | "dynatrace"
  | "observe-chronosphere"
  | "splunk-newrelic"
  | "all";

export type ObservabilityTabSignal = "metrics" | "tracing" | "logs" | "security";

export interface CompetitorScenario {
  id: CompetitorScenarioId;
  label: string;
  description: string;
  /** Platform IDs pre-selected per signal tab (always includes both Elastic deployment options). */
  platformIds: Record<ObservabilityTabSignal, string[]>;
  /** Optional metrics-tab defaults when this scenario is selected. */
  presets?: {
    metricsInputMode?: "manual" | "infrastructure" | "samples-poc";
    primaryMetricType?: "OpenTelemetry" | "Prometheus" | "ElasticAgent" | "Mixed";
    samplesPerSecond?: number;
    elasticRetentionMonths?: number;
  };
}

const ELASTIC_METRICS = ["elastic-ech", "elastic-serverless"] as const;
const ELASTIC_TRACING = ["elastic-ech-tracing", "elastic-tracing"] as const;
const ELASTIC_LOGS = ["elastic-ech-logs", "elastic-logs"] as const;
const ELASTIC_SECURITY = ["elastic-security-ech", "elastic-security"] as const;

export const COMPETITOR_SCENARIOS: CompetitorScenario[] = [
  {
    id: "datadog",
    label: "Datadog customer",
    description: "ECH + Serverless vs Datadog host + custom-metric pricing.",
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
    label: "Grafana / Mimir / Loki / Tempo stack",
    description:
      "Grafana Cloud plus common self-managed alternatives (Prometheus, Thanos, VictoriaMetrics, Cortex).",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "grafana-cloud", "prometheus", "thanos", "victoria-metrics", "cortex"],
      tracing: [...ELASTIC_TRACING, "grafana-tracing", "tempo-self-hosted", "datadog-tracing"],
      logs: [...ELASTIC_LOGS, "grafana-logs", "loki-self-hosted", "datadog-logs"],
      security: [...ELASTIC_SECURITY, "datadog-security"],
    },
    presets: {
      primaryMetricType: "Prometheus",
      samplesPerSecond: 100_000,
    },
  },
  {
    id: "prometheus-native",
    label: "Prometheus-native (self-managed)",
    description: "Prometheus, Thanos, VictoriaMetrics, and Cortex vs Elastic.",
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
    id: "dynatrace",
    label: "Dynatrace customer",
    description: "ECH + Serverless vs Dynatrace Grail / Davis metrics proxy.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "dynatrace", "datadog"],
      tracing: [...ELASTIC_TRACING, "dynatrace-tracing", "datadog-tracing"],
      logs: [...ELASTIC_LOGS, "dynatrace-logs", "datadog-logs"],
      security: [...ELASTIC_SECURITY, "dynatrace-security", "datadog-security"],
    },
  },
  {
    id: "observe-chronosphere",
    label: "Observe / Chronosphere / Grafana Cloud",
    description: "Cardinality-focused SaaS metrics vendors.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "observe-inc", "chronosphere", "grafana-cloud"],
      tracing: [...ELASTIC_TRACING, "grafana-tracing", "datadog-tracing"],
      logs: [...ELASTIC_LOGS, "grafana-logs", "datadog-logs"],
      security: [...ELASTIC_SECURITY, "datadog-security"],
    },
  },
  {
    id: "splunk-newrelic",
    label: "Splunk / New Relic customer",
    description: "Legacy per-million-metrics SaaS pricing.",
    platformIds: {
      metrics: [...ELASTIC_METRICS, "splunk-o11y", "new-relic", "datadog"],
      tracing: [...ELASTIC_TRACING, "datadog-tracing", "new-relic"],
      logs: [...ELASTIC_LOGS, "datadog-logs", "splunk-o11y"],
      security: [...ELASTIC_SECURITY, "datadog-security"],
    },
  },
  {
    id: "all",
    label: "All platforms",
    description: "Show every vendor in the picker — choose manually.",
    platformIds: {
      metrics: [],
      tracing: [],
      logs: [],
      security: [],
    },
  },
];

export const DEFAULT_COMPETITOR_SCENARIO_ID: CompetitorScenarioId = "datadog";

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
