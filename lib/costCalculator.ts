export interface Platform {
  id: string;
  name: string;
  color: string;
  pricing: {
    basePrice?: number;
    pricePerMetric?: number;
    pricePerMillionMetrics?: number;
    freeTier?: number;
    unit: string;
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
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.50,
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "datadog",
    name: "Datadog",
    color: "bg-purple-500",
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
    pricing: {
      basePrice: 200, // Estimated infrastructure cost (compute + storage)
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
  },
  {
    id: "grafana-cloud",
    name: "Grafana Cloud",
    color: "bg-indigo-500",
    pricing: {
      basePrice: 0,
      pricePerMillionMetrics: 0.30,
      freeTier: 0,
      unit: "per million metrics/month",
    },
  },
  {
    id: "thanos",
    name: "Thanos (Self-hosted)",
    color: "bg-pink-500",
    pricing: {
      basePrice: 350, // Infrastructure cost (compute + object storage)
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
  },
  {
    id: "victoria-metrics",
    name: "VictoriaMetrics (Self-hosted)",
    color: "bg-emerald-500",
    pricing: {
      basePrice: 150, // Lower infrastructure cost due to efficiency
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
  },
  {
    id: "cortex",
    name: "Cortex (Self-hosted)",
    color: "bg-amber-500",
    pricing: {
      basePrice: 300, // Infrastructure cost (distributed architecture)
      pricePerMillionMetrics: 0,
      freeTier: 0,
      unit: "fixed infrastructure cost",
    },
  },
];

