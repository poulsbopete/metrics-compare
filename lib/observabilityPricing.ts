// Comprehensive observability pricing data for Metrics, Tracing/APM, and Logs

export type ObservabilityType = "metrics" | "tracing" | "logs" | "security";

export interface ObservabilityPricing {
  metrics?: {
    basePrice?: number;
    pricePerMetric?: number;
    pricePerMillionMetrics?: number;
    pricePerGB?: number;
    bytesPerDatapoint?: number;
    freeTier?: number;
    unit: string;
    // Egress pricing (for SaaS platforms)
    egressPricePerGB?: number; // Price per GB for data egress
    egressFreeTier?: number; // Free egress in GB/month
    egressPricePerGBWithPrivateLink?: number; // Reduced egress price with private link (typically near-zero)
  };
  tracing?: {
    basePrice?: number;
    pricePerSpan?: number;
    pricePerMillionSpans?: number;
    pricePerMillionTraces?: number; // Trace-based pricing (for Elastic APM)
    spansPerTrace?: number; // Average spans per trace for conversion (default: 10)
    pricePerGB?: number;
    bytesPerSpan?: number; // Average bytes per span
    freeTier?: number;
    unit: string;
    // Egress pricing (for SaaS platforms)
    egressPricePerGB?: number;
    egressFreeTier?: number;
    egressPricePerGBWithPrivateLink?: number;
  };
  logs?: {
    basePrice?: number;
    pricePerGB?: number;
    freeTier?: number; // In GB
    unit: string;
    // Egress pricing (for SaaS platforms)
    egressPricePerGB?: number;
    egressFreeTier?: number;
    egressPricePerGBWithPrivateLink?: number;
  };
  security?: {
    basePrice?: number;
    pricePerEvent?: number;
    pricePerMillionEvents?: number;
    pricePerGB?: number;
    pricePerEndpoint?: number;
    bytesPerEvent?: number; // Average bytes per security event
    freeTier?: number;
    unit: string;
    // Egress pricing (for SaaS platforms)
    egressPricePerGB?: number;
    egressFreeTier?: number;
    egressPricePerGBWithPrivateLink?: number;
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
    security?: string;
  };
}

// Average bytes per span (for tracing)
// Based on typical OpenTelemetry span sizes
export const BYTES_PER_SPAN = 500; // Average span size in bytes

// Average bytes per security event
// Based on typical SIEM event sizes (logs, alerts, detections)
export const BYTES_PER_SECURITY_EVENT = 1000; // Average security event size in bytes

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
        egressPricePerGB: 0.05, // $0.05/GB egress after free tier
        egressFreeTier: 10, // 10 GB free egress/month
        egressPricePerGBWithPrivateLink: 0.001, // Near-zero with private link
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
        // Elastic APM pricing is trace-based with retention costs included
        // Based on Elastic's public calculator: 60k traces/min with 30d retention = $116k/year
        // This equates to ~$3.73 per million traces (includes retention)
        pricePerMillionTraces: 3.73, // Trace-based pricing with retention included
        // Average spans per trace for conversion (default: 10 spans/trace)
        spansPerTrace: 10,
        bytesPerSpan: 500,
        freeTier: 0,
        unit: "per million traces/month (with retention)",
        egressPricePerGB: 0.05, // $0.05/GB egress after free tier
        egressFreeTier: 50, // 50 GB free egress/month
        egressPricePerGBWithPrivateLink: 0.001, // Near-zero with private link
      },
    },
    notes: {
      tracing: "Elastic Serverless APM uses trace-based pricing (not span-based) with retention costs included. The calculator converts your spans per second to traces using an average of 10 spans per trace, then applies pricing of $3.73 per million traces/month (includes retention). This matches Elastic's public calculator: 10k spans/sec = 1,000 traces/sec = 60k traces/min with 30-day retention = $116k/year. High cardinality doesn't directly increase costs - only trace volume matters. Source: Elastic public calculator. Note: Actual pricing may vary based on retention period and volume tiers.",
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
    id: "elastic-ech-tracing",
    name: "Elastic Cloud Hosted (ECH) APM",
    color: "bg-blue-700",
    pricing: {
      tracing: {
        basePrice: 300, // Minimum 2-node APM + ES cluster
        // Trace-based pricing; ECH is cheaper than Serverless at high volume due to fixed infra amortization
        pricePerMillionTraces: 2.00,
        spansPerTrace: 10,
        bytesPerSpan: 500,
        freeTier: 0,
        unit: "per million traces/month + base cluster",
        egressPricePerGB: 0.09,
        egressFreeTier: 100,
        egressPricePerGBWithPrivateLink: 0.001,
      },
    },
    notes: {
      tracing: "Elastic Cloud Hosted (ECH) APM uses a hybrid pricing model: fixed cluster cost (compute/RAM-hours for minimum deployment) + variable trace storage. Uses trace-based pricing for consistency (10 spans per trace assumed). ECH becomes more cost-effective than Serverless above ~50K traces/month due to amortized infrastructure. Pricing estimated based on Elastic hardware pricing; contact Elastic for a custom quote.",
    },
  },
  {
    id: "elastic-apm-self-hosted",
    name: "Elastic APM (Self-hosted)",
    color: "bg-slate-600",
    pricing: {
      tracing: {
        basePrice: 700, // 2-node Elasticsearch cluster + lightweight APM Server + Kibana
        pricePerMillionSpans: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 280, // 2 ES data nodes @ ~$120/month + APM Server (Go binary, lightweight ~$40/month)
      storage: 200, // Span & trace storage — BBQ compression reduces hot-tier footprint
      memory: 150, // JVM heap for Elasticsearch nodes (APM Server itself is Go, near-zero memory overhead)
      network: 30,
      other: 40, // Kibana node + monitoring + backups
      notes: "2-node Elasticsearch cluster + APM Server (lightweight Go binary) + Kibana. APM Server does not require a dedicated heavy node — Go binary with minimal CPU/memory. Open source Elastic Stack, no licensing cost.",
    },
    notes: {
      tracing: "Elastic APM self-hosted: $700/month fixed infrastructure regardless of span volume. At low volumes this is more expensive than per-span SaaS tools (e.g. Datadog breaks even at ~160 spans/sec: $700 ÷ $1.70/M spans ≈ 412M spans/month). Above ~160 spans/sec, self-hosted becomes dramatically cheaper. APM Server is a lightweight Go binary — not a JVM service — so it adds minimal compute overhead vs. the Elasticsearch cluster itself. Includes distributed tracing, service maps, anomaly detection, and full Kibana APM UI. No licensing costs.",
    },
  },
  {
    id: "clickstack-tracing",
    name: "ClickStack (Managed)",
    color: "bg-yellow-500",
    pricing: {
      tracing: {
        basePrice: 0,
        // Storage: <$0.03/GB/month, ingest compute: ~$0.01/GB → ~$0.04/GB total
        // Uses span-volume → GB conversion (500 bytes/span default)
        pricePerGB: 0.04,
        bytesPerSpan: 500,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      tracing: "ClickStack (Managed) prices on infrastructure, not spans or traces. Storage <$0.03/GB/month + ingest compute ~$0.01/GB ≈ $0.04/GB total ingested. No per-span, per-trace, or per-host fees. Full-fidelity, high-cardinality OpenTelemetry traces retained indefinitely — no sampling. Ingest and query compute scale independently. Compute scales to zero when idle. Source: clickhouse.com/blog/introducing-managed-clickstack-beta",
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
        egressPricePerGB: 0.05, // $0.05/GB egress after free tier
        egressFreeTier: 10, // 10 GB free egress/month
        egressPricePerGBWithPrivateLink: 0.001, // Near-zero with private link
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
        egressPricePerGB: 0.05, // $0.05/GB egress after free tier
        egressFreeTier: 50, // 50 GB free egress/month
        egressPricePerGBWithPrivateLink: 0.001, // Near-zero with private link
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
    id: "splunk-cloud-logs",
    name: "Splunk Cloud",
    color: "bg-orange-600",
    pricing: {
      logs: {
        basePrice: 0,
        pricePerGB: 1.50, // Estimated: $0.60-$1.20/GB/day = $18-$36/GB/month, using conservative $1.50/GB/month
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "Splunk Cloud offers ingest-based pricing. Pricing varies by volume and can range from $0.60-$1.20/GB/day. Estimated monthly pricing shown. Includes indexing, search, and analytics capabilities. Contact Splunk for exact pricing based on your volume.",
    },
  },
  {
    id: "splunk-core-logs",
    name: "Splunk Core (Self-hosted)",
    color: "bg-orange-700",
    pricing: {
      logs: {
        basePrice: 1200, // 3-4 indexer + search head cluster
        // Splunk's indexing overhead is higher than Loki/ES, so compute scales faster with volume
        pricePerGB: 0.06,
        freeTier: 0,
        unit: "per GB/month + base cluster",
      },
    },
    infrastructure: {
      compute: 600, // 3-4 indexer nodes @ $150-200/month each
      storage: 400, // High-performance storage for indexing and search
      memory: 100, // High memory requirements for Splunk indexing
      network: 50,
      other: 50, // Licensing, monitoring, backups, operational overhead
      notes: "3-4 node Splunk cluster for HA, high-performance storage, requires Splunk Enterprise licensing",
    },
    notes: {
      logs: "Splunk Core self-hosted: $1,200/month base cluster + $0.06/GB variable. Base covers 3-4 indexer nodes and search heads. Variable cost reflects Splunk's compute-intensive indexing pipeline, which requires significantly more hardware per GB than Loki or Elasticsearch. Requires Splunk Enterprise licenses for production use (license cost not included). Costs scale steeply with ingest volume.",
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
    id: "elastic-ech-logs",
    name: "Elastic Cloud Hosted (ECH) Logs",
    color: "bg-blue-700",
    pricing: {
      logs: {
        basePrice: 250, // Minimum 2-node hot cluster (compute/RAM-hours)
        // Variable cost per GB ingested; ECH beats Serverless above ~4TB/month ingest
        pricePerGB: 0.05,
        freeTier: 0,
        unit: "per GB/month + base cluster",
        egressPricePerGB: 0.09,
        egressFreeTier: 100,
        egressPricePerGBWithPrivateLink: 0.001,
      },
    },
    notes: {
      logs: "Elastic Cloud Hosted (ECH) uses a hybrid pricing model: fixed cluster cost (compute/RAM-hours for minimum 2-node hot deployment) + variable ingest cost. ECH becomes more cost-effective than Serverless (~$0.109/GB) above ~4 TB/month ingest, and significantly cheaper at enterprise scale (10s–100s of TB/day). Pricing estimated based on Elastic hardware pricing; contact Elastic for a custom quote.",
    },
  },
  {
    id: "loki-self-hosted",
    name: "Grafana Loki (Self-hosted)",
    color: "bg-indigo-600",
    pricing: {
      logs: {
        basePrice: 300, // Minimum cluster: distributor, ingester, querier nodes
        // Variable cost: object storage (S3 ~$0.023/GB) + compute scaling with throughput
        // With ~5:1 log compression, 1 GB ingested ≈ 0.2 GB stored → ~$0.005/GB storage
        // + ingester/querier compute scaling: ~$0.015/GB → total ~$0.02/GB
        pricePerGB: 0.02,
        freeTier: 0,
        unit: "per GB/month + base cluster",
      },
    },
    infrastructure: {
      compute: 150,
      storage: 100,
      memory: 30,
      network: 20,
      notes: "Base cluster cost (distributor, ingester, querier). Variable storage and compute costs scale with ingest volume.",
    },
    notes: {
      logs: "Grafana Loki self-hosted: $300/month base cluster + $0.02/GB variable cost. Variable cost covers object storage (S3/GCS) and the compute scaling required for ingesters and queriers at higher throughput. At small volumes (<15 TB/month) Loki can be very cost-effective; at enterprise scale (100s of TB/day) infrastructure costs grow substantially. Loki does not index log content — only labels — so full-text search requires LogQL pattern matching, which can be limiting vs. Elasticsearch.",
    },
  },
  {
    id: "clickstack-logs",
    name: "ClickStack (Managed)",
    color: "bg-yellow-500",
    pricing: {
      logs: {
        basePrice: 0,
        // Storage: <$0.03/GB/month, ingest compute: ~$0.01/GB → ~$0.04/GB total
        // 10–15× compression on raw log data makes effective stored cost even lower
        pricePerGB: 0.04,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      logs: "ClickStack (Managed) is ClickHouse's managed observability platform (launched Feb 2026). Prices on infrastructure: storage <$0.03/GB/month + ingest compute ~$0.01/GB ≈ $0.04/GB total ingested. No per-user, per-host, or per-event fees. ClickHouse achieves 10–15× compression on log data; effective stored cost is well under $0.03/GB. Full-fidelity, indefinite retention — no sampling, rollups, or forced expiration. Compute scales to zero when idle. Source: clickhouse.com/blog/introducing-managed-clickstack-beta",
    },
  },
  {
    id: "elasticsearch-logs",
    name: "Elasticsearch (Self-hosted)",
    color: "bg-slate-600",
    pricing: {
      logs: {
        basePrice: 500, // Minimum cluster: 2 data nodes + master
        // Variable cost: storage (logsdb 2–5× compression reduces this) + compute scaling
        // ~$0.025/GB: slightly higher than Loki due to indexing overhead, but richer query capability
        pricePerGB: 0.025,
        freeTier: 0,
        unit: "per GB/month + base cluster",
      },
    },
    infrastructure: {
      compute: 200, // 2 data nodes + 1 master — smaller cluster needed with logsdb efficiency
      storage: 150, // Dramatically reduced: logsdb + synthetic source achieves 2–5× compression vs. standard
      memory: 100, // Still needs JVM heap, but smaller nodes suffice
      network: 30,
      other: 20, // Monitoring, backups, operational overhead
      notes: "2 data nodes + 1 master node. Leverages logsdb index mode (columnar storage, synthetic source, Better Binary Quantization) for 2–5× storage reduction vs. legacy Elasticsearch. Open source, no licensing cost.",
    },
    notes: {
      logs: "Elasticsearch self-hosted with modern logsdb index mode: $500/month base + $0.025/GB variable. logsdb, synthetic source, and BBQ (8.15+) cut storage 2–5× vs. legacy Elasticsearch — making variable costs very competitive with Loki. Includes full-text search, ESQL, Kibana dashboards, and ML anomaly detection. No licensing costs. Variable cost covers additional node compute and storage that scales with ingest volume.",
    },
  },
];

// Cost calculation functions
// Calculate egress cost for observability platforms
export function calculateObservabilityEgressCost(
  platform: ObservabilityPlatform,
  monthlyGB: number,
  type: ObservabilityType,
  usePrivateLink: boolean = false
): number {
  const pricing = platform.pricing[type];
  if (!pricing || !pricing.egressPricePerGB) {
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

export function calculateTracingCost(
  platform: ObservabilityPlatform,
  monthlySpans: number,
  includeEgress: boolean = false,
  usePrivateLink: boolean = false
): number {
  const pricing = platform.pricing.tracing;
  if (!pricing) return 0;

  let cost = pricing.basePrice || 0;
  const billableSpans = Math.max(0, monthlySpans - (pricing.freeTier || 0));
  let monthlyGB = 0;

  // Trace-based pricing (for Elastic APM)
  if (pricing.pricePerMillionTraces) {
    const spansPerTrace = pricing.spansPerTrace || 10; // Default: 10 spans per trace
    const monthlyTraces = billableSpans / spansPerTrace;
    cost += (monthlyTraces / 1_000_000) * pricing.pricePerMillionTraces;
    // Estimate GB for egress calculation (if needed)
    const bytesPerSpan = pricing.bytesPerSpan || BYTES_PER_SPAN;
    monthlyGB = (billableSpans * bytesPerSpan) / (1024 * 1024 * 1024);
  } else if (pricing.pricePerGB) {
    const bytesPerSpan = pricing.bytesPerSpan || BYTES_PER_SPAN;
    monthlyGB = (billableSpans * bytesPerSpan) / (1024 * 1024 * 1024);
    cost += monthlyGB * pricing.pricePerGB;
  } else if (pricing.pricePerMillionSpans) {
    cost += (billableSpans / 1_000_000) * pricing.pricePerMillionSpans;
    // Estimate GB for egress calculation (if needed)
    const bytesPerSpan = pricing.bytesPerSpan || BYTES_PER_SPAN;
    monthlyGB = (billableSpans * bytesPerSpan) / (1024 * 1024 * 1024);
  } else if (pricing.pricePerSpan) {
    cost += billableSpans * pricing.pricePerSpan;
    // Estimate GB for egress calculation (if needed)
    const bytesPerSpan = pricing.bytesPerSpan || BYTES_PER_SPAN;
    monthlyGB = (billableSpans * bytesPerSpan) / (1024 * 1024 * 1024);
  }

  // Add egress costs if enabled
  if (includeEgress && monthlyGB > 0) {
    cost += calculateObservabilityEgressCost(platform, monthlyGB, "tracing", usePrivateLink);
  }

  return Math.max(0, cost);
}

export function calculateLogsCost(
  platform: ObservabilityPlatform,
  monthlyGB: number,
  includeEgress: boolean = false,
  usePrivateLink: boolean = false
): number {
  const pricing = platform.pricing.logs;
  if (!pricing) return 0;

  let cost = pricing.basePrice || 0;
  const billableGB = Math.max(0, monthlyGB - (pricing.freeTier || 0));

  if (pricing.pricePerGB) {
    cost += billableGB * pricing.pricePerGB;
  }

  // Add egress costs if enabled
  if (includeEgress && monthlyGB > 0) {
    cost += calculateObservabilityEgressCost(platform, monthlyGB, "logs", usePrivateLink);
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

// Security platforms pricing (as of 2025)
export const securityPlatforms: ObservabilityPlatform[] = [
  {
    id: "elastic-security",
    name: "Elastic Security Serverless",
    color: "bg-blue-500",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 0.129, // $0.11/GB ingested + $0.019/GB retained per month (Security Analytics Complete tier)
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 0,
        unit: "per GB/month",
        egressPricePerGB: 0.05, // $0.05/GB egress after free tier
        egressFreeTier: 50, // 50 GB free egress/month
        egressPricePerGBWithPrivateLink: 0.001, // Near-zero with private link
      },
    },
    notes: {
      security: "Elastic Security Serverless - Security Analytics Complete (Recommended): $0.11/GB ingested + $0.019/GB retained per month (TOP VOLUME TIER pricing). All-inclusive pricing includes: SIEM, threat detection, security analytics, AI-powered insights, entity analytics/UEBA, threat intelligence management, bidirectional response framework, extended security content, and Elastic AI Assistant. No additional add-ons or per-feature charges required for core security analytics. Unified observability platform (metrics, logs, traces, security) in one solution. Optional add-ons available: Endpoint Protection ($0.49/endpoint/month) and Cloud Protection ($0.65/asset/month). Source: https://www.elastic.co/pricing/serverless-security. Note: Pricing comparison is based on raw ingest volume; actual value includes comprehensive security features, unified platform capabilities, and advanced analytics that may require additional modules or add-ons with other vendors.",
    },
  },
  {
    id: "elastic-security-ech",
    name: "Elastic Security ECH",
    color: "bg-blue-700",
    pricing: {
      security: {
        basePrice: 300, // Minimum security cluster on ECH
        pricePerGB: 0.06, // Variable cost per GB; cheaper than Serverless at scale
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 0,
        unit: "per GB/month + base cluster",
        egressPricePerGB: 0.09,
        egressFreeTier: 100,
        egressPricePerGBWithPrivateLink: 0.001,
      },
    },
    notes: {
      security: "Elastic Cloud Hosted (ECH) Security uses a hybrid pricing model: fixed cluster cost + variable ingest. Benefits from all modern Elastic security improvements (logsdb for security events, BBQ compression, AI-driven detection) with lower per-GB cost than Serverless at high ingest volumes. More cost-effective than Serverless above ~5 TB/month ingest. Contact Elastic for custom pricing.",
    },
  },
  {
    id: "elastic-security-self-hosted",
    name: "Elastic Security (Self-hosted)",
    color: "bg-slate-600",
    pricing: {
      security: {
        basePrice: 600,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 250, // 3 nodes (smaller instances with efficient logsdb indexing)
      storage: 200, // Reduced by 2–5× vs. legacy: logsdb + BBQ compression for security event data
      memory: 100, // Smaller JVM heap needed with columnar/synthetic source storage
      network: 30,
      other: 20, // Monitoring, backups, operational overhead
      notes: "3-node Elasticsearch cluster with Security features. Modern logsdb index mode and Better Binary Quantization (BBQ) cut storage requirements 2–5× for security event data. Open source, no licensing cost. Includes SIEM, detection rules, Kibana Security UI, and Elastic AI Assistant.",
    },
    notes: {
      security: "Elastic Security self-hosted with modern storage improvements. logsdb index mode, Better Binary Quantization (BBQ), and synthetic source (introduced in Elasticsearch 8.15+) reduce security event storage by 2–5× vs. legacy setups, significantly lowering TCO. Includes full SIEM, AI-driven threat detection, UEBA, Elastic AI Assistant, and detection rule frameworks — all open source with no licensing cost. Costs scale with event volume and retention requirements.",
    },
  },
  {
    id: "splunk-security",
    name: "Splunk Enterprise Security",
    color: "bg-orange-500",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 0.50,
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      security: "Charges per GB ingested. Includes SIEM, threat detection, and security analytics. Enterprise Security add-on required.",
    },
  },
  {
    id: "splunk-cloud-security",
    name: "Splunk Cloud Security",
    color: "bg-orange-600",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 1.50, // Estimated: $0.60-$1.20/GB/day = $18-$36/GB/month, using conservative $1.50/GB/month
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      security: "Splunk Cloud offers ingest-based pricing for security events. Pricing varies by volume and can range from $0.60-$1.20/GB/day. Estimated monthly pricing shown. Includes SIEM, threat detection, and security analytics. Contact Splunk for exact pricing based on your volume.",
    },
  },
  {
    id: "splunk-core-security",
    name: "Splunk Core (Self-hosted)",
    color: "bg-orange-700",
    pricing: {
      security: {
        basePrice: 1200,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 600, // 3-4 indexer nodes @ $150-200/month each
      storage: 400, // High-performance storage for indexing and search
      memory: 100, // High memory requirements for Splunk indexing
      network: 50,
      other: 50, // Licensing, monitoring, backups, operational overhead
      notes: "3-4 node Splunk cluster for HA, high-performance storage, requires Splunk Enterprise licenses",
    },
    notes: {
      security: "Fixed infrastructure cost. Splunk Core (self-hosted) requires Splunk Enterprise licenses and infrastructure. High-performance storage and compute required for security event indexing and search operations. Costs scale with data volume and retention requirements.",
    },
  },
  {
    id: "datadog-security",
    name: "Datadog Security",
    color: "bg-purple-500",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 0.10, // $0.10/GB ingested
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 5, // 5 GB free/month
        unit: "per GB/month",
      },
    },
    notes: {
      security: "Charges per GB ingested. 5 GB free tier. Includes security monitoring, threat detection, and compliance reporting.",
    },
  },
  {
    id: "microsoft-sentinel",
    name: "Microsoft Sentinel",
    color: "bg-blue-600",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 0.10, // $0.10/GB ingested (first 5 GB free)
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 5, // 5 GB free/month
        unit: "per GB/month",
      },
    },
    notes: {
      security: "Microsoft Sentinel charges $0.10/GB ingested. First 5 GB free per month. Base pricing includes SIEM, threat detection, and security analytics. Azure integration required. Additional features, connectors, and advanced analytics may require separate Azure services or add-ons. Compare total cost including all required Azure services for complete security operations.",
    },
  },
  {
    id: "google-secops",
    name: "Google Security Operations",
    color: "bg-red-500",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 0.10, // Estimated: Google Chronicle pricing varies, using $0.10/GB as baseline
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      security: "Google Security Operations (Chronicle) pricing varies by volume and contract terms. Estimated baseline pricing shown. Base pricing includes SIEM, threat detection, and security analytics. Google Cloud integration required. Additional features, advanced analytics, and enterprise capabilities may require separate services or add-ons. Contact Google for exact pricing based on your volume and requirements.",
    },
  },
  {
    id: "wazuh-self-hosted",
    name: "Wazuh (Self-hosted)",
    color: "bg-green-600",
    pricing: {
      security: {
        basePrice: 500,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 250, // 2-3 manager nodes
      storage: 150, // Storage for logs and alerts
      memory: 50,
      network: 25,
      other: 25, // Monitoring, backups
      notes: "Open-source SIEM. Infrastructure costs for manager, indexer, and dashboard nodes.",
    },
    notes: {
      security: "Fixed infrastructure cost. Open-source SIEM solution. Requires infrastructure for manager, indexer, and dashboard components. No licensing costs.",
    },
  },
  {
    id: "security-onion",
    name: "Security Onion (Self-hosted)",
    color: "bg-green-700",
    pricing: {
      security: {
        basePrice: 800,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 400, // Manager and worker nodes
      storage: 300, // High-performance storage for network and host data
      memory: 50,
      network: 25,
      other: 25, // Monitoring, backups
      notes: "Open-source security monitoring platform. Infrastructure for manager, worker, and storage nodes.",
    },
    notes: {
      security: "Fixed infrastructure cost. Open-source security monitoring and log management platform. Includes SIEM, network security monitoring (NSM), and host-based intrusion detection (HIDS). Requires infrastructure for manager, worker, and storage components.",
    },
  },
];

// Cost calculation function for security
export function calculateSecurityCost(
  platform: ObservabilityPlatform,
  monthlyEvents: number,
  includeEgress: boolean = false,
  usePrivateLink: boolean = false
): number {
  const pricing = platform.pricing.security;
  if (!pricing) return 0;

  let cost = pricing.basePrice || 0;
  const billableEvents = Math.max(0, monthlyEvents - (pricing.freeTier || 0));
  let monthlyGB = 0;

  if (pricing.pricePerGB) {
    const bytesPerEvent = pricing.bytesPerEvent || BYTES_PER_SECURITY_EVENT;
    monthlyGB = (billableEvents * bytesPerEvent) / (1024 * 1024 * 1024);
    cost += monthlyGB * pricing.pricePerGB;
  } else if (pricing.pricePerMillionEvents) {
    cost += (billableEvents / 1_000_000) * pricing.pricePerMillionEvents;
    // Estimate GB for egress calculation (if needed)
    const bytesPerEvent = pricing.bytesPerEvent || BYTES_PER_SECURITY_EVENT;
    monthlyGB = (billableEvents * bytesPerEvent) / (1024 * 1024 * 1024);
  } else if (pricing.pricePerEvent) {
    cost += billableEvents * pricing.pricePerEvent;
    // Estimate GB for egress calculation (if needed)
    const bytesPerEvent = pricing.bytesPerEvent || BYTES_PER_SECURITY_EVENT;
    monthlyGB = (billableEvents * bytesPerEvent) / (1024 * 1024 * 1024);
  }

  // Add egress costs if enabled
  if (includeEgress && monthlyGB > 0) {
    cost += calculateObservabilityEgressCost(platform, monthlyGB, "security", usePrivateLink);
  }

  return Math.max(0, cost);
}

// Convert security events per second to monthly
export function eventsPerSecondToMonthly(eventsPerSecond: number): number {
  const secondsPerMonth = 30 * 24 * 60 * 60;
  return eventsPerSecond * secondsPerMonth;
}

