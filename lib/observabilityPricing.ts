// Comprehensive observability pricing data for Metrics, Tracing/APM, and Logs

export type ObservabilityType = "metrics" | "tracing" | "logs";

export interface ObservabilityPricing {
  metrics?: {
    basePrice?: number;
    pricePerMetric?: number;
    pricePerMillionMetrics?: number;
    pricePerGB?: number;
    bytesPerDatapoint?: number;
    freeTier?: number;
    unit: string;
  };
  tracing?: {
    basePrice?: number;
    pricePerSpan?: number;
    pricePerMillionSpans?: number;
    pricePerGB?: number;
    bytesPerSpan?: number; // Average bytes per span
    freeTier?: number;
    unit: string;
  };
  logs?: {
    basePrice?: number;
    pricePerGB?: number;
    freeTier?: number; // In GB
    unit: string;
  };
}

export interface ObservabilityPlatform {
  id: string;
  name: string;
  color: string;
  pricing: ObservabilityPricing;
  infrastructure?: {
    compute?: number;
    storage?: number;
    memory?: number;
    network?: number;
    other?: number;
    notes?: string;
  };
  notes?: {
    metrics?: string;
    tracing?: string;
    logs?: string;
  };
}

// Average bytes per span (for tracing)
// Based on typical OpenTelemetry span sizes
export const BYTES_PER_SPAN = 500; // Average span size in bytes

// Tracing/APM platforms pricing (as of 2025)
export const tracingPlatforms: ObservabilityPlatform[] = [
  {
    id: "datadog-tracing",
    name: "Datadog APM",
    color: "bg-purple-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerMillionSpans: 1.70, // $1.70 per million spans
        freeTier: 0,
        unit: "per million spans/month",
      },
    },
    notes: {
      tracing: "Charges per span ingested. Includes distributed tracing, APM, and error tracking. Free tier: 100K spans/month.",
    },
  },
  {
    id: "new-relic-tracing",
    name: "New Relic APM",
    color: "bg-green-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerMillionSpans: 0.25, // $0.25 per million spans
        freeTier: 100_000_000, // 100M free spans/month
        unit: "per million spans/month",
      },
    },
    notes: {
      tracing: "Charges per span after 100M free tier. Includes full APM, distributed tracing, and error analytics.",
    },
  },
  {
    id: "dynatrace-tracing",
    name: "Dynatrace APM",
    color: "bg-cyan-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerMillionSpans: 0.50, // Estimated
        freeTier: 0,
        unit: "per million spans/month",
      },
    },
    notes: {
      tracing: "AI-powered APM with automated root cause analysis. Pricing based on host units and spans.",
    },
  },
  {
    id: "elastic-tracing",
    name: "Elastic Serverless APM",
    color: "bg-blue-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerGB: 0.109, // $0.09/GB ingest + $0.019/GB retention per month (Complete tier)
        bytesPerSpan: 500,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      tracing: "Elastic Serverless Complete: Volume-based pricing (GB). $0.09/GB ingested + $0.019/GB retained per month. High cardinality doesn't directly increase costs - only data volume matters. Source: https://www.elastic.co/pricing/serverless-observability",
    },
  },
  {
    id: "splunk-tracing",
    name: "Splunk Observability APM",
    color: "bg-orange-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerMillionSpans: 0.55,
        freeTier: 0,
        unit: "per million spans/month",
      },
    },
    notes: {
      tracing: "Charges per span. Includes distributed tracing, continuous profiling, and error tracking.",
    },
  },
  {
    id: "grafana-tracing",
    name: "Grafana Cloud Traces",
    color: "bg-indigo-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerMillionSpans: 0.30,
        freeTier: 0,
        unit: "per million spans/month",
      },
    },
    notes: {
      tracing: "Charges per span. Integrates with Grafana dashboards and alerting.",
    },
  },
  {
    id: "honeycomb-tracing",
    name: "Honeycomb",
    color: "bg-amber-500",
    pricing: {
      tracing: {
        basePrice: 0,
        pricePerMillionSpans: 0.40,
        freeTier: 0,
        unit: "per million spans/month",
      },
    },
    notes: {
      tracing: "Event-based pricing. High-cardinality data is a feature, not a cost concern.",
    },
  },
  {
    id: "jaeger-self-hosted",
    name: "Jaeger (Self-hosted)",
    color: "bg-red-500",
    pricing: {
      tracing: {
        basePrice: 400,
        pricePerMillionSpans: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 250,
      storage: 100,
      memory: 30,
      network: 20,
    },
    notes: {
      tracing: "Fixed infrastructure cost. Open-source distributed tracing system.",
    },
  },
  {
    id: "tempo-self-hosted",
    name: "Grafana Tempo (Self-hosted)",
    color: "bg-indigo-500",
    pricing: {
      tracing: {
        basePrice: 350,
        pricePerMillionSpans: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 200,
      storage: 100,
      memory: 30,
      network: 20,
    },
    notes: {
      tracing: "Fixed infrastructure cost. Highly scalable, cost-effective tracing backend.",
    },
  },
];

// Logs platforms pricing (as of 2025)
export const logsPlatforms: ObservabilityPlatform[] = [
  {
    id: "datadog-logs",
    name: "Datadog Logs",
    color: "bg-purple-500",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 0.10, // $0.10/GB ingested
        freeTier: 5, // 5 GB free/month
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Charges per GB ingested. 5 GB free tier. Indexing and retention costs additional.",
    },
  },
  {
    id: "new-relic-logs",
    name: "New Relic Logs",
    color: "bg-green-500",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 0.25,
        freeTier: 100, // 100 GB free/month
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Charges per GB after 100 GB free tier. Includes log analytics and querying.",
    },
  },
  {
    id: "elastic-logs",
    name: "Elastic Serverless Logs",
    color: "bg-blue-500",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 0.109, // $0.09/GB ingested + $0.019/GB retained per month (Complete tier)
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Elastic Serverless Complete: $0.09/GB ingested + $0.019/GB retained per month. Includes logs analysis, dashboards, integrations, alerts, and AI-powered insights. Source: https://www.elastic.co/pricing/serverless-observability",
    },
  },
  {
    id: "splunk-logs",
    name: "Splunk Observability Logs",
    color: "bg-orange-500",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 0.50,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Charges per GB ingested. Includes indexing and search capabilities.",
    },
  },
  {
    id: "grafana-logs",
    name: "Grafana Cloud Logs",
    color: "bg-indigo-500",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 0.50,
        freeTier: 50, // 50 GB free/month
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Charges per GB after 50 GB free tier. Based on Loki backend.",
    },
  },
  {
    id: "observe-logs",
    name: "Observe Inc Logs",
    color: "bg-sky-600",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 0.35, // $0.35 per GiB (60-day retention)
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Charges per GiB ingested. 60-day retention included. Snowflake backend.",
    },
  },
  {
    id: "loki-self-hosted",
    name: "Grafana Loki (Self-hosted)",
    color: "bg-indigo-500",
    pricing: {
      logs: {
        basePrice: 300,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 150,
      storage: 100,
      memory: 30,
      network: 20,
    },
    notes: {
      logs: "Fixed infrastructure cost. Highly efficient log aggregation system.",
    },
  },
  {
    id: "elasticsearch-logs",
    name: "Elasticsearch (Self-hosted)",
    color: "bg-slate-500",
    pricing: {
      logs: {
        basePrice: 1000,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 450,
      storage: 300,
      memory: 150,
      network: 50,
      other: 50,
    },
    notes: {
      logs: "Fixed infrastructure cost. Full-text search and log analytics.",
    },
  },
];

// Cost calculation functions
export function calculateTracingCost(
  platform: ObservabilityPlatform,
  monthlySpans: number
): number {
  const pricing = platform.pricing.tracing;
  if (!pricing) return 0;

  let cost = pricing.basePrice || 0;
  const billableSpans = Math.max(0, monthlySpans - (pricing.freeTier || 0));

  if (pricing.pricePerGB) {
    const bytesPerSpan = pricing.bytesPerSpan || BYTES_PER_SPAN;
    const monthlyGB = (billableSpans * bytesPerSpan) / (1024 * 1024 * 1024);
    cost += monthlyGB * pricing.pricePerGB;
  } else if (pricing.pricePerMillionSpans) {
    cost += (billableSpans / 1_000_000) * pricing.pricePerMillionSpans;
  } else if (pricing.pricePerSpan) {
    cost += billableSpans * pricing.pricePerSpan;
  }

  return Math.max(0, cost);
}

export function calculateLogsCost(
  platform: ObservabilityPlatform,
  monthlyGB: number
): number {
  const pricing = platform.pricing.logs;
  if (!pricing) return 0;

  let cost = pricing.basePrice || 0;
  const billableGB = Math.max(0, monthlyGB - (pricing.freeTier || 0));

  if (pricing.pricePerGB) {
    cost += billableGB * pricing.pricePerGB;
  }

  return Math.max(0, cost);
}

// Convert spans per second to monthly
export function spansPerSecondToMonthly(spansPerSecond: number): number {
  const secondsPerMonth = 30 * 24 * 60 * 60;
  return spansPerSecond * secondsPerMonth;
}

// Convert GB per day to monthly
export function gbPerDayToMonthly(gbPerDay: number): number {
  return gbPerDay * 30;
}

