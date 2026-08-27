/**
 * Elastic Cloud Serverless estimator — Observability, Security, and Search.
 *
 * Product selector mirrors cloud.elastic.co/pricing/serverless.
 * Observability: logs GB/day + metrics GB/day + traces TPM (per-signal retention).
 * Security: security data GB/day + retention (Analytics Complete / Essentials).
 * Search: ingest/search/ML VCUs + searchable storage GB (published floors).
 */

import {
  calculateElasticServerlessCost,
  calculateElasticServerlessMetricsCost,
  calculateElasticsearchServerlessCost,
  calculateObservabilityCompleteFloorCost,
  calculateSecurityServerlessFloorCost,
  ELASTIC_DAYS_PER_MONTH,
  ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  ELASTIC_SERVERLESS_SEARCH_PRICING_URL,
  ELASTIC_SERVERLESS_SECURITY_PRICING_URL,
  ELASTICSEARCH_SERVERLESS_PUBLISHED,
  getElasticServerlessRates,
  type ElasticServerlessCostBreakdown,
  type ElasticServerlessProductTier,
  type ElasticServerlessSolution,
  type ElasticsearchServerlessSearchBreakdown,
} from "./elasticServerlessPricing";
import {
  BYTES_PER_SECURITY_EVENT,
  BYTES_PER_SPAN,
  calculateLogsCost,
  calculateSecurityCost,
  calculateTracingCost,
  logsPlatforms,
  securityPlatforms,
  tracingPlatforms,
} from "./observabilityPricing";
import {
  BYTES_PER_DATAPOINT,
  calculatePlatformCost,
  platforms,
} from "./costCalculator";
import { gbPerDayToMetricsPerSecond, gbPerDayToMonthlyMetrics } from "./infrastructureData";
import {
  DEFAULT_TCO_PRICING_CONTEXT,
  type TcoPricingContext,
} from "./tcoPricingContext";

export {
  ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  ELASTIC_SERVERLESS_SEARCH_PRICING_URL,
  ELASTIC_SERVERLESS_SECURITY_PRICING_URL,
  ELASTICSEARCH_SERVERLESS_PUBLISHED,
};
export type { ElasticServerlessSolution };

export type ServerlessEstimatorPricingMode = "tiered" | "floors";

export type SecurityFeatureTier =
  | "security-analytics-complete"
  | "security-analytics-essentials";

export interface ServerlessEstimatorInputs {
  solution: ElasticServerlessSolution;

  // —— Observability ——
  logsGbPerDay: number;
  logsRetentionMonths: number;
  metricsGbPerDay: number;
  metricsRetentionMonths: number;
  tracesPerMinute: number;
  traceSamplingPercent: number;
  tracesRetentionMonths: number;
  bytesPerSpan: number;
  pricingMode: ServerlessEstimatorPricingMode;
  datadogHosts?: number;
  metricsBytesPerDatapoint?: number;

  // —— Security ——
  securityGbPerDay: number;
  securityRetentionMonths: number;
  securityTier: SecurityFeatureTier;

  // —— Search ——
  searchIngestVcus: number;
  searchSearchVcus: number;
  searchMlVcus: number;
  searchStoredGB: number;
}

export const SERVERLESS_SOLUTION_OPTIONS: {
  id: ElasticServerlessSolution;
  label: string;
  description: string;
}[] = [
  {
    id: "observability",
    label: "Observability",
    description: "Logs, metrics, and traces — Observability Complete",
  },
  {
    id: "security",
    label: "Security",
    description: "SIEM / security analytics — ingest + retention GB",
  },
  {
    id: "search",
    label: "Search",
    description: "Elasticsearch Serverless — VCUs + Search AI Lake storage",
  },
];

/** Customer example that fails on the official Cloud Observability estimator. */
export const SERVERLESS_ESTIMATOR_EXAMPLE: ServerlessEstimatorInputs = {
  solution: "observability",
  logsGbPerDay: 585,
  logsRetentionMonths: 1.2,
  metricsGbPerDay: 12,
  metricsRetentionMonths: 12,
  tracesPerMinute: 208_333,
  traceSamplingPercent: 100,
  tracesRetentionMonths: 3,
  bytesPerSpan: BYTES_PER_SPAN,
  pricingMode: "tiered",
  datadogHosts: 585,
  metricsBytesPerDatapoint: BYTES_PER_DATAPOINT.Prometheus,
  securityGbPerDay: 100,
  securityRetentionMonths: 3,
  securityTier: "security-analytics-complete",
  searchIngestVcus: 2,
  searchSearchVcus: 4,
  searchMlVcus: 0,
  searchStoredGB: 20,
};

export const DEFAULT_SERVERLESS_ESTIMATOR_INPUTS: ServerlessEstimatorInputs = {
  solution: "observability",
  logsGbPerDay: 10,
  logsRetentionMonths: 1,
  metricsGbPerDay: 1,
  metricsRetentionMonths: 1,
  tracesPerMinute: 1_000,
  traceSamplingPercent: 100,
  tracesRetentionMonths: 1,
  bytesPerSpan: BYTES_PER_SPAN,
  pricingMode: "tiered",
  datadogHosts: 10,
  metricsBytesPerDatapoint: BYTES_PER_DATAPOINT.Prometheus,
  securityGbPerDay: 50,
  securityRetentionMonths: 1,
  securityTier: "security-analytics-complete",
  // Elastic FAQ example 2-ish: 20GB searchable, modest VCUs
  searchIngestVcus: 1,
  searchSearchVcus: 2,
  searchMlVcus: 0,
  searchStoredGB: 20,
};

export interface ServerlessEstimatorSignalLine {
  signal: string;
  label: string;
  rawGbPerDay: number;
  billableMonthlyIngestGB: number;
  retentionMonths: number;
  storedGB: number;
  ingestCost: number;
  retentionCost: number;
  volumeCost: number;
  ingestRateLabel: string;
  retentionRateLabel: string;
  notes: string;
}

export interface ServerlessCompetitorSignalCosts {
  metrics: number | null;
  logs: number | null;
  traces: number | null;
  security: number | null;
}

export interface ServerlessCompetitorCoverage {
  metrics: boolean;
  logs: boolean;
  traces: boolean;
  security: boolean;
}

export interface ServerlessCompetitorEstimate {
  id: string;
  name: string;
  color: string;
  isElastic?: boolean;
  coverage: ServerlessCompetitorCoverage;
  signals: ServerlessCompetitorSignalCosts;
  /** Sum of priced (non-null) signal costs only. */
  monthlyTotal: number;
  annualTotal: number;
  pricedSignalCount: number;
  /** Short label e.g. "Metrics only" or "Full stack". */
  coverageLabel: string;
  assumptions: string;
  vsElasticPct: number | null;
}

export interface ServerlessEstimatorResult {
  solution: ElasticServerlessSolution;
  daysPerMonth: number;
  logsMeteringMultiplier: number;
  lines: ServerlessEstimatorSignalLine[];
  monthlyTotal: number;
  annualTotal: number;
  pricingMode: ServerlessEstimatorPricingMode;
  competitorVolumes: {
    logsMonthlyGB: number;
    metricsSamplesPerSecond: number;
    metricsMonthlyDatapoints: number;
    metricsBytesPerDatapoint: number;
    monthlySpans: number;
    datadogHosts: number;
    securityMonthlyGB: number;
  };
  competitors: ServerlessCompetitorEstimate[];
  searchBreakdown?: ElasticsearchServerlessSearchBreakdown;
  productLabel: string;
}

const GIB = 1024 * 1024 * 1024;

export function gbPerDayToMonthly(gbPerDay: number): number {
  return Math.max(0, gbPerDay) * ELASTIC_DAYS_PER_MONTH;
}

export function estimateDatadogHostsFromLogs(logsGbPerDay: number): number {
  if (logsGbPerDay <= 0) return 10;
  return Math.max(10, Math.round(logsGbPerDay));
}

export function tracesTpmToMonthlyGB(
  tracesPerMinute: number,
  samplingPercent: number,
  bytesPerSpan: number = BYTES_PER_SPAN
): number {
  const tpm = Math.max(0, tracesPerMinute);
  const sample = Math.min(100, Math.max(0, samplingPercent)) / 100;
  const bytes = Math.max(0, bytesPerSpan);
  const spansPerMonth = tpm * sample * 60 * 24 * ELASTIC_DAYS_PER_MONTH;
  return (spansPerMonth * bytes) / GIB;
}

export function tracesTpmToGbPerDay(
  tracesPerMinute: number,
  samplingPercent: number,
  bytesPerSpan: number = BYTES_PER_SPAN
): number {
  return tracesTpmToMonthlyGB(tracesPerMinute, samplingPercent, bytesPerSpan) / ELASTIC_DAYS_PER_MONTH;
}

export function tracesTpmToMonthlySpans(
  tracesPerMinute: number,
  samplingPercent: number
): number {
  const tpm = Math.max(0, tracesPerMinute);
  const sample = Math.min(100, Math.max(0, samplingPercent)) / 100;
  return tpm * sample * 60 * 24 * ELASTIC_DAYS_PER_MONTH;
}

function costForLogsTraces(
  monthlyIngestGB: number,
  retentionMonths: number,
  pricingMode: ServerlessEstimatorPricingMode
): ElasticServerlessCostBreakdown {
  if (pricingMode === "floors") {
    return calculateObservabilityCompleteFloorCost(monthlyIngestGB, retentionMonths, "logs_traces");
  }
  return calculateElasticServerlessCost(monthlyIngestGB, {
    retentionMonths,
    productTier: "observability-complete",
    useVolumeTiers: true,
  });
}

function costForMetrics(
  monthlyIngestGB: number,
  retentionMonths: number,
  pricingMode: ServerlessEstimatorPricingMode
): ElasticServerlessCostBreakdown {
  if (pricingMode === "floors") {
    return calculateObservabilityCompleteFloorCost(monthlyIngestGB, retentionMonths, "metrics");
  }
  return calculateElasticServerlessMetricsCost(monthlyIngestGB, {
    retentionMonths,
    productTier: "observability-complete",
    useVolumeTiers: true,
  });
}

function costForSecurity(
  monthlyIngestGB: number,
  retentionMonths: number,
  pricingMode: ServerlessEstimatorPricingMode,
  tier: SecurityFeatureTier
): ElasticServerlessCostBreakdown {
  if (pricingMode === "floors") {
    return calculateSecurityServerlessFloorCost(monthlyIngestGB, retentionMonths, tier);
  }
  return calculateElasticServerlessCost(monthlyIngestGB, {
    retentionMonths,
    productTier: tier,
    useVolumeTiers: true,
  });
}

function toLine(
  signal: string,
  label: string,
  rawGbPerDay: number,
  breakdown: ElasticServerlessCostBreakdown,
  retentionMonths: number,
  notes: string
): ServerlessEstimatorSignalLine {
  return {
    signal,
    label,
    rawGbPerDay,
    billableMonthlyIngestGB: breakdown.monthlyIngestGB,
    retentionMonths,
    storedGB: breakdown.storedGB,
    ingestCost: breakdown.ingestCost,
    retentionCost: breakdown.retentionCost,
    volumeCost: breakdown.volumeCost,
    ingestRateLabel: breakdown.ingestRateLabel,
    retentionRateLabel: breakdown.retentionRateLabel,
    notes,
  };
}

function competitorPricingContext(hosts: number, retentionMonths: number): TcoPricingContext {
  return {
    ...DEFAULT_TCO_PRICING_CONTEXT,
    elastic: {
      ...DEFAULT_TCO_PRICING_CONTEXT.elastic,
      retentionMonths,
    },
    datadog: {
      ...DEFAULT_TCO_PRICING_CONTEXT.datadog,
      infraHosts: hosts,
      apmHosts: hosts,
    },
  };
}

function emptyVolumes(): ServerlessEstimatorResult["competitorVolumes"] {
  return {
    logsMonthlyGB: 0,
    metricsSamplesPerSecond: 0,
    metricsMonthlyDatapoints: 0,
    metricsBytesPerDatapoint: BYTES_PER_DATAPOINT.Prometheus,
    monthlySpans: 0,
    datadogHosts: 10,
    securityMonthlyGB: 0,
  };
}

function coverageLabel(c: ServerlessCompetitorCoverage): string {
  const parts: string[] = [];
  if (c.metrics) parts.push("Metrics");
  if (c.traces) parts.push("Traces");
  if (c.logs) parts.push("Logs");
  if (c.security) parts.push("Security");
  if (parts.length === 4) return "Full stack";
  if (parts.length === 0) return "None";
  if (parts.length === 1) return `${parts[0]} only`;
  return parts.join(" · ");
}

function sumPriced(signals: ServerlessCompetitorSignalCosts): {
  monthlyTotal: number;
  pricedSignalCount: number;
} {
  let monthlyTotal = 0;
  let pricedSignalCount = 0;
  for (const v of [signals.metrics, signals.logs, signals.traces, signals.security]) {
    if (v != null) {
      monthlyTotal += v;
      pricedSignalCount += 1;
    }
  }
  return { monthlyTotal, pricedSignalCount };
}

function makeVendorRow(
  id: string,
  name: string,
  color: string,
  coverage: ServerlessCompetitorCoverage,
  signals: ServerlessCompetitorSignalCosts,
  assumptions: string,
  elasticMonthly: number | null,
  isElastic?: boolean
): ServerlessCompetitorEstimate {
  const { monthlyTotal, pricedSignalCount } = sumPriced(signals);
  return {
    id,
    name,
    color,
    isElastic,
    coverage,
    signals,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    pricedSignalCount,
    coverageLabel: coverageLabel(coverage),
    assumptions,
    vsElasticPct:
      elasticMonthly != null && elasticMonthly > 0 && !isElastic
        ? ((monthlyTotal - elasticMonthly) / elasticMonthly) * 100
        : null,
  };
}

type EstimatorVendorDef = {
  id: string;
  name: string;
  color: string;
  isElastic?: boolean;
  coverage: ServerlessCompetitorCoverage;
  metricsId?: string;
  tracingId?: string;
  logsId?: string;
  securityId?: string;
  note: string;
};

/** Vendors shown on Observability estimator — coverage columns make metrics-only stacks explicit. */
const OBSERVABILITY_ESTIMATOR_VENDORS: EstimatorVendorDef[] = [
  {
    id: "elastic-serverless",
    name: "Elastic Serverless",
    color: "bg-blue-500",
    isElastic: true,
    coverage: { metrics: true, traces: true, logs: true, security: true },
    note: "Observability Complete (this worksheet) · Security priced on Security product",
  },
  {
    id: "elastic-ech",
    name: "Elastic Cloud Hosted (ECH)",
    color: "bg-blue-700",
    isElastic: true,
    coverage: { metrics: true, traces: true, logs: true, security: true },
    metricsId: "elastic-ech",
    tracingId: "elastic-ech-tracing",
    logsId: "elastic-ech-logs",
    note: "~$200/mo cluster min on metrics · $0.05/GB ingest + 1d hot + ILM blob retention",
  },
  {
    id: "datadog",
    name: "Datadog",
    color: "bg-purple-500",
    coverage: { metrics: true, traces: true, logs: true, security: true },
    metricsId: "datadog",
    tracingId: "datadog-tracing",
    logsId: "datadog-logs",
    note: "Infra+APM hosts · custom metrics · logs ingest+index · Security separate SKU",
  },
  {
    id: "grafana-cloud",
    name: "Grafana Cloud",
    color: "bg-orange-400",
    coverage: { metrics: true, traces: true, logs: true, security: false },
    metricsId: "grafana-cloud",
    tracingId: "grafana-tracing",
    logsId: "grafana-logs",
    note: "Mimir/Loki/Tempo · no native SIEM",
  },
  {
    id: "dynatrace",
    name: "Dynatrace",
    color: "bg-cyan-500",
    coverage: { metrics: true, traces: true, logs: true, security: true },
    metricsId: "dynatrace",
    tracingId: "dynatrace-tracing",
    logsId: "dynatrace-logs",
    note: "Grail logs · AppSec is runtime (not full SIEM) — security cost not in this O11y sheet",
  },
  {
    id: "new-relic",
    name: "New Relic",
    color: "bg-green-500",
    coverage: { metrics: true, traces: true, logs: true, security: false },
    metricsId: "new-relic",
    tracingId: "new-relic-tracing",
    logsId: "new-relic-logs",
    note: "No native SIEM",
  },
  {
    id: "splunk",
    name: "Splunk Observability",
    color: "bg-orange-500",
    coverage: { metrics: true, traces: true, logs: true, security: true },
    metricsId: "splunk-o11y",
    tracingId: "splunk-tracing",
    logsId: "splunk-logs",
    note: "O11y + Enterprise Security are separate products — security not in this sheet",
  },
  {
    id: "clickstack",
    name: "ClickStack (Managed)",
    color: "bg-yellow-500",
    coverage: { metrics: true, traces: true, logs: true, security: false },
    metricsId: "clickstack-managed",
    tracingId: "clickstack-tracing",
    logsId: "clickstack-logs",
    note: "Observability only — no SIEM",
  },
  {
    id: "victoria-metrics",
    name: "VictoriaMetrics",
    color: "bg-emerald-500",
    coverage: { metrics: true, traces: false, logs: false, security: false },
    metricsId: "victoria-metrics",
    note: "Metrics-only self-hosted · pair with Loki/Tempo (or Elastic) for logs/traces",
  },
  {
    id: "prometheus",
    name: "Prometheus (self-hosted)",
    color: "bg-red-500",
    coverage: { metrics: true, traces: false, logs: false, security: false },
    metricsId: "prometheus",
    note: "Metrics-only",
  },
  {
    id: "thanos",
    name: "Thanos (self-hosted)",
    color: "bg-pink-500",
    coverage: { metrics: true, traces: false, logs: false, security: false },
    metricsId: "thanos",
    note: "Long-term metrics with Prometheus",
  },
  {
    id: "cortex",
    name: "Cortex / Mimir (self-hosted)",
    color: "bg-amber-500",
    coverage: { metrics: true, traces: false, logs: false, security: false },
    metricsId: "cortex",
    note: "Metrics-only · often paired with Loki + Tempo",
  },
  {
    id: "loki-self-hosted",
    name: "Grafana Loki (self-hosted)",
    color: "bg-rose-600",
    coverage: { metrics: false, traces: false, logs: true, security: false },
    logsId: "loki-self-hosted",
    note: "Logs-only",
  },
  {
    id: "tempo-self-hosted",
    name: "Grafana Tempo (self-hosted)",
    color: "bg-rose-500",
    coverage: { metrics: false, traces: true, logs: false, security: false },
    tracingId: "tempo-self-hosted",
    note: "Traces-only",
  },
  {
    id: "chronosphere",
    name: "Chronosphere",
    color: "bg-teal-500",
    coverage: { metrics: true, traces: false, logs: false, security: false },
    metricsId: "chronosphere",
    note: "Metrics-focused SaaS",
  },
  {
    id: "observe-inc",
    name: "Observe Inc",
    color: "bg-violet-500",
    coverage: { metrics: true, traces: false, logs: true, security: false },
    metricsId: "observe-inc",
    logsId: "observe-logs",
    note: "Metrics + logs (Snowflake) · no SIEM in this model",
  },
];

function buildObservabilityCompetitors(
  inputs: ServerlessEstimatorInputs,
  elasticServerless: {
    metrics: number;
    logs: number;
    traces: number;
  },
  volumes: ServerlessEstimatorResult["competitorVolumes"]
): ServerlessCompetitorEstimate[] {
  const retentionMonths = Math.max(
    inputs.logsRetentionMonths,
    inputs.metricsRetentionMonths,
    inputs.tracesRetentionMonths
  );
  const ctx = competitorPricingContext(volumes.datadogHosts, retentionMonths);
  const elasticMonthly =
    elasticServerless.metrics + elasticServerless.logs + elasticServerless.traces;

  const costMetrics = (id: string | undefined): number | null => {
    if (!id) return null;
    const p = platforms.find((x) => x.id === id);
    if (!p) return null;
    return calculatePlatformCost(
      p,
      volumes.metricsMonthlyDatapoints,
      "Prometheus",
      false,
      false,
      ctx,
      volumes.metricsBytesPerDatapoint
    );
  };
  const costLogs = (id: string | undefined): number | null => {
    if (!id) return null;
    const p = logsPlatforms.find((x) => x.id === id);
    if (!p) return null;
    // ECH uses raw GB; Serverless path is already in elasticServerless.logs
    return calculateLogsCost(p, volumes.logsMonthlyGB, false, false, ctx);
  };
  const costTraces = (id: string | undefined): number | null => {
    if (!id) return null;
    const p = tracingPlatforms.find((x) => x.id === id);
    if (!p) return null;
    return calculateTracingCost(p, volumes.monthlySpans, false, false, ctx);
  };

  return OBSERVABILITY_ESTIMATOR_VENDORS.map((v) => {
    if (v.id === "elastic-serverless") {
      return makeVendorRow(
        v.id,
        v.name,
        v.color,
        v.coverage,
        {
          metrics: elasticServerless.metrics,
          logs: elasticServerless.logs,
          traces: elasticServerless.traces,
          security: null,
        },
        v.note,
        elasticMonthly,
        true
      );
    }

    const signals: ServerlessCompetitorSignalCosts = {
      metrics: v.coverage.metrics ? costMetrics(v.metricsId) : null,
      logs: v.coverage.logs ? costLogs(v.logsId) : null,
      traces: v.coverage.traces ? costTraces(v.tracingId) : null,
      // Security not metered on Observability worksheet inputs
      security: null,
    };

    let assumptions = v.note;
    if (v.id === "datadog") {
      assumptions = `${volumes.datadogHosts.toLocaleString()} hosts · ${v.note}`;
    } else if (v.id === "grafana-cloud") {
      assumptions = `~${Math.round(volumes.metricsSamplesPerSecond).toLocaleString()} samples/sec · ${v.note}`;
    }

    return makeVendorRow(
      v.id,
      v.name,
      v.color,
      v.coverage,
      signals,
      assumptions,
      elasticMonthly,
      v.isElastic
    );
  }).sort((a, b) => {
    // Elastic first, then by monthly total among priced rows
    if (a.isElastic && !b.isElastic) return -1;
    if (!a.isElastic && b.isElastic) return 1;
    if (a.isElastic && b.isElastic) {
      if (a.id === "elastic-serverless") return -1;
      if (b.id === "elastic-serverless") return 1;
    }
    return a.monthlyTotal - b.monthlyTotal;
  });
}

function buildSecurityCompetitors(
  elasticMonthly: number,
  securityMonthlyGB: number,
  retentionMonths: number,
  elasticLabel: string
): ServerlessCompetitorEstimate[] {
  const ctx = competitorPricingContext(10, retentionMonths);
  const events = (securityMonthlyGB * GIB) / BYTES_PER_SECURITY_EVENT;

  const rows: ServerlessCompetitorEstimate[] = [
    makeVendorRow(
      "elastic-security",
      elasticLabel,
      "bg-blue-500",
      { metrics: false, traces: false, logs: false, security: true },
      { metrics: null, logs: null, traces: null, security: elasticMonthly },
      "Security Analytics Serverless (this worksheet)",
      elasticMonthly,
      true
    ),
  ];

  const dd = securityPlatforms.find((p) => p.id === "datadog-security");
  if (dd) {
    const ddCost = calculateSecurityCost(dd, events, false, false, ctx);
    rows.push(
      makeVendorRow(
        "datadog-security",
        "Datadog Security",
        "bg-purple-500",
        { metrics: false, traces: false, logs: false, security: true },
        { metrics: null, logs: null, traces: null, security: ddCost },
        `~${Math.round(securityMonthlyGB).toLocaleString()} GB/mo @ $0.10/GB list`,
        elasticMonthly
      )
    );
  }

  const splunk = securityPlatforms.find((p) => p.id === "splunk-security");
  if (splunk) {
    const cost = calculateSecurityCost(splunk, events, false, false, ctx);
    rows.push(
      makeVendorRow(
        "splunk-security",
        "Splunk Security",
        "bg-orange-500",
        { metrics: false, traces: false, logs: false, security: true },
        { metrics: null, logs: null, traces: null, security: cost },
        "SIEM / security analytics list proxy",
        elasticMonthly
      )
    );
  }

  return rows.sort((a, b) => {
    if (a.isElastic && !b.isElastic) return -1;
    if (!a.isElastic && b.isElastic) return 1;
    return a.monthlyTotal - b.monthlyTotal;
  });
}

function calculateObservability(inputs: ServerlessEstimatorInputs): ServerlessEstimatorResult {
  const rates = getElasticServerlessRates("observability-complete");
  const logsMultiplier = rates.logsMeteringMultiplier ?? 1.66;
  const mode = inputs.pricingMode;
  const metricsBytes =
    inputs.metricsBytesPerDatapoint ?? BYTES_PER_DATAPOINT.Prometheus;
  const datadogHosts =
    inputs.datadogHosts != null && inputs.datadogHosts > 0
      ? Math.round(inputs.datadogHosts)
      : estimateDatadogHostsFromLogs(inputs.logsGbPerDay);

  const logsRawMonthly = gbPerDayToMonthly(inputs.logsGbPerDay);
  const logsBillableMonthly = logsRawMonthly * logsMultiplier;
  const logsBd = costForLogsTraces(logsBillableMonthly, inputs.logsRetentionMonths, mode);
  const metricsMonthly = gbPerDayToMonthly(inputs.metricsGbPerDay);
  const metricsBd = costForMetrics(metricsMonthly, inputs.metricsRetentionMonths, mode);
  const tracesMonthly = tracesTpmToMonthlyGB(
    inputs.tracesPerMinute,
    inputs.traceSamplingPercent,
    inputs.bytesPerSpan
  );
  const tracesGbDay = tracesTpmToGbPerDay(
    inputs.tracesPerMinute,
    inputs.traceSamplingPercent,
    inputs.bytesPerSpan
  );
  const tracesBd = costForLogsTraces(tracesMonthly, inputs.tracesRetentionMonths, mode);

  const lines = [
    toLine(
      "logs",
      "Logs",
      inputs.logsGbPerDay,
      logsBd,
      inputs.logsRetentionMonths,
      `Raw × ${logsMultiplier} metering → ${logsBillableMonthly.toFixed(1)} GB/mo billable`
    ),
    toLine(
      "metrics",
      "Metrics (TSDS)",
      inputs.metricsGbPerDay,
      metricsBd,
      inputs.metricsRetentionMonths,
      mode === "floors"
        ? "Published TSDS floors ($0.023/GB ingest · $0.005/GB-mo)"
        : "TSDS = 25% of Complete ingest + retention tier table"
    ),
    toLine(
      "traces",
      "Traces",
      tracesGbDay,
      tracesBd,
      inputs.tracesRetentionMonths,
      `${inputs.tracesPerMinute.toLocaleString()} TPM × ${inputs.traceSamplingPercent}% @ ${inputs.bytesPerSpan} B/span`
    ),
  ];

  const monthlyTotal = lines.reduce((s, l) => s + l.volumeCost, 0);
  const competitorVolumes = {
    logsMonthlyGB: logsRawMonthly,
    metricsSamplesPerSecond: gbPerDayToMetricsPerSecond(inputs.metricsGbPerDay, metricsBytes),
    metricsMonthlyDatapoints: gbPerDayToMonthlyMetrics(inputs.metricsGbPerDay, metricsBytes),
    metricsBytesPerDatapoint: metricsBytes,
    monthlySpans: tracesTpmToMonthlySpans(inputs.tracesPerMinute, inputs.traceSamplingPercent),
    datadogHosts,
    securityMonthlyGB: 0,
  };

  const elasticServerlessSignals = {
    metrics: metricsBd.volumeCost,
    logs: logsBd.volumeCost,
    traces: tracesBd.volumeCost,
  };

  return {
    solution: "observability",
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    logsMeteringMultiplier: logsMultiplier,
    lines,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    pricingMode: mode,
    competitorVolumes,
    competitors: buildObservabilityCompetitors(
      inputs,
      elasticServerlessSignals,
      competitorVolumes
    ),
    productLabel: "Observability Complete",
  };
}

function calculateSecurity(inputs: ServerlessEstimatorInputs): ServerlessEstimatorResult {
  const mode = inputs.pricingMode;
  const tier = inputs.securityTier;
  const monthlyGB = gbPerDayToMonthly(inputs.securityGbPerDay);
  const bd = costForSecurity(monthlyGB, inputs.securityRetentionMonths, mode, tier);
  const rates = getElasticServerlessRates(tier as ElasticServerlessProductTier);
  const lines = [
    toLine(
      "security",
      rates.label,
      inputs.securityGbPerDay,
      bd,
      inputs.securityRetentionMonths,
      `${mode === "floors" ? "Published floor" : "Volume tier table"} · Security Analytics`
    ),
  ];
  const monthlyTotal = bd.volumeCost;
  const competitorVolumes = {
    ...emptyVolumes(),
    securityMonthlyGB: monthlyGB,
  };

  return {
    solution: "security",
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    logsMeteringMultiplier: 1,
    lines,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    pricingMode: mode,
    competitorVolumes,
    competitors: buildSecurityCompetitors(
      monthlyTotal,
      monthlyGB,
      inputs.securityRetentionMonths,
      rates.label
    ),
    productLabel: rates.label,
  };
}

function calculateSearch(inputs: ServerlessEstimatorInputs): ServerlessEstimatorResult {
  const searchBreakdown = calculateElasticsearchServerlessCost({
    ingestVcus: inputs.searchIngestVcus,
    searchVcus: inputs.searchSearchVcus,
    mlVcus: inputs.searchMlVcus,
    storedGB: inputs.searchStoredGB,
  });
  const rates = searchBreakdown.rates;
  const lines: ServerlessEstimatorSignalLine[] = [
    {
      signal: "ingest-vcu",
      label: "Ingest VCUs",
      rawGbPerDay: 0,
      billableMonthlyIngestGB: 0,
      retentionMonths: 0,
      storedGB: 0,
      ingestCost: searchBreakdown.ingestCost,
      retentionCost: 0,
      volumeCost: searchBreakdown.ingestCost,
      ingestRateLabel: `$${rates.ingestVcuPerHour.toFixed(2)}/VCU-hour`,
      retentionRateLabel: "",
      notes: `${inputs.searchIngestVcus} VCU × ${rates.hoursPerMonth} h = ${searchBreakdown.ingestVcuHours.toLocaleString()} VCU-hours`,
    },
    {
      signal: "search-vcu",
      label: "Search VCUs",
      rawGbPerDay: 0,
      billableMonthlyIngestGB: 0,
      retentionMonths: 0,
      storedGB: 0,
      ingestCost: searchBreakdown.searchCost,
      retentionCost: 0,
      volumeCost: searchBreakdown.searchCost,
      ingestRateLabel: `$${rates.searchVcuPerHour.toFixed(2)}/VCU-hour`,
      retentionRateLabel: "",
      notes: `${inputs.searchSearchVcus} VCU × ${rates.hoursPerMonth} h = ${searchBreakdown.searchVcuHours.toLocaleString()} VCU-hours`,
    },
    {
      signal: "ml-vcu",
      label: "ML VCUs",
      rawGbPerDay: 0,
      billableMonthlyIngestGB: 0,
      retentionMonths: 0,
      storedGB: 0,
      ingestCost: searchBreakdown.mlCost,
      retentionCost: 0,
      volumeCost: searchBreakdown.mlCost,
      ingestRateLabel: `$${rates.mlVcuPerHour.toFixed(2)}/VCU-hour`,
      retentionRateLabel: "",
      notes: `${inputs.searchMlVcus} VCU × ${rates.hoursPerMonth} h = ${searchBreakdown.mlVcuHours.toLocaleString()} VCU-hours`,
    },
    {
      signal: "storage",
      label: "Storage & retention",
      rawGbPerDay: 0,
      billableMonthlyIngestGB: 0,
      retentionMonths: 1,
      storedGB: searchBreakdown.storedGB,
      ingestCost: 0,
      retentionCost: searchBreakdown.storageCost,
      volumeCost: searchBreakdown.storageCost,
      ingestRateLabel: "",
      retentionRateLabel: `$${rates.storagePerGBMonth.toFixed(3)}/GB-mo`,
      notes: `${searchBreakdown.storedGB.toLocaleString()} GB in Search AI Lake (published floor)`,
    },
  ];

  return {
    solution: "search",
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    logsMeteringMultiplier: 1,
    lines,
    monthlyTotal: searchBreakdown.volumeCost,
    annualTotal: searchBreakdown.volumeCost * 12,
    pricingMode: "floors",
    competitorVolumes: emptyVolumes(),
    competitors: [],
    searchBreakdown,
    productLabel: "Elasticsearch Serverless",
  };
}

export function calculateServerlessEstimator(
  inputs: ServerlessEstimatorInputs
): ServerlessEstimatorResult {
  switch (inputs.solution) {
    case "security":
      return calculateSecurity(inputs);
    case "search":
      return calculateSearch(inputs);
    case "observability":
    default:
      return calculateObservability(inputs);
  }
}
