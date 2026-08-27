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
  metrics: number;
  logs: number;
  traces: number;
  security?: number;
}

export interface ServerlessCompetitorEstimate {
  id: string;
  name: string;
  color: string;
  signals: ServerlessCompetitorSignalCosts;
  monthlyTotal: number;
  annualTotal: number;
  vsElasticPct: number | null;
  assumptions: string;
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

function requirePlatform<T extends { id: string }>(list: T[], id: string): T {
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error(`Missing platform ${id}`);
  return p;
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

function buildObservabilityCompetitors(
  inputs: ServerlessEstimatorInputs,
  elasticMonthly: number,
  volumes: ServerlessEstimatorResult["competitorVolumes"]
): ServerlessCompetitorEstimate[] {
  const ctx = competitorPricingContext(
    volumes.datadogHosts,
    Math.max(
      inputs.logsRetentionMonths,
      inputs.metricsRetentionMonths,
      inputs.tracesRetentionMonths
    )
  );

  const datadogMetrics = requirePlatform(platforms, "datadog");
  const grafanaMetrics = requirePlatform(platforms, "grafana-cloud");
  const datadogLogs = requirePlatform(logsPlatforms, "datadog-logs");
  const grafanaLogs = requirePlatform(logsPlatforms, "grafana-logs");
  const datadogTracing = requirePlatform(tracingPlatforms, "datadog-tracing");
  const grafanaTracing = requirePlatform(tracingPlatforms, "grafana-tracing");

  const dd = {
    metrics: calculatePlatformCost(
      datadogMetrics,
      volumes.metricsMonthlyDatapoints,
      "Prometheus",
      false,
      false,
      ctx,
      volumes.metricsBytesPerDatapoint
    ),
    logs: calculateLogsCost(datadogLogs, volumes.logsMonthlyGB, false, false, ctx),
    traces: calculateTracingCost(datadogTracing, volumes.monthlySpans, false, false, ctx),
  };
  const gf = {
    metrics: calculatePlatformCost(
      grafanaMetrics,
      volumes.metricsMonthlyDatapoints,
      "Prometheus",
      false,
      false,
      ctx,
      volumes.metricsBytesPerDatapoint
    ),
    logs: calculateLogsCost(grafanaLogs, volumes.logsMonthlyGB, false, false, ctx),
    traces: calculateTracingCost(grafanaTracing, volumes.monthlySpans, false, false, ctx),
  };

  const make = (
    id: string,
    name: string,
    color: string,
    signals: ServerlessCompetitorSignalCosts,
    assumptions: string
  ): ServerlessCompetitorEstimate => {
    const monthlyTotal = signals.metrics + signals.logs + signals.traces + (signals.security ?? 0);
    return {
      id,
      name,
      color,
      signals,
      monthlyTotal,
      annualTotal: monthlyTotal * 12,
      vsElasticPct:
        elasticMonthly > 0 ? ((monthlyTotal - elasticMonthly) / elasticMonthly) * 100 : null,
      assumptions,
    };
  };

  return [
    make(
      "datadog",
      "Datadog",
      "bg-purple-500",
      dd,
      `${volumes.datadogHosts.toLocaleString()} Infra+APM hosts · metrics GB→samples @ ${volumes.metricsBytesPerDatapoint}B · logs indexed · APM hosts`
    ),
    make(
      "grafana-cloud",
      "Grafana Cloud",
      "bg-orange-400",
      gf,
      `Metrics billable series from ~${Math.round(volumes.metricsSamplesPerSecond).toLocaleString()} samples/sec · logs $/GB · traces $/M spans`
    ),
  ].sort((a, b) => a.monthlyTotal - b.monthlyTotal);
}

function buildSecurityCompetitors(
  elasticMonthly: number,
  securityMonthlyGB: number,
  retentionMonths: number
): ServerlessCompetitorEstimate[] {
  const ctx = competitorPricingContext(10, retentionMonths);
  const datadog = requirePlatform(securityPlatforms, "datadog-security");
  const events = (securityMonthlyGB * GIB) / BYTES_PER_SECURITY_EVENT;
  const ddCost = calculateSecurityCost(datadog, events, false, false, ctx);
  return [
    {
      id: "datadog-security",
      name: "Datadog Security",
      color: "bg-purple-500",
      signals: { metrics: 0, logs: 0, traces: 0, security: ddCost },
      monthlyTotal: ddCost,
      annualTotal: ddCost * 12,
      vsElasticPct:
        elasticMonthly > 0 ? ((ddCost - elasticMonthly) / elasticMonthly) * 100 : null,
      assumptions: `~${Math.round(securityMonthlyGB).toLocaleString()} GB/mo ingest @ $0.10/GB list (5 GB free)`,
    },
  ];
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

  return {
    solution: "observability",
    daysPerMonth: ELASTIC_DAYS_PER_MONTH,
    logsMeteringMultiplier: logsMultiplier,
    lines,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    pricingMode: mode,
    competitorVolumes,
    competitors: buildObservabilityCompetitors(inputs, monthlyTotal, competitorVolumes),
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
      inputs.securityRetentionMonths
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
