export interface Platform {
  id: string;
  name: string;
  color: string;
  metricTypes: string[]; // e.g., ["Prometheus", "OpenTelemetry", "StatsD"]
  pricing: {
    basePrice?: number;
    pricePerMetric?: number;
    pricePerMillionMetrics?: number;
    freeTier?: number;
    unit: string;
  };
  infrastructure?: {
    compute?: number;
    storage?: number;
    memory?: number;
    network?: number;
    other?: number;
    notes?: string;
  };
}

export interface MetricConfig {
  baseVolume: number; // metrics per second
  tags: string[];
  tagValues: number; // number of unique values per tag
}

// Calculate total metric volume with cardinality explosion from tags
export function calculateMetricVolume(config: MetricConfig): number {
  // Base volume per second
  let totalMetrics = config.baseVolume;
  
  // Each tag multiplies the metric volume by the number of unique tag values
  // This simulates the cardinality explosion
  config.tags.forEach(() => {
    totalMetrics *= config.tagValues;
  });
  
  return totalMetrics;
}

// Convert metrics per second to monthly volume
export function metricsPerSecondToMonthly(metricsPerSecond: number): number {
  const secondsPerMonth = 30 * 24 * 60 * 60; // 30 days
  return metricsPerSecond * secondsPerMonth;
}

// Calculate cost for a platform
export function calculatePlatformCost(
  platform: Platform,
  monthlyMetrics: number
): number {
  const { pricing } = platform;
  let cost = pricing.basePrice || 0;
  
  // Apply free tier
  const billableMetrics = Math.max(0, monthlyMetrics - (pricing.freeTier || 0));
  
  if (pricing.pricePerMillionMetrics) {
    cost += (billableMetrics / 1_000_000) * pricing.pricePerMillionMetrics;
  } else if (pricing.pricePerMetric) {
    cost += billableMetrics * pricing.pricePerMetric;
  }
  
  return Math.max(0, cost);
}

// Platform definitions with realistic pricing (as of 2025)
export const platforms: Platform[] = [
  {
    id: "elastic-serverless",
    name: "Elastic Serverless",
    color: "bg-blue-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.016, // Based on https://www.elastic.co/pricing/serverless-observability: $0.09/GB ingest + $0.019/GB retention. Estimated ~0.15GB per million metrics (150 bytes/metric avg)
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "elastic-self-hosted",
    name: "Elastic (Self-hosted)",
    color: "bg-slate-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 1000,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 450, // 3 nodes @ $150/month each
      storage: 300, // SSD storage for time-series data
      memory: 150, // High memory requirements for Elasticsearch
      network: 50,
      other: 50, // Monitoring, backups, operational overhead
      notes: "3+ node Elasticsearch cluster for HA",
    },
  },
  {
    id: "datadog",
    name: "Datadog",
    color: "bg-purple-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.75,
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "new-relic",
    name: "New Relic",
    color: "bg-green-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.25,
      freeTier: 100_000_000, // 100M free per month
      unit: "per million metrics/month",
    },
  },
  {
    id: "splunk-o11y",
    name: "Splunk Observability",
    color: "bg-orange-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.55,
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "dynatrace",
    name: "Dynatrace",
    color: "bg-cyan-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.60,
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "prometheus",
    name: "Prometheus (Self-hosted)",
    color: "bg-red-500",
    metricTypes: ["Prometheus"],
    pricing: {
      basePrice: 600,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 300, // 2-3 nodes @ $100-150/month each
      storage: 200, // SSD storage for time-series data
      memory: 50,
      network: 30,
      other: 20, // Monitoring, backups
      notes: "2-3 nodes for HA, local SSD storage",
    },
  },
  {
    id: "grafana-cloud",
    name: "Grafana Cloud",
    color: "bg-indigo-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.30,
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "chronosphere",
    name: "Chronosphere",
    color: "bg-teal-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "DogStatsD", "Wavefront"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.45, // Estimated based on market positioning as premium solution
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "thanos",
    name: "Thanos (Self-hosted)",
    color: "bg-pink-500",
    metricTypes: ["Prometheus"],
    pricing: {
      basePrice: 900,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 400, // Query/Store nodes
      storage: 350, // Object storage (S3) for long-term retention
      memory: 80,
      network: 40,
      other: 30, // Monitoring, operational overhead
      notes: "Prometheus + Thanos components + object storage",
    },
  },
  {
    id: "victoria-metrics",
    name: "VictoriaMetrics (Self-hosted)",
    color: "bg-emerald-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "InfluxDB", "Graphite"],
    pricing: {
      basePrice: 500,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 250, // 2 nodes @ $125/month each (more efficient)
      storage: 150, // Compressed storage
      memory: 60,
      network: 25,
      other: 15, // Monitoring, backups
      notes: "Highly efficient, 2 nodes for HA, compressed storage",
    },
  },
  {
    id: "cortex",
    name: "Cortex (Self-hosted)",
    color: "bg-amber-500",
    metricTypes: ["Prometheus"],
    pricing: {
      basePrice: 800,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 450, // Multiple microservices (Ingester, Querier, Distributor, etc.)
      storage: 250, // Object storage (S3/GCS) for chunks
      memory: 60,
      network: 30,
      other: 10, // Monitoring, operational overhead
      notes: "Distributed architecture with multiple components",
    },
  },
];

