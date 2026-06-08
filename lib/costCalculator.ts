import {
  calculateElasticServerlessCost,
  calculateEchVolumeCost,
  DEFAULT_ELASTIC_PRICING_OPTIONS,
  type ElasticServerlessPricingOptions,
} from "./elasticServerlessPricing";
import {
  calculateDatadogMetricsCostBreakdown,
  DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST,
  DATADOG_INFRA_HOST_PRO_USD_PER_MONTH,
} from "./datadogPricing";
import {
  DEFAULT_TCO_PRICING_CONTEXT,
  type TcoPricingContext,
} from "./tcoPricingContext";

export type { ElasticServerlessPricingOptions, TcoPricingContext };
export { DEFAULT_TCO_PRICING_CONTEXT };

export interface Platform {
  id: string;
  name: string;
  color: string;
  metricTypes: string[]; // e.g., ["Prometheus", "OpenTelemetry", "StatsD"]
  pricing: {
    basePrice?: number;
    pricePerMetric?: number;
    pricePerMillionMetrics?: number;
    /** Datadog-style: $/unique custom metric time series / month (hourly avg), not per datapoint */
    pricePerCustomMetricPerMonth?: number;
    /** Datadog Pro: included custom metric series per infra host / month */
    customMetricsIncludedPerHost?: number;
    pricePerInfraHostPerMonth?: number;
    pricePerGB?: number; // For volume-based pricing (non-Elastic or display fallback)
    bytesPerDatapoint?: number; // Conversion factor for metrics to GB (default: 320 bytes)
    freeTier?: number;
    unit: string;
    // Egress pricing (for SaaS platforms)
    egressPricePerGB?: number; // Price per GB for data egress
    egressFreeTier?: number; // Free egress in GB/month
    egressPricePerGBWithPrivateLink?: number; // Reduced egress price with private link (typically near-zero)
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

/** Effective $/GB for 1-month retention at volume-tier floor (ingest + retention). */
export const ELASTIC_PRICE_PER_GB: Record<MetricSourceType, number> = {
  OpenTelemetry: 0.109,
  Prometheus: 0.109,
  ElasticAgent: 0.109,
  Mixed: 0.109,
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

/** Unique custom metric series from monthly datapoint volume (assumes ~1 pt/sec per series). */
export function monthlyDatapointsToUniqueCustomMetrics(monthlyDatapoints: number): number {
  return monthlyDatapoints / (30 * 24 * 60 * 60);
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

// Calculate egress cost for a platform
export function calculateEgressCost(
  platform: Platform,
  monthlyGB: number,
  usePrivateLink: boolean = false
): number {
  const { pricing } = platform;
  
  // Only calculate egress for SaaS platforms that have egress pricing
  if (!pricing.egressPricePerGB) {
    return 0;
  }
  
  // Use private link pricing if available and enabled
  const egressPricePerGB = usePrivateLink && pricing.egressPricePerGBWithPrivateLink !== undefined
    ? pricing.egressPricePerGBWithPrivateLink
    : pricing.egressPricePerGB;
  
  // Apply free tier
  const billableGB = Math.max(0, monthlyGB - (pricing.egressFreeTier || 0));
  
  return billableGB * egressPricePerGB;
}

// Calculate cost for a platform
export function calculatePlatformCost(
  platform: Platform,
  monthlyMetrics: number,
  metricType?: MetricSourceType,
  includeEgress: boolean = false,
  usePrivateLink: boolean = false,
  pricingContext: TcoPricingContext = DEFAULT_TCO_PRICING_CONTEXT
): number {
  const { elastic: elasticPricing } = pricingContext;
  const { pricing } = platform;
  let cost = pricing.basePrice || 0;
  
  // Apply free tier
  const billableMetrics = Math.max(0, monthlyMetrics - (pricing.freeTier || 0));
  
  let monthlyGB = 0;
  
  if (pricing.pricePerGB) {
    const bytesPerDatapoint = metricType 
      ? getBytesPerDatapoint(metricType)
      : (pricing.bytesPerDatapoint || getBytesPerDatapoint("Mixed"));
    monthlyGB = metricsToGB(billableMetrics, bytesPerDatapoint);

    if (platform.id === "elastic-serverless") {
      cost += calculateElasticServerlessCost(monthlyGB, {
        ...elasticPricing,
        productTier: "observability-complete",
      }).volumeCost;
    } else if (platform.id === "elastic-ech") {
      cost += calculateEchVolumeCost(monthlyGB, {
        retentionMonths: elasticPricing.retentionMonths,
        useRetentionTiers: elasticPricing.useVolumeTiers,
        pricePerIngestGB: pricing.pricePerGB,
      }).volumeCost;
    } else {
      cost += monthlyGB * pricing.pricePerGB;
    }
  } else if (pricing.pricePerCustomMetricPerMonth !== undefined) {
    const uniqueCustomMetrics = monthlyDatapointsToUniqueCustomMetrics(billableMetrics);
    const ddBreakdown = calculateDatadogMetricsCostBreakdown(
      uniqueCustomMetrics,
      pricingContext.datadog,
      pricing.pricePerCustomMetricPerMonth
    );
    cost += ddBreakdown.infraHostCost + ddBreakdown.customMetricsCost;
    if (includeEgress && pricing.egressPricePerGB) {
      const bytesPerDatapoint = metricType
        ? getBytesPerDatapoint(metricType)
        : (pricing.bytesPerDatapoint || getBytesPerDatapoint("Mixed"));
      monthlyGB = metricsToGB(billableMetrics, bytesPerDatapoint);
    }
  } else if (pricing.pricePerMillionMetrics) {
    cost += (billableMetrics / 1_000_000) * pricing.pricePerMillionMetrics;
    // Calculate monthlyGB for egress if needed (only if platform has egress pricing)
    if (includeEgress && pricing.egressPricePerGB) {
      const bytesPerDatapoint = metricType 
        ? getBytesPerDatapoint(metricType)
        : (pricing.bytesPerDatapoint || getBytesPerDatapoint("Mixed"));
      monthlyGB = metricsToGB(billableMetrics, bytesPerDatapoint);
    }
  } else if (pricing.pricePerMetric) {
    cost += billableMetrics * pricing.pricePerMetric;
    // Calculate monthlyGB for egress if needed (only if platform has egress pricing)
    if (includeEgress && pricing.egressPricePerGB) {
      const bytesPerDatapoint = metricType 
        ? getBytesPerDatapoint(metricType)
        : (pricing.bytesPerDatapoint || getBytesPerDatapoint("Mixed"));
      monthlyGB = metricsToGB(billableMetrics, bytesPerDatapoint);
    }
  }
  
  // Add egress costs if enabled
  if (includeEgress && monthlyGB > 0) {
    cost += calculateEgressCost(platform, monthlyGB, usePrivateLink);
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
      pricePerGB: 0.109, // Floor reference: $0.09 ingest + $0.019 retention × 1 mo (see elasticServerlessPricing.ts)
      bytesPerDatapoint: 320, // Weighted average. Actual: OTel 488B, Prometheus 296B, Elastic Agent 200B
      freeTier: 0,
      unit: "ingest + retention (GB)",
      egressPricePerGB: 0.05,
      egressFreeTier: 50,
      egressPricePerGBWithPrivateLink: 0.001,
    },
    cardinalityNote:
      "Elastic Observability Serverless Complete bills ingest and retention separately (GB + GB-month), not per metric. Default pricing uses the Observability Complete tier table on cloud.elastic.co (ingest from $0.50/GB for 0–1,500 GB; retention from $0.04/GB-month for 0–10,000 GB stored). High cardinality affects cost via total GB. Adjust retention months in Configuration.",
  },
  {
    id: "elastic-ech",
    name: "Elastic Cloud Hosted (ECH)",
    color: "bg-blue-700",
    metricTypes: ["Prometheus", "OpenTelemetry", "ElasticAgent", "Custom"],
    pricing: {
      basePrice: 200, // Minimum 2-node hot cluster (compute/RAM-hours)
      pricePerGB: 0.05, // Variable cost per GB ingested; beats Serverless above ~4 GB/month
      bytesPerDatapoint: 320,
      freeTier: 0,
      unit: "per GB/month + base cluster",
      egressPricePerGB: 0.09,
      egressFreeTier: 100,
      egressPricePerGBWithPrivateLink: 0.001,
    },
    cardinalityNote: "Elastic Cloud Hosted (ECH) charges a fixed cluster minimum plus **ingest ($0.05/GB)** and **retention** on stored GB using the same Observability Complete retention tier table as Serverless (configurable). High cardinality affects cost via data volume only. Contact Elastic for a custom quote.",
  },
  {
    id: "elastic-self-hosted",
    name: "Elastic (Self-hosted)",
    color: "bg-slate-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 600,
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
    infrastructure: {
      compute: 250, // 2 ES data nodes — TSDB mode allows lighter instances vs. standard ES
      storage: 150, // TSDB mode provides 2–5× compression for time-series data vs. standard indices
      memory: 120, // JVM heap still requires dedicated RAM; higher than JVM-free tools like VictoriaMetrics
      network: 30,
      other: 50, // Kibana node + monitoring + backups (Kibana is heavier than Grafana)
      notes: "2-node Elasticsearch cluster with TSDB index mode (8.7+). TSDB reduces storage 2–5× for time-series metrics; lighter nodes possible vs. general-purpose ES. Still costs more than VictoriaMetrics due to JVM heap overhead and Kibana. Open source, no licensing cost.",
    },
    cardinalityNote: "Fixed infrastructure cost — cardinality doesn't directly impact monthly costs. Elasticsearch TSDB mode (8.7+) provides 2–5× compression for time-series metrics, making storage costs comparable to Prometheus. However, JVM heap requirements and a dedicated Kibana node mean Elastic self-hosted carries more overhead than purpose-built tools like VictoriaMetrics (no JVM, single binary). High cardinality may still require storage or compute scaling over time, but at a much lower rate than per-metric SaaS platforms.",
  },
  {
    id: "datadog",
    name: "Datadog",
    color: "bg-purple-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      pricePerCustomMetricPerMonth: 0.05,
      customMetricsIncludedPerHost: DATADOG_CUSTOM_METRICS_INCLUDED_PER_HOST,
      pricePerInfraHostPerMonth: DATADOG_INFRA_HOST_PRO_USD_PER_MONTH,
      freeTier: 0,
      unit: "infra hosts + billable custom metrics",
      egressPricePerGB: 0.05,
      egressFreeTier: 10,
      egressPricePerGBWithPrivateLink: 0.001,
    },
    cardinalityNote:
      "Datadog bills **Infrastructure Pro hosts** ($15/host/mo list) plus **custom metric time series** beyond standard agent metrics (~500 series/host) and 100 included custom metrics per host ($0.05/series/mo). Host count is estimated from infrastructure inventory or log GB/day — not from metrics throughput. APM and log indexing are on their respective tabs.",
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
      pricePerMillionMetrics: 0.30, // $0.30 per million metrics (STARTING TIER pricing)
      freeTier: 0,
      unit: "per million metrics/month",
      egressPricePerGB: 0.12, // Estimated: GCP egress pricing
      egressFreeTier: 0,
      egressPricePerGBWithPrivateLink: 0.001, // Near-zero with private link
    },
    cardinalityNote: "Charges per metric, so high cardinality directly increases costs. Each unique metric series (including all tag combinations) is counted separately. High-cardinality tags cause exponential cost growth as metric volume multiplies. Pricing shown: $0.30 per million metrics for STARTING TIER. Grafana offers volume discounts and can go 'as low as' $3/GB for Enterprise tier (approximately $0.15 per million metrics at typical conversion rates). Contact Grafana for Enterprise tier pricing based on your volume.",
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
      // Observe Inc charges $0.008 per DPM (Data Points per Minute) — a rate-based unit.
      // 1 DPM = 1 datapoint/min sustained = 43,200 datapoints/month
      // → $0.008/DPM × (1,000,000 ÷ 43,200) = $0.185 per million metrics/month
      pricePerMillionMetrics: 0.185,
      freeTier: 0,
      unit: "per million metrics/month",
    },
    cardinalityNote: "Observe Inc charges $0.008/DPM (Data Points per Minute) — a rate-based unit. 1 DPM sustained for a month = 43,200 datapoints, so $0.008/DPM ≈ $0.185 per million metrics/month. High cardinality increases DPM and therefore cost proportionally. Includes 13-month retention, unlimited users, and compute. Source: observeinc.com/pricing",
  },
  {
    id: "clickstack-managed",
    name: "ClickStack (Managed)",
    color: "bg-yellow-500",
    metricTypes: ["Prometheus", "OpenTelemetry", "StatsD", "Custom"],
    pricing: {
      basePrice: 0,
      // ClickStack (Managed ClickStack on ClickHouse Cloud) prices on infrastructure:
      // Storage: <$0.03/GB/month, Ingest compute: ~$0.01/GB → total ~$0.04/GB
      // No per-user, per-host, or per-metric fees. Full-fidelity, indefinite retention.
      pricePerGB: 0.04,
      bytesPerDatapoint: 320,
      freeTier: 0,
      unit: "per GB/month",
    },
    cardinalityNote: "ClickStack (Managed) prices on infrastructure, not events or metrics. Storage costs <$0.03/GB/month + ~$0.01/GB ingest compute ≈ $0.04/GB total. High cardinality has zero direct impact on cost — only total data volume matters. Retains full-fidelity OpenTelemetry data indefinitely with no sampling, rollups, or retention tradeoffs. Compute scales independently from storage and scales to zero when idle. Source: clickhouse.com/blog/introducing-managed-clickstack-beta",
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

