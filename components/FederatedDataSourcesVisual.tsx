"use client";

import { useState } from "react";

type FlowMode = "read" | "write" | "both";

const S3_PREFIXES = [
  "s3://elastic-o11y-archive/logs/",
  "s3://elastic-o11y-archive/metrics/",
  "s3://elastic-o11y-archive/snapshots/",
];

export default function FederatedDataSourcesVisual() {
  const [flowMode, setFlowMode] = useState<FlowMode>("both");
  const [activePrefix, setActivePrefix] = useState(0);

  const showRead = flowMode === "read" || flowMode === "both";
  const showWrite = flowMode === "write" || flowMode === "both";

  return (
    <section className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center mb-2">
            <span className="w-1 h-8 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full mr-3" />
            Federated data sources
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Query and land observability data without treating object storage as a dead archive. Elastic can{" "}
            <strong>read</strong> federated datasets for ES|QL and dashboards, and{" "}
            <strong>write</strong> snapshots, exports, and connector pipelines back to cloud storage — data stays
            under your IAM policies.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-900">
          {(
            [
              { id: "read" as const, label: "Read" },
              { id: "write" as const, label: "Write" },
              { id: "both" as const, label: "Both" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFlowMode(opt.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                flowMode === opt.id
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(280px,420px)_1fr] gap-4 xl:gap-2 items-stretch">
        {/* S3 */}
        <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-700 dark:text-amber-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2L2 7l10 5 10-5-10-5zm0 8.5L4.5 7.5 12 4l7.5 3.5L12 10.5zm-8 2.3L12 18l8-5.2v3.4L12 21l-8-5.3v-3.4z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Example · Amazon S3
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Object storage</div>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4 flex-1">
            {S3_PREFIXES.map((p, i) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => setActivePrefix(i)}
                  className={`w-full text-left font-mono text-[11px] px-2 py-1.5 rounded-md transition-colors ${
                    activePrefix === i
                      ? "bg-amber-200/80 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100"
                      : "text-amber-900/70 dark:text-amber-200/70 hover:bg-amber-100/60 dark:hover:bg-amber-900/30"
                  }`}
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80">
            SSE-KMS · bucket policies · lifecycle to Glacier optional
          </p>
        </div>

        {/* Diagram center */}
        <div className="relative min-h-[220px] xl:min-h-[280px] rounded-xl bg-slate-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 420 280"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <marker id="arrowRead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#0d9488" />
              </marker>
              <marker id="arrowWrite" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#d97706" />
              </marker>
            </defs>

            {/* Read path S3 → Elastic (upper lane) */}
            {showRead && (
              <>
                <path
                  d="M 16 125 L 404 125"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrowRead)"
                  className="opacity-90"
                />
                <circle r="4" fill="#0d9488" className="animate-pulse">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path="M 16 125 L 404 125" />
                </circle>
                <text x="210" y="112" textAnchor="middle" className="fill-teal-700 dark:fill-teal-300" fontSize="10" fontWeight="600">
                  READ · federated query
                </text>
              </>
            )}

            {/* Write path Elastic → S3 (lower lane, mirrored) */}
            {showWrite && (
              <>
                <path
                  d="M 404 155 L 16 155"
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrowWrite)"
                  className="opacity-90"
                />
                <circle r="4" fill="#d97706" className="animate-pulse">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path="M 404 155 L 16 155" />
                </circle>
                <text x="210" y="172" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300" fontSize="10" fontWeight="600">
                  WRITE · snapshot / export
                </text>
              </>
            )}

            {/* Hub — centered between read/write lanes */}
            <rect x="155" y="108" width="110" height="64" rx="10" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 3" />
            <text x="210" y="132" textAnchor="middle" className="fill-indigo-700 dark:fill-indigo-300" fontSize="11" fontWeight="700">
              Federated
            </text>
            <text x="210" y="148" textAnchor="middle" className="fill-gray-600 dark:fill-gray-400" fontSize="9">
              connector · repository
            </text>
            <text x="210" y="162" textAnchor="middle" className="fill-gray-500 dark:fill-gray-500" fontSize="8">
              IAM role · least privilege
            </text>
          </svg>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 justify-center">
            {showRead && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200">
                ES|QL FROM external
              </span>
            )}
            {showWrite && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
                SLM / connector sync
              </span>
            )}
          </div>
        </div>

        {/* Elastic */}
        <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
                Elastic Serverless
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Origin project</div>
            </div>
          </div>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 flex-1">
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">→</span>
              Kibana · Discover · ES|QL · dashboards
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">→</span>
              Cross-project search to linked o11y projects
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-500 shrink-0">→</span>
              Same query plane for hot data + federated S3
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/40">
            <div className="font-mono text-[10px] text-indigo-900/90 dark:text-indigo-200/90 bg-white/60 dark:bg-gray-900/40 rounded-md p-2 leading-relaxed">
              {showRead && (
                <>
                  FROM {S3_PREFIXES[activePrefix]}*
                  <br />
                  | WHERE @timestamp &gt; NOW() - 24 hours
                  <br />
                  | STATS count = COUNT(*) BY service.name
                </>
              )}
              {showWrite && !showRead && (
                <>
                  ILM → searchable snapshot repository
                  <br />
                  type: s3 · bucket: elastic-o11y-archive
                  <br />
                  compress · encrypt · object-lock optional
                </>
              )}
              {showWrite && showRead && (
                <>
                  Read: federated ES|QL over {S3_PREFIXES[activePrefix]}*
                  <br />
                  Write: SLM repository + connector bulk index
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 border transition-opacity ${showRead ? "border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20" : "border-gray-200 dark:border-gray-700 opacity-40"}`}>
          <div className="text-xs font-bold uppercase text-teal-800 dark:text-teal-300 mb-1">Read path</div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Analysts query cold archives and partner buckets in place. No full re-ingest into hot tier unless you
            choose to promote data via a connector.
          </p>
        </div>
        <div className={`rounded-lg p-3 border transition-opacity ${showWrite ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20" : "border-gray-200 dark:border-gray-700 opacity-40"}`}>
          <div className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 mb-1">Write path</div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            ILM searchable snapshots, compliance exports, and connector sync jobs write structured objects back to S3
            for durability and cross-region DR.
          </p>
        </div>
        <div className="rounded-lg p-3 border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30">
          <div className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">TCO note</div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            S3 storage + API requests are billed by AWS; Elastic charges ingest/retention on promoted or hot-tier
            data. Federated read avoids duplicating bytes on hot RAM.
          </p>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4">
        Illustrative architecture for customer conversations. See{" "}
        <a
          href="https://www.elastic.co/docs/explore-analyze/cross-project-search"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cross-project search
        </a>
        ,{" "}
        <a
          href="https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          S3 snapshot repository
        </a>
        , and Elastic connector docs for your deployment type.
      </p>
    </section>
  );
}
