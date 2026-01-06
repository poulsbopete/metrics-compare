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
  security?: {
    basePrice?: number;
    pricePerEvent?: number;
    pricePerMillionEvents?: number;
    pricePerGB?: number;
    pricePerEndpoint?: number;
    bytesPerEvent?: number; // Average bytes per security event
    freeTier?: number;
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
      notes: "3-4 node Splunk cluster for HA, high-performance storage, requires Splunk Enterprise licensing",
    },
    notes: {
      logs: "Fixed infrastructure cost. Splunk Core (self-hosted) requires Splunk Enterprise licenses and infrastructure. High-performance storage and compute required for indexing and search operations. Costs scale with data volume and retention requirements.",
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
    color: "bg-indigo-600",
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
    color: "bg-slate-600",
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

// Security platforms pricing (as of 2025)
export const securityPlatforms: ObservabilityPlatform[] = [
  {
    id: "elastic-security",
    name: "Elastic Security",
    color: "bg-blue-500",
    pricing: {
      security: {
        basePrice: 0,
        pricePerGB: 0.129, // $0.11/GB ingested + $0.019/GB retained per month (Security Analytics Complete tier)
        bytesPerEvent: BYTES_PER_SECURITY_EVENT,
        freeTier: 0,
        unit: "per GB/month",
      },
    },
    notes: {
      security: "Elastic Security Serverless - Security Analytics Complete (Recommended): $0.11/GB ingested + $0.019/GB retained per month (TOP VOLUME TIER pricing). All-inclusive pricing includes: SIEM, threat detection, security analytics, AI-powered insights, entity analytics/UEBA, threat intelligence management, bidirectional response framework, extended security content, and Elastic AI Assistant. No additional add-ons or per-feature charges required for core security analytics. Unified observability platform (metrics, logs, traces, security) in one solution. Optional add-ons available: Endpoint Protection ($0.49/endpoint/month) and Cloud Protection ($0.65/asset/month). Source: https://www.elastic.co/pricing/serverless-security. Note: Pricing comparison is based on raw ingest volume; actual value includes comprehensive security features, unified platform capabilities, and advanced analytics that may require additional modules or add-ons with other vendors.",
    },
  },
  {
    id: "elastic-security-self-hosted",
    name: "Elastic Security (Self-hosted)",
    color: "bg-slate-600",
    pricing: {
      security: {
        basePrice: 1000,
        pricePerGB: 0,
        freeTier: 0,
        unit: "fixed infrastructure cost",
      },
    },
    infrastructure: {
      compute: 450, // 3+ Elasticsearch nodes @ $150/month each
      storage: 300, // SSD storage for security event indexing and search
      memory: 150, // High memory requirements for Elasticsearch
      network: 50,
      other: 50, // Monitoring, backups, operational overhead
      notes: "3+ node Elasticsearch cluster for HA with Security features (Elastic Stack). Open source on-premises deployment. Includes Elasticsearch, Kibana, and Security features (SIEM, threat detection, security analytics). No licensing costs for open source version.",
    },
    notes: {
      security: "Fixed infrastructure cost. Elastic Security (self-hosted) uses the open source Elastic Stack (Elasticsearch, Kibana) with Security features. Includes SIEM, threat detection, security analytics, and log analysis capabilities. Open source version available at no licensing cost. Requires infrastructure for Elasticsearch cluster, Kibana, and security event processing. Costs scale with data volume and retention requirements.",
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
  monthlyEvents: number
): number {
  const pricing = platform.pricing.security;
  if (!pricing) return 0;

  let cost = pricing.basePrice || 0;
  const billableEvents = Math.max(0, monthlyEvents - (pricing.freeTier || 0));

  if (pricing.pricePerGB) {
    const bytesPerEvent = pricing.bytesPerEvent || BYTES_PER_SECURITY_EVENT;
    const monthlyGB = (billableEvents * bytesPerEvent) / (1024 * 1024 * 1024);
    cost += monthlyGB * pricing.pricePerGB;
  } else if (pricing.pricePerMillionEvents) {
    cost += (billableEvents / 1_000_000) * pricing.pricePerMillionEvents;
  } else if (pricing.pricePerEvent) {
    cost += billableEvents * pricing.pricePerEvent;
  }

  return Math.max(0, cost);
}

// Convert security events per second to monthly
export function eventsPerSecondToMonthly(eventsPerSecond: number): number {
  const secondsPerMonth = 30 * 24 * 60 * 60;
  return eventsPerSecond * secondsPerMonth;
}

