"use client";

import { useState, useMemo } from "react";
import { FULL_STACK_VENDORS, CAPABILITY_LABELS, type CapabilityLevel } from "@/lib/fullStackVendors";

interface FullStackComparisonProps {
  metricsCosts: Record<string, number>;
  tracingCosts: Record<string, number>;
  logsCosts: Record<string, number>;
  securityCosts: Record<string, number>;
  operationalCosts?: Record<string, number>;
  engineerHourlyRate?: number;
}

type SignalKey = "metrics" | "tracing" | "logs" | "security";

const SIGNAL_CONFIG: { key: SignalKey; label: string; icon: string; color: string }[] = [
  { key: "metrics", label: "Metrics", icon: "📊", color: "blue" },
  { key: "tracing", label: "Tracing/APM", icon: "🔍", color: "purple" },
  { key: "logs", label: "Logs", icon: "📝", color: "green" },
  { key: "security", label: "Security", icon: "🔒", color: "red" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CapabilityBadge({ level, label }: { level: CapabilityLevel; label: string }) {
  if (level === "yes") {
    return (
      <div className="flex items-center justify-center gap-1" title={label}>
        <span className="text-emerald-500 text-lg">✓</span>
      </div>
    );
  }
  if (level === "limited") {
    return (
      <div className="flex items-center justify-center gap-1" title={label}>
        <span className="text-amber-400 text-lg">~</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1" title={label}>
      <span className="text-red-400 text-lg">✗</span>
    </div>
  );
}

// Vendors shown by default — Datadog + both Elastic options
const DEFAULT_ACTIVE_VENDORS = new Set(["datadog", "elastic-serverless", "elastic-ech"]);

export default function FullStackComparison({
  metricsCosts,
  tracingCosts,
  logsCosts,
  securityCosts,
  operationalCosts = {},
  engineerHourlyRate,
}: FullStackComparisonProps) {
  const [activeVendors, setActiveVendors] = useState<Set<string>>(DEFAULT_ACTIVE_VENDORS);

  const toggleVendor = (id: string) => {
    setActiveVendors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Always keep at least one vendor
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [activeSignals, setActiveSignals] = useState<Record<SignalKey, boolean>>({
    metrics: true,
    tracing: true,
    logs: true,
    security: true,
  });

  const toggleSignal = (key: SignalKey) => {
    setActiveSignals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleVendors = useMemo(
    () => FULL_STACK_VENDORS.filter((v) => activeVendors.has(v.id)),
    [activeVendors]
  );

  // Compute total costs per vendor across selected signals
  const vendorTotals = useMemo(() => {
    return visibleVendors.map((vendor) => {
      const signalCosts: Partial<Record<SignalKey, number | null>> = {};
      let total = 0;
      let hasAll = true;

      const tco = (id: string | null, base: Record<string, number>) => {
        if (!id) return null;
        const infra = base[id] ?? null;
        if (infra === null) return null;
        return infra + (operationalCosts[id] || 0);
      };

      if (activeSignals.metrics) {
        const c = tco(vendor.metricsPlatformId, metricsCosts);
        signalCosts.metrics = c;
        if (c !== null) total += c; else hasAll = false;
      }
      if (activeSignals.tracing) {
        const c = tco(vendor.tracingPlatformId, tracingCosts);
        signalCosts.tracing = c;
        if (c !== null) total += c; else hasAll = false;
      }
      if (activeSignals.logs) {
        const c = tco(vendor.logsPlatformId, logsCosts);
        signalCosts.logs = c;
        if (c !== null) total += c; else hasAll = false;
      }
      if (activeSignals.security) {
        const c = tco(vendor.securityPlatformId, securityCosts);
        signalCosts.security = c;
        if (c !== null) total += c; else hasAll = false;
      }

      return { vendor, total, signalCosts, hasAll };
    }).sort((a, b) => a.total - b.total);
  }, [visibleVendors, activeSignals, metricsCosts, tracingCosts, logsCosts, securityCosts]);

  const datadogEntry = vendorTotals.find((v) => v.vendor.id === "datadog");
  const datadogTotal = datadogEntry?.total ?? 0;

  const elasticServerless = vendorTotals.find((v) => v.vendor.id === "elastic-serverless");
  const elasticECH = vendorTotals.find((v) => v.vendor.id === "elastic-ech");

  const elasticVsDatadogSavings = datadogTotal > 0 && elasticServerless
    ? ((datadogTotal - elasticServerless.total) / datadogTotal) * 100
    : 0;

  const maxTotal = vendorTotals[vendorTotals.length - 1]?.total ?? 1;

  return (
    <div className="space-y-8">
      {/* Vendor picker */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Compare vendors — Datadog shown by default, add others to compare
        </div>
        <div className="flex flex-wrap gap-2">
          {FULL_STACK_VENDORS.map((vendor) => {
            const isActive = activeVendors.has(vendor.id);
            return (
              <button
                key={vendor.id}
                onClick={() => toggleVendor(vendor.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  isActive
                    ? vendor.isElastic
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-400"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${vendor.color}`} />
                {vendor.name}
                {isActive && (
                  <span className="ml-1 opacity-70 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero savings callout */}
      {elasticVsDatadogSavings > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-1">
                Full-Stack TCO · Infrastructure + Human Operational Costs
              </div>
              <h2 className="text-3xl font-extrabold mb-2">
                Elastic saves{" "}
                <span className="text-yellow-300">
                  {elasticVsDatadogSavings.toFixed(0)}%
                </span>{" "}
                vs Datadog
              </h2>
              <p className="opacity-90 text-base">
                {formatCurrency(elasticServerless!.total)}/mo (Elastic Serverless) vs{" "}
                {formatCurrency(datadogTotal)}/mo (Datadog) — saving{" "}
                <strong>{formatCurrency(datadogTotal - elasticServerless!.total)}/mo</strong> ·{" "}
                <strong>{formatCurrency((datadogTotal - elasticServerless!.total) * 12)}/yr</strong>
              </p>
            </div>
            <div className="shrink-0 text-center bg-white/15 rounded-xl px-6 py-4">
              <div className="text-5xl font-black text-yellow-300 tabular-nums">
                {elasticVsDatadogSavings.toFixed(0)}%
              </div>
              <div className="text-sm opacity-80 mt-1">cheaper than Datadog</div>
              {elasticECH && elasticECH.total < elasticServerless!.total && (
                <div className="text-xs opacity-70 mt-1">
                  ECH: {(((datadogTotal - elasticECH.total) / datadogTotal) * 100).toFixed(0)}% savings
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signal toggles */}
      <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Signals to include in total
        </div>
        <div className="flex flex-wrap gap-2">
          {SIGNAL_CONFIG.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => toggleSignal(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                activeSignals[key]
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-400"
              }`}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Combined cost bars */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Combined Monthly TCO — All Selected Signals
            </h3>
            {engineerHourlyRate && Object.keys(operationalCosts).length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Includes infrastructure + operational costs at ${engineerHourlyRate}/hr engineer rate
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400">Annual ÷ 12</span>
        </div>
        <div className="p-6 space-y-3">
          {vendorTotals.map(({ vendor, total, signalCosts }) => {
            const savingsPct =
              datadogTotal > 0 && vendor.id !== "datadog"
                ? ((datadogTotal - total) / datadogTotal) * 100
                : null;
            const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

            return (
              <div key={vendor.id} className={`rounded-xl p-3 transition-all ${vendor.isElastic ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-700" : "bg-gray-50 dark:bg-gray-900/30"}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${vendor.color}`} />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {vendor.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${vendor.badgeColor}`}>
                      {vendor.badge}
                    </span>
                    {/* missing security indicator */}
                    {activeSignals.security && !vendor.securityPlatformId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                        no security
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {savingsPct !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${savingsPct > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {savingsPct > 0 ? `${savingsPct.toFixed(0)}% less than DD` : `${Math.abs(savingsPct).toFixed(0)}% more than DD`}
                      </span>
                    )}
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                        {formatCurrency(total)}<span className="text-xs text-gray-400">/mo</span>
                      </div>
                      <div className="text-xs text-gray-400 tabular-nums">{formatCurrency(total * 12)}/yr</div>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${vendor.isElastic ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gray-400 dark:bg-gray-500"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                {/* Per-signal breakdown */}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {SIGNAL_CONFIG.filter((s) => activeSignals[s.key]).map(({ key, label, icon }) => {
                    const c = signalCosts[key];
                    return (
                      <div key={key} className="text-xs text-gray-500 dark:text-gray-400">
                        {icon} {label}:{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {c !== null && c !== undefined ? formatCurrency(c) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capability comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Platform Capability Comparison
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ✓ Included &nbsp;·&nbsp; ~ Limited/Add-on &nbsp;·&nbsp; ✗ Not available
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-48">
                  Capability
                </th>
                {visibleVendors.map((v) => (
                  <th key={v.id} className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide ${v.isElastic ? "text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/10" : "text-gray-500 dark:text-gray-400"}`}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${v.color}`} />
                      <span className="leading-tight">{v.name.replace(" (ECH)", "\n(ECH)").replace(" (Managed)", "\n(Managed)")}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {Object.entries(CAPABILITY_LABELS).map(([capKey, capLabel]) => (
                <tr key={capKey} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {capLabel}
                  </td>
                  {visibleVendors.map((v) => (
                    <td
                      key={v.id}
                      className={`px-3 py-3 text-center ${v.isElastic ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
                    >
                      <CapabilityBadge
                        level={v.capabilities[capKey as keyof typeof v.capabilities]}
                        label={capLabel}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Elastic callout */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Why Elastic wins on both cost and capability:</strong> Elastic is the only platform that offers leading AI-driven investigation (AI Assistant, Attack Discovery) + native SIEM + unified data model across logs, metrics, traces, and security — at a fraction of Datadog&apos;s price. Grafana matches cost but lacks AI investigation depth and native security. Datadog offers capability but at a severe cost premium.
          </p>
        </div>
      </div>

      {/* Grafana competitive note */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-5">
          <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-2">
            <span>⚔️</span> Elastic vs Datadog
          </h4>
          <ul className="text-sm text-purple-800 dark:text-purple-300 space-y-1.5">
            <li>• Datadog bills <strong>per host</strong> — 1,000 servers = 1,000 licenses</li>
            <li>• Datadog needs 4 separate products for full-stack coverage</li>
            <li>• Custom metrics cardinality explodes Datadog costs exponentially</li>
            <li>• Elastic&apos;s AI Assistant investigates across all signals simultaneously</li>
            <li>• Attack Discovery automates threat investigation — Datadog needs manual SIEM</li>
          </ul>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5">
          <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
            <span>🛡️</span> Elastic vs Grafana
          </h4>
          <ul className="text-sm text-indigo-800 dark:text-indigo-300 space-y-1.5">
            <li>• Grafana has <strong>no native SIEM</strong> — requires 3rd-party security stack</li>
            <li>• Grafana stitches 3 backends (Loki, Mimir, Tempo) — separate ops burden</li>
            <li>• Grafana has no AI investigation — dashboards only</li>
            <li>• Elastic offers one query language (ES|QL) across all signals</li>
            <li>• Elastic has enterprise compliance (HIPAA, FedRAMP) built in</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
