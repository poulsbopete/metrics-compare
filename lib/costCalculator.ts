export interface Platform {
  id: string;
  name: string;
  color: string;
  metricTypes: string[]; // e.g., ["Prometheus", "OpenTelemetry", "StatsD"]
  pricing: {
    basePrice?: number;
    pricePerMetric?: number;
    pricePerMillionMetrics?: number;
    pricePerGB?: number; // For volume-based pricing (e.g., Elastic)
    bytesPerDatapoint?: number; // Conversion factor for metrics to GB (default: 320 bytes)
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
  cardinalityNote?: string; // Explanation of how cardinality impacts pricing
}

export type MetricSourceType = "OpenTelemetry" | "Prometheus" | "ElasticAgent" | "Mixed";

// Bytes per datapoint based on actual Elastic data:
// OTel: 998.17 bytes/doc / 2.04 datapoints/doc = 489 bytes/datapoint
// Prometheus: 853.49 bytes/doc / 3.73 datapoints/doc = 229 bytes/datapoint
// E.Agent/Beats: 883.75 bytes/doc / 7.62 datapoints/doc = 116 bytes/datapoint
export const BYTES_PER_DATAPOINT: Record<MetricSourceType, number> = {
  OpenTelemetry: 488, // Updated from slide: 488B (was 489)
  Prometheus: 296, // Updated from slide: 296B (was 229)
  ElasticAgent: 200, // Updated from slide: 200B (was 116)
  Mixed: 320, // Weighted average for mixed sources
};

// Elastic pricing per GB - adjusted to show 2-3x difference vs Grafana Cloud
// Based on user feedback: Elastic should be 2-3x more expensive than Grafana ($0.30/1M datapoints)
// Target: $0.60-$0.90 per 1M datapoints
// Calculated effective pricing per GB to achieve this ratio
export const ELASTIC_PRICE_PER_GB: Record<MetricSourceType, number> = {
  OpenTelemetry: 1.65, // ~$0.75 per 1M datapoints (2.5x vs Grafana) for 488 bytes/datapoint
  Prometheus: 2.17, // ~$0.60 per 1M datapoints (2x vs Grafana) for 296 bytes/datapoint
  ElasticAgent: 3.26, // ~$0.90 per 1M datapoints (3x vs Grafana) for 200 bytes/datapoint
  Mixed: 2.36, // Weighted average
};

export interface MetricConfig {
  baseVolume: number; // metrics per second
  tags: string[];
  tagValues: number; // number of unique values per tag
  primaryMetricType?: MetricSourceType; // Primary metric source type for volume-based pricing
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

// Convert metrics (datapoints) to GB based on bytes per datapoint
export function metricsToGB(metrics: number, bytesPerDatapoint: number = 320): number {
  const bytes = metrics * bytesPerDatapoint;
  const gb = bytes / (1024 * 1024 * 1024); // Convert bytes to GB
  return gb;
}

// Get bytes per datapoint for a metric type
export function getBytesPerDatapoint(metricType?: MetricSourceType): number {
  return metricType ? BYTES_PER_DATAPOINT[metricType] : BYTES_PER_DATAPOINT.Mixed;
}

// Calculate cost for a platform
export function calculatePlatformCost(
  platform: Platform,
  monthlyMetrics: number,
  metricType?: MetricSourceType
): number {
  const { pricing } = platform;
  let cost = pricing.basePrice || 0;
  
  // Apply free tier
  const billableMetrics = Math.max(0, monthlyMetrics - (pricing.freeTier || 0));
  
  if (pricing.pricePerGB) {
    // Volume-based pricing: convert metrics to GB first
    // Use metric-type-specific conversion if available, otherwise use platform default or metric type default
    const bytesPerDatapoint = metricType 
      ? getBytesPerDatapoint(metricType)
      : (pricing.bytesPerDatapoint || getBytesPerDatapoint("Mixed"));
    const monthlyGB = metricsToGB(billableMetrics, bytesPerDatapoint);
    
    // For Elastic, use metric-type-specific pricing per GB if available
    let pricePerGB = pricing.pricePerGB;
    if (platform.id === "elastic-serverless" && metricType && ELASTIC_PRICE_PER_GB[metricType]) {
      pricePerGB = ELASTIC_PRICE_PER_GB[metricType];
    }
    
    cost += monthlyGB * pricePerGB;
  } else if (pricing.pricePerMillionMetrics) {
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
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "DogStatsD", "Wavefront", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerGB: 2.36, // Weighted average. Metric-type-specific: OTel $1.65/GB, Prometheus $2.17/GB, E.Agent $3.26/GB
      bytesPerDatapoint: 320, // Default fallback (weighted average). Actual values: OTel: 488B, Prometheus: 296B, E.Agent/Fleet: 200B
      freeTier: 0,
      unit: "per GB/month",
    },
    cardinalityNote: "Elastic Serverless Complete charges based on data ingest volume (GB), not per metric. High cardinality (many unique metric series) doesn't directly increase costs - only total data volume matters. This means adding high-cardinality tags may increase metric count but won't proportionally increase costs if the data volume remains similar, unlike platforms that charge per metric. Pricing adjusted to show 2-3x cost difference vs Grafana Cloud ($0.30/1M datapoints) as per user feedback. Cost differences between metric types come from bytes per datapoint (OTel: 488B, Prometheus: 296B, E.Agent/Fleet: 200B). Select your primary metric type for accurate TCO. Source: https://www.elastic.co/pricing/serverless-observability",
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
    cardinalityNote: "Fixed infrastructure cost means cardinality doesn't directly impact monthly costs. However, high cardinality may require additional storage or compute resources as your infrastructure scales, potentially increasing infrastructure costs over time.",
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
    cardinalityNote: "Charges per metric, so high cardinality directly increases costs. Each unique metric series (including all tag combinations) is counted separately. Adding high-cardinality tags multiplies your metric count and costs proportionally.",
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
    cardinalityNote: "Charges per metric after the 100M free tier. High cardinality directly increases costs as each unique metric series is counted. The free tier helps with low-volume scenarios, but high-cardinality tags can quickly exceed the free tier limit.",
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
    cardinalityNote: "Charges per metric, so high cardinality directly increases costs. Each unique metric series (with all tag combinations) is billed separately. High-cardinality tags cause exponential cost growth as metric volume multiplies.",
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
    cardinalityNote: "Charges per metric, so high cardinality directly increases costs. Each unique metric series is counted and billed separately. Adding high-cardinality tags multiplies your metric count and costs proportionally.",
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
    cardinalityNote: "Fixed infrastructure cost means cardinality doesn't directly impact monthly costs. However, high cardinality increases storage requirements and may require infrastructure scaling (more storage, memory, or nodes) as your metric volume grows, potentially increasing costs over time.",
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
    cardinalityNote: "Charges per metric, so high cardinality directly increases costs. Each unique metric series (including all tag combinations) is counted separately. High-cardinality tags cause exponential cost growth as metric volume multiplies.",
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
    cardinalityNote: "Charges per metric, so high cardinality directly increases costs. Each unique metric series is counted and billed separately. However, Chronosphere's Control Plane helps reduce metric volumes through intelligent aggregation, potentially mitigating some cardinality impact.",
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
    cardinalityNote: "Fixed infrastructure cost means cardinality doesn't directly impact monthly costs. However, high cardinality increases storage requirements (especially for long-term retention in object storage) and may require scaling compute or storage resources, potentially increasing infrastructure costs over time.",
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
    cardinalityNote: "Fixed infrastructure cost means cardinality doesn't directly impact monthly costs. VictoriaMetrics' efficient compression and storage design helps minimize the impact of high cardinality on storage costs, but very high cardinality may still require infrastructure scaling over time.",
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
    cardinalityNote: "Fixed infrastructure cost means cardinality doesn't directly impact monthly costs. However, high cardinality increases storage requirements in object storage and may require scaling the distributed components (Ingesters, Queriers) to handle increased load, potentially increasing infrastructure costs over time.",
  },
  {
    id: "observe-inc",
    name: "Observe Inc",
    color: "bg-sky-600",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.008, // $0.008 per million datapoints per month (13-month retention included)
      freeTier: 0,
      unit: "per million metrics/month",
    },
    cardinalityNote: "Observe Inc charges per datapoint, so high cardinality directly increases costs. Each unique metric series is counted separately. Built on Snowflake backend, providing scalable data management and analysis capabilities. Pricing: $0.008 per million datapoints per month with 13-month retention included. Very competitive pricing compared to other per-metric platforms.",
  },
  {
    id: "clickhouse-diy",
    name: "ClickHouse (Self-hosted)",
    color: "bg-yellow-600",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 750,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 450, // 2-3 nodes @ $150-200/month each (16+ cores, 64GB+ RAM per node)
      storage: 200, // Fast SSD storage for columnar data
      memory: 0, // Included in compute costs
      network: 40,
      other: 60, // Monitoring, backups, operational overhead, ClickHouse expertise
      notes: "2-3 node cluster for HA, fast SSD storage, requires ClickHouse expertise",
    },
    cardinalityNote: "Fixed infrastructure cost means cardinality doesn't directly impact monthly costs. However, ClickHouse's columnar storage is efficient for high-cardinality data. High cardinality may require additional storage capacity and can impact query performance, potentially requiring more compute resources or storage scaling over time. ClickHouse excels at handling large volumes of time-series data efficiently.",
  },
];

