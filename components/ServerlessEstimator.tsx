"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SERVERLESS_ESTIMATOR_INPUTS,
  SERVERLESS_ESTIMATOR_EXAMPLE,
  SERVERLESS_SOLUTION_OPTIONS,
  calculateServerlessEstimator,
  ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL,
  ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL,
  ELASTIC_SERVERLESS_SEARCH_PRICING_URL,
  ELASTIC_SERVERLESS_SECURITY_PRICING_URL,
  type ElasticServerlessSolution,
  type ServerlessEstimatorInputs,
  type ServerlessEstimatorPricingMode,
  type SecurityFeatureTier,
} from "@/lib/serverlessEstimator";

/** Primary stack comparison shown in the left summary pane (Observability). */
const OBSERVABILITY_SUMMARY_VENDOR_IDS = [
  "elastic-serverless",
  "elastic-ech",
  "grafana-cloud",
  "datadog",
] as const;

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatGb(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)} TB`;
  if (n >= 100) return `${n.toFixed(0)} GB`;
  if (n >= 10) return `${n.toFixed(1)} GB`;
  return `${n.toFixed(2)} GB`;
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {suffix && (
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 w-20">{suffix}</span>
        )}
      </div>
      {hint && <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{hint}</span>}
    </label>
  );
}

export default function ServerlessEstimator() {
  const [inputs, setInputs] = useState<ServerlessEstimatorInputs>(SERVERLESS_ESTIMATOR_EXAMPLE);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo(() => calculateServerlessEstimator(inputs), [inputs]);

  const patch = (partial: Partial<ServerlessEstimatorInputs>) =>
    setInputs((prev) => ({ ...prev, ...partial }));

  const setSolution = (solution: ElasticServerlessSolution) => patch({ solution });

  const observabilitySummaryVendors = useMemo(() => {
    if (inputs.solution !== "observability") return [];
    return OBSERVABILITY_SUMMARY_VENDOR_IDS.map((id) =>
      result.competitors.find((c) => c.id === id)
    )
      .filter((c): c is NonNullable<typeof c> => c != null)
      .sort((a, b) => a.monthlyTotal - b.monthlyTotal);
  }, [inputs.solution, result.competitors]);

  const pricingDocsHref =
    inputs.solution === "search"
      ? ELASTIC_SERVERLESS_SEARCH_PRICING_URL
      : inputs.solution === "security"
        ? ELASTIC_SERVERLESS_SECURITY_PRICING_URL
        : ELASTIC_SERVERLESS_OBSERVABILITY_PRICING_URL;

  const formatSignalCell = (covered: boolean, cost: number | null) => {
    if (!covered) {
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }
    if (cost == null) {
      return (
        <span className="text-emerald-600 dark:text-emerald-400 font-medium" title="Covered (not metered in this worksheet)">
          ✓
        </span>
      );
    }
    return <span className="tabular-nums">{formatUsd(cost)}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <span className="w-1 h-8 bg-gradient-to-b from-sky-500 to-blue-600 rounded-full mr-3" />
              Elastic Serverless estimator
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Same product families as{" "}
              <a
                href="https://cloud.elastic.co/pricing/serverless"
                className="underline font-medium text-blue-700 dark:text-blue-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                cloud.elastic.co/pricing/serverless
              </a>
              . Enter values → get results. Observability supports fractional retention and high TPM.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (inputs.solution === "security") {
                  setInputs({
                    ...DEFAULT_SERVERLESS_ESTIMATOR_INPUTS,
                    solution: "security",
                    securityGbPerDay: 100,
                    securityRetentionMonths: 3,
                    securityTier: "security-analytics-complete",
                    pricingMode: "tiered",
                  });
                } else if (inputs.solution === "search") {
                  setInputs({
                    ...DEFAULT_SERVERLESS_ESTIMATOR_INPUTS,
                    solution: "search",
                    searchIngestVcus: 2,
                    searchSearchVcus: 4,
                    searchMlVcus: 0,
                    searchStoredGB: 20,
                  });
                } else {
                  setInputs({ ...SERVERLESS_ESTIMATOR_EXAMPLE });
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() =>
                setInputs({
                  ...DEFAULT_SERVERLESS_ESTIMATOR_INPUTS,
                  solution: inputs.solution,
                })
              }
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Product family selector */}
        <div className="mb-6">
          <label
            htmlFor="serverless-solution"
            className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
          >
            Serverless product
          </label>
          <select
            id="serverless-solution"
            value={inputs.solution}
            onChange={(e) => setSolution(e.target.value as ElasticServerlessSolution)}
            className="w-full max-w-md rounded-lg border border-sky-200 dark:border-sky-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {SERVERLESS_SOLUTION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            {SERVERLESS_SOLUTION_OPTIONS.find((o) => o.id === inputs.solution)?.description}
          </p>
        </div>

        {(inputs.solution === "observability" || inputs.solution === "security") && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Elastic pricing
            </span>
            {(
              [
                { id: "tiered" as const, label: "Volume tiers" },
                { id: "floors" as const, label: "Published floors" },
              ] as { id: ServerlessEstimatorPricingMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ pricingMode: opt.id })}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  inputs.pricingMode === opt.id
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Observability inputs */}
        {inputs.solution === "observability" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Logs</h3>
              <NumberField
                label="Raw log data volume"
                value={inputs.logsGbPerDay}
                onChange={(n) => patch({ logsGbPerDay: n })}
                step={1}
                suffix="GB/day"
                hint={`Billed at ${result.logsMeteringMultiplier}× after enrichment`}
              />
              <NumberField
                label="Log retention"
                value={inputs.logsRetentionMonths}
                onChange={(n) => patch({ logsRetentionMonths: n })}
                step={0.1}
                min={0}
                suffix="months"
                hint="Decimals allowed (e.g. 1.2)"
              />
            </section>
            <section className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Metrics</h3>
              <NumberField
                label="Metrics data volume"
                value={inputs.metricsGbPerDay}
                onChange={(n) => patch({ metricsGbPerDay: n })}
                step={0.1}
                suffix="GB/day"
                hint="TSDS index mode (25% of Complete)"
              />
              <NumberField
                label="Metrics retention"
                value={inputs.metricsRetentionMonths}
                onChange={(n) => patch({ metricsRetentionMonths: n })}
                step={0.1}
                min={0}
                suffix="months"
              />
            </section>
            <section className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-950/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200">Traces</h3>
              <NumberField
                label="Traces per minute (TPM)"
                value={inputs.tracesPerMinute}
                onChange={(n) => patch({ tracesPerMinute: n })}
                step={1}
                suffix="TPM"
              />
              <NumberField
                label="Trace sampling rate"
                value={inputs.traceSamplingPercent}
                onChange={(n) => patch({ traceSamplingPercent: Math.min(100, Math.max(0, n)) })}
                step={1}
                min={0}
                suffix="%"
              />
              <NumberField
                label="Trace retention"
                value={inputs.tracesRetentionMonths}
                onChange={(n) => patch({ tracesRetentionMonths: n })}
                step={0.1}
                min={0}
                suffix="months"
              />
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-[11px] font-medium text-violet-700 dark:text-violet-300 underline"
              >
                {showAdvanced ? "Hide" : "Show"} competitor assumptions
              </button>
              {showAdvanced && (
                <div className="space-y-3 pt-1 border-t border-violet-200/60 dark:border-violet-800/40">
                  <NumberField
                    label="Bytes per span"
                    value={inputs.bytesPerSpan}
                    onChange={(n) => patch({ bytesPerSpan: n })}
                    step={10}
                    min={1}
                    suffix="bytes"
                  />
                  <NumberField
                    label="Datadog hosts (Infra + APM)"
                    value={inputs.datadogHosts ?? result.competitorVolumes.datadogHosts}
                    onChange={(n) => patch({ datadogHosts: Math.max(1, Math.round(n)) })}
                    step={1}
                    min={1}
                    suffix="hosts"
                  />
                  <NumberField
                    label="Metrics bytes / datapoint"
                    value={
                      inputs.metricsBytesPerDatapoint ??
                      result.competitorVolumes.metricsBytesPerDatapoint
                    }
                    onChange={(n) => patch({ metricsBytesPerDatapoint: n })}
                    step={1}
                    min={1}
                    suffix="bytes"
                    hint={`→ ~${Math.round(result.competitorVolumes.metricsSamplesPerSecond).toLocaleString()} samples/sec`}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {/* Security inputs */}
        {inputs.solution === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <section className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Security data</h3>
              <NumberField
                label="Security data volume"
                value={inputs.securityGbPerDay}
                onChange={(n) => patch({ securityGbPerDay: n })}
                step={1}
                suffix="GB/day"
                hint="Logs, events, alerts ingested into Security Serverless"
              />
              <NumberField
                label="Retention"
                value={inputs.securityRetentionMonths}
                onChange={(n) => patch({ securityRetentionMonths: n })}
                step={0.1}
                min={0}
                suffix="months"
                hint="Decimals allowed"
              />
            </section>
            <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Feature tier</h3>
              {(
                [
                  {
                    id: "security-analytics-complete" as const,
                    label: "Security Analytics Complete",
                    hint: "As low as $0.11/GB ingest · $0.019/GB-mo",
                  },
                  {
                    id: "security-analytics-essentials" as const,
                    label: "Security Analytics Essentials",
                    hint: "As low as $0.09/GB ingest · $0.017/GB-mo",
                  },
                ] as { id: SecurityFeatureTier; label: string; hint: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ securityTier: opt.id })}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    inputs.securityTier === opt.id
                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      inputs.securityTier === opt.id ? "text-rose-100" : "text-gray-500"
                    }`}
                  >
                    {opt.hint}
                  </div>
                </button>
              ))}
            </section>
          </div>
        )}

        {/* Search inputs */}
        {inputs.solution === "search" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <section className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Compute (VCUs)</h3>
              <NumberField
                label="Ingest VCUs (avg)"
                value={inputs.searchIngestVcus}
                onChange={(n) => patch({ searchIngestVcus: n })}
                step={0.5}
                min={0}
                suffix="VCUs"
                hint="As low as $0.14 / VCU-hour"
              />
              <NumberField
                label="Search VCUs (avg)"
                value={inputs.searchSearchVcus}
                onChange={(n) => patch({ searchSearchVcus: n })}
                step={0.5}
                min={0}
                suffix="VCUs"
                hint="As low as $0.09 / VCU-hour"
              />
              <NumberField
                label="ML VCUs (avg)"
                value={inputs.searchMlVcus}
                onChange={(n) => patch({ searchMlVcus: n })}
                step={0.5}
                min={0}
                suffix="VCUs"
                hint="As low as $0.07 / VCU-hour · ELSER / inference"
              />
            </section>
            <section className="rounded-xl border border-sky-200 dark:border-sky-800/50 bg-sky-50/40 dark:bg-sky-950/20 p-4 space-y-3">
              <h3 className="text-sm font-bold text-sky-900 dark:text-sky-200">Storage</h3>
              <NumberField
                label="Searchable data"
                value={inputs.searchStoredGB}
                onChange={(n) => patch({ searchStoredGB: n })}
                step={1}
                min={0}
                suffix="GB"
                hint="Search AI Lake · as low as $0.047 / GB-mo"
              />
              <p className="text-[11px] text-sky-800/80 dark:text-sky-200/70 leading-relaxed pt-2">
                Search bills compute (VCU-hours) separately from storage. Uses published floors × 730
                hours/month. Competitor side-by-side is not modeled for Search (different meters).
              </p>
            </section>
          </div>
        )}
      </div>

      {/* Totals + coverage table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950/40 dark:to-blue-950/30 p-6 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">
            {result.productLabel} · monthly
          </div>
          <div className="text-4xl font-extrabold text-sky-950 dark:text-sky-50 tabular-nums">
            {formatUsd(result.monthlyTotal)}
          </div>
          <div className="text-sm text-sky-800/80 dark:text-sky-200/80 mt-1">
            {formatUsd(result.annualTotal)} / year
          </div>
          {observabilitySummaryVendors.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                Stack comparison
              </div>
              {observabilitySummaryVendors.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-baseline justify-between gap-2 text-sm border-t border-sky-200/60 dark:border-sky-800/40 pt-2 ${
                    c.id === "elastic-serverless"
                      ? "rounded-lg bg-white/50 dark:bg-gray-900/30 -mx-1 px-1 py-1 border-t-0"
                      : ""
                  }`}
                >
                  <span className="text-sky-900/80 dark:text-sky-100/80">
                    {c.name}
                    {c.id === "elastic-serverless" && (
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                        (this worksheet)
                      </span>
                    )}
                    <span className="block text-[10px] text-sky-700/60 dark:text-sky-300/60">
                      {c.coverageLabel}
                    </span>
                  </span>
                  <span className="tabular-nums font-semibold text-sky-950 dark:text-sky-50">
                    {formatUsd(c.monthlyTotal)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-sky-900/70 dark:text-sky-100/70 mt-4 leading-relaxed">
            {observabilitySummaryVendors.length > 0
              ? "Same volumes · illustrative list rates. Full vendor coverage table →"
              : "Elasticsearch Serverless line items below."}
          </p>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {result.competitors.length > 0
                ? "Vendor coverage & estimated monthly cost"
                : "Cost breakdown"}
            </h3>
            {result.competitors.length > 0 && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                ✓ / $ = covered in this estimate · — = not in product scope · Security ✓ without $ means
                capability exists but is not metered on the Observability worksheet
              </p>
            )}
          </div>
          {result.competitors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">Vendor</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Metrics</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Traces</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Logs</th>
                    <th className="px-2 py-2.5 text-center font-semibold">Security</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Total / mo</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Covers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {result.competitors.map((row) => (
                    <tr
                      key={row.id}
                      className={
                        row.isElastic
                          ? "bg-blue-50/60 dark:bg-blue-950/20"
                          : "hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                      }
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                              {row.name}
                            </div>
                            {row.isElastic && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                Elastic
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs">
                        {formatSignalCell(row.coverage.metrics, row.signals.metrics)}
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs">
                        {formatSignalCell(row.coverage.traces, row.signals.traces)}
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs">
                        {formatSignalCell(row.coverage.logs, row.signals.logs)}
                      </td>
                      <td className="px-2 py-2.5 text-center text-xs">
                        {formatSignalCell(row.coverage.security, row.signals.security)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums text-gray-900 dark:text-white text-xs sm:text-sm">
                        {formatUsd(row.monthlyTotal)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-500 dark:text-gray-400 max-w-[10rem]">
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {row.coverageLabel}
                        </div>
                        <div className="leading-snug mt-0.5 line-clamp-2" title={row.assumptions}>
                          {row.assumptions}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Elasticsearch Serverless uses VCU + storage meters. Side-by-side competitor estimates are
              not shown for Search — use the line-item table below.
            </div>
          )}
          {result.competitors.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              VictoriaMetrics / Prometheus / Thanos / Cortex are metrics-only — their totals exclude
              logs, traces, and security you still need elsewhere.{" "}
              <strong>ECH</strong> uses the same volumes with Cloud Hosted list rates (~$200 cluster
              minimum + $0.05/GB ingest + hot/blob retention). Illustrative list rates — not a quote.
            </div>
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {result.productLabel} · line items
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Line</th>
                {inputs.solution !== "search" && (
                  <>
                    <th className="px-4 py-2.5 text-right font-semibold">Ingest / mo</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Stored</th>
                  </>
                )}
                <th className="px-4 py-2.5 text-right font-semibold">Cost</th>
                <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {result.lines.map((line) => (
                <tr key={line.signal} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900 dark:text-white">{line.label}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 max-w-md leading-snug">
                      {line.notes}
                      {line.retentionMonths > 0 && inputs.solution !== "search"
                        ? ` · ${line.retentionMonths} mo retention`
                        : ""}
                    </div>
                  </td>
                  {inputs.solution !== "search" && (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {formatGb(line.billableMonthlyIngestGB)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {formatGb(line.storedGB)}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200 text-[11px]">
                    {line.ingestRateLabel || line.retentionRateLabel || "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 dark:text-white">
                    {formatUsd(line.volumeCost)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-sky-50 dark:bg-sky-950/30 font-bold">
                <td
                  className="px-4 py-3 text-gray-900 dark:text-white"
                  colSpan={inputs.solution === "search" ? 2 : 4}
                >
                  Total
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-sky-900 dark:text-sky-100">
                  {formatUsd(result.monthlyTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Sources:{" "}
          <a href={pricingDocsHref} className="underline" target="_blank" rel="noopener noreferrer">
            product pricing page
          </a>
          {inputs.solution !== "search" && (
            <>
              {" "}
              ·{" "}
              <a
                href={ELASTIC_CLOUD_OBSERVABILITY_PRICING_TABLE_URL}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloud volume tiers
              </a>
            </>
          )}
          . Not a quote — confirm with measured usage.
        </div>
      </div>
    </div>
  );
}
