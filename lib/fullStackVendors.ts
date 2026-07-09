// Full-stack vendor definitions mapping platform IDs across all four signal tabs.
// Used by the Full Stack comparison view to aggregate total TCO.

export type CapabilityLevel = "yes" | "limited" | "no";

export interface FullStackVendor {
  id: string;
  name: string;
  color: string;
  badge: string;
  badgeColor: string;
  // Platform IDs matching entries in costCalculator.ts / observabilityPricing.ts
  metricsPlatformId: string | null;
  tracingPlatformId: string | null;
  logsPlatformId: string | null;
  securityPlatformId: string | null;
  capabilities: {
    ai_investigation: CapabilityLevel;
    native_siem: CapabilityLevel;
    unified_platform: CapabilityLevel;
    otel_native: CapabilityLevel;
    no_sampling: CapabilityLevel;
    open_source: CapabilityLevel;
  };
  isElastic?: boolean;
  capabilityNotes?: string;
}

export const FULL_STACK_VENDORS: FullStackVendor[] = [
  {
    id: "elastic-serverless",
    name: "Elastic Serverless",
    color: "bg-blue-500",
    badge: "Elastic · Unified",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    metricsPlatformId: "elastic-serverless",
    tracingPlatformId: "elastic-tracing",
    logsPlatformId: "elastic-logs",
    securityPlatformId: "elastic-security",
    isElastic: true,
    capabilities: {
      ai_investigation: "yes",
      native_siem: "yes",
      unified_platform: "yes",
      otel_native: "yes",
      no_sampling: "yes",
      open_source: "yes",
    },
    capabilityNotes: "AI Assistant spans logs, traces, metrics & security in one context. Attack Discovery automates threat correlation. One contract, one data model, one bill.",
  },
  {
    id: "elastic-ech",
    name: "Elastic Cloud Hosted (ECH)",
    color: "bg-blue-700",
    badge: "Elastic · Unified",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    metricsPlatformId: "elastic-ech",
    tracingPlatformId: "elastic-ech-tracing",
    logsPlatformId: "elastic-ech-logs",
    securityPlatformId: "elastic-security-ech",
    isElastic: true,
    capabilities: {
      ai_investigation: "yes",
      native_siem: "yes",
      unified_platform: "yes",
      otel_native: "yes",
      no_sampling: "yes",
      open_source: "yes",
    },
    capabilityNotes: "Same unified platform as Serverless with dedicated clusters and lower per-GB cost at enterprise scale. Ideal when Serverless crossover justifies dedicated infra.",
  },
  {
    id: "datadog",
    name: "Datadog",
    color: "bg-purple-500",
    badge: "SaaS",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    metricsPlatformId: "datadog",
    tracingPlatformId: "datadog-tracing",
    logsPlatformId: "datadog-logs",
    securityPlatformId: "datadog-security",
    capabilities: {
      ai_investigation: "limited",
      native_siem: "limited",
      unified_platform: "no",
      otel_native: "no",
      open_source: "no",
      no_sampling: "no",
    },
    capabilityNotes: "Watchdog AI is reactive, not investigative. SIEM is a separate add-on product. Separate bills for APM, Logs, Metrics, and Security. Host-based pricing punishes scale.",
  },
  {
    id: "splunk",
    name: "Splunk",
    color: "bg-orange-500",
    badge: "SaaS",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    metricsPlatformId: "splunk-o11y",
    tracingPlatformId: "splunk-tracing",
    logsPlatformId: "splunk-logs",
    securityPlatformId: "splunk-security",
    capabilities: {
      ai_investigation: "limited",
      native_siem: "yes",
      unified_platform: "no",
      otel_native: "limited",
      no_sampling: "no",
      open_source: "no",
    },
    capabilityNotes: "Separate Splunk Observability and Splunk Enterprise Security products. High per-GB ingest costs. MLTK AI add-on required for ML capabilities.",
  },
  {
    id: "new-relic",
    name: "New Relic",
    color: "bg-green-500",
    badge: "SaaS",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    metricsPlatformId: "new-relic",
    tracingPlatformId: "new-relic-tracing",
    logsPlatformId: "new-relic-logs",
    securityPlatformId: null,
    capabilities: {
      ai_investigation: "limited",
      native_siem: "no",
      unified_platform: "limited",
      otel_native: "limited",
      no_sampling: "no",
      open_source: "no",
    },
    capabilityNotes: "No native SIEM — security requires third-party integration. Tail-based sampling required at high trace volumes.",
  },
  {
    id: "grafana-cloud",
    name: "Grafana Cloud",
    color: "bg-indigo-500",
    badge: "SaaS",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    metricsPlatformId: "grafana-cloud",
    tracingPlatformId: "grafana-tracing",
    logsPlatformId: "grafana-logs",
    securityPlatformId: null,
    capabilities: {
      ai_investigation: "no",
      native_siem: "no",
      unified_platform: "no",
      otel_native: "limited",
      no_sampling: "limited",
      open_source: "yes",
    },
    capabilityNotes: "Three separate backends (Loki, Mimir, Tempo) stitched together. No native SIEM. AI limited to basic alerting. Cost-competitive but lacks Elastic's investigation depth.",
  },
  {
    id: "clickstack",
    name: "ClickStack (Managed)",
    color: "bg-yellow-500",
    badge: "SaaS",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    metricsPlatformId: "clickstack-managed",
    tracingPlatformId: "clickstack-tracing",
    logsPlatformId: "clickstack-logs",
    securityPlatformId: null,
    capabilities: {
      ai_investigation: "limited",
      native_siem: "no",
      unified_platform: "limited",
      otel_native: "yes",
      no_sampling: "yes",
      open_source: "yes",
    },
    capabilityNotes: "Pure observability platform — no security SIEM. Cost-efficient storage. Emerging agentic analytics. Launched Feb 2026 (beta).",
  },
];

export const CAPABILITY_LABELS: Record<string, string> = {
  ai_investigation: "AI-driven Investigation",
  native_siem: "Native Security (SIEM)",
  unified_platform: "Unified Data Model",
  otel_native: "OpenTelemetry Native",
  no_sampling: "Full-Fidelity (No Sampling)",
  open_source: "Open Source Foundation",
};
